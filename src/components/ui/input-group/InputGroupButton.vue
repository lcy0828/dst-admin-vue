<script setup>
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { inputGroupButtonVariants } from '.'

const props = defineProps({
  variant: { type: String, default: 'ghost' },
  size: { type: String, default: 'xs' },
  class: { type: [String, Object, Array], default: undefined },
})
</script>

<template>
  <Button
    type="button"
    :data-size="props.size"
    :variant="props.variant"
    :class="cn(inputGroupButtonVariants({ size: props.size }), props.class)"
  >
    <slot />
  </Button>
</template>
