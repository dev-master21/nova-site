import React from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { HiCalendar, HiSparkles } from 'react-icons/hi'

const YearlyPriceBlock = ({ yearPrice }) => {
  const { t } = useTranslation()

  if (!yearPrice || parseFloat(yearPrice) === 0) {
    return null
  }

  const formattedPrice = `฿${Math.round(parseFloat(yearPrice)).toLocaleString()}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 
                 rounded-2xl shadow-lg p-6 border-2 border-purple-200 dark:border-purple-800/30"
    >
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
          <HiSparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('property.pricing.yearlyContract')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('property.pricing.longTermRental')}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
        <div className="flex items-baseline space-x-2 mb-1">
          <span className="text-3xl md:text-4xl font-bold text-purple-600 dark:text-purple-400">
            {formattedPrice}
          </span>
          <span className="text-lg text-gray-600 dark:text-gray-400">
            / {t('property.pricing.month')}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('property.pricing.yearlyContractPricing')}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
          <HiCalendar className="w-4 h-4 text-purple-500" />
          <span>{t('property.pricing.yearlyContractDuration')}</span>
        </div>
      </div>

      <div className="mt-4 p-3 bg-purple-100/50 dark:bg-purple-900/20 rounded-lg border border-purple-200/50 dark:border-purple-800/30">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <span className="font-semibold text-gray-700 dark:text-gray-300">{t('property.pricing.note')}:</span>{' '}
          {t('property.pricing.yearlyNoteText')}
        </p>
      </div>
    </motion.div>
  )
}

export default YearlyPriceBlock