import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { parse } from '@babel/parser'
import { parse as parseSFC } from '@vue/compiler-sfc'
import { workshopMessages } from '../src/i18n/workshopMessages.js'
import { resolveModSearchSort } from '../src/lib/modSearchDefaults.mjs'
import { createModFailure, formatModFailure, modMessages } from '../src/i18n/modMessages.js'

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
async function searchInstance(search) {
  const source = await readFile(new URL('../src/views/mods/ModSearch.vue', import.meta.url), 'utf8')
  const script = parseSFC(source).descriptor.script.content
  const declaration = parse(script, { sourceType: 'module' }).program.body.find(node => node.type === 'ExportDefaultDeclaration').declaration
  const properties = declaration.properties.filter(node => node.key.name !== 'components').map(node => script.slice(node.start, node.end))
  const scope = { resolveModSearchSort, modThumbnailUrl() {}, modApi: { searchMods: search }, workshopV2API: { enrich: async () => ({ items: {} }) }, createModFailure: (_, error) => error, formatModFailure: (_, error) => error?.message || '' }
  const options = new Function(...Object.keys(scope), `return ({${properties.join(',')}})`)(...Object.values(scope))
  const vm = { ...options.data(), $t: key => key }
  for (const [name, fn] of Object.entries(options.methods)) vm[name] = fn.bind(vm)
  for (const [name, getter] of Object.entries(options.computed)) Object.defineProperty(vm, name, { get: getter.bind(vm) })
  return vm
}

test('Workshop messages have matching Chinese and English keys', () => {
  const paths = (object, prefix = '') => Object.entries(object).flatMap(([key, value]) => typeof value === 'object' ? paths(value, `${prefix}${key}.`) : [`${prefix}${key}`])
  assert.deepEqual(paths(workshopMessages['zh-CN']).sort(), paths(workshopMessages['en-US']).sort())
})

test('Workshop failures use the selected language instead of the backend generic message', () => {
  for (const locale of ['zh-CN', 'en-US']) {
    const catalog = { ...modMessages[locale], ...workshopMessages[locale] }
    const translate = (key, parameters = {}) => Object.entries(parameters).reduce((message, [name, value]) => message.replaceAll(`{${name}}`, value), key.split('.').reduce((value, part) => value?.[part], catalog))
    const failure = createModFailure('mods.errors.search', { code: 'WORKSHOP_TIMEOUT', message: '创意工坊资料暂不可用', requestId: 'fixture-request' })
    const message = formatModFailure(translate, failure)
    assert.ok(message.includes(workshopMessages[locale].workshop.codes.WORKSHOP_TIMEOUT))
    assert.ok(message.includes('fixture-request'))
    assert.ok(!message.includes('创意工坊资料暂不可用'))
  }
})

test('search keeps previous results when a network request fails', async () => {
  let fail = false
  const vm = await searchInstance(async () => { if (fail) throw new Error('offline'); return { items: [{ id: '100', name: 'Known' }], total: 1, source: 'api', configVersion: 'v1' } })
  await vm.searchMods()
  fail = true
  const oldResults = vm.searchResults
  const pending = vm.searchMods()
  assert.equal(vm.searchResults, oldResults)
  await pending
  assert.equal(vm.searchResults[0].name, 'Known')
  assert.equal(vm.loadFailure.message, 'offline')
  assert.equal(vm.searching, false)
})

test('a late response cannot overwrite a newer search and the old request is canceled', async () => {
  const first = deferred(), second = deferred(), calls = []
  const vm = await searchInstance(input => { calls.push(input); return calls.length === 1 ? first.promise : second.promise })
  vm.searchForm.keyword = 'first'
  const a = vm.searchMods()
  vm.searchForm.keyword = 'second'
  const b = vm.searchMods()
  assert.equal(calls[0].signal.aborted, true)
  second.resolve({ items: [{ id: '200', name: 'New' }], source: 'community', configVersion: 'v1' })
  await b
  first.resolve({ items: [{ id: '100', name: 'Old' }], source: 'api', configVersion: 'v0' })
  await a
  assert.equal(vm.searchResults[0].name, 'New')
  assert.equal(vm.searchSource, 'community')
})

test('pagination retains its source and changing filters starts a new search', async () => {
  const calls = []
  const vm = await searchInstance(async input => { calls.push(input); return { items: [], source: 'api', configVersion: 'v1', totalKind: 'lower_bound', hasMore: true } })
  await vm.searchMods()
  vm.currentPage = 2
  await vm.searchMods()
  assert.equal(calls[1].source, 'api')
  assert.equal(calls[1].configVersion, 'v1')
  assert.equal(calls[1].page, 2)
  vm.searchForm.category = 'utility'
  await vm.searchMods()
  assert.equal(calls[2].page, 1)
  assert.equal(calls[2].source, '')
  assert.equal(vm.totalKind, 'lower_bound')
})

test('Chinese IME confirmation does not submit an incomplete search', async () => {
  let calls = 0
  const vm = await searchInstance(async () => { calls++; return { items: [] } })
  vm.searchComposing = true
  vm.startSearch({ isComposing: true })
  assert.equal(calls, 0)
  vm.searchComposing = false
  vm.startSearch({ isComposing: false })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(calls, 1)
})
