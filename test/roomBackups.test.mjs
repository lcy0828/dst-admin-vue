import test from 'node:test'
import assert from 'node:assert/strict'
import { createRoomBackupsAPI } from '../src/lib/roomBackups.mjs'

test('room backup catalog keeps both formats and routes each action to its owner', async () => {
  const calls = []
  const old = { id: 'zip', name: 'backup', status: 'verified', createdAt: '2026-09-01T00:00:00Z' }
  const current = { id: 'set', name: 'backup', status: 'verified', restorable: false, createdAt: '2026-09-02T00:00:00Z' }
  const makeAPI = (source, item) => ({
    list: async room => { assert.equal(room, 'room'); return { items: [item] } },
    create: async (...args) => { calls.push([source, 'create', ...args]); return { id: 'job' } },
    restore: async (...args) => calls.push([source, 'restore', ...args]),
    delete: async (...args) => calls.push([source, 'delete', ...args]),
    downloadURL: id => `/${source}/${id}/download`
  })
  const api = createRoomBackupsAPI(makeAPI('legacy', old), makeAPI('sets', current))
  await api.create('room', 'new backup')
  const { items, total } = await api.list('room')
  assert.equal(total, 2)
  assert.deepEqual(items.map(item => item.id), ['set', 'zip'])
  assert.equal(items[0].restorable, false)
  assert.equal(items[1].restorable, true)
  for (const item of items) {
    await api.restore(item, 'room name')
    await api.delete(item)
  }
  assert.equal(api.downloadURL(items[0]), '/sets/set/download')
  assert.equal(api.downloadURL(items[1]), '/legacy/zip/download')
  assert.deepEqual(calls, [
    ['sets', 'create', 'room', 'new backup', 'automatic'],
    ['sets', 'restore', 'set', 'room name'],
    ['sets', 'delete', 'set', 'backup'],
    ['legacy', 'restore', 'zip', 'room name'],
    ['legacy', 'delete', 'zip', 'backup']
  ])
})

test('room backup catalog surfaces partial failures instead of silently hiding backups', async () => {
  const api = createRoomBackupsAPI(
    { list: async () => ({ items: [] }) },
    { list: async () => { throw new Error('database unavailable') } }
  )
  await assert.rejects(api.list('room'), /database unavailable/)
})
