import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { announcementMessages } from '../src/i18n/announcementMessages.js'

function leafPaths(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix]
  return Object.entries(value).flatMap(([key, child]) => (
    leafPaths(child, prefix ? `${prefix}.${key}` : key)
  ))
}

test('announcement locale catalogs expose matching keys', () => {
  assert.deepEqual(
    leafPaths(announcementMessages['en-US']).sort(),
    leafPaths(announcementMessages['zh-CN']).sort()
  )
})

test('announcement page localizes presentation and preserves protocol values', () => {
  const page = fs.readFileSync(new URL('../src/views/Announcements.vue', import.meta.url), 'utf8')
  const globalMessages = fs.readFileSync(new URL('../src/i18n/messages.js', import.meta.url), 'utf8')
  const template = page.slice(page.indexOf('<template>'), page.indexOf('</template>'))

  assert.doesNotMatch(template, /[\u3400-\u9fff]/)
  assert.match(page, /statusFilter: 'all'/)
  assert.match(page, /target: 'all'/)
  assert.match(template, /SelectItem value="active"/)
  assert.match(page, /'active' \|\| status === 'expired'/)
  assert.match(page, /announcement\.title/)
  assert.match(page, /currentAnnouncement\.content/)
  assert.doesNotMatch(page, /toLocaleString\('zh-CN'/)
  assert.match(page, /this\.\$i18n\?\.locale/)
  assert.match(page, /announcements\.validation\.titleRequired/)
  assert.match(globalMessages, /\.\.\.announcementMessages\['en-US'\]/)
})

test('English announcement messages contain no Chinese display text', () => {
  for (const path of leafPaths(announcementMessages['en-US'])) {
    const value = path.split('.').reduce((current, key) => current?.[key], announcementMessages['en-US'])
    assert.doesNotMatch(String(value), /[\u3400-\u9fff]/, path)
  }
})
