import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createRenderer, nextTick, ssrContextKey } from 'vue'

let server, View, api
before(async () => {
  server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom' })
  View = (await server.ssrLoadModule('/src/views/RuleManagementView.vue')).default
  const adapters = await server.ssrLoadModule('/src/api/logApi.js')
  api = { ruleManagementApi: adapters.realRuleManagementApi, logApi: adapters.realLogApi }
})
after(async () => { await server?.close() })

const settle = async () => { for (let i = 0; i < 12; i++) { await nextTick(); await Promise.resolve() } }
const rule = { id: 'custom', name: 'Boss', description: '', log_type: 'entity', pattern: 'boss', is_regex: false, is_enabled: true, priority: 0, match_mode: 'single', tail_pattern: '' }

function mount({ list } = {}) {
  const calls = [], originalRules = { ...api.ruleManagementApi }, originalLogs = { ...api.logApi }
  api.ruleManagementApi.getRulesList = async (...args) => {
    calls.push(['list', ...args])
    return list ? list() : { status: 200, data: [{ ...rule }] }
  }
  api.ruleManagementApi.getMigrationPreview = async (...args) => {
    calls.push(['preview', ...args])
    return { sourceAvailable: true, ready: 1, items: [] }
  }
  api.ruleManagementApi.migrateLegacyRules = async (...args) => { calls.push(['migrate', ...args]); return { imported: 1 } }
  api.ruleManagementApi.updateRule = async (...args) => { calls.push(['update', ...args]); return {} }
  api.ruleManagementApi.addRule = async (...args) => { calls.push(['create', ...args]); return {} }
  api.logApi.getRoomOptions = async () => { throw new Error('Global rules must not discover rooms') }
  api.logApi.refresh = async () => { throw new Error('Changing rules must not parse room logs') }
  const renderer = createRenderer({ createElement: () => ({}), createText: () => ({}), createComment: () => ({}), insert() {}, remove() {}, patchProp() {}, setElementText() {}, setText() {}, parentNode: () => null, nextSibling: () => null })
  const app = renderer.createApp({ ...View, render: () => null })
  app.provide(ssrContextKey, { modules: new Set() })
  app.config.globalProperties.$t = key => key
  const vm = app.mount({})
  return {
    vm, calls,
    unmount() { app.unmount(); Object.assign(api.ruleManagementApi, originalRules); Object.assign(api.logApi, originalLogs) }
  }
}

test('rules load without rooms and creation, editing and import use the shared configuration', async () => {
  const view = mount()
  try {
    await settle()
    assert.deepEqual(view.calls, [['list'], ['preview']])
    assert.equal(view.vm.parserRulesList[0].id, 'custom')
    view.vm.editParserRule(view.vm.parserRulesList[0])
    assert.equal(view.vm.ruleForm.priority, 0)
    await view.vm.confirmRuleAction()
    const edit = view.calls.find(call => call[0] === 'update')
    assert.equal(edit[1], 'custom')
    assert.equal(edit.length, 3)
    view.vm.addParserRule()
    assert.equal(view.vm.dialogVisible.parser, true)
    Object.assign(view.vm.ruleForm, { ...rule, id: '' })
    await view.vm.confirmRuleAction()
    assert.equal(view.calls.find(call => call[0] === 'create').length, 2)
    await view.vm.migrateLegacyRules()
    assert.deepEqual(view.calls.find(call => call[0] === 'migrate'), ['migrate'])
    assert.equal(view.vm.migrationApplying, false)
  } finally { view.unmount() }
})

test('a delayed response cannot replace the latest global rule list', async () => {
  let resolveFirst, count = 0
  const first = new Promise(resolve => { resolveFirst = resolve })
  const view = mount({ list: () => ++count === 1 ? first : { status: 200, data: [{ ...rule, name: 'Latest' }] } })
  try {
    await view.vm.getParserRulesList()
    resolveFirst({ status: 200, data: [{ ...rule, name: 'Stale' }] })
    await settle()
    assert.equal(view.vm.parserRulesList[0].name, 'Latest')
  } finally { view.unmount() }
})
