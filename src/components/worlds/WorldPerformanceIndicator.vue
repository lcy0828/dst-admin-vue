<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

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
    ? 'good'
    : normalizedScore.value === 1
      ? 'fair'
      : normalizedScore.value === 2
        ? 'poor'
        : 'unavailable'
})

const activeBars = computed(() => normalizedScore.value === null ? 0 : 3 - normalizedScore.value)
const statusLabel = computed(() => t(`servers.workspace.worlds.performance.states.${stateKey.value}`))
const accessibleLabel = computed(() => t('servers.workspace.worlds.performance.summary', { status: statusLabel.value }))
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <span
        class="world-performance"
        :class="`is-${stateKey}`"
        role="img"
        tabindex="0"
        :aria-label="accessibleLabel"
      >
        <span class="world-performance-bars" aria-hidden="true">
          <span v-for="bar in 3" :key="bar" class="world-performance-bar" :class="{ active: bar <= activeBars }" />
        </span>
        <span v-if="stateKey === 'unavailable'" class="world-performance-empty" aria-hidden="true">--</span>
      </span>
    </TooltipTrigger>
    <TooltipContent>
      {{ t(`servers.workspace.worlds.performance.descriptions.${stateKey}`) }}
    </TooltipContent>
  </Tooltip>
</template>

<style scoped>
.world-performance {
  --performance-color: var(--muted-foreground);
  position: relative;
  display: inline-flex;
  width: 24px;
  height: 20px;
  flex: 0 0 24px;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  cursor: help;
}

.world-performance:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 1px;
}

.world-performance.is-good {
  --performance-color: var(--success);
}

.world-performance.is-fair {
  --performance-color: var(--warning);
}

.world-performance.is-poor {
  --performance-color: var(--destructive);
}

.world-performance-bars {
  display: inline-flex;
  width: 16px;
  height: 12px;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
}

.world-performance-bar {
  width: 4px;
  border-radius: 1px 1px 0 0;
  background: var(--border);
}

.world-performance-bar:nth-child(1) {
  height: 5px;
}

.world-performance-bar:nth-child(2) {
  height: 8px;
}

.world-performance-bar:nth-child(3) {
  height: 11px;
}

.world-performance-bar.active {
  background: var(--performance-color);
}

.world-performance-empty {
  position: absolute;
  color: var(--muted-foreground);
  font-size: 10px;
  line-height: 1;
}

.world-performance.is-unavailable .world-performance-bars {
  opacity: 0;
}
</style>
