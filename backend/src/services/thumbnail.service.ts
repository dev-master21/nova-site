// backend/src/services/thumbnail.service.ts
import sharp from 'sharp'
import fs from 'fs/promises'
import path from 'path'
import db from '../config/database' // Изменено: default import

interface ThumbnailStats {
  processed: number
  skipped: number
  errors: number
  duration: number
}

interface FileCheckResult {
  exists: boolean
  thumbnailExists: boolean
  canRead: boolean
  canWrite: boolean
  error?: string
}

class ThumbnailService {
  private readonly THUMBNAIL_WIDTH = 400 // Ширина миниатюры
  private readonly THUMBNAIL_QUALITY = 80 // Качество сжатия
  private readonly PHOTO_DIRS = [
    'uploads/properties/photos',
    'uploads/properties/floor-plans'
  ]

  /**
   * Получение пути к thumbnail (с сохранением регистра оригинального расширения)
   */
  private getThumbnailPath(imagePath: string): string {
    const originalExt = path.extname(imagePath) // Сохраняем оригинальный регистр
    const nameWithoutExt = imagePath.slice(0, -originalExt.length)
    return `${nameWithoutExt}_thumb${originalExt}`
  }

  /**
   * Проверка файла и его thumbnail
   */
  async checkFile(filePath: string): Promise<FileCheckResult> {
    const result: FileCheckResult = {
      exists: false,
      thumbnailExists: false,
      canRead: false,
      canWrite: false
    }

    try {
      // Проверяем существование исходного файла
      try {
        await fs.access(filePath, fs.constants.F_OK)
        result.exists = true
        
        // Проверяем права на чтение
        await fs.access(filePath, fs.constants.R_OK)
        result.canRead = true
      } catch (error: any) {
        result.error = `Cannot access original file: ${error.message}`
        return result
      }

      // Проверяем thumbnail (с точным расширением оригинала)
      const thumbnailPath = this.getThumbnailPath(filePath)

      try {
        await fs.access(thumbnailPath, fs.constants.F_OK)
        result.thumbnailExists = true
      } catch {
        result.thumbnailExists = false
      }

      // Проверяем права на запись в директорию
      const dir = path.dirname(filePath)
      try {
        await fs.access(dir, fs.constants.W_OK)
        result.canWrite = true
      } catch (error: any) {
        result.error = `Cannot write to directory: ${error.message}`
      }

    } catch (error: any) {
      result.error = `Check failed: ${error.message}`
    }

    return result
  }

  /**
   * Принудительная генерация thumbnail (с детальным логированием)
   */
  async forceGenerateThumbnail(imagePath: string): Promise<boolean> {
    console.log('\n🔍 Force generating thumbnail for:', imagePath)
    
    // Проверяем файл
    const check = await this.checkFile(imagePath)
    console.log('📋 File check result:', {
      exists: check.exists,
      thumbnailExists: check.thumbnailExists,
      canRead: check.canRead,
      canWrite: check.canWrite,
      error: check.error
    })

    if (!check.exists) {
      console.error('❌ Original file does not exist')
      return false
    }

    if (!check.canRead) {
      console.error('❌ Cannot read original file')
      return false
    }

    if (!check.canWrite) {
      console.error('❌ Cannot write to directory')
      return false
    }

    try {
      const thumbnailPath = this.getThumbnailPath(imagePath)
      const originalExt = path.extname(imagePath)
      
      console.log('📝 Original extension:', originalExt)
      console.log('📝 Thumbnail path:', thumbnailPath)

      // Удаляем существующий thumbnail если есть
      if (check.thumbnailExists) {
        try {
          await fs.unlink(thumbnailPath)
          console.log('🗑️  Removed existing thumbnail')
        } catch (error: any) {
          console.error('⚠️  Could not remove existing thumbnail:', error.message)
        }
      }

      // Удаляем неправильные thumbnails (с другим регистром расширения)
      await this.cleanupWrongExtensionThumbnail(imagePath)

      // Получаем информацию о файле
      const stats = await fs.stat(imagePath)
      console.log('📊 File size:', (stats.size / 1024).toFixed(2), 'KB')

      // Создаем базовый pipeline Sharp
      console.log('🔄 Creating Sharp pipeline...')
      const pipeline = sharp(imagePath)
        .resize(this.THUMBNAIL_WIDTH, null, {
          fit: 'inside',
          withoutEnlargement: true
        })

      // Применяем формат (для определения формата используем lowercase)
      const extLower = originalExt.toLowerCase()
      console.log('🎨 Format:', extLower)
      
      switch (extLower) {
        case '.jpg':
        case '.jpeg':
          pipeline.jpeg({ quality: this.THUMBNAIL_QUALITY, progressive: true })
          break
        case '.png':
          pipeline.png({ quality: this.THUMBNAIL_QUALITY, compressionLevel: 9 })
          break
        case '.webp':
          pipeline.webp({ quality: this.THUMBNAIL_QUALITY })
          break
        default:
          console.warn(`⚠️  Unknown format ${originalExt}, using JPEG`)
          pipeline.jpeg({ quality: this.THUMBNAIL_QUALITY, progressive: true })
      }

      // Сохраняем thumbnail (с точным расширением оригинала)
      console.log('💾 Saving thumbnail...')
      await pipeline.toFile(thumbnailPath)

      // Проверяем что файл создан
      const thumbnailStats = await fs.stat(thumbnailPath)
      console.log('✅ Thumbnail created successfully!')
      console.log('📊 Thumbnail size:', (thumbnailStats.size / 1024).toFixed(2), 'KB')
      console.log('📁 Thumbnail path:', thumbnailPath)

      return true
    } catch (error: any) {
      console.error('❌ Error generating thumbnail:', error.message)
      console.error('Stack trace:', error.stack)
      return false
    }
  }

