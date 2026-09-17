<script setup>
import RoomScopeSelect from '@/components/layout/RoomScopeSelect.vue'
import { preferredRoomId } from '@/lib/pageScope.mjs'
import { useRoute } from 'vue-router'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Backpack,
  Box,
  Boxes,
  CalendarDays,
  Check,
  ChevronRight,
  CloudRain,
  Droplets,
  Flame,
  Gauge,
  HeartPulse,
  Moon,
  Navigation,
  PackagePlus,
  PawPrint,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Skull,
  SlidersHorizontal,
  Sparkles,
  SunMedium,
  ThermometerSun,
  Timer,
  Trash2,
  TriangleAlert,
  UserRound,
  Wrench,
  X,
  Zap
} from '@lucide/vue'
import { toast } from 'vue-sonner'
import { commandApi } from '@/api'
import { playerApi } from '@/api/playerApi'
import { entityCatalogV2API, playersV2API, roomsV2API, worldStatesV2API } from '@/api/v2'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input as UiInput } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const PLAYER_OPERATIONS = [
  { id: 'set_player_stat', icon: HeartPulse },
  { id: 'set_player_speed', icon: Gauge },
  { id: 'set_player_lock', icon: ShieldCheck },
  { id: 'adjust_player_luck', icon: Sparkles },
  { id: 'manage_player_skills', icon: Sparkles },
  { id: 'set_monkey_curse', icon: Skull },
  { id: 'clear_player_debuffs', icon: Sparkles },
  { id: 'clear_player_inventory', icon: Backpack },
  { id: 'clear_player_naughtiness', icon: ShieldCheck },
  { id: 'teleport_player', icon: Navigation },
  { id: 'relocate_players', icon: Navigation },
  { id: 'set_player_ability', icon: Flame },
  { id: 'set_player_attack_multiplier', icon: Zap },
  { id: 'toggle_player_ghost', icon: Skull },
  { id: 'set_health_penalty', icon: HeartPulse },
  { id: 'set_character_power', icon: Sparkles },
  { id: 'manage_followers', icon: PawPrint },
  { id: 'spawn_domesticated_beefalo', icon: PawPrint }
]

const PLAYER_OPERATION_GROUPS = [
  { id: 'status', operations: ['set_player_stat', 'set_player_speed', 'set_player_lock', 'set_health_penalty', 'clear_player_debuffs'] },
  { id: 'abilities', operations: ['set_player_ability', 'set_player_attack_multiplier', 'adjust_player_luck', 'manage_player_skills', 'set_character_power'] },
  { id: 'inventory', operations: ['clear_player_inventory', 'set_monkey_curse', 'clear_player_naughtiness'] },
  { id: 'position', operations: ['teleport_player', 'relocate_players', 'toggle_player_ghost'] },
  { id: 'companions', operations: ['manage_followers', 'spawn_domesticated_beefalo'] }
]

const PLAYER_CONFIRMATION_OPERATIONS = new Set(['clear_player_inventory', 'toggle_player_ghost'])
const ENTITY_CONFIRMATION_MODES = new Set(['spawn', 'remove', 'act'])
const WORLD_CONFIRMATION_OPERATIONS = new Set(['skip_days', 'trigger_world_event', 'trigger_incident'])
const CONFIRMATION_WINDOW_MS = 8000

const WORLD_OPERATIONS = [
  { id: 'skip_days', icon: CalendarDays },
  { id: 'set_time_scale', icon: Timer },
  { id: 'set_precipitation', icon: CloudRain },
  { id: 'set_world_wetness', icon: Droplets },
  { id: 'set_world_temperature', icon: ThermometerSun },
  { id: 'set_moon_phase', icon: Moon },
  { id: 'trigger_world_event', icon: Zap },
  { id: 'trigger_incident', icon: TriangleAlert },
  { id: 'set_special_event', icon: Sparkles },
  { id: 'stop_vote', icon: ShieldCheck },
  { id: 'set_season', icon: SunMedium },
  { id: 'next_phase', icon: RefreshCw },
  { id: 'set_phase', icon: SunMedium },
  { id: 'set_clock_segments', icon: SlidersHorizontal }
]

const WORLD_OPERATION_GROUPS = [
  { id: 'time', operations: ['skip_days', 'set_time_scale', 'next_phase', 'set_phase', 'set_clock_segments'] },
  { id: 'environment', operations: ['set_precipitation', 'set_world_wetness', 'set_world_temperature', 'set_moon_phase', 'set_season'] },
  { id: 'events', operations: ['trigger_world_event', 'trigger_incident', 'set_special_event'] },
  { id: 'server', operations: ['stop_vote'] }
]

const ENTITY_ACTION_GROUPS = [
  { id: 'entity', actions: ['delete', 'extinguish', 'ignite', 'restore', 'repair', 'repair_boat', 'freshen', 'heat', 'cool', 'salvage', 'haunt'] },
  { id: 'chores', actions: ['fertilize', 'grow', 'harvest', 'pick', 'chop', 'mine', 'hammer', 'dig', 'till', 'build_complete'] },
  { id: 'combat', actions: ['chaos', 'electrocute', 'kill', 'freeze', 'sleep', 'panic', 'pacify', 'root', 'taunt'] }
]

const PLAYER_ABILITY_GROUPS = [
  { id: 'core', abilities: ['god_mode', 'creative_mode', 'no_cooldown', 'unlock_recipes'] },
  { id: 'combat', abilities: ['one_hit_kill', 'aoe_attack', 'critical_work', 'knockback_immunity'] },
  { id: 'survival', abilities: ['water_walk', 'no_hate', 'stealth'] }
]
const PLAYER_API_ABILITIES = new Set(['god_mode', 'creative_mode'])
const ABILITY_VALUE_RANGES = {
  aoe_attack: { min: 1, max: 40, default: 4 },
  critical_work: { min: 0, max: 99999, default: 99999 },
  stealth: { min: 0, max: 100, default: 0 }
}
const FOLLOWER_ACTIONS = ['recruit', 'dismiss', 'heal', 'feed', 'loyal']
const WORLD_EVENT_GROUPS = [
  { id: 'natural', events: ['lightning', 'earthquake', 'meteor_shower'] },
  { id: 'weather', events: ['lunar_hail', 'acid_rain', 'moon_storm'] },
  { id: 'nightmare', events: ['nightmare_calm', 'nightmare_warn', 'nightmare_wild', 'nightmare_dawn'] },
  { id: 'ruins', events: ['reset_ruins'] }
]
const INCIDENTS = ['hounds', 'worms', 'worm_boss', 'frog_rain', 'brightshade', 'pirates']
const SPECIAL_EVENT_GROUPS = [
  { id: 'settings', events: ['none', 'default'] },
  { id: 'festivals', events: ['crow_carnival', 'hallowed_nights', 'winters_feast'] },
  { id: 'years', events: ['year_of_the_gobbler', 'year_of_the_varg', 'year_of_the_pig', 'year_of_the_carrat', 'year_of_the_beefalo', 'year_of_the_catcoon', 'year_of_the_bunnyman', 'year_of_the_dragonfly', 'year_of_the_snake', 'year_of_the_knight'] }
]
const CHARACTER_POWER_GROUPS = {
  wilson: [{ id: 'beard', actions: ['beard_none', 'beard_short', 'beard_medium', 'beard_long'] }],
  walter: [{ id: 'companion', actions: ['woby_empty', 'woby_half', 'woby_full'] }],
  wendy: [
    { id: 'bond', actions: ['abigail_bond_1', 'abigail_bond_2', 'abigail_bond_3'] },
    { id: 'health', actions: ['abigail_health_5', 'abigail_health_50', 'abigail_health_100'] },
    { id: 'form', actions: ['abigail_shadow', 'abigail_lunar_toggle'] }
  ],
  wigfrid: [{ id: 'inspiration', actions: ['inspiration_0', 'inspiration_50', 'inspiration_100'] }],
  wolfgang: [{ id: 'fitness', actions: ['fitness_0', 'fitness_50', 'fitness_100'] }],
  woodie: [{ id: 'form', actions: ['woody_beaver', 'woody_goose', 'woody_moose'] }],
  wx78: [{ id: 'charge', actions: ['wx_charge_add', 'wx_charge_remove'] }],
  wormwood: [
    { id: 'bloom', actions: ['wormwood_bloom_0', 'wormwood_bloom_1', 'wormwood_bloom_2', 'wormwood_bloom_3'] },
    { id: 'progress', actions: ['wormwood_bloom_progress_start', 'wormwood_bloom_progress_half', 'wormwood_bloom_progress_end'] },
    { id: 'direction', actions: ['wormwood_bloom_grow', 'wormwood_bloom_decay'] }
  ],
  wurt: [
    { id: 'hunger', actions: ['merm_king_hunger_0', 'merm_king_hunger_50', 'merm_king_hunger_100'] },
    { id: 'health', actions: ['merm_king_health_5', 'merm_king_health_50', 'merm_king_health_100'] },
    { id: 'equipment', actions: ['merm_king_trident', 'merm_king_crown', 'merm_king_shoulder'] }
  ]
}
const CHARACTER_POWER_ACTIONS = Object.fromEntries(
  Object.entries(CHARACTER_POWER_GROUPS).map(([prefab, groups]) => [prefab, groups.flatMap(group => group.actions)])
)

const props = defineProps({
  embedded: { type: Boolean, default: false },
  lockedTarget: { type: Boolean, default: false },
  initialRoomId: { type: String, default: '' },
  initialWorldId: { type: String, default: '' },
  initialPlayerId: { type: String, default: '' },
  initialPlayer: { type: Object, default: null },
  initialSection: {
    type: String,
    default: 'entity',
    validator: value => ['entity', 'player', 'world'].includes(value)
  }
})

const emit = defineEmits(['player-state-refreshed', 'world-state-refreshed'])

const { locale, t } = useI18n()
const rooms = ref([])
const worlds = ref([])
const players = ref([])
const entities = ref([])
const brokenArtworkUrls = ref(new Set())
const selectedRoomId = ref(props.initialRoomId)
const roomRoute = useRoute()
const selectedWorldId = ref(props.initialWorldId)
const selectedPlayerId = ref(props.initialPlayerId)
const selectedEntity = ref(null)
const activeSection = ref(props.initialSection)

const entityMode = ref('give')
const entityActionGroup = ref('entity')
const giveVariant = ref('direct')
const giveQuantityMode = ref('units')
const entityAction = ref('extinguish')
const query = ref('')
const count = ref(1)
const radius = ref(10)
const tillLayout = ref('3x3')

const playerOperation = ref('set_player_stat')
const playerOperationGroup = ref('status')
const playerStat = ref('health')
const playerStatValue = ref(100)
const playerSpeed = ref(1)
const playerLockResource = ref('health')
const playerLockValueMode = ref('absolute')
const playerLockEnabled = ref(true)
const playerLockValue = ref(1)
const playerLuckMode = ref('add')
const playerSkillMode = ref('grant_xp')
const monkeyCurseMode = ref('add')
const inventoryScope = ref('inventory')
const teleportDestinationId = ref('')
const relocationAction = ref('gather')
const relocationOtherId = ref('')
const playerAbility = ref('god_mode')
const playerAbilityEnabled = ref(true)
const playerAbilityValue = ref(4)
const recipeUnlockMode = ref('temporary')
const naughtinessMode = ref('reset')
const playerAttackMultiplier = ref(1)
const healthPenaltyMode = ref('clear')
const characterPowerAction = ref('')
const followerAction = ref('recruit')
const followerRadius = ref(25)
const beefaloTendency = ref('default')
const beefaloSaddle = ref('none')
const beefaloBell = ref('none')
const beefaloDomestication = ref(100)
const beefaloHunger = ref(50)
const beefaloObedience = ref(100)
const beefaloHealth = ref(100)
const beefaloOrnery = ref(0)
const beefaloRider = ref(0)
const beefaloPudgy = ref(0)

const worldOperation = ref('skip_days')
const worldOperationGroup = ref('time')
const skipDays = ref(1)
const timeScale = ref(1)
const precipitation = ref('dynamic')
const worldWetness = ref(0)
const worldTemperatureMode = ref('dynamic')
const worldTemperature = ref(20)
const moonPhase = ref('full')
const worldEvent = ref('lightning')
const incident = ref('hounds')
const specialEvent = ref('default')
const season = ref('autumn')
const phase = ref('day')
const daySegments = ref(10)
const duskSegments = ref(4)
const nightSegments = ref(2)

const targetsLoading = ref(false)
const playersLoading = ref(false)
const catalogLoading = ref(false)
const executing = ref(false)
const targetError = ref('')
const catalogError = ref('')
const remoteAvailable = ref(false)
const pendingConfirmation = ref(null)
const executionError = ref('')
const playerOperationEditor = ref(null)
const worldOperationEditor = ref(null)
let targetSequence = 0
let playerSequence = 0
let catalogSequence = 0
let searchTimer = 0
let confirmationTimer = 0

