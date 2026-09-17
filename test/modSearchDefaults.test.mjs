import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { resolveModSearchSort } from '../src/lib/modSearchDefaults.mjs'

test('Mod search uses trend by default and relevance for keyword searches', () => {
  assert.equal(resolveModSearchSort('', 'trend'), 'trend')
  assert.equal(resolveModSearchSort('   ', 'relevance'), 'trend')
  assert.equal(resolveModSearchSort('棱镜', 'trend'), 'relevance')
})

test('Mod search never replaces a sort explicitly selected by the user', () => {
  assert.equal(resolveModSearchSort('棱镜', 'trend', true), 'trend')
  assert.equal(resolveModSearchSort('棱镜', 'top_rated', true), 'top_rated')
  assert.equal(resolveModSearchSort('', 'relevance', true), 'relevance')
})

test('Mod search records manual selection and resets the smart default state', async () => {
  const source = await readFile(new URL('../src/views/mods/ModSearch.vue', import.meta.url), 'utf8')

  assert.match(source, /<UiSelect v-model="searchForm\.sort" @update:model-value="sortChanged">/)
  assert.match(source, /sortChanged\(sort\)[\s\S]*?this\.sortManuallySelected = true/)
  assert.match(source, /async searchMods\(\) \{\s*this\.applyKeywordSortDefault\(\)/)
  assert.match(source, /resetSearch\(\)[\s\S]*?this\.sortManuallySelected = false/)
})
