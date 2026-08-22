import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = path => readFile(new URL(path, import.meta.url), 'utf8')

test('global header controls keep one direct interactive trigger', async () => {
  const [language, jobs] = await Promise.all([
    source('../src/components/layout/LanguageSwitch.vue'),
    source('../src/components/layout/GlobalJobStatus.vue')
  ])

  assert.match(language, /<Button[\s\S]*?@click="switchLanguage"/)
  assert.match(language, /previewSystemLanguage\(targetLocale\.value\)/)
  assert.doesNotMatch(language, /DropdownMenu|SelectTrigger|TooltipTrigger/)

  assert.match(jobs, /<TooltipTrigger as-child>\s*<span class="inline-flex">\s*<PopoverTrigger as-child>/)
  assert.doesNotMatch(jobs, /<TooltipTrigger as-child>\s*<PopoverTrigger as-child>/)
})
