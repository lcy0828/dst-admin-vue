<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePreferredReducedMotion } from '@vueuse/core'
import { CloudSun, Pause, Play, X } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldTitle } from '@/components/ui/field'
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { useRoomWeather } from '@/composables/useRoomWeather'
import { weatherMessages } from '@/i18n/weatherMessages'

const { t } = useI18n({ useScope: 'local', messages: weatherMessages })
const weather = useRoomWeather()
const open = ref(false)
const manual = computed(() => weather.preview.value?.manual === true)
const model = computed(() => weather.preview.value)
const reducedMotion = usePreferredReducedMotion()
const fields = [
  { key: 'season', options: ['spring', 'summer', 'autumn', 'winter'], messages: 'seasons' },
  { key: 'phase', options: ['day', 'dusk', 'night'], messages: 'phases' },
  { key: 'precipitation', options: ['none', 'rain', 'snow', 'acid_rain'], messages: 'conditions' }
]

function setOpen(value) {
  open.value = value
  if (value) {
    weather.startManualPreview()
    toast.dismiss('weather-preview')
  }
}
function select(key, value) {
  if (value) weather.updateManualPreview({ [key]: value })
}
function finish() { open.value = false; weather.stopPreview() }
// Turning weather off or leaving this room also closes its controls.
watch(manual, value => { if (!value) open.value = false })
</script>

<template>
  <Popover :open="open" :modal="false" @update:open="setOpen">
    <PopoverTrigger as-child>
      <Button :variant="manual ? 'secondary' : 'ghost'" size="sm" class="pointer-coarse:min-h-11 pointer-coarse:min-w-11" :aria-label="t('weather.controls.title')" :title="t('weather.controls.title')" :data-weather-preview="manual">
        <CloudSun data-icon="inline-start" />
        <span class="hidden sm:inline">{{ t(manual ? 'weather.controls.active' : 'weather.controls.button') }}</span>
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" :collision-padding="12" class="w-80 max-h-(--reka-popover-content-available-height) gap-4 overflow-y-auto p-4" :aria-label="t('weather.controls.title')">
      <div class="flex items-start justify-between gap-2">
        <PopoverHeader>
          <PopoverTitle>{{ t('weather.controls.title') }}</PopoverTitle>
          <PopoverDescription>{{ t('weather.controls.description') }}</PopoverDescription>
        </PopoverHeader>
        <Button variant="ghost" size="icon-sm" class="shrink-0 pointer-coarse:size-11" :aria-label="t('weather.controls.collapse')" @click="open = false"><X /></Button>
      </div>
      <FieldGroup v-if="model" class="gap-4">
        <Field v-for="field in fields" :key="field.key">
          <FieldTitle :id="`weather-preview-${field.key}`">{{ t(`weather.controls.${field.key}`) }}</FieldTitle>
          <ToggleGroup type="single" variant="outline" size="sm" :spacing="1" :model-value="model[field.key]" :aria-labelledby="`weather-preview-${field.key}`" class="w-full" @update:model-value="select(field.key, $event)">
            <ToggleGroupItem v-for="option in field.options" :key="option" :value="option" class="min-w-0 flex-1 pointer-coarse:min-h-11">{{ t(`weather.controls.${field.messages}.${option}`) }}</ToggleGroupItem>
          </ToggleGroup>
        </Field>
        <Field :data-disabled="model.precipitation === 'none'">
          <div class="flex items-center justify-between gap-2">
            <FieldTitle id="weather-preview-intensity">{{ t('weather.controls.intensity') }}</FieldTitle>
            <output class="text-xs tabular-nums text-muted-foreground">{{ Math.round(model.intensity * 100) }}%</output>
          </div>
          <Slider aria-labelledby="weather-preview-intensity" :model-value="[Math.round(model.intensity * 100)]" :min="0" :max="100" :step="5" :disabled="model.precipitation === 'none'" class="my-2 pointer-coarse:my-0 pointer-coarse:min-h-11" @update:model-value="weather.updateManualPreview({ intensity: $event[0] / 100 })" />
        </Field>
      </FieldGroup>
      <p v-if="reducedMotion === 'reduce'" class="text-xs text-muted-foreground">{{ t('weather.reducedMotion') }}</p>
      <Separator />
      <div v-if="model" class="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" class="pointer-coarse:min-h-11" :disabled="reducedMotion === 'reduce'" @click="weather.updateManualPreview({ paused: !model.paused })">
          <Play v-if="model.paused" data-icon="inline-start" /><Pause v-else data-icon="inline-start" />
          {{ t(model.paused ? 'weather.controls.play' : 'weather.controls.pause') }}
        </Button>
        <Button size="sm" class="pointer-coarse:min-h-11" @click="finish">{{ t('weather.stopPreview') }}</Button>
      </div>
    </PopoverContent>
  </Popover>
</template>
