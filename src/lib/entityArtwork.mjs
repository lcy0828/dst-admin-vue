// Shipped artwork is matched by exact Prefab and never borrowed by a mod override.
export const bundledEntityArtwork = new Set(['alterguardian_phase3', 'amulet', 'antlion', 'armorgrass', 'armormarble', 'armorruins', 'armorwood', 'axe', 'backpack', 'baconeggs', 'bandage', 'bearger', 'beefalo', 'beequeen', 'beeswax', 'berries', 'birdcage', 'bluegem', 'boards', 'bonestew', 'bugnet', 'bunnyman', 'campfire', 'cane', 'carrot', 'catcoon', 'charcoal', 'cookpot', 'crabking', 'cutgrass', 'cutstone', 'daywalker', 'deerclops', 'dragonfly', 'dragonpie', 'eyebrellahat', 'eyeofterror', 'firepit', 'fishingrod', 'fishsticks', 'flint', 'footballhat', 'gears', 'goldnugget', 'greengem', 'hambat', 'hammer', 'healingsalve', 'honey', 'honeyham', 'hound', 'houndstooth', 'ice', 'icebox', 'klaus', 'krampus', 'lantern', 'lightbulb', 'lightning_rod', 'lightninggoat', 'livinglog', 'log', 'malbatross', 'marble', 'meat', 'meatballs', 'merm', 'minerhat', 'minotaur', 'mole', 'monstermeat', 'moonrocknugget', 'moose', 'nightmarefuel', 'nightsword', 'nitre', 'opalpreciousgem', 'orangegem', 'panflute', 'papyrus', 'perogies', 'pickaxe', 'pighouse', 'pigman', 'pigskin', 'poop', 'purplegem', 'rabbit', 'rabbithouse', 'redgem', 'researchlab', 'researchlab2', 'researchlab3', 'researchlab4', 'reviver', 'rocks', 'rope', 'ruins_bat', 'shovel', 'silk', 'spear', 'spider', 'spiderqueen', 'stalker_atrium', 'stinger', 'tallbird', 'tentacle', 'tentaclespike', 'thulecite', 'toadstool', 'torch', 'treasurechest', 'twigs', 'twinofterror1', 'twinofterror2', 'walrus', 'walrus_tusk', 'warg', 'worm', 'yellowgem'])

export function entityArtworkCandidates(entity, { roomId = '', worldId = '', apiBase = '/api', pack = null } = {}) {
 if (!entity || !/^[a-zA-Z0-9_][a-zA-Z0-9_-]{0,79}$/.test(entity.id || '')) return []
 const urls = []
 if (!entity.modId && pack?.revision && pack.prefabs?.has(entity.id)) {
  urls.push(`${apiBase.replace(/\/$/, '')}/v2/entity-catalog/artwork-pack/artwork/${encodeURIComponent(entity.id)}?v=${encodeURIComponent(pack.revision)}`)
 }
 if (!entity.modId && bundledEntityArtwork.has(entity.id)) urls.push(`/static/entities/${entity.id}.webp`)
 if (entity.artworkUrl && /^(https?:\/\/|\/(?!\/))/.test(entity.artworkUrl)) urls.push(entity.artworkUrl)
 if (entity.source === 'runtime' && roomId && worldId) {
  const query = entity.modId ? `?${new URLSearchParams({ modId: entity.modId })}` : ''
  urls.push(`${apiBase.replace(/\/$/, '')}/v2/rooms/${encodeURIComponent(roomId)}/worlds/${encodeURIComponent(worldId)}/entity-catalog/artwork/${encodeURIComponent(entity.id)}${query}`)
 }
 return [...new Set(urls)]
}
