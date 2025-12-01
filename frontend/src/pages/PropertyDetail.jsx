import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiArrowLeft,
  HiHeart,
  HiShare,
  HiLocationMarker,
  HiCurrencyDollar,
  HiCalendar,
  HiUsers,
  HiHome,
  HiCube,
  HiCheckCircle,
  HiEye,
  HiClock,
  HiSparkles,
  HiShieldCheck,
  HiLightningBolt,
  HiX,
  HiChevronDown,
  HiOfficeBuilding,
  HiKey,
  HiDocumentText,
  HiSwitchHorizontal
} from 'react-icons/hi'
import { IoBedOutline, IoExpand, IoWater } from 'react-icons/io5'
import { MdBathtub, MdBalcony, MdKitchen, MdStairs } from 'react-icons/md'
import { FaSwimmingPool, FaParking, FaWifi } from 'react-icons/fa'
import PropertyGallery from '../components/Property/PropertyGallery'
import PropertyCalendar from '../components/Property/PropertyCalendar'
import SeasonalPriceTable from '../components/Property/SeasonalPriceTable'
import MonthlyPriceTable from '../components/Property/MonthlyPriceTable'
import YearlyPriceBlock from '../components/Property/YearlyPriceBlock'
import PriceCalculator from '../components/Property/PriceCalculator'
import AlternativeProperties from '../components/Property/AlternativeProperties'
import AvailabilityFinder from '../components/Property/AvailabilityFinder'
import BookingForm from '../components/Property/BookingForm'
import PropertyMap from '../components/Property/PropertyMap'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { propertyService } from '../services/property.service'
import { useShortlistStore } from '../store/shortlistStore'
import toast from 'react-hot-toast'
import ComplexProperties from '../components/Property/ComplexProperties'

const PropertyDetail = () => {
  const { t, i18n } = useTranslation()
  const { propertyId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tomorrowPrice, setTomorrowPrice] = useState(null)
  const [showCalculator, setShowCalculator] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedDates, setSelectedDates] = useState({ checkIn: null, checkOut: null })
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')
  const { addItem, removeItem, isInShortlist } = useShortlistStore()
  const [alternativesParams, setAlternativesParams] = useState(null)
  const [openFeatureCategories, setOpenFeatureCategories] = useState({
    rental: true,
    property: false,
    outdoor: false,
    location: false,
    view: false
  })

  // ========= Режим просмотра (rent/sale) =========
  const [viewMode, setViewMode] = useState('rent')

  useEffect(() => {
    const saleParam = searchParams.has('sale')
    if (saleParam) {
      setViewMode('sale')
    } else {
      setViewMode('rent')
    }
  }, [searchParams])

  useEffect(() => {
    if (property) {
      const dealType = property.deal_type
      
      if (dealType === 'sale') {
        setViewMode('sale')
      } else if (dealType === 'rent') {
        setViewMode('rent')
      } else if (dealType === 'both') {
        const saleParam = searchParams.has('sale')
        setViewMode(saleParam ? 'sale' : 'rent')
      }
    }
  }, [property, searchParams])

  const toggleViewMode = (mode) => {
    setViewMode(mode)
    if (mode === 'sale') {
      searchParams.set('sale', '')
      setSearchParams(searchParams)
    } else {
      searchParams.delete('sale')
      setSearchParams(searchParams)
    }
  }

  const showModeToggle = property?.deal_type === 'both'
  const isSaleMode = viewMode === 'sale'

  useEffect(() => {
    loadProperty()
    if (!isSaleMode) {
      loadTomorrowPrice()
    }
  }, [propertyId, i18n.language])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [propertyId])

  useEffect(() => {
    const handleScroll = () => {
      const sections = isSaleMode 
        ? ['overview', 'features', 'saleinfo']
        : ['overview', 'features', 'pricing', 'calendar', 'availability']

      const scrollPosition = window.scrollY + 250

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i])
        if (section) {
          const sectionTop = section.offsetTop
          if (scrollPosition >= sectionTop) {
            setActiveSection(sections[i])
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isSaleMode])

  const loadProperty = async () => {
    try {
      setLoading(true)
      const response = await propertyService.getPropertyDetails(propertyId, i18n.language)
      
      if (response.success) {
        setProperty(response.data.property)
      }
    } catch (error) {
      console.error('Error loading property:', error)
      toast.error(t('property.loadError'))
      navigate('/properties')
    } finally {
      setLoading(false)
    }
  }

  const loadTomorrowPrice = async () => {
    try {
      const response = await propertyService.getTomorrowPrice(propertyId)
      if (response.success && response.data.price) {
        setTomorrowPrice(response.data.price)
      }
    } catch (error) {
      console.error('Error loading tomorrow price:', error)
    }
  }

  const handleShortlistToggle = useCallback(() => {
      if (isInShortlist(property.id)) {
        removeItem(property.id)
        toast.success(t('property.removedFromShortlist'))
      } else {
        const shortlistItem = {
          id: property.id,
          name: property.name || property.property_name || 'Property',
          property_name: property.name || property.property_name,
          photos: property.photos || [],
          bedrooms: property.bedrooms || 0,
          bathrooms: property.bathrooms || 0,
          indoor_area: property.indoor_area || 0,
          price_per_night: tomorrowPrice || property.min_price || 0,
          min_price: tomorrowPrice || property.min_price || 0,
          property_number: property.property_number,
          coordinates: property.coordinates || {
            lat: property.latitude,
            lng: property.longitude
          },
          latitude: property.latitude,
          longitude: property.longitude
        }
        
        console.log('Adding to shortlist:', shortlistItem)
        addItem(shortlistItem)
        toast.success(t('property.addedToShortlist'))
      }
    }, [property, tomorrowPrice, isInShortlist, addItem, removeItem, t])

  const handleShare = async () => {
    const url = window.location.href
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: property.name,
          text: property.description?.substring(0, 100),
          url: url
        })
        toast.success(t('property.shared'))
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error)
        }
      }
    } else {
      navigator.clipboard.writeText(url)
      toast.success(t('property.linkCopied'))
    }
  }

