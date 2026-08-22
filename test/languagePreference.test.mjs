import assert from 'node:assert/strict'
import test from 'node:test'

const values = new Map()
globalThis.localStorage = {
  getItem(key) {
    return values.has(key) ? values.get(key) : null
  },
  setItem(key, value) {
    values.set(key, String(value))
  },
  removeItem(key) {
    values.delete(key)
  }
}

const {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  hasStoredLocale,
  preferredLocale,
  setLocale
} = await import('../src/i18n/index.js')

test.beforeEach(() => values.clear())

test('system language is used until the browser has an explicit preference', () => {
  assert.equal(hasStoredLocale(), false)
  assert.equal(preferredLocale('en-US'), 'en-US')
  assert.equal(preferredLocale('unsupported'), DEFAULT_LOCALE)
})

test('browser language remains authoritative across system preference refreshes', () => {
  setLocale('en-US')
  assert.equal(values.get(LOCALE_STORAGE_KEY), 'en-US')
  assert.equal(hasStoredLocale(), true)
  assert.equal(preferredLocale('zh-CN'), 'en-US')
})

test('applying a system default can update the locale without creating a browser override', () => {
  setLocale('en-US', { persist: false })
  assert.equal(values.has(LOCALE_STORAGE_KEY), false)
})
