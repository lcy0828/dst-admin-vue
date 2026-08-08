<script setup>
import { reactiveOmit } from '@vueuse/core'
import { ToggleGroupItem, useForwardProps } from 'reka-ui'
import { inject } from 'vue'
import { cn } from '@/lib/utils'
import { toggleVariants } from '@/components/ui/toggle'

const props = defineProps({
  value: { type: null, required: true },
  disabled: { type: Boolean, default: false },
  asChild: { type: Boolean, default: false },
  as: { type: null, default: undefined },
  class: { type: [String, Object, Array], default: undefined },
  variant: { type: String, default: undefined },
  size: { type: String, default: undefined },
})

const context = inject('toggleGroup', {})
const delegatedProps = reactiveOmit(props, 'class', 'size', 'variant')
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <ToggleGroupItem
    v-slot="slotProps"
    v-bind="forwardedProps"
    data-slot="toggle-group-item"
    :data-variant="context.variant || props.variant"
    :data-size="context.size || props.size"
    :data-spacing="context.spacing"
    :class="cn(toggleVariants({ variant: context.variant || props.variant, size: context.size || props.size }), props.class)"
  >
    <slot v-bind="slotProps" />
  </ToggleGroupItem>
</template>
