import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { ref, shallowRef } from 'vue'
const source = readFileSync(new URL('../src/components/AutomationWorkspace.vue', import.meta.url), 'utf8')
const script = source.match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '')
function workspace(api, route = { name: 'TaskList', query: {}, params: {} }) {
  let unmount
  const view = runInNewContext(`${script}; ({load, dispose, rooms, boundApi, loading, error})`, {
    ref, shallowRef, defineProps: () => {}, useRoute: () => route, useRouter: () => ({ replace: async () => {} }),
    watch: () => {}, onBeforeUnmount: fn => { unmount = fn },
    realCronTaskApi: api, AUTOMATION_SCOPE_EVENT: 'scope', window: new EventTarget()
  })
  return { ...view, unmount }
}
test('workspace does not mount tasks or zero-valued charts until a room is selected', async () => {
  let id = ''
  const api = { getRoomScope: async () => ({ rooms: [{ id: 'a' }, { id: 'b' }], roomId: id }), forCurrentRoom: () => ({ dispose() {} }) }
  const page = workspace(api)
  await page.load()
  assert.equal(page.boundApi.value, null)
  assert.equal(page.loading.value, false)
  assert.equal(page.rooms.value.length, 2)
  id = 'b'
  await page.load()
  assert.ok(page.boundApi.value)
  page.unmount()
})
test('workspace separates catalog errors from no rooms and can recover', async () => {
  let error = true
  const page = workspace({ getRoomScope: async () => { if (error) throw Error('offline'); return { rooms: [], roomId: '' } } })
  await page.load()
  assert.equal(page.error.value, 'offline')
  assert.equal(page.boundApi.value, null)
  error = false
  await page.load()
  assert.equal(page.error.value, '')
  assert.equal(page.rooms.value.length, 0)
  page.unmount()
})
test('workspace disposes an old API before reading a new scope; slow responses cannot remount it', async () => {
  let oldResolve; let calls = 0; let disposed = false
  const api = {
    getRoomScope: () => ++calls === 1 ? new Promise(r => { oldResolve = r }) : Promise.resolve({ rooms: [{ id: 'b' }], roomId: 'b' }),
    forCurrentRoom: () => ({ dispose() { disposed = true } })
  }
  const page = workspace(api)
  const old = page.load()
  await page.load()
  const current = page.boundApi.value
  oldResolve({ rooms: [{ id: 'a' }], roomId: 'a' })
  await old
  assert.equal(page.boundApi.value, current)
  assert.equal(page.rooms.value[0].id, 'b')
  page.dispose()
  assert.equal(disposed, true)
  assert.equal(page.boundApi.value, null)
  page.unmount()
})

test('statistics render their containers before initializing charts after the first query', async () => {
  const page = readFileSync(new URL('../src/views/cron/TaskCharts.vue', import.meta.url), 'utf8')
  const method = page.slice(page.indexOf('    loadAllCharts() {'), page.indexOf('    loadGroupCharts() {')).trim().replace(/,$/, '')
  const load = runInNewContext(`({ ${method} }).loadAllCharts`, { console: { log() {}, error() {} } })
  let rendered = 0
  const model = { loading: true, chartData: {}, dateRange: '30', automationApi: { getOverviewChart: async () => ({ data: { code: 200, data: { stats: { total_tasks: 0 } } } }) },
    $nextTick(fn) { assert.equal(this.loading, false); fn() }, initOverviewChart() { rendered++ }, initDurationChart() { rendered++ }, setLoadFailure() { assert.fail('unexpected failure') } }
  load.call(model)
  for (let i = 0; i < 5; i++) await Promise.resolve()
  assert.equal(rendered, 2)
  assert.equal(model.overview.total_tasks, 0)
})
