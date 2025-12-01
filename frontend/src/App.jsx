import React, { useEffect, Suspense, lazy } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import Layout from './components/Layout/Layout'
import LoadingScreen from './components/common/LoadingScreen'
import { useThemeStore } from './store/themeStore'
import { isRtlLanguage, updateDocumentDirection } from './i18n'

// Lazy load pages
const Home = lazy(() => import('./pages/Home'))
const Villas = lazy(() => import('./pages/Villas'))
const PropertyDetail = lazy(() => import('./pages/PropertyDetail'))
const About = lazy(() => import('./pages/About'))
const Contact = lazy(() => import('./pages/Contact'))
const Shortlist = lazy(() => import('./pages/Shortlist'))

function App() {
  const location = useLocation()
  const { theme, initTheme } = useThemeStore()
  const { i18n } = useTranslation()

  useEffect(() => {
    initTheme()
  }, [initTheme])

  // Обновляем тему
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.margin = '0'
    document.documentElement.style.padding = '0'
    document.body.style.margin = '0'
    document.body.style.padding = '0'
  }, [theme])

  // Обновляем направление текста при смене языка
  useEffect(() => {
    updateDocumentDirection(i18n.language)
  }, [i18n.language])

  // Определяем позицию тостов в зависимости от RTL
  const isRtl = isRtlLanguage(i18n.language)
  const toastPosition = isRtl ? 'top-left' : 'top-right'

  return (
    <>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public Routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={
              <Suspense fallback={<LoadingScreen />}>
                <Home />
              </Suspense>
            } />
            <Route path="villas" element={
              <Suspense fallback={<LoadingScreen />}>
                <Villas />
              </Suspense>
            } />
            <Route path="properties/:propertyId" element={
              <Suspense fallback={<LoadingScreen />}>
                <PropertyDetail />
              </Suspense>
            } />
            <Route path="about" element={
              <Suspense fallback={<LoadingScreen />}>
                <About />
              </Suspense>
            } />
            <Route path="contact" element={
              <Suspense fallback={<LoadingScreen />}>
                <Contact />
              </Suspense>
            } />
            <Route path="shortlist" element={
              <Suspense fallback={<LoadingScreen />}>
                <Shortlist />
              </Suspense>
            } />
          </Route>

          {/* 404 Route */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="text-center">
                <h1 className="text-9xl font-bold text-blue-500">404</h1>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-4">
                 Page not found
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2 mb-8">
                  The requested page does not exist.
                </p>
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 
                           hover:from-blue-600 hover:to-blue-700 text-white rounded-lg
                           font-semibold transition-all shadow-lg hover:shadow-xl"
                >
                  Go to main page
                </button>
              </div>
            </div>
          } />
        </Routes>
      </AnimatePresence>
      
      <Toaster
        position={toastPosition}
        toastOptions={{
          duration: 4000,
          style: {
            background: theme === 'dark' ? '#1f2937' : '#fff',
            color: theme === 'dark' ? '#fff' : '#1f2937',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
            border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb'
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </>
  )
}

export default App