  /**
   * Генерация thumbnail для одного изображения
   */
  async generateThumbnail(imagePath: string): Promise<boolean> {
    try {
      // Получаем путь к thumbnail (с сохранением регистра оригинального расширения)
      const thumbnailPath = this.getThumbnailPath(imagePath)

      // Проверяем, существует ли уже thumbnail
      try {
        await fs.access(thumbnailPath)
        console.log(`⏭️  Thumbnail already exists: ${thumbnailPath}`)
        return false // Уже существует, пропускаем
      } catch {
        // Thumbnail не существует, продолжаем
      }

      // ВАЖНО: Проверяем и удаляем неправильные thumbnails (с другим регистром)
      await this.cleanupWrongExtensionThumbnail(imagePath)

      // Проверяем, существует ли исходное изображение
      try {
        await fs.access(imagePath)
      } catch {
        console.error(`❌ Source image not found: ${imagePath}`)
        return false
      }

      // Создаем базовый pipeline Sharp
      const pipeline = sharp(imagePath)
        .resize(this.THUMBNAIL_WIDTH, null, {
          fit: 'inside', // Сохраняем соотношение сторон
          withoutEnlargement: true // Не увеличиваем маленькие изображения
        })

      // Применяем формат в зависимости от расширения файла
      const originalExt = path.extname(imagePath)
      const extLower = originalExt.toLowerCase()
      
      switch (extLower) {
        case '.jpg':
        case '.jpeg':
          pipeline.jpeg({ quality: this.THUMBNAIL_QUALITY, progressive: true })
          break
        case '.png':
          pipeline.png({ quality: this.THUMBNAIL_QUALITY, compressionLevel: 9 })
          break
        case '.webp':
          pipeline.webp({ quality: this.THUMBNAIL_QUALITY })
          break
        default:
          // Для неизвестных форматов используем jpeg по умолчанию
          console.warn(`⚠️  Unknown format ${originalExt}, using JPEG for thumbnail`)
          pipeline.jpeg({ quality: this.THUMBNAIL_QUALITY, progressive: true })
      }

      // Сохраняем thumbnail (с точным расширением оригинала, включая регистр)
      await pipeline.toFile(thumbnailPath)

      console.log(`✅ Thumbnail generated: ${thumbnailPath}`)
      return true
    } catch (error: any) {
      console.error(`❌ Error generating thumbnail for ${imagePath}:`, error.message)
      return false
    }
  }

  /**
   * Очистка thumbnails с неправильным регистром расширения
   * Например, если есть image.JPG, но существует image_thumb.jpg или image_thumb.jpeg - удаляем их
   */
  private async cleanupWrongExtensionThumbnail(imagePath: string): Promise<void> {
    const originalExt = path.extname(imagePath)
    const nameWithoutExt = imagePath.slice(0, -originalExt.length)
    const correctThumbnailPath = this.getThumbnailPath(imagePath)
    
    // Все возможные варианты расширений и их регистров
    const possibleExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.JPEG', '.PNG', '.WEBP', '.Jpg', '.Jpeg', '.Png', '.Webp']
    
    for (const ext of possibleExtensions) {
      const possibleThumbnailPath = `${nameWithoutExt}_thumb${ext}`
      
      // Пропускаем правильный путь к thumbnail (с точным расширением)
      if (possibleThumbnailPath === correctThumbnailPath) {
        continue
      }

      try {
        await fs.access(possibleThumbnailPath)
        // Если файл существует - удаляем его
        await fs.unlink(possibleThumbnailPath)
        console.log(`🗑️  Removed incorrect thumbnail: ${possibleThumbnailPath} (expected: ${correctThumbnailPath})`)
      } catch {
        // Файл не существует - всё в порядке
      }
    }
  }

