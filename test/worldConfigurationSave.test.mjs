import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { babelParse, parse } from '@vue/compiler-sfc'
import { adapterError, adapterSuccess } from '../src/api/adapterProtocol.mjs'

const adapterSource = readFileSync(new URL('../src/api/v2ConfigurationAdapters.js', import.meta.url), 'utf8')
const adapterNodes = babelParse(adapterSource, { sourceType: 'module' }).program.body
const adapterDeclaration = adapterNodes
  .find(node => node.type === 'ExportNamedDeclaration' && node.declaration?.declarations?.[0]?.id.name === 'legacyWorldConfigurationApi')
const adapterObject = adapterDeclaration.declaration.declarations[0].init
const adapterHelpers = adapterNodes
  .filter(node => node.type === 'FunctionDeclaration' && ['integerValue', 'booleanValue'].includes(node.id.name))
  .map(node => adapterSource.slice(node.start, node.end)).join('\n')
const viewSource = parse(readFileSync(new URL('../src/views/worlds/WorldSettings.vue', import.meta.url), 'utf8')).descriptor.script.content
const viewObject = babelParse(viewSource, { sourceType: 'module' }).program.body.find(node => node.type === 'ExportDefaultDeclaration').declaration
const viewMethods = viewObject.properties.find(node => node.key.name === 'methods').value.properties
const saveMethod = viewMethods.find(node => node.key.name === 'saveSettings')
const loadMethod = viewMethods.find(node => node.key.name === 'loadWorldConfiguration')

function loadAdapter(type, failure) {
  const room = { id: 'room-1', name: '666777' }
  const world = { id: 'world-1', name: type === 'forest' ? 'Master' : 'Caves', type }
  const requests = []
  const calls = []
  const roomsAPI = {
    worlds: async () => { calls.push('worlds.list'); return { items: [world] } },
    createWorld: () => assert.fail('saving an existing world must not create a world'),
    deleteWorld: () => assert.fail('saving an existing world must not delete a world')
  }
  const configurationAPI = {
    world: async () => {
      calls.push('configuration.read')
      return { revision: 'latest-revision', server: { serverPort: 10999 } }
    },
    previewWorld: () => assert.fail('the apply endpoint already performs the preview'),
    applyWorld: async (roomId, worldId, request) => {
      calls.push('configuration.apply')
      requests.push({ roomId, worldId, request })
      if (failure) throw failure
      return { id: 'job-1', status: 'succeeded' }
    }
  }
  const adapter = runInNewContext(`"use strict"; ${adapterHelpers}; const legacyWorldConfigurationApi = ${adapterSource.slice(adapterObject.start, adapterObject.end)}; legacyWorldConfigurationApi`, {
    success: adapterSuccess,
    adapterError,
    resolveV2Room: async () => { calls.push('rooms.list'); return room },
    resolveV2World: async () => { calls.push('worlds.list'); return world },
    roomsV2API: roomsAPI,
    configurationV2API: configurationAPI,
    waitForV2Job: async job => { calls.push('jobs.wait'); return job }
  })
  return { adapter, room, world, requests, calls, roomsAPI, configurationAPI }
}

function loadSaveSettings(worldApi, type = 'forest') {
  const notifications = []
  const timings = []
  let clock = 0
  const methods = runInNewContext(`"use strict"; ({ ${viewSource.slice(saveMethod.start, saveMethod.end)}, ${viewSource.slice(loadMethod.start, loadMethod.end)} })`, {
    api: { worldApi },
    performance: { now: () => { clock += 100; return clock } },
    console: { info: (_label, value) => timings.push(value) },
    toast: {
      success: message => notifications.push({ status: 'success', message }),
      error: message => notifications.push({ status: 'error', message })
    }
  })
  const world = { id: 'world-1', name: type === 'forest' ? 'Master' : 'Caves', type }
  const patch = { wildfires: 'never', grassgekkos: 'never' }
  const state = {
    roomId: 'room-1',
    roomName: '666777',
    roomWorlds: [world],
    activeTab: world.name,
    worldConfigurationMeta: { [world.name]: { revision: 'editor-revision' } },
    configurationReadOnly: false,
    configurationLoadEpoch: 0,
    worldLoadErrors: {},
    loadedWorldConfigs: {},
    worldOriginalSettings: {},
    saveLoading: false,
    hasChanges: true,
    prepareChangedSettings: () => ({ [type]: patch }),
    configurationSaveError: error => error.message,
    $t: (key, values) => values?.error || key,
    $nextTick: async () => {},
    applyWorldOverrides: () => { state.hasChanges = false },
    loadWorldConfiguration: async () => {},
    buildCaches: () => {}
  }
  return { save: methods.saveSettings, load: methods.loadWorldConfiguration, state, notifications, patch, timings }
}

