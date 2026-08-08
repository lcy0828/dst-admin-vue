<script setup>
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  class: { type: [String, Object, Array], default: undefined },
})
</script>

<template>
  <Input
    v-bind="$attrs"
    data-slot="input-group-control"
    :class="cn('rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 flex-1', props.class)"
  />
</template>
