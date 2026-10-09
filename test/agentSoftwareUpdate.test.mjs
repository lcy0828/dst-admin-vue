import test from 'node:test'
import assert from 'node:assert/strict'
import { createAgentSoftwareController } from '../src/lib/agentSoftwareUpdate.mjs'

const snapshot = { supported: true, current: { version: 'v1.2.2' }, check: { latest: { version: 'v1.2.3', onlineUpdate: true }, hasUpdate: true } }
function setup(extra = {}) {
  const calls = [], saved = new Map()
  const storage = { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) }
  const api = { software: async id => { calls.push(['status', id]); return snapshot }, checkSoftware: async (id, input) => { calls.push(['check', id, input]); return snapshot }, updateSoftware: async (id, input) => { calls.push(['update', id, input]); return { id: 'job', status: 'queued' } } }
  const jobs = { controlPlaneGet: async id => { calls.push(['job', id]); return { id, status: 'succeeded' } } }
  const controller = createAgentSoftwareController({ id: 'agent-a', api, jobs, storage, delay: async () => {}, ...extra })
  return { controller, calls, saved, api, jobs }
}
test('opening a checked Agent panel loads once and leaves no idle polling', async () => {
  const { controller, calls } = setup()
  await controller.initialize()
  assert.deepEqual(calls, [['status', 'agent-a']])
  assert.equal(controller.state.acting, false)
})
test('update is scoped to the selected Agent, confirms the version and preserves relay selection', async () => {
  const { controller, calls, saved } = setup()
  await controller.start({ version: 'v1.2.3', source: 'controller' })
  assert.deepEqual(calls[0], ['update', 'agent-a', { version: 'v1.2.3', confirmation: 'v1.2.3', source: 'controller', operationId: '' }])
  assert.equal(controller.state.job.status, 'succeeded')
  assert.equal(saved.size, 0)
  assert.equal(calls.filter(value => value[0] === 'job').length, 1)
})
test('prepared retry carries the authorized operation without a downgrade flag', async () => {
  const { controller, calls } = setup()
  await controller.start({ version: 'v1.2.3', operationId: 'prepared-operation' })
  const updates = calls.filter(value => value[0] === 'update')
  assert.equal(Object.hasOwn(updates[0][2], 'rollback'), false)
  assert.equal(updates[0][2].operationId, 'prepared-operation')
})
test('failed reconnect is visible and stops observing without retrying installation', async () => {
  const { controller, jobs, calls } = setup()
  jobs.controlPlaneGet = async () => ({ id: 'job', status: 'failed', targets: [{ error: { message: 'new Agent failed; old program restored' } }] })
  await controller.start({ version: 'v1.2.3' })
  assert.match(controller.state.error, /old program restored/)
  assert.equal(controller.state.acting, false)
  assert.equal(calls.filter(value => value[0] === 'update').length, 1)
})
test('closing the panel during an update stops subsequent reads and retains the job for reopening', async () => {
  const { controller, jobs, saved, calls } = setup()
  jobs.controlPlaneGet = async () => { controller.dispose(); return { id: 'job', status: 'running' } }
  await controller.start({ version: 'v1.2.3' })
  assert.equal(saved.get('dst-agent-software:agent-a'), 'job')
  assert.equal(calls.filter(value => value[0] === 'status').length, 0)
})
test('reopening resumes an authorized job without another installation request', async () => {
  const { controller, saved, calls } = setup()
  saved.set('dst-agent-software:agent-a', 'previous-job')
  await controller.initialize()
  assert.equal(calls.some(value => value[0] === 'update'), false)
  assert.equal(calls.find(value => value[0] === 'job')[1], 'previous-job')
})

test('transient job fetch failure resumes without sending a second update', async () => {
  const { controller, jobs, calls } = setup()
  let attempts = 0
  jobs.controlPlaneGet = async () => {
    if (++attempts === 1) throw Object.assign(Error('network timeout'), { status: 504 })
    return { id: 'job', status: 'succeeded' }
  }
  await controller.start({ version: 'v1.2.3' })
  assert.equal(attempts, 2)
  assert.equal(controller.state.error, '')
  assert.equal(controller.state.reconnecting, false)
  assert.equal(calls.filter(value => value[0] === 'update').length, 1)
})

test('retry window is bounded and reconnect resumes the remembered job', async () => {
  let time = 0
  const { controller, jobs, saved, calls } = setup({ now: () => time, delay: async ms => { time += ms } })
  jobs.controlPlaneGet = async () => { throw Object.assign(Error('network timeout'), { status: 503 }) }
  await controller.start({ version: 'v1.2.3' })
  assert.equal(controller.state.error, 'SOFTWARE_CONNECTION_TIMEOUT')
  assert.equal(saved.get('dst-agent-software:agent-a'), 'job')
  assert.equal(controller.state.acting, false)
  assert(time >= 120000 && time < 125000)
  jobs.controlPlaneGet = async id => ({ id, status: 'succeeded' })
  await controller.reconnect()
  assert.equal(controller.state.job.status, 'succeeded')
  assert.equal(controller.state.error, '')
  assert.equal(saved.size, 0)
  assert.equal(calls.filter(value => value[0] === 'update').length, 1)
})

test('missing or unauthorized job does not poll forever', async () => {
  const { controller, jobs } = setup()
  let attempts = 0
  jobs.controlPlaneGet = async () => { attempts++; throw Object.assign(Error('session expired'), { status: 401 }) }
  await controller.start({ version: 'v1.2.3' })
  assert.equal(attempts, 1)
  assert.equal(controller.state.error, 'session expired')
})
