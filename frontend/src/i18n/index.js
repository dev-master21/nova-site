import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Import translations
import enTranslations from './locales/en.json'
import ruTranslations from './locales/ru.json'
import thTranslations from './locales/th.json'
import zhTranslations from './locales/zh.json'
import heTranslations from './locales/he.json'

const resources = {
  en: { translation: enTranslations },
  ru: { translation: ruTranslations },
  th: { translation: thTranslations },
  zh: { translation: zhTranslations },
  he: { translation: heTranslations },
}

// Список поддерживаемых языков
const supportedLanguages = ['en', 'ru', 'th', 'zh', 'he']

// RTL языки (справа-налево)
export const rtlLanguages = ['he', 'ar']

/**
 * Проверяет, является ли язык RTL
 */
export const isRtlLanguage = (lang) => {
  return rtlLanguages.includes(lang)
}

/**
 * Обновляет направление текста на странице
 */
export const updateDocumentDirection = (lang) => {
  const isRtl = isRtlLanguage(lang)
  const html = document.documentElement
  
  // Устанавливаем атрибуты
  html.setAttribute('dir', isRtl ? 'rtl' : 'ltr')
  html.setAttribute('lang', lang)
  
  // Добавляем/удаляем класс для Tailwind
  if (isRtl) {
    html.classList.add('rtl')
    html.classList.remove('ltr')
  } else {
    html.classList.add('ltr')
    html.classList.remove('rtl')
  }
  
  console.log(`🌐 Document direction: ${isRtl ? 'RTL' : 'LTR'} for language: ${lang}`)
}

/**
 * Определяет язык для использования
 * Приоритет:
 * 1. Сохраненный язык из localStorage (пользователь выбрал вручную)
 * 2. Язык браузера (если поддерживается)
 * 3. Английский по умолчанию
 */
const getInitialLanguage = () => {
  // Проверяем сохраненный язык
  const savedLanguage = localStorage.getItem('language')
  if (savedLanguage && supportedLanguages.includes(savedLanguage)) {
    console.log('🌐 Using saved language:', savedLanguage)
    return savedLanguage
  }

  // Определяем язык браузера
  const browserLanguage = navigator.language || navigator.userLanguage
  console.log('🌐 Browser language detected:', browserLanguage)

  // Извлекаем код языка (например, 'ru-RU' -> 'ru')
  const languageCode = browserLanguage.split('-')[0].toLowerCase()

  // Проверяем, поддерживается ли язык браузера
  if (supportedLanguages.includes(languageCode)) {
    console.log('🌐 Using browser language:', languageCode)
    // Сохраняем определенный язык, чтобы в следующий раз не определять заново
    localStorage.setItem('language', languageCode)
    return languageCode
  }

  // По умолчанию английский
  console.log('🌐 Using default language: en')
  localStorage.setItem('language', 'en')
  return 'en'
}

const initialLanguage = getInitialLanguage()

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'en',
    supportedLngs: supportedLanguages,
    interpolation: {
      escapeValue: false,
    },
    // Отключаем автоматическое определение языка i18next (мы делаем это сами)
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
    },
  })

// Устанавливаем начальное направление
updateDocumentDirection(initialLanguage)

// Слушаем смену языка
i18n.on('languageChanged', (lang) => {
  updateDocumentDirection(lang)
  localStorage.setItem('language', lang)
})

export default i18n