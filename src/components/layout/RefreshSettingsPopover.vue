<script setup>
import { computed } from 'vue'
import { Activity, TimerReset } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  ROOM_REFRESH_INTERVAL_OPTIONS_MS,
  SYSTEM_RESOURCE_REFRESH_INTERVAL_OPTIONS_MS,
  useRoomRefreshInterval,
  useSystemResourceRefreshInterval
} from '@/composables/useDashboardRefreshIntervals'

const { t } = useI18n()
const {
  refreshIntervalMs: systemRefreshIntervalMs,
  setRefreshInterval: setSystemRefreshInterval
} = useSystemResourceRefreshInterval()
const {
  refreshIntervalMs: roomRefreshIntervalMs,
  setRefreshInterval: setRoomRefreshInterval
} = useRoomRefreshInterval()

const systemIntervals = SYSTEM_RESOURCE_REFRESH_INTERVAL_OPTIONS_MS.map(value => ({
  value: String(value),
  label: `${value / 1000}s`
}))
const roomIntervals = ROOM_REFRESH_INTERVAL_OPTIONS_MS.map(value => ({
  value: String(value),
  label: `${value / 1000}s`
}))

const systemInterval = computed({
  get: () => String(systemRefreshIntervalMs.value),
  set: setSystemRefreshInterval
})
const roomInterval = computed({
  get: () => String(roomRefreshIntervalMs.value),
  set: setRoomRefreshInterval
})

const triggerLabel = computed(() => t('dashboard.resources.refreshSettings.triggerAria', {
  system: `${systemRefreshIntervalMs.value / 1000}s`,
  room: `${roomRefreshIntervalMs.value / 1000}s`
}))
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button
        variant="ghost"
        size="icon-sm"
        :aria-label="triggerLabel"
        :title="triggerLabel"
      >
        <TimerReset />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" class="w-72">
      <PopoverHeader>
        <PopoverTitle>{{ t('dashboard.resources.refreshSettings.title') }}</PopoverTitle>
        <PopoverDescription>{{ t('dashboard.resources.refreshSettings.description') }}</PopoverDescription>
      </PopoverHeader>
      <div class="mt-3 flex flex-col gap-3">
        <Field>
          <FieldLabel for="refresh-settings-system">
            <Activity class="size-3.5 text-muted-foreground" />
            {{ t('dashboard.resources.refreshSettings.systemLabel') }}
          </FieldLabel>
          <Select v-model="systemInterval">
            <SelectTrigger
              id="refresh-settings-system"
              class="w-full"
              :aria-label="t('dashboard.resources.systemRefreshIntervalAria', { value: `${systemRefreshIntervalMs / 1000}s` })"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              <SelectGroup>
                <SelectItem v-for="item in systemIntervals" :key="item.value" :value="item.value">
                  {{ item.label }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel for="refresh-settings-room">
            <TimerReset class="size-3.5 text-muted-foreground" />
            {{ t('dashboard.resources.refreshSettings.roomLabel') }}
          </FieldLabel>
          <Select v-model="roomInterval">
            <SelectTrigger
              id="refresh-settings-room"
              class="w-full"
              :aria-label="t('dashboard.resources.roomRefreshIntervalAria', { value: `${roomRefreshIntervalMs / 1000}s` })"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              <SelectGroup>
                <SelectItem v-for="item in roomIntervals" :key="item.value" :value="item.value">
                  {{ item.label }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </PopoverContent>
  </Popover>
</template>
