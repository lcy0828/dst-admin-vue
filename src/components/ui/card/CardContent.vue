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
    data-slot="card-content"
    :class="cn('p-4 group-data-[size=sm]/card:p-3', props.class)"
  >
    <slot />
  </div>
</template>
