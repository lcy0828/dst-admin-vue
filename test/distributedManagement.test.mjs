import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { distributedMessages } from '../src/i18n/distributedMessages.js'
import { createRuntimeEventStreamManager, runtimeStreamOverall } from '../src/lib/runtimeEventStreams.mjs'
import { BACKEND_CAPABILITIES } from '../src/lib/legacySupport.mjs'

const root = new URL('../', import.meta.url)
const source = path => readFile(new URL(path, root), 'utf8')

function messageKeys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return child && typeof child === 'object' && !Array.isArray(child)
      ? messageKeys(child, path)
      : [path]
  }).sort()
}

test('distributed management locale catalogs expose matching keys', () => {
  assert.deepEqual(
    messageKeys(distributedMessages['zh-CN']),
    messageKeys(distributedMessages['en-US'])
  )
})

test('control-plane APIs expose runtime observability, resources, migration, and backup sets', async () => {
  const api = await source('src/api/v2.js')
  assert.match(api, /\/runtime-infrastructure/)
  assert.match(api, /\/topology\/actions\/apply/)
  assert.match(api, /\/runtime\/overview/)
  assert.match(api, /\/runtime\/events\/stream/)
  assert.match(api, /\/backup-sets/)
  assert.match(api, /runtimeTarget: false/)
  assert.match(api, /controlPlaneList:[\s\S]*runtimeTarget:\s*false/)
})

test('experimental Kubernetes Provider APIs remain control-plane scoped and read-only', async () => {
  const api = await source('src/api/v2.js')
  const start = api.indexOf('export const kubernetesRuntimeV2API')
  const section = api.slice(start, api.indexOf('export const runtimeV2API', start))
  assert.ok(start >= 0)
  assert.match(section, /status:[\s\S]*\/runtime-providers\/kubernetes[\s\S]*runtimeTarget:\s*false/)
  assert.match(section, /observe:[\s\S]*\/shards\/observe[\s\S]*runtimeTarget:\s*false/)
  assert.match(section, /preflight:[\s\S]*\/shards\/preflight[\s\S]*runtimeTarget:\s*false/)
  assert.doesNotMatch(section, /\bapply\s*:/)
})

test('Kubernetes Provider state is visible in infrastructure and node views without mutation UI', async () => {
  const [panel, infrastructure, agents] = await Promise.all([
    source('src/components/runtime/KubernetesProviderPanel.vue'),
    source('src/components/runtime/RuntimeInfrastructurePanel.vue'),
    source('src/views/agents/AgentList.vue')
  ])
  assert.match(infrastructure, /<KubernetesProviderPanel/)
  assert.match(agents, /<KubernetesProviderPanel/)
  assert.match(panel, /kubernetesRuntimeV2API\.status/)
  assert.match(panel, /distributed\.kubernetes\.experimental/)
  assert.match(panel, /distributed\.kubernetes\.readOnly\.description/)
  assert.match(panel, /state\.features/)
  assert.match(panel, /state\.safetyGates/)
  assert.doesNotMatch(panel, /kubernetesRuntimeV2API\.(?:apply|start|stop)/)
})

test('advertised addresses are editable from player connection while machine management keeps advanced network settings', async () => {
  const [agents, topology, workspace] = await Promise.all([
    source('src/views/agents/AgentList.vue'),
    source('src/views/rooms/RoomTopology.vue'),
    source('src/views/servers/ServerWorkspace.vue')
  ])
  assert.match(agents, /<RuntimeInfrastructurePanel[\s\S]*network-only/)
  assert.match(workspace, /v-model="connectionAddressDraft"/)
  assert.match(workspace, /detectNetworkProfileEgress/)
  assert.match(workspace, /updateNetworkProfile/)
  assert.doesNotMatch(workspace, /openMachineConnections/)
  assert.doesNotMatch(topology, /<RuntimeOverviewPanel/)
  assert.match(topology, /:show-environment-overview="false"/)
})

