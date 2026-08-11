import assert from 'node:assert/strict'
import test from 'node:test'

import { jobFailure } from '../src/api/jobFeedback.mjs'

test('job feedback prefers a concrete target failure over a generic job failure', () => {
  const failure = jobFailure({
    error: { code: 'JOB_FAILED', message: '任务执行失败' },
    targets: [{
      status: 'failed',
      error: { code: 'WORKSHOP_DOWNLOAD_MISSING', message: '未找到下载后的模组文件' }
    }]
  })

  assert.deepEqual(failure, {
    code: 'WORKSHOP_DOWNLOAD_MISSING',
    message: '未找到下载后的模组文件'
  })
})
