<script setup>
import { computed } from 'vue'
import { TimerReset } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  SYSTEM_RESOURCE_REFRESH_INTERVAL_OPTIONS_MS,
  useSystemResourceStatus
} from '@/composables/useSystemResourceStatus'

const { t } = useI18n()
const { refreshIntervalMs, setSystemResourceRefreshInterval } = useSystemResourceStatus()
const intervals = SYSTEM_RESOURCE_REFRESH_INTERVAL_OPTIONS_MS.map(value => ({
  value: String(value),
  label: `${value / 1000}s`
}))
const selectedInterval = computed({
  get: () => String(refreshIntervalMs.value),
  set: setSystemResourceRefreshInterval
})
const selectedLabel = computed(() => intervals.find(item => item.value === selectedInterval.value)?.label || '5s')
const ariaLabel = computed(() => t('dashboard.resources.refreshIntervalAria', { value: selectedLabel.value }))
</script>

<template>
  <Select v-model="selectedInterval">
    <SelectTrigger size="sm" class="min-w-[5.25rem]" :aria-label="ariaLabel" :title="ariaLabel">
      <TimerReset />
      <SelectValue />
    </SelectTrigger>
    <SelectContent position="popper" align="end">
      <SelectGroup>
        <SelectLabel>{{ t('dashboard.resources.refreshInterval') }}</SelectLabel>
        <SelectItem v-for="interval in intervals" :key="interval.value" :value="interval.value">
          {{ interval.label }}
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