test('runtime overview exposes stopped Shards as a neutral state', async () => {
  const panel = await source('src/components/runtime/RuntimeOverviewPanel.vue')
  assert.match(panel, /shard\.runtime\?\.state === 'stopped'/)
  assert.match(panel, /distributed\.diagnostics\.stoppedRuntime/)
  assert.match(panel, /distributed\.diagnostics\.stoppedDiagnostic/)
  assert.match(panel, /runningWorlds > 0 && !overview\.remoteExecutionReady/)
})

test('runtime overview delegates resumable streams to the shared manager', async () => {
  const panel = await source('src/components/runtime/RuntimeOverviewPanel.vue')
  assert.match(panel, /createRuntimeEventStreamManager/)
  assert.match(panel, /buildURL:\s*runtimeV2API\.eventStreamURL/)
  assert.match(panel, /streamManager\.sync/)
  assert.match(panel, /streamManager\.close/)
  assert.match(panel, /runtimeV2API\.overview/)
})

test('runtime stream manager persists cursors, resumes, and ignores reset or gap IDs', () => {
  const sources = []
  const scheduled = []
  const values = new Map()
  const storage = {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value)
  }
  const eventSourceFactory = (url, options) => {
    const listeners = new Map()
    const source = {
      url,
      options,
      closed: false,
      addEventListener: (name, listener) => listeners.set(name, listener),
      close() { this.closed = true },
      emit(name, lastEventId) { listeners.get(name)?.({ lastEventId }) }
    }
    sources.push(source)
    return source
  }
  const manager = createRuntimeEventStreamManager({
    buildURL: (roomId, worldId, cursor) => `/rooms/${roomId}/worlds/${worldId}?cursor=${cursor}`,
    eventSourceFactory,
    storage,
    schedule: (callback, delay) => {
      const task = { callback, delay, canceled: false }
      scheduled.push(task)
      return task
    },
    cancelSchedule: task => { task.canceled = true }
  })

  manager.sync('room-a', ['master'])
  assert.equal(sources[0].options.withCredentials, true)
  sources[0].emit('runtime.cursor', 'cursor-1')
  assert.equal(manager.snapshot().master.cursor, 'cursor-1')
  sources[0].emit('runtime.reset', 'reset-must-not-advance')
  sources[0].emit('runtime.gap', 'gap-must-not-advance')
  assert.equal(manager.snapshot().master.cursor, 'cursor-1')
  sources[0].emit('runtime.event', 'cursor-2')
  assert.equal(values.get('dst-admin:runtime-event-cursor:room-a:master'), 'cursor-2')

  sources[0].onerror()
  assert.equal(sources[0].closed, true)
  assert.equal(scheduled[0].delay, 2000)
  scheduled[0].callback()
  assert.equal(sources[1].url, '/rooms/room-a/worlds/master?cursor=cursor-2')
  manager.close()
})

test('runtime stream manager closes removed worlds and reports partial connectivity', () => {
  const sources = []
  const states = []
  const manager = createRuntimeEventStreamManager({
    buildURL: (roomId, worldId) => `/${roomId}/${worldId}`,
    eventSourceFactory: url => {
      const source = {
        url,
        closed: false,
        addEventListener() {},
        close() { this.closed = true }
      }
      sources.push(source)
      return source
    },
    storage: null,
    onState: state => states.push(state)
  })

  manager.sync('room-a', ['master', 'caves'])
  sources[0].onopen()
  assert.equal(states.at(-1).overall, 'partial')
  assert.deepEqual(states.at(-1).worlds, { master: 'live', caves: 'connecting' })
  manager.sync('room-a', ['master'])
  assert.equal(sources[1].closed, true)
  assert.deepEqual(Object.keys(manager.snapshot()), ['master'])
  assert.equal(runtimeStreamOverall(['live']), 'live')
  assert.equal(runtimeStreamOverall(['unavailable', 'connecting']), 'connecting')
  manager.close()
})

