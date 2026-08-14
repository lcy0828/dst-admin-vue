import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('sticky application header stays above the isolated log terminal', async () => {
  const [layout, worldLog] = await Promise.all([
    source('src/layouts/MainLayoutV2.vue'),
    source('src/components/WorldLog.vue')
  ])

  assert.match(layout, /sticky top-0 z-30/)
  assert.match(worldLog, /\.world-log-container \{[\s\S]*?z-index: 0;[\s\S]*?overflow: hidden;[\s\S]*?isolation: isolate;/)
  assert.match(worldLog, /\.log-content \{[\s\S]*?position: relative;[\s\S]*?z-index: 0;/)
})
