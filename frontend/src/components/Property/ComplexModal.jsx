import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { HiX, HiChevronRight, HiHome } from 'react-icons/hi'
import { IoBedOutline } from 'react-icons/io5'
import { MdBathtub } from 'react-icons/md'
import { IoExpand } from 'react-icons/io5'
import { FaUsers } from 'react-icons/fa'
import { propertyService } from '../../services/property.service'
import LoadingSpinner from '../common/LoadingSpinner'
import toast from 'react-hot-toast'

const ComplexModal = ({ isOpen, onClose, complexName, currentPropertyId, totalCount }) => {
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
      const response = await propertyService.getComplexProperties(
        complexName,
        i18n.language,
        currentPropertyId
      )
      
      console.log('🔍 Complex properties response:', response)
      
      // Проверяем разные варианты структуры ответа
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
    if (!price) return t('property.pricing.onRequest')
    return new Intl.NumberFormat('ru-RU').format(Math.round(price))
  }

  const handlePropertyClick = (propertyId) => {
    navigate(`/properties/${propertyId}`)
    onClose()
  }

  if (!isOpen) return null

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
          <div className="bg-gradient-to-r from-[#ba2e2d] to-red-600 p-5 flex-shrink-0">
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
                  <motion.div
                    key={property.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-xl overflow-hidden border border-gray-200 
                             dark:border-gray-600 hover:shadow-lg transition-all group cursor-pointer"
                    onClick={() => handlePropertyClick(property.id)}
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
                    </div>

                    {/* Content */}
                    <div className="p-3">
                      {/* Title with Property Number */}
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 flex-1 min-w-0">
                          {property.name}
                        </h3>
                        {property.property_number && property.property_number !== '1' && parseInt(property.property_number) !== 1 && (
                          <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 
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

                        {/* Guests */}
                        <div className="flex flex-col items-center text-center">
                          <div className="w-7 h-7 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-0.5">
                            <FaUsers className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">{t('property.guests')}</span>
                          <span className="text-xs font-bold text-gray-900 dark:text-white">
                            {Math.round(property.bedrooms || 0) * 2}
                          </span>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="flex items-center justify-between mb-2 pb-2 border-t border-gray-200 dark:border-gray-600 pt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{t('property.from')}</span>
                        <span className="text-base font-bold text-[#ba2e2d]">
                          ฿{formatPrice(property.min_price)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">/ {t('property.night')}</span>
                      </div>

                      {/* Button */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePropertyClick(property.id)
                        }}
                        className="w-full bg-gradient-to-r from-[#ba2e2d] to-red-600 hover:from-red-600 hover:to-red-700
                                 text-white font-medium py-2 px-3 rounded-lg transition-all flex items-center 
                                 justify-center space-x-1.5 text-sm shadow-md hover:shadow-lg"
                      >
                        <span>{t('property.complex.viewDetails')}</span>
                        <HiChevronRight className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default ComplexModal