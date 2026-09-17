<script setup>
import { computed, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check } from '@lucide/vue'
import { Button as UiButton } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const props = defineProps({
  kind: { type: String, required: true },
  label: { type: String, required: true },
  value: { type: String, default: '--' },
  icon: { type: [Object, Function], required: true },
  tooltip: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  historical: { type: Boolean, default: false },
  pending: { type: Boolean, default: false }
})

const emit = defineEmits(['execute'])
const { t } = useI18n()
const fieldId = `player-vital-${useId()}`
const open = ref(false)
const draft = ref(0)

const DEFAULT_TARGETS = Object.freeze({
  health: 100,
  hunger: 100,
  sanity: 100,
  moisture: 0,
  temperature: 0
})

const temperature = computed(() => props.kind === 'temperature')
const minimum = computed(() => temperature.value ? -20 : 0)
const maximum = computed(() => temperature.value ? 90 : 100)
const unit = computed(() => temperature.value ? '°C' : '%')
const defaultTarget = computed(() => DEFAULT_TARGETS[props.kind] ?? minimum.value)
const quickValues = computed(() => temperature.value
  ? [-20, 0, 35, 70, 90]
  : (props.kind === 'health' ? [1, 25, 50, 75, 100] : [0, 25, 50, 75, 100]))
const valid = computed(() => (
  Number.isFinite(draft.value) && draft.value >= minimum.value && draft.value <= maximum.value
))
const triggerLabel = computed(() => t('servers.workspace.players.quickActions.open', {
  label: props.label,
  value: props.value
}))

watch(
  () => props.kind,
  resetDraft,
  { immediate: true }
)

watch(open, value => {
  if (value) resetDraft()
})

function clamp(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return minimum.value
  return Math.min(maximum.value, Math.max(minimum.value, number))
}

function resetDraft() {
  draft.value = clamp(defaultTarget.value)
}

function setDraft(value) {
  const number = Number(Array.isArray(value) ? value[0] : value)
  if (Number.isFinite(number)) draft.value = clamp(number)
}

function selectQuickValue(value) {
  if (value === null || value === undefined || value === '') return
  setDraft(value)
}

function apply() {
  if (!valid.value || props.disabled || props.pending) return
  const value = Number(draft.value)
  open.value = false
  emit('execute', {
    actionKey: `stat-${props.kind}`,
    stat: props.kind,
    value,
    unit: unit.value
  })
}
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <span class="player-vital-control">
        <span
          v-if="disabled && !pending"
          class="player-metric is-static"
          :class="{ 'is-history': historical }"
          :aria-label="triggerLabel"
        >
          <component :is="icon" data-icon="inline-start" aria-hidden="true" />
          <span>{{ value }}</span>
        </span>
        <Popover v-else v-model:open="open">
          <PopoverTrigger as-child>
            <UiButton
              type="button"
              variant="ghost"
              size="xs"
              class="player-metric"
              :class="{ 'is-history': historical }"
              :disabled="pending"
              :aria-label="triggerLabel"
            >
              <Spinner v-if="pending" data-icon="inline-start" />
              <component :is="icon" v-else data-icon="inline-start" aria-hidden="true" />
              <span>{{ value }}</span>
            </UiButton>
          </PopoverTrigger>
          <PopoverContent align="start" class="player-vital-popover" @click.stop @keydown.stop>
            <PopoverHeader>
              <PopoverTitle>{{ t('servers.workspace.players.quickActions.title', { label }) }}</PopoverTitle>
            </PopoverHeader>
            <Field>
              <div class="player-vital-heading">
                <FieldLabel :for="fieldId">{{ t('servers.workspace.players.quickActions.targetValue') }}</FieldLabel>
                <output :for="fieldId">{{ draft }} {{ unit }}</output>
              </div>
              <Slider
                :id="fieldId"
                :model-value="[draft]"
                :min="minimum"
                :max="maximum"
                :step="1"
                :disabled="pending"
                @update:model-value="setDraft"
              />
              <ToggleGroup
                :model-value="String(draft)"
                type="single"
                variant="outline"
                size="xs"
                class="player-vital-presets"
                :aria-label="t('servers.workspace.players.quickActions.presets')"
                @update:model-value="selectQuickValue"
              >
                <ToggleGroupItem
                  v-for="quickValue in quickValues"
                  :key="quickValue"
                  :value="String(quickValue)"
                  :disabled="pending"
                >
                  {{ quickValue }}
                </ToggleGroupItem>
              </ToggleGroup>
              <div class="player-vital-apply">
                <InputGroup>
                  <InputGroupInput
                    :model-value="String(draft)"
                    type="number"
                    :min="minimum"
                    :max="maximum"
                    step="1"
                    :aria-label="t('servers.workspace.players.quickActions.targetValue')"
                    @update:model-value="setDraft"
                  />
                  <InputGroupAddon align="inline-end">{{ unit }}</InputGroupAddon>
                </InputGroup>
                <UiButton type="button" size="sm" :disabled="!valid || pending" @click="apply">
                  <Check data-icon="inline-start" />
                  {{ t('servers.workspace.players.quickActions.apply') }}
                </UiButton>
              </div>
              <FieldDescription>{{ t('servers.workspace.players.quickActions.range', { minimum, maximum, unit }) }}</FieldDescription>
            </Field>
          </PopoverContent>
        </Popover>
      </span>
    </TooltipTrigger>
    <TooltipContent>{{ tooltip || triggerLabel }}</TooltipContent>
  </Tooltip>
</template>

<style scoped>
.player-vital-control { display: inline-flex; min-width: 0; }
.player-metric { height: 20px; min-width: 0; padding-inline: 4px; color: var(--foreground); font-size: 11px; font-variant-numeric: tabular-nums; }
.player-metric.is-static { display: inline-flex; align-items: center; gap: 4px; cursor: default; }
.player-metric.is-static > svg { width: 12px; height: 12px; color: var(--muted-foreground); }
.player-metric.is-history { color: var(--foreground); }
.player-metric > span { white-space: nowrap; }
.player-vital-popover { width: min(18rem, calc(100vw - 2rem)); }
.player-vital-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.player-vital-heading output { color: var(--muted-foreground); font-size: 12px; font-variant-numeric: tabular-nums; }
.player-vital-presets { display: grid; width: 100%; grid-template-columns: repeat(5, minmax(0, 1fr)); margin-top: 2px; }
.player-vital-presets :deep([data-slot='toggle-group-item']) { min-width: 0; }
.player-vital-apply { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; }

@media (max-width: 380px) {
  .player-vital-presets { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 520px) {
  .player-metric { height: 24px; padding-inline: 6px; }
}
</style>
