import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { runInNewContext } from 'node:vm'

const source = await readFile(new URL('../src/views/servers/ServerWorkspace.vue', import.meta.url), 'utf8')

function methodSource(name, next) {
  const start = source.indexOf(`    async ${name}(`)
  const end = source.indexOf(`    async ${next}(`, start)
  assert.ok(start >= 0 && end > start)
  return source.slice(start, end)
}

function workspace(playerApi) {
  const methods = runInNewContext(`({
    ${methodSource('reloadPlayerStats', 'refreshPlayerStats')}
    ${methodSource('collectPlayerState', 'refreshPlayerAfterAction')}
  })`, { playerApi })
  const view = {
    selectedRoom: { id: 'room', name: '666777' },
    selectedRoomId: 'room',
    contextSequence: 0,
    contextErrors: { players: null },
    playerSnapshotStale: false,
    playerStats: { items: [{ user_id: 'KU_OTHER', status: 'online', health: 150 }] },
    playerControlWorld: () => ({ id: 'master', name: 'Master' }),
    playerScopeWorldIds: () => [],
    errorState: (key, error) => ({ key, message: error.message }),
    $t: key => key
  }
  for (const [name, method] of Object.entries(methods)) view[name] = method.bind(view)
  return view
}

const target = { room_id: 'room', user_id: 'KU_TARGET' }

for (const stage of ['collection', 'list']) {
  test(`a player's failed ${stage} refresh preserves other players' state`, async () => {
    const failure = new Error(`${stage} timed out`)
    let listRequests = 0
    const view = workspace({
      updatePlayerInfo: async () => { if (stage === 'collection') throw failure },
      getPlayerStats: async () => { listRequests += 1; throw failure }
    })
    const previous = view.playerStats
    await assert.rejects(view.collectPlayerState(target), error => error === failure)
    assert.equal(view.playerStats, previous)
    assert.equal(view.playerSnapshotStale, false)
    assert.equal(view.contextErrors.players, null)
    assert.equal(listRequests, stage === 'list' ? 1 : 0)
  })
}

test('successful action refresh displays the server-provided freshness', async () => {
  const updated = { items: [{ user_id: 'KU_OTHER', status: 'stale', health: 150 }] }
  const view = workspace({
    updatePlayerInfo: async () => {},
    getPlayerStats: async () => ({ data: updated })
  })
  await view.collectPlayerState(target)
  assert.equal(view.playerStats, updated)
  assert.equal(view.playerStats.items[0].status, 'stale')
})

test('action refresh finishing after a room switch leaves the new room alone', async () => {
  let finishCollection
  const view = workspace({
    updatePlayerInfo: () => new Promise(resolve => { finishCollection = resolve }),
    getPlayerStats: async () => { assert.fail('must not reload the newly selected room') }
  })
  const pending = view.collectPlayerState(target)
  view.selectedRoomId = 'another-room'
  const current = view.playerStats = { items: [] }
  finishCollection()
  await pending
  assert.equal(view.playerStats, current)
  assert.equal(view.playerSnapshotStale, false)
})

test('a failed full list refresh still reports its error and retained snapshot', async () => {
  const failure = new Error('list unavailable')
  const view = workspace({ getPlayerStats: async () => { throw failure } })
  const previous = view.playerStats
  await assert.rejects(view.reloadPlayerStats({ preserveExisting: true }), error => error === failure)
  assert.equal(view.playerStats, previous)
  assert.equal(view.playerSnapshotStale, true)
  assert.equal(view.contextErrors.players.message, failure.message)
})
