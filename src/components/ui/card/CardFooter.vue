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
    data-slot="card-footer"
    :class="
      cn(
        'bg-muted/25 border-t px-4 py-3 group-data-[size=sm]/card:px-3 group-data-[size=sm]/card:py-2.5 flex items-center',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
