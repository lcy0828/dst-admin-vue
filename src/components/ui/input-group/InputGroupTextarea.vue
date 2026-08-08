<script setup>
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  class: { type: [String, Object, Array], default: undefined },
})
</script>

<template>
  <Textarea
    v-bind="$attrs"
    data-slot="input-group-control"
    :class="cn('rounded-none border-0 bg-transparent py-2 shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 flex-1 resize-none', props.class)"
  />
</template>
