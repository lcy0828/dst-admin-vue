import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  canStartWorld,
  canStopWorld,
  canRequestStopWorld,
  isWorldConsoleUnresponsive,
  worldLifecycleScope,
  worldPrimaryAction,
  worldStatusLabel,
  worldStatusVariant
} from '../src/lib/worldRuntimeStatus.mjs'
import { projectRoomList, roomRuntimeSummary } from '../src/lib/roomListPresentation.mjs'
import { projectFleetOverview, selectWorkspaceRoom } from '../src/lib/fleetOverview.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test('AlertDialogContent and FeedbackHost layer above DialogContent (z-50) to prevent dead confirm buttons', () => {
  const alertDialogSource = fs.readFileSync(
    path.join(__dirname, '../src/components/ui/alert-dialog/AlertDialogContent.vue'),
    'utf8'
  )
  const dialogSource = fs.readFileSync(
    path.join(__dirname, '../src/components/ui/dialog/DialogContent.vue'),
    'utf8'
  )
  const feedbackHostSource = fs.readFileSync(
    path.join(__dirname, '../src/components/FeedbackHost.vue'),
    'utf8'
  )

  assert.match(dialogSource, /\bz-50\b/, 'DialogContent should remain at z-50')
  assert.equal(/\bz-50\b/.test(alertDialogSource), false, 'AlertDialogContent must not use z-50')
  assert.equal((alertDialogSource.match(/z-\[60\]/g) || []).length >= 2, true, 'AlertDialogOverlay and AlertDialogContent must use z-[60]')
  assert.match(feedbackHostSource, /overlay-class="z-\[60\]"/, 'FeedbackHost DialogContent must elevate overlay to z-[60]')
})

test('distinguishes stopped process from alive-but-unresponsive or barrier-failed shard', () => {
  const stoppedWorld = {
    id: 'Master',
    role: 'master',
    status: 'stopped',
    sessionExists: false,
    placement: { running: true }
  }
  assert.equal(isWorldConsoleUnresponsive(stoppedWorld), false)
  assert.equal(worldStatusLabel(stoppedWorld), '已停止')
  assert.equal(worldStatusVariant(stoppedWorld), 'outline')
  assert.equal(canStartWorld(stoppedWorld), true)
  assert.equal(canStopWorld(stoppedWorld), false)

  const aliveButStoppedWorld = {
    id: 'Master',
    role: 'master',
    status: 'stopped',
    sessionExists: true,
    paused: true
  }
  assert.equal(isWorldConsoleUnresponsive(aliveButStoppedWorld), true)
  assert.equal(worldStatusLabel(aliveButStoppedWorld), '进程在线 · 无响应')
  assert.equal(worldStatusVariant(aliveButStoppedWorld), 'destructive')
  assert.equal(canStartWorld(aliveButStoppedWorld), false)
  assert.equal(canStopWorld(aliveButStoppedWorld), true)
  assert.equal(canRequestStopWorld(aliveButStoppedWorld), true)
  assert.equal(worldPrimaryAction(aliveButStoppedWorld).kind, 'stop')

  const barrierFailedWorld = {
    id: 'Caves',
    role: 'caves',
    status: 'running',
    paused: true,
    statusCode: 'SNAPSHOT_BARRIER_FAILED'
  }
  assert.equal(isWorldConsoleUnresponsive(barrierFailedWorld), true)
  assert.equal(worldStatusLabel(barrierFailedWorld), '进程在线 · 无响应')
  assert.equal(worldStatusVariant(barrierFailedWorld), 'destructive')

  const restartScope = worldLifecycleScope([aliveButStoppedWorld, barrierFailedWorld], barrierFailedWorld, 'restart')
  assert.equal(restartScope.allowed, true)
  assert.deepEqual(restartScope.worlds.map(w => w.id), ['Master', 'Caves'])
})

test('room and fleet overview never report a room with unresponsive shards as stopped', () => {
  const overviewPayload = {
    rooms: [
      {
        roomId: 'room-1',
        name: '饥荒联机版',
        controlAvailable: true,
        worlds: [
          { id: 'Master', name: 'Master', role: 'master', status: 'stopped', sessionExists: true, paused: true, controlAvailable: true, placement: { running: true } },
          { id: 'Caves', name: 'Caves', role: 'caves', status: 'stopped', sessionExists: true, paused: true, statusCode: 'SNAPSHOT_BARRIER_FAILED', controlAvailable: true, placement: { running: true } }
        ]
      }
    ]
  }

  const rooms = projectRoomList(overviewPayload, '')
  assert.equal(rooms.length, 1)
  const summary = roomRuntimeSummary(rooms[0])
  assert.equal(summary.state, 'attention')
  assert.equal(summary.attention, 2)

  const fleet = projectFleetOverview(overviewPayload, '')
  assert.equal(fleet.rooms[0].isRunning, true)
  assert.equal(fleet.summary.stopped, 0)
  assert.equal(fleet.summary.attention, 2)

  const selected = selectWorkspaceRoom(overviewPayload.rooms, '')
  assert.equal(selected?.roomId, 'room-1')
})
