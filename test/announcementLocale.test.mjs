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

test('game notification page localizes presentation and preserves protocol values', () => {
  const page = fs.readFileSync(new URL('../src/views/Announcements.vue', import.meta.url), 'utf8')
  const dashboard = fs.readFileSync(new URL('../src/views/Dashboard.vue', import.meta.url), 'utf8')
  const globalMessages = fs.readFileSync(new URL('../src/i18n/messages.js', import.meta.url), 'utf8')
  const template = page.slice(page.indexOf('<template>'), page.indexOf('</template>'))

  assert.doesNotMatch(template, /[\u3400-\u9fff]/)
  assert.match(page, /gameNotificationsV2API\.send/)
  assert.match(page, /gameNotificationsV2API\.savePolicy/)
  assert.match(page, /waitForV2Job/)
  assert.match(page, /Source|room_stop/)
  assert.match(page, /maxlength="500"/)
  assert.match(page, /announcements\.validation\.messageRequired/)
  assert.match(page, /selectedNotification\.deliveries/)
  assert.match(page, /formatSystemDateTime/)
  assert.doesNotMatch(page, /expireTime|important|announcementForm/)
  assert.match(dashboard, /近期游戏通知/)
  assert.match(dashboard, /notificationSourceLabel\(item\.type\)/)
  assert.match(dashboard, /formatNotificationTime\(item\.time\)/)
  assert.doesNotMatch(dashboard, /近期公告|管理公告/)
  assert.match(globalMessages, /\.\.\.announcementMessages\['en-US'\]/)
})

test('English announcement messages contain no Chinese display text', () => {
  for (const path of leafPaths(announcementMessages['en-US'])) {
    const value = path.split('.').reduce((current, key) => current?.[key], announcementMessages['en-US'])
    assert.doesNotMatch(String(value), /[\u3400-\u9fff]/, path)
  }
})
