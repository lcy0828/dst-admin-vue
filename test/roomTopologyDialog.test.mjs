import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const dialogUrl = new URL('../src/components/rooms/RoomTopologyDialog.vue', import.meta.url)
const factsUrl = new URL('../src/components/rooms/RoomTopologyNodeFacts.vue', import.meta.url)
const workspaceUrl = new URL('../src/views/servers/ServerWorkspace.vue', import.meta.url)

test('room workspace exposes a compact topology dialog without another polling loop', async () => {
  const [dialog, facts, workspace] = await Promise.all([
    readFile(dialogUrl, 'utf8'),
    readFile(factsUrl, 'utf8'),
    readFile(workspaceUrl, 'utf8')
  ])

  assert.match(workspace, /<RoomTopologyDialog[\s\S]*:topology="roomTopology"[\s\S]*@refresh="refreshTopologyDialog"/)
  assert.match(workspace, /topologyV2API\.get\(roomId\)[\s\S]*topologyV2API\.infrastructure\(\)/)
  assert.match(dialog, /<Dialog v-model:open="open">/)
  assert.match(dialog, /<DialogTitle\b[^>]*>\{\{ t\('roomTopology\.title'\) \}\}<\/DialogTitle>/)
  assert.match(dialog, /view\.playerEntry\.endpoint/)
  assert.match(dialog, /v-for="node in view\.secondaries"/)
  assert.equal((dialog.match(/<section class="topology-map"/g) || []).length, 1)
  assert.match(dialog, /topology-master[\s\S]*v-for="node in view\.secondaries"/)
  assert.match(dialog, /view\.connectionIssues\.length/)
  assert.match(dialog, /view\.configurationNotices\.length/)
  assert.match(dialog, /view\.runtimeRisks\.length/)
  assert.doesNotMatch(facts, /roomTopology\.fields\.(installation|instanceId)/)
  assert.match(facts, /roomTopology\.fields\.shardId/)
  assert.match(facts, /v-if="node\.pending"/)
  assert.doesNotMatch(dialog, /setInterval|setTimeout|d3|echarts/)
})
