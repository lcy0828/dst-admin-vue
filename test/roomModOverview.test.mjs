import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { buildRoomModOverview, retainRoomModPresentation, roomModAttentionCount, roomModPrepareCount, roomModStatusVariant, roomModOperationalStatus, roomModUpdateErrorKey, roomModFileStatusLabel } from '../src/lib/roomModOverview.mjs'

test('fact refresh retains Workshop presentation without retaining obsolete runtime state', () => {
  const old = [
    { id: '1', name: 'Known Mod', image: '/old.webp', currentVersion: '1', enabled: true, runtimeFileStatus: 'ready', runtimeOutdatedTargets: 1, updateAvailable: true },
    { id: '2', name: 'Removed Mod', image: '/removed.webp' }
  ]
  const fresh = [
    { id: '1', name: 'Workshop 1', image: '', currentVersion: '2', enabled: false, runtimeFileStatus: 'pending', runtimeOutdatedTargets: 0 },
    { id: '3', name: 'Workshop 3' }
  ]
  const rows = retainRoomModPresentation(fresh, old)
  assert.deepEqual(rows.map(row => row.id), ['1', '3'])
  assert.deepEqual(rows[0], { ...fresh[0], name: 'Known Mod', image: '/old.webp' })
  assert.equal(rows[0].updateAvailable, undefined)
  assert.deepEqual(rows[1], fresh[1])
  assert.equal(fresh[0].name, 'Workshop 1')
  assert.equal(old[0].currentVersion, '1')
  assert.deepEqual(retainRoomModPresentation([], old), [])
  assert.deepEqual(retainRoomModPresentation([{ modid: '1', name: 'Renamed Mod', image: '/new.webp' }], old), [
    { modid: '1', name: 'Renamed Mod', image: '/new.webp' }
  ])
})

test('missing local files are explained separately from mixed network and file errors', () => {
  const fileError = 'Workshop 1392778117 在 local/default 的版本未确认：invalid'
  assert.equal(roomModUpdateErrorKey({ errorCode: 'MOD_UPDATE_CHECK_FAILED', errorMessage: fileError }), 'mods.autoUpdate.errors.localFilesUnavailable')
  assert.equal(roomModUpdateErrorKey({ errorCode: 'MOD_UPDATE_CHECK_FAILED', errorMessage: `load Steam Workshop details: context deadline exceeded\n${fileError}` }), 'mods.autoUpdate.errors.checkTimeout')
  const mod = { enabled: true, runtimeFileStatus: 'pending', runtimeVersions: [
    { targetId: 'local', status: 'invalid' },
    { targetId: 'agent:42', status: 'missing' },
    { targetId: 'agent:43', status: 'current' }
  ] }
  assert.equal(roomModOperationalStatus(mod), 'corrupt')
  const label = roomModFileStatusLabel(mod, [{ id: 'agent:42', name: 'debian12' }], (key, args) => args ? `${key}:${args.machine}` : '本机')
  assert.equal(label, 'servers.workspace.mods.status.incomplete_on:本机 · servers.workspace.mods.status.missing_on:debian12')
  assert.equal(roomModFileStatusLabel({ runtimeVersions: [{ status: 'unknown', targetId: 'local' }] }, [], () => ''), '')
})

test('enabled, ready, pending, disabled, and failed Mods have distinct status colors', () => {
  assert.equal(roomModStatusVariant('enabled'), 'success')
  assert.equal(roomModStatusVariant('ready'), 'info')
  assert.equal(roomModStatusVariant('pending'), 'warning')
  assert.equal(roomModStatusVariant('corrupt'), 'destructive')
  assert.equal(roomModStatusVariant('unavailable'), 'destructive')
  assert.equal(roomModStatusVariant('disabled'), 'outline')
  assert.equal(new Set(['enabled', 'ready', 'pending', 'disabled', 'corrupt'].map(roomModStatusVariant)).size, 5)
})

test('update error summaries distinguish checking, downloading, and restarting', () => {
  assert.equal(roomModUpdateErrorKey(null), '')
  assert.equal(roomModUpdateErrorKey({ errorCode: 'MOD_UPDATE_CHECK_FAILED', errorMessage: 'context deadline exceeded' }), 'mods.autoUpdate.errors.checkTimeout')
  assert.equal(roomModUpdateErrorKey({ errorCode: 'MOD_UPDATE_CHECK_FAILED', errorMessage: 'Workshop 100 在 agent:node/native 的版本未确认：unavailable' }), 'mods.autoUpdate.errors.checkFailed')
  assert.equal(roomModUpdateErrorKey({ errorCode: 'MOD_RUNTIME_UPDATE_FAILED', errorMessage: 'SteamCMD download timeout' }), 'mods.autoUpdate.errors.downloadFailed')
  assert.equal(roomModUpdateErrorKey({ errorCode: 'MOD_WORLD_RESTART_FAILED', errorMessage: 'Caves startup timeout' }), 'mods.autoUpdate.errors.restartFailed')
  assert.equal(roomModUpdateErrorKey({ errorCode: 'PLAYER_PRESENCE_STALE', errorMessage: 'player telemetry is stale' }), 'mods.autoUpdate.errors.failed')
})