for (const type of ['forest', 'cave']) {
  test(`${type} configuration adapter works as a detached callback and preserves the editor revision`, async () => {
    const { adapter, world, requests, calls } = loadAdapter(type)
    const method = adapter[type === 'forest' ? 'forestWorld' : 'caveWorld']
    const overrides = { wildfires: 'never' }
    const result = await method({ savename: '666777', worldname: world.name, expectedRevision: 'editor-revision', overrides })
    assert.equal(result.status, 200)
    assert.equal(requests.length, 1)
    assert.equal(requests[0].request.expectedRevision, 'editor-revision')
    assert.equal(requests[0].request.overridePatch, overrides)
    assert.deepEqual(calls, ['rooms.list', 'worlds.list', 'configuration.read', 'configuration.apply', 'jobs.wait'])
  })

  test(`${type} save reports completion and releases its loading state`, async () => {
    const { adapter, requests } = loadAdapter(type)
    const { save, state, notifications, patch } = loadSaveSettings(adapter, type)
    await save.call(state)
    assert.equal(requests.length, 1)
    assert.equal(requests[0].request.overridePatch, patch)
    assert.equal(state.saveLoading, false)
    assert.equal(notifications[0]?.status, 'success')
  })

  test(`${type} editor save and reload use three business requests without listing rooms or worlds`, async () => {
    const { adapter, calls, requests } = loadAdapter(type)
    const { save, load, state, timings } = loadSaveSettings(adapter, type)
    state.loadWorldConfiguration = load
    await save.call(state)
    assert.deepEqual(calls, ['configuration.read', 'configuration.apply', 'jobs.wait', 'configuration.read'])
    assert.equal(requests[0].roomId, 'room-1')
    assert.equal(requests[0].worldId, 'world-1')
    assert.equal(requests[0].request.expectedRevision, 'editor-revision')
    assert.equal(state.worldConfigurationMeta[state.activeTab].revision, 'latest-revision')
    assert.equal(state.saveLoading, false)
    assert.equal(state.loadingServerIni, false)
    assert.equal(state.hasChanges, false)
    assert.equal(timings[0].totalMs, 200)
    assert.equal(timings[0].saveMs, 100)
    assert.equal(timings[0].reloadMs, 100)
  })
}

test('server.ini saves reuse known identifiers and retain the editor revision', async () => {
  const { adapter, calls, requests } = loadAdapter('forest')
  await adapter.saveServerIni({
    roomId: 'room-1', worldId: 'world-1', savename: '666777', worldname: 'Master',
    expectedRevision: 'editor-revision',
    config: {
      network: { server_port: 11001 },
      shard: { is_master: true, name: 'Master', id: 1 },
      account: { encode_user_path: true },
      steam: { master_server_port: 27017, authentication_port: 8767 }
    }
  })
  assert.deepEqual(calls, ['configuration.read', 'configuration.apply', 'jobs.wait'])
  assert.equal(requests[0].request.server.serverPort, 11001)
  assert.equal(requests[0].request.expectedRevision, 'editor-revision')
})

test('a no-change response from apply does not require a job', async () => {
  const { adapter, calls } = loadAdapter('forest', { code: 'NO_CONFIGURATION_CHANGES' })
  const result = await adapter.apply('666777', 'Master', {}, {}, 'editor-revision', {
    roomId: 'room-1', worldId: 'world-1'
  })
  assert.equal(result.status, 200)
  assert.deepEqual(calls, ['configuration.read', 'configuration.apply'])
})

test('a manual configuration change still rejects the old editor revision and preserves edits', async () => {
  const failure = Object.assign(new Error('changed on runtime'), { code: 'CONFIG_REVISION_CONFLICT' })
  const { adapter, calls, requests } = loadAdapter('forest', failure)
  const { save, state, notifications } = loadSaveSettings(adapter)
  await save.call(state)
  assert.deepEqual(calls, ['configuration.read', 'configuration.apply'])
  assert.equal(requests[0].request.expectedRevision, 'editor-revision')
  assert.equal(state.hasChanges, true)
  assert.equal(state.saveLoading, false)
  assert.equal(notifications[0]?.status, 'error')
})

test('a missing known world is not recreated or resolved by name', async () => {
  const { adapter, configurationAPI, calls } = loadAdapter('forest')
  const failure = new Error('world deleted')
  configurationAPI.world = async () => { calls.push('configuration.read'); throw failure }
  const { save, state, notifications } = loadSaveSettings(adapter)
  await save.call(state)
  assert.deepEqual(calls, ['configuration.read'])
  assert.equal(state.hasChanges, true)
  assert.equal(state.saveLoading, false)
  assert.equal(notifications[0]?.message, failure.message)
})

