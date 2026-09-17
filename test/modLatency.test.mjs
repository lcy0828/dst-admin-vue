import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { parse as parseJS } from '@babel/parser'
import { parse as parseSFC } from '@vue/compiler-sfc'
import { baseParse } from '@vue/compiler-dom'
import { createRenderer, h, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView, useRoute } from 'vue-router'
import { mergeRoomModCatalog } from '../src/lib/roomModCatalog.mjs'
import { compareWorldRoles } from '../src/lib/worldRuntimeStatus.mjs'
import { modThumbnailUrl } from '../src/lib/modImages.mjs'
import { enrichModMetadata } from '../src/lib/modMetadata.mjs'

const source = path => readFile(new URL(`../src/${path}`, import.meta.url), 'utf8')
const deferred = () => {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}
const settle = async () => {
  for (let i = 0; i < 4; i += 1) {
    await new Promise(resolve => setImmediate(resolve))
    await nextTick()
  }
}
const feedback = {
  toast: { success() {}, info() {}, warning() {}, error(message) { throw new Error(message) } },
  createModFailure: (key, error) => ({ key, message: error?.message }),
  formatModFailure: (_, error) => error?.message || error?.key || ''
}

// Execute the real component methods with injected API calls, without a browser.
async function componentOptions(path, dependencies) {
  const script = parseSFC(await source(path)).descriptor.script.content
  const declaration = parseJS(script, { sourceType: 'module' }).program.body
    .find(node => node.type === 'ExportDefaultDeclaration').declaration
  const properties = declaration.properties.filter(node => node.key.name !== 'components')
    .map(node => script.slice(node.start, node.end))
  const scope = { ...feedback, modThumbnailUrl, enrichModMetadata, useSharedJobStatus: () => null, ...dependencies }
  return new Function(...Object.keys(scope), `return ({${properties.join(',')}})`)(...Object.values(scope))
}

function instance(options, values = {}) {
  const value = { ...options.data(), $t: key => key, $emit() {}, ...values }
  for (const [name, method] of Object.entries(options.methods)) value[name] = method.bind(value)
  for (const [name, getter] of Object.entries(options.computed)) {
    if (!(name in values)) Object.defineProperty(value, name, { get: getter.bind(value) })
  }
  return value
}

test('configuration mode persists only after success and mixed worlds require an explicit source', async () => {
  const calls = []
  let fail = false
  const options = await componentOptions('views/mods/ModList.vue', {
    modApi: { setConfigurationMode: async (...args) => { calls.push(args); if (fail) throw new Error('offline') } },
    toast: { error() {} }
  })
  const mod = { modid: '100', roomProfile: { configurationMode: 'shared', configurationMixed: false } }
  const list = instance(options, { selectedRoomId: 'room', modsList: [mod] })
  await list.setSeparateWorldConfig(mod, true)
  assert.equal(list.usesSeparateWorldConfig(mod), true)
  assert.deepEqual(calls, [['room', '100', 'separate']])
  fail = true
  await list.setSeparateWorldConfig(mod, false)
  assert.equal(list.usesSeparateWorldConfig(mod), true)
  mod.roomProfile.configurationMixed = true
  await list.setSeparateWorldConfig(mod, false)
  assert.equal(list.sharedSourceDialogVisible, true)
  assert.equal(list.sharedSourceWorldId, '')
  assert.equal(calls.length, 2)
  list.sharedSourceDialogVisible = false
  assert.equal(list.usesSeparateWorldConfig(mod), true)
})

test('late shared editor preparation cannot reopen a previous room', async () => {
  const response = deferred()
  const options = await componentOptions('views/mods/ModList.vue', { modApi: {} })
  const list = instance(options, { selectedRoomId: 'room', selectedRoomWorlds: [{ id: 'master' }] })
  list.isConfiguredInWorld = () => true
  list.modWorldRevisions = () => response.promise
  list.selectWorldContext = () => assert.fail('old room selected')
  const pending = list.openRoomConfigDialog({ modid: '100' })
  list.selectedRoomId = 'other'
  response.resolve({ master: 'r1' })
  await pending
  assert.equal(list.configDialogVisible, false)
})

