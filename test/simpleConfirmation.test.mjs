import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('state-changing workflows do not require typed object identifiers', async () => {
  const paths = [
    'src/components/players/PlayerActionMenu.vue',
    'src/components/recovery/RecoveryDialog.vue',
    'src/views/backups/DistributedBackupPanel.vue',
    'src/views/backups/SaveImportsPanel.vue',
    'src/views/mods/ModList.vue',
    'src/views/players/BanList.vue',
    'src/views/players/PlayerList.vue',
    'src/views/rooms/RoomList.vue',
    'src/views/rooms/RoomTopology.vue',
    'src/views/rooms/ServerToken.vue',
    'src/views/rooms/SpecialLists.vue',
    'src/views/servers/CommandManager.vue',
    'src/views/servers/ServerWorkspace.vue',
    'src/views/worlds/WorldDetails.vue',
    'src/views/worlds/WorldList.vue',
    'src/views/worlds/WorldSettings.vue'
  ]
  const pages = await Promise.all(paths.map(source))

  for (const page of pages) {
    assert.doesNotMatch(page, /promptText|inputValidator/)
    assert.doesNotMatch(page, /(?:room|world|player|recovery|backup|migration|provision|uninstall|ban|token|import)-confirmation/)
  }
})
