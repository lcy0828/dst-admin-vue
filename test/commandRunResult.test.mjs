import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createI18n } from 'vue-i18n'
import { workbenchMessages } from '../src/i18n/workbenchMessages.js'

let server, Component
before(async () => {
  server = await createServer({ server: { middlewareMode: true, watch: null }, appType: 'custom' })
  Component = (await server.ssrLoadModule('/src/components/game-tools/CommandRunResult.vue')).default
})
after(async () => { await server?.close() })
async function render(props, locale = 'zh-CN') {
  const app = createSSRApp({ render: () => h(Component, props) })
  app.use(createI18n({ legacy: false, locale, messages: workbenchMessages }))
  return renderToString(app)
}

test('Both console surfaces show a visible waiting state and hide previous output while pending', async () => {
  const html = await render({ pending: true, target: 'Master', run: { status: 'succeeded', output: { text: 'OLD_OUTPUT' } } })
  assert.match(html, /正在等待游戏回执/)
  assert.match(html, /请勿重复执行/)
  assert.doesNotMatch(html, /OLD_OUTPUT/)
})

test('A printed zero is visible as output while empty, missing and failed runs have distinct explanations', async () => {
  const zero = await render({ run: { status: 'succeeded', output: { text: '0\n', truncated: false } } })
  assert.match(zero, /已取得执行结果/)
  assert.match(zero, /data-command-output[^>]*>0\n/)
  const empty = await render({ run: { status: 'succeeded', output: { text: '', truncated: false } } })
  assert.match(empty, /已完成，本次无输出/)
  assert.match(empty, /不表示查询结果为 0/)
  const missing = await render({ run: { status: 'succeeded' } })
  assert.match(missing, /游戏已确认执行/)
  assert.match(missing, /回执未提供输出/)
  const failed = await render({ run: { status: 'failed', output: { text: 'partial' }, errorMessage: 'Lua error' } })
  assert.match(failed, /执行失败/)
  assert.match(failed, /Lua error/)
  assert.match(failed, /data-command-output[^>]*>partial/)
})

test('Unconfirmed results offer reading the original receipt and explain lookup failure in both languages', async () => {
  const run = { id: 'run-id', roomId: 'room', worldId: 'Master', status: 'uncertain', receiptRefreshUntil: new Date(Date.now() + 60_000).toISOString(), receiptCheck: { status: 'not_found' } }
  const html = await render({ run })
  assert.match(html, /执行结果未确认/)
  assert.match(html, /重新读取原回执/)
  assert.match(html, /暂未找到原回执/)
  const english = await render({ run }, 'en-US')
  assert.match(english, /Read original receipt/)
  assert.match(english, /not found/)
  const expired = await render({ run: { ...run, receiptRefreshUntil: new Date(0).toISOString() } })
  assert.match(expired, /已超过提交后 2 分钟/)
  assert.doesNotMatch(expired, /data-receipt-refresh/)
})
