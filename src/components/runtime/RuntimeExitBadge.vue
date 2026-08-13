<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const props = defineProps({
  event: { type: Object, default: null }
})

const { locale, t } = useI18n()
const visible = computed(() => props.event?.type === 'unexpected_exit')
const sourceKey = computed(() => {
  const source = props.event?.source || 'external'
  return ['api', 'automation', 'game_update', 'system_monitor', 'external'].includes(source)
    ? source
    : 'external'
})
const occurredAt = computed(() => {
  if (!props.event?.occurredAt) return ''
  const date = new Date(props.event.occurredAt)
  if (!Number.isFinite(date.getTime())) return props.event.occurredAt
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'medium' }).format(date)
})
</script>

<template>
  <Tooltip v-if="visible">
    <TooltipTrigger as-child>
      <Badge variant="destructive">{{ t('runtimeAudit.unexpectedExit') }}</Badge>
    </TooltipTrigger>
    <TooltipContent>
      <div class="flex max-w-80 flex-col gap-1">
        <span>{{ event.message || t('runtimeAudit.defaultMessage') }}</span>
        <span>{{ t('runtimeAudit.source', { source: t(`runtimeAudit.sources.${sourceKey}`) }) }}</span>
        <span v-if="occurredAt" class="text-xs">{{ occurredAt }}</span>
      </div>
    </TooltipContent>
  </Tooltip>
</template>
