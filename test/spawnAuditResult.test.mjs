import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createI18n } from 'vue-i18n'
import { spawnAuditMessages } from '../src/i18n/spawnAuditMessages.js'

let server, Component
before(async () => {
  server = await createServer({ server: { middlewareMode: true, watch: null }, appType: 'custom' })
  Component = (await server.ssrLoadModule('/src/components/game-tools/SpawnAuditResult.vue')).default
})
after(async () => { await server?.close() })
async function render(audit, locale = 'zh-CN') {
  const app = createSSRApp({ render: () => h(Component, { audit }) })
  app.use(createI18n({ legacy: false, locale, messages: spawnAuditMessages }))
  return renderToString(app)
}

test('Spawn receipts distinguish zero positions, inventory and unconfirmed destinations', async () => {
  const audit = { status: 'complete', total: 3, origin: { x: 10, y: 0, z: -20 }, records: [
    { prefab: 'beefalo', quantity: 1, destination: 'world', position: { x: 0, y: 0, z: 0 } },
    { prefab: 'flint', quantity: 20, destination: 'inventory' },
    { prefab: '<script>bad()</script>', quantity: 1, destination: 'unresolved' },
  ] }
  const html = await render(audit)
  assert.match(html, /X 0\.00 · Y 0\.00 · Z 0\.00/)
  assert.match(html, /已确认进入物品栏/)
  assert.match(html, /去向未确认/)
  assert.match(html, /X 10\.00/)
  assert.match(html, /&lt;script&gt;bad\(\)&lt;\/script&gt;/)
  assert.doesNotMatch(html, /<script>bad/)
  const english = await render(audit, 'en-US')
  assert.match(english, /Confirmed in an inventory/)
  assert.match(english, /not the current position/)
})

test('Incomplete captures never imply zero spawns or invite automatic replay', async () => {
  const html = await render({ status: 'partial', omitted: 60, records: [] })
  assert.match(html, /生成记录不完整/)
  assert.match(html, /缺少记录不代表未生成/)
  assert.match(html, /不会自动重新执行/)
  assert.match(html, /60/)
  assert.doesNotMatch(html, /记录到 0/)
  const unavailable = await render({ status: 'unavailable', records: [] }, 'en-US')
  assert.match(unavailable, /No spawn position records available/)
})
