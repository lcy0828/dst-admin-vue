import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createOpenAPIClient } from '../src/api/openapiClient.mjs'

const manifest = JSON.parse(await readFile(new URL('../src/api/openapiOperations.json', import.meta.url), 'utf8'))
test('generated management client routes backup controls through the same OpenAPI operation as AI', async () => {
  let request
  const call = createOpenAPIClient({ request: async input => { request = input; return { effectiveEnabled: true } } }, manifest)
  const body = { enabled: true, keep: 7 }
  assert.deepEqual(await call('configureRoomBackupSchedule', { path: { roomId: 'room a' }, body }), { effectiveEnabled: true })
  assert.equal(request.url, '/rooms/room%20a/backup-schedules/actions/configure')
  assert.equal(request.method, 'POST')
  assert.equal(request.runtimeTarget, false)
  assert.deepEqual(request.data, body)
  assert.throws(() => call('configureRoomBackupSchedule', { path: { roomId: '../other' }, body }), /path parameter/)
  assert.throws(() => call('unknown'), /Unknown/)
})
test('OpenAPI client maps multipart upload and binary results without encoding bytes into JSON', async () => {
  let request
  const call = createOpenAPIClient({ request: async input => { request = input } }, manifest)
  const file = new Blob(['archive'])
  await call('uploadRoomBackup', { path: { roomId: 'a' }, body: { file, name: 'backup' } })
  assert.ok(request.data instanceof FormData)
  assert.equal(await request.data.get('file').text(), 'archive')
  await call('downloadBackup', { path: { backupId: 'a' } })
  assert.equal(request.responseType, 'blob')
  assert.equal(new Set(manifest.operations.map(item => item.operationId)).size, manifest.operations.length)
})