test('world creation still uses discovery once and rolls back if configuration fails', async () => {
  const failure = new Error('configuration failed')
  const { adapter, roomsAPI, calls, world } = loadAdapter('forest', failure)
  roomsAPI.worlds = async () => { calls.push('worlds.list'); return { items: [] } }
  roomsAPI.createWorld = async () => { calls.push('worlds.create'); return world }
  roomsAPI.deleteWorld = async () => { calls.push('worlds.delete') }
  await assert.rejects(adapter.forestWorld({
    savename: '666777', worldname: 'Master', overrides: { wildfires: 'never' }
  }), error => error === failure)
  assert.deepEqual(calls, ['rooms.list', 'worlds.list', 'worlds.create', 'configuration.read', 'configuration.apply', 'worlds.delete'])
})

test('a configuration reload failure is visible and releases both loading flags', async () => {
  const { adapter, configurationAPI } = loadAdapter('forest')
  const read = configurationAPI.world
  let reads = 0
  configurationAPI.world = async () => {
    if (++reads === 2) throw new Error('reload unavailable')
    return read()
  }
  const { save, load, state, notifications } = loadSaveSettings(adapter)
  state.loadWorldConfiguration = load
  await save.call(state)
  assert.equal(state.loadError, 'reload unavailable')
  assert.equal(state.saveLoading, false)
  assert.equal(state.loadingServerIni, false)
  assert.equal(state.hasChanges, true)
  assert.deepEqual(notifications.map(value => value.status), ['success', 'error'])
})

test('completing an old save does not reload a different selected room', async () => {
  let complete
  const { save, state } = loadSaveSettings({
    forestWorld: () => new Promise(resolve => { complete = resolve })
  })
  state.loadWorldConfiguration = () => assert.fail('the new room must not be reloaded by an old save')
  const pending = save.call(state)
  state.roomId = 'room-2'
  state.roomName = 'other room'
  complete({ status: 200 })
  await pending
  assert.equal(state.saveLoading, false)
})

test('the total save timing includes the final Vue update', async () => {
  const { adapter } = loadAdapter('forest')
  const { save, state, timings } = loadSaveSettings(adapter)
  let enterRender
  let finishRender
  const renderStarted = new Promise(resolve => { enterRender = resolve })
  const rendered = new Promise(resolve => { finishRender = resolve })
  state.$nextTick = () => {
    enterRender()
    return rendered
  }
  const pending = save.call(state)
  await renderStarted
  try {
    assert.equal(state.saveLoading, false)
    assert.equal(timings.length, 0)
  } finally {
    finishRender()
    await pending
  }
  assert.equal(timings.length, 1)
})

for (const stage of ['prepare', 'synchronous-api', 'rejected-api']) {
  test(`${stage} failure is shown and cannot leave the editor stuck saving`, async () => {
    const failure = new Error(`fixture ${stage} failure`)
    const worldApi = {
      forestWorld: () => {
        if (stage === 'rejected-api') return Promise.reject(failure)
        throw failure
      }
    }
    const { save, state, notifications, patch } = loadSaveSettings(worldApi)
    if (stage === 'prepare') state.prepareChangedSettings = () => { throw failure }
    await save.call(state)
    assert.equal(state.saveLoading, false)
    assert.equal(state.hasChanges, true)
    assert.equal(patch.wildfires, 'never')
    assert.equal(patch.grassgekkos, 'never')
    assert.deepEqual(notifications, [{ status: 'error', message: failure.message }])
  })
}

test('repeated clicks do not submit a second save while the first is pending', async () => {
  let complete
  let calls = 0
  const { save, state } = loadSaveSettings({
    forestWorld: () => {
      calls++
      return new Promise(resolve => { complete = resolve })
    }
  })
  const pending = save.call(state)
  try {
    await save.call(state)
    assert.equal(calls, 1)
    assert.equal(state.saveLoading, true)
  } finally {
    complete({ status: 200 })
    await pending
  }
  assert.equal(state.saveLoading, false)
})

test('temporary worlds retain their pending configuration without submitting a save', async () => {
  const { save, state, patch } = loadSaveSettings({ forestWorld: () => assert.fail('temporary world submitted') })
  state.roomWorlds[0].isTemp = true
  await save.call(state)
  assert.equal(state.saveLoading, false)
  assert.equal(state.addWorldDialogVisible, true)
  assert.equal(state.pendingWorldSettings.forest, patch)
})
