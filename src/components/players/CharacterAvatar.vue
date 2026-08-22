<script setup>
import { computed } from 'vue'
import { UserRound } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { normalizePlayerCharacterPrefab, playerCharacterLabel } from '@/i18n/playerMessages'

const props = defineProps({
  prefab: { type: String, default: '' },
  name: { type: String, default: '' },
  size: { type: String, default: 'default' }
})

const { t } = useI18n()
const assetBaseUrl = `${import.meta.env.BASE_URL}static/characters/`
const characterId = computed(() => normalizePlayerCharacterPrefab(props.prefab))
const characterName = computed(() => playerCharacterLabel(props.prefab, t))
const source = computed(() => characterId.value
  ? `${assetBaseUrl}${characterId.value}.webp`
  : '')
const fallback = computed(() => {
  const value = String(props.name || props.prefab || '?').trim()
  return value.slice(0, 1).toUpperCase() || '?'
})
</script>

<template>
  <Avatar :size="size" :aria-label="characterName" :title="characterName">
    <AvatarImage v-if="source" :src="source" :alt="characterName" />
    <AvatarFallback :delay-ms="source ? 150 : 0">
      <span v-if="fallback !== '?'">{{ fallback }}</span>
      <UserRound v-else />
    </AvatarFallback>
  </Avatar>
</template>