const handleDateRangeSelect = (dates) => {
  setSelectedDates(dates)
  
  const { checkIn, checkOut } = dates
  
  const extractDateStr = (dateValue) => {
    if (!dateValue) return null
    const str = String(dateValue)
    if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
      return str.substring(0, 10)
    }
    return null
  }

  const addDays = (dateStr, days) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day))
    date.setUTCDate(date.getUTCDate() + days)
    
    const y = date.getUTCFullYear()
    const m = String(date.getUTCMonth() + 1).padStart(2, '0')
    const d = String(date.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const daysDiff = (date1Str, date2Str) => {
    const [y1, m1, d1] = date1Str.split('-').map(Number)
    const [y2, m2, d2] = date2Str.split('-').map(Number)
    
    const time1 = Date.UTC(y1, m1 - 1, d1)
    const time2 = Date.UTC(y2, m2 - 1, d2)
    
    return Math.round((time2 - time1) / (1000 * 60 * 60 * 24))
  }

  const allDatesSet = new Set()
  
  property.blockedDates?.forEach((block) => {
    const dateStr = extractDateStr(block.blocked_date || block.date || block)
    if (dateStr) {
      allDatesSet.add(dateStr)
    }
  })

  property.bookings?.forEach(booking => {
    const bookingCheckIn = extractDateStr(booking.check_in_date || booking.check_in)
    const bookingCheckOut = extractDateStr(booking.check_out_date || booking.check_out)
    
    if (bookingCheckIn && bookingCheckOut) {
      let current = bookingCheckIn
      while (current <= bookingCheckOut) {
        allDatesSet.add(current)
        current = addDays(current, 1)
      }
    }
  })

  const sortedDates = Array.from(allDatesSet).sort()
  const freeFirstDays = new Set()

  if (sortedDates.length > 0) {
    const periods = []
    let currentPeriod = [sortedDates[0]]

    for (let i = 1; i < sortedDates.length; i++) {
      const diff = daysDiff(sortedDates[i - 1], sortedDates[i])
      
      if (diff === 1) {
        currentPeriod.push(sortedDates[i])
      } else {
        periods.push([...currentPeriod])
        currentPeriod = [sortedDates[i]]
      }
    }
    
    if (currentPeriod.length > 0) {
      periods.push(currentPeriod)
    }

    periods.forEach((period) => {
      freeFirstDays.add(period[0])
    })
  }

  const checkInStr = extractDateStr(checkIn)
  const checkOutStr = extractDateStr(checkOut)
  
  let isAvailable = true
  let current = checkInStr
  
  while (current < checkOutStr) {
    if (freeFirstDays.has(current)) {
      current = addDays(current, 1)
      continue
    }
    
    const inBlocked = property.blockedDates?.some(block => {
      const blockDate = extractDateStr(block.blocked_date || block.date || block)
      return blockDate === current
    })
    
    if (inBlocked) {
      isAvailable = false
      break
    }
    
    const inBookings = property.bookings?.some(booking => {
      const bookingCheckIn = extractDateStr(booking.check_in_date || booking.check_in)
      const bookingCheckOut = extractDateStr(booking.check_out_date || booking.check_out)
      
      if (!bookingCheckIn || !bookingCheckOut) return false
      
      return current >= bookingCheckIn && current < bookingCheckOut
    })
    
    if (inBookings) {
      isAvailable = false
      break
    }
    
    current = addDays(current, 1)
  }

  if (!isAvailable) {
    setAlternativesParams({
      startDate: checkInStr,
      endDate: checkOutStr,
      nightsCount: daysDiff(checkInStr, checkOutStr)
    })
    setShowAlternatives(true)
    toast.error(t('property.notAvailable'))
    setTimeout(() => {
      scrollToSection('alternatives')
    }, 300)
  } else {
    setShowCalculator(true)
  }
}

  const getPhotoUrl = (photoUrl) => {
    if (!photoUrl) return '/placeholder-villa.jpg'
    if (photoUrl.startsWith('http')) return photoUrl
    return `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${photoUrl}`
  }

  const getFeatureIcon = (feature) => {
    const icons = {
      'airConditioning': <HiCheckCircle className="w-4 h-4" />,
      'wifi': <HiCheckCircle className="w-4 h-4" />,
      'pool': <HiCheckCircle className="w-4 h-4" />,
      'privatePool': <HiCheckCircle className="w-4 h-4" />,
      'parking': <HiCheckCircle className="w-4 h-4" />,
      'kitchen': <HiCheckCircle className="w-4 h-4" />,
      'balcony': <HiCheckCircle className="w-4 h-4" />,
      'garden': <HiCheckCircle className="w-4 h-4" />,
      'beachAccess': <HiCheckCircle className="w-4 h-4" />,
      'gym': <HiCheckCircle className="w-4 h-4" />,
      'security': <HiShieldCheck className="w-4 h-4" />
    }
    return icons[feature] || <HiCheckCircle className="w-4 h-4" />
  }

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId)
    const element = document.getElementById(sectionId)
    if (element) {
      const headerOffset = 150
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset

      const startPosition = window.pageYOffset
      const distance = offsetPosition - startPosition
      const duration = 800
      let start = null

      const animation = (currentTime) => {
        if (start === null) start = currentTime
        const timeElapsed = currentTime - start
        const progress = Math.min(timeElapsed / duration, 1)
        
        const ease = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2

        window.scrollTo(0, startPosition + distance * ease)

        if (timeElapsed < duration) {
          requestAnimationFrame(animation)
        }
      }

      requestAnimationFrame(animation)
    }
  }

  const toggleFeatureCategory = (category) => {
    setOpenFeatureCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  // ========= Вспомогательные функции для режима продажи =========
  
  const formatSalePrice = (price) => {
    if (!price || parseFloat(price) === 0) return t('property.pricing.onRequest')
    return `฿${Math.round(parseFloat(price)).toLocaleString()}`
  }

  const calculatePricePerSqm = () => {
    if (!property.sale_price || parseFloat(property.sale_price) === 0) return null
    
    const salePrice = parseFloat(property.sale_price)
    let area = null
    let areaType = null

    if (property.plot_size && parseFloat(property.plot_size) > 0) {
      area = parseFloat(property.plot_size)
      areaType = 'plot'
    } else if (property.outdoor_area && parseFloat(property.outdoor_area) > 0) {
      area = parseFloat(property.outdoor_area)
      areaType = 'outdoor'
    } else if (property.indoor_area && parseFloat(property.indoor_area) > 0) {
      area = parseFloat(property.indoor_area)
      areaType = 'indoor'
    }

    if (!area) return null

    return {
      pricePerSqm: Math.round(salePrice / area),
      area: Math.round(area),
      areaType
    }
  }

  const getOwnershipLabel = (type) => {
    const labels = {
      'freehold': t('property.ownership.freehold'),
      'leasehold': t('property.ownership.leasehold'),
      'foreign_freehold': t('property.ownership.foreignFreehold'),
      'company': t('property.ownership.company'),
      'usufruct': t('property.ownership.usufruct')
    }
    return labels[type] || type
  }

  const getMonthName = (monthNum) => {
    if (!monthNum) return null
    return t(`months.full-first.${parseInt(monthNum)}`)
  }

  // ========= Компонент переключателя режима =========
  const ModeToggle = () => {
    if (!showModeToggle) return null
    
    return (
      <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <button
          onClick={() => toggleViewMode('rent')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2
            ${!isSaleMode 
              ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
        >
          <HiCalendar className="w-4 h-4" />
          {t('property.rent')}
        </button>
        <button
          onClick={() => toggleViewMode('sale')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2
            ${isSaleMode 
              ? 'bg-white dark:bg-gray-600 text-green-600 dark:text-green-400 shadow-sm' 
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
        >
          <HiKey className="w-4 h-4" />
          {t('property.sale')}
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (!property) {
    return null
  }

  const blockedDateStrings = property.blockedDates?.map(block => block.date) || []

  const sections = isSaleMode 
    ? [
        { id: 'overview', label: t('property.sections.overview'), icon: HiHome },
        { id: 'features', label: t('property.sections.features'), icon: HiSparkles },
        { id: 'saleinfo', label: t('property.sections.saleInfo'), icon: HiKey }
      ]
    : [
        { id: 'overview', label: t('property.sections.overview'), icon: HiHome },
        { id: 'features', label: t('property.sections.features'), icon: HiSparkles },
        { id: 'pricing', label: t('property.sections.pricing'), icon: HiCurrencyDollar },
        { id: 'calendar', label: t('property.sections.calendar'), icon: HiCalendar },
        { id: 'availability', label: t('property.sections.availability'), icon: HiClock }
      ]

  const pricePerSqmData = isSaleMode ? calculatePricePerSqm() : null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sticky Header */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-white/98 dark:bg-gray-800/98 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-2.5 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-1 sm:gap-2">
              {sections.map((section) => {
                const Icon = section.icon
                const isActive = activeSection === section.id
                return (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    title={section.label}
                    className={`
                      px-2.5 sm:px-4 py-2 rounded-lg font-medium transition-all 
                      flex items-center justify-center gap-2
                      ${isActive
                        ? 'bg-blue-500 text-white shadow-lg scale-105'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm hidden md:inline whitespace-nowrap">{section.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pt-28 pb-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 mt-4"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-[#b92e2d] 
                     dark:hover:text-[#b92e2d] transition-colors group"
          >
            <HiArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>{t('common.back')}</span>
          </button>
        </motion.div>

        {/* Header with Title and Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-3">
                <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                  {property.name || 'Property'}
                </h1>
                {property.property_number && property.property_number !== '1' && parseInt(property.property_number) !== 1 && (
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 
                                 text-sm md:text-base font-semibold rounded-lg">
                    #{property.property_number}
                  </span>
                )}
                {isSaleMode && (
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 
                                 text-sm font-semibold rounded-lg">
                    {t('property.forSale')}
                  </span>
                )}
              </div>
              
              {property.address && (
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 mb-3">
                  <HiLocationMarker className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-lg">{property.address}</span>
                </div>
              )}

              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <HiEye className="w-4 h-4" />
                  <span>{property.views_count || 0} {t('property.views')}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons - Desktop Only */}
            <div className="hidden md:flex items-center space-x-2 flex-shrink-0">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShortlistToggle}
                className={`
                  p-3 rounded-full transition-all shadow-lg
                  ${isInShortlist(property.id)
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                  }
                `}
              >
                <HiHeart className="w-6 h-6" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShare}
                className="p-3 bg-white dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400 
                         hover:bg-gray-100 dark:hover:bg-gray-600 transition-all shadow-lg border border-gray-200 dark:border-gray-600"
              >
                <HiShare className="w-6 h-6" />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Gallery */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <PropertyGallery 
            photos={property.photos} 
            photosByCategory={property.photosByCategory}
            propertyId={propertyId}
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">

            {/* МОБИЛЬНЫЙ: БЛОК ЦЕНЫ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:hidden bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5"
            >
              {/* ========= РЕЖИМ ПРОДАЖИ - МОБИЛЬНЫЙ ========= */}
              {isSaleMode ? (
                <>
                  <div className="mb-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {t('property.salePrice')}:
                    </div>
                    <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                      {formatSalePrice(property.sale_price)}
                    </div>
                    {pricePerSqmData && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        ฿{pricePerSqmData.pricePerSqm.toLocaleString()} / м² 
                        ({pricePerSqmData.area} м² {t(`property.area.${pricePerSqmData.areaType}`)})
                      </div>
                    )}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toast.success(t('property.buyRequestSent'))}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700
                             text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg"
                  >
                    <HiKey className="w-5 h-5" />
                    <span>{t('property.buyNow')}</span>
                  </motion.button>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {t('property.saleDisclaimer')}
                    </p>
                  </div>

                  {/* Переключатель внизу */}
                  {showModeToggle && (
                    <div className="mt-4">
                      <ModeToggle />
                    </div>
                  )}
                </>
              ) : (
                /* ========= РЕЖИМ АРЕНДЫ - МОБИЛЬНЫЙ ========= */
                <>
<div className="mb-4">
  {(() => {
    const getNearestPeriod = (pricing) => {
      const today = new Date()
      const currentMonth = today.getMonth() + 1
      const currentDay = today.getDate()
      
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
    
    const perNightPricing = property.seasonalPricing?.filter(p => 
      p.pricing_type === 'per_night' || !p.pricing_type
    ) || []
    
    const perPeriodPricing = property.seasonalPricing?.filter(p => 
      p.pricing_type === 'per_period'
    ) || []
    
    const currentMonth = new Date().getMonth() + 1
    const currentMonthPricing = property.monthlyPricing?.find(m => 
      m.month_number === currentMonth
    )
    
    if (perNightPricing.length > 0) {
      const prices = perNightPricing
        .map(p => parseFloat(p.price_per_night))
        .filter(price => price > 0)
      
      const minPrice = prices.length > 0 ? Math.min(...prices) : null
      
      return (
        <div className="flex flex-col">
          <div className="flex items-baseline space-x-2 mb-1">
            <span className="text-sm text-gray-600 dark:text-gray-400">{t('property.from')}</span>
            <span className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              {minPrice ? `฿${Math.round(minPrice).toLocaleString()}` : t('property.pricing.onRequest')}
            </span>
            <span className="text-gray-600 dark:text-gray-400">/ {t('property.night')}</span>
          </div>
        </div>
      )
    } else if (perPeriodPricing.length > 0) {
      const prices = perPeriodPricing
        .map(p => parseFloat(p.price_per_night))
        .filter(price => price > 0)
      
      const minPrice = prices.length > 0 ? Math.min(...prices) : null
      const nearestPeriod = getNearestPeriod(perPeriodPricing)
      
      return (
        <div className="flex flex-col space-y-2">
          <div className="flex items-baseline space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">{t('property.from')}</span>
            <span className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              {minPrice ? `฿${Math.round(minPrice).toLocaleString()}` : t('property.pricing.onRequest')}
            </span>
          </div>
          {nearestPeriod && nearestPeriod.price_per_night > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('property.pricing.nearestPeriodPrice')}: <span className="font-semibold text-gray-900 dark:text-white">฿{Math.round(parseFloat(nearestPeriod.price_per_night)).toLocaleString()}</span> {t('property.pricing.baht')}
            </div>
          )}
        </div>
      )
    } else if (currentMonthPricing && parseFloat(currentMonthPricing.price_per_month) > 0) {
      const monthName = t(`months.full-first.${currentMonth}`)
      return (
        <div className="flex flex-col">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {t('property.pricing.currentMonth')}(<span className="capitalize">{monthName}</span>)
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              ฿{Math.round(parseFloat(currentMonthPricing.price_per_month)).toLocaleString()}
            </span>
          </div>
        </div>
      )
      } else if (property.yearPrice && parseFloat(property.yearPrice) > 0) {
        return (
          <div className="flex flex-col">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {t('property.pricing.yearlyContract')}:
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                ฿{Math.round(parseFloat(property.yearPrice)).toLocaleString()}
              </span>
              <span className="text-gray-600 dark:text-gray-400">/ {t('property.pricing.month')}</span>
            </div>
          </div>
        )
      } else {
      return (
        <div className="flex items-baseline space-x-2 mb-1">
          <span className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            {t('property.pricing.onRequest')}
          </span>
        </div>
      )
    }
  })()}
</div>

              {tomorrowPrice && (
                <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('property.priceForTomorrow')}: <span className="font-bold text-gray-900 dark:text-white">฿{Math.round(tomorrowPrice).toLocaleString()}</span> / {t('property.night')}
                  </p>
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCalculator(true)}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700
                         text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg mb-3"
              >
                <HiCurrencyDollar className="w-5 h-5" />
                <span>{t('property.calculatePrice')}</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowBookingModal(true)}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700
                         text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg"
              >
                <HiLightningBolt className="w-5 h-5" />
                <span>{t('property.bookNow')}</span>
              </motion.button>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  {t('property.priceDisclaimer')}
                </p>
              </div>

              {/* Переключатель внизу */}
              {showModeToggle && (
                <div className="mt-4">
                  <ModeToggle />
                </div>
              )}
                </>
              )}
            </motion.div>

            {/* 2. ОСНОВНАЯ ИНФОРМАЦИЯ */}
            <motion.div
              id="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 scroll-mt-28"
            >
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                <HiHome className="w-5 h-5 text-blue-500" />
                <span>{t('property.quickInfo')}</span>
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                {property.bedrooms && (
                  <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <IoBedOutline className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{Math.round(property.bedrooms)}</p>
                    <p className="text-[10px] text-gray-600 dark:text-gray-400">{t('property.bedrooms')}</p>
                  </div>
                )}
                
                {property.bathrooms && (
                  <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <MdBathtub className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{Math.round(property.bathrooms)}</p>
                    <p className="text-[10px] text-gray-600 dark:text-gray-400">{t('property.bathrooms')}</p>
                  </div>
                )}
                
                {property.indoor_area && (
                  <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <IoExpand className="w-5 h-5 mx-auto mb-1 text-green-500" />
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{Math.round(property.indoor_area)}</p>
                    <p className="text-[10px] text-gray-600 dark:text-gray-400">{t('property.indoorArea')}</p>
                  </div>
                )}
                
                {property.plot_size && (
                  <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <HiCube className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{Math.round(property.plot_size)}</p>
                    <p className="text-[10px] text-gray-600 dark:text-gray-400">{t('property.plotSize')}</p>
                  </div>
                )}

                {/* Дополнительные поля для режима продажи */}
                {isSaleMode && (
                  <>
                    {property.floors && (
                      <div className="text-center p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                        <MdStairs className="w-5 h-5 mx-auto mb-1 text-indigo-500" />
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{property.floors}</p>
                        <p className="text-[10px] text-gray-600 dark:text-gray-400">{t('property.floors')}</p>
                      </div>
                    )}
                    
                    {property.floor && (
                      <div className="text-center p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                        <HiOfficeBuilding className="w-5 h-5 mx-auto mb-1 text-teal-500" />
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{property.floor}</p>
                        <p className="text-[10px] text-gray-600 dark:text-gray-400">{t('property.floor')}</p>
                      </div>
                    )}

                    {property.outdoor_area && (
                      <div className="text-center p-2 bg-lime-50 dark:bg-lime-900/20 rounded-lg">
                        <IoExpand className="w-5 h-5 mx-auto mb-1 text-lime-500" />
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{Math.round(property.outdoor_area)}</p>
                        <p className="text-[10px] text-gray-600 dark:text-gray-400">{t('property.outdoorArea')}</p>
                      </div>
                    )}

                    {property.parking_spaces && (
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <FaParking className="w-5 h-5 mx-auto mb-1 text-gray-500" />
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{property.parking_spaces}</p>
                        <p className="text-[10px] text-gray-600 dark:text-gray-400">{t('property.parkingSpaces')}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowMapModal(true)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-3 rounded-lg 
                         transition-all flex items-center justify-center space-x-1.5 text-xs"
              >
                <HiLocationMarker className="w-3.5 h-3.5" />
                <span>{t('property.viewOnMap')}</span>
              </motion.button>
            </motion.div>

            {/* 3. ОПИСАНИЕ */}
            {property.description && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5"
              >
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {t('property.description')}
                </h2>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed text-sm">
                  {property.description}
                </p>
              </motion.div>
            )}

            {/* 4. ОСОБЕННОСТИ */}
            {property.features && Object.keys(property.features).some(key => property.features[key]?.length > 0) && (
              <motion.div
                id="features"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 scroll-mt-28"
              >
                
                <div className="space-y-2">
                  {/* RENTAL - СКРЫВАЕМ В РЕЖИМЕ ПРОДАЖИ */}
                  {!isSaleMode && property.features.rental?.length > 0 && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleFeatureCategory('rental')}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <HiShieldCheck className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{t('property.features.rental')}</span>
                          <span className="text-xs text-gray-500">({property.features.rental.length})</span>
                        </div>
                        <motion.div
                          animate={{ rotate: openFeatureCategories.rental ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <HiChevronDown className="w-5 h-5 text-gray-400" />
                        </motion.div>
                      </button>
                      
                      <AnimatePresence>
                        {openFeatureCategories.rental && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2 bg-white dark:bg-gray-800">
                              {property.features.rental.map((feature, index) => (
                                <div
                                  key={index}
                                  className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs"
                                >
                                  <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded flex items-center justify-center text-green-500 flex-shrink-0">
                                    <HiCheckCircle className="w-4 h-4" />
                                  </div>
                                  <span className="font-medium text-gray-700 dark:text-gray-300 truncate">
                                    {t(`property.features.items.${feature}`)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* PROPERTY */}
                  {property.features.property?.length > 0 && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleFeatureCategory('property')}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <HiHome className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{t('property.features.property')}</span>
                          <span className="text-xs text-gray-500">({property.features.property.length})</span>
                        </div>
                        <motion.div
                          animate={{ rotate: openFeatureCategories.property ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <HiChevronDown className="w-5 h-5 text-gray-400" />
                        </motion.div>
                      </button>
                      
                      <AnimatePresence>
                        {openFeatureCategories.property && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2 bg-white dark:bg-gray-800">
                              {property.features.property.map((feature, index) => (
                                <div
                                  key={index}
                                  className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs"
                                >
                                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center text-blue-500 flex-shrink-0">
                                    {getFeatureIcon(feature)}
                                  </div>
                                  <span className="font-medium text-gray-700 dark:text-gray-300 truncate">
                                    {t(`property.features.items.${feature}`)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* OUTDOOR */}
                  {property.features.outdoor?.length > 0 && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleFeatureCategory('outdoor')}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <IoWater className="w-4 h-4 text-cyan-500" />
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{t('property.features.outdoor')}</span>
                          <span className="text-xs text-gray-500">({property.features.outdoor.length})</span>
                        </div>
                        <motion.div
                          animate={{ rotate: openFeatureCategories.outdoor ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <HiChevronDown className="w-5 h-5 text-gray-400" />
                        </motion.div>
                      </button>
                      
                      <AnimatePresence>
                        {openFeatureCategories.outdoor && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2 bg-white dark:bg-gray-800">
                              {property.features.outdoor.map((feature, index) => (
                                <div
                                  key={index}
                                  className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs"
                                >
                                  <div className="w-6 h-6 bg-cyan-100 dark:bg-cyan-900/30 rounded flex items-center justify-center text-cyan-500 flex-shrink-0">
                                    <HiCheckCircle className="w-4 h-4" />
                                  </div>
                                  <span className="font-medium text-gray-700 dark:text-gray-300 truncate">
                                    {t(`property.features.items.${feature}`)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* LOCATION */}
                  {property.features.location?.length > 0 && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleFeatureCategory('location')}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <HiLocationMarker className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{t('property.features.location')}</span>
                          <span className="text-xs text-gray-500">({property.features.location.length})</span>
                        </div>
                        <motion.div
                          animate={{ rotate: openFeatureCategories.location ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <HiChevronDown className="w-5 h-5 text-gray-400" />
                        </motion.div>
                      </button>
                      
                      <AnimatePresence>
                        {openFeatureCategories.location && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2 bg-white dark:bg-gray-800">
                              {property.features.location.map((feature, index) => (
                                <div
                                  key={index}
                                  className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs"
                                >
                                  <div className="w-6 h-6 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center text-red-500 flex-shrink-0">
                                    <HiCheckCircle className="w-4 h-4" />
                                  </div>
                                  <span className="font-medium text-gray-700 dark:text-gray-300 truncate">
                                    {t(`property.features.items.${feature}`)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* VIEW */}
                  {property.features.view?.length > 0 && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleFeatureCategory('view')}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <HiEye className="w-4 h-4 text-purple-500" />
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{t('property.features.views')}</span>
                          <span className="text-xs text-gray-500">({property.features.view.length})</span>
                        </div>
                        <motion.div
                          animate={{ rotate: openFeatureCategories.view ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <HiChevronDown className="w-5 h-5 text-gray-400" />
                        </motion.div>
                      </button>
                      
                      <AnimatePresence>
                        {openFeatureCategories.view && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2 bg-white dark:bg-gray-800">
                              {property.features.view.map((feature, index) => (
                                <div
                                  key={index}
                                  className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs"
                                >
                                  <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded flex items-center justify-center text-purple-500 flex-shrink-0">
                                    <HiCheckCircle className="w-4 h-4" />
                                  </div>
                                  <span className="font-medium text-gray-700 dark:text-gray-300 truncate">
                                    {t(`property.features.items.${feature}`)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ========= БЛОК ИНФОРМАЦИИ О ПРОДАЖЕ (только в режиме sale) ========= */}
            {isSaleMode && (
              <motion.div
                id="saleinfo"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 scroll-mt-28"
              >
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                  <HiDocumentText className="w-5 h-5 text-green-500" />
                  <span>{t('property.saleDetails')}</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {property.ownership_type && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <div className="flex items-center space-x-2 mb-2">
                        <HiKey className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">{t('property.ownershipType')}</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {getOwnershipLabel(property.ownership_type)}
                      </p>
                    </div>
                  )}

                  {(property.construction_year || property.construction_month) && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <div className="flex items-center space-x-2 mb-2">
                        <HiOfficeBuilding className="w-5 h-5 text-blue-500" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">{t('property.constructionDate')}</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {property.construction_month && getMonthName(property.construction_month)} {property.construction_year}
                      </p>
                    </div>
                  )}

                  {pricePerSqmData && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                      <div className="flex items-center space-x-2 mb-2">
                        <HiCurrencyDollar className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">{t('property.pricePerSqm')}</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        ฿{pricePerSqmData.pricePerSqm.toLocaleString()} / м²
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t(`property.area.${pricePerSqmData.areaType}`)}: {pricePerSqmData.area} м²
                      </p>
                    </div>
                  )}

                  {property.property_type && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <div className="flex items-center space-x-2 mb-2">
                        <HiHome className="w-5 h-5 text-purple-500" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">{t('property.propertyType')}</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                        {t(`property.types.${property.property_type}`)}
                      </p>
                    </div>
                  )}

                  {property.furniture_status && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <div className="flex items-center space-x-2 mb-2">
                        <MdKitchen className="w-5 h-5 text-orange-500" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">{t('property.furnitureStatus')}</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t(`property.furniture.${property.furniture_status}`)}
                      </p>
                    </div>
                  )}

                  {property.distance_to_beach && (
                    <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl">
                      <div className="flex items-center space-x-2 mb-2">
                        <IoWater className="w-5 h-5 text-cyan-500" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">{t('property.distanceToBeach')}</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {property.distance_to_beach} м
                      </p>
                    </div>
                  )}

                  {property.pets_allowed && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-xl">🐾</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{t('property.petsAllowed')}</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t(`property.pets.${property.pets_allowed}`)}
                      </p>
                      {property.pets_custom && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{property.pets_custom}</p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ========= БЛОКИ АРЕНДЫ (скрыты в режиме продажи) ========= */}
            {!isSaleMode && (
              <>
                <div id="pricing" className="scroll-mt-28 space-y-6">
                  {property.seasonalPricing?.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <SeasonalPriceTable seasonalPricing={property.seasonalPricing} />
                    </motion.div>
                  )}

                  {property.monthlyPricing?.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.55 }}
                    >
                      <MonthlyPriceTable monthlyPricing={property.monthlyPricing} />
                    </motion.div>
                  )}

                  {property.yearPrice && parseFloat(property.yearPrice) > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      <YearlyPriceBlock yearPrice={property.yearPrice} />
                    </motion.div>
                  )}
                </div>

                <motion.div
                  id="calendar"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="scroll-mt-28"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <PropertyCalendar
                      blockedDates={property.blockedDates || []}
                      bookings={property.bookings || []}
                      onDateRangeSelect={handleDateRangeSelect}
                      onShowAlternatives={(params) => {
                        setAlternativesParams(params)
                        setShowAlternatives(true)
                      }}
                    />

                    <div id="availability" className="hidden lg:block">
                      <AvailabilityFinder
                        propertyId={property.id}
                        onSelectDates={handleDateRangeSelect}
                        onOpenCalculator={(checkIn, checkOut) => {
                          setSelectedDates({ checkIn, checkOut })
                          setShowCalculator(true)
                        }}
                        onOpenBooking={(checkIn, checkOut) => {
                          setSelectedDates({ checkIn, checkOut })
                          setShowBookingModal(true)
                        }}
                        onShowAlternatives={(params) => {
                          setAlternativesParams(params)
                          setShowAlternatives(true)
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
                    
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="lg:hidden scroll-mt-28"
                >
                    <AvailabilityFinder
                      propertyId={property.id}
                      onSelectDates={handleDateRangeSelect}
                      onOpenCalculator={(checkIn, checkOut) => {
                        setSelectedDates({ checkIn, checkOut })
                        setShowCalculator(true)
                      }}
                      onOpenBooking={(checkIn, checkOut) => {
                        setSelectedDates({ checkIn, checkOut })
                        setShowBookingModal(true)
                      }}
                      onShowAlternatives={(params) => {
                        setAlternativesParams(params)
                        setShowAlternatives(true)
                      }}
                    />
                </motion.div>

                {showAlternatives && alternativesParams && (
                  <motion.div
                    id="alternatives"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="scroll-mt-28 mt-8"
                  >
                    <AlternativeProperties
                      propertyId={property.id}
                      startDate={alternativesParams.startDate}
                      endDate={alternativesParams.endDate}
                      nightsCount={alternativesParams.nightsCount}
                    />
                  </motion.div>
                )}
              </>
            )}

            {property.complex_name && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75 }}
                className="lg:hidden scroll-mt-28"
              >
                <ComplexProperties
                  complexName={property.complex_name}
                  currentPropertyId={property.id}
                  totalCount={property.complex_properties_count}
                />
              </motion.div>
            )}
          </div>

          {/* Sidebar - DESKTOP */}
          <div className="hidden lg:block space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sticky top-32"
            >
              {/* ========= РЕЖИМ ПРОДАЖИ - ДЕСКТОП ========= */}
              {isSaleMode ? (
                <>
                  <div className="mb-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {t('property.salePrice')}:
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {formatSalePrice(property.sale_price)}
                    </div>
                    {pricePerSqmData && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        ฿{pricePerSqmData.pricePerSqm.toLocaleString()} / м²
                      </div>
                    )}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toast.success(t('property.buyRequestSent'))}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700
                             text-white font-semibold py-4 px-6 rounded-xl
                             transition-all flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                  >
                    <HiKey className="w-5 h-5" />
                    <span>{t('property.buyNow')}</span>
                  </motion.button>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {t('property.saleDisclaimer')}
                    </p>
                  </div>

                  {/* Переключатель внизу */}
                  {showModeToggle && (
                    <div className="mt-4">
                      <ModeToggle />
                    </div>
                  )}
                </>
              ) : (
                /* ========= РЕЖИМ АРЕНДЫ - ДЕСКТОП ========= */
                <>
<div className="mb-4">
  {(() => {
    const getNearestPeriod = (pricing) => {
      const today = new Date()
      const currentMonth = today.getMonth() + 1
      const currentDay = today.getDate()
      
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
    
    const perNightPricing = property.seasonalPricing?.filter(p => 
      p.pricing_type === 'per_night' || !p.pricing_type
    ) || []
    
    const perPeriodPricing = property.seasonalPricing?.filter(p => 
      p.pricing_type === 'per_period'
    ) || []
    
    const currentMonth = new Date().getMonth() + 1
    const currentMonthPricing = property.monthlyPricing?.find(m => 
      m.month_number === currentMonth
    )
    
    if (perNightPricing.length > 0) {
      const prices = perNightPricing
        .map(p => parseFloat(p.price_per_night))
        .filter(price => price > 0)
      
      const minPrice = prices.length > 0 ? Math.min(...prices) : null
      
      return (
        <div className="flex flex-col">
          <div className="flex items-baseline space-x-2 mb-1">
            <span className="text-sm text-gray-600 dark:text-gray-400">{t('property.from')}</span>
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {minPrice ? `฿${Math.round(minPrice).toLocaleString()}` : t('property.pricing.onRequest')}
            </span>
            <span className="text-gray-600 dark:text-gray-400">/ {t('property.night')}</span>
          </div>
        </div>
      )
    } else if (perPeriodPricing.length > 0) {
      const prices = perPeriodPricing
        .map(p => parseFloat(p.price_per_night))
        .filter(price => price > 0)
      
      const minPrice = prices.length > 0 ? Math.min(...prices) : null
      const nearestPeriod = getNearestPeriod(perPeriodPricing)
      
      return (
        <div className="flex flex-col space-y-2">
          <div className="flex items-baseline space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">{t('property.from')}</span>
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {minPrice ? `฿${Math.round(minPrice).toLocaleString()}` : t('property.pricing.onRequest')}
            </span>
          </div>
          {nearestPeriod && nearestPeriod.price_per_night > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('property.pricing.nearestPeriodPrice')}: <span className="font-semibold text-gray-900 dark:text-white">฿{Math.round(parseFloat(nearestPeriod.price_per_night)).toLocaleString()}</span> {t('property.pricing.baht')}
            </div>
          )}
        </div>
      )
    } else if (currentMonthPricing && parseFloat(currentMonthPricing.price_per_month) > 0) {
      const monthName = t(`months.full-first.${currentMonth}`)
      return (
        <div className="flex flex-col">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {t('property.pricing.currentMonth')} (<span className="capitalize">{monthName}</span>)
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              ฿{Math.round(parseFloat(currentMonthPricing.price_per_month)).toLocaleString()}
            </span>
          </div>
        </div>
      )
      } else if (property.yearPrice && parseFloat(property.yearPrice) > 0) {
        return (
          <div className="flex flex-col">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {t('property.pricing.yearlyContract')}:
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                ฿{Math.round(parseFloat(property.yearPrice)).toLocaleString()}
              </span>
              <span className="text-gray-600 dark:text-gray-400">/ {t('property.pricing.month')}</span>
            </div>
          </div>
        )
      } else {
      return (
        <div className="flex items-baseline space-x-2 mb-1">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('property.pricing.onRequest')}
          </span>
        </div>
      )
    }
  })()}
</div>

              {tomorrowPrice && (
                <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('property.priceForTomorrow')}: <span className="font-bold text-gray-900 dark:text-white">฿{Math.round(tomorrowPrice).toLocaleString()}</span> / {t('property.night')}
                  </p>
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCalculator(true)}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700
                         text-white font-semibold py-4 px-6 rounded-xl
                         transition-all flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl mb-3"
              >
                <HiCurrencyDollar className="w-5 h-5" />
                <span>{t('property.calculatePrice')}</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowBookingModal(true)}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700
                         text-white font-semibold py-4 px-6 rounded-xl
                         transition-all flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
              >
                <HiLightningBolt className="w-5 h-5" />
                <span>{t('property.bookNow')}</span>
              </motion.button>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  {t('property.priceDisclaimer')}
                </p>
              </div>

              {/* Переключатель внизу */}
              {showModeToggle && (
                <div className="mt-4">
                  <ModeToggle />
                </div>
              )}
                </>
              )}
            </motion.div>

            {property.complex_name && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <ComplexProperties
                  complexName={property.complex_name}
                  currentPropertyId={property.id}
                  totalCount={property.complex_properties_count}
                />
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Price Calculator Modal - только для аренды */}
      {!isSaleMode && (
        <PriceCalculator
          propertyId={property.id}
          property={property}
          isOpen={showCalculator}
          onClose={() => setShowCalculator(false)}
          blockedDates={property.blockedDates || []}
          bookings={property.bookings || []}
          initialCheckIn={selectedDates?.checkIn}
          initialCheckOut={selectedDates?.checkOut}
          onOpenBooking={(checkIn, checkOut) => {
            setSelectedDates({ checkIn, checkOut })
            setShowCalculator(false)
            setShowBookingModal(true)
          }}
          onShowAlternatives={(params) => {
            setAlternativesParams(params)
            setShowAlternatives(true)
            setTimeout(() => {
              const alternativesSection = document.getElementById('alternatives')
              if (alternativesSection) {
                alternativesSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            }, 300)
          }}
        />
      )}

      {/* Booking Modal - только для аренды */}
      {!isSaleMode && (
        <BookingForm 
          property={property} 
          selectedDates={selectedDates}
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
        />
      )}

      {/* Map Modal */}
      <AnimatePresence>
        {showMapModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-container relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-5 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <HiLocationMarker className="w-5 h-5" />
                  <span>{t('property.sections.location')}</span>
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowMapModal(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <HiX className="w-5 h-5 text-white" />
                </motion.button>
              </div>
              <div className="p-0">
                <PropertyMap property={property} height="500px" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fixed Shortlist Button - Mobile */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleShortlistToggle}
        className={`
          md:hidden fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-2xl 
          flex items-center justify-center z-50 transition-all
          ${isInShortlist(property.id)
            ? 'bg-red-500 text-white'
            : 'bg-blue-500 text-white'
          }
        `}
      >
        <HiHeart className="w-7 h-7" />
      </motion.button>
    </div>
  )
}

export default PropertyDetail