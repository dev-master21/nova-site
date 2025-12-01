import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { HiX, HiChevronRight, HiHome, HiCalendar, HiKey } from 'react-icons/hi'
import { IoBedOutline } from 'react-icons/io5'
import { MdBathtub } from 'react-icons/md'
import { IoExpand } from 'react-icons/io5'
import { FaUsers } from 'react-icons/fa'
import { propertyService } from '../../services/property.service'
import LoadingSpinner from '../common/LoadingSpinner'
import toast from 'react-hot-toast'

const ComplexModal = ({ 
  isOpen, 
  onClose, 
  complexName, 
  currentPropertyId, 
  totalCount,
  dealType = 'rent' // 'rent' или 'sale' - контекст откуда открыто
}) => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && complexName) {
      loadComplexProperties()
    }
  }, [isOpen, complexName, i18n.language])

  const loadComplexProperties = async () => {
    try {
      setLoading(true)
      // Не исключаем текущий объект - показываем все
      const response = await propertyService.getComplexProperties(
        complexName,
        i18n.language,
        null // Убрали currentPropertyId - показываем все объекты
      )
      
      console.log('🔍 Complex properties response:', response)
      
      if (response && response.data) {
        setProperties(response.data)
      } else if (Array.isArray(response)) {
        setProperties(response)
      } else {
        console.error('Unexpected response format:', response)
        setProperties([])
      }
    } catch (error) {
      console.error('Error loading complex properties:', error)
      toast.error(t('property.complex.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const getThumbnailUrl = (photoUrl) => {
    if (!photoUrl) return '/placeholder-villa.jpg'
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'
    if (photoUrl.startsWith('http')) return photoUrl
    
    const lastDot = photoUrl.lastIndexOf('.')
    if (lastDot > 0) {
      const thumbPath = photoUrl.substring(0, lastDot) + '_thumb' + photoUrl.substring(lastDot)
      return `${baseUrl}${thumbPath}`
    }
    return `${baseUrl}${photoUrl}`
  }

  const formatPrice = (price) => {
    if (!price) return null
    return new Intl.NumberFormat('ru-RU').format(Math.round(price))
  }

  const handlePropertyClick = (propertyId, targetDealType = dealType) => {
    const url = targetDealType === 'sale' 
      ? `/properties/${propertyId}?sale`
      : `/properties/${propertyId}`
    navigate(url)
    onClose()
  }

  // Определение типа сделки объекта
  const getPropertyDealType = useCallback((property) => {
    const type = property.deal_type?.toLowerCase() || 'rent'
    if (type === 'sale') return 'sale'
    if (type === 'both') return 'both'
    return 'rent'
  }, [])

  if (!isOpen) return null

  // Определяем цвета в зависимости от контекста
  const themeColors = dealType === 'sale' 
    ? {
        gradient: 'from-green-500 to-green-600',
        gradientHover: 'hover:from-green-600 hover:to-green-700',
        text: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-100 dark:bg-green-900/30',
        icon: <HiKey className="w-6 h-6 text-white" />
      }
    : {
        gradient: 'from-blue-500 to-blue-600',
        gradientHover: 'hover:from-blue-600 hover:to-blue-700',
        text: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        icon: <HiCalendar className="w-6 h-6 text-white" />
      }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="modal-container bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden w-full max-w-4xl max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className={`bg-gradient-to-r ${themeColors.gradient} p-5 flex-shrink-0`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <HiHome className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {t('property.complex.title')}: {complexName}
                  </h2>
                  <p className="text-white/90 text-sm">
                    {t('property.complex.totalProperties')}: {totalCount}
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 
                         rounded-xl transition-colors"
              >
                <HiX className="w-6 h-6 text-white" />
              </motion.button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : properties.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  {t('property.complex.noProperties')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {properties.map((property, index) => (
                  <ComplexPropertyCard
                    key={property.id}
                    property={property}
                    index={index}
                    dealType={dealType}
                    isCurrentProperty={property.id === currentPropertyId}
                    getThumbnailUrl={getThumbnailUrl}
                    formatPrice={formatPrice}
                    getPropertyDealType={getPropertyDealType}
                    onPropertyClick={handlePropertyClick}
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// Отдельный компонент карточки объекта в комплексе
const ComplexPropertyCard = ({ 
  property, 
  index, 
  dealType,
  isCurrentProperty,
  getThumbnailUrl, 
  formatPrice,
  getPropertyDealType,
  onPropertyClick,
  t 
}) => {
  const propertyDealType = getPropertyDealType(property)
  const isBoth = propertyDealType === 'both'

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

  const rentPriceInfo = getRentPriceInfo()
  const salePriceInfo = getSalePriceInfo()

  // Определяем что показывать
  const showRentPrice = isBoth || propertyDealType === 'rent'
  const showSalePrice = isBoth || propertyDealType === 'sale'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-gray-50 dark:bg-gray-700/50 rounded-xl overflow-hidden border 
                 transition-all group
                 ${isCurrentProperty 
                   ? 'border-blue-400 dark:border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' 
                   : 'border-gray-200 dark:border-gray-600 hover:shadow-lg cursor-pointer'
                 }`}
    >
      {/* Image */}
      <div className="relative h-40 bg-gray-200 dark:bg-gray-600">
        {property.photos && property.photos.length > 0 ? (
          <img
            src={getThumbnailUrl(property.photos[0])}
            alt={property.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <HiHome className="w-12 h-12 text-gray-400" />
          </div>
        )}

        {/* Current Property Badge */}
        {isCurrentProperty && (
          <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
            {t('property.complex.currentProperty') || 'Текущий'}
          </div>
        )}

        {/* Deal Type Badge */}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold text-white shadow-lg
          ${propertyDealType === 'sale' 
            ? 'bg-green-500' 
            : propertyDealType === 'both'
              ? 'bg-purple-500'
              : 'bg-blue-500'
          }`}
        >
          {propertyDealType === 'sale' 
            ? t('property.sale')
            : propertyDealType === 'both'
              ? t('property.rentAndSale') || 'Аренда/Продажа'
              : t('property.rent')
          }
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Title with Property Number */}
        <div className="flex items-center space-x-2 mb-2">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 flex-1 min-w-0">
            {property.name}
          </h3>
          {property.property_number && property.property_number !== '1' && parseInt(property.property_number) !== 1 && (
            <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 
                         text-xs font-semibold rounded whitespace-nowrap flex-shrink-0">
              #{property.property_number}
            </span>
          )}
        </div>

        {/* Features - Компактная сетка */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {/* Bedrooms */}
          <div className="flex flex-col items-center text-center">
            <div className="w-7 h-7 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-0.5">
              <IoBedOutline className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">{t('property.bedrooms')}</span>
            <span className="text-xs font-bold text-gray-900 dark:text-white">
              {Math.round(property.bedrooms || 0)}
            </span>
          </div>

          {/* Bathrooms */}
          <div className="flex flex-col items-center text-center">
            <div className="w-7 h-7 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center mb-0.5">
              <MdBathtub className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">{t('property.bathrooms')}</span>
            <span className="text-xs font-bold text-gray-900 dark:text-white">
              {Math.round(property.bathrooms || 0)}
            </span>
          </div>

          {/* Area */}
          <div className="flex flex-col items-center text-center">
            <div className="w-7 h-7 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-0.5">
              <IoExpand className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">м²</span>
            <span className="text-xs font-bold text-gray-900 dark:text-white">
              {Math.round(property.indoor_area || 0)}
            </span>
          </div>

          {/* Guests / Ownership / Floors / Plot Size */}
          {propertyDealType === 'sale' ? (
            // Для продажи: тип владения → этажи → участок → скрыть
            (() => {
              const ownershipType = property.ownership_type || property.building_ownership || property.land_ownership
              const floors = property.floors || property.floor_count
              
              if (ownershipType) {
                // Показываем тип владения
                return (
                  <div className="flex flex-col items-center text-center">
                    <div className="w-7 h-7 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-0.5">
                      <HiKey className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      {t('featured.ownership')}
                    </span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      {t(`property.ownership.${ownershipType.toLowerCase()}`, ownershipType)}
                    </span>
                  </div>
                )
              } else if (floors && floors > 0) {
                // Показываем количество этажей
                return (
                  <div className="flex flex-col items-center text-center">
                    <div className="w-7 h-7 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-0.5">
                      <HiHome className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      {t('featured.floors')}
                    </span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      {floors}
                    </span>
                  </div>
                )
              } else if (property.plot_size && property.plot_size > 0) {
                // Показываем площадь участка
                return (
                  <div className="flex flex-col items-center text-center">
                    <div className="w-7 h-7 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-0.5">
                      <IoExpand className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      {t('featured.plotSize')}
                    </span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      {Math.round(property.plot_size)}
                    </span>
                  </div>
                )
              }
              // Если ничего нет - пустой блок для сохранения сетки
              return (
                <div className="flex flex-col items-center text-center opacity-0">
                  <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center mb-0.5">
                    <span className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px]">-</span>
                  <span className="text-xs">-</span>
                </div>
              )
            })()
          ) : (
            // Для аренды: количество гостей
            <div className="flex flex-col items-center text-center">
              <div className="w-7 h-7 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-0.5">
                <FaUsers className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {t('property.guests')}
              </span>
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                {Math.round(property.bedrooms || 0) * 2}
              </span>
            </div>
          )}
        </div>

        {/* Price Section */}
        <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mb-3">
          {isBoth ? (
            // Показываем обе цены для "both"
            <div className="space-y-2">
              {/* Rent Price */}
              {rentPriceInfo && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                    <HiCalendar className="w-3.5 h-3.5" />
                    {t('property.rent')}:
                  </span>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${
                      rentPriceInfo.isYearly 
                        ? 'text-purple-500' 
                        : rentPriceInfo.isMonthly 
                          ? 'text-orange-500'
                          : 'text-blue-500'
                    }`}>
                      ฿{formatPrice(rentPriceInfo.price)}
                    </span>
                    <span className="text-xs text-gray-500">/{rentPriceInfo.label}</span>
                  </div>
                </div>
              )}

              {/* Sale Price */}
              {salePriceInfo && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                    <HiKey className="w-3.5 h-3.5" />
                    {t('property.sale')}:
                  </span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-green-500">
                      ฿{formatPrice(salePriceInfo.price)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : propertyDealType === 'sale' ? (
            // Только продажа
            salePriceInfo ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('property.pricing.price')}</span>
                <div className="text-right">
                  <span className="text-base font-bold text-green-500">
                    ฿{formatPrice(salePriceInfo.price)}
                  </span>
                  {salePriceInfo.pricePerSqm && (
                    <div className="text-[10px] text-gray-500">
                      ฿{formatPrice(salePriceInfo.pricePerSqm)} / м²
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{t('property.pricing.price')}</span>
                <span className="text-sm font-semibold text-amber-600">
                  {t('property.pricing.onRequest')}
                </span>
              </div>
            )
          ) : (
            // Только аренда
            rentPriceInfo ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('property.from')}</span>
                <div className="flex items-baseline space-x-1">
                  <span className={`text-base font-bold ${
                    rentPriceInfo.isYearly 
                      ? 'text-purple-500' 
                      : rentPriceInfo.isMonthly 
                        ? 'text-orange-500'
                        : 'text-blue-500'
                  }`}>
                    ฿{formatPrice(rentPriceInfo.price)}
                  </span>
                  <span className="text-xs text-gray-500">/ {rentPriceInfo.label}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{t('property.from')}</span>
                <span className="text-sm font-semibold text-amber-600">
                  {t('property.pricing.onRequest')}
                </span>
              </div>
            )
          )}
        </div>

        {/* Buttons */}
        {isBoth ? (
          // Две кнопки для "both"
          <div className="grid grid-cols-2 gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => {
                e.stopPropagation()
                onPropertyClick(property.id, 'rent')
              }}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700
                       text-white font-medium py-2 px-2 rounded-lg transition-all flex items-center 
                       justify-center space-x-1 text-xs shadow-md hover:shadow-lg"
            >
              <HiCalendar className="w-3.5 h-3.5" />
              <span>{t('property.rent')}</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => {
                e.stopPropagation()
                onPropertyClick(property.id, 'sale')
              }}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700
                       text-white font-medium py-2 px-2 rounded-lg transition-all flex items-center 
                       justify-center space-x-1 text-xs shadow-md hover:shadow-lg"
            >
              <HiKey className="w-3.5 h-3.5" />
              <span>{t('property.sale')}</span>
            </motion.button>
          </div>
        ) : (
          // Одна кнопка
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={(e) => {
              e.stopPropagation()
              onPropertyClick(property.id, propertyDealType === 'sale' ? 'sale' : 'rent')
            }}
            className={`w-full text-white font-medium py-2 px-3 rounded-lg transition-all flex items-center 
                     justify-center space-x-1.5 text-sm shadow-md hover:shadow-lg
                     ${propertyDealType === 'sale'
                       ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                       : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                     }`}
          >
            <span>{t('property.complex.viewDetails')}</span>
            <HiChevronRight className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

export default ComplexModal