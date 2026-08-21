import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const source = path => readFile(new URL(path, root), 'utf8')

test('hot-consistent backups are the safe default and display barrier proof', async () => {
  const [api, panel, declarations, messages] = await Promise.all([
    source('src/api/v2.js'),
    source('src/views/backups/DistributedBackupPanel.vue'),
    source('src/api/distributedManagement.d.ts'),
    source('src/i18n/distributedMessages.js')
  ])

  assert.match(api, /create:\s*\(roomId, name = '', mode = 'hot-consistent'\)/)
  assert.match(api, /\{ \.\.\.\(name \? \{ name \} : \{\}\), mode \}/)
  assert.match(panel, /<ToggleGroup[\s\S]*value="hot-consistent"[\s\S]*value="cold-consistent"/)
  assert.match(panel, /const backupMode = ref\('hot-consistent'\)/)
  assert.match(panel, /function openCreateDialog\(\)[\s\S]*backupMode\.value = 'hot-consistent'/)
  assert.match(panel, /backupSetsV2API\.create\(selectedRoomId\.value, backupName\.value\.trim\(\), backupMode\.value\)/)
  assert.match(panel, /BACKUP_HOT_UNAVAILABLE/)
  assert.match(messages, /不停服备份（默认）/)
  assert.match(messages, /房间没有停服，请改选“停止后备份”后重试/)
  assert.match(panel, /barrierId/)
  assert.match(panel, /barrierSessionId/)
  assert.match(panel, /barrierInstanceId/)
  assert.match(panel, /snapshotBefore/)
  assert.match(panel, /snapshotAfter/)
  assert.match(declarations, /mode:\s*'cold-consistent'\s*\|\s*'hot-consistent'/)
})

test('room provisioning remains a control-plane workflow distinct from migration', async () => {
  const [api, topology, declarations, messages] = await Promise.all([
    source('src/api/v2.js'),
    source('src/views/rooms/RoomTopology.vue'),
    source('src/api/distributedManagement.d.ts'),
    source('src/i18n/topologyMessages.js')
  ])

  assert.match(api, /topology\/actions\/provision/)
  assert.match(api, /provision-operations/)
  assert.match(api, /recoverProvisionOperation/)
  assert.match(topology, /isLocalTarget\(placement\.appliedTargetId\)/)
  assert.match(topology, /placement\.state === 'shard_missing'/)
  assert.match(topology, /topologyV2API\.provision/)
  assert.match(topology, /topologyV2API\.recoverProvisionOperation/)
  assert.match(topology, /topologyV2API\.applyPlacement/)
  assert.match(topology, /provisionConfirmation\.value !== selectedRoom\.value\?\.name/)
  assert.match(topology, /'not_started', 'planned', 'uploading'/)
  assert.match(declarations, /export interface RoomProvisionOperation/)
  assert.match(declarations, /phase:\s*'not_started'\s*\|\s*'planned'/)
  assert.match(messages, /不提供任意路径写入、任意文件上传或远程 Shell/)
  assert.match(messages, /not_started: '尚未派发'/)
  assert.match(messages, /does not expose arbitrary path writes, arbitrary uploads, or a remote shell/)
})
