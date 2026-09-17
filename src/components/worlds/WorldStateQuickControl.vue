<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ArrowRight,
  CloudOff,
  CloudRain,
  Droplets,
  Leaf,
  Moon,
  RefreshCw,
  Snowflake,
  Sprout,
  Sun,
  Sunset,
  ThermometerSun
} from '@lucide/vue'
import { Button as UiButton } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { Progress as UiProgress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const props = defineProps({
  kind: { type: String, required: true },
  label: { type: String, required: true },
  value: { type: String, default: '--' },
  icon: { type: [Object, Function], default: null },
  progress: { type: Number, default: null },
  snapshot: { type: Object, default: null },
  disabled: { type: Boolean, default: false },
  pendingKey: { type: String, default: '' }
})

const emit = defineEmits(['execute'])
const { t } = useI18n()
const open = ref(false)
const skipDays = ref(1)
const wetness = ref(0)
const temperature = ref(20)

const seasonOptions = [
  { value: 'autumn', icon: Leaf },
  { value: 'winter', icon: Snowflake },
  { value: 'spring', icon: Sprout },
  { value: 'summer', icon: Sun }
]
const phaseOptions = [
  { value: 'day', icon: Sun },
  { value: 'dusk', icon: Sunset },
  { value: 'night', icon: Moon }
]
const precipitationOptions = [
  { value: 'start', icon: CloudRain },
  { value: 'stop', icon: CloudOff },
  { value: 'dynamic', icon: RefreshCw }
]

const currentSeason = computed(() => String(props.snapshot?.season || '').trim().toLowerCase())
const currentPhase = computed(() => String(props.snapshot?.phase || '').trim().toLowerCase())
const validSkipDays = computed(() => Number.isInteger(skipDays.value) && skipDays.value >= 1 && skipDays.value <= 200)
const validWetness = computed(() => Number.isFinite(wetness.value) && wetness.value >= 0 && wetness.value <= 100)
const validTemperature = computed(() => Number.isFinite(temperature.value) && temperature.value >= -25 && temperature.value <= 95)
const progressValue = computed(() => Number.isFinite(props.progress) ? props.progress : null)

watch(
  () => props.snapshot?.wetness,
  value => {
    if (Number.isFinite(value)) wetness.value = clamp(value, 0, 100)
  },
  { immediate: true }
)

watch(
  () => props.snapshot?.temperature,
  value => {
    if (Number.isFinite(value)) temperature.value = clamp(value, -25, 95)
  },
  { immediate: true }
)

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value)))
}

function numberFromControl(value) {
  const number = Number(Array.isArray(value) ? value[0] : value)
  return Number.isFinite(number) ? number : null
}

function setSkipDays(value) {
  const number = numberFromControl(value)
  if (number !== null) skipDays.value = clamp(Math.round(number), 1, 200)
}

function setWetnessValue(value) {
  const number = numberFromControl(value)
  if (number !== null) wetness.value = clamp(number, 0, 100)
}

function setTemperatureValue(value) {
  const number = numberFromControl(value)
  if (number !== null) temperature.value = clamp(number, -25, 95)
}

function execute(actionKey, commandId, argumentsMap, labelKey, labelParams = {}) {
  open.value = false
  emit('execute', { actionKey, commandId, arguments: argumentsMap, labelKey, labelParams })
}

function skip(count) {
  const days = Number(count)
  if (!Number.isInteger(days) || days < 1 || days > 200) return
  execute(`skip-days-${days}`, 'skip_days', { days }, days === 1
    ? 'servers.workspace.worlds.quickActions.actions.nextDay'
    : 'servers.workspace.worlds.quickActions.actions.skipDays', { count: days })
}

function setSeason(value) {
  if (!value || value === currentSeason.value) return
  execute(`season-${value}`, 'set_season', { season: value }, 'servers.workspace.worlds.quickActions.actions.setSeason', {
    season: t(`servers.workspace.worlds.quickActions.seasons.${value}`)
  })
}

function setPhase(value) {
  if (!value || value === currentPhase.value) return
  execute(`phase-${value}`, 'set_phase', { phase: value }, 'servers.workspace.worlds.quickActions.actions.setPhase', {
    phase: t(`servers.workspace.worlds.quickActions.phases.${value}`)
  })
}

function setPrecipitation(value) {
  if (!value) return
  execute(`precipitation-${value}`, 'set_precipitation', { mode: value }, 'servers.workspace.worlds.quickActions.actions.setPrecipitation', {
    mode: t(`servers.workspace.worlds.quickActions.precipitationModes.${value}`)
  })
}

function setWetness() {
  if (!validWetness.value) return
  const value = Number(wetness.value)
  execute(`wetness-${value}`, 'set_world_wetness', { value }, 'servers.workspace.worlds.quickActions.actions.setWetness', { value })
}

