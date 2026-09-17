import assert from 'node:assert/strict'
import test from 'node:test'
import { accountErrors, authenticatedDestination, setupPendingItems, setupRouteRedirect, setupStep } from '../src/lib/initialSetup.mjs'

test('first installation always opens setup, with account creation before protected steps', () => {
  assert.equal(setupRouteRedirect({ setupRequired: true }, '/rooms/settings'), '/setup')
  assert.equal(setupRouteRedirect({ setupRequired: true }, '/setup'), null)
  assert.equal(setupRouteRedirect({ authenticated: false }, '/dashboard'), null)
})

test('new administrators resume the wizard while existing installations keep their destination', () => {
  const fresh = { authenticated: true, onboarding: { required: true, step: 'game' } }
  assert.equal(authenticatedDestination(fresh, '/rooms/list'), '/setup')
  assert.equal(setupRouteRedirect(fresh, '/dashboard'), '/setup')
  assert.equal(setupRouteRedirect(fresh, '/agents/list'), null)
  assert.equal(setupRouteRedirect(fresh, '/agents/security'), null)
  assert.equal(authenticatedDestination({ authenticated: true }, '/rooms/list'), '/rooms/list')
  assert.equal(setupRouteRedirect({ authenticated: true }, '/dashboard'), null)
  assert.equal(authenticatedDestination({}, '//example.com'), '/dashboard')
  assert.equal(setupStep('complete'), 'deployment')
  assert.equal(setupStep('room'), 'room')
})

test('account creation confirms passwords and applies server policy without blocking legacy login', () => {
  assert.deepEqual(accountErrors({ username: 'owner', password: 'long-enough', confirmPassword: 'different' }), { confirmPassword: 'passwordMismatch' })
  assert.deepEqual(accountErrors({ username: 'owner', password: '中文密码字符', confirmPassword: '中文密码字符' }), {})
  const long = '中'.repeat(25)
  assert.equal(accountErrors({ username: 'owner', password: long, confirmPassword: long }).password, 'passwordLong')
  assert.equal(accountErrors({ username: 'owner', password: 'password', confirmPassword: 'password' }, { minimumLength: 10 }).password, 'passwordShort')
  assert.equal(accountErrors({ username: 'owner', password: 'password', confirmPassword: 'password' }, { requireComplexity: true }).password, 'passwordComplexity')
  assert.deepEqual(accountErrors({ username: 'owner', password: 'old' }, {}, false), {})
})

test('final checks distinguish unavailable, remote, member, and local preparation', () => {
  const facts = { capabilities: { deployment: { localExecutorEnabled: true } }, readiness: { checks: [] }, installations: [{ targetId: 'local', installed: true, online: true }], rooms: [{ id: 'room', worldCount: 2, controlAvailable: true, targetIds: ['local'], availableTargetIds: ['local'] }] }
  assert.deepEqual(setupPendingItems(facts), [])
  assert.deepEqual(setupPendingItems({ ...facts, installations: [{ targetId: 'local', installed: true, online: false }] }), ['game', 'placement'])
  assert.deepEqual(setupPendingItems({ ...facts, restartRequired: true, errors: ['timeout'] }), ['unavailable', 'restart'])
  assert.deepEqual(setupPendingItems({ capabilities: { deployment: { localExecutorEnabled: false } } }), ['agent', 'room'])
  assert.deepEqual(setupPendingItems({ capabilities: { deployment: { memberEnabled: true, memberConnected: false } } }), ['member'])
  assert.deepEqual(setupPendingItems({ capabilities: { deployment: { memberEnabled: true, memberConnected: true } } }), [])
})

test('final checks require rooms to be available on nodes with a usable game installation', () => {
  const facts = {
    capabilities: { deployment: { localExecutorEnabled: false } },
    installations: [{ targetId: 'agent:one', installed: true, online: true }],
    rooms: [{ id: 'room', worldCount: 2, controlAvailable: true, targetIds: ['agent:one'], availableTargetIds: ['agent:one'] }]
  }
  assert.deepEqual(setupPendingItems(facts), [])
  for (const room of [
    { ...facts.rooms[0], targetIds: [], availableTargetIds: [] },
    { ...facts.rooms[0], targetIds: ['local'], availableTargetIds: ['local'] },
    { ...facts.rooms[0], controlAvailable: false },
    { ...facts.rooms[0], worldCount: 0 },
    { ...facts.rooms[0], targetIds: ['agent:one', 'agent:two'], availableTargetIds: ['agent:one'] },
    { ...facts.rooms[0], targetIds: ['agent:two'], availableTargetIds: ['agent:two'] }
  ]) assert.deepEqual(setupPendingItems({ ...facts, rooms: [room] }), ['placement'])
})