async function modAPI(dependencies) {
  const code = await source('api/modApi.js')
  const body = parseJS(code, { sourceType: 'module' }).program.body.flatMap(node => {
    if (node.type === 'ImportDeclaration' || node.type === 'ExportDefaultDeclaration') return []
    const statement = node.type === 'ExportNamedDeclaration' ? node.declaration : node
    return [code.slice(statement.start, statement.end)]
  }).join('\n')
  const scope = { mergeRoomModCatalog, compareWorldRoles, adapterError: code => new Error(code), ...dependencies }
  return new Function(...Object.keys(scope), `${body}\nreturn realModApi`)(...Object.values(scope))
}

test('multi-machine updates overlap within the limit and only finish after all targets', async () => {
  const gates = Array.from({ length: 5 }, deferred)
  const calls = []
  const progress = []
  let active = 0
  let peak = 0
  const api = await modAPI({
    modsV2API: { updateRuntimeMod: async target => { calls.push(target); return { id: Number(target) } } },
    waitForV2Job: async (job, _, report) => {
      peak = Math.max(peak, ++active)
      await gates[job.id].promise
      active--
      report({ status: 'succeeded', progress: 100 })
      return job
    }
  })
  const pending = api.updateMod({ roomId: 'room', modid: '100', onProgress: job => progress.push(job),
    runtimeVersions: gates.map((_, index) => ({ targetId: String(index), installationId: 'native', status: 'outdated' })) })
  await settle()
  assert.equal(calls.length, 3)
  gates[0].resolve()
  await settle()
  assert.equal(calls.length, 4)
  assert.equal(progress.at(-1).status, 'running')
  for (const gate of gates) gate.resolve()
  await pending
  assert.equal(peak, 3)
  assert.deepEqual(progress.at(-1), { status: 'succeeded', progress: 100 })
})

test('room catalog starts node reads immediately and reuses its embedded profile and worlds', async () => {
  const list = deferred()
  const calls = []
  const api = await modAPI({
    modsV2API: {
      list: () => { calls.push('list'); return list.promise },
      runtimeInventory: async target => { calls.push(target); return { items: [] } },
      profile: () => assert.fail('redundant profile request'),
      library: () => assert.fail('room list waited for Controller library')
    },
    topologyV2API: { worlds: () => assert.fail('worlds already supplied') }
  })
  const pending = api.getRoomModCatalog({ roomId: 'room', worlds: [
    { id: 'master', appliedTargetId: 'local' },
    { id: 'caves', appliedTargetId: 'agent:node', appliedInstallationId: 'native' },
    { id: 'extra', appliedTargetId: 'agent:node', appliedInstallationId: 'native' }
  ] })
  await settle()
  assert.deepEqual(calls, ['list', 'local', 'agent:node'])
  list.resolve({ items: [{ id: '100', configured: true }], profile: {
    items: [{ modId: '100' }], worlds: [{ worldId: 'master', revision: 'r1' }]
  } })
  const items = await pending
  assert.equal(items[0].worldRevisions.master, 'r1')
})

test('download missing files targets only incomplete installations without copying through the Controller', async () => {
  const calls = []
  const api = await modAPI({
    modsV2API: { updateRuntimeMod: async (target, installation, id) => { calls.push([target, installation, id]); return { id: target, status: 'succeeded' } } },
    waitForV2Job: async job => job
  })
  await api.updateMod({ roomId: 'room', modid: '100', missingOnly: true, runtimeVersions: [
    { targetId: 'local', installationId: 'default', status: 'invalid' },
    { targetId: 'agent:missing', installationId: 'native', status: 'missing' },
    { targetId: 'agent:current', installationId: 'native', status: 'current' },
    { targetId: 'agent:older', installationId: 'native', status: 'outdated' },
    { targetId: 'agent:offline', installationId: 'native', status: 'unavailable' }
  ] })
  assert.deepEqual(calls, [['local', 'default', '100'], ['agent:missing', 'native', '100']])
})

