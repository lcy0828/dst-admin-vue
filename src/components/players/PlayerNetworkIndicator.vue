<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { playerNetworkLabel } from '@/i18n/playerMessages.js'

const props = defineProps({
  score: { type: Number, default: null },
  available: { type: Boolean, default: false }
})

const { t } = useI18n()

const normalizedScore = computed(() => {
  const value = Number(props.score)
  return props.available && Number.isInteger(value) && value >= 0 && value <= 2 ? value : null
})

const stateKey = computed(() => {
  return normalizedScore.value === 0
    ? 'excellent'
    : normalizedScore.value === 1
      ? 'fair'
      : 'poor'
})

const activeBars = computed(() => normalizedScore.value === null ? 0 : 3 - normalizedScore.value)
const statusLabel = computed(() => playerNetworkLabel(normalizedScore.value, t))
const accessibleLabel = computed(() => t('servers.workspace.players.network.summary', {
  status: statusLabel.value,
  score: normalizedScore.value
}))
</script>

<template>
  <Tooltip v-if="normalizedScore !== null">
    <TooltipTrigger as-child>
      <span
        class="player-network"
        :class="`is-${stateKey}`"
        role="img"
        tabindex="0"
        :aria-label="accessibleLabel"
      >
        <span class="player-network-bars" aria-hidden="true">
          <span v-for="bar in 3" :key="bar" class="player-network-bar" :class="{ active: bar <= activeBars }" />
        </span>
      </span>
    </TooltipTrigger>
    <TooltipContent>
      {{ t('servers.workspace.players.network.description', { status: statusLabel, score: normalizedScore }) }}
    </TooltipContent>
  </Tooltip>
</template>

<style scoped>
.player-network {
  --network-color: var(--muted-foreground);
  position: relative;
  display: inline-flex;
  width: 24px;
  height: 18px;
  flex: 0 0 24px;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  cursor: help;
}

.player-network:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 1px;
}

.player-network.is-excellent {
  --network-color: var(--success);
}

.player-network.is-fair {
  --network-color: var(--warning);
}

.player-network.is-poor {
  --network-color: var(--destructive);
}

.player-network-bars {
  display: inline-flex;
  width: 16px;
  height: 12px;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
}

.player-network-bar {
  width: 4px;
  border-radius: 1px 1px 0 0;
  background: var(--border);
}

.player-network-bar:nth-child(1) {
  height: 5px;
}

.player-network-bar:nth-child(2) {
  height: 8px;
}

.player-network-bar:nth-child(3) {
  height: 11px;
}

.player-network-bar.active {
  background: var(--network-color);
}

</style>
