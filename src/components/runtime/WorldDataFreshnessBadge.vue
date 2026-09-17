<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatSystemDateTime } from '@/lib/dateTime.mjs'

const props = defineProps({
  freshness: { type: String, default: 'unavailable' },
  observedAt: { type: String, default: '' },
  ageSeconds: { type: Number, default: null }
})

const { locale, t } = useI18n()

const normalizedFreshness = computed(() => {
  return ['live', 'paused', 'delayed', 'stopped', 'unavailable'].includes(props.freshness)
    ? props.freshness
    : 'unavailable'
})

const variant = computed(() => {
  if (normalizedFreshness.value === 'live') return 'success'
  if (normalizedFreshness.value === 'paused') return 'info'
  if (normalizedFreshness.value === 'delayed') return 'warning'
  return 'outline'
})

const absoluteTime = computed(() => {
  return formatSystemDateTime(props.observedAt, {
    locale: locale.value,
    fallback: props.observedAt || t('runtimeData.noObservation'),
    dateStyle: 'medium',
    timeStyle: 'medium'
  })
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
