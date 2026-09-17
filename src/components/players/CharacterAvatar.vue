<script setup>
import { computed, ref, watch } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'
import { RefreshCw, UserRound } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { normalizePlayerCharacterPrefab, playerAvatarState, playerCharacterDisplayLabel } from '@/i18n/playerMessages'

const props = defineProps({
  prefab: { type: String, default: '' },
  name: { type: String, default: '' },
  player: { type: Object, default: null },
  size: { type: String, default: 'default' }
})

const { t } = useI18n()
const assetBaseUrl = `${import.meta.env.BASE_URL}static/characters/`
const player = computed(() => ({ ...props.player, prefab: props.prefab }))
const avatarState = computed(() => playerAvatarState(player.value))
const choosingCharacter = computed(() => ['selecting_character', 'loading'].includes(avatarState.value))
const characterId = computed(() => normalizePlayerCharacterPrefab(props.prefab))
const characterName = computed(() => playerCharacterDisplayLabel(player.value, t))
const reducedMotion = usePreferredReducedMotion()
const animationUnavailable = ref(false)
watch(characterId, () => { animationUnavailable.value = false })
const staticSource = computed(() => !choosingCharacter.value && characterId.value
  ? `${assetBaseUrl}${characterId.value}.webp`
  : '')
const animated = computed(() => Boolean(staticSource.value) && reducedMotion.value !== 'reduce' && !animationUnavailable.value)
const source = computed(() => animated.value
  ? `${assetBaseUrl}animated/${characterId.value}.webp`
  : staticSource.value)
function handleImageStatus(status) {
  if (status === 'error' && animated.value) animationUnavailable.value = true
}
</script>

<template>
  <Avatar :key="Boolean(source)" :size="size" role="img" :aria-label="characterName" :title="characterName" :data-avatar-state="avatarState" :data-avatar-motion="animated ? 'animated' : 'static'">
    <AvatarImage v-if="source" :src="source" :alt="characterName" @loading-status-change="handleImageStatus" />
    <AvatarFallback>
      <RefreshCw v-if="!source" class="motion-safe:animate-spin" aria-hidden="true" />
      <UserRound v-else />
    </AvatarFallback>
  </Avatar>
</template>
