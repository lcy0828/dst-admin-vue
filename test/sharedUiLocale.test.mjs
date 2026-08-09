import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeSharedUiLocale,
  sharedUiMessages,
  sharedUiText,
} from '../src/i18n/sharedUiMessages.js'
import {
  confirmAction,
  promptText,
  registerFeedbackHost,
} from '../src/lib/feedback.js'

function catalogKeys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return child && typeof child === 'object' ? catalogKeys(child, path) : [path]
  })
}

test('shared UI catalogs expose the same keys in every locale', () => {
  assert.deepEqual(
    catalogKeys(sharedUiMessages['en-US']).sort(),
    catalogKeys(sharedUiMessages['zh-CN']).sort(),
  )
  assert.equal(normalizeSharedUiLocale('en-US'), 'en-US')
  assert.equal(normalizeSharedUiLocale('custom'), 'zh-CN')
})

test('shared UI labels follow the selected locale', () => {
  assert.equal(sharedUiText('pagination.previous', 'zh-CN'), '上一页')
  assert.equal(sharedUiText('pagination.previous', 'en-US'), 'Previous page')
  assert.equal(sharedUiText('sidebar.toggle', 'en-US'), 'Toggle sidebar')
  assert.equal(sharedUiText('dialog.close', 'en-US'), 'Close')
  assert.equal(sharedUiText('missing.key', 'en-US'), 'missing.key')
})

test('English shared UI labels contain no Chinese display text', () => {
  for (const key of catalogKeys(sharedUiMessages['en-US'])) {
    assert.doesNotMatch(sharedUiText(key, 'en-US'), /[\u3400-\u9fff]/, key)
  }
})

test('feedback defaults follow the active locale and preserve custom titles', async () => {
  const originalDocument = globalThis.document
  const requests = []
  globalThis.document = { documentElement: { lang: 'en-US' } }
  const unregister = registerFeedbackHost(request => requests.push(request))

  try {
    const confirmation = confirmAction('Proceed?')
    assert.equal(requests.at(-1).title, 'Confirm action')
    requests.at(-1).resolve(true)
    await confirmation

    const prompt = promptText('Value?')
    assert.equal(requests.at(-1).title, 'Enter a value')
    requests.at(-1).resolve({ value: 'ready' })
    await prompt

    const custom = confirmAction('Remove?', 'Custom title')
    assert.equal(requests.at(-1).title, 'Custom title')
    requests.at(-1).resolve(true)
    await custom
  } finally {
    unregister()
    if (originalDocument === undefined) delete globalThis.document
    else globalThis.document = originalDocument
  }
})