const currentRoom = computed(() => rooms.value.find(item => item.id === selectedRoomId.value) || null)
const currentWorld = computed(() => worlds.value.find(item => item.id === selectedWorldId.value) || null)
const initialPlayerTarget = computed(() => {
  if (!props.initialPlayer || !props.initialPlayerId) return null
  return {
    ...props.initialPlayer,
    id: props.initialPlayer.id || props.initialPlayer.user_id || props.initialPlayerId,
    name: props.initialPlayer.name || props.initialPlayer.player_name || props.initialPlayerId,
    worldId: props.initialPlayer.worldId || props.initialPlayer.world_id || props.initialWorldId,
    roomId: props.initialPlayer.roomId || props.initialPlayer.room_id || props.initialRoomId,
    online: props.initialPlayer.online === true || props.initialPlayer.status === 'online'
  }
})
const currentPlayer = computed(() => (
  players.value.find(item => item.id === selectedPlayerId.value) ||
  (initialPlayerTarget.value?.id === selectedPlayerId.value ? initialPlayerTarget.value : null)
))
const currentPlayerIsOnline = computed(() => Boolean(
  currentPlayer.value &&
  (currentPlayer.value.online === true || currentPlayer.value.status === 'online') &&
  !currentPlayer.value.presenceConflict &&
  !currentPlayer.value.presence_conflict
))
const teleportDestinations = computed(() => players.value.filter(item => item.id !== selectedPlayerId.value))
const currentTeleportDestination = computed(() => players.value.find(item => item.id === teleportDestinationId.value) || null)
const currentRelocationOther = computed(() => players.value.find(item => item.id === relocationOtherId.value) || null)
const selectedAbilityRange = computed(() => ABILITY_VALUE_RANGES[playerAbility.value] || null)
const selectedPlayerOperation = computed(() => PLAYER_OPERATIONS.find(operation => operation.id === playerOperation.value) || PLAYER_OPERATIONS[0])
const selectedWorldOperation = computed(() => WORLD_OPERATIONS.find(operation => operation.id === worldOperation.value) || WORLD_OPERATIONS[0])
const characterPowerGroups = computed(() => CHARACTER_POWER_GROUPS[currentPlayer.value?.prefab] || [])
const characterPowerActions = computed(() => CHARACTER_POWER_ACTIONS[currentPlayer.value?.prefab] || [])
const availablePlayerOperationGroups = computed(() => PLAYER_OPERATION_GROUPS.map(group => ({
  ...group,
  operations: group.operations
    .filter(id => id !== 'set_character_power' || characterPowerActions.value.length > 0)
    .map(id => PLAYER_OPERATIONS.find(operation => operation.id === id))
    .filter(Boolean)
})))
const worldOperationGroups = computed(() => WORLD_OPERATION_GROUPS.map(group => ({
  ...group,
  operations: group.operations.map(id => WORLD_OPERATIONS.find(operation => operation.id === id)).filter(Boolean)
})))
const maximumCount = computed(() => ({ give: 40, spawn: 20, remove: 100 })[entityMode.value] || 100)
const catalogKind = computed(() => ({ give: 'give', spawn: 'spawn', remove: 'remove', act: 'remove', locate: 'spawn' })[entityMode.value])
const amountLabel = computed(() => {
  if (entityMode.value === 'give') {
    if (giveVariant.value === 'direct') return t(`entityTools.catalog.${giveQuantityMode.value === 'stacks' ? 'stackCount' : 'itemCount'}`)
    return t(`entityTools.catalog.${giveVariant.value === 'materials' ? 'recipeSetCount' : 'blueprintCount'}`)
  }
  return t(entityMode.value === 'spawn' ? 'entityTools.catalog.spawnCount' : 'entityTools.catalog.maximum')
})
const amountHint = computed(() => {
  if (entityMode.value === 'give') {
    if (giveVariant.value === 'direct') return t(`entityTools.catalog.${giveQuantityMode.value === 'stacks' ? 'stackCountHint' : 'itemCountHint'}`, { max: maximumCount.value })
    return t(`entityTools.catalog.${giveVariant.value === 'materials' ? 'recipeSetCountHint' : 'blueprintCountHint'}`, { max: maximumCount.value })
  }
  return t(entityMode.value === 'spawn' ? 'entityTools.catalog.spawnCountHint' : 'entityTools.catalog.maximumHint', { max: maximumCount.value })
})
const entitySubmitLabel = computed(() => {
  if (entityMode.value !== 'give' || !selectedEntity.value) {
    return t('entityTools.actions.executeEntityOperation', {
      operation: t(`entityTools.catalog.${entityMode.value}`)
    })
  }
  const unitKey = giveVariant.value === 'direct' ? giveQuantityMode.value : giveVariant.value
  return t('entityTools.actions.giveNow', {
    entity: entityName(selectedEntity.value),
    count: count.value,
    unit: t(`entityTools.quantityUnits.${unitKey}`)
  })
})
const playerSubmitLabel = computed(() => t('entityTools.actions.executePlayerOperation', {
  operation: t(`entityTools.playerOperations.${playerOperation.value}`)
}))
const worldSubmitLabel = computed(() => t('entityTools.actions.executeWorldOperation', {
  operation: t(`entityTools.worldOperations.${worldOperation.value}`)
}))
const entityConfirmationArmed = computed(() => isConfirmationArmed('entity', buildEntityOperation()))
const playerConfirmationArmed = computed(() => isConfirmationArmed('player', buildPlayerOperation()))
const worldConfirmationArmed = computed(() => isConfirmationArmed('world', buildWorldOperation()))
const showRemoteFallback = computed(() => Boolean(query.value.trim() && !catalogLoading.value && !remoteAvailable.value))

const canExecuteEntity = computed(() => Boolean(
  currentRoom.value && currentWorld.value && currentPlayerIsOnline.value &&
  (entityMode.value === 'act' || selectedEntity.value) &&
  (['act', 'locate'].includes(entityMode.value) || validNumber(count.value, 1, maximumCount.value, true)) &&
  (['give', 'spawn', 'locate'].includes(entityMode.value) || validNumber(radius.value, 1, entityMode.value === 'act' ? 64 : 30, true)) &&
  !executing.value
))

const canExecutePlayer = computed(() => {
  if (!currentRoom.value || !currentWorld.value || !currentPlayerIsOnline.value || executing.value) return false
  if (playerOperation.value === 'set_player_stat') {
    return validNumber(playerStatValue.value, playerStat.value === 'temperature' ? -20 : 0, playerStat.value === 'temperature' ? 90 : 100)
  }
  if (playerOperation.value === 'set_player_speed') return validNumber(playerSpeed.value, -2, 100)
  if (playerOperation.value === 'set_player_lock') {
    const ranges = { health: [1, playerLockValueMode.value === 'percent' ? 100 : 999], moisture: [0, 100], temperature: [-20, 90] }
    const [minimum, maximum] = ranges[playerLockResource.value]
    return validNumber(playerLockValue.value, minimum, maximum)
  }
  if (playerOperation.value === 'teleport_player') {
    return Boolean(currentTeleportDestination.value && currentTeleportDestination.value.id !== currentPlayer.value.id)
  }
  if (playerOperation.value === 'relocate_players') {
    return relocationAction.value === 'gather' || Boolean(currentRelocationOther.value && currentRelocationOther.value.id !== currentPlayer.value.id)
  }
  if (playerOperation.value === 'set_player_ability' && selectedAbilityRange.value) {
    return validNumber(playerAbilityValue.value, selectedAbilityRange.value.min, selectedAbilityRange.value.max)
  }
  if (playerOperation.value === 'set_player_attack_multiplier') return validNumber(playerAttackMultiplier.value, 0, 99999)
  if (playerOperation.value === 'manage_followers') return validNumber(followerRadius.value, 1, 64, true)
  if (playerOperation.value === 'spawn_domesticated_beefalo' && beefaloTendency.value === 'custom') {
    return [beefaloDomestication, beefaloHunger, beefaloObedience, beefaloHealth, beefaloOrnery, beefaloRider, beefaloPudgy]
      .every(input => validNumber(input.value, 0, 100))
  }
  if (playerOperation.value === 'set_character_power') return characterPowerActions.value.includes(characterPowerAction.value)
  return true
})

const canExecuteWorld = computed(() => {
  if (!currentRoom.value || !currentWorld.value || executing.value) return false
  if (worldOperation.value === 'skip_days') return validNumber(skipDays.value, 1, 200, true)
  if (worldOperation.value === 'set_time_scale') return validNumber(timeScale.value, 0, 20)
  if (worldOperation.value === 'set_world_wetness') return validNumber(worldWetness.value, 0, 100)
  if (worldOperation.value === 'set_world_temperature' && worldTemperatureMode.value === 'fixed') return validNumber(worldTemperature.value, -25, 95)
  if (worldOperation.value === 'set_clock_segments') {
    return validNumber(daySegments.value, 0, 16, true) &&
      validNumber(duskSegments.value, 0, 16, true) &&
      validNumber(nightSegments.value, 0, 16, true) &&
      Number(daySegments.value) + Number(duskSegments.value) + Number(nightSegments.value) === 16
  }
  if (worldOperation.value === 'trigger_world_event' && ['lightning', 'meteor_shower'].includes(worldEvent.value)) return currentPlayerIsOnline.value
  if (worldOperation.value === 'trigger_incident') return currentPlayerIsOnline.value
  return true
})

function validNumber(value, minimum, maximum, integer = false) {
  const number = Number(value)
  return Number.isFinite(number) && number >= minimum && number <= maximum && (!integer || Number.isInteger(number))
}

function entityName(entity) {
  if (!entity) return ''
  if (locale.value === 'zh-CN') return entity.nameZhCN || entity.nameEn || entity.id
  return entity.nameEn || entity.nameZhCN || entity.id
}

function playerName(player) {
  return player?.name || player?.id || ''
}

function targetWorldLabel() {
  return `${currentRoom.value?.name || ''} / ${currentWorld.value?.name || ''}`
}

function entityArtworkUrl(entity) {
  const artworkUrl = entity?.common
    ? `/static/entities/${entity.id}.webp`
    : entity?.artworkUrl || ''
  return brokenArtworkUrls.value.has(artworkUrl) ? '' : artworkUrl
}

function markBrokenArtwork(event) {
  const artworkUrl = event.currentTarget.getAttribute('src') || ''
  if (artworkUrl) brokenArtworkUrls.value = new Set([...brokenArtworkUrls.value, artworkUrl])
}

async function loadRooms() {
  const sequence = ++targetSequence
  targetsLoading.value = true
  targetError.value = ''
  try {
    const result = await roomsV2API.list()
    if (sequence !== targetSequence) return
    rooms.value = result.items || []
    if (!rooms.value.some(room => room.id === selectedRoomId.value)) {
      selectedRoomId.value = preferredRoomId(rooms.value, props.initialRoomId || (!props.embedded ? roomRoute.query.roomId : undefined))
    }
    if (!selectedRoomId.value) {
      worlds.value = []
      players.value = []
    }
  } catch (error) {
    if (sequence !== targetSequence) return
    rooms.value = []
    worlds.value = []
    players.value = []
    targetError.value = t('entityTools.feedback.loadFailed', { error: error?.message || t('common.errors.unknown') })
  } finally {
    if (sequence === targetSequence) targetsLoading.value = false
  }
}

async function loadWorlds() {
  const roomId = selectedRoomId.value
  const preferredWorldId = props.lockedTarget ? props.initialWorldId : selectedWorldId.value
  const sequence = ++targetSequence
  selectedWorldId.value = ''
  selectedPlayerId.value = ''
  worlds.value = []
  players.value = []
  if (!roomId) return
  targetsLoading.value = true
  targetError.value = ''
  try {
    const result = await roomsV2API.worlds(roomId)
    if (sequence !== targetSequence || roomId !== selectedRoomId.value) return
    worlds.value = result.items || []
    selectedWorldId.value = worlds.value.find(world => world.id === preferredWorldId)?.id || worlds.value[0]?.id || ''
  } catch (error) {
    if (sequence !== targetSequence) return
    targetError.value = t('entityTools.feedback.loadFailed', { error: error?.message || t('common.errors.unknown') })
  } finally {
    if (sequence === targetSequence) targetsLoading.value = false
  }
}

async function loadPlayers() {
  const roomId = selectedRoomId.value
  const worldId = selectedWorldId.value
  const preferredPlayerId = props.lockedTarget ? props.initialPlayerId : selectedPlayerId.value
  const sequence = ++playerSequence
  selectedPlayerId.value = ''
  teleportDestinationId.value = ''
  relocationOtherId.value = ''
  players.value = []
  if (!roomId || !worldId) return
  playersLoading.value = true
  targetError.value = ''
  try {
    const result = await playersV2API.list(roomId, { status: 'online', worldId, limit: 100, offset: 0 })
    if (sequence !== playerSequence || roomId !== selectedRoomId.value || worldId !== selectedWorldId.value) return
    players.value = (result.items || []).filter(player => player.online && player.worldId === worldId)
    selectedPlayerId.value = players.value.find(player => player.id === preferredPlayerId)?.id ||
      (props.lockedTarget ? preferredPlayerId : players.value[0]?.id) || ''
  } catch (error) {
    if (sequence !== playerSequence) return
    targetError.value = t('entityTools.feedback.loadFailed', { error: error?.message || t('common.errors.unknown') })
  } finally {
    if (sequence === playerSequence) playersLoading.value = false
  }
}

async function refreshTargets() {
  await loadRooms()
  if (selectedRoomId.value) await loadWorlds()
}

async function loadCatalog() {
  const searchQuery = query.value.trim()
  const requestedKind = catalogKind.value
  const sequence = ++catalogSequence
  catalogLoading.value = true
  catalogError.value = ''
  try {
    let result
    try {
      result = await entityCatalogV2API.search({ query: searchQuery, kind: requestedKind, limit: 120 })
    } catch (error) {
      if (error?.code !== 'INVALID_ENTITY_SEARCH') throw error
      result = await entityCatalogV2API.search({ query: searchQuery, kind: requestedKind, limit: 20 })
    }
    if (sequence !== catalogSequence || requestedKind !== catalogKind.value || searchQuery !== query.value.trim()) return
    entities.value = result.items || []
    remoteAvailable.value = Boolean(result.remoteAvailable)
    if (selectedEntity.value && !entities.value.some(item => item.key === selectedEntity.value.key)) {
      selectedEntity.value = null
    }
  } catch (error) {
    if (sequence !== catalogSequence) return
    entities.value = []
    remoteAvailable.value = false
    catalogError.value = t('entityTools.feedback.catalogFailed', { error: error?.message || t('common.errors.unknown') })
  } finally {
    if (sequence === catalogSequence) catalogLoading.value = false
  }
}

function scheduleCatalogSearch() {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(loadCatalog, 300)
}

function selectEntityMode(value) {
  if (value && value !== entityMode.value) entityMode.value = value
}

