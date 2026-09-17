<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatSystemDateTime } from '@/lib/dateTime.mjs'
import { playerHistoryTime } from '@/lib/playerHistoryPresentation.mjs'

const props = defineProps({ value: { type: String, default: '' } })
const { locale } = useI18n()
const value = computed(() => playerHistoryTime(props.value))
const date = computed(() => formatSystemDateTime(value.value, {
  locale: locale.value, year: 'numeric', month: '2-digit', day: '2-digit'
}))
const clock = computed(() => formatSystemDateTime(value.value, {
  locale: locale.value, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
}))
</script>

<template>
  <time v-if="value" :datetime="value" class="flex flex-col gap-0.5 tabular-nums">
    <span>{{ date }}</span>
    <span class="text-xs text-muted-foreground">{{ clock }}</span>
  </time>
  <span v-else class="text-muted-foreground">—</span>
</template>
