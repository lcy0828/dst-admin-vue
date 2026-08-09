<script setup>
import { Primitive } from 'reka-ui'
import { cn } from '@/lib/utils'
import { sidebarMenuButtonVariants } from '.'

const props = defineProps({
  as: { type: null, default: 'button' },
  asChild: { type: Boolean, required: false },
  variant: { type: String, default: 'default' },
  size: { type: String, default: 'default' },
  isActive: { type: Boolean, required: false },
  class: {
    type: [Boolean, null, String, Object, Array],
    required: false,
    skipCheck: true,
  },
})
</script>

<template>
  <Primitive
    data-slot="sidebar-menu-button"
    data-sidebar="menu-button"
    :data-size="size"
    :data-active="isActive || undefined"
    :class="cn(sidebarMenuButtonVariants({ variant, size }), props.class)"
    :as="as"
    :as-child="asChild"
    v-bind="$attrs"
  >
    <slot />
  </Primitive>
</template>
