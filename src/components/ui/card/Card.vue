<script setup>
import { cn } from "@/lib/utils";

const props = defineProps({
  class: {
    type: [Boolean, null, String, Object, Array],
    required: false,
    skipCheck: true,
  },
  size: { type: String, required: false, default: "default" },
});
</script>

<template>
  <div
    data-slot="card"
    :data-size="size"
    :class="
      cn(
        'border-border bg-card text-card-foreground gap-0 overflow-hidden rounded-md border py-0 text-sm shadow-none *:[img:first-child]:rounded-t-md *:[img:last-child]:rounded-b-md group/card flex flex-col',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
