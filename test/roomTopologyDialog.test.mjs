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
  assert.match(dialog, /<DialogTitle>\{\{ t\('roomTopology\.title'\) \}\}<\/DialogTitle>/)
  assert.match(dialog, /view\.playerEntry\.endpoint/)
  assert.match(dialog, /v-for="node in view\.secondaries"/)
  assert.equal((dialog.match(/<section class="topology-map"/g) || []).length, 1)
  assert.match(dialog, /topology-entry-grid[\s\S]*topology-access-grid[\s\S]*topology-room/)
  assert.match(dialog, /topology-master[\s\S]*v-for="node in view\.secondaries"/)
  assert.match(dialog, /<ArrowLeft \/>[\s\S]*roomTopology\.routes\.toMaster/)
  assert.match(dialog, /grid-template-columns: minmax\(250px, 0\.9fr\) minmax\(0, 1\.35fr\)/)
  assert.match(dialog, /view\.connectionIssues\.length/)
  assert.match(dialog, /view\.configurationNotices\.length/)
  assert.match(dialog, /view\.runtimeRisks\.length/)
  assert.doesNotMatch(dialog, /topology-branch-trunk|topology-lane|roomTopology\.lanes\.(external|internal)/)
  assert.doesNotMatch(facts, /roomTopology\.fields\.(installation|instanceId)/)
  assert.match(facts, /roomTopology\.fields\.worldType/)
  assert.match(facts, /roomTopology\.fields\.shardId/)
  assert.match(facts, /v-if="node\.pending"/)
  assert.match(dialog, /@media \(max-width: 767px\)/)
  assert.match(dialog, /\.topology-route-title > svg \{[\s\S]*transform: rotate\(90deg\)/)
  assert.doesNotMatch(dialog, /setInterval|setTimeout|d3|echarts/)
})
