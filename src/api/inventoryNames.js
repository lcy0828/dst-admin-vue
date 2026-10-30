import { entityCatalogV2API } from './v2'
import { createAsyncResourceCache } from '@/lib/asyncResourceCache.mjs'
import { inventoryNameIndex } from '@/lib/playerInventory.mjs'

// One bounded directory read for all open inventories, never one request per
// item or container. This uses the panel catalog and does not contact the game.
const names = createAsyncResourceCache({ ttlMs: 10 * 60_000 })
export const loadInventoryNames = () => names.load(async () => inventoryNameIndex((await entityCatalogV2API.directory()).items))