test('world and topology reads overlap; older backends retain the profile fallback', async () => {
  const worlds = deferred()
  const calls = []
  const api = await modAPI({
    topologyV2API: {
      worlds: () => { calls.push('worlds'); return worlds.promise },
      get: async () => { calls.push('topology'); return { revision: 'placement-r1', placements: [], targets: [] } }
    },
    modsV2API: {
      list: async () => ({ items: [{ id: '100' }] }),
      profile: async () => { calls.push('profile'); return { items: [], worlds: [] } }
    }
  })
  const pending = api.getRoomWorlds('room')
  assert.deepEqual(calls, ['worlds', 'topology'])
  worlds.resolve({ items: [{ id: 'master' }] })
  assert.equal((await pending)[0].topologyRevision, 'placement-r1')
  await api.getServerList({ roomId: 'room' })
  assert.equal(calls.at(-1), 'profile')
})

test('metadata requests batch and deduplicate IDs, preserving partial failure warnings', async () => {
  const calls = []
  const api = await modAPI({ modsV2API: { metadata: async ids => {
    calls.push(ids)
    if (calls.length === 2) throw new Error('Steam timeout')
    return { items: Object.fromEntries(ids.map(id => [id, { id, name: `Mod ${id}`, author: 'Author' }])) }
  } } })
  const items = Array.from({ length: 120 }, (_, i) => ({ id: String(i + 1) }))
  const result = await api.getModMetadata([...items, ...items])
  assert.deepEqual(calls.map(ids => ids.length), [100, 20])
  assert.equal(result.metadata['1'].name, 'Mod 1')
  assert.equal(result.warning, 'Steam timeout')
  assert.deepEqual(result.incompleteModIds, items.slice(100).map(item => item.id))
  await api.getModMetadata([])
  assert.equal(calls.length, 2)
})

test('room list renders before Steam metadata and a save discards late enrichment', async () => {
  const metadata = deferred()
  const options = await componentOptions('views/mods/ModList.vue', { modApi: {
    getRoomModCatalog: async () => [{ id: '100', modid: '100', name: 'Workshop 100' }],
    getModMetadata: () => metadata.promise
  } })
  const list = instance(options, { selectedRoomId: 'room', selectedRoomWorlds: [], currentModInfo: { modid: '100' } })
  await list.fetchModsList()
  assert.equal(list.loading, false)
  assert.equal(list.modsList[0].name, 'Workshop 100')
  list.handleConfigUpdated({ roomId: 'room', modId: '100', revisions: { master: 'new' } })
  metadata.resolve({ metadata: { 100: { name: 'Late Steam name' } }, warning: 'old' })
  await settle()
  assert.equal(list.modsList[0].worldRevisions.master, 'new')
  assert.equal(list.modsList[0].name, 'Workshop 100')
  assert.equal(list.metadataWarning, '')
  assert.equal(list.metadataLoading, false)
})

test('metadata retries identify missing names, authors and omitted IDs from fields, not warning text', async () => {
  const api = await modAPI({ modsV2API: { metadata: async () => ({ items: {
    1: { name: 'Complete', author: 'Author' },
    2: { name: 'Name only', author: ' ' },
    3: { name: '', author: 'Author only' }
  }, warning: 'Some information is missing' }) } })
  const result = await api.getModMetadata([1, 2, 3, 4, 2].map(id => ({ modid: String(id) })))
  assert.deepEqual(result.incompleteModIds, ['2', '3', '4'])
})

