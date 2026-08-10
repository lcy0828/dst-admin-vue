import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { messages } from '../src/i18n/messages.js'

function chineseLeafPaths(value, prefix = '') {
  if (typeof value === 'string') {
    return /[\u3400-\u9fff]/.test(value) ? [{ path: prefix, value }] : []
  }
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, child]) => (
    chineseLeafPaths(child, prefix ? `${prefix}.${key}` : key)
  ))
}

test('formal route templates do not contain hard-coded Chinese presentation copy', async () => {
  const router = await readFile(new URL('../src/router/index.js', import.meta.url), 'utf8')
  const viewPaths = [...new Set(
    [...router.matchAll(/import\('@\/([^']+\.vue)'\)/g)].map(match => match[1])
  )]

  for (const viewPath of viewPaths) {
    const source = await readFile(new URL(`../src/${viewPath}`, import.meta.url), 'utf8')
    const template = source.slice(source.indexOf('<template>'), source.indexOf('<script'))
    const presentation = template.replaceAll(/<!--[^]*?-->/g, '')

    if (viewPath === 'views/SystemSettings.vue') {
      const allowed = presentation
        .replace('>日本語<', '><')
        .replace('value="YYYY年MM月DD日"', 'value="localized-long-date"')
      assert.doesNotMatch(allowed, /[\u3400-\u9fff]/, viewPath)
      continue
    }

    assert.doesNotMatch(presentation, /[\u3400-\u9fff]/, viewPath)
  }
})

test('English global catalog contains Chinese only in the Chinese language name', () => {
  assert.deepEqual(chineseLeafPaths(messages['en-US']), [
    { path: 'settings.language.zhCN', value: '简体中文' }
  ])
})
