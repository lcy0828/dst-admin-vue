import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('alert confirmation resolves before the controlled dialog closes', async () => {
  const feedbackHost = await readFile(
    new URL('../src/components/FeedbackHost.vue', import.meta.url),
    'utf8',
  )

  assert.match(
    feedbackHost,
    /<Button\s+type="button"[\s\S]*?@click="confirmRequest"[\s\S]*?<\/Button>/,
  )
  assert.doesNotMatch(
    feedbackHost,
    /<AlertDialogAction[\s\S]*?@click="confirmRequest"/,
  )
  assert.match(
    feedbackHost,
    /function confirmRequest\(\) \{\s*finishRequest\(request => request\.resolve\('confirm'\)\)\s*\}/,
  )
})
