<script setup>
import { cn } from "@/lib/utils";

const props = defineProps({
  class: {
    type: [Boolean, null, String, Object, Array],
    required: false,
    skipCheck: true,
  },
});
</script>

<template>
  <div
    data-slot="alert-action"
    :class="cn('col-start-2 row-start-1 row-span-4 shrink-0 self-start justify-self-end group-has-[>svg]/alert:col-start-3', props.class)"
  >
    <slot />
  </div>
</template>
