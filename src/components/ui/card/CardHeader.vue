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
    data-slot="card-header"
    :class="
      cn(
        'gap-1.5 px-5 py-4 group-data-[size=sm]/card:px-4 group-data-[size=sm]/card:py-3.5 group/card-header @container/card-header grid auto-rows-min items-start has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
