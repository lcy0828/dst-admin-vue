import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { runInNewContext } from 'node:vm'

const source = await readFile(new URL('../src/views/servers/ServerWorkspace.vue', import.meta.url), 'utf8')
const start = source.indexOf('    async executeRawCommand() {')
const end = source.indexOf('    openRoomSettings() {', start)
assert.ok(start >= 0 && end > start)
const methodSource = source.slice(start, end)

function workspace(executeRawCommand) {
  const messages = []
  const methods = runInNewContext(`({ ${methodSource} })`, {
    confirmAction: async () => {},
    commandApi: { executeRawCommand },
    toast: { success: message => messages.push(['success', message]), error: message => messages.push(['error', message]) }
  })
  const server = { session_name: 'room::master', room_name: 'Room', name: 'Master' }
  const view = {
    selectedConsoleServer: server,
    consoleServer: server.session_name,
    rawCommand: 'print("World:", TheWorld.prefab)',
    workspaceDisposed: false,
    commandResult: null,
    commandRuns: [],
    commandResultTarget: '',
    commandExecutionError: '',
    commandExecuting: false,
    $t: key => key
  }
  view.executeRawCommand = methods.executeRawCommand.bind(view)
  return { view, messages }
}

test('homepage console keeps the full command output and run identity', async () => {
  const run = { id: 'run-1', status: 'succeeded', output: { text: 'World: forest\nDay: 2\nSeason: autumn' } }
  const { view, messages } = workspace(async () => run)
  await view.executeRawCommand()
  assert.equal(view.commandResult, run)
  assert.equal(view.commandResult.output.text.split('\n').length, 3)
  assert.equal(view.commandResultTarget, 'room::master')
  assert.deepEqual(Array.from(view.commandRuns, item => item.id), ['run-1'])
  assert.equal(messages[0][0], 'success')
})

test('homepage console keeps output that preceded a failed command receipt', async () => {
  const run = { id: 'run-2', status: 'failed', output: { text: 'World: forest' }, errorMessage: 'Lua error' }
  const { view, messages } = workspace(async () => { throw Object.assign(new Error('Lua error'), { run }) })
  await view.executeRawCommand()
  assert.equal(view.commandResult, run)
  assert.equal(view.commandResult.output.text, 'World: forest')
  assert.equal(messages[0][0], 'error')
})

test('a late receipt does not appear under another world', async () => {
  let finish
  const { view, messages } = workspace(() => new Promise(resolve => { finish = resolve }))
  const pending = view.executeRawCommand()
  await new Promise(resolve => setImmediate(resolve))
  view.consoleServer = 'room::caves'
  finish({ id: 'run-3', status: 'succeeded', output: { text: 'Master' } })
  await pending
  assert.equal(view.commandResult, null)
  assert.deepEqual(view.commandRuns, [])
  assert.deepEqual(messages, [])
})