async function selectPlayerOperation(value) {
  if (!value) return
  playerOperation.value = value
  await resetPlayerOperationEditorScroll()
  revealOperationEditor(playerOperationEditor)
}

function selectWorldOperation(value) {
  if (!value) return
  worldOperation.value = value
  revealOperationEditor(worldOperationEditor)
}

async function selectPlayerOperationGroup(value) {
  if (!value) return
  playerOperationGroup.value = value
  const operations = availablePlayerOperationGroups.value.find(group => group.id === value)?.operations || []
  if (!operations.some(operation => operation.id === playerOperation.value)) {
    playerOperation.value = operations[0]?.id || playerOperation.value
  }
  await resetPlayerOperationEditorScroll()
  revealOperationEditor(playerOperationEditor)
}

function selectWorldOperationGroup(value) {
  if (!value) return
  worldOperationGroup.value = value
  const operations = worldOperationGroups.value.find(group => group.id === value)?.operations || []
  if (!operations.some(operation => operation.id === worldOperation.value)) {
    worldOperation.value = operations[0]?.id || worldOperation.value
  }
  revealOperationEditor(worldOperationEditor)
}

async function revealOperationEditor(editor) {
  if (!window.matchMedia?.('(max-width: 1100px)').matches) return
  await nextTick()
  editor.value?.scrollIntoView({
    behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start'
  })
}

async function resetPlayerOperationEditorScroll() {
  await nextTick()
  const fields = playerOperationEditor.value?.querySelector('.operation-editor-fields')
  if (fields) fields.scrollTop = 0
}

function selectEntityAction(value) {
  if (value) entityAction.value = value
}

function selectGiveVariant(value) {
  if (value) giveVariant.value = value
}

function selectTillLayout(value) {
  if (value) tillLayout.value = value
}

function selectPlayerAbility(value) {
  if (value) playerAbility.value = value
}

function selectRelocationAction(value) {
  if (value) relocationAction.value = value
}

function selectFollowerAction(value) {
  if (value) followerAction.value = value
}

function selectCharacterPower(value) {
  if (value) characterPowerAction.value = value
}

function selectWorldEvent(value) {
  if (value) worldEvent.value = value
}

function selectSpecialEvent(value) {
  if (value) specialEvent.value = value
}

function selectIncident(value) {
  if (value) incident.value = value
}

function selectPreset(name, value) {
  if (!value) return
  const selections = {
    playerLockResource,
    playerLockValueMode,
    playerLuckMode,
    playerSkillMode,
    monkeyCurseMode,
    naughtinessMode,
    recipeUnlockMode,
    healthPenaltyMode,
    beefaloTendency,
    beefaloSaddle,
    beefaloBell
  }
  if (selections[name]) selections[name].value = value
}

function selectPlayerStat(value) {
  if (value) playerStat.value = value
}

function selectInventoryScope(value) {
  if (value) inventoryScope.value = value
}

function selectPrecipitation(value) {
  if (value) precipitation.value = value
}

function selectMoonPhase(value) {
  if (value) moonPhase.value = value
}

function selectSeason(value) {
  if (value) season.value = value
}

function selectPhase(value) {
  if (value) phase.value = value
}

function selectWorldTemperatureMode(value) {
  if (value) worldTemperatureMode.value = value
}

function selectEntity(entity) {
  selectedEntity.value = entity
}

function selectGiveQuantityMode(value) {
  if (value) giveQuantityMode.value = value
}

function summary(label, value) {
  return { label, value: String(value) }
}

function buildEntityOperation() {
  if (!canExecuteEntity.value) return null
  const player = currentPlayer.value
  const entity = selectedEntity.value
  const quantity = Number(count.value)
  const commandIds = {
    give: { direct: 'give_item', materials: 'give_recipe_materials', blueprint: 'give_blueprint' }[giveVariant.value],
    spawn: 'spawn_entity',
    remove: 'remove_nearby_entities',
    act: 'act_nearby_entities',
    locate: 'teleport_to_nearest_entity'
  }
  let argumentsMap = { player_id: player.id, prefab: entity?.id, count: quantity }
  if (entityMode.value === 'give' && giveVariant.value === 'direct') {
    argumentsMap.quantity_mode = giveQuantityMode.value
  } else if (entityMode.value === 'remove') {
    argumentsMap = { player_id: player.id, prefab: entity.id, radius: Number(radius.value), maximum: quantity }
  } else if (entityMode.value === 'act') {
    argumentsMap = {
      player_id: player.id,
      action: entityAction.value,
      radius: Number(radius.value)
    }
    if (entity) argumentsMap.prefab = entity.id
    if (entityAction.value === 'till') argumentsMap.layout = tillLayout.value
  } else if (entityMode.value === 'locate') {
    argumentsMap = { player_id: player.id, prefab: entity.id }
  }
  const operation = t(`entityTools.catalog.${entityMode.value}`)
  const details = [summary(t('entityTools.confirm.operation'), operation)]
  if (entityMode.value === 'give') details.push(summary(t('entityTools.catalog.giveType'), t(`entityTools.giveVariants.${giveVariant.value}`)))
  if (entityMode.value === 'give' && giveVariant.value === 'direct') {
    details.push(summary(t('entityTools.catalog.quantityMode'), t(`entityTools.quantityModes.${giveQuantityMode.value}`)))
  }
  if (entity) {
    details.push(summary(t(entityMode.value === 'act' ? 'entityTools.confirm.filter' : 'entityTools.confirm.entity'), `${entityName(entity)} · ${entity.id}`))
  } else {
    details.push(summary(t('entityTools.confirm.filter'), t('entityTools.catalog.allApplicable')))
  }
  if (entityMode.value === 'act') {
    details.push(summary(t('entityTools.confirm.entityAction'), t(`entityTools.entityActions.${entityAction.value}`)))
  }
  if (['give', 'spawn', 'remove'].includes(entityMode.value)) details.push(summary(amountLabel.value, quantity))
  if (entityMode.value === 'remove' || entityMode.value === 'act') {
    details.push(summary(t('entityTools.confirm.radius'), radius.value))
  }
  details.push(
    summary(t('entityTools.confirm.target'), `${playerName(player)} · ${player.id}`),
    summary(t('entityTools.confirm.world'), targetWorldLabel())
  )
  return {
    commandId: commandIds[entityMode.value],
    arguments: argumentsMap,
    operation,
    description: t(`entityTools.confirm.entityDescriptions.${entityMode.value === 'give' ? `give_${giveVariant.value}` : entityMode.value}`),
    summary: details,
    successTarget: playerName(player)
  }
}

function buildPlayerOperation() {
  if (!canExecutePlayer.value) return null
  const player = currentPlayer.value
  const operation = t(`entityTools.playerOperations.${playerOperation.value}`)
  const details = [
    summary(t('entityTools.confirm.operation'), operation),
    summary(t('entityTools.confirm.target'), `${playerName(player)} · ${player.id}`)
  ]
  let argumentsMap = { player_id: player.id }
  if (playerOperation.value === 'set_player_stat') {
    argumentsMap = { ...argumentsMap, stat: playerStat.value, value: Number(playerStatValue.value) }
    details.push(
      summary(t('entityTools.player.stat'), t(`entityTools.stats.${playerStat.value}`)),
      summary(t('entityTools.player.value'), playerStat.value === 'temperature'
        ? `${playerStatValue.value} °C`
        : `${playerStatValue.value}%`)
    )
  } else if (playerOperation.value === 'set_player_speed') {
    argumentsMap = { ...argumentsMap, multiplier: Number(playerSpeed.value) }
    details.push(summary(t('entityTools.player.speed'), `${playerSpeed.value}×`))
  } else if (playerOperation.value === 'set_player_lock') {
    argumentsMap = {
      ...argumentsMap,
      resource: playerLockResource.value,
      value_mode: playerLockResource.value === 'health' ? playerLockValueMode.value : 'absolute',
      enabled: playerLockEnabled.value,
      value: Number(playerLockValue.value)
    }
    details.push(
      summary(t('entityTools.player.lockResource'), t(`entityTools.lockResources.${playerLockResource.value}`)),
      summary(t('entityTools.player.lockValue'), `${playerLockValue.value}${playerLockResource.value === 'health' && playerLockValueMode.value === 'percent' ? '%' : ''}`),
      summary(t('entityTools.player.state'), t(`entityTools.states.${playerLockEnabled.value ? 'enabled' : 'disabled'}`))
    )
  } else if (playerOperation.value === 'adjust_player_luck') {
    argumentsMap = { ...argumentsMap, mode: playerLuckMode.value }
    details.push(summary(t('entityTools.player.luckMode'), t(`entityTools.luckModes.${playerLuckMode.value}`)))
  } else if (playerOperation.value === 'manage_player_skills') {
    argumentsMap = { ...argumentsMap, mode: playerSkillMode.value }
    details.push(summary(t('entityTools.player.skillMode'), t(`entityTools.skillModes.${playerSkillMode.value}`)))
  } else if (playerOperation.value === 'set_monkey_curse') {
    argumentsMap = { ...argumentsMap, mode: monkeyCurseMode.value }
    details.push(summary(t('entityTools.player.monkeyCurseMode'), t(`entityTools.monkeyCurseModes.${monkeyCurseMode.value}`)))
  } else if (playerOperation.value === 'clear_player_inventory') {
    argumentsMap = { ...argumentsMap, scope: inventoryScope.value }
    details.push(summary(t('entityTools.player.scope'), t(`entityTools.inventoryScopes.${inventoryScope.value}`)))
  } else if (playerOperation.value === 'clear_player_naughtiness') {
    argumentsMap = { ...argumentsMap, mode: naughtinessMode.value }
    details.push(summary(t('entityTools.player.naughtinessMode'), t(`entityTools.naughtinessModes.${naughtinessMode.value}`)))
  } else if (playerOperation.value === 'teleport_player') {
    const destination = currentTeleportDestination.value
    argumentsMap = { ...argumentsMap, destination_id: destination.id }
    details.push(summary(t('entityTools.player.destination'), `${playerName(destination)} · ${destination.id}`))
  } else if (playerOperation.value === 'relocate_players') {
    const other = currentRelocationOther.value
    argumentsMap = { ...argumentsMap, action: relocationAction.value }
    if (relocationAction.value !== 'gather') argumentsMap.other_player_id = other.id
    details.push(summary(t('entityTools.player.relocationAction'), t(`entityTools.relocationActions.${relocationAction.value}`)))
    if (other && relocationAction.value !== 'gather') {
      details.push(summary(t('entityTools.player.otherPlayer'), `${playerName(other)} · ${other.id}`))
    }
  } else if (playerOperation.value === 'set_player_ability') {
    argumentsMap = { ...argumentsMap, ability: playerAbility.value, enabled: playerAbilityEnabled.value }
    if (selectedAbilityRange.value) argumentsMap.value = Number(playerAbilityValue.value)
    if (playerAbility.value === 'unlock_recipes') argumentsMap.recipe_mode = recipeUnlockMode.value
    details.push(
      summary(t('entityTools.player.ability'), t(`entityTools.playerAbilities.${playerAbility.value}`)),
      summary(t('entityTools.player.state'), t(`entityTools.states.${playerAbilityEnabled.value ? 'enabled' : 'disabled'}`))
    )
    if (selectedAbilityRange.value) details.push(summary(t('entityTools.player.abilityValue'), playerAbilityValue.value))
    if (playerAbility.value === 'unlock_recipes') details.push(summary(t('entityTools.player.recipeUnlockMode'), t(`entityTools.recipeUnlockModes.${recipeUnlockMode.value}`)))
  } else if (playerOperation.value === 'set_player_attack_multiplier') {
    argumentsMap = { ...argumentsMap, multiplier: Number(playerAttackMultiplier.value) }
    details.push(summary(t('entityTools.player.attackMultiplier'), `${playerAttackMultiplier.value}×`))
  } else if (playerOperation.value === 'set_health_penalty') {
    argumentsMap = { ...argumentsMap, mode: healthPenaltyMode.value }
    details.push(summary(t('entityTools.player.penalty'), t(`entityTools.healthPenaltyModes.${healthPenaltyMode.value}`)))
  } else if (playerOperation.value === 'manage_followers') {
    argumentsMap = { ...argumentsMap, action: followerAction.value, radius: Number(followerRadius.value) }
    details.push(
      summary(t('entityTools.player.followerAction'), t(`entityTools.followerActions.${followerAction.value}`)),
      summary(t('entityTools.confirm.radius'), followerRadius.value)
    )
  } else if (playerOperation.value === 'spawn_domesticated_beefalo') {
    argumentsMap = { ...argumentsMap, tendency: beefaloTendency.value }
    details.push(summary(t('entityTools.player.beefaloTendency'), t(`entityTools.beefaloTendencies.${beefaloTendency.value}`)))
    if (beefaloTendency.value === 'custom') {
      argumentsMap = {
        ...argumentsMap,
        saddle: beefaloSaddle.value,
        bell: beefaloBell.value,
        domestication: Number(beefaloDomestication.value),
        hunger: Number(beefaloHunger.value),
        obedience: Number(beefaloObedience.value),
        health: Number(beefaloHealth.value),
        ornery: Number(beefaloOrnery.value),
        rider: Number(beefaloRider.value),
        pudgy: Number(beefaloPudgy.value)
      }
      details.push(
        summary(t('entityTools.player.beefaloSaddle'), t(`entityTools.beefaloSaddles.${beefaloSaddle.value}`)),
        summary(t('entityTools.player.beefaloBell'), t(`entityTools.beefaloBells.${beefaloBell.value}`)),
        summary(t('entityTools.player.beefaloCoreStats'), `${beefaloDomestication.value}% / ${beefaloHunger.value}% / ${beefaloObedience.value}% / ${beefaloHealth.value}%`),
        summary(t('entityTools.player.beefaloTendencyWeights'), `${beefaloOrnery.value} / ${beefaloRider.value} / ${beefaloPudgy.value}`)
      )
    }
  } else if (playerOperation.value === 'set_character_power') {
    argumentsMap = { ...argumentsMap, action: characterPowerAction.value }
    details.push(summary(t('entityTools.player.characterPower'), t(`entityTools.characterPowers.${characterPowerAction.value}`)))
  }
  details.push(summary(t('entityTools.confirm.world'), targetWorldLabel()))
  return {
    commandId: playerOperation.value,
    arguments: argumentsMap,
    refreshPlayerState: true,
    playerApiAbility: playerOperation.value === 'set_player_ability' && PLAYER_API_ABILITIES.has(playerAbility.value)
      ? playerAbility.value
      : '',
    operation,
    description: t('entityTools.confirm.playerDescription'),
    summary: details,
    successTarget: playerName(player)
  }
}

