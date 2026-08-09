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
        'border-t px-5 py-3.5 group-data-[size=sm]/card:px-4 group-data-[size=sm]/card:py-3 flex items-center',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
