<script setup>
import { reactiveOmit } from "@vueuse/core";
import { ProgressIndicator, ProgressRoot } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps({
  modelValue: { type: [Number, null], required: false, default: 0 },
  max: { type: Number, required: false },
  getValueLabel: { type: Function, required: false },
  getValueText: { type: Function, required: false },
  variant: { type: String, default: 'default' },
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: {
    type: [Boolean, null, String, Object, Array],
    required: false,
    skipCheck: true,
  },
});

const delegatedProps = reactiveOmit(props, "class", "variant");
</script>

<template>
  <ProgressRoot
    data-slot="progress"
    v-bind="delegatedProps"
    :class="
      cn(
        'bg-muted h-1 rounded-full relative flex w-full items-center overflow-x-hidden',
        props.class,
      )
    "
  >
    <ProgressIndicator
      data-slot="progress-indicator"
      :class="cn('size-full flex-1 transition-all', { default: 'bg-primary', success: 'bg-success-foreground', destructive: 'bg-destructive' }[props.variant] || 'bg-primary')"
      :style="props.modelValue === null ? undefined : `transform: translateX(-${100 - props.modelValue}%);`"
      :data-indeterminate="props.modelValue === null || undefined"
    />
  </ProgressRoot>
</template>

<style scoped>
[data-indeterminate] {
  flex: none;
  width: 35%;
  animation: progress-travel 1.6s ease-in-out infinite;
}
@keyframes progress-travel {
  from { transform: translateX(-100%); }
  to { transform: translateX(290%); }
}
@media (prefers-reduced-motion: reduce) {
  [data-indeterminate] { animation: none; }
}
</style>