function buildWorldOperation() {
  if (!canExecuteWorld.value) return null
  const operation = t(`entityTools.worldOperations.${worldOperation.value}`)
  const details = [summary(t('entityTools.confirm.operation'), operation)]
  let argumentsMap = {}
  if (worldOperation.value === 'skip_days') {
    argumentsMap = { days: Number(skipDays.value) }
    details.push(summary(t('entityTools.world.days'), skipDays.value))
  } else if (worldOperation.value === 'set_time_scale') {
    argumentsMap = { multiplier: Number(timeScale.value) }
    details.push(summary(t('entityTools.world.timeScale'), `${timeScale.value}×`))
  } else if (worldOperation.value === 'set_precipitation') {
    argumentsMap = { mode: precipitation.value }
    details.push(summary(t('entityTools.world.precipitation'), t(`entityTools.precipitationModes.${precipitation.value}`)))
  } else if (worldOperation.value === 'set_world_wetness') {
    argumentsMap = { value: Number(worldWetness.value) }
    details.push(summary(t('entityTools.world.wetness'), worldWetness.value))
  } else if (worldOperation.value === 'set_world_temperature') {
    argumentsMap = { mode: worldTemperatureMode.value }
    if (worldTemperatureMode.value === 'fixed') argumentsMap.value = Number(worldTemperature.value)
    details.push(summary(t('entityTools.world.temperatureMode'), t(`entityTools.temperatureModes.${worldTemperatureMode.value}`)))
    if (worldTemperatureMode.value === 'fixed') details.push(summary(t('entityTools.world.temperature'), `${worldTemperature.value} °C`))
  } else if (worldOperation.value === 'set_moon_phase') {
    argumentsMap = { phase: moonPhase.value }
    details.push(summary(t('entityTools.world.moonPhase'), t(`entityTools.moonPhases.${moonPhase.value}`)))
  } else if (worldOperation.value === 'trigger_world_event') {
    argumentsMap = { event: worldEvent.value }
    if (['lightning', 'meteor_shower'].includes(worldEvent.value)) argumentsMap.player_id = currentPlayer.value.id
    details.push(summary(t('entityTools.world.event'), t(`entityTools.worldEvents.${worldEvent.value}`)))
    if (['lightning', 'meteor_shower'].includes(worldEvent.value)) {
      details.push(summary(t('entityTools.confirm.target'), `${playerName(currentPlayer.value)} · ${currentPlayer.value.id}`))
    }
  } else if (worldOperation.value === 'set_special_event') {
    argumentsMap = { event: specialEvent.value }
    details.push(summary(t('entityTools.world.specialEvent'), t(`entityTools.specialEvents.${specialEvent.value}`)))
  } else if (worldOperation.value === 'trigger_incident') {
    argumentsMap = { incident: incident.value, player_id: currentPlayer.value.id }
    details.push(
      summary(t('entityTools.world.incident'), t(`entityTools.incidents.${incident.value}`)),
      summary(t('entityTools.confirm.target'), `${playerName(currentPlayer.value)} · ${currentPlayer.value.id}`)
    )
  } else if (worldOperation.value === 'set_season') {
    argumentsMap = { season: season.value }
    details.push(summary(t('entityTools.world.season'), t(`entityTools.seasons.${season.value}`)))
  } else if (worldOperation.value === 'set_phase') {
    argumentsMap = { phase: phase.value }
    details.push(summary(t('entityTools.world.phase'), t(`entityTools.phases.${phase.value}`)))
  } else if (worldOperation.value === 'set_clock_segments') {
    argumentsMap = {
      day: Number(daySegments.value),
      dusk: Number(duskSegments.value),
      night: Number(nightSegments.value)
    }
    details.push(summary(t('entityTools.world.clockSegments'), `${daySegments.value} / ${duskSegments.value} / ${nightSegments.value}`))
  }
  details.push(summary(t('entityTools.confirm.world'), targetWorldLabel()))
  return {
    commandId: worldOperation.value,
    arguments: argumentsMap,
    refreshWorldState: true,
    operation,
    description: t('entityTools.confirm.worldDescription'),
    summary: details,
    successTarget: targetWorldLabel()
  }
}

function operationKey(operation) {
  if (!operation) return ''
  return JSON.stringify([
    selectedRoomId.value,
    selectedWorldId.value,
    operation.commandId || operation.playerApiAbility || '',
    operation.arguments || {}
  ])
}

function isConfirmationArmed(section, operation) {
  return Boolean(
    operation &&
    pendingConfirmation.value?.section === section &&
    pendingConfirmation.value?.key === operationKey(operation)
  )
}

function clearPendingConfirmation() {
  window.clearTimeout(confirmationTimer)
  confirmationTimer = 0
  pendingConfirmation.value = null
}

async function submitOperation(section, operation, confirmationRequired) {
  if (!operation) return
  executionError.value = ''
  if (confirmationRequired && !isConfirmationArmed(section, operation)) {
    window.clearTimeout(confirmationTimer)
    pendingConfirmation.value = { section, key: operationKey(operation) }
    confirmationTimer = window.setTimeout(clearPendingConfirmation, CONFIRMATION_WINDOW_MS)
    return
  }
  clearPendingConfirmation()
  await executeOperation(operation)
}

async function submitEntityOperation() {
  const operation = buildEntityOperation()
  await submitOperation('entity', operation, ENTITY_CONFIRMATION_MODES.has(entityMode.value))
}

async function submitPlayerOperation() {
  const operation = buildPlayerOperation()
  await submitOperation('player', operation, PLAYER_CONFIRMATION_OPERATIONS.has(playerOperation.value))
}

async function submitWorldOperation() {
  const operation = buildWorldOperation()
  await submitOperation('world', operation, WORLD_CONFIRMATION_OPERATIONS.has(worldOperation.value))
}

async function executeOperation(operation) {
  const room = currentRoom.value
  const world = currentWorld.value
  if (!operation || !room || !world || executing.value) return
  executing.value = true
  executionError.value = ''
  try {
    let refreshError = null
    if (operation.playerApiAbility) {
      const player = {
        user_id: operation.arguments.player_id,
        room_id: room.id,
        world_id: world.id
      }
      if (operation.playerApiAbility === 'god_mode') {
        await playerApi.setGodMode(player, operation.arguments.enabled, null)
      } else {
        await playerApi.setCreativeMode(player, operation.arguments.enabled, null)
      }
    } else {
      await commandApi.executeCommand(
        `${room.id}::${world.id}`,
        operation.commandId,
        operation.arguments,
        room.name
      )
    }
    if (operation.refreshWorldState) {
      try {
        const refreshed = await worldStatesV2API.refreshWorld(room.id, world.id)
        if (!refreshed?.snapshot?.worldId) throw new Error(t('entityTools.feedback.refreshMissing'))
        emit('world-state-refreshed', refreshed.snapshot)
      } catch (error) {
        refreshError = error
      }
    }
    if (operation.refreshPlayerState) {
      try {
        await playerApi.updatePlayerInfo({
          archive_name: room.name,
          world_name: world.name
        })
        emit('player-state-refreshed', {
          roomId: room.id,
          worldId: world.id,
          playerId: operation.arguments.player_id
        })
      } catch (error) {
        refreshError = error
      }
    }
    if (refreshError) {
      toast.warning(t('entityTools.feedback.refreshFailed', {
        operation: operation.operation,
        target: operation.successTarget,
        error: refreshError?.message || t('common.errors.unknown')
      }))
    } else {
      toast.success(t('entityTools.feedback.succeeded', {
        operation: operation.operation,
        target: operation.successTarget
      }))
    }
  } catch (error) {
    executionError.value = t('entityTools.feedback.executeFailed', {
      error: error?.detail || error?.message || t('common.errors.unknown')
    })
    toast.error(executionError.value)
  } finally {
    executing.value = false
  }
}

watch(selectedRoomId, loadWorlds)
watch(selectedWorldId, loadPlayers)
watch(selectedPlayerId, value => {
  if (!players.value.some(player => player.id === teleportDestinationId.value && player.id !== value)) {
    teleportDestinationId.value = players.value.find(player => player.id !== value)?.id || ''
  }
  if (!players.value.some(player => player.id === relocationOtherId.value && player.id !== value)) {
    relocationOtherId.value = players.value.find(player => player.id !== value)?.id || ''
  }
  const actions = CHARACTER_POWER_ACTIONS[currentPlayer.value?.prefab] || []
  characterPowerAction.value = actions[0] || ''
  if (playerOperation.value === 'set_character_power' && actions.length === 0) {
    playerOperation.value = 'set_player_stat'
    playerOperationGroup.value = 'status'
  }
})
watch(query, scheduleCatalogSearch)
watch(entityMode, value => {
  count.value = value === 'give' || value === 'spawn' ? 1 : 20
  radius.value = 10
  selectedEntity.value = null
  loadCatalog()
})
watch(entityActionGroup, value => {
  const actions = ENTITY_ACTION_GROUPS.find(group => group.id === value)?.actions || []
  if (!actions.includes(entityAction.value)) entityAction.value = actions[0] || ''
})
watch(playerStat, value => {
  playerStatValue.value = value === 'temperature' ? 35 : 100
})
watch(playerLockResource, value => {
  if (value !== 'health') playerLockValueMode.value = 'absolute'
  playerLockValue.value = { health: 1, moisture: 0, temperature: 35 }[value]
})
watch(playerLockValueMode, value => {
  if (playerLockResource.value === 'health') playerLockValue.value = value === 'percent' ? 25 : 1
})
watch(playerAbility, value => {
  const range = ABILITY_VALUE_RANGES[value]
  if (range) playerAbilityValue.value = range.default
})
onMounted(async () => {
  await loadRooms()
  if (selectedRoomId.value && worlds.value.length === 0) await loadWorlds()
  loadCatalog()
})

onBeforeUnmount(() => {
  window.clearTimeout(searchTimer)
  window.clearTimeout(confirmationTimer)
  targetSequence += 1
  playerSequence += 1
  catalogSequence += 1
})
</script>

