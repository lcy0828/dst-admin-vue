import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const exists = path => access(new URL(`../${path}`, import.meta.url))

test('critical mod and command routes remain registered with their real pages', async () => {
  const router = await source('src/router/index.js')

  assert.match(router, /path:\s*'\/mods'[\s\S]*?path:\s*''[\s\S]*?views\/mods\/ModManagement\.vue/)
  assert.match(router, /path:\s*'list'[\s\S]*?tab:\s*'room'/)
  assert.match(router, /path:\s*'\/servers'[\s\S]*?path:\s*'commands'[\s\S]*?views\/servers\/CommandManager\.vue/)
  await Promise.all([
    exists('src/views/mods/ModManagement.vue'),
    exists('src/views/mods/ModList.vue'),
    exists('src/views/servers/CommandManager.vue')
  ])
})

test('automation edit mode loads the task and saves through updateTask', async () => {
  const form = await source('src/views/cron/TaskForm.vue')

  assert.match(form, /this\.isEdit = true/)
  assert.match(form, /this\.getTaskDetail\(this\.taskId\)/)
  assert.match(form, /this\.isEdit\s*\?\s*cronTaskApi\.updateTask\(this\.taskId, this\.taskForm\)/)
  assert.match(form, /toast\.success[\s\S]*?this\.\$router\.push\('\/cron\/tasks'\)/)
})

test('job workflows reload while direct Mod toggles update in place', async () => {
  const [imports, mods, worlds, players] = await Promise.all([
    source('src/views/backups/SaveImportsPanel.vue'),
    source('src/views/mods/ModList.vue'),
    source('src/views/worlds/WorldList.vue'),
    source('src/views/players/PlayerList.vue')
  ])

  assert.match(imports, /SAVE_IMPORT_TERMINAL_JOB_STATES\.has\(job\.status\)/)
  assert.match(imports, /await refreshImport\(importId, generation\)/)
  assert.match(imports, /purpose === 'apply'[\s\S]*?emit\('rooms-changed'\)/)
  const toggleStart = mods.indexOf('    async toggleModStatus(mod, world, status) {')
  const toggleEnd = mods.indexOf('    openCopyDialog(mod, sourceWorld) {', toggleStart)
  assert.doesNotMatch(mods.slice(toggleStart, toggleEnd), /fetchModsList/)
  assert.match(mods, /await modApi\.updateMod[\s\S]*?toast\.success[\s\S]*?this\.fetchModsList\(true\)/)
  assert.match(worlds, /await roomApi\.deleteWorld[\s\S]*?await this\.refreshWorlds\(true\)/)
  assert.match(players, /await playerApi\.updatePlayerInfo[\s\S]*?await this\.fetchPlayerList\(\)/)
})