test('runtime stream manager suspends hidden pages and resumes every world', () => {
  const sources = []
  const manager = createRuntimeEventStreamManager({
    buildURL: (roomId, worldId) => `/${roomId}/${worldId}`,
    eventSourceFactory: url => {
      const source = {
        url,
        closed: false,
        addEventListener() {},
        close() { this.closed = true }
      }
      sources.push(source)
      return source
    },
    storage: null
  })

  manager.sync('room-a', ['master', 'caves'])
  manager.setActive(false)
  assert.equal(sources[0].closed, true)
  assert.equal(sources[1].closed, true)
  manager.setActive(true)
  assert.equal(sources.length, 4)
  assert.equal(sources[2].url, '/room-a/master')
  assert.equal(sources[3].url, '/room-a/caves')
  manager.close()
})

test('central diagnostics route and placement-aware APIs bypass the manual target', async () => {
  const [api, router, navigation, view] = await Promise.all([
    source('src/api/v2.js'),
    source('src/router/index.js'),
    source('src/v2/navigation.js'),
    source('src/views/rooms/RoomDiagnostics.vue')
  ])
  assert.match(router, /path:\s*'diagnostics'[\s\S]*name:\s*'RoomDiagnostics'/)
  assert.match(navigation, /to:\s*'\/rooms\/diagnostics'/)
  assert.match(api, /events:[\s\S]*runtimeTarget:\s*false/)
  assert.match(api, /latestDiagnostic:[\s\S]*runtimeTarget:\s*false/)
  assert.match(api, /captureDiagnostic:[\s\S]*runtimeTarget:\s*false/)
  assert.match(view, /<RuntimeOverviewPanel/)
  assert.match(view, /<RuntimeDiagnosticsPanel/)
  assert.match(view, /v-if="activeSection === 'events'"/)
  assert.match(view, /:unmount-on-hide="true"/)
  assert.match(view, /roomsV2API\.controlPlaneList/)
})

test('formal layout switches the active application page by management scope while keeping room placement local', async () => {
  const [layout, topology, editor] = await Promise.all([
    source('src/layouts/MainLayoutV2.vue'),
    source('src/views/rooms/RoomTopology.vue'),
    source('src/components/rooms/RoomPlacementCard.vue')
  ])
  assert.doesNotMatch(layout, /RuntimeTargetSelectV2|remoteContextBlocked|RUNTIME_TARGET_CHANGED_EVENT/)
  assert.doesNotMatch(layout, /setActiveRuntimeTarget|getActiveRuntimeTarget/)
  assert.match(layout, /<ManagementScopeSwitch/)
  assert.match(layout, /MANAGEMENT_SCOPE_CHANGED_EVENT/)
  assert.match(layout, /<RouterView :key="`\$\{\['\/mods', '\/dashboard'\]\.includes\(route\.path\) \? route\.path : route\.fullPath\}:\$\{route\.path === '\/dashboard' \? '' : managementScopeRevision\}`" \/>/)
  assert.match(topology, /<RoomPlacementCard/)
  assert.doesNotMatch(topology, /draftPlacements\[placement\.worldId\]/)
  assert.match(editor, /draft\.worldTargets\[String\(placement\.worldId\)\]/)
  assert.match(editor, /topologyV2API\.applyPlacement/)
})

test('distributed capability manifest and declarations cover the implemented contracts', async () => {
  assert.deepEqual(BACKEND_CAPABILITIES.distributedManagement, {
    runtimeOverview: true,
    resumableRuntimeEvents: true,
    placementMigration: true,
    networkProfiles: true,
    cpuAllocation: true,
    consistentBackupSets: true,
    placementAwareDiagnostics: true,
    experimentalKubernetesProvider: true
  })

  const declarations = await source('src/api/distributedManagement.d.ts')
  for (const contract of [
    'RuntimeOverview',
    'RuntimeOverviewShard',
    'RuntimeInfrastructure',
    'CPUInventory',
    'DistributedBackupSet',
    'DistributedBackupPart',
    'KubernetesRuntimeService',
    'KubernetesObservation',
    'KubernetesPreview'
  ]) {
    assert.match(declarations, new RegExp(`export interface ${contract}`))
  }
  assert.match(declarations, /logical_processors:\s*number/)
  assert.match(declarations, /logicalCpuIds:\s*number\[\]/)
  assert.match(declarations, /executionState:\s*'desired'\s*\|\s*'prepared'\s*\|\s*'applied'/)
  assert.match(declarations, /effective_cpu_ids:\s*number\[\]/)
})

