import React, { useState, useEffect, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  HiHeart, 
  HiArrowRight,
  HiChevronLeft,
  HiChevronRight,
  HiMap,
  HiX,
  HiHome,
  HiCalendar,
  HiKey
} from 'react-icons/hi'
import { IoBedOutline, IoExpand } from 'react-icons/io5'
import { MdBathtub } from 'react-icons/md'
import { FaUsers } from 'react-icons/fa'
import LoadingSpinner from '../common/LoadingSpinner'
import PropertyMap from '../Property/PropertyMap'
import { mapService } from '../../services/map.service'
import { useShortlistStore } from '../../store/shortlistStore'
import toast from 'react-hot-toast'
import ComplexModal from '../Property/ComplexModal'

const FeaturedVillas = () => {
  const { t, i18n } = useTranslation()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('rent') // 'rent' или 'sale'

  useEffect(() => {
    loadFeaturedProperties()
  }, [i18n.language])

  const loadFeaturedProperties = async () => {
    try {
      setLoading(true)
      const response = await mapService.getPropertiesForMap()
      
      if (response && Array.isArray(response)) {
        setProperties(response)
      }
    } catch (error) {
      console.error('Error loading featured properties:', error)
      toast.error(t('featured.loadError'))
    } finally {
      setLoading(false)
    }
  }

  // Фильтруем объекты по режиму просмотра
  const getFilteredProperties = useCallback(() => {
    if (!properties || properties.length === 0) return []

    // Фильтруем по deal_type
    const filtered = properties.filter(property => {
      if (viewMode === 'rent') {
        return property.deal_type === 'rent' || property.deal_type === 'both'
      } else {
        return property.deal_type === 'sale' || property.deal_type === 'both'
      }
    })

    // ========= ГРУППИРОВКА ПО КОМПЛЕКСАМ =========
    const complexMap = new Map()
    const standaloneProperties = []

    for (const property of filtered) {
      if (property.complex_name) {
        // Объект в комплексе
        if (!complexMap.has(property.complex_name)) {
          complexMap.set(property.complex_name, property)
        } else {
          const existing = complexMap.get(property.complex_name)
          
          if (viewMode === 'rent') {
            // Для аренды сравниваем цены аренды
            const existingPrice = existing.complex_min_price || existing.price_per_night || Infinity
            const currentPrice = property.complex_min_price || property.price_per_night || Infinity
            
            if (currentPrice < existingPrice) {
              complexMap.set(property.complex_name, property)
            }
          } else {
            // Для продажи сравниваем цены продажи
            const existingPrice = existing.complex_min_sale_price || existing.sale_price || Infinity
            const currentPrice = property.complex_min_sale_price || property.sale_price || Infinity
            
            if (currentPrice < existingPrice) {
              complexMap.set(property.complex_name, property)
            }
          }
        }
      } else {
        standaloneProperties.push(property)
      }
    }

    const groupedProperties = [...complexMap.values(), ...standaloneProperties]
    
    // Берём только первые 6 объектов ПОСЛЕ группировки
    return groupedProperties.slice(0, 6)
  }, [properties, viewMode])

  const filteredProperties = getFilteredProperties()

  if (loading) {
    return (
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center min-h-[400px]">
            <LoadingSpinner size="large" />
          </div>
        </div>
      </section>
    )
  }

  if (!properties || properties.length === 0) {
    return null
  }

  return (
    <section className="py-20 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {t('featured.title')}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-6">
            {t('featured.subtitle')}
          </p>
          
          {/* Переключатель Аренда/Продажа */}
          <div className="flex justify-center">
            <div className="inline-flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('rent')}
                className={`flex items-center justify-center gap-2 py-2.5 px-5 rounded-md text-sm font-medium transition-all
                  ${viewMode === 'rent' 
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
              >
                <HiCalendar className="w-4 h-4" />
                {t('property.rent')}
              </button>
              <button
                onClick={() => setViewMode('sale')}
                className={`flex items-center justify-center gap-2 py-2.5 px-5 rounded-md text-sm font-medium transition-all
                  ${viewMode === 'sale' 
                    ? 'bg-white dark:bg-gray-600 text-green-600 dark:text-green-400 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
              >
                <HiKey className="w-4 h-4" />
                {t('property.sale')}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Properties Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          >
            {filteredProperties.length > 0 ? (
              filteredProperties.map((property, index) => (
                <PropertyCard
                  key={`${viewMode}-${property.id}`}
                  property={property}
                  index={index}
                  viewMode={viewMode}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  {viewMode === 'rent' ? t('featured.noRentProperties') : t('featured.noSaleProperties')}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 flex justify-center"
        >
          <motion.button
            onClick={() => window.location.href = viewMode === 'sale' ? '/villas?sale' : '/villas'}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center space-x-2 font-semibold py-4 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl
              ${viewMode === 'sale'
                ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
              }`}
          >
            <span>{t('featured.viewAll')}</span>
            <HiArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}

const PropertyCard = memo(({ property, index, viewMode }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [showMapModal, setShowMapModal] = useState(false)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const { addItem, removeItem, isInShortlist } = useShortlistStore()
  const [showComplexModal, setShowComplexModal] = useState(false)

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
    const url = viewMode === 'sale' 
      ? `/properties/${property.min_sale_price_property_id || property.id}?sale`
      : `/properties/${property.min_price_property_id || property.id}`
    navigate(url)
  }, [navigate, property, viewMode])

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
        name: property.name || property.property_name,
        photos: property.photos || []
      })
      toast.success(t('featured.addedToShortlist'))
    }
  }, [property, isInShortlist, addItem, removeItem, t])

  const formatPrice = (price) => {
    if (!price) return t('featured.priceOnRequest')
    return new Intl.NumberFormat('ru-RU').format(Math.round(price))
  }

  // ========= ЛОГИКА ПОЛУЧЕНИЯ ЦЕНЫ ДЛЯ АРЕНДЫ =========
  const getRentPriceInfo = useCallback(() => {
    const seasonalPricing = property.seasonalPricing || []
    const monthlyPricing = property.monthlyPricing || []
    const yearPrice = property.year_price

    // Получаем текущую дату
    const today = new Date()
    const currentMonth = today.getMonth() + 1
    const currentDay = today.getDate()

    // Функция для проверки попадания даты в диапазон (формат DD-MM)
    const isDateInRange = (targetDay, targetMonth, startDateStr, endDateStr) => {
      const [startDay, startMonth] = startDateStr.split('-').map(Number)
      const [endDay, endMonth] = endDateStr.split('-').map(Number)

      if (startMonth < endMonth || (startMonth === endMonth && startDay <= endDay)) {
        if (targetMonth > startMonth && targetMonth < endMonth) return true
        if (targetMonth === startMonth && targetDay >= startDay) return true
        if (targetMonth === endMonth && targetDay <= endDay) return true
        return false
      } else {
        if (targetMonth > startMonth || (targetMonth === startMonth && targetDay >= startDay)) return true
        if (targetMonth < endMonth || (targetMonth === endMonth && targetDay <= endDay)) return true
        return false
      }
    }

    // Функция для получения ближайшего периода
    const getNearestPeriod = (pricing) => {
      const isCurrentOrFuture = (startDateStr) => {
        const [startDay, startMonth] = startDateStr.split('-').map(Number)
        if (startMonth > currentMonth) return true
        if (startMonth === currentMonth && startDay >= currentDay) return true
        return false
      }
      
      const futurePeriods = pricing.filter(p => isCurrentOrFuture(p.start_date_recurring))
      
      if (futurePeriods.length === 0) return null
      
      futurePeriods.sort((a, b) => {
        const [dayA, monthA] = a.start_date_recurring.split('-').map(Number)
        const [dayB, monthB] = b.start_date_recurring.split('-').map(Number)
        if (monthA !== monthB) return monthA - monthB
        return dayA - dayB
      })
      
      return futurePeriods[0]
    }

    // 1. Приоритет: Сезонные цены за ночь (per_night)
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

    // 2. Сезонные цены за период (per_period)
    const perPeriodPricing = seasonalPricing.filter(p => 
      p.pricing_type === 'per_period'
    )

    if (perPeriodPricing.length > 0) {
      const nearestPeriod = getNearestPeriod(perPeriodPricing)
      
      if (nearestPeriod && nearestPeriod.price_per_night > 0) {
        return {
          type: 'per_period',
          price: nearestPeriod.price_per_night,
          label: t('featured.period'),
          periodInfo: `${nearestPeriod.start_date_recurring} - ${nearestPeriod.end_date_recurring}`
        }
      }
    }

    // 3. Месячные цены
    if (monthlyPricing.length > 0) {
      // Если сегодня после 10-го числа - показываем следующий месяц
      let targetMonth = currentDay > 10 ? (currentMonth % 12) + 1 : currentMonth
      
      let monthPrice = monthlyPricing.find(m => m.month_number === targetMonth)
      
      // Если нет цены на целевой месяц, ищем ближайший
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

    // 4. Годовая цена
    if (yearPrice && yearPrice > 0) {
      return {
        type: 'yearly',
        price: yearPrice,
        label: t('featured.month'),
        isYearly: true
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

    // Расчет цены за кв.м (приоритет: plot_size > outdoor_area > indoor_area)
    let pricePerSqm = null
    let areaType = null

    if (property.plot_size && property.plot_size > 0) {
      pricePerSqm = Math.round(salePrice / property.plot_size)
      areaType = 'plot'
    } else if (property.outdoor_area && property.outdoor_area > 0) {
      pricePerSqm = Math.round(salePrice / property.outdoor_area)
      areaType = 'outdoor'
    } else if (property.indoor_area && property.indoor_area > 0) {
      pricePerSqm = Math.round(salePrice / property.indoor_area)
      areaType = 'indoor'
    }

    return {
      price: salePrice,
      pricePerSqm,
      areaType
    }
  }, [property])

  const guestsCount = property.bedrooms ? Math.round(property.bedrooms) * 2 : 0
  const hasCoordinates = property.coordinates && property.coordinates.lat && property.coordinates.lng

  // Получаем информацию о цене в зависимости от режима
  const rentPriceInfo = viewMode === 'rent' ? getRentPriceInfo() : null
  const salePriceInfo = viewMode === 'sale' ? getSalePriceInfo() : null

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.1 }}
        onClick={handleCardClick}
        className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 
                 hover:shadow-2xl transition-all cursor-pointer group"
      >
        {/* Image Carousel */}
        <div className="relative h-64 bg-gray-200 dark:bg-gray-700">
          {hasPhotos ? (
            <>
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentPhotoIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  src={getThumbnailUrl(photos[currentPhotoIndex])}
                  alt={property.name}
                  className="w-full h-full object-cover"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                />
              </AnimatePresence>

              {photos.length > 1 && (
                <>
                  <button
                    onClick={handlePrevPhoto}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 dark:bg-gray-800/90 
                             rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 
                             transition-opacity shadow-lg hover:bg-white dark:hover:bg-gray-700 z-10"
                  >
                    <HiChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </button>
                  <button
                    onClick={handleNextPhoto}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 dark:bg-gray-800/90 
                             rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 
                             transition-opacity shadow-lg hover:bg-white dark:hover:bg-gray-700 z-10"
                  >
                    <HiChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </button>

                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-1.5 z-10">
                    {photos.slice(0, 5).map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-1 rounded-full transition-all ${
                          idx === currentPhotoIndex
                            ? 'w-8 bg-white'
                            : 'w-1.5 bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Shortlist Button */}
              <button
                onClick={handleShortlistToggle}
                className="absolute top-3 right-3 w-10 h-10 bg-white/90 dark:bg-gray-800/90 rounded-full 
                         flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 
                         transition-all shadow-lg z-10 group/heart"
              >
                <HiHeart className={`w-6 h-6 transition-all ${
                  isInShortlist(property.id)
                    ? 'text-blue-500 fill-current scale-110'
                    : 'text-gray-600 dark:text-gray-300 group-hover/heart:text-blue-500'
                }`} />
              </button>

              {/* Sale Badge */}
              {viewMode === 'sale' && (
                <div className="absolute top-3 left-3 z-10">
                  <span className="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1 rounded-full 
                                 text-xs font-bold shadow-lg">
                    {t('property.forSale')}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-gray-400 dark:text-gray-500">{t('featured.noPhotos')}</span>
            </div>
          )}
          
          {/* Complex Badge */}
          {property.complex_name && property.complex_count > 1 && (
            <motion.button
              onClick={(e) => {
                e.stopPropagation()
                setShowComplexModal(true)
              }}
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="absolute bottom-3 left-3 z-10 group"
            >
              <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1.5 rounded-full 
                             text-xs font-bold shadow-lg flex items-center space-x-1.5
                             hover:from-blue-600 hover:to-blue-700 transition-colors">
                <HiHome className="w-3.5 h-3.5" />
                <span>{t('property.complex.badge')}</span>
                <span className="bg-white/30 px-2 py-0.5 rounded-full">
                  {property.complex_count}
                </span>
                <HiChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </motion.button>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Title with Property Number Badge */}
          <div className="flex items-center space-x-2 mb-3">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-1 flex-1 min-w-0
                       group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
              {property.name || t('featured.noName')}
            </h3>
            {!property.complex_name && property.property_number && property.property_number !== '1' && parseInt(property.property_number) !== 1 && (
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 
                             text-xs font-semibold rounded-md whitespace-nowrap flex-shrink-0">
                #{property.property_number}
              </span>
            )}
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Bedrooms */}
            {property.bedrooms && (
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <IoBedOutline className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-500">{t('featured.bedrooms')}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{Math.round(property.bedrooms)}</span>
                </div>
              </div>
            )}

            {/* Bathrooms */}
            {property.bathrooms && (
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                <div className="w-8 h-8 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center">
                  <MdBathtub className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-500">{t('featured.bathrooms')}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{Math.round(property.bathrooms)}</span>
                </div>
              </div>
            )}

            {/* Area */}
            {property.indoor_area && (
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <IoExpand className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-500">{t('featured.area')}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{Math.round(property.indoor_area)} {t('common.sqm')}</span>
                </div>
              </div>
            )}

            {/* Guests (only for rent) / Plot Size (for sale) */}
            {viewMode === 'rent' ? (
              guestsCount > 0 && (
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <FaUsers className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 dark:text-gray-500">{t('featured.guests')}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{guestsCount}</span>
                  </div>
                </div>
              )
            ) : (
              property.plot_size && property.plot_size > 0 && (
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <IoExpand className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 dark:text-gray-500">{t('featured.plotSize')}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{Math.round(property.plot_size)} {t('common.sqm')}</span>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Price */}
          <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            {viewMode === 'rent' ? (
              // ========= ЦЕНА АРЕНДЫ =========
              rentPriceInfo ? (
                <div className="flex flex-col">
                  <div className="flex items-baseline space-x-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('featured.from')}</span>
                    <span className={`text-2xl font-bold bg-clip-text text-transparent
                      ${rentPriceInfo.isYearly 
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600' 
                        : rentPriceInfo.isMonthly 
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                          : 'bg-gradient-to-r from-blue-500 to-blue-600'
                      }`}>
                      ฿{formatPrice(rentPriceInfo.price)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">/ {rentPriceInfo.label}</span>
                  </div>
                  {rentPriceInfo.periodInfo && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {t('featured.periodDates')}: {rentPriceInfo.periodInfo}
                    </span>
                  )}
                  {rentPriceInfo.isYearly && (
                    <span className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                      {t('featured.yearlyContract')}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xl font-bold text-gray-500 dark:text-gray-400">
                  {t('featured.priceOnRequest')}
                </span>
              )
            ) : (
              // ========= ЦЕНА ПРОДАЖИ =========
              salePriceInfo ? (
                <div className="flex flex-col">
                  <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
                      ฿{formatPrice(salePriceInfo.price)}
                    </span>
                  </div>
                  {salePriceInfo.pricePerSqm && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      ฿{formatPrice(salePriceInfo.pricePerSqm)} / {t('common.sqm')}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xl font-bold text-gray-500 dark:text-gray-400">
                  {t('featured.priceOnRequest')}
                </span>
              )
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={handleMapClick}
              disabled={!hasCoordinates}
              className="flex items-center justify-center space-x-1.5 bg-gray-100 dark:bg-gray-700 
                       hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300
                       font-medium py-2.5 px-3 rounded-lg transition-all text-sm
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100
                       dark:disabled:hover:bg-gray-700"
            >
              <HiMap className="w-4 h-4" />
              <span>{t('featured.map')}</span>
            </button>
            
            <button 
              className={`flex items-center justify-center space-x-1.5 font-medium py-2.5 px-3 rounded-lg 
                       transition-all text-sm shadow-md hover:shadow-lg text-white
                       ${viewMode === 'sale'
                         ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                         : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                       }`}
            >
              <span>{t('featured.details')}</span>
              <HiArrowRight className="w-4 h-4" />
            </button>
          </div>
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
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-5 flex items-center justify-between flex-shrink-0">
                <h2 className="text-xl font-bold text-white truncate pr-4">
                  {property.name}
                </h2>
                <button
                  onClick={() => setShowMapModal(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors flex-shrink-0"
                >
                  <HiX className="w-6 h-6 text-white" />
                </button>
              </div>
              
              {/* Map Container */}
              <div className="flex-1 overflow-hidden">
                <PropertyMap 
                  property={{
                    ...property,
                    latitude: property.coordinates.lat,
                    longitude: property.coordinates.lng,
                    name: property.name,
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
        dealType={viewMode}
      />
    </>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.property.id === nextProps.property.id &&
    prevProps.index === nextProps.index &&
    prevProps.viewMode === nextProps.viewMode
  )
})

PropertyCard.displayName = 'PropertyCard'

export default FeaturedVillas