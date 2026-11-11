import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { noviceMessages } from '../src/i18n/noviceMessages.js'
import {
  applyNewRoomAutomationDefaults,
  buildModUpdatePolicyPayload,
  configureRoomGameAutoUpdate,
  gameAutoUpdateSchedulePreset,
  modUpdateModeFromPolicy,
  normalizeModUpdateDraft,
  summarizeFleetGameAutoUpdate,
  summarizeGameAutoUpdate,
  summarizeModAutoUpdate
} from '../src/lib/roomAutoUpdateSupport.mjs'
import {
  defaultSaveImportPlan,
  normalizeSaveImportPlan
} from '../src/lib/saveImportSupport.mjs'

test('mod auto-update helpers preserve notify mode and build unattended payloads accurately', () => {
  assert.equal(modUpdateModeFromPolicy({ autoCheck: false, autoPrepare: false, applyWhenEmpty: false }), 'manual')
  assert.equal(modUpdateModeFromPolicy({ autoCheck: true, autoPrepare: false, applyWhenEmpty: false }), 'notify')
  assert.equal(modUpdateModeFromPolicy({ autoCheck: true, autoPrepare: true, applyWhenEmpty: true }), 'auto')

  const notifyPolicy = {
    autoCheck: true,
    autoPrepare: false,
    applyWhenEmpty: false,
    checkIntervalMinutes: 30,
    emptyGraceSeconds: 60,
    gameAnnouncement: true
  }
  const notifyDraft = normalizeModUpdateDraft(notifyPolicy)
  assert.equal(notifyDraft.mode, 'notify')
  assert.equal(notifyDraft.checkIntervalMinutes, 30)
  assert.deepEqual(summarizeModAutoUpdate({ policy: notifyPolicy, state: {} }), {
    mode: 'notify',
    state: 'notify',
    statusKey: 'notify',
    enabled: false,
    variant: 'secondary',
    availableCount: 0,
    pendingCount: 0
  })

  const autoPayload = buildModUpdatePolicyPayload({
    ...notifyDraft,
    mode: 'auto'
  }, 'rev-1')
  assert.equal(autoPayload.autoCheck, true)
  assert.equal(autoPayload.autoPrepare, true)
  assert.equal(autoPayload.applyWhenEmpty, true)
  assert.equal(autoPayload.checkIntervalMinutes, 30)
  assert.equal(autoPayload.expectedRevision, 'rev-1')

  const manualPayload = buildModUpdatePolicyPayload({
    ...notifyDraft,
    mode: 'manual'
  }, 'rev-2')
  assert.equal(manualPayload.autoCheck, false)
  assert.equal(manualPayload.autoPrepare, false)
  assert.equal(manualPayload.applyWhenEmpty, false)
  assert.equal(manualPayload.expectedRevision, 'rev-2')
})