test('enabled labels follow configuration, independent of runtime load evidence', () => {
  for (const loaded of [true, false, undefined]) {
    assert.equal(roomModOperationalStatus({ configured: true, enabled: true, loaded, runtimeFileStatus: 'ready' }), 'enabled')
    assert.equal(roomModOperationalStatus({ configured: true, enabled: false, loaded, runtimeFileStatus: 'ready' }), 'disabled')
    assert.equal(roomModOperationalStatus({ configured: false, enabled: false, loaded, runtimeFileStatus: 'ready' }), 'ready')
  }
})

test('ready badges use a separate semantic color in both themes', async () => {
  const [badge, css] = await Promise.all([
    readFile(new URL('../src/components/ui/badge/index.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/assets/css/main.css', import.meta.url), 'utf8')
  ])
  assert.match(badge, /info:\s*"border-info\/25 bg-info\/10 text-info-foreground/)
  assert.match(css, /--color-info: var\(--info\)/)
  assert.match(css, /--color-info-foreground: var\(--info-foreground\)/)
  assert.equal((css.match(/--info:\s*#/g) || []).length, 2)
  assert.equal((css.match(/--info-foreground:\s*#/g) || []).length, 2)
})

test('room summary and Mod management use the same status colors', async () => {
  const [overview, management] = await Promise.all([
    readFile(new URL('../src/components/mods/RoomModOverview.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/views/mods/ModList.vue', import.meta.url), 'utf8')
  ])
  assert.match(overview, /roomModStatusVariant as statusVariant/)
  assert.match(overview, /:variant="statusVariant\(mod.status\)"/)
  assert.match(management, /return roomModStatusVariant\(this\.modOperationalStatus\(mod\)\)/)
})

test('room Mod overview reports operational facts independently from Workshop updates', () => {
  const rows = buildRoomModOverview([
    { id: '3', name: 'Loaded', configured: true, enabled: true, runtimeFileStatus: 'ready', loaded: true },
    { id: '2', name: 'Ready', configured: true, enabled: true, runtimeFileStatus: 'ready' },
    { id: '1', name: 'Update', configured: true, enabled: true, runtimeFileStatus: 'ready' },
    { id: '4', name: 'Disabled', health: 'disabled', configured: true, enabled: false }
  ], { state: { availableModIds: ['1', '5'] } })

  assert.deepEqual(rows.map(row => row.id), ['1', '4', '3', '2'])
  assert.equal(rows[0].status, 'enabled')
  assert.equal(rows[0].updateAvailable, true)
  assert.equal(rows.find(row => row.id === '2').status, 'enabled')
  assert.equal(rows.find(row => row.id === '3').status, 'enabled')
  assert.equal(roomModAttentionCount(rows), 0)
})

test('room Mod overview separates ready, pending, and unavailable runtime files', () => {
  const rows = buildRoomModOverview([
    { id: '1', name: 'Local ready', configured: true, enabled: true, runtimeFileStatus: 'ready' },
    { id: '2', name: 'Missing on machine', configured: true, enabled: true, runtimeFileStatus: 'pending', runtimePendingTargets: 1 },
    { id: '3', name: 'Offline machine', configured: true, enabled: true, runtimeFileStatus: 'unavailable', runtimeUnavailableTargets: 1, loaded: true }
  ])

  assert.equal(rows.find(row => row.id === '1').status, 'enabled')
  assert.equal(rows.find(row => row.id === '2').status, 'pending')
  assert.equal(rows.find(row => row.id === '3').status, 'unavailable')
  assert.equal(roomModPrepareCount(rows), 1)
  assert.equal(roomModAttentionCount(rows), 1)
})

test('room Mod overview treats an outdated runtime version as an available update', () => {
  const rows = buildRoomModOverview([{
    id: '1', name: 'Outdated', configured: true, enabled: true, runtimeFileStatus: 'ready',
    currentVersion: '1.9.6', latestVersion: '1.9.8', runtimeOutdatedTargets: 1
  }])

  assert.equal(rows[0].updateAvailable, true)
  assert.equal(rows[0].currentVersion, '1.9.6')
  assert.equal(rows[0].latestVersion, '1.9.8')
})

test('pending restart IDs cannot override confirmed versions on every machine', () => {
  const current = { id: '1', configured: true, enabled: true, runtimeFileStatus: 'ready', currentVersion: '2',
    runtimeTotalTargets: 2, runtimeCurrentTargets: 2, runtimeOutdatedTargets: 0 }
  // A failed restart also leaves these IDs in storage, although files are current.
  for (const status of ['prepared', 'activating', 'blocked']) {
    const overview = { state: { status, availableModIds: ['1'] } }
    assert.equal(buildRoomModOverview([current], overview)[0].updateAvailable, false)
    for (const other of ['outdated', 'unknown', 'missing', 'unavailable']) {
      const mixed = { ...current, runtimeCurrentTargets: 1, runtimeVersions: [{ status: 'current' }, { status: other }] }
      assert.equal(buildRoomModOverview([mixed], overview)[0].updateAvailable, true, other)
    }
    assert.equal(buildRoomModOverview([{ ...current, runtimeTotalTargets: 0, runtimeCurrentTargets: 0 }], overview)[0].updateAvailable, true)
  }
})

test('room Mod overview ignores publication and parser history as room health', () => {
  const rows = buildRoomModOverview([
    {
      id: '2', name: 'Old publication failed', configured: true, enabled: true,
      runtimeReplica: { targets: [{ errorMessage: 'publish failed', worlds: [] }] }
    },
    { id: '3', name: 'Parser fallback', configured: true, enabled: true, runtimeFileStatus: 'ready', health: 'parse_warning' },
    { id: '4', name: 'Corrupt', configured: true, enabled: true, runtimeFileStatus: 'corrupt' }
  ])

  assert.equal(rows.find(row => row.id === '2').status, 'unavailable')
  assert.equal(rows.find(row => row.id === '3').status, 'enabled')
  assert.equal(rows.find(row => row.id === '4').status, 'corrupt')
  assert.equal(roomModAttentionCount(rows), 2)
  assert.equal(roomModPrepareCount(rows), 0)
})

test('server workspace exposes Mod details and explicit restart flow', async () => {
  const [workspace, component, client, adapter, messages] = await Promise.all([
    readFile(new URL('../src/views/servers/ServerWorkspace.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/mods/RoomModOverview.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/api/v2.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/api/modApi.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/i18n/serverMessages.js', import.meta.url), 'utf8')
  ])

  assert.match(workspace, /<RoomModOverview[\s\S]*:room-id="roomModOverviewId"[\s\S]*@updated="handleModsUpdated"/)
  assert.match(component, /modApi\.getRoomModFacts\(\{ roomId \}\)/)
  assert.doesNotMatch(component, /runtimeReplica/)
  const factsStart = adapter.indexOf('async function getRoomModFacts')
  const factsEnd = adapter.indexOf('async function getModMetadata', factsStart)
  const factsAdapter = adapter.slice(factsStart, factsEnd)
  assert.match(factsAdapter, /modsV2API\.list\(roomId, \{ view: 'facts' \}\)/)
  assert.doesNotMatch(factsAdapter, /modPublicationsV2API|\.profile\(/)
  assert.match(adapter, /runtimeObserved: Boolean\(mod\.runtimeObserved\)/)
  assert.match(adapter, /runtimeFileStatus: mod\.runtimeFileStatus/)
  assert.match(adapter, /currentVersion: mod\.runtimeVersion/)
  assert.match(adapter, /latestVersion: mod\.latestVersion/)
  assert.match(component, /versions\.transition/)
  assert.match(component, /<ScrollArea class="room-mod-scroll">/)
  assert.match(component, /v-if="updateCount"[\s\S]*confirmApplyUpdates/)
  assert.match(component, /confirmRoomMaintenance\([\s\S]*applyModUpdatesNow/)
  assert.match(component, /jobStatus\?\.waitForJob \|\| waitForV2Job\)\(job, 20 \* 60 \* 1000\)[\s\S]*emit\('updated'\)/)
  assert.match(client, /`\/rooms\/\$\{encode\(roomId\)\}\/mod-update\/actions\/apply`/)
  assert.match(adapter, /async function applyModUpdatesNow\(roomId\)/)
  assert.match(messages, /updateAndRestart: '更新并重启'/)
  assert.match(messages, /updateAndRestart: 'Update and restart'/)
})
