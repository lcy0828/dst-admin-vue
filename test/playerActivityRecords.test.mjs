import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createI18n } from 'vue-i18n'
import { playerActivityMessages } from '../src/i18n/playerActivityMessages.js'
let server, Records
before(async () => {
  server = await createServer({ server: { middlewareMode: true, watch: null }, appType: 'custom' })
  Records = (await server.ssrLoadModule('/src/components/players/PlayerActivityRecords.vue')).default
})
after(async () => { await server?.close() })
async function render(data, tab = 'timeline', locale = 'zh-CN') {
  const app = createSSRApp({ render: () => h(Records, { data, tab, worlds: [{ worldId: 'world', worldName: 'Master' }] }) })
  app.use(createI18n({ legacy: false, locale, messages: playerActivityMessages }))
  return renderToString(app)
}
test('timeline shows zero coordinates, action counts and explicit collection gaps without HTML injection', async () => {
  const html = await render({ items: [
    { id: '1', kind: 'action.pickup', worldId: 'world', name: '<script>evil()</script>', occurredAt: '2026-10-27T10:00:00Z', position: { x: 0, z: 0 }, fields: { count: 20, targetPrefab: 'log' } },
    { id: '2', kind: 'collection.gap', worldId: 'world', occurredAt: '2026-10-27T10:00:01Z', fields: { code: 'SPOOL_WINDOW_EXCEEDED' } }
  ] })
  assert.match(html, /拾取/); assert.match(html, /次数 20/); assert.match(html, /X 0\.0 \/ Z 0\.0/)
  assert.match(html, /采集缺口/); assert.match(html, /记录可能不完整/)
  assert.match(html, /&lt;script&gt;evil/); assert.doesNotMatch(html, /<script>evil/)
})
test('combat distinguishes participation, confirmed zero damage and unknown damage in both languages', async () => {
  const data = { items: [
    { userId: 'KU_TEST', worldId: 'world', targetPrefab: 'dragonfly', epic: true, direction: 'outgoing', hits: 5, damage: null, unknownDamageHits: 5, kills: 0 },
    { userId: 'KU_TEST', worldId: 'world', targetPrefab: 'spider', direction: 'incoming', hits: 2, damage: 0, unknownDamageHits: 0, kills: 0 }
  ], truncated: true }
  const html = await render(data, 'combat')
  assert.match(html, /Boss 参与/); assert.match(html, /伤害未知/); assert.match(html, /2000/); assert.match(html, /受到攻击/); assert.match(html, />0\.0</)
  const en = await render(data, 'combat', 'en-US')
  assert.match(en, /Boss participation/); assert.match(en, /Unknown/); assert.match(en, /Received attacks/)
})
test('empty histories explain coverage, and sampled paths do not claim exact replay', async () => {
  const empty = await render({ items: [] })
  assert.match(empty, /暂无匹配的记录/); assert.match(empty, /无法追溯/)
  const html = await render({ items: [{ id: '1', kind: 'position', worldId: 'world', userId: 'KU_TEST', producerInstanceId: 'boot', occurredAt: '2026-10-27T10:00:00Z', position: { x: 1, z: 2 }, fields: {} }] }, 'trajectory')
  assert.match(html, /不是地图或精确回放/); assert.match(html, /<svg/); assert.match(html, /Master/)
})
