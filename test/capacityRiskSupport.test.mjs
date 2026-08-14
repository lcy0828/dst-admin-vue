import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  CAPACITY_RISK_CONFIRMATION_REQUIRED,
  capacityRiskLimit,
  capacityRiskTargets,
  isCapacityRiskError,
} from '../src/lib/capacityRisk.mjs'
import { capacityRiskMessages } from '../src/i18n/capacityRiskMessages.js'

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('capacity risk helpers recognize structured previews and unknown limits', () => {
  const preview = { targets: [{ capacity: { recommendedShardLimit: 3 } }] }
  assert.equal(isCapacityRiskError({ code: CAPACITY_RISK_CONFIRMATION_REQUIRED, details: preview }), true)
  assert.equal(isCapacityRiskError({ code: CAPACITY_RISK_CONFIRMATION_REQUIRED }), false)
  assert.deepEqual(capacityRiskTargets(preview), preview.targets)
  assert.deepEqual(capacityRiskTargets(null), [])
  assert.equal(capacityRiskLimit(preview.targets[0]), 3)
  assert.equal(capacityRiskLimit({ capacity: { recommendedShardLimit: 0 } }), null)
})

test('capacity risk dialog is localized and uses the shared shadcn alert dialog', async () => {
  const [host, feedback, helper] = await Promise.all([
    source('src/components/FeedbackHost.vue'),
    source('src/lib/feedback.js'),
    source('src/lib/startCapacityRisk.js'),
  ])
  assert.deepEqual(Object.keys(capacityRiskMessages['zh-CN']).sort(), Object.keys(capacityRiskMessages['en-US']).sort())
  assert.doesNotMatch(JSON.stringify(capacityRiskMessages['en-US']), /[\p{Script=Han}]/u)
  assert.match(host, /<AlertDialog :open="isAlertDialogOpen"/)
  assert.match(host, /<Table>/)
  assert.match(host, /capacityRisk\.policyFallback/)
  assert.match(feedback, /requestFeedback\('capacity-risk'/)
  assert.match(helper, /allow_capacity_risk: allowCapacityRisk/)
  assert.match(helper, /isCapacityRiskCanceled/)
})

test('room action protocol sends explicit capacity confirmation and all start surfaces use it', async () => {
  const [api, adapter, ...surfaces] = await Promise.all([
    source('src/api/v2.js'),
    source('src/api/v2LegacyAdapters.js'),
    ...[
      'src/composables/useDashboardV2.js',
      'src/views/Dashboard.vue',
      'src/views/rooms/RoomList.vue',
      'src/views/servers/RoomMenu.vue',
      'src/views/servers/ServerList.vue',
      'src/views/servers/ServerWorkspace.vue',
      'src/views/worlds/WorldDetails.vue',
      'src/views/worlds/WorldList.vue',
    ].map(source),
  ])
  assert.match(api, /allowCapacityRisk === true \? \{ allowCapacityRisk: true \}/)
  assert.match(adapter, /allow_capacity_risk === true \|\| params\?\.allowCapacityRisk === true/)
  for (const surface of surfaces) {
    assert.match(surface, /startRoomWithCapacityRisk/)
    assert.doesNotMatch(surface, /roomApi\.startRoom/)
  }
})