test('room list retries only incomplete metadata and reports failure or success without reloading disk facts', async () => {
  const calls = []
  const notifications = []
  const options = await componentOptions('views/mods/ModList.vue', {
    modApi: { getModMetadata: items => {
      const gate = deferred()
      calls.push({ ids: items.map(item => item.modid), ...gate })
      return gate.promise
    } },
    toast: { info: message => notifications.push(message), success: message => notifications.push(message) }
  })
  const list = instance(options, { selectedRoomId: 'room', modsList: [
    { modid: '1', name: 'Known', author: 'Author', currentVersion: '1.0', enabled: false },
    { modid: '2', name: 'SHOWTEMPERATURE', currentVersion: '1.9.8', enabled: true }
  ] })
  const initial = list.loadModMetadata('room', 0)
  calls[0].resolve({ metadata: {}, incompleteModIds: ['2'], warning: 'missing author' })
  await initial
  const known = list.modsList[0]
  const retry = list.retryModMetadata()
  assert.equal(list.metadataLoading, true)
  assert.deepEqual(calls[1].ids, ['2'])
  await list.retryModMetadata()
  assert.equal(calls.length, 2)
  calls[1].resolve({ metadata: {}, incompleteModIds: ['2'], warning: 'Steam timeout' })
  await retry
  assert.equal(list.metadataLoading, false)
  assert.equal(list.metadataWarning, 'Steam timeout')
  assert.deepEqual(list.incompleteMetadataIds, ['2'])
  assert.equal(notifications.at(-1), 'mods.metadata.retryIncomplete')
  const completed = list.retryModMetadata()
  calls[2].resolve({ metadata: { 2: { name: 'Combined Status', author: 'rezecib', version: '2.0' } }, incompleteModIds: [], warning: '' })
  await completed
  assert.equal(list.modsList[0], known)
  assert.equal(list.modsList[1].name, 'Combined Status')
  assert.equal(list.modsList[1].currentVersion, '1.9.8')
  assert.equal(list.modsList[1].enabled, true)
  assert.equal(list.metadataWarning, '')
  assert.equal(list.metadataLoading, false)
  assert.deepEqual(list.incompleteMetadataIds, [])
  assert.equal(notifications.at(-1), 'mods.metadata.retryCompleted')
  await list.retryModMetadata()
  assert.equal(calls.length, 3)
})

test('a late room-list retry cannot overwrite a newer request or clear its loading state', async () => {
  const calls = []
  const options = await componentOptions('views/mods/ModList.vue', { modApi: { getModMetadata: () => {
    const gate = deferred()
    calls.push(gate)
    return gate.promise
  } } })
  const list = instance(options, { selectedRoomId: 'room', modsList: [{ modid: '1' }], incompleteMetadataIds: ['1'] })
  const old = list.retryModMetadata()
  list.selectedRoomId = 'other'
  list.catalogRequestId++
  list.modsList = [{ modid: '2' }]
  const latest = list.loadModMetadata('other', list.catalogRequestId)
  calls[0].resolve({ metadata: { 1: { name: 'Old' } }, warning: 'Old', incompleteModIds: [] })
  await old
  assert.equal(list.metadataWarning, '')
  assert.equal(list.metadataLoading, true)
  calls[1].resolve({ metadata: { 2: { name: 'New' } }, warning: '', incompleteModIds: [] })
  await latest
  assert.equal(list.modsList[0].name, 'New')
  assert.equal(list.metadataLoading, false)
})

test('room list fills Workshop names and authors after rendering disk facts', async () => {
  const metadata = deferred()
  const options = await componentOptions('views/mods/ModList.vue', { modApi: {
    getRoomModCatalog: async () => [{ id: '3760106287', name: 'Title', author: '', currentVersion: '2.0.3', enabled: false }],
    getModMetadata: () => metadata.promise
  } })
  const list = instance(options, { selectedRoomId: 'room', selectedRoomWorlds: [] })
  await list.fetchModsList()
  assert.equal(list.loading, false)
  assert.equal(list.modsList[0].currentVersion, '2.0.3')
  metadata.resolve({ metadata: { 3760106287: { name: 'Workshop name', author: 'Workshop author', version: '2.0.4' } }, warning: '' })
  await settle()
  assert.equal(list.modsList[0].name, 'Workshop name')
  assert.equal(list.modsList[0].author, 'Workshop author')
  assert.equal(list.modsList[0].currentVersion, '2.0.3')
  assert.equal(list.modsList[0].enabled, false)
})

