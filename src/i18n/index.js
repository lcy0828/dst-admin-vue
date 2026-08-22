import { createI18n } from 'vue-i18n'
import { messages } from './messages.js'

export const DEFAULT_LOCALE = 'zh-CN'
export const SUPPORTED_LOCALES = Object.freeze(['zh-CN', 'en-US'])
export const LOCALE_STORAGE_KEY = 'dst-admin-locale'

export function normalizeLocale(locale) {
  return SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE
}

export function storedLocale() {
  if (typeof localStorage === 'undefined') return DEFAULT_LOCALE
  return normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY))
}

export function hasStoredLocale() {
  if (typeof localStorage === 'undefined') return false
  return SUPPORTED_LOCALES.includes(localStorage.getItem(LOCALE_STORAGE_KEY))
}

export function preferredLocale(fallback = DEFAULT_LOCALE) {
  return hasStoredLocale() ? storedLocale() : normalizeLocale(fallback)
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: storedLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages,
  missingWarn: false,
  fallbackWarn: false
})

export function setLocale(locale, { persist = true } = {}) {
  const normalized = normalizeLocale(locale)
  i18n.global.locale.value = normalized
  if (typeof document !== 'undefined') document.documentElement.lang = normalized
  if (persist && typeof localStorage !== 'undefined') localStorage.setItem(LOCALE_STORAGE_KEY, normalized)
  return normalized
}

export function translate(key, parameters) {
  return i18n.global.t(key, parameters)
}
