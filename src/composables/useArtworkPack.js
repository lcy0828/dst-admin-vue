import { shallowRef } from 'vue'
import { artworkPackV2API } from '@/api/v2'

export const artworkPackState = shallowRef(null)
export const artworkPackIndex = shallowRef({ revision: '', prefabs: new Set() })
let pending = null

// One status/index read per workbench entry or explicit action. No idle polling
// and no network request per entity card.
export function refreshArtworkPack() {
  if (pending) return pending
  pending = (async () => {
    const status = await artworkPackV2API.status()
    artworkPackState.value = status
    const revision = status.installed?.revision || ''
    if (!revision) artworkPackIndex.value = { revision: '', prefabs: new Set() }
    else if (artworkPackIndex.value.revision !== revision) {
      const index = await artworkPackV2API.index()
      artworkPackIndex.value = { revision: index.revision, prefabs: new Set(index.prefabs) }
    }
    return status
  })().finally(() => { pending = null })
  return pending
}
