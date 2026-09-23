import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './en'
import { my } from './my'

export const supportedLocales = ['en', 'my'] as const
export type SupportedLocale = (typeof supportedLocales)[number]
export const localeStorageKey = 'shop-locale'
const savedLocale = localStorage.getItem(localeStorageKey)
const initialLocale: SupportedLocale = supportedLocales.includes(
  savedLocale as SupportedLocale,
)
  ? (savedLocale as SupportedLocale)
  : 'en'
document.documentElement.lang = initialLocale

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, my: { translation: my } },
  lng: initialLocale,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