test('topology exposes confirmed migration and typed resource forms', async () => {
  const [topology, editor, infrastructure] = await Promise.all([
    source('src/views/rooms/RoomTopology.vue'),
    source('src/components/rooms/RoomPlacementCard.vue'),
    source('src/components/runtime/RuntimeInfrastructurePanel.vue')
  ])
  assert.match(topology, /<RoomPlacementCard/)
  assert.match(editor, /topologyV2API\.applyPlacement/)
  assert.match(editor, /waitForV2Job/)
  assert.match(editor, /confirmation:\s*roomNameForConfirmation\.value/)
  assert.doesNotMatch(`${topology}\n${editor}`, /migrationConfirmation|migration-confirmation/)
  assert.match(infrastructure, /topologyV2API\.updateNetworkProfile/)
  assert.match(infrastructure, /topologyV2API\.updateCPUAllocation/)
  assert.match(infrastructure, /<FieldGroup>/)
  assert.match(infrastructure, /<ToggleGroup/)
  assert.match(infrastructure, /allowSmtSiblingRisk/)
  assert.doesNotMatch(infrastructure, /allowSMTSiblingRisk/)
  assert.match(infrastructure, /logical_processors/)
  assert.match(infrastructure, /executionState/)
  assert.match(infrastructure, /executionError/)
  assert.match(infrastructure, /effective_cpu_ids/)
  assert.match(infrastructure, /snapshot\.preflight\?\.conflicts/)
  assert.match(infrastructure, /conflict\.code/)
  assert.match(infrastructure, /conflict\.targetId/)
})

test('backup UI waits for coordinated create and restore jobs', async () => {
  const [page, panel] = await Promise.all([
    source('src/views/Backups.vue'),
    source('src/views/backups/DistributedBackupPanel.vue')
  ])
  assert.match(page, /<DistributedBackupPanel/)
  assert.match(panel, /backupSetsV2API\.create/)
  assert.match(panel, /backupSetsV2API\.restore/)
  assert.match(panel, /backupSetsV2API\.operations/)
  assert.match(panel, /backupSetsV2API\.recoverOperation/)
  assert.match(panel, /waitForV2Job/)
  assert.match(panel, /const confirmation = selectedSet\.value\.roomName/)
  assert.doesNotMatch(panel, /restoreConfirmation|distributed-backup-confirmation/)
  assert.match(panel, /roomsV2API\.controlPlaneList/)
  assert.match(panel, /recovery_required/)
  assert.match(panel, /protectionSetId/)
  assert.match(panel, /operationKindLabel/)
  assert.match(panel, /operationStateUnknown/)
})

test('backup UI blocks configuration-only archives and exposes save evidence', async () => {
  const [panel, declarations] = await Promise.all([
    source('src/views/backups/DistributedBackupPanel.vue'),
    source('src/api/distributedManagement.d.ts')
  ])

  assert.match(panel, /backupSet\.status !== 'verified' \|\| !backupSet\.restorable \|\| operationRunning/)
  assert.match(panel, /value\?\.contentKind === 'configuration-only'/)
  assert.match(panel, /part\.sessionId/)
  assert.match(panel, /part\.latestSnapshot/)
  assert.match(panel, /part\.hasShardIndex/)
  assert.match(declarations, /contentKind: 'game-save' \| 'configuration-only' \| 'unknown'/)
  assert.match(declarations, /restorable: boolean/)
  assert.match(declarations, /hasShardIndex: boolean/)
})
