import test from 'node:test'
import assert from 'node:assert/strict'
import { createI18n } from 'vue-i18n'
import { notificationMessages } from '../src/i18n/notificationMessages.js'
import { notificationForm, notificationInput, notificationHistoryPending, webhookPresets } from '../src/lib/notificationChannels.mjs'

test('email recipients are normalized and deduplicated without webhook credentials', () => {
  const form = notificationForm(null, 'a@example.com')
  form.name = ' Email '; form.recipients = 'a@example.com；b@example.com\na@example.com'
  const value = notificationInput(form)
  assert.equal(value.name, 'Email')
  assert.deepEqual(value.recipients, ['a@example.com', 'b@example.com'])
  assert.equal('url' in value, false)
  form.recipients = 'invalid'
  assert.throws(() => notificationInput(form), /recipients/)
})

test('editing keeps write-only credentials unless explicitly replaced or cleared', () => {
  const form = notificationForm({ id: 'channel-1', revision: 'r1', name: 'Webhook', type: 'webhook', urlConfigured: true, headersConfigured: true, events: ['custom'] })
  assert.equal(form.url, '')
  assert.equal(form.headers, '')
  let value = notificationInput(form)
  assert.equal('url' in value, false)
  assert.equal('headers' in value, false)
  assert.equal(value.revision, 'r1')
  form.headers = '{}'
  value = notificationInput(form)
  assert.deepEqual(value.headers, {})
  form.url = 'https://example.com/hook'
  assert.equal(notificationInput(form).url, form.url)
})

test('Webhook inputs reject non-HTTP destinations and malformed headers or JSON templates', () => {
  const form = notificationForm(null)
  form.type = 'webhook'; form.name = 'Hook'
  for (const url of ['', 'file:///tmp/test', 'https://user:password@example.com/hook', 'https://example.com/#token']) {
    form.url = url; assert.throws(() => notificationInput(form), /url/)
  }
  form.url = 'http://127.0.0.1:9000/hook'
  for (const headers of ['invalid', 'null', '[]', '{"token":123}']) {
    form.headers = headers; assert.throws(() => notificationInput(form), /headers/)
  }
  form.headers = ''; form.template = '{invalid'
  assert.throws(() => notificationInput(form), /template/)
  form.format = 'text'; form.template = '{{title}}\n{{message}}'
  assert.equal(notificationInput(form).format, 'text')
})

test('bot presets have the provider message shape and history polls only pending deliveries', () => {
  assert.equal(JSON.parse(webhookPresets.wecom.template).msgtype, 'text')
  assert.equal(JSON.parse(webhookPresets.dingtalk.template).text.content, '{{title}}\n{{message}}')
  assert.equal(JSON.parse(webhookPresets.feishu.template).msg_type, 'text')
  assert.equal(notificationHistoryPending([{ status: 'sent' }, { status: 'failed' }]), false)
  assert.equal(notificationHistoryPending([{ status: 'sending' }]), true)
  assert.equal(notificationHistoryPending([{ status: 'queued' }]), true)
})

test('notification translations compile, including literal JSON braces', () => {
  for (const locale of ['zh-CN', 'en-US']) {
    const i18n = createI18n({ legacy: false, locale, messages: notificationMessages })
    const walk = (value, path) => {
      for (const [key, item] of Object.entries(value)) {
        const full = path ? `${path}.${key}` : key
        if (typeof item === 'object') walk(item, full)
        else assert.ok(i18n.global.t(full).length > 0)
      }
    }
    walk(notificationMessages[locale], '')
    assert.ok(i18n.global.t('notifications.headersHelp').includes('{}'))
  }
})
