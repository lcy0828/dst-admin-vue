import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { runInNewContext } from 'node:vm'

import {
  evaluateFleetDisclosure,
  FLEET_DISCLOSURE_STORAGE_KEY,
  hasFleetDeepLink,
  isControllerOnlyDeployment,
  isRemoteTarget
} from '../src/lib/fleetDisclosure.mjs'

test('single all-in-one host keeps fleet controls collapsed even when controllerEnabled is true', () => {
  const result = evaluateFleetDisclosure({
    targets: [{ id: 'local', kind: 'local', name: 'Local', configured: true, online: true }],
    targetsLoaded: true,
    capabilities: { deployment: { packaging: 'all_in_one', role: 'all_in_one', controllerEnabled: true, localExecutorEnabled: true } },
    route: { path: '/dashboard', query: {} }
  })

  assert.equal(result.ready, true)
  assert.equal(result.mode, 'single')
  assert.equal(result.distributedEnabled, false)
  assert.equal(result.showFleetControls, false)
})

test('multi-target, remote agent, or controller-only deployment expands fleet mode', () => {
  const multiAllInOne = evaluateFleetDisclosure({
    targets: [
      { id: 'local', kind: 'local', name: 'Local' },
      { id: 'agent:node-2', kind: 'agent', agentId: 'node-2', name: 'Node 2' }
    ],
    targetsLoaded: true
  })
  assert.equal(multiAllInOne.mode, 'fleet')
  assert.equal(multiAllInOne.showFleetControls, true)

  const singleRemoteAgent = evaluateFleetDisclosure({
    targets: [{ id: 'agent:node-1', kind: 'agent', agentId: 'node-1', name: 'Node 1' }],
    targetsLoaded: true
  })
  assert.equal(isRemoteTarget({ id: 'agent:node-1', kind: 'agent' }), true)
  assert.equal(singleRemoteAgent.hasRemoteTargets, true)
  assert.equal(singleRemoteAgent.mode, 'fleet')

  const controllerOnly = evaluateFleetDisclosure({
    targets: [],
    targetsLoaded: false,
    capabilities: { deployment: { packaging: 'control_plane', role: 'controller_only', localExecutorEnabled: false } }
  })
  assert.equal(isControllerOnlyDeployment({ deployment: { localExecutorEnabled: false } }), true)
  assert.equal(controllerOnly.ready, true)
  assert.equal(controllerOnly.mode, 'fleet')
  assert.equal(controllerOnly.showFleetControls, true)
})

test('deep links temporarily expand fleet controls without forcing targetId=local into fleet mode', () => {
  assert.equal(hasFleetDeepLink({ path: '/dashboard', query: { targetId: 'local' } }), false)
  assert.equal(hasFleetDeepLink({ path: '/dashboard', query: { targetId: 'agent:node-2' } }), true)
  assert.equal(hasFleetDeepLink({ path: '/rooms/settings', query: { id: 'room1', deployment: 'edit' } }), true)
  assert.equal(hasFleetDeepLink({ path: '/agents/list', query: {} }), true)
  assert.equal(hasFleetDeepLink({ path: '/rooms/topology', query: {} }), true)

  const localQueryResult = evaluateFleetDisclosure({
    targets: [{ id: 'local', kind: 'local' }],
    targetsLoaded: true,
    route: { path: '/rooms/list', query: { targetId: 'local' } }
  })
  assert.equal(localQueryResult.showFleetControls, false)

  const agentsPageResult = evaluateFleetDisclosure({
    targets: [{ id: 'local', kind: 'local' }],
    targetsLoaded: true,
    route: { path: '/agents/list', query: {} }
  })
  assert.equal(agentsPageResult.mode, 'single')
  assert.equal(agentsPageResult.deepLink, true)
  assert.equal(agentsPageResult.showFleetControls, true)
})

test('initial frame uses persisted mode before targets load and overrides when downgraded to single host', () => {
  const initialFleet = evaluateFleetDisclosure({
    targets: [],
    targetsLoaded: false,
    capabilities: null,
    storedMode: 'fleet'
  })
  assert.equal(initialFleet.ready, false)
  assert.equal(initialFleet.mode, 'fleet')
  assert.equal(initialFleet.showFleetControls, true)

  const downgradedSingle = evaluateFleetDisclosure({
    targets: [{ id: 'local', kind: 'local' }],
    targetsLoaded: true,
    storedMode: 'fleet'
  })
  assert.equal(downgradedSingle.ready, true)
  assert.equal(downgradedSingle.mode, 'single')
  assert.equal(downgradedSingle.showFleetControls, false)
})

test('fleet disclosure storage helpers handle unavailable localStorage gracefully', async () => {
  const source = (await readFile(new URL('../src/lib/fleetDisclosure.mjs', import.meta.url), 'utf8')).replace(/^export /gm, '')
  const map = new Map([[FLEET_DISCLOSURE_STORAGE_KEY, 'fleet']])
  const normal = runInNewContext(`${source}; ({ readStoredFleetMode, writeStoredFleetMode })`, {
    window: { localStorage: { getItem: key => map.get(key), setItem: (key, val) => map.set(key, val) } }
  })
  assert.equal(normal.readStoredFleetMode(), 'fleet')
  normal.writeStoredFleetMode('single')
  assert.equal(map.get(FLEET_DISCLOSURE_STORAGE_KEY), 'single')

  const throwing = runInNewContext(`${source}; ({ readStoredFleetMode, writeStoredFleetMode })`, {
    window: {
      localStorage: {
        getItem: () => { throw new Error('denied') },
        setItem: () => { throw new Error('quota') }
      }
    }
  })
  assert.equal(throwing.readStoredFleetMode(), 'single')
  assert.equal(throwing.writeStoredFleetMode('fleet'), 'fleet')
})
