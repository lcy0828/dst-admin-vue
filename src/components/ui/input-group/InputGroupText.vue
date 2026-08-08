<script setup>
import { cn } from '@/lib/utils'

const props = defineProps({
  class: { type: [String, Object, Array], default: undefined },
})
</script>

<template>
  <span :class="cn('text-muted-foreground gap-2 text-sm flex items-center [&_svg]:pointer-events-none', props.class)">
    <slot />
  </span>
</template>
