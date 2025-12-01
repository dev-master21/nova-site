import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { HiCalendar, HiCurrencyDollar, HiMoon, HiChevronDown, HiChevronUp } from 'react-icons/hi'

const MonthlyPriceTable = ({ monthlyPricing = [] }) => {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)

  // Создаем массив всех месяцев (1-12)
  const allMonths = Array.from({ length: 12 }, (_, i) => i + 1)

  // Создаем мапу месяц -> цена
  const priceMap = {}
  monthlyPricing.forEach(item => {
    priceMap[item.month_number] = {
      price: item.price_per_month,
      minimumNights: item.minimum_days
    }
  })

  // Показываем первые 3 месяца или все
  const displayedMonths = isExpanded ? allMonths : allMonths.slice(0, 3)

  const formatPrice = (price) => {
    const priceValue = parseFloat(price)
    if (!price || priceValue === 0 || isNaN(priceValue)) {
      return t('property.pricing.onRequest')
    }
    return `฿${Math.round(priceValue).toLocaleString()}`
  }

  const getMonthName = (monthNum) => {
    return t(`months.full-first.${monthNum}`)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
        <HiCalendar className="w-5 h-5 text-blue-500" />
        <span>{t('property.pricing.monthlyPrices')}</span>
      </h3>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                {t('property.pricing.month')}
              </th>
              <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                {t('property.pricing.minStay')}
              </th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                {t('property.pricing.pricePerMonth')}
              </th>
            </tr>
          </thead>
          <tbody>
            {displayedMonths.map((monthNum, index) => {
              const monthData = priceMap[monthNum]
              return (
                <motion.tr
                  key={monthNum}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                        {getMonthName(monthNum)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {monthData?.minimumNights ? (
                      <div className="flex items-center justify-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                        <HiMoon className="w-4 h-4" />
                        <span>{monthData.minimumNights}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatPrice(monthData?.price)}
                    </span>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2">
        {displayedMonths.map((monthNum, index) => {
          const monthData = priceMap[monthNum]
          return (
            <motion.div
              key={monthNum}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                  {getMonthName(monthNum)}
                </span>
                <span className="text-base font-bold text-gray-900 dark:text-white">
                  {formatPrice(monthData?.price)}
                </span>
              </div>
              
              {monthData?.minimumNights && (
                <div className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400">
                  <HiMoon className="w-3.5 h-3.5" />
                  <span>{t('property.pricing.minimum')} {monthData.minimumNights} {t('property.pricing.nights')}</span>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Show More Button */}
      {allMonths.length > 3 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 w-full py-2.5 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600/50
                   text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors
                   flex items-center justify-center space-x-2"
        >
          <span>{isExpanded ? t('property.pricing.showLess') : t('property.pricing.showMore')}</span>
          {isExpanded ? <HiChevronUp className="w-4 h-4" /> : <HiChevronDown className="w-4 h-4" />}
        </button>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-200/50 dark:border-blue-800/30">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <span className="font-semibold text-gray-700 dark:text-gray-300">{t('property.pricing.note')}:</span>{' '}
          {t('property.pricing.monthlyNoteText')}
        </p>
      </div>
    </div>
  )
}

export default MonthlyPriceTable