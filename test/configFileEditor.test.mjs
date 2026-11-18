import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { babelParse } from '@vue/compiler-sfc'
import { adapterError, adapterSuccess } from '../src/api/adapterProtocol.mjs'
import { globalJobKindLabel, globalJobMessages } from '../src/i18n/globalJobMessages.js'
import {
  defaultModOverridesScope,
  extractConfigEditorError,
  findMatchingWorldForLocation,
  legacyIniFromServerConfig,
  resolveModOverridesWorldIds,
  serverConfigFromLegacyIni,
  summarizeModOverridesPreview
} from '../src/lib/configEditorSupport.mjs'

function readSource(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

test('serverConfigFromLegacyIni and legacyIniFromServerConfig preserve valid shard ID 0 and fallback -1', () => {
  const convertedZero = serverConfigFromLegacyIni({
    network: { server_port: '10999' },
    shard: { is_master: 'true', name: 'Master', id: 0 },
    account: { encode_user_path: true },
    steam: { master_server_port: 27016, authentication_port: '8766' }
  })
  assert.deepEqual(convertedZero, {
    serverPort: 10999,
    isMaster: true,
    shardName: 'Master',
    shardId: 0,
    encodeUserPath: true,
    masterServerPort: 27016,
    authenticationPort: 8766
  })

  assert.deepEqual(legacyIniFromServerConfig(convertedZero), {
    network: { server_port: 10999 },
    shard: { is_master: true, name: 'Master', id: 0 },
    account: { encode_user_path: true },
    steam: { master_server_port: 27016, authentication_port: 8766 }
  })

  const emptyShard = serverConfigFromLegacyIni({ shard: { id: '' } })
  assert.equal(emptyShard.shardId, -1)
})

test('extractConfigEditorError normalizes syntax locations, world location mismatches, and field validation errors', () => {
  const syntaxErr = extractConfigEditorError({
    code: 'INVALID_CONFIGURATION_SYNTAX',
    rawMessage: 'unexpected symbol near }',
    details: { file: 'leveldataoverride.lua', line: 14, column: 7 }
  })
  assert.equal(syntaxErr.isSyntaxError, true)
  assert.equal(syntaxErr.file, 'leveldataoverride.lua')
  assert.equal(syntaxErr.line, 14)
  assert.equal(syntaxErr.column, 7)
  assert.equal(syntaxErr.rawMessage, 'unexpected symbol near }')

  const mismatchErr = extractConfigEditorError({
    code: 'WORLD_LOCATION_MISMATCH',
    rawMessage: 'world location cave does not match forest',
    details: { file: 'leveldataoverride.lua', expected: 'forest', actual: 'cave' }
  })
  assert.equal(mismatchErr.isLocationMismatch, true)
  assert.equal(mismatchErr.expectedWorldType, 'forest')
  assert.equal(mismatchErr.actualWorldType, 'cave')

  const fieldErr = extractConfigEditorError({
    code: 'INVALID_CONFIGURATION',
    rawMessage: 'invalid configuration',
    details: {
      fields: {
        'server.serverPort': 'must be between 1 and 65535'
      }
    }
  })
  assert.equal(fieldErr.file, 'server.ini')
  assert.match(fieldErr.rawMessage, /server\.serverPort: must be between 1 and 65535/)

  const luaFieldErr = extractConfigEditorError({
    code: 'INVALID_CONFIGURATION',
    rawMessage: 'invalid lua overrides',
    details: {
      fields: {
        'leveldataoverride.overrides': 'invalid key'
      }
    }
  })
  assert.equal(luaFieldErr.file, 'leveldataoverride.lua')

  const conflictErr = extractConfigEditorError({ code: 'CONFIG_REVISION_CONFLICT', message: 'conflict' })
  assert.equal(conflictErr.isRevisionConflict, true)

  const topologyErr = extractConfigEditorError({ code: 'TOPOLOGY_CHANGED', message: 'topology changed' })
  assert.equal(topologyErr.isTopologyChanged, true)

  const sizeErr = extractConfigEditorError({ code: 'CONFIGURATION_FILE_TOO_LARGE', message: 'too large' })
  assert.equal(sizeErr.isTooLarge, true)
})

test('findMatchingWorldForLocation locates a sibling world with the pasted location type', () => {
  const worlds = [
    { id: 'w-master', name: 'Master', type: 'forest' },
    { id: 'w-caves', name: 'Caves', type: 'cave' }
  ]
  assert.deepEqual(findMatchingWorldForLocation(worlds, 'cave', 'Master'), worlds[1])
  assert.deepEqual(findMatchingWorldForLocation(worlds, 'forest', 'Caves'), worlds[0])
  assert.equal(findMatchingWorldForLocation([worlds[0]], 'cave', 'Master'), null)
  assert.equal(findMatchingWorldForLocation(worlds, 'forest', 'Master'), null)
})

test('modoverrides scope helpers and preview summary normalize Go operation payloads and prioritize download_and_save', () => {
  const multiWorlds = [{ id: 'w-1', name: 'Master' }, { id: 'w-2', name: 'Caves' }]
  assert.equal(defaultModOverridesScope(multiWorlds), 'room')
  assert.equal(defaultModOverridesScope([multiWorlds[0]]), 'world')
  assert.deepEqual(resolveModOverridesWorldIds('room', 'w-1', multiWorlds), ['w-1', 'w-2'])
  assert.deepEqual(resolveModOverridesWorldIds('world', 'w-2', multiWorlds), ['w-2'])

  const withMissing = summarizeModOverridesPreview({
    notices: ['stripped_klei_header', 'wrapped_bare_table'],
    changes: [
      { modId: '378160973', name: 'Global Positions', operation: 'added' },
      { modId: '1207269058', operation: 'options_changed' },
      { modId: '666155465', operation: 'enabled_changed' },
      { modId: '999999', operation: 'removed' }
    ],
    missingWorkshopIds: ['378160973'],
    missingLocalModIds: ['local-custom']
  })
  assert.equal(withMissing.added, 1)
  assert.equal(withMissing.optionsChanged, 1)
  assert.equal(withMissing.enabledChanged, 1)
  assert.equal(withMissing.removed, 1)
  assert.equal(withMissing.totalChanges, 4)
  assert.equal(withMissing.changes[0].action, 'added')
  assert.equal(withMissing.changes[1].action, 'options_changed')
  assert.equal(withMissing.missingWorkshopCount, 1)
  assert.equal(withMissing.missingLocalCount, 1)
  assert.equal(withMissing.primaryActionMode, 'download_and_save')
  assert.equal(withMissing.hasKleiHeaderNotice, true)
  assert.equal(withMissing.hasBareTableNotice, true)

  const allInstalled = summarizeModOverridesPreview({
    changes: [{ modId: '378160973', operation: 'enabled_changed' }],
    missingWorkshopIds: [],
    missingLocalModIds: []
  })
  assert.equal(allInstalled.enabledChanged, 1)
  assert.equal(allInstalled.primaryActionMode, 'save_only')
})

test('legacyWorldConfigurationApi wires world file load, preview, apply, and NO_CONFIGURATION_CHANGES cleanly', async () => {
  const adapterSource = readSource('../src/api/v2ConfigurationAdapters.js')
  const adapterNodes = babelParse(adapterSource, { sourceType: 'module' }).program.body
  const adapterDeclaration = adapterNodes
    .find(node => node.type === 'ExportNamedDeclaration' && node.declaration?.declarations?.[0]?.id.name === 'legacyWorldConfigurationApi')
  const adapterObject = adapterDeclaration.declaration.declarations[0].init
  const adapterHelpers = adapterNodes
    .filter(node => node.type === 'FunctionDeclaration' && ['integerValue', 'booleanValue'].includes(node.id.name))
    .map(node => adapterSource.slice(node.start, node.end))
    .join('\n')

  const calls = []
  let throwNoChanges = false
  const configurationV2API = {
    worldFiles: async (roomId, worldId) => {
      calls.push({ op: 'worldFiles', roomId, worldId })
      return {
        revision: 'rev-1',
        leveldataoverride: 'return { location = "forest" }\n',
        serverIni: '[SHARD]\nis_master = true\n'
      }
    },
    previewWorldFiles: async (roomId, worldId, request) => {
      calls.push({ op: 'previewWorldFiles', roomId, worldId, request })
      return {
        revision: 'rev-1',
        notices: ['stripped_klei_header'],
        leveldataoverride: 'return {\n  location = "forest",\n}\n',
        serverIni: '[SHARD]\nis_master = true\n',
        overrides: { wildfires: 'never' },
        server: { serverPort: 10999, isMaster: true, shardName: 'Master', shardId: 1 }
      }
    },
    applyWorldFiles: async (roomId, worldId, request) => {
      calls.push({ op: 'applyWorldFiles', roomId, worldId, request })
      if (throwNoChanges) {
        const err = new Error('no changes')
        err.code = 'NO_CONFIGURATION_CHANGES'
        throw err
      }
      return { id: 'job-world-files-1', status: 'running' }
    }
  }

  const adapter = runInNewContext(
    `"use strict"; ${adapterHelpers}; const legacyWorldConfigurationApi = ${adapterSource.slice(adapterObject.start, adapterObject.end)}; legacyWorldConfigurationApi`,
    {
      success: adapterSuccess,
      adapterError,
      resolveV2Room: async () => assert.fail('direct roomId should skip resolveV2Room'),
      resolveV2World: async () => assert.fail('direct worldId should skip resolveV2World'),
      roomsV2API: {},
      configurationV2API,
      waitForV2Job: async job => ({ ...job, status: 'succeeded' })
    }
  )

  const loaded = await adapter.getWorldFiles('Cluster_1', 'Master', { roomId: 'room-1', worldId: 'world-1' })
  assert.equal(loaded.status, 200)
  assert.equal(loaded.data.revision, 'rev-1')
  assert.equal(loaded.data.leveldataoverride, 'return { location = "forest" }\n')

  const previewed = await adapter.previewWorldFiles({
    roomId: 'room-1',
    worldId: 'world-1',
    expectedRevision: 'rev-1',
    leveldataoverride: 'KLEI     1 return { location = "forest" }',
    format: true,
    allowEmptyChanges: true
  })
  assert.equal(previewed.status, 200)
  assert.deepEqual(JSON.parse(JSON.stringify(calls[1].request)), {
    expectedRevision: 'rev-1',
    leveldataoverride: 'KLEI     1 return { location = "forest" }',
    format: true,
    allowEmptyChanges: true
  })

  const applied = await adapter.applyWorldFiles({
    roomId: 'room-1',
    worldId: 'world-1',
    expectedRevision: 'rev-1',
    leveldataoverride: 'return { location = "forest", overrides = { wildfires = "never" } }'
  })
  assert.equal(applied.status, 200)
  assert.equal(applied.data.status, 'succeeded')

  throwNoChanges = true
  const noop = await adapter.applyWorldFiles({
    roomId: 'room-1',
    worldId: 'world-1',
    expectedRevision: 'rev-1',
    serverIni: '[SHARD]\nis_master = true\n'
  })
  assert.equal(noop.status, 200)
  assert.equal(noop.data, null)
})

test('modApi previewModConfigFile and applyModConfigFile handle direct 200, async 202 Job, and NO_MOD_CHANGES', async () => {
  const modApiSource = readSource('../src/api/modApi.js')
  const nodes = babelParse(modApiSource, { sourceType: 'module' }).program.body
  const fnCode = ['previewModConfigFile', 'applyModConfigFile']
    .map(name => {
      const node = nodes.find(item => item.type === 'FunctionDeclaration' && item.id?.name === name)
      assert.ok(node, `missing function ${name}`)
      return modApiSource.slice(node.start, node.end)
    })
    .join('\n')

  let mode = 'direct'
  const apiCalls = []
  const modsV2API = {
    previewConfigurationFile: async (roomId, worldId, body) => {
      apiCalls.push({ op: 'preview', roomId, worldId, body })
      return { normalizedContent: 'return {}\n', changes: [], missingWorkshopIds: ['378160973'] }
    },
    applyConfigurationFile: async (roomId, worldId, body) => {
      apiCalls.push({ op: 'apply', roomId, worldId, body })
      if (mode === 'noop') {
        const err = new Error('no mod changes')
        err.code = 'NO_MOD_CHANGES'
        throw err
      }
      if (mode === 'job') {
        return { id: 'job-mod-cfg-1', kind: 'mod.configuration_file.apply', status: 'running', progress: 15 }
      }
      return { applied: true, revisions: { 'w-1': 'rev-2', 'w-2': 'rev-3' } }
    }
  }

  const fns = runInNewContext(
    `"use strict"; ${fnCode}; ({ previewModConfigFile, applyModConfigFile })`,
    {
      modsV2API,
      MOD_JOB_TIMEOUT: 60000,
      requireValue: (val, code) => {
        if (!val) throw adapterError(code)
        return val
      },
      waitForV2Job: async job => ({ ...job, status: 'succeeded', progress: 100 })
    }
  )

  const preview = await fns.previewModConfigFile({
    roomId: 'room-1',
    worldId: 'w-1',
    worldIds: ['w-1', 'w-2'],
    content: 'return {}',
    format: true
  })
  assert.deepEqual(preview.missingWorkshopIds, ['378160973'])
  assert.equal(apiCalls[0].body.format, true)
  assert.deepEqual(apiCalls[0].body.worldIds, ['w-1', 'w-2'])

  const direct = await fns.applyModConfigFile({
    roomId: 'room-1',
    worldId: 'w-1',
    worldIds: ['w-1', 'w-2'],
    content: 'return {}',
    expectedRevisions: { 'w-1': 'rev-1', 'w-2': 'rev-1' },
    downloadMissing: false
  })
  assert.equal(direct.mode, 'direct')
  assert.equal(direct.result.revisions['w-2'], 'rev-3')

  mode = 'job'
  const submittedJobs = []
  const progressSteps = []
  const tracked = await fns.applyModConfigFile({
    roomId: 'room-1',
    worldId: 'w-1',
    worldIds: ['w-1', 'w-2'],
    content: 'return { ["workshop-378160973"] = { enabled = true } }',
    downloadMissing: true,
    onSubmitted: job => submittedJobs.push(job.id),
    waitForJob: async (job, _timeout, onProgress) => {
      onProgress?.({ ...job, progress: 60 })
      return { ...job, status: 'succeeded', progress: 100 }
    },
    onProgress: job => progressSteps.push(job.progress)
  })
  assert.equal(tracked.mode, 'job')
  assert.deepEqual(submittedJobs, ['job-mod-cfg-1'])
  assert.deepEqual(progressSteps, [60])
  assert.equal(tracked.job.status, 'succeeded')

  mode = 'noop'
  const noop = await fns.applyModConfigFile({
    roomId: 'room-1',
    worldId: 'w-1',
    content: 'return {}'
  })
  assert.equal(noop.mode, 'noop')
})

test('CodeMirror stays isolated in a lazy chunk and editor views obey template i18n and non-blocking loading contracts', () => {
  const viteConfig = readSource('../vite.config.mjs')
  const worldSettings = readSource('../src/views/worlds/WorldSettings.vue')
  const modOverridesDialog = readSource('../src/views/mods/ModOverridesEditorDialog.vue')
  const modList = readSource('../src/views/mods/ModList.vue')
  const codeEditor = readSource('../src/components/editor/ConfigCodeEditor.vue')

  assert.match(viteConfig, /vendor-codemirror/)
  assert.match(worldSettings, /AsyncConfigCodeEditor/)
  assert.match(modOverridesDialog, /AsyncConfigCodeEditor/)
  assert.doesNotMatch(worldSettings, /@codemirror\//)
  assert.doesNotMatch(modOverridesDialog, /@codemirror\//)
  assert.doesNotMatch(modList, /@codemirror\//)

  assert.match(modList, /<ModOverridesEditorDialog/)
  assert.match(modList, /mods\.actions\.editConfigFile/)
  const openEditorStart = modList.indexOf('    openModConfigFileEditor(')
  const openEditorBlock = modList.slice(openEditorStart, modList.indexOf('    async handleModConfigFileApplied(', openEditorStart))
  assert.doesNotMatch(openEditorBlock, /this\.loading\s*=\s*true/)

  for (const sfc of [worldSettings, modOverridesDialog, codeEditor]) {
    const template = sfc.slice(0, sfc.indexOf('<script>'))
    assert.doesNotMatch(template, /[\u3400-\u9fff]/)
  }

  assert.ok(globalJobMessages['zh-CN'].globalJobs.kinds.modConfigurationFileApply)
  assert.ok(globalJobMessages['en-US'].globalJobs.kinds.modConfigurationFileApply)
  assert.equal(
    globalJobKindLabel('mod.configuration_file.apply', key => key.split('.').reduce((acc, part) => acc?.[part], globalJobMessages['zh-CN'])),
    globalJobMessages['zh-CN'].globalJobs.kinds.modConfigurationFileApply
  )
  assert.equal(
    globalJobKindLabel('mod.configuration_file.apply', key => key.split('.').reduce((acc, part) => acc?.[part], globalJobMessages['en-US'])),
    globalJobMessages['en-US'].globalJobs.kinds.modConfigurationFileApply
  )

  assert.match(worldSettings, /change\?\.path\s*\|\|\s*change\?\.field/)
  assert.match(worldSettings, /await this\.loadActiveWorldSourceFiles\(world\)/)
  assert.match(modOverridesDialog, /hasDivergentTargetRevisions/)
  assert.match(modOverridesDialog, /file\.worldRevisions/)
  assert.match(modOverridesDialog, /mergeMissingBaselineRevisions\(preview\)/)
  assert.doesNotMatch(modOverridesDialog, /this\.expectedRevisions\s*=\s*\{\s*\.\.\.preview\.worldRevisions\s*\}/)
})

test('ModOverridesEditorDialog preserves baseline revisions across previews and WorldSettings rolls back visual state when source reverts to baseline', async () => {
  const dialogSource = readSource('../src/views/mods/ModOverridesEditorDialog.vue')
  const dialogScript = dialogSource.slice(
    dialogSource.indexOf('<script>') + '<script>'.length,
    dialogSource.indexOf('</script>')
  )
  const dialogAst = babelParse(dialogScript, { sourceType: 'module' }).program.body
  const exportDefault = dialogAst.find(node => node.type === 'ExportDefaultDeclaration').declaration
  const methodsProp = exportDefault.properties.find(prop => prop.key?.name === 'methods')
  const extractMethod = name => {
    const methodNode = methodsProp.value.properties.find(prop => prop.key?.name === name)
    assert.ok(methodNode, `missing ModOverridesEditorDialog method ${name}`)
    return dialogScript.slice(methodNode.start, methodNode.end)
  }

  const previewCalls = []
  const dialogVm = runInNewContext(
    `"use strict"; ({
      ${extractMethod('buildScopedExpectedRevisions')},
      ${extractMethod('mergeMissingBaselineRevisions')},
      ${extractMethod('runPreview')},
      ${extractMethod('formatContent')}
    })`,
    {
      modApi: {
        previewModConfigFile: async payload => {
          previewCalls.push(payload)
          return {
            revision: 'rev-external-2',
            worldRevisions: { 'w-1': 'rev-external-2', 'w-2': 'rev-caves-external-2', 'w-3': 'rev-initial-3' },
            topologyRevision: 'topo-external-2',
            normalizedContent: 'return {\n}\n',
            notices: [],
            changes: []
          }
        }
      },
      extractConfigEditorError,
      toast: { success() {}, warning() {}, error() {} }
    }
  )

  const state = Object.assign(Object.create(dialogVm), {
    roomId: 'room-1',
    activeWorldId: 'w-1',
    targetWorldIds: ['w-1', 'w-2'],
    draftContent: 'return {}',
    expectedRevision: 'rev-baseline-1',
    expectedRevisions: { 'w-1': 'rev-baseline-1', 'w-2': 'rev-caves-1' },
    expectedTopologyRevision: 'topo-baseline-1',
    previewEpoch: 0,
    previewing: false,
    formatting: false,
    busy: false,
    previewData: null,
    editorError: null,
    clearTimers() {},
    $t: key => key
  })

  await state.runPreview({ normalizeIntoEditor: false })
  assert.equal(previewCalls[0].expectedRevision, 'rev-baseline-1')
  assert.deepEqual(JSON.parse(JSON.stringify(previewCalls[0].expectedRevisions)), {
    'w-1': 'rev-baseline-1',
    'w-2': 'rev-caves-1'
  })
  assert.equal(previewCalls[0].expectedTopologyRevision, 'topo-baseline-1')
  // Baseline revisions for w-1 and w-2 must NOT be overwritten by rev-external-2!
  assert.equal(state.expectedRevision, 'rev-baseline-1')
  assert.equal(state.expectedRevisions['w-1'], 'rev-baseline-1')
  assert.equal(state.expectedRevisions['w-2'], 'rev-caves-1')
  assert.equal(state.expectedRevisions['w-3'], 'rev-initial-3')
  assert.equal(state.expectedTopologyRevision, 'topo-baseline-1')

  await state.formatContent()
  assert.equal(previewCalls[1].format, true)
  assert.equal(previewCalls[1].expectedTopologyRevision, 'topo-baseline-1')
  assert.equal(state.expectedRevisions['w-1'], 'rev-baseline-1')

  // Verify WorldSettings handleEditorModeChange('visual') resets stale visual edits when source reverted to baseline
  const worldSource = readSource('../src/views/worlds/WorldSettings.vue')
  const worldScript = worldSource.slice(
    worldSource.indexOf('<script>') + '<script>'.length,
    worldSource.indexOf('</script>')
  )
  const worldAst = babelParse(worldScript, { sourceType: 'module' }).program.body
  const worldExport = worldAst.find(node => node.type === 'ExportDefaultDeclaration').declaration
  const worldMethods = worldExport.properties.find(prop => prop.key?.name === 'methods').value.properties
  const handleModeNode = worldMethods.find(prop => prop.key?.name === 'handleEditorModeChange')
  assert.ok(handleModeNode, 'missing handleEditorModeChange')

  const worldVm = runInNewContext(
    `"use strict"; ({ ${worldScript.slice(handleModeNode.start, handleModeNode.end)} })`,
    {
      api: { worldApi: { previewWorldFiles: async () => assert.fail('should not call preview when source has no changes') } },
      toast: { error() {} }
    }
  )

  let appliedBaseline = false
  let resetIniCalled = false
  const worldState = Object.assign(Object.create(worldVm), {
    editorMode: 'source',
    sourceModeSwitching: false,
    sourceFileTab: 'leveldataoverride',
    worldSectionTab: 'worldgen',
    currentWorld: { id: 'w-1', name: 'Master', type: 'forest' },
    hasSourceChanges: false,
    sourceFilesLoadedForCurrentWorld: true,
    hasChanges: true,
    serverIniChanged: true,
    sourceBackedSave: true,
    sourceSyncedOverrides: { autumn: 'longseason' },
    worldOriginalSettings: { Master: { WORLDGEN_GROUP: {} } },
    forestSettings: { WORLDGEN_GROUP: {} },
    serverIniOriginal: { network: { server_port: 10999 } },
    changedItemsCache: [{ key: 'autumn' }],
    sourceError: { code: 'ERR' },
    sourceNotices: ['stripped_klei_header'],
    sourcePreviewChanges: [{ path: 'overrides.autumn' }],
    applySettingsValues() { appliedBaseline = true },
    resetServerIni() { resetIniCalled = true },
    $t: key => key
  })

  await worldState.handleEditorModeChange('visual')
  assert.equal(worldState.editorMode, 'visual')
  assert.equal(appliedBaseline, true)
  assert.equal(resetIniCalled, true)
  assert.equal(worldState.hasChanges, false)
  assert.equal(worldState.sourceBackedSave, false)
  assert.equal(worldState.sourceSyncedOverrides, null)
  assert.deepEqual(JSON.parse(JSON.stringify(worldState.sourcePreviewChanges)), [])
})


