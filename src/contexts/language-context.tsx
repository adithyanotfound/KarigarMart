"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Language = 'en' | 'hi' | 'bn' | 'ta' | 'te' | 'mr' | 'gu' | 'kn' | 'ml' | 'pa'

export interface LanguageInfo {
  code: Language
  name: string
  nativeName: string
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' }
]

interface LanguageContextType {
  currentLanguage: Language
  setLanguage: (language: Language) => void
  getLanguageInfo: (code: Language) => LanguageInfo | undefined
  t: (key: string, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

interface LanguageProviderProps {
  children: ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en')
  const [translations, setTranslations] = useState<Record<string, any>>({})

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('karigar-language') as Language
    if (savedLanguage && SUPPORTED_LANGUAGES.some(lang => lang.code === savedLanguage)) {
      setCurrentLanguage(savedLanguage)
    }
  }, [])

  // Load translations when language changes
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const translationModule = await import(`@/translations/${currentLanguage}.json`)
        setTranslations(translationModule.default)
      } catch (error) {
        console.error(`Failed to load translations for ${currentLanguage}:`, error)
        // Fallback to English if translation file doesn't exist
        if (currentLanguage !== 'en') {
          try {
            const englishModule = await import(`@/translations/en.json`)
            setTranslations(englishModule.default)
          } catch (fallbackError) {
            console.error('Failed to load English fallback translations:', fallbackError)
            setTranslations({})
          }
        }
      }
    }

    loadTranslations()
  }, [currentLanguage])

  const setLanguage = (language: Language) => {
    setCurrentLanguage(language)
    localStorage.setItem('karigar-language', language)
  }

  const getLanguageInfo = (code: Language): LanguageInfo | undefined => {
    return SUPPORTED_LANGUAGES.find(lang => lang.code === code)
  }

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.')
    let value: any = translations

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        // Return the key if translation not found
        return key
      }
    }

    if (typeof value === 'string') {
      // Replace parameters in the translation string
      if (params) {
        return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
          return params[paramKey]?.toString() || match
        })
      }
      return value
    }

    return key
  }

  const value: LanguageContextType = {
    currentLanguage,
    setLanguage,
    getLanguageInfo,
    t
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