test('opening details also refreshes list names and authors without overwriting disk state', async () => {
  const mod = { id: '376333686', name: 'SHOWTEMPERATURE', currentVersion: '1.9.8', enabled: false, worldRevisions: { master: 'manual' } }
  const options = await componentOptions('views/mods/ModList.vue', { modApi: {
    getModDetails: async () => ({ ...mod, name: 'Workshop name', author: 'Workshop author', currentVersion: 'stale', enabled: true })
  } })
  const list = instance(options, { modsList: [mod] })
  await list.showModDetails(mod)
  assert.equal(list.modsList[0].name, list.currentModInfo.name)
  assert.equal(list.modsList[0].author, list.currentModInfo.author)
  assert.equal(list.modsList[0].currentVersion, '1.9.8')
  assert.equal(list.modsList[0].enabled, false)
  assert.deepEqual(list.modsList[0].worldRevisions, { master: 'manual' })
})

for (const topologyAvailable of [true, false]) {
  test(`Mod world selectors put the main shard first with topology ${topologyAvailable ? 'available' : 'unavailable'}`, async () => {
    const worlds = [
      { id: 'caves', name: 'Caves', role: 'caves' },
      { id: 'master', name: 'Z Prime', role: 'master' },
      { id: 'extra', name: 'Forest 2', role: 'custom' }
    ]
    const api = await modAPI({ topologyV2API: {
      worlds: async () => ({ items: worlds }),
      get: async () => {
        if (!topologyAvailable) throw new Error('topology unavailable')
        return { revision: 'r1', placements: [], targets: [] }
      }
    } })
    assert.deepEqual((await api.getRoomWorlds('room')).map(world => world.id), ['master', 'caves', 'extra'])
    assert.deepEqual(worlds.map(world => world.id), ['caves', 'master', 'extra'])
  })
}

test('consecutive shared saves reuse returned revisions without reloading configuration', async () => {
  const requests = []
  const emitted = []
  const options = await componentOptions('views/mods/ModConfigDialog.vue', { modApi: {
    saveModConfigurationForWorld: async input => {
      requests.push(input)
      return { result: { revisions: { master: `m${requests.length}`, caves: `c${requests.length}` } } }
    },
    getModConfig: () => assert.fail('save reloaded configuration'),
    getRoomTopology: () => assert.fail('save reloaded topology')
  } })
  const dialog = instance(options, {
    roomId: 'room', worldId: 'master', modId: '100', configurationScope: 'room',
    worldIds: ['master', 'caves'], expectedRevisions: { master: 'm0', caves: 'c0' },
    configWorldRevisions: { master: 'm0', caves: 'c0' }, configRevision: 'm0',
    modInfo: { configuration_options: [{ name: 'count', default: 1 }] },
    configForm: { count: 2 }, originalConfig: { count: 1 }, defaultConfig: { count: 1 },
    $emit: (event, value) => emitted.push({ event, value })
  })
  await dialog.saveConfig()
  dialog.configForm.count = 3
  await dialog.saveConfig()
  assert.deepEqual(requests.map(value => value.expectedRevisions), [
    { master: 'm0', caves: 'c0' }, { master: 'm1', caves: 'c1' }
  ])
  assert.deepEqual(dialog.originalConfig, { count: 3 })
  assert.equal(dialog.configRevision, 'm2')
  assert.equal(dialog.saving, false)
  assert.equal(emitted.length, 2)
})