<template>
  <div class="game-tools-page" :class="{ 'game-tools-page--embedded': embedded }">
    <header v-if="!embedded" class="game-tools-header">
      <h1>{{ t('entityTools.title') }}</h1>
      <FieldSet class="target-toolbar">
        <FieldLegend variant="label" class="sr-only">{{ t('entityTools.target.title') }}</FieldLegend>
        <FieldGroup class="target-toolbar-fields">
          <RoomScopeSelect v-model="selectedRoomId" :rooms="rooms" :loading="targetsLoading" />
          <Field>
            <FieldLabel>{{ t('entityTools.target.world') }}</FieldLabel>
            <UiSelect v-model="selectedWorldId" :disabled="targetsLoading || worlds.length === 0">
              <SelectTrigger size="sm" class="w-full">
                <SelectValue :placeholder="selectedRoomId && !targetsLoading && worlds.length === 0 ? t('entityTools.target.noWorlds') : t('entityTools.target.selectWorld')" />
              </SelectTrigger>
              <SelectContent><SelectGroup><SelectItem v-for="world in worlds" :key="world.id" :value="world.id">{{ world.name }}</SelectItem></SelectGroup></SelectContent>
            </UiSelect>
          </Field>
          <Field>
            <FieldLabel>{{ t('entityTools.target.player') }}</FieldLabel>
            <UiSelect v-model="selectedPlayerId" :disabled="playersLoading || players.length === 0">
              <SelectTrigger size="sm" class="w-full">
                <SelectValue :placeholder="selectedWorldId && !playersLoading && players.length === 0 ? t('entityTools.target.noPlayers') : t('entityTools.target.selectPlayer')" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem v-for="player in players" :key="player.id" :value="player.id">
                    {{ playerName(player) }} · {{ player.id }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </UiSelect>
          </Field>
        </FieldGroup>
      </FieldSet>
      <UiButton
        variant="outline"
        size="icon-sm"
        :title="t('entityTools.target.refresh')"
        :aria-label="t('entityTools.target.refresh')"
        :disabled="targetsLoading || playersLoading"
        @click="refreshTargets"
      >
        <Spinner v-if="targetsLoading || playersLoading" />
        <RefreshCw v-else />
      </UiButton>
    </header>

    <Alert v-if="targetError" variant="destructive">
      <TriangleAlert />
      <AlertTitle>{{ t('entityTools.target.title') }}</AlertTitle>
      <AlertDescription>{{ targetError }}</AlertDescription>
    </Alert>

    <Alert v-else-if="embedded && currentPlayer && !currentPlayerIsOnline">
      <TriangleAlert />
      <AlertTitle>{{ t('entityTools.target.offlineTitle') }}</AlertTitle>
      <AlertDescription>{{ t('entityTools.target.offlineDescription', { player: playerName(currentPlayer) }) }}</AlertDescription>
    </Alert>

    <Alert v-if="executionError" variant="destructive" role="alert">
      <TriangleAlert />
      <AlertTitle>{{ t('entityTools.feedback.executeFailedTitle') }}</AlertTitle>
      <AlertDescription>{{ executionError }}</AlertDescription>
    </Alert>

    <Tabs v-model="activeSection" class="tools-workspace">
        <TabsList class="section-tabs-list">
          <TabsTrigger value="entity"><Boxes data-icon="inline-start" />{{ t('entityTools.sections.entity') }}</TabsTrigger>
          <TabsTrigger value="player"><UserRound data-icon="inline-start" />{{ t('entityTools.sections.player') }}</TabsTrigger>
          <TabsTrigger value="world"><SunMedium data-icon="inline-start" />{{ t('entityTools.sections.world') }}</TabsTrigger>
        </TabsList>

        <TabsContent value="entity">
          <Card size="sm">
            <CardHeader class="section-card-header">
              <CardTitle>{{ t('entityTools.catalog.title') }}</CardTitle>
              <ToggleGroup :model-value="entityMode" type="single" variant="outline" class="entity-mode-toggle" @update:model-value="selectEntityMode">
                <ToggleGroupItem value="give"><PackagePlus data-icon="inline-start" />{{ t('entityTools.catalog.give') }}</ToggleGroupItem>
                <ToggleGroupItem value="spawn"><PawPrint data-icon="inline-start" />{{ t('entityTools.catalog.spawn') }}</ToggleGroupItem>
                <ToggleGroupItem value="remove"><Trash2 data-icon="inline-start" />{{ t('entityTools.catalog.remove') }}</ToggleGroupItem>
                <ToggleGroupItem value="act"><Wrench data-icon="inline-start" />{{ t('entityTools.catalog.act') }}</ToggleGroupItem>
                <ToggleGroupItem value="locate"><Navigation data-icon="inline-start" />{{ t('entityTools.catalog.locate') }}</ToggleGroupItem>
              </ToggleGroup>
            </CardHeader>
            <CardContent class="catalog-content">
              <Alert v-if="entityMode === 'act'">
                <Wrench />
                <AlertTitle>{{ t('entityTools.catalog.batchTitle') }}</AlertTitle>
                <AlertDescription>{{ selectedEntity ? t('entityTools.catalog.filteredBatch', { prefab: selectedEntity.id }) : t('entityTools.catalog.unfilteredBatch') }}</AlertDescription>
              </Alert>
              <InputGroup>
                <InputGroupAddon><Search /></InputGroupAddon>
                <InputGroupInput v-model="query" :placeholder="t('entityTools.catalog.search')" maxlength="100" />
                <InputGroupAddon v-if="catalogLoading || query" align="inline-end">
                  <Spinner v-if="catalogLoading" />
                  <InputGroupButton v-else :aria-label="t('entityTools.catalog.clearSearch')" @click="query = ''">
                    <X />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>

              <Alert v-if="catalogError" variant="destructive">
                <TriangleAlert />
                <AlertDescription>{{ catalogError }}</AlertDescription>
              </Alert>
              <Alert v-else-if="showRemoteFallback">
                <TriangleAlert />
                <AlertDescription>{{ t('entityTools.catalog.builtinFallback') }}</AlertDescription>
              </Alert>

              <div v-if="catalogLoading && entities.length === 0" class="catalog-loading">
                <Spinner />
                <span>{{ t('entityTools.catalog.searching') }}</span>
              </div>
              <ScrollArea v-else-if="entities.length > 0" class="entity-results-scroll">
                <div class="entity-grid">
                  <button
                    v-for="entity in entities"
                    :key="entity.key"
                    type="button"
                    class="entity-option"
                    :class="{ 'entity-option--selected': selectedEntity?.key === entity.key }"
                    :aria-pressed="selectedEntity?.key === entity.key"
                    @click="selectEntity(entity)"
                  >
                    <span class="entity-artwork">
                      <img v-if="entityArtworkUrl(entity)" :src="entityArtworkUrl(entity)" :alt="entityName(entity)" loading="lazy" @error="markBrokenArtwork">
                      <Box v-else />
                    </span>
                    <span class="entity-copy">
                      <strong>{{ entityName(entity) }}</strong>
                      <code>{{ entity.id }}</code>
                    </span>
                    <Badge :variant="selectedEntity?.key === entity.key ? 'default' : entity.common ? 'secondary' : 'outline'">
                      <Check v-if="selectedEntity?.key === entity.key" />
                      {{ selectedEntity?.key === entity.key ? t('entityTools.catalog.selected') : t(`entityTools.catalog.${entity.common ? 'common' : 'remote'}`) }}
                    </Badge>
                  </button>
                </div>
              </ScrollArea>
              <Empty v-else>
                <EmptyHeader>
                  <EmptyMedia variant="icon"><Search /></EmptyMedia>
                  <EmptyTitle>{{ t('entityTools.catalog.empty') }}</EmptyTitle>
                  <EmptyDescription>{{ t('entityTools.catalog.description') }}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            </CardContent>
            <Separator />
            <CardFooter class="operation-footer">
              <FieldGroup class="operation-fields">
                <Field v-if="entityMode === 'give'">
                  <FieldLabel>{{ t('entityTools.catalog.giveType') }}</FieldLabel>
                  <ToggleGroup :model-value="giveVariant" type="single" variant="outline" class="compact-option-grid" @update:model-value="selectGiveVariant">
                    <ToggleGroupItem v-for="variant in ['direct', 'materials', 'blueprint']" :key="variant" :value="variant">{{ t(`entityTools.giveVariants.${variant}`) }}</ToggleGroupItem>
                  </ToggleGroup>
                </Field>
                <Field v-if="entityMode === 'give' && giveVariant === 'direct'">
                  <FieldLabel>{{ t('entityTools.catalog.quantityMode') }}</FieldLabel>
                  <ToggleGroup :model-value="giveQuantityMode" type="single" variant="outline" @update:model-value="selectGiveQuantityMode">
                    <ToggleGroupItem value="units">{{ t('entityTools.quantityModes.units') }}</ToggleGroupItem>
                    <ToggleGroupItem value="stacks">{{ t('entityTools.quantityModes.stacks') }}</ToggleGroupItem>
                  </ToggleGroup>
                </Field>
                <FieldSet v-if="entityMode === 'act'" class="entity-action-picker">
                  <FieldLegend variant="label">{{ t('entityTools.catalog.entityAction') }}</FieldLegend>
                  <Tabs v-model="entityActionGroup">
                    <TabsList class="action-category-tabs">
                      <TabsTrigger v-for="group in ENTITY_ACTION_GROUPS" :key="group.id" :value="group.id">{{ t(`entityTools.actionGroups.${group.id}`) }}</TabsTrigger>
                    </TabsList>
                    <TabsContent v-for="group in ENTITY_ACTION_GROUPS" :key="group.id" :value="group.id">
                      <ToggleGroup :model-value="entityAction" type="single" variant="outline" spacing="2" class="action-grid action-grid--dense" @update:model-value="selectEntityAction">
                        <ToggleGroupItem v-for="action in group.actions" :key="action" :value="action" class="action-choice h-auto whitespace-normal"><span>{{ t(`entityTools.entityActions.${action}`) }}</span></ToggleGroupItem>
                      </ToggleGroup>
                    </TabsContent>
                  </Tabs>
                </FieldSet>
                <Field v-if="entityMode === 'act' && entityAction === 'till'">
                  <FieldLabel>{{ t('entityTools.catalog.tillLayout') }}</FieldLabel>
                  <ToggleGroup :model-value="tillLayout" type="single" variant="outline" @update:model-value="selectTillLayout">
                    <ToggleGroupItem v-for="layout in ['2x2', '3x3', '4x4', 'hexagon']" :key="layout" :value="layout">{{ t(`entityTools.tillLayouts.${layout}`) }}</ToggleGroupItem>
                  </ToggleGroup>
                </Field>
                <Field v-if="['give', 'spawn', 'remove'].includes(entityMode)">
                  <FieldLabel for="entity-count">{{ amountLabel }}</FieldLabel>
                  <UiInput id="entity-count" v-model.number="count" type="number" min="1" :max="maximumCount" step="1" />
                  <FieldDescription>{{ amountHint }}</FieldDescription>
                </Field>
                <Field v-if="entityMode === 'remove' || entityMode === 'act'">
                  <FieldLabel for="entity-radius">{{ t('entityTools.catalog.radius') }}</FieldLabel>
                  <UiInput id="entity-radius" v-model.number="radius" type="number" min="1" :max="entityMode === 'act' ? 64 : 30" step="1" />
                  <FieldDescription>{{ t('entityTools.catalog.radiusHint', { max: entityMode === 'act' ? 64 : 30 }) }}</FieldDescription>
                </Field>
              </FieldGroup>
              <div v-if="selectedEntity" class="selected-entity">
                <span class="selected-entity-artwork">
                  <img v-if="entityArtworkUrl(selectedEntity)" :src="entityArtworkUrl(selectedEntity)" :alt="entityName(selectedEntity)" @error="markBrokenArtwork">
                  <Box v-else />
                </span>
                <span class="selected-entity-copy">
                  <span>{{ t(entityMode === 'act' ? 'entityTools.catalog.filter' : 'entityTools.catalog.selected') }}</span>
                  <strong>{{ entityName(selectedEntity) }}</strong>
                  <code>{{ selectedEntity.id }}</code>
                </span>
                <UiButton v-if="entityMode === 'act'" variant="ghost" size="sm" class="clear-filter" @click="selectedEntity = null">
                  <Trash2 data-icon="inline-start" />
                  {{ t('entityTools.catalog.clearFilter') }}
                </UiButton>
              </div>
              <div v-else-if="entityMode === 'act'" class="selected-entity">
                <span>{{ t('entityTools.catalog.filter') }}</span>
                <strong>{{ t('entityTools.catalog.allApplicable') }}</strong>
              </div>
              <UiButton class="entity-submit-button" :variant="entityConfirmationArmed ? 'destructive' : 'default'" :disabled="!canExecuteEntity" @click="submitEntityOperation">
                <Spinner v-if="executing" data-icon="inline-start" />
                <TriangleAlert v-else-if="entityConfirmationArmed" data-icon="inline-start" />
                <Send v-else data-icon="inline-start" />
                {{ executing ? t('entityTools.actions.executing') : entityConfirmationArmed ? t('entityTools.actions.clickAgainToConfirm') : entitySubmitLabel }}
              </UiButton>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="player">
          <Card size="sm" class="player-operation-card">
            <CardHeader v-if="!embedded">
              <CardTitle>{{ t('entityTools.player.title') }}</CardTitle>
            </CardHeader>
            <CardContent class="operation-content player-operation-content">
              <div class="operation-workbench operation-workbench--player">
                <FieldSet class="action-picker" data-operation-picker="player">
                  <FieldLegend variant="label" :class="{ 'sr-only': embedded }">{{ t('entityTools.player.operation') }}</FieldLegend>
                  <Tabs :model-value="playerOperationGroup" @update:model-value="selectPlayerOperationGroup">
                    <TabsList class="operation-category-tabs operation-category-tabs--player">
                      <TabsTrigger v-for="group in availablePlayerOperationGroups" :key="group.id" :value="group.id">
                        {{ t(`entityTools.playerOperationGroups.${group.id}`) }}
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent v-for="group in availablePlayerOperationGroups" :key="group.id" :value="group.id" class="operation-category-content">
                      <ToggleGroup :model-value="playerOperation" type="single" variant="outline" spacing="2" class="action-grid player-action-grid" @update:model-value="selectPlayerOperation">
                        <ToggleGroupItem v-for="operation in group.operations" :key="operation.id" :value="operation.id" class="action-choice player-action-choice h-auto whitespace-normal" aria-controls="player-operation-editor">
                          <component :is="operation.icon" />
                          <span>{{ t(`entityTools.playerOperations.${operation.id}`) }}</span>
                          <Check v-if="playerOperation === operation.id" class="action-choice-state" />
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </TabsContent>
                  </Tabs>
                </FieldSet>

                <Separator orientation="vertical" class="operation-workbench-separator operation-workbench-separator--vertical" />
                <Separator class="operation-workbench-separator operation-workbench-separator--horizontal" />

                <section id="player-operation-editor" ref="playerOperationEditor" class="operation-editor player-operation-editor" aria-labelledby="player-operation-editor-title">
                  <div class="operation-editor-header">
                    <span class="operation-editor-icon"><component :is="selectedPlayerOperation.icon" /></span>
                    <div class="operation-editor-copy" aria-live="polite">
                      <strong id="player-operation-editor-title">{{ t(`entityTools.playerOperations.${playerOperation}`) }}</strong>
                    </div>
                  </div>
                  <Separator />
                  <FieldGroup class="operation-editor-fields">

                <template v-if="playerOperation === 'set_player_stat'">
                  <Field>
                    <FieldLabel>{{ t('entityTools.player.stat') }}</FieldLabel>
                    <ToggleGroup :model-value="playerStat" type="single" variant="outline" class="stat-toggle" @update:model-value="selectPlayerStat">
                      <ToggleGroupItem v-for="stat in ['health', 'hunger', 'sanity', 'moisture', 'temperature']" :key="stat" :value="stat">
                        {{ t(`entityTools.stats.${stat}`) }}
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </Field>
                  <Field>
                    <FieldLabel for="player-stat-value">{{ t('entityTools.player.value') }}</FieldLabel>
                    <UiInput id="player-stat-value" v-model.number="playerStatValue" type="number" :min="playerStat === 'temperature' ? -20 : 0" :max="playerStat === 'temperature' ? 90 : 100" step="1" />
                    <FieldDescription>{{ playerStat === 'temperature' ? t('entityTools.player.temperatureHint') : t('entityTools.player.percentHint') }}</FieldDescription>
                  </Field>
                </template>

                <Field v-else-if="playerOperation === 'set_player_speed'">
                  <FieldLabel for="player-speed">{{ t('entityTools.player.speed') }}</FieldLabel>
                  <UiInput id="player-speed" v-model.number="playerSpeed" type="number" min="-2" max="100" step="0.1" />
                  <FieldDescription>{{ t('entityTools.player.speedHint') }}</FieldDescription>
                </Field>

                <template v-else-if="playerOperation === 'set_player_lock'">
                  <Field>
                    <FieldLabel>{{ t('entityTools.player.lockResource') }}</FieldLabel>
                    <ToggleGroup :model-value="playerLockResource" type="single" variant="outline" @update:model-value="value => selectPreset('playerLockResource', value)">
                      <ToggleGroupItem v-for="resource in ['health', 'moisture', 'temperature']" :key="resource" :value="resource">
                        {{ t(`entityTools.lockResources.${resource}`) }}
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </Field>
                  <Field v-if="playerLockResource === 'health'">
                    <FieldLabel>{{ t('entityTools.player.lockValueMode') }}</FieldLabel>
                    <ToggleGroup :model-value="playerLockValueMode" type="single" variant="outline" @update:model-value="value => selectPreset('playerLockValueMode', value)">
                      <ToggleGroupItem v-for="mode in ['absolute', 'percent']" :key="mode" :value="mode">{{ t(`entityTools.lockValueModes.${mode}`) }}</ToggleGroupItem>
                    </ToggleGroup>
                  </Field>
                  <Field>
                    <FieldLabel for="player-lock-value">{{ t('entityTools.player.lockValue') }}</FieldLabel>
                    <UiInput
                      id="player-lock-value"
                      v-model.number="playerLockValue"
                      type="number"
                      :min="playerLockResource === 'temperature' ? -20 : playerLockResource === 'health' ? 1 : 0"
                      :max="playerLockResource === 'health' ? (playerLockValueMode === 'percent' ? 100 : 999) : playerLockResource === 'temperature' ? 90 : 100"
                      step="1"
                    />
                    <FieldDescription>{{ t(`entityTools.player.lockHints.${playerLockResource}`) }}</FieldDescription>
                  </Field>
                  <Field orientation="horizontal">
                    <div class="field-copy">
                      <FieldLabel for="player-lock-enabled">{{ t('entityTools.player.state') }}</FieldLabel>
                      <FieldDescription>{{ t(`entityTools.states.${playerLockEnabled ? 'enabled' : 'disabled'}`) }}</FieldDescription>
                    </div>
                    <Switch id="player-lock-enabled" v-model="playerLockEnabled" />
                  </Field>
                </template>

                <Field v-else-if="playerOperation === 'adjust_player_luck'">
                  <FieldLabel>{{ t('entityTools.player.luckMode') }}</FieldLabel>
                  <ToggleGroup :model-value="playerLuckMode" type="single" variant="outline" @update:model-value="value => selectPreset('playerLuckMode', value)">
                    <ToggleGroupItem v-for="mode in ['add', 'subtract', 'clear']" :key="mode" :value="mode">{{ t(`entityTools.luckModes.${mode}`) }}</ToggleGroupItem>
                  </ToggleGroup>
                </Field>

                <Field v-else-if="playerOperation === 'manage_player_skills'">
                  <FieldLabel>{{ t('entityTools.player.skillMode') }}</FieldLabel>
                  <ToggleGroup :model-value="playerSkillMode" type="single" variant="outline" @update:model-value="value => selectPreset('playerSkillMode', value)">
                    <ToggleGroupItem v-for="mode in ['grant_xp', 'reset']" :key="mode" :value="mode">{{ t(`entityTools.skillModes.${mode}`) }}</ToggleGroupItem>
                  </ToggleGroup>
                </Field>

                <Field v-else-if="playerOperation === 'set_monkey_curse'">
                  <FieldLabel>{{ t('entityTools.player.monkeyCurseMode') }}</FieldLabel>
                  <ToggleGroup :model-value="monkeyCurseMode" type="single" variant="outline" @update:model-value="value => selectPreset('monkeyCurseMode', value)">
                    <ToggleGroupItem v-for="mode in ['add', 'remove']" :key="mode" :value="mode">{{ t(`entityTools.monkeyCurseModes.${mode}`) }}</ToggleGroupItem>
                  </ToggleGroup>
                </Field>

                <Field v-else-if="playerOperation === 'clear_player_inventory'">
                  <FieldLabel>{{ t('entityTools.player.scope') }}</FieldLabel>
                  <ToggleGroup :model-value="inventoryScope" type="single" variant="outline" @update:model-value="selectInventoryScope">
                    <ToggleGroupItem v-for="scope in ['inventory', 'backpack', 'all']" :key="scope" :value="scope">
                      {{ t(`entityTools.inventoryScopes.${scope}`) }}
                    </ToggleGroupItem>
                  </ToggleGroup>
                </Field>

                <Field v-else-if="playerOperation === 'clear_player_naughtiness'">
                  <FieldLabel>{{ t('entityTools.player.naughtinessMode') }}</FieldLabel>
                  <ToggleGroup :model-value="naughtinessMode" type="single" variant="outline" @update:model-value="value => selectPreset('naughtinessMode', value)">
                    <ToggleGroupItem v-for="mode in ['reset', 'spawn_one', 'spawn_random']" :key="mode" :value="mode">{{ t(`entityTools.naughtinessModes.${mode}`) }}</ToggleGroupItem>
                  </ToggleGroup>
                </Field>

                <Field v-else-if="playerOperation === 'teleport_player'">
                  <FieldLabel>{{ t('entityTools.player.destination') }}</FieldLabel>
                  <UiSelect v-model="teleportDestinationId" :disabled="teleportDestinations.length === 0">
                    <SelectTrigger class="w-full"><SelectValue :placeholder="t('entityTools.player.selectDestination')" /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem v-for="player in teleportDestinations" :key="player.id" :value="player.id">
                          {{ playerName(player) }} · {{ player.id }}
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </UiSelect>
                  <FieldDescription v-if="teleportDestinations.length === 0">{{ t('entityTools.player.noDestination') }}</FieldDescription>
                </Field>

                <FieldGroup v-else-if="playerOperation === 'relocate_players'" class="two-column-fields">
                  <Field>
                    <FieldLabel>{{ t('entityTools.player.relocationAction') }}</FieldLabel>
                    <ToggleGroup :model-value="relocationAction" type="single" variant="outline" class="compact-option-grid" @update:model-value="selectRelocationAction">
                      <ToggleGroupItem v-for="action in ['gather', 'forward', 'recall', 'swap']" :key="action" :value="action">{{ t(`entityTools.relocationActions.${action}`) }}</ToggleGroupItem>
                    </ToggleGroup>
                  </Field>
                  <Field v-if="relocationAction !== 'gather'">
                    <FieldLabel>{{ t('entityTools.player.otherPlayer') }}</FieldLabel>
                    <UiSelect v-model="relocationOtherId" :disabled="teleportDestinations.length === 0">
                      <SelectTrigger class="w-full"><SelectValue :placeholder="t('entityTools.player.selectDestination')" /></SelectTrigger>
                      <SelectContent><SelectGroup><SelectItem v-for="player in teleportDestinations" :key="player.id" :value="player.id">{{ playerName(player) }} · {{ player.id }}</SelectItem></SelectGroup></SelectContent>
                    </UiSelect>
                  </Field>
                </FieldGroup>

                <template v-else-if="playerOperation === 'set_player_ability'">
                  <FieldSet class="action-picker">
                    <FieldLegend variant="label">{{ t('entityTools.player.ability') }}</FieldLegend>
                    <FieldGroup class="action-picker-groups">
                      <Field v-for="group in PLAYER_ABILITY_GROUPS" :key="group.id" class="action-picker-group">
                        <FieldLabel>{{ t(`entityTools.playerAbilityGroups.${group.id}`) }}</FieldLabel>
                        <ToggleGroup :model-value="playerAbility" type="single" variant="outline" spacing="2" class="action-grid" @update:model-value="selectPlayerAbility">
                        <ToggleGroupItem v-for="ability in group.abilities" :key="ability" :value="ability" class="action-choice h-auto whitespace-normal"><span>{{ t(`entityTools.playerAbilities.${ability}`) }}</span></ToggleGroupItem>
                        </ToggleGroup>
                      </Field>
                    </FieldGroup>
                  </FieldSet>
                  <Field orientation="horizontal">
                    <div class="field-copy">
                      <FieldLabel for="player-ability-enabled">{{ t('entityTools.player.state') }}</FieldLabel>
                      <FieldDescription>{{ t(`entityTools.states.${playerAbilityEnabled ? 'enabled' : 'disabled'}`) }}</FieldDescription>
                    </div>
                    <Switch id="player-ability-enabled" v-model="playerAbilityEnabled" />
                  </Field>
                  <Field v-if="selectedAbilityRange">
                    <FieldLabel for="player-ability-value">{{ t('entityTools.player.abilityValue') }}</FieldLabel>
                    <UiInput id="player-ability-value" v-model.number="playerAbilityValue" type="number" :min="selectedAbilityRange.min" :max="selectedAbilityRange.max" step="1" />
                    <FieldDescription>{{ t(`entityTools.player.abilityValueHints.${playerAbility}`) }}</FieldDescription>
                  </Field>
                  <Field v-if="playerAbility === 'unlock_recipes'">
                    <FieldLabel>{{ t('entityTools.player.recipeUnlockMode') }}</FieldLabel>
                    <ToggleGroup :model-value="recipeUnlockMode" type="single" variant="outline" @update:model-value="value => selectPreset('recipeUnlockMode', value)">
                      <ToggleGroupItem v-for="mode in ['temporary', 'permanent']" :key="mode" :value="mode">{{ t(`entityTools.recipeUnlockModes.${mode}`) }}</ToggleGroupItem>
                    </ToggleGroup>
                    <FieldDescription>{{ t('entityTools.player.recipeUnlockHint') }}</FieldDescription>
                  </Field>
                </template>

                <Field v-else-if="playerOperation === 'set_player_attack_multiplier'">
                  <FieldLabel for="player-attack-multiplier">{{ t('entityTools.player.attackMultiplier') }}</FieldLabel>
                  <UiInput id="player-attack-multiplier" v-model.number="playerAttackMultiplier" type="number" min="0" max="99999" step="0.25" />
                  <FieldDescription>{{ t('entityTools.player.attackMultiplierHint') }}</FieldDescription>
                </Field>

                <Field v-else-if="playerOperation === 'set_health_penalty'">
                  <FieldLabel>{{ t('entityTools.player.penalty') }}</FieldLabel>
                  <ToggleGroup :model-value="healthPenaltyMode" type="single" variant="outline" @update:model-value="value => selectPreset('healthPenaltyMode', value)">
                    <ToggleGroupItem v-for="mode in ['increase', 'decrease', 'clear']" :key="mode" :value="mode">{{ t(`entityTools.healthPenaltyModes.${mode}`) }}</ToggleGroupItem>
                  </ToggleGroup>
                </Field>

                <FieldGroup v-else-if="playerOperation === 'manage_followers'" class="two-column-fields">
                  <Field>
                    <FieldLabel>{{ t('entityTools.player.followerAction') }}</FieldLabel>
                    <ToggleGroup :model-value="followerAction" type="single" variant="outline" class="compact-option-grid" @update:model-value="selectFollowerAction">
                      <ToggleGroupItem v-for="action in FOLLOWER_ACTIONS" :key="action" :value="action">{{ t(`entityTools.followerActions.${action}`) }}</ToggleGroupItem>
                    </ToggleGroup>
                  </Field>
                  <Field>
                    <FieldLabel for="follower-radius">{{ t('entityTools.catalog.radius') }}</FieldLabel>
                    <UiInput id="follower-radius" v-model.number="followerRadius" type="number" min="1" max="64" step="1" />
                  </Field>
                </FieldGroup>

                <FieldGroup v-else-if="playerOperation === 'spawn_domesticated_beefalo'">
                  <Field>
                    <FieldLabel>{{ t('entityTools.player.beefaloTendency') }}</FieldLabel>
                    <ToggleGroup :model-value="beefaloTendency" type="single" variant="outline" @update:model-value="value => selectPreset('beefaloTendency', value)">
                      <ToggleGroupItem v-for="item in ['default', 'ornery', 'pudgy', 'rider', 'custom']" :key="item" :value="item">{{ t(`entityTools.beefaloTendencies.${item}`) }}</ToggleGroupItem>
                    </ToggleGroup>
                  </Field>
                  <template v-if="beefaloTendency === 'custom'">
                    <FieldGroup class="two-column-fields">
                      <Field>
                        <FieldLabel>{{ t('entityTools.player.beefaloSaddle') }}</FieldLabel>
                        <ToggleGroup :model-value="beefaloSaddle" type="single" variant="outline" class="compact-option-grid" @update:model-value="value => selectPreset('beefaloSaddle', value)">
                          <ToggleGroupItem v-for="item in ['none', 'shadow', 'basic', 'war', 'race', 'wathgrithr']" :key="item" :value="item">{{ t(`entityTools.beefaloSaddles.${item}`) }}</ToggleGroupItem>
                        </ToggleGroup>
                      </Field>
                      <Field>
                        <FieldLabel>{{ t('entityTools.player.beefaloBell') }}</FieldLabel>
                        <ToggleGroup :model-value="beefaloBell" type="single" variant="outline" class="compact-option-grid" @update:model-value="value => selectPreset('beefaloBell', value)">
                          <ToggleGroupItem v-for="item in ['none', 'beef_bell', 'shadow_beef_bell']" :key="item" :value="item">{{ t(`entityTools.beefaloBells.${item}`) }}</ToggleGroupItem>
                        </ToggleGroup>
                      </Field>
                    </FieldGroup>
                    <FieldGroup class="four-column-fields">
                      <Field><FieldLabel for="beefalo-domestication">{{ t('entityTools.beefaloStats.domestication') }}</FieldLabel><UiInput id="beefalo-domestication" v-model.number="beefaloDomestication" type="number" min="0" max="100" step="1" /></Field>
                      <Field><FieldLabel for="beefalo-hunger">{{ t('entityTools.beefaloStats.hunger') }}</FieldLabel><UiInput id="beefalo-hunger" v-model.number="beefaloHunger" type="number" min="0" max="100" step="1" /></Field>
                      <Field><FieldLabel for="beefalo-obedience">{{ t('entityTools.beefaloStats.obedience') }}</FieldLabel><UiInput id="beefalo-obedience" v-model.number="beefaloObedience" type="number" min="0" max="100" step="1" /></Field>
                      <Field><FieldLabel for="beefalo-health">{{ t('entityTools.beefaloStats.health') }}</FieldLabel><UiInput id="beefalo-health" v-model.number="beefaloHealth" type="number" min="0" max="100" step="1" /></Field>
                    </FieldGroup>
                    <FieldGroup class="three-column-fields">
                      <Field><FieldLabel for="beefalo-ornery">{{ t('entityTools.beefaloWeights.ornery') }}</FieldLabel><UiInput id="beefalo-ornery" v-model.number="beefaloOrnery" type="number" min="0" max="100" step="1" /></Field>
                      <Field><FieldLabel for="beefalo-rider">{{ t('entityTools.beefaloWeights.rider') }}</FieldLabel><UiInput id="beefalo-rider" v-model.number="beefaloRider" type="number" min="0" max="100" step="1" /></Field>
                      <Field><FieldLabel for="beefalo-pudgy">{{ t('entityTools.beefaloWeights.pudgy') }}</FieldLabel><UiInput id="beefalo-pudgy" v-model.number="beefaloPudgy" type="number" min="0" max="100" step="1" /></Field>
                    </FieldGroup>
                  </template>
                </FieldGroup>

                <FieldSet v-else-if="playerOperation === 'set_character_power'" class="action-picker">
                  <FieldLegend variant="label">{{ t('entityTools.player.characterPower') }}</FieldLegend>
                  <FieldGroup class="action-picker-groups">
                    <Field v-for="group in characterPowerGroups" :key="group.id" class="action-picker-group">
                      <FieldLabel>{{ t(`entityTools.characterPowerGroups.${group.id}`) }}</FieldLabel>
                      <ToggleGroup :model-value="characterPowerAction" type="single" variant="outline" spacing="2" class="action-grid" @update:model-value="selectCharacterPower">
                        <ToggleGroupItem v-for="action in group.actions" :key="action" :value="action" class="action-choice h-auto whitespace-normal"><span>{{ t(`entityTools.characterPowers.${action}`) }}</span></ToggleGroupItem>
                      </ToggleGroup>
                    </Field>
                  </FieldGroup>
                  <FieldDescription>{{ t('entityTools.player.characterPowerHint', { character: currentPlayer?.prefab || '' }) }}</FieldDescription>
                </FieldSet>

                <Alert v-else>
                  <Sparkles />
                  <AlertTitle>{{ t(`entityTools.playerOperations.${playerOperation}`) }}</AlertTitle>
                  <AlertDescription>{{ t(`entityTools.playerOperationDescriptions.${playerOperation}`) }}</AlertDescription>
                </Alert>
                  </FieldGroup>
                  <div class="operation-editor-actions">
                    <div v-if="!lockedTarget" class="target-summary">
                      <span>{{ t('entityTools.confirm.target') }}</span>
                      <strong>{{ currentPlayer ? `${playerName(currentPlayer)} · ${currentPlayer.id}` : t('entityTools.target.noPlayers') }}</strong>
                    </div>
                    <UiButton class="player-submit-button" :variant="playerConfirmationArmed ? 'destructive' : 'default'" :disabled="!canExecutePlayer" @click="submitPlayerOperation">
                      <Spinner v-if="executing" data-icon="inline-start" />
                      <TriangleAlert v-else-if="playerConfirmationArmed" data-icon="inline-start" />
                      <Send v-else data-icon="inline-start" />
                      {{ executing ? t('entityTools.actions.executing') : playerConfirmationArmed ? t('entityTools.actions.clickAgainToConfirm') : playerSubmitLabel }}
                    </UiButton>
                  </div>
                </section>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="world">
          <Card size="sm">
            <CardHeader>
              <CardTitle>{{ t('entityTools.world.title') }}</CardTitle>
            </CardHeader>
            <CardContent class="operation-content">
              <div class="operation-workbench">
                <FieldSet class="action-picker" data-operation-picker="world">
                  <FieldLegend variant="label">{{ t('entityTools.world.operation') }}</FieldLegend>
                  <Tabs :model-value="worldOperationGroup" @update:model-value="selectWorldOperationGroup">
                    <TabsList class="operation-category-tabs operation-category-tabs--world">
                      <TabsTrigger v-for="group in worldOperationGroups" :key="group.id" :value="group.id">
                        {{ t(`entityTools.worldOperationGroups.${group.id}`) }}
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent v-for="group in worldOperationGroups" :key="group.id" :value="group.id" class="operation-category-content">
                      <ToggleGroup :model-value="worldOperation" type="single" variant="outline" spacing="2" class="action-grid" @update:model-value="selectWorldOperation">
                        <ToggleGroupItem v-for="operation in group.operations" :key="operation.id" :value="operation.id" class="action-choice h-auto whitespace-normal" aria-controls="world-operation-editor">
                          <component :is="operation.icon" />
                          <span>{{ t(`entityTools.worldOperations.${operation.id}`) }}</span>
                          <Check v-if="worldOperation === operation.id" class="action-choice-state" />
                          <ChevronRight v-else class="action-choice-state action-choice-next" />
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </TabsContent>
                  </Tabs>
                </FieldSet>

                <Separator orientation="vertical" class="operation-workbench-separator operation-workbench-separator--vertical" />
                <Separator class="operation-workbench-separator operation-workbench-separator--horizontal" />

                <section id="world-operation-editor" ref="worldOperationEditor" class="operation-editor" aria-labelledby="world-operation-editor-title">
                  <div class="operation-editor-header">
                    <span class="operation-editor-icon"><component :is="selectedWorldOperation.icon" /></span>
                    <div class="operation-editor-copy" aria-live="polite">
                      <Badge variant="secondary">{{ t('entityTools.actions.currentOperation') }}</Badge>
                      <strong id="world-operation-editor-title">{{ t(`entityTools.worldOperations.${worldOperation}`) }}</strong>
                    </div>
                  </div>
                  <Separator />
                  <FieldGroup class="operation-editor-fields">

                <Field v-if="worldOperation === 'skip_days'">
                  <FieldLabel for="skip-days">{{ t('entityTools.world.days') }}</FieldLabel>
                  <UiInput id="skip-days" v-model.number="skipDays" type="number" min="1" max="200" step="1" />
                  <FieldDescription>{{ t('entityTools.world.daysHint') }}</FieldDescription>
                </Field>

                <Field v-else-if="worldOperation === 'set_time_scale'">
                  <FieldLabel for="time-scale">{{ t('entityTools.world.timeScale') }}</FieldLabel>
                  <UiInput id="time-scale" v-model.number="timeScale" type="number" min="0" max="20" step="0.1" />
                  <FieldDescription>{{ t('entityTools.world.timeScaleHint') }}</FieldDescription>
                </Field>

                <Field v-else-if="worldOperation === 'set_precipitation'">
                  <FieldLabel>{{ t('entityTools.world.precipitation') }}</FieldLabel>
                  <ToggleGroup :model-value="precipitation" type="single" variant="outline" @update:model-value="selectPrecipitation">
                    <ToggleGroupItem v-for="item in ['start', 'stop', 'dynamic']" :key="item" :value="item">
                      {{ t(`entityTools.precipitationModes.${item}`) }}
                    </ToggleGroupItem>
                  </ToggleGroup>
                </Field>

                <Field v-else-if="worldOperation === 'set_world_wetness'">
                  <FieldLabel for="world-wetness">{{ t('entityTools.world.wetness') }}</FieldLabel>
                  <UiInput id="world-wetness" v-model.number="worldWetness" type="number" min="0" max="100" step="1" />
                  <FieldDescription>{{ t('entityTools.world.wetnessHint') }}</FieldDescription>
                </Field>

                <FieldGroup v-else-if="worldOperation === 'set_world_temperature'">
                  <Field>
                    <FieldLabel>{{ t('entityTools.world.temperatureMode') }}</FieldLabel>
                    <ToggleGroup :model-value="worldTemperatureMode" type="single" variant="outline" @update:model-value="selectWorldTemperatureMode">
                      <ToggleGroupItem v-for="item in ['dynamic', 'fixed']" :key="item" :value="item">
                        {{ t(`entityTools.temperatureModes.${item}`) }}
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </Field>
                  <Field v-if="worldTemperatureMode === 'fixed'">
                    <FieldLabel for="world-temperature">{{ t('entityTools.world.temperature') }}</FieldLabel>
                    <UiInput id="world-temperature" v-model.number="worldTemperature" type="number" min="-25" max="95" step="1" />
                    <FieldDescription>{{ t('entityTools.world.temperatureHint') }}</FieldDescription>
                  </Field>
                </FieldGroup>

                <Field v-else-if="worldOperation === 'set_moon_phase'">
                  <FieldLabel>{{ t('entityTools.world.moonPhase') }}</FieldLabel>
                  <ToggleGroup :model-value="moonPhase" type="single" variant="outline" class="moon-toggle" @update:model-value="selectMoonPhase">
                    <ToggleGroupItem v-for="item in ['new', 'quarter', 'half', 'threequarter', 'full']" :key="item" :value="item">
                      {{ t(`entityTools.moonPhases.${item}`) }}
                    </ToggleGroupItem>
                  </ToggleGroup>
                </Field>

                <FieldSet v-else-if="worldOperation === 'trigger_world_event'" class="action-picker">
                  <FieldLegend variant="label">{{ t('entityTools.world.event') }}</FieldLegend>
                  <FieldGroup class="action-picker-groups">
                    <Field v-for="group in WORLD_EVENT_GROUPS" :key="group.id" class="action-picker-group">
                      <FieldLabel>{{ t(`entityTools.worldEventGroups.${group.id}`) }}</FieldLabel>
                      <ToggleGroup :model-value="worldEvent" type="single" variant="outline" spacing="2" class="action-grid" @update:model-value="selectWorldEvent">
                        <ToggleGroupItem v-for="item in group.events" :key="item" :value="item" class="action-choice h-auto whitespace-normal"><span>{{ t(`entityTools.worldEvents.${item}`) }}</span></ToggleGroupItem>
                      </ToggleGroup>
                    </Field>
                  </FieldGroup>
                  <FieldDescription v-if="['lightning', 'meteor_shower'].includes(worldEvent)">{{ t('entityTools.world.positionedEventTarget', { player: currentPlayer ? playerName(currentPlayer) : t('entityTools.target.noPlayers') }) }}</FieldDescription>
                </FieldSet>

                <FieldSet v-else-if="worldOperation === 'set_special_event'" class="action-picker">
                  <FieldLegend variant="label">{{ t('entityTools.world.specialEvent') }}</FieldLegend>
                  <FieldGroup class="action-picker-groups">
                    <Field v-for="group in SPECIAL_EVENT_GROUPS" :key="group.id" class="action-picker-group">
                      <FieldLabel>{{ t(`entityTools.specialEventGroups.${group.id}`) }}</FieldLabel>
                      <ToggleGroup :model-value="specialEvent" type="single" variant="outline" spacing="2" class="action-grid" @update:model-value="selectSpecialEvent">
                        <ToggleGroupItem v-for="item in group.events" :key="item" :value="item" class="action-choice h-auto whitespace-normal"><span>{{ t(`entityTools.specialEvents.${item}`) }}</span></ToggleGroupItem>
                      </ToggleGroup>
                    </Field>
                  </FieldGroup>
                  <FieldDescription>{{ t('entityTools.world.specialEventHint') }}</FieldDescription>
                </FieldSet>

                <Field v-else-if="worldOperation === 'trigger_incident'">
                  <FieldLabel>{{ t('entityTools.world.incident') }}</FieldLabel>
                  <ToggleGroup :model-value="incident" type="single" variant="outline" class="compact-option-grid" @update:model-value="selectIncident">
                    <ToggleGroupItem v-for="item in INCIDENTS" :key="item" :value="item">{{ t(`entityTools.incidents.${item}`) }}</ToggleGroupItem>
                  </ToggleGroup>
                  <FieldDescription>{{ t('entityTools.world.positionedEventTarget', { player: currentPlayer ? playerName(currentPlayer) : t('entityTools.target.noPlayers') }) }}</FieldDescription>
                </Field>

                <Field v-else-if="worldOperation === 'set_season'">
                  <FieldLabel>{{ t('entityTools.world.season') }}</FieldLabel>
                  <ToggleGroup :model-value="season" type="single" variant="outline" @update:model-value="selectSeason">
                    <ToggleGroupItem v-for="item in ['autumn', 'winter', 'spring', 'summer']" :key="item" :value="item">
                      {{ t(`entityTools.seasons.${item}`) }}
                    </ToggleGroupItem>
                  </ToggleGroup>
                </Field>

                <Field v-else-if="worldOperation === 'set_phase'">
                  <FieldLabel>{{ t('entityTools.world.phase') }}</FieldLabel>
                  <ToggleGroup :model-value="phase" type="single" variant="outline" @update:model-value="selectPhase">
                    <ToggleGroupItem v-for="item in ['day', 'dusk', 'night']" :key="item" :value="item">
                      {{ t(`entityTools.phases.${item}`) }}
                    </ToggleGroupItem>
                  </ToggleGroup>
                </Field>

                <FieldGroup v-else-if="worldOperation === 'set_clock_segments'" class="clock-fields">
                  <Field>
                    <FieldLabel for="day-segments">{{ t('entityTools.world.day') }}</FieldLabel>
                    <UiInput id="day-segments" v-model.number="daySegments" type="number" min="0" max="16" step="1" />
                  </Field>
                  <Field>
                    <FieldLabel for="dusk-segments">{{ t('entityTools.world.dusk') }}</FieldLabel>
                    <UiInput id="dusk-segments" v-model.number="duskSegments" type="number" min="0" max="16" step="1" />
                  </Field>
                  <Field>
                    <FieldLabel for="night-segments">{{ t('entityTools.world.night') }}</FieldLabel>
                    <UiInput id="night-segments" v-model.number="nightSegments" type="number" min="0" max="16" step="1" />
                  </Field>
                  <FieldDescription class="clock-description">{{ t('entityTools.world.clockHint', { total: Number(daySegments) + Number(duskSegments) + Number(nightSegments) }) }}</FieldDescription>
                </FieldGroup>

                <Alert v-else-if="worldOperation === 'next_phase'">
                  <RefreshCw />
                  <AlertTitle>{{ t('entityTools.worldOperations.next_phase') }}</AlertTitle>
                  <AlertDescription>{{ t('entityTools.world.nextPhaseDescription') }}</AlertDescription>
                </Alert>

                <Alert v-else-if="worldOperation === 'stop_vote'">
                  <ShieldCheck />
                  <AlertTitle>{{ t('entityTools.worldOperations.stop_vote') }}</AlertTitle>
                  <AlertDescription>{{ t('entityTools.world.stopVoteDescription') }}</AlertDescription>
                </Alert>
                  </FieldGroup>
                </section>
              </div>
            </CardContent>
            <Separator />
            <CardFooter class="simple-footer" :class="{ 'simple-footer--locked': lockedTarget }">
              <div v-if="!lockedTarget" class="target-summary">
                <span>{{ t('entityTools.confirm.world') }}</span>
                <strong>{{ currentWorld ? targetWorldLabel() : t('entityTools.target.noWorlds') }}</strong>
              </div>
              <UiButton :variant="worldConfirmationArmed ? 'destructive' : 'default'" :disabled="!canExecuteWorld" @click="submitWorldOperation">
                <Spinner v-if="executing" data-icon="inline-start" />
                <TriangleAlert v-else-if="worldConfirmationArmed" data-icon="inline-start" />
                <Send v-else data-icon="inline-start" />
                {{ executing ? t('entityTools.actions.executing') : worldConfirmationArmed ? t('entityTools.actions.clickAgainToConfirm') : worldSubmitLabel }}
              </UiButton>
            </CardFooter>
          </Card>
        </TabsContent>
    </Tabs>

  </div>
</template>

<style scoped>
.game-tools-page { display: flex; flex-direction: column; gap: .75rem; }
.game-tools-header { display: grid; grid-template-columns: minmax(11rem, .45fr) minmax(38rem, 2fr) auto; align-items: end; gap: 1rem; }
.game-tools-header h1 { font-size: 1.5rem; font-weight: 650; line-height: 1.3; }
.target-toolbar { min-width: 0; }
.target-toolbar-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: end; gap: .75rem; }
.target-toolbar-fields :deep([data-slot="field"]) { gap: .35rem; }
.tools-workspace { min-width: 0; }
.section-tabs-list { display: grid; width: 100%; height: auto; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.section-tabs-list :deep(button) { min-height: 2.5rem; }
.section-card-header { display: flex; flex-direction: row; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.entity-mode-toggle { display: grid; flex: none; grid-template-columns: repeat(5, minmax(0, 1fr)); }
.entity-mode-toggle :deep(button) { min-width: 6.5rem; }
.catalog-content { display: flex; flex-direction: column; gap: .75rem; }
.catalog-loading { display: flex; min-height: 15rem; align-items: center; justify-content: center; gap: .5rem; color: var(--muted-foreground); font-size: .875rem; }
.entity-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr)); gap: .5rem; }
.entity-results-scroll { height: clamp(18rem, calc(100dvh - 40rem), 24rem); padding-inline-end: .75rem; }
.entity-option { display: grid; min-width: 0; min-height: 3.5rem; grid-template-columns: 2.75rem minmax(0, 1fr) auto; align-items: center; gap: .5rem; border: 1px solid var(--border); border-radius: .375rem; background: var(--background); padding: .375rem .5rem; text-align: left; transition: border-color .15s ease, background-color .15s ease; }
.entity-option:hover { border-color: color-mix(in oklab, var(--primary) 55%, var(--border)); background: var(--accent); }
.entity-option--selected { border-color: var(--primary); background: color-mix(in oklab, var(--primary) 8%, var(--background)); box-shadow: 0 0 0 1px var(--primary); }
.entity-artwork { display: flex; inline-size: 2.75rem; block-size: 2.75rem; align-items: center; justify-content: center; overflow: hidden; border-radius: .25rem; background: var(--muted); color: var(--muted-foreground); }
.entity-artwork img { inline-size: 100%; block-size: 100%; object-fit: contain; }
.entity-copy { display: flex; min-width: 0; flex-direction: column; gap: .0625rem; }
.entity-copy strong, .entity-copy code { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.entity-copy strong { font-size: .875rem; }
.entity-copy code, .selected-entity code { color: var(--muted-foreground); font-size: .75rem; }
.operation-footer { display: grid; grid-template-columns: minmax(14rem, 1fr) minmax(0, auto) auto; align-items: end; gap: 1rem; }
.entity-submit-button { height: auto; min-height: 2.25rem; min-width: 0; max-width: 20rem; white-space: normal; overflow-wrap: anywhere; }
.operation-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr)); }
.selected-entity { display: flex; min-width: 0; align-items: center; gap: .625rem; font-size: .75rem; }
.selected-entity-artwork { display: flex; inline-size: 2.75rem; block-size: 2.75rem; flex: none; align-items: center; justify-content: center; overflow: hidden; border-radius: .375rem; background: var(--muted); color: var(--muted-foreground); }
.selected-entity-artwork img { inline-size: 100%; block-size: 100%; object-fit: contain; }
.selected-entity-copy { display: flex; min-width: 0; flex-direction: column; gap: .1rem; }
.selected-entity-copy > span, .target-summary span { color: var(--muted-foreground); }
.selected-entity-copy strong, .selected-entity-copy code { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.selected-entity .clear-filter { flex: none; }
.operation-content { min-height: 0; container-type: inline-size; }
.game-tools-page--embedded .player-operation-card { overflow: visible; border: 0; background: transparent; box-shadow: none; }
.game-tools-page--embedded .player-operation-content { padding: .25rem 0 0; }
.field-copy { display: flex; min-width: 0; flex-direction: column; gap: .25rem; }
.operation-workbench { display: grid; grid-template-columns: minmax(0, 1.15fr) auto minmax(22rem, 1fr); align-items: stretch; gap: 1rem; }
.operation-workbench--player { block-size: clamp(20rem, 42dvh, 23rem); grid-template-columns: minmax(15rem, 17rem) auto minmax(0, 1fr); align-items: stretch; }
.operation-workbench--player > .action-picker { min-block-size: 0; overflow-y: auto; overscroll-behavior: contain; padding-inline-end: .25rem; scrollbar-gutter: stable; }
.operation-workbench-separator--horizontal { display: none; }
.operation-editor { position: sticky; top: 1rem; display: flex; min-width: 0; align-self: start; flex-direction: column; gap: .75rem; scroll-margin-top: 1rem; }
.operation-editor-header { display: flex; min-height: 2.25rem; align-items: center; gap: .625rem; }
.operation-editor-icon { display: flex; inline-size: 2.25rem; block-size: 2.25rem; flex: none; align-items: center; justify-content: center; border-radius: .5rem; background: var(--muted); color: var(--muted-foreground); }
.operation-editor-icon :deep(svg) { inline-size: 1rem; block-size: 1rem; }
.operation-editor-copy { display: flex; min-width: 0; flex-wrap: wrap; align-items: center; gap: .375rem .5rem; }
.operation-editor-copy strong { overflow-wrap: anywhere; }
.operation-editor-fields { gap: .75rem; }
.player-operation-editor { block-size: 100%; overflow: hidden; }
.player-operation-editor .operation-editor-fields { min-block-size: 0; max-width: 42rem; flex: 1 1 auto; overflow-y: auto; overscroll-behavior: contain; padding-inline-end: .5rem; scrollbar-gutter: stable; }
.operation-editor-actions { display: flex; flex: none; align-items: flex-end; justify-content: space-between; gap: 1rem; padding-top: .25rem; }
.player-submit-button { height: auto; min-height: 2.75rem; max-width: 20rem; margin-inline-start: auto; white-space: normal; overflow-wrap: anywhere; }
.action-picker { min-width: 0; }
.action-picker-groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: 1rem 1.5rem; }
.action-picker-group { min-width: 0; }
.operation-editor .action-picker-groups { grid-template-columns: minmax(0, 1fr); gap: .75rem; }
.operation-editor .action-picker-group { display: grid; grid-template-columns: minmax(5.5rem, auto) minmax(0, 1fr); align-items: start; gap: .75rem; }
.operation-editor .action-picker-group > :deep([data-slot='field-label']) { padding-top: .55rem; }
.operation-editor .action-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.operation-editor .action-grid > :deep([data-slot='toggle-group-item']:only-child) { grid-column: 1 / -1; }
.operation-category-tabs { display: grid; width: 100%; height: auto; }
.operation-category-tabs--player { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.operation-category-tabs--world { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.operation-category-tabs :deep(button) { height: auto; min-height: 2.5rem; white-space: normal; overflow-wrap: anywhere; }
.operation-category-tabs--player :deep(button) { min-height: 2.75rem; padding-inline: .375rem; font-size: .8rem; cursor: pointer; touch-action: manipulation; }
.operation-category-content { margin-top: .5rem; }
.action-grid { display: grid; width: 100%; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.action-grid--dense { grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr)); }
.action-choice { height: auto; min-width: 0; min-height: 2.65rem; justify-content: flex-start; overflow: hidden; padding-block: .4rem; white-space: normal; overflow-wrap: anywhere; }
.action-choice > span { min-width: 0; flex: 1 1 auto; text-align: left; white-space: normal; overflow-wrap: anywhere; }
.action-choice-state { flex: none; margin-inline-start: auto; }
.operation-workbench--player > .action-picker :deep(.player-action-grid) { display: grid; width: 100%; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: stretch; gap: .5rem; }
.operation-workbench--player > .action-picker :deep(.player-action-choice) { display: grid; width: 100%; min-height: 4rem; grid-template-columns: 1.125rem minmax(0, 1fr) 1.125rem; align-items: center; justify-content: stretch; border-radius: .375rem; padding: .75rem; cursor: pointer; touch-action: manipulation; }
.operation-workbench--player > .action-picker :deep(.player-action-choice > span) { min-width: 0; text-align: left; white-space: normal; overflow-wrap: anywhere; }
.operation-workbench--player > .action-picker :deep(.player-action-choice .action-choice-state) { grid-column: 3; margin-inline-start: 0; }
.compact-option-grid { display: grid; width: 100%; grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr)); }
.compact-option-grid :deep(button) { height: auto; min-height: 2.5rem; padding-block: .35rem; white-space: normal; }
.entity-action-picker { min-width: 0; grid-column: 1 / -1; }
.action-category-tabs { display: grid; width: 100%; height: auto; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.action-category-tabs :deep(button) { min-height: 2.5rem; white-space: normal; }
.two-column-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.three-column-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.four-column-fields { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.stat-toggle, .moon-toggle { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); }
.clock-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.clock-description { grid-column: 1 / -1; }
.simple-footer { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; }
.simple-footer--locked { justify-content: flex-end; }
.target-summary { display: flex; min-width: 0; flex-direction: column; gap: .2rem; font-size: .875rem; }
.target-summary strong { overflow-wrap: anywhere; }
@container (max-width: 52rem) {
  .operation-workbench--player { block-size: auto; grid-template-columns: 1fr; }
  .operation-workbench--player > .action-picker { overflow: visible; padding-inline-end: 0; scrollbar-gutter: auto; }
  .operation-workbench--player .operation-workbench-separator--vertical { display: none; }
  .operation-workbench--player .operation-workbench-separator--horizontal { display: block; }
  .player-operation-editor { position: static; block-size: auto; overflow: visible; }
  .player-operation-editor .operation-editor-fields { overflow: visible; padding-inline-end: 0; scrollbar-gutter: auto; }
}
@media (max-width: 1100px) {
  .game-tools-header { grid-template-columns: minmax(0, 1fr) auto; }
  .target-toolbar { grid-column: 1 / -1; grid-row: 2; }
  .section-card-header { flex-direction: column; }
  .entity-mode-toggle { width: 100%; }
  .entity-mode-toggle :deep(button) { min-width: 0; }
  .four-column-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .operation-workbench { grid-template-columns: 1fr; }
  .operation-workbench--player { block-size: auto; }
  .operation-workbench--player > .action-picker { overflow: visible; padding-inline-end: 0; scrollbar-gutter: auto; }
  .operation-editor { position: static; }
  .player-operation-editor { block-size: auto; overflow: visible; }
  .player-operation-editor .operation-editor-fields { overflow: visible; padding-inline-end: 0; scrollbar-gutter: auto; }
  .action-choice-next { transform: rotate(90deg); }
  .operation-workbench-separator--vertical { display: none; }
  .operation-workbench-separator--horizontal { display: block; }
}
@media (max-width: 900px) {
  .target-toolbar-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .action-picker-groups { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .target-toolbar-fields { grid-template-columns: 1fr; }
  .entity-mode-toggle { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .operation-category-tabs--player, .operation-category-tabs--world { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .entity-grid, .operation-footer, .clock-fields, .two-column-fields, .three-column-fields, .four-column-fields { grid-template-columns: 1fr; }
  .entity-results-scroll { height: 20rem; }
  .action-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .player-operation-editor .action-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .stat-toggle, .moon-toggle { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .operation-footer > button, .simple-footer > button { width: 100%; }
  .entity-submit-button { max-width: none; }
  .simple-footer { flex-direction: column; align-items: stretch; }
  .operation-editor-actions { flex-direction: column; align-items: stretch; }
  .player-submit-button { width: 100%; max-width: none; }
  .operation-editor .action-picker-group { grid-template-columns: minmax(0, 1fr); gap: .35rem; }
  .operation-editor .action-picker-group > :deep([data-slot='field-label']) { padding-top: 0; }
}
</style>
