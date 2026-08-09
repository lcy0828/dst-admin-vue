<script setup>
import { reactiveOmit } from '@vueuse/core'
import { ToggleGroupRoot, useForwardPropsEmits } from 'reka-ui'
import { provide } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  type: { type: String, default: undefined },
  modelValue: { type: null, default: undefined },
  defaultValue: { type: null, default: undefined },
  orientation: { type: String, default: undefined },
  dir: { type: String, default: undefined },
  disabled: { type: Boolean, default: false },
  rovingFocus: { type: Boolean, default: true },
  loop: { type: Boolean, default: true },
  asChild: { type: Boolean, default: false },
  as: { type: null, default: undefined },
  class: { type: [String, Object, Array], default: undefined },
  variant: { type: String, default: 'default' },
  size: { type: String, default: 'default' },
  spacing: { type: Number, default: 0 },
})

const emits = defineEmits(['update:modelValue'])

provide('toggleGroup', {
  variant: props.variant,
  size: props.size,
  spacing: props.spacing,
})

const delegatedProps = reactiveOmit(props, 'class', 'size', 'variant', 'spacing')
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <ToggleGroupRoot
    v-slot="slotProps"
    v-bind="forwarded"
    data-slot="toggle-group"
    :data-orientation="props.orientation || 'horizontal'"
    :data-size="props.size"
    :data-variant="props.variant"
    :data-spacing="props.spacing"
    :style="{ '--gap': props.spacing }"
    :class="cn('rounded-lg group/toggle-group flex w-fit flex-row items-center gap-[--spacing(var(--gap))] data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch', props.class)"
  >
    <slot v-bind="slotProps" />
  </ToggleGroupRoot>
</template>
