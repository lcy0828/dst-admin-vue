<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const props = defineProps({
  freshness: { type: String, default: 'unavailable' },
  observedAt: { type: String, default: '' },
  ageSeconds: { type: Number, default: null }
})

const { locale, t } = useI18n()

const normalizedFreshness = computed(() => {
  return ['live', 'delayed', 'stopped', 'unavailable'].includes(props.freshness)
    ? props.freshness
    : 'unavailable'
})

const variant = computed(() => {
  if (normalizedFreshness.value === 'live') return 'secondary'
  if (normalizedFreshness.value === 'delayed') return 'destructive'
  return 'outline'
})

const absoluteTime = computed(() => {
  if (!props.observedAt) return t('runtimeData.noObservation')
  const date = new Date(props.observedAt)
  if (!Number.isFinite(date.getTime())) return props.observedAt
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'medium'
  }).format(date)
})

const relativeTime = computed(() => {
  if (!props.observedAt) return ''
  const parsed = new Date(props.observedAt).getTime()
  if (!Number.isFinite(parsed) && !Number.isFinite(props.ageSeconds)) return ''
  const seconds = Number.isFinite(props.ageSeconds)
    ? Math.max(0, props.ageSeconds)
    : Math.max(0, Math.floor((Date.now() - parsed) / 1000))
  const formatter = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' })
  if (seconds < 60) return formatter.format(-Math.max(1, Math.floor(seconds)), 'second')
  if (seconds < 3600) return formatter.format(-Math.floor(seconds / 60), 'minute')
  if (seconds < 86400) return formatter.format(-Math.floor(seconds / 3600), 'hour')
  return formatter.format(-Math.floor(seconds / 86400), 'day')
})
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <Badge :variant="variant">
        {{ t(`runtimeData.freshness.${normalizedFreshness}`) }}
        <span v-if="relativeTime">· {{ relativeTime }}</span>
      </Badge>
    </TooltipTrigger>
    <TooltipContent>
      <div class="flex max-w-72 flex-col gap-1">
        <span>{{ t(`runtimeData.descriptions.${normalizedFreshness}`) }}</span>
        <span class="text-xs">{{ absoluteTime }}</span>
      </div>
    </TooltipContent>
  </Tooltip>
</template>
