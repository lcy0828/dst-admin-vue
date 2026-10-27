import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createI18n } from 'vue-i18n'
import { modDiagnosticsMessages } from '../src/i18n/modDiagnosticsMessages.js'

let server, Report, Preflight
before(async () => {
  server = await createServer({ server: { middlewareMode: true, watch: null }, appType: 'custom' })
  Report = (await server.ssrLoadModule('/src/components/runtime/ModCompatibilityReport.vue')).default
  Preflight = (await server.ssrLoadModule('/src/components/runtime/ModPreflightReports.vue')).default
})
after(async () => { await server?.close() })
async function render(component, props, locale = 'zh-CN') {
  const app = createSSRApp({ render: () => h(component, props) })
  app.use(createI18n({ legacy: false, locale, messages: modDiagnosticsMessages }))
  return renderToString(app)
}
const report = {
  status: 'suspected',
  observation: { roomId: 'room', worldId: 'Master', worldName: '森林', targetId: 'local', version: { gameVersion: '750000', steamBuild: '12345' }, mods: [{ id: '1', name: '测试模组', version: '1.2' }] },
  findings: [{ code: 'MOD_IN_ERROR_STACK', kind: 'suspected', modIds: ['1'] }],
  evidence: [{ code: 'GAME_LOG_ERROR', firstCursor: 10, errorCursor: 11, lines: ['LUA ERROR: <script>bad()</script>', '../mods/workshop-1/modmain.lua:5'], modIds: ['1'], truncated: true }],
  changes: [], logCorrelation: 'unknown', limitations: ['STACK_REFERENCE_IS_NOT_CAUSATION', 'CURRENT_FILES_NOT_START_SNAPSHOT'], recommendations: ['REVIEW_FIRST_ERROR_AND_STACK']
}

test('Evidence stays visible without AI and stack references remain unconfirmed in both locales', async () => {
  const html = await render(Report, { report })
  assert.match(html, /有待核实的线索/)
  assert.match(html, /尚不能确认它们是原因/)
  assert.match(html, /测试模组/)
  assert.match(html, /Steam Build 12345/)
  assert.match(html, /游戏版本 750000/)
  assert.match(html, /<details[^>]* open/)
  assert.match(html, /&lt;script&gt;bad\(\)&lt;\/script&gt;/)
  assert.doesNotMatch(html, /<script>bad/)
  assert.match(html, /不冒充发生报错时的进程快照/)
  const english = await render(Report, { report }, 'en-US')
  assert.match(english, /causation is not established/)
  assert.match(english, /start could not be matched/)
})

test('Missing evidence is unknown, and pre-update summaries are not described as compatible', async () => {
  const html = await render(Report, { report: { ...report, status: 'insufficient_evidence', findings: [], evidence: [], baseline: { capturedAt: '2026-10-27T10:00:00Z' }, limitations: ['LOG_FROM_PREVIOUS_START', 'MOD_FACTS_UNAVAILABLE'] } })
  assert.match(html, /证据有限/)
  assert.match(html, /不用于解释本次启动/)
  assert.match(html, /不代表没有启用模组/)
  assert.match(html, /不是“已验证兼容”的基准/)
  assert.match(html, /不代表所有模组均兼容/)
})

test('Update preflight reports are optional and do not introduce a new approval action', async () => {
  assert.doesNotMatch(await render(Preflight, { reports: [] }), /模组与版本提示/)
  const html = await render(Preflight, { reports: [report] })
  assert.match(html, /这些提示不阻止更新/)
  assert.match(html, /森林/)
  assert.doesNotMatch(html, /<button/)
})

test('Unavailable mod facts display an unknown count rather than zero enabled mods', async () => {
  const html = await render(Report, { report: { ...report, observation: { ...report.observation, mods: [] }, findings: [], evidence: [], limitations: ['MOD_FACTS_UNAVAILABLE', 'LOG_UNAVAILABLE'] } })
  assert.match(html, /启用模组数量未知/)
  assert.match(html, /部分证据不可用/)
  assert.doesNotMatch(html, /启用 0 个模组/)
})
