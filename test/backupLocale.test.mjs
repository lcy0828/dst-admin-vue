import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { backupMessages } from '../src/i18n/backupMessages.js'

function leafPaths(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix]
  return Object.entries(value).flatMap(([key, child]) => (
    leafPaths(child, prefix ? `${prefix}.${key}` : key)
  ))
}

test('backup locale catalogs expose matching keys', () => {
  assert.deepEqual(
    leafPaths(backupMessages['en-US']).sort(),
    leafPaths(backupMessages['zh-CN']).sort()
  )
})

test('backup page localizes presentation without changing backup identifiers', () => {
  const page = fs.readFileSync(new URL('../src/views/Backups.vue', import.meta.url), 'utf8')
  const adapters = fs.readFileSync(new URL('../src/api/v2LegacyAdapters.js', import.meta.url), 'utf8')
  const globalMessages = fs.readFileSync(new URL('../src/i18n/messages.js', import.meta.url), 'utf8')
  const template = page.slice(page.indexOf('<template>'), page.indexOf('</template>'))

  assert.doesNotMatch(template, /[\u3400-\u9fff]/)
  assert.match(template, /SelectItem value="__all__"/)
  assert.match(page, /backup\.archive_name/)
  assert.match(page, /backup\.name/)
  assert.match(page, /this\.\$i18n\?\.locale/)
  assert.doesNotMatch(page, /toast\.success\(res\.msg/)
  assert.match(adapters, /create_time: backup\.createdAt \|\| ''/)
  assert.match(globalMessages, /\.\.\.backupMessages\['en-US'\]/)
})

test('English backup messages contain no Chinese display text', () => {
  for (const path of leafPaths(backupMessages['en-US'])) {
    const value = path.split('.').reduce((current, key) => current?.[key], backupMessages['en-US'])
    assert.doesNotMatch(String(value), /[\u3400-\u9fff]/, path)
  }
})
