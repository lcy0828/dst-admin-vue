import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = path => readFile(new URL(path, import.meta.url), 'utf8')

test('global overlay buttons do not stack two as-child triggers on one element', async () => {
  const [language, jobs] = await Promise.all([
    source('../src/components/layout/LanguageSwitch.vue'),
    source('../src/components/layout/GlobalJobStatus.vue')
  ])

  assert.match(language, /<TooltipTrigger as-child>\s*<span class="inline-flex">\s*<DropdownMenuTrigger as-child>/)
  assert.doesNotMatch(language, /<TooltipTrigger as-child>\s*<DropdownMenuTrigger as-child>/)

  assert.match(jobs, /<TooltipTrigger as-child>\s*<span class="inline-flex">\s*<PopoverTrigger as-child>/)
  assert.doesNotMatch(jobs, /<TooltipTrigger as-child>\s*<PopoverTrigger as-child>/)
})