function restoreTemperature() {
  execute('temperature-dynamic', 'set_world_temperature', { mode: 'dynamic' }, 'servers.workspace.worlds.quickActions.actions.dynamicTemperature')
}

function setTemperature() {
  if (!validTemperature.value) return
  const value = Number(temperature.value)
  execute(`temperature-fixed-${value}`, 'set_world_temperature', { mode: 'fixed', value }, 'servers.workspace.worlds.quickActions.actions.fixedTemperature', { value })
}
</script>

<template>
  <div class="world-state-control" @click.stop @keydown.stop>
    <dt>{{ label }}</dt>
    <dd>
      <Popover v-model:open="open">
        <PopoverTrigger as-child>
          <UiButton
            type="button"
            variant="ghost"
            size="xs"
            class="world-state-trigger"
            :disabled="disabled"
            :aria-label="t('servers.workspace.worlds.quickActions.open', { label, value })"
          >
            <Spinner v-if="pendingKey" data-icon="inline-start" />
            <component :is="icon" v-else-if="icon" data-icon="inline-start" aria-hidden="true" />
            <span>{{ value }}</span>
          </UiButton>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          :class="kind === 'weather' ? 'world-state-popover world-state-popover--weather' : 'world-state-popover'"
          @click.stop
          @keydown.stop
        >
          <PopoverHeader>
            <PopoverTitle>{{ t(`servers.workspace.worlds.quickActions.${kind}.title`) }}</PopoverTitle>
          </PopoverHeader>

          <FieldGroup v-if="kind === 'day'" class="quick-control-fields">
            <UiButton type="button" size="sm" :disabled="Boolean(pendingKey)" @click="skip(1)">
              <Sun data-icon="inline-start" />
              {{ t('servers.workspace.worlds.quickActions.day.next') }}
            </UiButton>
            <Field>
              <FieldLabel for="quick-skip-days">{{ t('servers.workspace.worlds.quickActions.day.skip') }}</FieldLabel>
              <div class="quick-number-action">
                <InputGroup>
                  <InputGroupInput
                    id="quick-skip-days"
                    :model-value="String(skipDays)"
                    type="number"
                    min="1"
                    max="200"
                    step="1"
                    @update:model-value="setSkipDays"
                  />
                  <InputGroupAddon align="inline-end">{{ t('servers.workspace.worlds.quickActions.units.days') }}</InputGroupAddon>
                </InputGroup>
                <UiButton type="button" size="sm" :disabled="!validSkipDays || Boolean(pendingKey)" @click="skip(skipDays)">
                  <ArrowRight data-icon="inline-start" />
                  {{ t('servers.workspace.worlds.quickActions.apply') }}
                </UiButton>
              </div>
              <FieldDescription>{{ t('servers.workspace.worlds.quickActions.day.range') }}</FieldDescription>
            </Field>
          </FieldGroup>

          <Field v-else-if="kind === 'season'">
            <FieldLabel>{{ t('servers.workspace.worlds.quickActions.season.choose') }}</FieldLabel>
            <ToggleGroup :model-value="currentSeason" type="single" variant="outline" size="sm" class="quick-option-grid" @update:model-value="setSeason">
              <ToggleGroupItem v-for="option in seasonOptions" :key="option.value" :value="option.value" :disabled="Boolean(pendingKey)">
                <component :is="option.icon" data-icon="inline-start" />
                {{ t(`servers.workspace.worlds.quickActions.seasons.${option.value}`) }}
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>

          <FieldGroup v-else-if="kind === 'phase'" class="quick-control-fields">
            <UiButton type="button" size="sm" :disabled="Boolean(pendingKey)" @click="execute('next-phase', 'next_phase', {}, 'servers.workspace.worlds.quickActions.actions.nextPhase')">
              <RefreshCw data-icon="inline-start" />
              {{ t('servers.workspace.worlds.quickActions.phase.next') }}
            </UiButton>
            <Field>
              <FieldLabel>{{ t('servers.workspace.worlds.quickActions.phase.choose') }}</FieldLabel>
              <ToggleGroup :model-value="currentPhase" type="single" variant="outline" size="sm" class="quick-option-grid quick-option-grid--three" @update:model-value="setPhase">
                <ToggleGroupItem v-for="option in phaseOptions" :key="option.value" :value="option.value" :disabled="Boolean(pendingKey)">
                  <component :is="option.icon" data-icon="inline-start" />
                  {{ t(`servers.workspace.worlds.quickActions.phases.${option.value}`) }}
                </ToggleGroupItem>
              </ToggleGroup>
            </Field>
          </FieldGroup>

          <FieldGroup v-else-if="kind === 'weather'" class="quick-control-fields">
            <Field>
              <FieldLabel>{{ t('servers.workspace.worlds.quickActions.weather.precipitation') }}</FieldLabel>
              <ToggleGroup model-value="" type="single" variant="outline" size="sm" class="quick-option-grid quick-option-grid--three" @update:model-value="setPrecipitation">
                <ToggleGroupItem v-for="option in precipitationOptions" :key="option.value" :value="option.value" :disabled="Boolean(pendingKey)">
                  <component :is="option.icon" data-icon="inline-start" />
                  {{ t(`servers.workspace.worlds.quickActions.precipitationModes.${option.value}`) }}
                </ToggleGroupItem>
              </ToggleGroup>
            </Field>
            <Separator />
            <Field>
              <div class="quick-field-heading">
                <FieldLabel for="quick-world-wetness">{{ t('servers.workspace.worlds.quickActions.weather.wetness') }}</FieldLabel>
                <output for="quick-world-wetness">{{ Math.round(wetness) }}%</output>
              </div>
              <Slider
                id="quick-world-wetness"
                :model-value="[wetness]"
                :min="0"
                :max="100"
                :step="1"
                :disabled="Boolean(pendingKey)"
                @update:model-value="setWetnessValue"
              />
              <div class="quick-number-action">
                <InputGroup>
                  <InputGroupInput
                    :model-value="String(wetness)"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    :aria-label="t('servers.workspace.worlds.quickActions.weather.wetness')"
                    @update:model-value="setWetnessValue"
                  />
                  <InputGroupAddon align="inline-end">%</InputGroupAddon>
                </InputGroup>
                <UiButton type="button" size="sm" :disabled="!validWetness || Boolean(pendingKey)" @click="setWetness">
                  <Droplets data-icon="inline-start" />
                  {{ t('servers.workspace.worlds.quickActions.apply') }}
                </UiButton>
              </div>
            </Field>
            <Separator />
            <Field>
              <div class="quick-field-heading">
                <FieldLabel for="quick-world-temperature">{{ t('servers.workspace.worlds.quickActions.weather.temperature') }}</FieldLabel>
                <output for="quick-world-temperature">{{ Number(temperature).toFixed(1) }} °C</output>
              </div>
              <Slider
                id="quick-world-temperature"
                :model-value="[temperature]"
                :min="-25"
                :max="95"
                :step="1"
                :disabled="Boolean(pendingKey)"
                @update:model-value="setTemperatureValue"
              />
              <div class="quick-number-action">
                <InputGroup>
                  <InputGroupInput
                    :model-value="String(temperature)"
                    type="number"
                    min="-25"
                    max="95"
                    step="1"
                    :aria-label="t('servers.workspace.worlds.quickActions.weather.temperature')"
                    @update:model-value="setTemperatureValue"
                  />
                  <InputGroupAddon align="inline-end">°C</InputGroupAddon>
                </InputGroup>
                <UiButton type="button" size="sm" :disabled="!validTemperature || Boolean(pendingKey)" @click="setTemperature">
                  <ThermometerSun data-icon="inline-start" />
                  {{ t('servers.workspace.worlds.quickActions.weather.fix') }}
                </UiButton>
              </div>
              <UiButton type="button" variant="outline" size="sm" :disabled="Boolean(pendingKey)" @click="restoreTemperature">
                <RefreshCw data-icon="inline-start" />
                {{ t('servers.workspace.worlds.quickActions.weather.dynamicTemperature') }}
              </UiButton>
              <FieldDescription>{{ t('servers.workspace.worlds.quickActions.weather.temperatureRange') }}</FieldDescription>
            </Field>
          </FieldGroup>
        </PopoverContent>
      </Popover>
    </dd>
    <UiProgress
      v-if="progressValue !== null"
      :model-value="progressValue"
      :aria-label="t('servers.workspace.worlds.quickActions.progress', { label, progress: Math.round(progressValue) })"
    />
  </div>
</template>

<style scoped>
.world-state-control { min-width: 0; }
.world-state-trigger { width: 100%; min-width: 0; justify-content: flex-start; padding-inline: .25rem; }
.world-state-trigger > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.world-state-control > [data-slot='progress'] { max-width: 88px; margin-top: 4px; }
.world-state-popover { width: min(19rem, calc(100vw - 2rem)); }
.world-state-popover--weather { width: min(22rem, calc(100vw - 2rem)); }
.quick-control-fields { gap: .75rem; }
.quick-number-action { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: .5rem; }
.quick-option-grid { display: grid; width: 100%; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.quick-option-grid--three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.quick-option-grid :deep([data-slot='toggle-group-item']) { min-width: 0; }
.quick-field-heading { display: flex; align-items: center; justify-content: space-between; gap: .75rem; }
.quick-field-heading output { color: var(--muted-foreground); font-size: .75rem; font-variant-numeric: tabular-nums; }

@media (max-width: 420px) {
  .quick-option-grid--three { grid-template-columns: minmax(0, 1fr); }
}
</style>
