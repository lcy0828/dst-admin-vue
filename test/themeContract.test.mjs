import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('shadcn zinc is the default while other presets remain selectable', async () => {
  const presets = await source('src/theme/themePresets.js')

  assert.match(presets, /DEFAULT_THEME_ID = 'zinc'/)
  assert.match(presets, /id: 'zinc'[\s\S]*?primary: '#27272a'/)
  assert.match(presets, /id: 'graphite'[\s\S]*?primary: '#e5482d'/)
  assert.match(presets, /dark:\s*\{[\s\S]*?primary: '#e4e4e7'/)
})

test('formal shell inherits runtime semantic tokens instead of overriding them', async () => {
  const [css, preferences] = await Promise.all([
    source('src/assets/css/main.css'),
    source('src/utils/systemPreferences.js')
  ])
  const shellRule = css.match(/body\[data-ui-version='v2'\]\s*\{([^}]*)\}/)

  assert.ok(shellRule)
  assert.doesNotMatch(shellRule[1], /--(?:background|primary|sidebar):/)
  assert.doesNotMatch(css, /\.dark body\[data-ui-version='v2'\]/)
  assert.match(preferences, /const renderPreset = darkMode && preset\.dark/)
  assert.match(preferences, /'--primary': renderPreset\.primary/)
  assert.match(preferences, /'--sidebar-primary': renderPreset\.sidebarActive/)
})
