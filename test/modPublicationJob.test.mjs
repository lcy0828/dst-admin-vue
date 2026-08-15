import assert from 'node:assert/strict'
import test from 'node:test'

import { adapterError } from '../src/api/adapterProtocol.mjs'
import { resolveModPublicationJob } from '../src/api/modPublicationJob.mjs'

test('publication job resolution waits for completion and matches the completed job ID across pages', async () => {
  const progress = () => {}
  const calls = []
  const publication = { id: 'publication-2', sourceJobId: 'job-completed' }

  const result = await resolveModPublicationJob({
    roomId: 'room-1',
    job: { id: 'job-submitted', status: 'pending' },
    timeout: 900000,
    onProgress: progress,
    waitForJob: async (job, timeout, onProgress) => {
      assert.equal(job.id, 'job-submitted')
      assert.equal(timeout, 900000)
      assert.equal(onProgress, progress)
      return { id: 'job-completed', status: 'succeeded' }
    },
    listPublications: async params => {
      calls.push(params)
      if (params.offset === 0) {
        return {
          items: Array.from({ length: 100 }, (_, index) => ({
            id: `publication-old-${index}`,
            sourceJobId: `job-old-${index}`
          })),
          total: 101
        }
      }
      return { items: [publication], total: 101 }
    }
  })

  assert.equal(result, publication)
  assert.deepEqual(calls, [
    { limit: 100, offset: 0 },
    { limit: 100, offset: 100 }
  ])
})

test('publication job resolution raises a stable error when the result record is missing', async () => {
  await assert.rejects(
    resolveModPublicationJob({
      roomId: 'room-1',
      job: { id: 'job-missing', status: 'pending' },
      timeout: 900000,
      waitForJob: async () => ({ id: 'job-missing', status: 'succeeded' }),
      listPublications: async () => ({ items: [], total: 0 })
    }),
    error => {
      assert.equal(error.code, 'MOD_PUBLICATION_RESULT_MISSING')
      assert.deepEqual(error.context, { roomId: 'room-1', jobId: 'job-missing' })
      return true
    }
  )
})

test('in-place recovery resolves the original publication after the retry job succeeds', async () => {
  let listCalled = false
  const publication = { id: 'publication-recovery', status: 'succeeded', sourceJobId: 'job-original' }

  const result = await resolveModPublicationJob({
    roomId: 'room-1',
    job: { id: 'job-retry', status: 'pending' },
    timeout: 900000,
    existingPublicationId: publication.id,
    waitForJob: async () => ({ id: 'job-retry', status: 'succeeded' }),
    getPublication: async id => {
      assert.equal(id, publication.id)
      return publication
    },
    listPublications: async () => {
      listCalled = true
      return { items: [] }
    }
  })

  assert.equal(result, publication)
  assert.equal(listCalled, false)
})

for (const code of ['JOB_FAILED', 'JOB_TIMEOUT']) {
  test(`publication job resolution preserves ${code} and does not query results`, async () => {
    let listCalled = false

    await assert.rejects(
      resolveModPublicationJob({
        roomId: 'room-1',
        job: { id: 'job-1', status: 'pending' },
        timeout: 900000,
        waitForJob: async () => { throw adapterError(code, { context: { jobId: 'job-1' } }) },
        listPublications: async () => {
          listCalled = true
          return { items: [] }
        }
      }),
      error => error.code === code
    )

    assert.equal(listCalled, false)
  })
}
