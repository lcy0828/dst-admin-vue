import { createI18n } from 'vue-i18n'
import { messages } from './messages'

export const DEFAULT_LOCALE = 'zh-CN'
export const SUPPORTED_LOCALES = Object.freeze(['zh-CN', 'en-US'])

export function normalizeLocale(locale) {
  return SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  messages,
  missingWarn: false,
  fallbackWarn: false
})

export function setLocale(locale) {
  const normalized = normalizeLocale(locale)
  i18n.global.locale.value = normalized
  document.documentElement.lang = normalized
  return normalized
}

export function translate(key, parameters) {
  return i18n.global.t(key, parameters)
}