  /**
   * Получение всех фотографий из базы данных
   */
  async getAllPhotosFromDatabase(): Promise<string[]> {
    try {
      const query = `
        SELECT DISTINCT photo_url 
        FROM property_photos 
        WHERE photo_url IS NOT NULL AND photo_url != ''
      `
      const photos: any[] = await db.query(query)
      return photos.map(p => p.photo_url)
    } catch (error) {
      console.error('❌ Error fetching photos from database:', error)
      return []
    }
  }

  /**
   * Получение всех файлов из директории
   */
  async getAllFilesFromDirectory(dir: string): Promise<string[]> {
    try {
      const fullPath = path.join(process.cwd(), dir)
      
      // Проверяем существование директории
      try {
        await fs.access(fullPath)
      } catch {
        console.log(`⚠️  Directory not found: ${fullPath}`)
        return []
      }

      const files = await fs.readdir(fullPath)
      
      // Фильтруем только изображения (исключаем thumbnails)
      // Регулярное выражение с флагом 'i' обрабатывает JPG, jpg, JPEG, jpeg и т.д.
      const imageFiles = files.filter(file => {
        const isImage = /\.(jpg|jpeg|png|webp)$/i.test(file)
        const isNotThumbnail = !file.includes('_thumb')
        return isImage && isNotThumbnail
      })

      console.log(`📊 Found ${imageFiles.length} images in ${dir}`)

      return imageFiles.map(file => path.join(dir, file))
    } catch (error) {
      console.error(`❌ Error reading directory ${dir}:`, error)
      return []
    }
  }

  /**
   * Генерация thumbnails для фотографий из базы данных
   */
  async generateThumbnailsFromDatabase(): Promise<ThumbnailStats> {
    const startTime = Date.now()
    const stats: ThumbnailStats = {
      processed: 0,
      skipped: 0,
      errors: 0,
      duration: 0
    }

    console.log('\n🔄 Starting thumbnail generation from database...')

    try {
      const photoUrls = await this.getAllPhotosFromDatabase()
      console.log(`📊 Found ${photoUrls.length} photos in database`)

      for (const photoUrl of photoUrls) {
        // Преобразуем URL в путь файла
        const filePath = photoUrl.startsWith('/') ? photoUrl.slice(1) : photoUrl

        try {
          const generated = await this.generateThumbnail(filePath)
          if (generated) {
            stats.processed++
          } else {
            stats.skipped++
          }
        } catch (error) {
          stats.errors++
          console.error(`❌ Error processing ${filePath}:`, error)
        }
      }
    } catch (error) {
      console.error('❌ Error in generateThumbnailsFromDatabase:', error)
    }

    stats.duration = Date.now() - startTime
    this.logStats(stats)
    return stats
  }

  /**
   * Генерация thumbnails для всех файлов в директориях
   */
  async generateThumbnailsFromDirectories(): Promise<ThumbnailStats> {
    const startTime = Date.now()
    const stats: ThumbnailStats = {
      processed: 0,
      skipped: 0,
      errors: 0,
      duration: 0
    }

    console.log('\n🔄 Starting thumbnail generation from directories...')

    for (const dir of this.PHOTO_DIRS) {
      console.log(`\n📁 Processing directory: ${dir}`)
      
      const files = await this.getAllFilesFromDirectory(dir)

      for (const file of files) {
        try {
          const generated = await this.generateThumbnail(file)
          if (generated) {
            stats.processed++
          } else {
            stats.skipped++
          }
        } catch (error) {
          stats.errors++
          console.error(`❌ Error processing ${file}:`, error)
        }
      }
    }

    stats.duration = Date.now() - startTime
    this.logStats(stats)
    return stats
  }

  /**
   * Полная синхронизация - проверка всех файлов
   */
  async fullSync(): Promise<ThumbnailStats> {
    console.log('\n🚀 Starting FULL thumbnail synchronization...')
    return await this.generateThumbnailsFromDirectories()
  }

