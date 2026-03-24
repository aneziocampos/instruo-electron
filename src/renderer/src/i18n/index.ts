import { en, type TranslationKey } from './en'
import { pt } from './pt'

type Locale = 'en' | 'pt'

const translations: Record<Locale, Record<TranslationKey, string>> = { en, pt }

let currentLocale: Locale = detectLocale()

function detectLocale(): Locale {
  const lang = navigator.language || ''
  return lang.startsWith('pt') ? 'pt' : 'en'
}

export function setLocale(locale: Locale): void {
  currentLocale = locale
}

export function getLocale(): Locale {
  return currentLocale
}

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const template = translations[currentLocale][key] ?? translations.en[key] ?? key
  if (!params) return template
  return Object.entries(params).reduce(
    (result, [k, v]) => result.replace(`{${k}}`, String(v)),
    template
  )
}
