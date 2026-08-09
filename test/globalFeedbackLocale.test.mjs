import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  globalFeedbackMessages,
  localizedRequestError,
} from '../src/i18n/globalFeedbackMessages.js'

function catalogKeys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return child && typeof child === 'object' ? catalogKeys(child, path) : [path]
  })
}

function translator(locale) {
  return (key, parameters = {}) => {
    let value = key.split('.').reduce((item, part) => item?.[part], globalFeedbackMessages[locale])
    for (const [name, replacement] of Object.entries(parameters)) {
      value = value.replaceAll(`{${name}}`, String(replacement))
    }
    return value
  }
}

test('global feedback catalogs expose matching localized keys', () => {
  assert.deepEqual(
    catalogKeys(globalFeedbackMessages['en-US']).sort(),
    catalogKeys(globalFeedbackMessages['zh-CN']).sort(),
  )
  assert.doesNotMatch(JSON.stringify(globalFeedbackMessages['en-US']), /[\u3400-\u9fff]/)
})

test('request errors retain their original technical detail', () => {
  const zh = translator('zh-CN')
  const en = translator('en-US')

  assert.equal(
    localizedRequestError(en, 'globalFeedback.request.serverUnavailable', { message: 'ECONNREFUSED 127.0.0.1:8082' }),
    'The server is not responding. Try again later: ECONNREFUSED 127.0.0.1:8082',
  )
  assert.equal(
    localizedRequestError(zh, 'globalFeedback.request.failed', { message: 'Network adapter initialization failed' }),
    '请求失败：Network adapter initialization failed',
  )
  assert.equal(
    localizedRequestError(en, 'globalFeedback.request.failed', {}),
    'Request failed',
  )
})

test('request layer and global controls consume statically registered locale messages', async () => {
  const [messages, request, themeSwitch, sidebar] = await Promise.all([
    readFile(new URL('../src/i18n/messages.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/api/request.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/ThemeSwitch.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/v2/AppSidebarV2.vue', import.meta.url), 'utf8'),
  ])

  assert.match(messages, /import \{ globalFeedbackMessages \} from '\.\/globalFeedbackMessages\.js'/)
  assert.match(messages, /\.\.\.globalFeedbackMessages\['zh-CN'\]/)
  assert.match(messages, /\.\.\.globalFeedbackMessages\['en-US'\]/)
  assert.doesNotMatch(request, /mergeLocaleMessage/)
  assert.match(request, /translate\('globalFeedback\.request\.sessionExpired'\)/)
  assert.match(request, /localizedRequestError\(translate, 'globalFeedback\.request\.serverUnavailable', error\)/)
  assert.match(request, /localizedRequestError\(translate, 'globalFeedback\.request\.failed', error\)/)
  assert.match(request, /filename \|\| translate\('globalFeedback\.request\.defaultDownloadFilename'\)/)
  assert.doesNotMatch(request, /登录已过期，请重新登录|服务器无响应，请稍后重试|请求错误：/)

  assert.match(themeSwitch, /globalFeedback\.theme\.switchToDark/)
  assert.match(themeSwitch, /globalFeedback\.theme\.switchToLight/)
  assert.doesNotMatch(themeSwitch, /切换到暗黑模式|切换到浅色模式/)

  assert.match(sidebar, /systemName: \{ type: String, default: '' \}/)
  assert.match(sidebar, /const displaySystemName = computed\(\(\) => props\.systemName\?\.trim\(\) \|\| t\('app\.defaultName'\)\)/)
  assert.match(sidebar, /\{\{ displaySystemName \}\}/)
  assert.doesNotMatch(sidebar, /systemName: \{ type: String, default: '饥荒管理系统' \}/)
})
