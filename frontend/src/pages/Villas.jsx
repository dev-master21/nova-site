import React, { useState, useEffect, useCallback, memo, useMemo, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  HiSearch,
  HiChevronLeft,
  HiChevronRight,
  HiMap,
  HiHeart,
  HiX,
  HiCalendar,
  HiMoon,
  HiHome,
  HiKey
} from 'react-icons/hi'
import { IoBedOutline, IoExpand } from 'react-icons/io5'
import { MdBathtub, MdVilla, MdApartment } from 'react-icons/md'
import { FaUsers } from 'react-icons/fa'
import { BsHouseDoor } from 'react-icons/bs'
import LoadingSpinner from '../components/common/LoadingSpinner'
import PropertyMap from '../components/Property/PropertyMap'
import { propertyService } from '../services/property.service'
import { useShortlistStore } from '../store/shortlistStore'
import toast from 'react-hot-toast'
import ComplexModal from '../components/Property/ComplexModal'

const Villas = () => {
  const { t, i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0
  })

  // Флаг для предотвращения двойной загрузки
  const isInitialMount = useRef(true)
  const lastRequestParams = useRef('')

  // Читаем параметры из URL
  const checkInRaw = searchParams.get('checkIn')
  const checkOutRaw = searchParams.get('checkOut')
  const checkIn = checkInRaw ? new Date(checkInRaw).toISOString().split('T')[0] : null
  const checkOut = checkOutRaw ? new Date(checkOutRaw).toISOString().split('T')[0] : null
  const bedrooms = searchParams.get('bedrooms')
  const name = searchParams.get('name')
  const currentPage = parseInt(searchParams.get('page')) || 1
  
  // Параметры фильтрации - читаем из URL
  const dealType = searchParams.get('dealType') || (searchParams.has('sale') ? 'sale' : 'rent')
  const propertyTypesParam = searchParams.get('propertyTypes')
  const selectedPropertyTypes = useMemo(() => {
    if (propertyTypesParam) {
      return propertyTypesParam.split(',').filter(t => t)
    }
    return ['house', 'villa', 'condo']
  }, [propertyTypesParam])

  // Рассчитываем количество ночей
  const nights = checkIn && checkOut 
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))
    : null

