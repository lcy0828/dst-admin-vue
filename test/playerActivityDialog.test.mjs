import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createRenderer, h, nextTick, reactive, ssrContextKey } from 'vue'
import { createI18n } from 'vue-i18n'
import { playerActivityMessages } from '../src/i18n/playerActivityMessages.js'

let server, Dialog, api
before(async () => {
  server = await createServer({ server: { middlewareMode: true, watch: null }, appType: 'custom' })
  Dialog = (await server.ssrLoadModule('/src/components/players/PlayerActivityDialog.vue')).default
  api = (await server.ssrLoadModule('/src/api/v2.js')).playerActivityV2API
})
after(async () => { await server?.close() })

const deferred = () => {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}
const settle = async () => {
  for (let i = 0; i < 4; i++) { await nextTick(); await Promise.resolve() }
}
const status = room => ({ settings: { revision: room }, worlds: [{ worldId: 'Master', worldName: 'Master' }] })

// Run the compiled component's real setup and lifecycle; SSR rendering alone
// suppresses queued watchers and would miss request-cancellation races.
function mount(overrides = {}) {
  const props = reactive({ open: true, rooms: [{ id: 'A', name: 'A' }, { id: 'B', name: 'B' }], initialRoomId: 'A', ...overrides })
  let state
  const component = {
    ...Dialog,
    setup(props, context) { state = Dialog.setup(props, context); return state },
    render: () => null
  }
  const renderer = createRenderer({
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    insert() {}, remove() {}, patchProp() {}, setElementText() {}, setText() {},
    parentNode: () => null, nextSibling: () => null
  })
  const app = renderer.createApp({ render: () => h(component, props) })
  app.provide(ssrContextKey, { modules: new Set() })
  app.use(createI18n({ legacy: false, locale: 'zh-CN', messages: playerActivityMessages }))
  app.mount({})
  return { props, state, unmount: () => app.unmount() }
}

test('switching rooms after selecting filters completes the new request and ignores the old response', async () => {
  const old = deferred(), requests = []
  api.status = async room => status(room)
  api.events = async (room, query, options) => {
    requests.push({ room, query, signal: options.signal })
    return room === 'A' && query.worldId ? old.promise : { items: [{ roomId: room }] }
  }
  const dialog = mount()
  try {
    await settle()
    dialog.state.world.value = 'Master'
    dialog.state.kind.value = 'action.'
    const previous = dialog.state.load()
    await settle()
    dialog.state.room.value = 'B'
    await settle()
    assert.equal(dialog.state.status.value.settings.revision, 'B')
    assert.equal(dialog.state.data.value.items[0].roomId, 'B')
    assert.equal(dialog.state.loading.value, false)
    assert.equal(dialog.state.error.value, '')
    const latest = requests.at(-1)
    assert.equal(latest.room, 'B')
    assert.equal(latest.signal.aborted, false)
    assert.equal(latest.query.worldId, undefined)
    assert.equal(latest.query.kind, undefined)
    assert.equal(requests.find(request => request.query.worldId)?.signal.aborted, true)
    old.resolve({ items: [{ roomId: 'A', stale: true }] })
    await previous
    assert.equal(dialog.state.data.value.items[0].roomId, 'B')
  } finally { dialog.unmount() }
})

test('closing and reopening with filters loads again, and filter edits still cancel old reads', async () => {
  const held = deferred()
  api.status = async room => status(room)
  api.events = async (room, query) => query.kind ? held.promise : { items: [{ roomId: room }] }
  const dialog = mount()
  try {
    await settle()
    dialog.state.kind.value = 'combat.'
    const previous = dialog.state.load()
    await settle()
    dialog.props.open = false
    await settle()
    dialog.props.open = true
    await settle()
    assert.equal(dialog.state.data.value.items[0].roomId, 'A')
    assert.equal(dialog.state.loading.value, false)
    held.resolve({ items: [{ stale: true }] })
    await previous
    assert.equal(dialog.state.data.value.items[0].stale, undefined)
    dialog.state.user.value = 'KU_NEW'
    assert.equal(dialog.state.data.value, null)
  } finally { dialog.unmount() }
})

test('changing a camelCase player identity reloads exactly once within the same room', async () => {
  const users = []
  api.status = async room => status(room)
  api.events = async (room, query) => { users.push(query.userId); return { items: [{ userId: query.userId }] } }
  const dialog = mount({ player: { roomId: 'A', userId: 'KU_ONE' } })
  try {
    await settle()
    dialog.props.player = { roomId: 'A', userId: 'KU_TWO' }
    await settle()
    assert.deepEqual(users, ['KU_ONE', 'KU_TWO'])
    assert.equal(dialog.state.data.value.items[0].userId, 'KU_TWO')
  } finally { dialog.unmount() }
})

test('trajectory opts into compact points and preserves required player filters', async () => {
  let received
  api.status = async room => status(room)
  api.events = async () => ({ items: [] })
  api.trajectory = async (room, query) => { received = { room, query }; return { items: [], coverage: [] } }
  const dialog = mount({ player: { roomId: 'A', userId: 'KU_ONE' } })
  try {
    await settle()
    dialog.state.tab.value = 'trajectory'
    await settle()
    assert.equal(received.room, 'A')
    assert.equal(received.query.userId, 'KU_ONE')
    assert.equal(received.query.projection, 'compact')
  } finally { dialog.unmount() }
})

test('re-sync acceptance for a previous room cannot start polling the new room', async () => {
  const held = deferred(), resyncRooms = []
  api.status = async room => status(room)
  api.events = async room => ({ items: [{ roomId: room }] })
  api.resync = async room => { resyncRooms.push(room); return held.promise }
  const dialog = mount()
  try {
    await settle()
    const request = dialog.state.resync()
    assert.equal(dialog.state.resyncing.value, true)
    dialog.state.room.value = 'B'
    await settle()
    held.resolve({ accepted: true, status: 'pending' })
    await request
    assert.deepEqual(resyncRooms, ['A'])
    assert.equal(dialog.state.resyncing.value, false)
    assert.equal(dialog.state.status.value.settings.revision, 'B')
  } finally { dialog.unmount() }
})
