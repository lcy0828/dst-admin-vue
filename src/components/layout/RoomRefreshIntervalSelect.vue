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
  ROOM_REFRESH_INTERVAL_OPTIONS_MS,
  useRoomRefreshInterval
} from '@/composables/useDashboardRefreshIntervals'

const { t } = useI18n()
const {
  refreshIntervalMs,
  setRefreshInterval
} = useRoomRefreshInterval()

const intervals = ROOM_REFRESH_INTERVAL_OPTIONS_MS.map(value => ({
  value: String(value),
  label: `${value / 1000}s`
}))
const interval = computed({
  get: () => String(refreshIntervalMs.value),
  set: setRefreshInterval
})
const ariaLabel = computed(() => t('dashboard.resources.roomRefreshIntervalAria', {
  value: intervals.find(item => item.value === interval.value)?.label || '5s'
}))
</script>

<template>
  <Select v-model="interval">
    <SelectTrigger
      size="sm"
      class="w-[5.25rem]"
      :aria-label="ariaLabel"
      :title="ariaLabel"
    >
      <TimerReset />
      <SelectValue />
    </SelectTrigger>
    <SelectContent position="popper" align="end">
      <SelectGroup>
        <SelectLabel>{{ t('dashboard.resources.roomRefreshInterval') }}</SelectLabel>
        <SelectItem v-for="item in intervals" :key="item.value" :value="item.value">
          {{ item.label }}
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