// Загрузка данных
const loadVillas = useCallback(async () => {
  // Формируем параметры для запроса
  const params = {
    page: currentPage,
    limit: 12,
    dealType: dealType,
    propertyTypes: selectedPropertyTypes.join(',')
  }

  if (checkIn) params.checkIn = checkIn
  if (checkOut) params.checkOut = checkOut
  if (bedrooms) params.bedrooms = bedrooms
  if (name) params.name = name

  // Создаём ключ для сравнения
  const requestKey = JSON.stringify(params)
  
  // Если параметры не изменились - не загружаем
  if (requestKey === lastRequestParams.current && !isInitialMount.current) {
    console.log('⏭️ Пропуск загрузки - параметры не изменились')
    return
  }
  
  lastRequestParams.current = requestKey

  try {
    setLoading(true)
    console.log('📤 Загрузка вилл с параметрами:', params)

    const response = await propertyService.getVillasForPage(params)
    
    console.log('========== ДИАГНОСТИКА RESPONSE ==========')
    console.log('📥 response:', response)
    console.log('📥 typeof response:', typeof response)
    console.log('📥 response.success:', response?.success)
    console.log('📥 response.data:', response?.data)
    console.log('📥 response.data length:', response?.data?.length)
    console.log('📥 response.pagination:', response?.pagination)
    console.log('📥 response.pagination.total:', response?.pagination?.total)
    console.log('📥 response.pagination.pages:', response?.pagination?.pages)
    console.log('==========================================')
    
    // Обрабатываем ответ
    let propertiesData = []
    let paginationData = { page: currentPage, limit: 12, total: 0, pages: 0 }
    
    if (response && response.success === true) {
      propertiesData = Array.isArray(response.data) ? response.data : []
      
      if (response.pagination) {
        paginationData = {
          page: Number(response.pagination.page) || currentPage,
          limit: Number(response.pagination.limit) || 12,
          total: Number(response.pagination.total) || 0,
          pages: Number(response.pagination.pages) || 0
        }
        console.log('✅ PARSED paginationData:', paginationData)
      }
    } else if (Array.isArray(response)) {
      propertiesData = response
      paginationData = {
        page: currentPage,
        limit: 12,
        total: response.length,
        pages: Math.ceil(response.length / 12)
      }
    }
    
    console.log('🎯 FINAL propertiesData.length:', propertiesData.length)
    console.log('🎯 FINAL paginationData:', paginationData)
    console.log('🎯 paginationData.pages > 1:', paginationData.pages > 1)
    
    setProperties(propertiesData)
    setPagination(paginationData)
    
  } catch (error) {
    console.error('❌ Error loading villas:', error)
    toast.error(t('villas.loadError'))
    setProperties([])
    setPagination({ page: 1, limit: 12, total: 0, pages: 0 })
  } finally {
    setLoading(false)
    isInitialMount.current = false
  }
}, [currentPage, dealType, selectedPropertyTypes, checkIn, checkOut, bedrooms, name, t])

  // Загрузка при изменении параметров
  useEffect(() => {
    loadVillas()
  }, [loadVillas, i18n.language])

  // Функция обновления URL без перезагрузки
  const updateFilters = useCallback((newDealType, newPropertyTypes, newPage = 1) => {
    const params = new URLSearchParams()
    
    // Устанавливаем основные параметры
    params.set('dealType', newDealType)
    params.set('page', String(newPage))
    
    // Устанавливаем типы недвижимости (если не все выбраны)
    if (newPropertyTypes.length < 3) {
      params.set('propertyTypes', newPropertyTypes.join(','))
    }
    
    // Сохраняем параметры поиска если есть
    if (checkIn) params.set('checkIn', checkIn)
    if (checkOut) params.set('checkOut', checkOut)
    if (bedrooms) params.set('bedrooms', bedrooms)
    if (name) params.set('name', name)
    
    setSearchParams(params, { replace: true })
  }, [checkIn, checkOut, bedrooms, name, setSearchParams])

  // Обработчик смены типа сделки
  const handleDealTypeChange = useCallback((newDealType) => {
    if (newDealType === dealType) return
    updateFilters(newDealType, selectedPropertyTypes, 1)
  }, [dealType, selectedPropertyTypes, updateFilters])

  // Обработчик смены типов недвижимости
  const handlePropertyTypeToggle = useCallback((type) => {
    let newTypes
    if (selectedPropertyTypes.includes(type)) {
      if (selectedPropertyTypes.length === 1) {
        toast.error(t('villas.selectAtLeastOne'))
        return
      }
      newTypes = selectedPropertyTypes.filter(t => t !== type)
    } else {
      newTypes = [...selectedPropertyTypes, type]
    }
    
    updateFilters(dealType, newTypes, 1)
  }, [selectedPropertyTypes, dealType, updateFilters, t])

  // Выбрать все типы
  const handleSelectAllTypes = useCallback(() => {
    updateFilters(dealType, ['house', 'villa', 'condo'], 1)
  }, [dealType, updateFilters])

  // Сбросить все фильтры
  const handleResetFilters = useCallback(() => {
    setSearchParams({ dealType: 'rent', page: '1' }, { replace: true })
  }, [setSearchParams])

  // Обработчик смены страницы
  const handlePageChange = useCallback((newPage) => {
    updateFilters(dealType, selectedPropertyTypes, newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [dealType, selectedPropertyTypes, updateFilters])

  // Генерация текста подписи для выбранных типов
  const getPropertyTypesLabel = useMemo(() => {
    const types = selectedPropertyTypes
    const typeNames = {
      house: t('property.types.house'),
      villa: t('property.types.villa'),
      condo: t('property.types.condo')
    }

    if (types.length === 3) {
      return t('villas.showingAllTypes')
    }
    
    if (types.length === 1) {
      return t('villas.showingOnly', { type: typeNames[types[0]] })
    }
    
    if (types.length === 2) {
      const names = types.map(t => typeNames[t])
      return t('villas.showingTypes', { types: names.join(` ${t('common.and')} `) })
    }

    return ''
  }, [selectedPropertyTypes, t])

  if (loading && properties.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 pt-20 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 pt-20">
      {/* Header Section */}
      <div className={`shadow-xl transition-all duration-300 ${
        dealType === 'sale' 
          ? 'bg-gradient-to-r from-green-500 to-green-600' 
          : 'bg-gradient-to-r from-blue-500 to-blue-600'
      }`}>
        <div className="container mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {t('villas.title')}
            </h1>
            <p className="text-white/90 text-lg mb-6">
              {t('villas.subtitle')}
            </p>
            
            {/* Search Summary */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-white/90 mb-8">
              <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                <HiSearch className="w-5 h-5" />
                <span className="font-semibold">
                  {pagination.total} {t('villas.propertiesFound')}
                </span>
              </div>
              
              {nights && (
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <HiCalendar className="w-5 h-5" />
                  <span>{nights} {getNightsText(nights, t)}</span>
                </div>
              )}
              
              {bedrooms && (
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <IoBedOutline className="w-5 h-5" />
                  <span>{bedrooms}+ {t('villas.bedrooms')}</span>
                </div>
              )}
            </div>

            {/* ========= ФИЛЬТРЫ ========= */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {/* Переключатель Аренда/Продажа */}
                <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-xl p-1">
                  <button
                    onClick={() => handleDealTypeChange('rent')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg text-sm font-medium transition-all
                      ${dealType === 'rent' 
                        ? 'bg-white text-blue-600 shadow-md' 
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    <HiCalendar className="w-4 h-4" />
                    {t('property.rent')}
                  </button>
                  <button
                    onClick={() => handleDealTypeChange('sale')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg text-sm font-medium transition-all
                      ${dealType === 'sale' 
                        ? 'bg-white text-green-600 shadow-md' 
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    <HiKey className="w-4 h-4" />
                    {t('property.sale')}
                  </button>
                </div>

                {/* Разделитель */}
                <div className="hidden sm:block w-px h-10 bg-white/30"></div>

                {/* Переключатель типов недвижимости */}
                <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-xl p-1 gap-1">
                  <button
                    onClick={() => handlePropertyTypeToggle('house')}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg text-sm font-medium transition-all
                      ${selectedPropertyTypes.includes('house') 
                        ? 'bg-white text-gray-800 shadow-md' 
                        : 'text-white/50 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    <BsHouseDoor className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('property.types.house')}</span>
                  </button>
                  <button
                    onClick={() => handlePropertyTypeToggle('villa')}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg text-sm font-medium transition-all
                      ${selectedPropertyTypes.includes('villa') 
                        ? 'bg-white text-gray-800 shadow-md' 
                        : 'text-white/50 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    <MdVilla className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('property.types.villa')}</span>
                  </button>
                  <button
                    onClick={() => handlePropertyTypeToggle('condo')}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg text-sm font-medium transition-all
                      ${selectedPropertyTypes.includes('condo') 
                        ? 'bg-white text-gray-800 shadow-md' 
                        : 'text-white/50 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    <MdApartment className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('property.types.condo')}</span>
                  </button>
                  
                  {/* Кнопка "Все" */}
                  {selectedPropertyTypes.length < 3 && (
                    <button
                      onClick={handleSelectAllTypes}
                      className="flex items-center justify-center py-2 px-3 rounded-lg text-xs font-medium transition-all
                               text-white/60 hover:text-white hover:bg-white/10 border border-white/30"
                    >
                      {t('common.all')}
                    </button>
                  )}
                </div>
              </div>

              {/* Подпись о выбранных типах */}
              <motion.p 
                key={selectedPropertyTypes.join(',')}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-white/70 text-sm"
              >
                {getPropertyTypesLabel}
              </motion.p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="container mx-auto px-4 py-12">
        {/* Loading overlay */}
        {loading && properties.length > 0 && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl">
              <LoadingSpinner />
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {properties.length === 0 && !loading ? (
            <motion.div
              key="no-results"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-20"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 max-w-md mx-auto">
                <HiSearch className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {t('villas.noResults')}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {t('villas.noResultsDescription')}
                </p>
                <button
                  onClick={handleResetFilters}
                  className={`font-semibold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl text-white
                    ${dealType === 'sale'
                      ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                    }`}
                >
                  {t('villas.showAllProperties')}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`grid-${dealType}-${selectedPropertyTypes.join(',')}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {properties.map((property, index) => (
                  <PropertyCard 
                    key={property.id} 
                    property={property} 
                    index={index}
                    nights={nights}
                    checkIn={checkIn}
                    checkOut={checkOut}
                    name={name}
                    bedrooms={bedrooms}
                    dealType={dealType}
                    isSearchMode={!!(checkIn || checkOut || bedrooms || name)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {console.log('🔍 RENDER Pagination check:', {
                'pagination.pages': pagination.pages,
                'typeof pages': typeof pagination.pages,
                'pages > 1': pagination.pages > 1,
                pagination
              })}
              {pagination.pages > 1 && (
                <Pagination 
                  pagination={pagination} 
                  onPageChange={handlePageChange}
                  dealType={dealType}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// PropertyCard Component
const PropertyCard = memo(({ property, index, nights, checkIn, checkOut, name, bedrooms, dealType, isSearchMode }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [showMapModal, setShowMapModal] = useState(false)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const { addItem, removeItem, isInShortlist } = useShortlistStore()
  const [showComplexModal, setShowComplexModal] = useState(false)

  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const monthName = t(`months.short.${month}`)
    return `${date.getDate()} ${monthName}`
  }, [t])

  const photos = property.photos || []
  const hasPhotos = photos.length > 0
  
  const getThumbnailUrl = useCallback((photoUrl) => {
    if (!photoUrl) return '/placeholder-villa.jpg'
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'
    if (photoUrl.startsWith('http')) return photoUrl
    
    const lastDot = photoUrl.lastIndexOf('.')
    if (lastDot > 0) {
      const thumbPath = photoUrl.substring(0, lastDot) + '_thumb' + photoUrl.substring(lastDot)
      return `${baseUrl}${thumbPath}`
    }
    return `${baseUrl}${photoUrl}`
  }, [])

  const handlePrevPhoto = useCallback((e) => {
    e.stopPropagation()
    setCurrentPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))
  }, [photos.length])

  const handleNextPhoto = useCallback((e) => {
    e.stopPropagation()
    setCurrentPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1))
  }, [photos.length])

  const handleTouchStart = useCallback((e) => {
    setTouchStart(e.touches[0].clientX)
  }, [])

  const handleTouchMove = useCallback((e) => {
    setTouchEnd(e.touches[0].clientX)
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe && currentPhotoIndex < photos.length - 1) {
      setCurrentPhotoIndex(prev => prev + 1)
    }
    if (isRightSwipe && currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1)
    }

    setTouchStart(0)
    setTouchEnd(0)
  }, [touchStart, touchEnd, currentPhotoIndex, photos.length])

  const handleCardClick = useCallback(() => {
    const propertyId = dealType === 'sale' 
      ? (property.min_sale_price_property_id || property.id)
      : (property.min_price_property_id || property.id)
    
    const url = dealType === 'sale'
      ? `/properties/${propertyId}?sale`
      : `/properties/${propertyId}`
    
    navigate(url)
  }, [navigate, property, dealType])

  const handleMapClick = useCallback((e) => {
    e.stopPropagation()
    setShowMapModal(true)
  }, [])

  const handleShortlistToggle = useCallback((e) => {
    e.stopPropagation()
    if (isInShortlist(property.id)) {
      removeItem(property.id)
      toast.success(t('featured.removedFromShortlist'))
    } else {
      addItem({
        ...property,
        name: property.property_name || property.name,
        photos: property.photos || []
      })
      toast.success(t('featured.addedToShortlist'))
    }
  }, [property, isInShortlist, addItem, removeItem, t])

  const formatPrice = (price) => {
    if (!price) return t('featured.priceOnRequest')
    return new Intl.NumberFormat('ru-RU').format(Math.round(price))
  }

  const formatNumber = (num) => {
    if (!num) return '0'
    return Math.round(num)
  }

  // ========= ЛОГИКА ПОЛУЧЕНИЯ ЦЕНЫ ДЛЯ АРЕНДЫ =========
  const getRentPriceInfo = useCallback(() => {
    const seasonalPricing = property.seasonalPricing || []
    const monthlyPricing = property.monthlyPricing || []
    const yearPrice = property.year_price

    const today = new Date()
    const currentMonth = today.getMonth() + 1
    const currentDay = today.getDate()

    // 1. Сезонные цены за ночь
    const perNightPricing = seasonalPricing.filter(p => 
      p.pricing_type === 'per_night' || !p.pricing_type
    )

    if (perNightPricing.length > 0) {
      const prices = perNightPricing
        .map(p => p.price_per_night)
        .filter(price => price > 0)
      
      const minPrice = prices.length > 0 ? Math.min(...prices) : null
      
      if (minPrice) {
        return {
          type: 'per_night',
          price: minPrice,
          label: t('featured.night')
        }
      }
    }

    // 2. Месячные цены
    if (monthlyPricing.length > 0) {
      let targetMonth = currentDay > 10 ? (currentMonth % 12) + 1 : currentMonth
      
      let monthPrice = monthlyPricing.find(m => m.month_number === targetMonth)
      
      if (!monthPrice || !monthPrice.price_per_month) {
        for (let i = 0; i < 12; i++) {
          const checkMonth = ((targetMonth - 1 + i) % 12) + 1
          monthPrice = monthlyPricing.find(m => m.month_number === checkMonth)
          if (monthPrice && monthPrice.price_per_month > 0) {
            targetMonth = checkMonth
            break
          }
        }
      }

      if (monthPrice && monthPrice.price_per_month > 0) {
        const monthName = t(`months.short.${targetMonth}`)
        return {
          type: 'monthly',
          price: monthPrice.price_per_month,
          label: monthName,
          isMonthly: true
        }
      }
    }

    // 3. Годовая цена
    if (yearPrice && yearPrice > 0) {
      return {
        type: 'yearly',
        price: yearPrice,
        label: t('featured.month'),
        isYearly: true
      }
    }

    // 4. Fallback на min_price
    if (property.min_price && property.min_price > 0) {
      return {
        type: 'per_night',
        price: property.min_price,
        label: t('featured.night')
      }
    }

    // 5. Fallback на complex_min_price
    if (property.complex_min_price && property.complex_min_price > 0) {
      return {
        type: 'per_night',
        price: property.complex_min_price,
        label: t('featured.night')
      }
    }

    return null
  }, [property, t])

  // ========= ЛОГИКА ПОЛУЧЕНИЯ ЦЕНЫ ДЛЯ ПРОДАЖИ =========
  const getSalePriceInfo = useCallback(() => {
    const salePrice = property.sale_price || property.complex_min_sale_price
    
    if (!salePrice || salePrice <= 0) {
      return null
    }

    let pricePerSqm = null

    if (property.plot_size && property.plot_size > 0) {
      pricePerSqm = Math.round(salePrice / property.plot_size)
    } else if (property.outdoor_area && property.outdoor_area > 0) {
      pricePerSqm = Math.round(salePrice / property.outdoor_area)
    } else if (property.indoor_area && property.indoor_area > 0) {
      pricePerSqm = Math.round(salePrice / property.indoor_area)
    }

    return {
      price: salePrice,
      pricePerSqm
    }
  }, [property])

  const guestsCount = property.bedrooms ? Math.round(property.bedrooms) * 2 : 0
  
  const hasCoordinates = property.coordinates 
    ? (property.coordinates.lat && property.coordinates.lng)
    : (property.latitude && property.longitude)
    
  const hasPeriodPrice = property.period_price && property.period_price.total

  const rentPriceInfo = dealType === 'rent' ? getRentPriceInfo() : null
  const salePriceInfo = dealType === 'sale' ? getSalePriceInfo() : null

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
        onClick={handleCardClick}
        className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 
                 hover:shadow-2xl transition-all cursor-pointer group"
      >
        {/* Image Carousel */}
        <div className="relative h-64 bg-gray-200 dark:bg-gray-700 overflow-hidden">
          {hasPhotos ? (
            <div 
              className="relative h-full"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={getThumbnailUrl(photos[currentPhotoIndex])}
                alt={property.property_name || t('featured.noName')}
                className="w-full h-full object-cover transition-opacity duration-300"
                onError={(e) => {
                  e.target.src = '/placeholder-villa.jpg'
                }}
              />
              
              {/* Navigation Arrows */}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={handlePrevPhoto}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white 
                             rounded-full flex items-center justify-center shadow-lg transition-all z-10
                             opacity-0 group-hover:opacity-100"
                  >
                    <HiChevronLeft className="w-5 h-5 text-gray-800" />
                  </button>
                  <button
                    onClick={handleNextPhoto}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white 
                             rounded-full flex items-center justify-center shadow-lg transition-all z-10
                             opacity-0 group-hover:opacity-100"
                  >
                    <HiChevronRight className="w-5 h-5 text-gray-800" />
                  </button>
              
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-1.5 z-10">
                    {photos.slice(0, 7).map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-1.5 rounded-full transition-all ${
                          idx === currentPhotoIndex 
                            ? 'w-6 bg-white' 
                            : 'w-1.5 bg-white/50'
                        }`}
                      />
                    ))}
                    {photos.length > 7 && (
                      <span className="text-white/70 text-xs ml-1">+{photos.length - 7}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <HiX className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">{t('featured.noPhotos')}</p>
              </div>
            </div>
          )}

          {/* Complex Badge */}
          {property.complex_name && 
           property.complex_count > 1 && 
           !checkIn && 
           !checkOut && 
           !name && 
           !bedrooms && (
            <motion.button
              onClick={(e) => {
                e.stopPropagation()
                setShowComplexModal(true)
              }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="absolute bottom-3 right-3 z-20 group/complex"
            >
              <span className={`text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center space-x-1.5 transition-colors
                ${dealType === 'sale'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                }`}>
                <HiHome className="w-3.5 h-3.5" />
                <span>{t('property.complex.badge')}</span>
                <span className="bg-white/30 px-2 py-0.5 rounded-full">
                  {property.complex_count}
                </span>
                <HiChevronRight className="w-3.5 h-3.5 group-hover/complex:translate-x-0.5 transition-transform" />
              </span>
            </motion.button>
          )}

          {/* Shortlist Button */}
          <button
            onClick={handleShortlistToggle}
            className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center
                       bg-white/90 hover:bg-white backdrop-blur-sm transition-all z-20 shadow-lg
                       ${isInShortlist(property.id) ? 'text-red-600' : 'text-gray-600 hover:text-red-600'}`}
          >
            <HiHeart className={`w-5 h-5 ${isInShortlist(property.id) ? 'fill-current' : ''}`} />
          </button>
          
          {/* Map Button */}
          {hasCoordinates && (
            <button
              onClick={handleMapClick}
              className={`absolute top-3 left-3 px-3 py-1.5 bg-white/90 hover:bg-white backdrop-blur-sm 
                       rounded-lg flex items-center space-x-1 text-gray-700 
                       transition-all z-20 shadow-lg text-sm font-medium
                       ${dealType === 'sale' ? 'hover:text-green-500' : 'hover:text-blue-500'}`}
            >
              <HiMap className="w-4 h-4" />
              <span>{t('featured.map')}</span>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Title */}
          <div className="flex items-center space-x-2 mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1 flex-1 min-w-0">
              {property.property_name || t('featured.noName')}
            </h3>
            {(isSearchMode || !property.complex_name) && property.property_number && property.property_number !== '1' && parseInt(property.property_number) !== 1 && (
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-md whitespace-nowrap flex-shrink-0
                ${dealType === 'sale'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                }`}>
                #{property.property_number}
              </span>
            )}
          </div>
          
          {/* Features Grid */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-1">
                <IoBedOutline className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">{t('featured.bedrooms')}</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatNumber(property.bedrooms)}
              </span>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-1">
                <MdBathtub className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">{t('featured.bathrooms')}</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatNumber(property.bathrooms)}
              </span>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-1">
                <IoExpand className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">{t('featured.area')}</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatNumber(property.indoor_area)}
              </span>
            </div>

{dealType === 'sale' ? (
  // Для продажи: тип владения → этажи → участок → скрыть
  (() => {
    const ownershipType = property.ownership_type || property.building_ownership || property.land_ownership
    const floors = property.floors || property.floor_count
    
    if (ownershipType) {
      // Показываем тип владения
      return (
        <div className="flex flex-col items-center text-center">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-1">
            <HiKey className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {t('featured.ownership')}
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {t(`property.ownership.${ownershipType.toLowerCase()}`, ownershipType)}
          </span>
        </div>
      )
    } else if (floors && floors > 0) {
      // Показываем количество этажей
      return (
        <div className="flex flex-col items-center text-center">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-1">
            <MdApartment className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {t('featured.floors')}
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {floors}
          </span>
        </div>
      )
    } else if (property.plot_size && property.plot_size > 0) {
      // Показываем площадь участка
      return (
        <div className="flex flex-col items-center text-center">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-1">
            <IoExpand className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {t('featured.plotSize')}
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatNumber(property.plot_size)}
          </span>
        </div>
      )
    }
    // Если ничего нет - пустой блок для сохранения сетки
    return (
      <div className="flex flex-col items-center text-center opacity-0">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-1">
          <span className="w-5 h-5" />
        </div>
        <span className="text-xs">-</span>
        <span className="text-sm">-</span>
      </div>
    )
  })()
) : (
  // Для аренды: количество гостей
  <div className="flex flex-col items-center text-center">
    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-1">
      <FaUsers className="w-5 h-5 text-green-600 dark:text-green-400" />
    </div>
    <span className="text-xs text-gray-600 dark:text-gray-400">
      {t('featured.guests')}
    </span>
    <span className="text-sm font-semibold text-gray-900 dark:text-white">
      {guestsCount}
    </span>
  </div>
)}
          </div>

{/* Price Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            {dealType === 'rent' ? (
              hasPeriodPrice ? (
                <div className="space-y-3">
                  <div className="flex flex-col space-y-1.5 text-xs text-gray-600 dark:text-gray-400 pb-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center space-x-1.5">
                      <HiCalendar className="w-4 h-4 text-blue-500" />
                      <span>
                        {formatDate(property.period_price.checkIn)} - {formatDate(property.period_price.checkOut)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <HiMoon className="w-4 h-4 text-indigo-500" />
                      <span>{nights} {getNightsText(nights, t)}</span>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('villas.totalFor')} {nights} {getNightsText(nights, t)}:
                    </span>
                    <span className="text-2xl font-bold text-blue-500">
                      ฿{formatPrice(property.period_price.total)}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between text-sm bg-gray-50 dark:bg-gray-700/30 rounded-lg px-3 py-2">
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('villas.averagePerNight')}:
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ฿{formatPrice(property.period_price.average_per_night)}/{t('featured.night')}
                    </span>
                  </div>
                </div>
              ) : rentPriceInfo ? (
                <div className="flex flex-col">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('featured.from')}</span>
                    <div className="flex items-baseline space-x-1">
                      <span className={`text-2xl font-bold bg-clip-text text-transparent
                        ${rentPriceInfo.isYearly 
                          ? 'bg-gradient-to-r from-purple-500 to-purple-600' 
                          : rentPriceInfo.isMonthly 
                            ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                            : 'bg-gradient-to-r from-blue-500 to-blue-600'
                        }`}>
                        ฿{formatPrice(rentPriceInfo.price)}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-500">/ {rentPriceInfo.label}</span>
                    </div>
                  </div>
                  {rentPriceInfo.isYearly && (
                    <span className="text-xs text-purple-500 dark:text-purple-400 mt-1 text-right">
                      {t('featured.yearlyContract')}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('featured.from')}</span>
                  <span className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                    {t('property.pricing.onRequest')}
                  </span>
                </div>
              )
            ) : (
              salePriceInfo ? (
                <div className="flex flex-col">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('property.pricing.price')}</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
                      ฿{formatPrice(salePriceInfo.price)}
                    </span>
                  </div>
                  {salePriceInfo.pricePerSqm && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                      ฿{formatPrice(salePriceInfo.pricePerSqm)} / {t('common.sqm')}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('property.pricing.price')}</span>
                  <span className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                    {t('property.pricing.onRequest')}
                  </span>
                </div>
              )
            )}
          </div>

          {/* Details Button */}
          <button
            onClick={handleCardClick}
            className={`mt-4 w-full text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg 
                     transform hover:scale-[1.02] active:scale-[0.98]
              ${dealType === 'sale'
                ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
              }`}
          >
            {t('featured.details')}
          </button>
        </div>
      </motion.div>

      {/* Map Modal */}
      <AnimatePresence>
        {showMapModal && hasCoordinates && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMapModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden 
                       w-full max-w-4xl max-h-[90vh] flex flex-col"
            >
              <div className={`p-5 flex items-center justify-between flex-shrink-0
                ${dealType === 'sale'
                  ? 'bg-gradient-to-r from-green-500 to-green-600'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600'
                }`}>
                <h2 className="text-xl font-bold text-white truncate pr-4">
                  {property.property_name || property.name}
                </h2>
                <button
                  onClick={() => setShowMapModal(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors flex-shrink-0"
                >
                  <HiX className="w-6 h-6 text-white" />
                </button>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <PropertyMap 
                  property={{
                    ...property,
                    latitude: property.coordinates?.lat || property.latitude,
                    longitude: property.coordinates?.lng || property.longitude,
                    name: property.property_name || property.name,
                  }} 
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Complex Modal */}
      <ComplexModal
        isOpen={showComplexModal}
        onClose={() => setShowComplexModal(false)}
        complexName={property.complex_name}
        currentPropertyId={property.id}
        totalCount={property.complex_count}
        dealType={dealType}
      />
    </>
  )
})

PropertyCard.displayName = 'PropertyCard'

// Pagination Component
const Pagination = memo(({ pagination, onPageChange, dealType }) => {
  const pages = []
  for (let i = 1; i <= pagination.pages; i++) {
    if (
      i === 1 ||
      i === pagination.pages ||
      (i >= pagination.page - 1 && i <= pagination.page + 1)
    ) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <div className="flex items-center justify-center space-x-2">
      <button
        onClick={() => onPageChange(pagination.page - 1)}
        disabled={pagination.page === 1}
        className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 
                 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 
                 disabled:cursor-not-allowed transition-all shadow-md"
      >
        <HiChevronLeft className="w-5 h-5" />
      </button>

      {pages.map((page, index) => (
        page === '...' ? (
          <span key={`ellipsis-${index}`} className="px-2 text-gray-500">...</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-4 py-2 rounded-lg transition-all shadow-md ${
              page === pagination.page
                ? dealType === 'sale'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {page}
          </button>
        )
      ))}

      <button
        onClick={() => onPageChange(pagination.page + 1)}
        disabled={pagination.page === pagination.pages}
        className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 
                 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 
                 disabled:cursor-not-allowed transition-all shadow-md"
      >
        <HiChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
})

Pagination.displayName = 'Pagination'

const getNightsText = (nights, t) => {
  if (nights === 1) return t('villas.nights1')
  if (nights >= 2 && nights <= 4) return t('villas.nights2to4')
  return t('villas.nights')
}

export default Villas