test('a late configuration read cannot overwrite a newly opened editor', async () => {
  const response = deferred()
  const options = await componentOptions('views/mods/ModConfigDialog.vue', { modApi: {
    getModConfig: () => response.promise,
    getRoomTopology: () => assert.fail('topology revision already supplied')
  } })
  const dialog = instance(options, {
    modInfo: {}, roomId: 'room', worldId: 'master', modId: '100', expectedRevisions: {},
    expectedTopologyRevision: 'topology'
  })
  const pending = dialog.initializeConfig()
  dialog.resetComponentState()
  dialog.configForm = { newEditor: true }
  response.resolve({ modinfo: { configuration: { revision: 'old' } } })
  await pending
  assert.deepEqual(dialog.configForm, { newEditor: true })
  assert.equal(dialog.configRevision, '')
})

test('saving one Mod advances the whole world file revision and rejects late list responses', async () => {
  const response = deferred()
  const options = await componentOptions('views/mods/ModList.vue', { modApi: { getRoomModCatalog: () => response.promise } })
  const list = instance(options, {
    selectedRoomId: 'room', modsList: [{ modid: '100' }, { modid: '200' }], currentModInfo: { modid: '100' }
  })
  const pending = list.fetchModsList(true)
  list.handleConfigUpdated({ roomId: 'room', modId: '100', revisions: { master: 'new' } })
  response.resolve([{ modid: '100', worldRevisions: { master: 'old' } }])
  await pending
  assert.deepEqual(list.modsList.map(mod => mod.worldRevisions.master), ['new', 'new'])
  assert.equal(list.currentModInfo.worldRevisions.master, 'new')
})

function renderer() {
  return createRenderer({
    createElement: tag => ({ tag, children: [] }),
    createText: text => ({ text }), createComment: text => ({ text }),
    setText: (node, text) => { node.text = text },
    setElementText: (node, text) => { node.text = text }, patchProp() {},
    parentNode: node => node.parent,
    nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] || null,
    insert(node, parent, anchor = null) {
      if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
      const index = parent.children.indexOf(anchor)
      parent.children.splice(index < 0 ? parent.children.length : index, 0, node)
      node.parent = parent
    },
    remove(node) { if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1) }
  })
}

test('actual route key preserves initial Mod load and Caves configuration dialog', async () => {
  const layout = parseSFC(await source('layouts/MainLayoutV2.vue')).descriptor.template.content
  function findRouterView(node) {
    if (node.tag === 'RouterView') return node
    return node.children?.map(findRouterView).find(Boolean)
  }
  const keyExpression = findRouterView(baseParse(layout)).props.find(prop => prop.arg?.content === 'key').exp.content
  const routeKey = new Function('route', 'managementScopeRevision', `return ${keyExpression}`)
  const calls = []
  const worlds = [{ id: 'master', isMaster: true }, { id: 'caves' }]
  let current
  const options = await componentOptions('views/mods/ModList.vue', { modApi: {
    getContext: async () => { calls.push('context'); return { rooms: [{ id: 'room' }], room: { id: 'room' }, worlds } },
    getRoomModCatalog: async () => { calls.push('catalog'); return [] },
    getModUpdateOverview: async () => ({})
  } })
  const router = createRouter({ history: createMemoryHistory(), routes: [{
    path: '/mods', component: { ...options, render() { current = this; return h('div') } }
  }] })
  await router.push('/mods?tab=room')
  const app = renderer().createApp({ setup() {
    const route = useRoute()
    return () => h(RouterView, { key: routeKey(route, 0) })
  } })
  app.config.globalProperties.$t = key => key
  app.use(router)
  app.mount({ children: [] })
  try {
    await settle()
    assert.deepEqual(calls, ['context', 'catalog'])
    const original = current
    current.openConfigDialog({ modid: '100' }, worlds[1])
    await settle()
    assert.equal(current, original)
    assert.equal(router.currentRoute.value.query.worldId, 'caves')
    assert.equal(current.configDialogVisible, true)
    assert.equal(current.configScope, 'world')
    assert.deepEqual(calls, ['context', 'catalog'])
  } finally {
    app.unmount()
  }
})
