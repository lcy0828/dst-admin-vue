import test from 'node:test'
import assert from 'node:assert/strict'
import { Worker } from 'node:worker_threads'
import { headTailMatches } from '../src/lib/headTailMatches.mjs'

test('head/tail search handles zero-width patterns without hanging', async () => {
  // Bound the actual synchronous work in a worker so a regression fails the
  // test instead of hanging the entire suite on the browser's former loop.
  const moduleURL = new URL('../src/lib/headTailMatches.mjs', import.meta.url).href
  const worker = new Worker(`
    const { parentPort } = require('node:worker_threads');
    import(${JSON.stringify(moduleURL)}).then(({ headTailMatches }) => {
      const content = 'head\\nbody\\ntail';
      parentPort.postMessage(['^', '$', '.*'].map(pattern =>
        headTailMatches(content, new RegExp(pattern, 'm'), /tail/m)));
    });
  `, { eval: true })
  let timer
  try {
    const result = await Promise.race([
      new Promise((resolve, reject) => { worker.once('message', resolve); worker.once('error', reject) }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('regex scan did not finish')), 5000) })
    ])
    assert.deepEqual(result[0], ['head\nbody\ntail', 'body\ntail', 'tail'])
    assert.deepEqual(result[1], ['\nbody\ntail', '\ntail'])
    assert.ok(result[2].includes('head\nbody\ntail'))
  } finally {
    clearTimeout(timer)
    await worker.terminate()
  }
})

test('head/tail anchors use the original line boundaries', () => {
  assert.deepEqual(headTailMatches('head tail', /head/m, /^tail/m), [])
  assert.deepEqual(headTailMatches('head\nbody\ntail\nhead\ntail', /^head/m, /^tail/m), [
    'head\nbody\ntail', 'head\ntail'
  ])
})

test('empty input, missing tails, overlaps and Unicode terminate correctly', () => {
  assert.deepEqual(headTailMatches('', /^/m, /$/m), [''])
  assert.deepEqual(headTailMatches('head', /head/m, /tail/m), [])
  assert.deepEqual(headTailMatches('aaax', /aa/m, /x/m), ['aaax', 'aax'])
  assert.deepEqual(headTailMatches('🌱x', /(?:)/u, /x/u), ['🌱x', 'x'])
})
