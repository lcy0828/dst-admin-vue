import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('runtime API exposes status, lifecycle, events, and diagnostics endpoints', async () => {
  const api = await source('src/api/v2.js')

  assert.match(api, /export const runtimeV2API/)
  assert.match(api, /\/runtime\/actions\/install/)
  assert.match(api, /\/runtime\/actions\/activate/)
  assert.match(api, /\/runtime\/actions\/reload/)
  assert.match(api, /\/runtime\/events/)
  assert.match(api, /\/runtime\/diagnostics\/latest/)
})

test('player and world state pages retain runtime management surfaces', async () => {
  const [players, worldState, statusPanel, diagnosticsPanel] = await Promise.all([
    source('src/views/players/PlayerList.vue'),
    source('src/views/worlds/WorldState.vue'),
    source('src/components/runtime/RuntimeStatusPanel.vue'),
    source('src/components/runtime/RuntimeDiagnosticsPanel.vue')
  ])

  assert.match(players, /<RuntimeStatusPanel/)
  assert.match(statusPanel, /runtimeV2API\.installWorld/)
  assert.match(statusPanel, /runtimeV2API\.activate/)
  assert.match(statusPanel, /runtimeV2API\.reload/)
  assert.match(statusPanel, /await loadStatus\(\)/)
  assert.match(worldState, /<RuntimeDiagnosticsPanel/)
  assert.match(diagnosticsPanel, /runtimeV2API\.events/)
  assert.match(diagnosticsPanel, /runtimeV2API\.captureDiagnostic/)
  assert.match(diagnosticsPanel, /RUNTIME_RESULT_NOT_FOUND/)
})