test('game auto-update summaries distinguish enabled, paused, custom, manual, and unknown states', () => {
  assert.equal(gameAutoUpdateSchedulePreset('*/15 * * * *'), 'every15')
  assert.equal(gameAutoUpdateSchedulePreset('*/30 * * * *'), 'every30')
  assert.equal(gameAutoUpdateSchedulePreset('0 * * * *'), 'hourly')
  assert.equal(gameAutoUpdateSchedulePreset('0 */6 * * *'), 'custom')

  const manualSummary = summarizeGameAutoUpdate([], [])
  assert.equal(manualSummary.state, 'manual')
  assert.equal(manualSummary.enabled, false)

  const enabledSummary = summarizeGameAutoUpdate([
    {
      id: 'task-1',
      action: 'game.update-empty',
      enabled: true,
      groupId: 'updates',
      schedule: '*/15 * * * *'
    }
  ], [
    { id: 'updates', enabled: true }
  ])
  assert.equal(enabledSummary.state, 'auto')
  assert.equal(enabledSummary.enabled, true)
  assert.equal(enabledSummary.preset, 'every15')

  const pausedByGroup = summarizeGameAutoUpdate([
    {
      id: 'task-1',
      action: 'game.update-empty',
      enabled: true,
      groupId: 'updates',
      schedule: '*/30 * * * *'
    }
  ], [
    { id: 'updates', enabled: false }
  ])
  assert.equal(pausedByGroup.state, 'groupPaused')
  assert.equal(pausedByGroup.enabled, false)
  assert.equal(pausedByGroup.preset, 'every30')

  assert.deepEqual(summarizeFleetGameAutoUpdate([]), {
    total: 0,
    enabled: 0,
    totalRooms: 0,
    enabledRooms: 0,
    pausedRooms: 0,
    state: 'noRooms',
    statusKey: 'noRooms',
    variant: 'outline'
  })
  assert.deepEqual(summarizeFleetGameAutoUpdate([], { readFailed: true }), {
    total: 0,
    enabled: 0,
    totalRooms: 0,
    enabledRooms: 0,
    pausedRooms: 0,
    state: 'unknown',
    statusKey: 'unknown',
    variant: 'outline'
  })
  assert.deepEqual(summarizeFleetGameAutoUpdate([{ state: 'unknown', enabled: false }]), {
    total: 1,
    enabled: 0,
    totalRooms: 1,
    enabledRooms: 0,
    pausedRooms: 0,
    state: 'unknown',
    statusKey: 'unknown',
    variant: 'outline'
  })
  assert.deepEqual(summarizeFleetGameAutoUpdate([enabledSummary]), {
    total: 1,
    enabled: 1,
    totalRooms: 1,
    enabledRooms: 1,
    pausedRooms: 0,
    state: 'allEnabled',
    statusKey: 'allEnabled',
    variant: 'success'
  })
  assert.deepEqual(summarizeFleetGameAutoUpdate([enabledSummary, manualSummary]), {
    total: 2,
    enabled: 1,
    totalRooms: 2,
    enabledRooms: 1,
    pausedRooms: 0,
    state: 'partialEnabled',
    statusKey: 'partialEnabled',
    variant: 'secondary'
  })
  assert.deepEqual(summarizeFleetGameAutoUpdate([pausedByGroup]), {
    total: 1,
    enabled: 0,
    totalRooms: 1,
    enabledRooms: 0,
    pausedRooms: 1,
    state: 'paused',
    statusKey: 'paused',
    variant: 'warning'
  })
})

test('configureRoomGameAutoUpdate and applyNewRoomAutomationDefaults configure room policies cleanly', async () => {
  const calls = []
  const automationApi = {
    async groups(roomId) {
      calls.push(['groups', roomId])
      return { items: [] }
    },
    async createGroup(roomId, payload) {
      calls.push(['createGroup', roomId, payload])
      return { id: 'group-1', ...payload }
    },
    async tasks(roomId) {
      calls.push(['tasks', roomId])
      return { items: [] }
    },
    async createTask(roomId, payload) {
      calls.push(['createTask', roomId, payload])
      return { id: 'task-created', ...payload }
    },
    async updateTask(roomId, taskId, payload) {
      calls.push(['updateTask', roomId, taskId, payload])
      return { id: taskId, ...payload }
    }
  }
  const modUpdatesApi = {
    async overview(roomId) {
      calls.push(['modOverview', roomId])
      return { policy: { revision: 'rev-initial' } }
    },
    async updatePolicy(roomId, payload) {
      calls.push(['updateModPolicy', roomId, payload])
    }
  }
  const backupsApi = {
    async schedules(roomId) {
      calls.push(['backupSchedules', roomId])
      return { items: [], defaults: { schedule: '0 4 * * *', timezone: 'Asia/Shanghai' } }
    },
    async configureSchedule(roomId, payload) {
      calls.push(['configureBackupSchedule', roomId, payload])
    }
  }

  const warnings = await applyNewRoomAutomationDefaults('room-alpha', {
    automaticBackup: true,
    automaticModUpdate: true,
    automaticGameUpdate: true,
    timezone: 'Asia/Shanghai',
    translator: key => key,
    backupsApi,
    modUpdatesApi,
    automationApi
  })

  assert.deepEqual(warnings, [])
  assert.equal(calls.some(([kind, roomId]) => kind === 'configureBackupSchedule' && roomId === 'room-alpha'), true)
  assert.equal(calls.some(([kind, roomId, payload]) => kind === 'updateModPolicy' && roomId === 'room-alpha' && payload.autoCheck === true && payload.autoPrepare === true && payload.applyWhenEmpty === true), true)
  assert.equal(calls.some(([kind, roomId, payload]) => kind === 'createTask' && roomId === 'room-alpha' && payload.action === 'game.update-empty' && payload.enabled === true), true)

  await configureRoomGameAutoUpdate('room-alpha', {
    enabled: false,
    preset: '',
    schedule: '0 */6 * * *',
    timezone: 'Asia/Shanghai',
    tasks: [{ id: 'task-existing', name: '游戏无人自动更新', action: 'game.update-empty', groupId: 'group-1', enabled: true, schedule: '0 */6 * * *' }],
    groups: [{ id: 'group-1', name: 'room-maintenance', enabled: true }],
    automationApi
  })
  assert.equal(calls.some(([kind, roomId, taskId, payload]) => kind === 'updateTask' && roomId === 'room-alpha' && taskId === 'task-existing' && payload.enabled === false && payload.schedule === '0 */6 * * *'), true)
})

