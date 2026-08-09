import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('localized pages do not prefer adapter messages for successful actions', () => {
  const dashboard = fs.readFileSync(new URL('../src/composables/useDashboardV2.js', import.meta.url), 'utf8')
  const logs = fs.readFileSync(new URL('../src/views/LogQueryView.vue', import.meta.url), 'utf8')
  const cronTaskList = fs.readFileSync(new URL('../src/views/cron/TaskList.vue', import.meta.url), 'utf8')
  const cronApi = fs.readFileSync(new URL('../src/api/cronApi.js', import.meta.url), 'utf8')

  assert.doesNotMatch(dashboard, /toast\.success\(response\.msg/)
  assert.match(dashboard, /toast\.success\(translate\('dashboard\.feedback\.roomStarted'/)
  assert.doesNotMatch(logs, /toast\.success\(response\.msg/)
  assert.match(logs, /toast\.success\(this\.\$t\('logs\.query\.feedback\.cleanupSuccess'\)\)/)
  assert.doesNotMatch(cronTaskList, /const successMsg\s*=\s*response\.msg/)
  assert.match(cronTaskList, /const successMsg = this\.text\('list\.feedback\.runStarted'\)/)
  assert.match(cronTaskList, /message === 'task_started' \|\| message === '任务已开始运行'/)
  assert.match(cronApi, /message: 'task_started'/)
})
