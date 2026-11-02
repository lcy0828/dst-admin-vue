import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { babelParse, parse } from '@vue/compiler-sfc'
import { gameNotificationOutcome } from '../src/lib/gameNotificationResults.mjs'

const source = parse(await readFile(new URL('../src/views/Announcements.vue', import.meta.url), 'utf8')).descriptor.scriptSetup.content
const methods = babelParse(source, { sourceType: 'module' }).program.body
  .filter(node => node.type === 'FunctionDeclaration' && ['loadHistory', 'sendNotification'].includes(node.id.name))
  .map(node => source.slice(node.start, node.end)).join('\n')

function page({ send, wait, list } = {}) {
  const messages = []
  let sends = 0
  const state = Object.fromEntries(Object.entries({
    selectedRoomId: 'room-a', historyOffset: 0, historyLoading: false,
    notifications: [], notificationTotal: 0, message: 'Test announcement', messageError: '', sending: false
  }).map(([key, value]) => [key, { value }]))
  const functions = runInNewContext(`let historyLoadSequence = 0; ${methods}; ({ loadHistory, sendNotification })`, {
    ...state, messageLength: { get value() { return state.message.value.length } }, pageSize: 25,
    t: key => key,
    toast: Object.fromEntries(['success', 'info', 'warning', 'error'].map(level => [level, key => messages.push([level, key])])),
    gameNotificationOutcome,
    gameNotificationsV2API: {
      send: async input => { sends++; return send ? send(input) : { id: 'job-1' } },
      list: list || (async () => ({ items: [], total: 0 }))
    },
    waitForV2Job: wait || (async job => ({ ...job, status: 'succeeded' }))
  })
  return { ...state, ...functions, messages, sends: () => sends }
}

test('announcement wait or history failures preserve text, report uncertainty, and never resubmit', async () => {
  for (const options of [
    { wait: async () => { throw new Error('lost job response') } },
    { list: async () => { throw new Error('lost history response') } },
    { send: async () => { throw Object.assign(new Error('timeout'), { status: 0 }) } },
    { send: async () => { throw Object.assign(new Error('gateway timeout'), { status: 504 }) } }
  ]) {
    const view = page(options)
    await view.sendNotification()
    assert.equal(view.sends(), 1)
    assert.deepEqual(view.messages, [['warning', 'announcements.feedback.unconfirmed']])
    assert.equal(view.message.value, 'Test announcement')
    assert.equal(view.sending.value, false)
  }
})

test('announcement feedback follows matching history evidence instead of job success', async () => {
  for (const [record, level, key, clears] of [
    [{ jobId: 'job-1', outcome: 'confirmed' }, 'success', 'confirmed', true],
    [{ jobId: 'job-1', status: 'succeeded' }, 'info', 'sent', true],
    [{ jobId: 'job-1', outcome: 'unconfirmed' }, 'warning', 'unconfirmed', false],
    [{ jobId: 'job-1', outcome: 'failed' }, 'error', 'sendFailed', false],
    [{ jobId: 'unrelated-job', outcome: 'confirmed' }, 'warning', 'unconfirmed', false]
  ]) {
    const view = page({ list: async () => ({ items: [record], total: 1 }) })
    await view.sendNotification()
    assert.deepEqual(view.messages, [[level, `announcements.feedback.${key}`]])
    assert.equal(view.message.value === '', clears)
    assert.equal(view.sends(), 1)
  }
  const rejected = page({ send: async () => { throw Object.assign(new Error('forbidden'), { status: 403 }) } })
  await rejected.sendNotification()
  assert.deepEqual(rejected.messages, [['error', 'forbidden']])
})

test('late announcement history cannot overwrite a newly selected room', async () => {
  const reads = []
  const view = page({ list: roomId => new Promise(resolve => reads.push({ roomId, resolve })) })
  const older = view.loadHistory()
  view.selectedRoomId.value = 'room-b'
  const newer = view.loadHistory()
  reads[1].resolve({ items: [{ id: 'room-b-notice' }], total: 1 })
  await newer
  reads[0].resolve({ items: [{ id: 'room-a-notice' }], total: 99 })
  await older
  assert.equal(view.notifications.value[0].id, 'room-b-notice')
  assert.equal(view.notificationTotal.value, 1)
  assert.equal(view.historyLoading.value, false)
})

test('repeated clicks during an announcement submission cannot create another broadcast', async () => {
  let accept
  const view = page({ send: () => new Promise(resolve => { accept = resolve }) })
  const first = view.sendNotification()
  await view.sendNotification()
  assert.equal(view.sends(), 1)
  accept({ id: 'job-1' })
  await first
  assert.equal(view.sends(), 1)
})
