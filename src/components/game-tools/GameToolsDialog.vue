<script setup>
import { computed, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogScrollContent,
  DialogTitle
} from '@/components/ui/dialog'

const EntityTools = defineAsyncComponent(() => import('@/views/servers/EntityTools.vue'))

const props = defineProps({
  open: { type: Boolean, default: false },
  roomId: { type: String, default: '' },
  roomName: { type: String, default: '' },
  worldId: { type: String, default: '' },
  worldName: { type: String, default: '' },
  playerId: { type: String, default: '' },
  player: { type: Object, default: null },
  initialSection: { type: String, default: 'entity' }
})

const emit = defineEmits(['update:open', 'player-state-refreshed', 'world-state-refreshed'])

const { t } = useI18n()
const playerName = computed(() => props.player?.player_name || props.player?.name || props.playerId)
const targetLabel = computed(() => [props.roomName, props.worldName].filter(Boolean).join(' / '))
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogScrollContent class="max-w-[calc(100vw-2rem)] gap-3 sm:max-w-6xl">
      <DialogHeader>
        <DialogTitle>{{ t('entityTools.workbench.playerTitle', { player: playerName }) }}</DialogTitle>
        <DialogDescription>{{ t('entityTools.workbench.playerDescription', { target: targetLabel }) }}</DialogDescription>
      </DialogHeader>
      <EntityTools
        v-if="open"
        embedded
        locked-target
        :initial-room-id="roomId"
        :initial-world-id="worldId"
        :initial-player-id="playerId"
        :initial-player="player"
        :initial-section="initialSection"
        @player-state-refreshed="emit('player-state-refreshed', $event)"
        @world-state-refreshed="emit('world-state-refreshed', $event)"
      />
    </DialogScrollContent>
  </Dialog>
</template>