test('save import plan enables unattended automation defaults for new and cloned rooms only', () => {
  const newPlan = defaultSaveImportPlan({ id: 'cand-1', directoryName: 'Cluster_1', name: 'Room 1' }, 'new')
  assert.equal(newPlan.automaticBackup, true)
  assert.equal(newPlan.automaticModUpdate, true)
  assert.equal(newPlan.automaticGameUpdate, true)

  const replacePlan = defaultSaveImportPlan({ id: 'cand-1', directoryName: 'Cluster_1', name: 'Room 1' }, 'replace')
  assert.equal(replacePlan.automaticBackup, false)
  assert.equal(replacePlan.automaticModUpdate, false)
  assert.equal(replacePlan.automaticGameUpdate, false)

  const normalizedReplace = normalizeSaveImportPlan({
    ...newPlan,
    mode: 'replace'
  }, { id: 'cand-1' })
  assert.equal(normalizedReplace.automaticBackup, false)
  assert.equal(normalizedReplace.automaticModUpdate, false)
  assert.equal(normalizedReplace.automaticGameUpdate, false)
})

test('UI templates wire valid novice i18n keys and guarded single ToggleGroup bindings', async () => {
  const [roomSettings, saveImports, maintenancePanel, modList, gameReleases] = await Promise.all([
    readFile(new URL('../src/views/rooms/RoomSettings.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/views/backups/SaveImportsPanel.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/RoomMaintenancePanel.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/views/mods/ModList.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/views/servers/GameReleases.vue', import.meta.url), 'utf8')
  ])

  for (const locale of ['zh-CN', 'en-US']) {
    for (const key of [
      'backupDefaultTitle',
      'backupDefault',
      'modAutoUpdateDefaultTitle',
      'modAutoUpdateDefault',
      'gameAutoUpdateDefaultTitle',
      'gameAutoUpdateDefault'
    ]) {
      assert.equal(typeof noviceMessages[locale].novice[key], 'string')
    }
  }

  assert.doesNotMatch(saveImports, /novice\.(backupDefault|modAutoUpdateDefault|gameAutoUpdateDefault)\.(title|description)/)
  assert.match(roomSettings, /novice\.modAutoUpdateDefaultTitle/)
  assert.match(saveImports, /novice\.modAutoUpdateDefaultTitle/)
  assert.doesNotMatch(maintenancePanel, /<ToggleGroup[^>]*v-model=/)
  assert.doesNotMatch(modList, /<ToggleGroup[^>]*v-model="modUpdateMode"/)
  assert.match(gameReleases, /entry\.preset === 'custom'/)
})