  /**
   * Быстрая синхронизация - только из базы данных
   */
  async quickSync(): Promise<ThumbnailStats> {
    console.log('\n⚡ Starting QUICK thumbnail synchronization...')
    return await this.generateThumbnailsFromDatabase()
  }

  /**
   * Генерация thumbnail для конкретного файла
   */
  async generateForFile(photoUrl: string): Promise<boolean> {
    const filePath = photoUrl.startsWith('/') ? photoUrl.slice(1) : photoUrl
    return await this.generateThumbnail(filePath)
  }

  /**
   * Логирование статистики
   */
  private logStats(stats: ThumbnailStats): void {
    console.log('\n📊 Thumbnail Generation Statistics:')
    console.log(`   ✅ Processed: ${stats.processed}`)
    console.log(`   ⏭️  Skipped: ${stats.skipped}`)
    console.log(`   ❌ Errors: ${stats.errors}`)
    console.log(`   ⏱️  Duration: ${(stats.duration / 1000).toFixed(2)}s`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  }

  /**
   * Очистка неиспользуемых thumbnails
   */
  async cleanupUnusedThumbnails(): Promise<number> {
    let deletedCount = 0
    console.log('\n🧹 Starting cleanup of unused thumbnails...')

    try {
      // Получаем все photo_url из базы данных
      const photoUrls = await this.getAllPhotosFromDatabase()
      const validFiles = new Set(photoUrls.map(url => {
        const filePath = url.startsWith('/') ? url.slice(1) : url
        return path.basename(filePath)
      }))

      // Проверяем каждую директорию
      for (const dir of this.PHOTO_DIRS) {
        const fullPath = path.join(process.cwd(), dir)
        
        try {
          const files = await fs.readdir(fullPath)
          
          // Находим все thumbnails
          const thumbnails = files.filter(file => file.includes('_thumb'))
          
          for (const thumbnail of thumbnails) {
            // Получаем оригинальное имя файла
            // Нужно учесть что расширение может быть в любом регистре
            const thumbnailExt = path.extname(thumbnail)
            const nameWithoutThumb = thumbnail.slice(0, -(('_thumb' + thumbnailExt).length))
            
            // Проверяем все возможные варианты оригинального файла с разным регистром
            const possibleExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.JPEG', '.PNG', '.WEBP', '.Jpg', '.Jpeg', '.Png', '.Webp']
            const possibleOriginals = possibleExtensions.map(ext => nameWithoutThumb + ext)
            
            const hasOriginal = possibleOriginals.some(orig => validFiles.has(orig))
            
            // Если оригинал не в базе данных - удаляем thumbnail
            if (!hasOriginal) {
              const thumbnailPath = path.join(fullPath, thumbnail)
              await fs.unlink(thumbnailPath)
              console.log(`🗑️  Deleted unused thumbnail: ${thumbnail}`)
              deletedCount++
            }
          }
        } catch (error) {
          console.error(`❌ Error cleaning directory ${dir}:`, error)
        }
      }

      console.log(`\n✅ Cleanup complete. Deleted ${deletedCount} unused thumbnails.`)
    } catch (error) {
      console.error('❌ Error in cleanup:', error)
    }

    return deletedCount
  }

  /**
   * Исправление всех неправильных thumbnails
   * Находит все файлы без правильного thumbnail и создаёт их
   */
  async fixAllMismatchedThumbnails(): Promise<number> {
    let fixedCount = 0
    console.log('\n🔧 Starting fix of mismatched thumbnails...')

    for (const dir of this.PHOTO_DIRS) {
      console.log(`\n📁 Checking directory: ${dir}`)
      
      const files = await this.getAllFilesFromDirectory(dir)

      for (const file of files) {
        const correctThumbnailPath = this.getThumbnailPath(file)

        // Проверяем существует ли правильный thumbnail
        try {
          await fs.access(correctThumbnailPath)
          // Правильный thumbnail существует
        } catch {
          // Правильного thumbnail нет - создаём его
          console.log(`🔄 Missing correct thumbnail for: ${file}`)
          
          try {
            const generated = await this.generateThumbnail(file)
            if (generated) {
              fixedCount++
              console.log(`✅ Created thumbnail for: ${file}`)
            }
          } catch (error) {
            console.error(`❌ Error creating thumbnail for ${file}:`, error)
          }
        }
      }
    }

    console.log(`\n✅ Fix complete. Created ${fixedCount} thumbnails.`)
    return fixedCount
  }
}

export const thumbnailService = new ThumbnailService()