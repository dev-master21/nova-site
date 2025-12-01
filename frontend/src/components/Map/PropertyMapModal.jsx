// frontend/src/components/Map/PropertyMapModal.jsx
import React, { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  HiX,
  HiChevronLeft,
  HiChevronRight,
  HiHeart,
  HiKey,
  HiCalendar,
  HiHome
} from 'react-icons/hi'
import { IoBedOutline, IoExpand } from 'react-icons/io5'
import { MdBathtub } from 'react-icons/md'
import { FaUsers } from 'react-icons/fa'
import { useShortlistStore } from '../../store/shortlistStore'
import toast from 'react-hot-toast'

const PropertyMapModal = ({ property, onClose, dealTypeFilter = 'all' }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const { addItem, removeItem, isInShortlist } = useShortlistStore()

  if (!property) return null

  const photos = property.photos || []
  const hasPhotos = photos.length > 0

  // Определение типа сделки
  const propertyDealType = useMemo(() => {
    const dealType = property.deal_type?.toLowerCase() || 'rent'
    if (dealType === 'sale') return 'sale'
    if (dealType === 'both') return 'both'
    return 'rent'
  }, [property.deal_type])

  // Определяем какой тип показывать (для кнопки и цен)
  const displayDealType = useMemo(() => {
    if (dealTypeFilter === 'all') {
      return propertyDealType === 'both' ? 'rent' : propertyDealType
    }
    return dealTypeFilter
  }, [dealTypeFilter, propertyDealType])

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
    const url = displayDealType === 'sale'
      ? `/properties/${property.id}?sale`
      : `/properties/${property.id}`
    navigate(url)
    onClose()
  }, [navigate, property.id, displayDealType, onClose])

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

  // Закрытие при клике на оверлей
  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }, [onClose])

  // Закрытие при нажатии Escape
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

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

    // 4. Fallback на min_price или price_per_night
    if (property.min_price && property.min_price > 0) {
      return {
        type: 'per_night',
        price: property.min_price,
        label: t('featured.night')
      }
    }

    if (property.price_per_night && property.price_per_night > 0) {
      return {
        type: 'per_night',
        price: property.price_per_night,
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
  const rentPriceInfo = getRentPriceInfo()
  const salePriceInfo = getSalePriceInfo()

  // Определяем цвета в зависимости от типа
  const themeColors = displayDealType === 'sale' 
    ? {
        gradient: 'from-green-500 to-green-600',
        gradientHover: 'hover:from-green-600 hover:to-green-700',
        text: 'text-green-500',
        bg: 'bg-green-100 dark:bg-green-900/30',
        textDark: 'text-green-600 dark:text-green-400'
      }
    : {
        gradient: 'from-blue-500 to-blue-600',
        gradientHover: 'hover:from-blue-600 hover:to-blue-700',
        text: 'text-blue-500',
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        textDark: 'text-blue-600 dark:text-blue-400'
      }

  return (
    <AnimatePresence>
      <div className="modal-container">
        {/* Backdrop/Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleOverlayClick}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        >
          {/* Modal Content Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="property-modal-container relative w-full max-w-md"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute -top-12 right-0 w-10 h-10 flex items-center justify-center
                       bg-white/90 backdrop-blur-sm rounded-full transition-colors
                       shadow-lg z-10 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Close modal"
            >
              <HiX className="w-6 h-6 text-gray-700" />
            </button>

            {/* Property Card */}
            <motion.div
              onClick={handleCardClick}
              className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 
                       shadow-2xl cursor-pointer group"
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
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={currentPhotoIndex}
                        src={getThumbnailUrl(photos[currentPhotoIndex])}
                        alt={property.name || t('featured.noName')}
                        className="w-full h-full object-cover"
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ 
                          duration: 0.4,
                          ease: [0.4, 0, 0.2, 1]
                        }}
                        onError={(e) => {
                          e.target.src = '/placeholder-villa.jpg'
                        }}
                      />
                    </AnimatePresence>

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

                        {/* Photo Indicators */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-1.5 z-10">
                          {photos.slice(0, 7).map((_, idx) => (
                            <motion.div
                              key={idx}
                              className={`h-1.5 rounded-full transition-all ${
                                idx === currentPhotoIndex 
                                  ? 'w-6 bg-white' 
                                  : 'w-1.5 bg-white/50'
                              }`}
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0.2 }}
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
                      <HiHome className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">{t('featured.noPhotos')}</p>
                    </div>
                  </div>
                )}

                {/* Deal Type Badge */}
                <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-lg flex items-center gap-1.5
                  ${propertyDealType === 'sale' 
                    ? 'bg-green-500' 
                    : propertyDealType === 'both'
                      ? 'bg-purple-500'
                      : 'bg-blue-500'
                  }`}
                >
                  {propertyDealType === 'sale' ? (
                    <><HiKey className="w-3.5 h-3.5" /> {t('property.sale')}</>
                  ) : propertyDealType === 'both' ? (
                    <><HiHome className="w-3.5 h-3.5" /> {t('property.rentAndSale')}</>
                  ) : (
                    <><HiCalendar className="w-3.5 h-3.5" /> {t('property.rent')}</>
                  )}
                </div>

                {/* Shortlist Button */}
                <button
                  onClick={handleShortlistToggle}
                  className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center
                           bg-white/90 hover:bg-white backdrop-blur-sm transition-all z-20 shadow-lg
                           ${isInShortlist(property.id) ? 'text-red-500' : 'text-gray-600 hover:text-red-500'}`}
                >
                  <HiHeart className={`w-5 h-5 ${isInShortlist(property.id) ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Content */}
              <div className="p-5">
                {/* Title with Property Number Badge */}
                <div className="flex items-center space-x-2 mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1 flex-1 min-w-0">
                    {property.name || property.property_name || t('featured.noName')}
                  </h3>
                  {!property.complex_name && property.property_number && property.property_number !== '1' && parseInt(property.property_number) !== 1 && (
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-md whitespace-nowrap flex-shrink-0 ${themeColors.bg} ${themeColors.textDark}`}>
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

                  <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-1">
                      {displayDealType === 'sale' && property.plot_size > 0 ? (
                        <IoExpand className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <FaUsers className="w-5 h-5 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {displayDealType === 'sale' && property.plot_size > 0 ? t('featured.plotSize') : t('featured.guests')}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {displayDealType === 'sale' && property.plot_size > 0 ? formatNumber(property.plot_size) : guestsCount}
                    </span>
                  </div>
                </div>

                {/* Price Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  {/* Показываем обе цены если тип "both" и фильтр "all" */}
                  {propertyDealType === 'both' && dealTypeFilter === 'all' ? (
                    <div className="space-y-3">
                      {/* Rent Price */}
                      {rentPriceInfo && (
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                            <HiCalendar className="w-4 h-4" />
                            {t('property.rent')}:
                          </span>
                          <div className="text-right">
                            <span className={`text-xl font-bold ${
                              rentPriceInfo.isYearly 
                                ? 'text-purple-500' 
                                : rentPriceInfo.isMonthly 
                                  ? 'text-orange-500'
                                  : 'text-blue-500'
                            }`}>
                              ฿{formatPrice(rentPriceInfo.price)}
                            </span>
                            <span className="text-sm text-gray-500">/{rentPriceInfo.label}</span>
                          </div>
                        </div>
                      )}

                      {/* Sale Price */}
                      {salePriceInfo && (
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                            <HiKey className="w-4 h-4" />
                            {t('property.sale')}:
                          </span>
                          <div className="text-right">
                            <span className="text-xl font-bold text-green-500">
                              ฿{formatPrice(salePriceInfo.price)}
                            </span>
                            {salePriceInfo.pricePerSqm && (
                              <div className="text-xs text-gray-500">
                                ฿{formatPrice(salePriceInfo.pricePerSqm)} / {t('common.sqm')}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : displayDealType === 'sale' ? (
                    // Только продажа
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
                  ) : (
                    // Только аренда
                    rentPriceInfo ? (
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
                  )}
                </div>

                {/* Details Button(s) */}
                <div className={`mt-4 ${propertyDealType === 'both' && dealTypeFilter === 'all' ? 'grid grid-cols-2 gap-3' : ''}`}>
                  {propertyDealType === 'both' && dealTypeFilter === 'all' ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/properties/${property.id}`)
                          onClose()
                        }}
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                                 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg 
                                 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <HiCalendar className="w-4 h-4" />
                        {t('property.rent')}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/properties/${property.id}?sale`)
                          onClose()
                        }}
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 
                                 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg 
                                 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <HiKey className="w-4 h-4" />
                        {t('property.sale')}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleCardClick}
                      className={`w-full bg-gradient-to-r ${themeColors.gradient} ${themeColors.gradientHover}
                               text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg 
                               transform hover:scale-[1.02] active:scale-[0.98]`}
                    >
                      {t('featured.details')}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default PropertyMapModal