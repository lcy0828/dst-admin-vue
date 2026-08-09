<script setup>
import { ChevronLeftIcon } from "@lucide/vue";
import { reactiveOmit } from "@vueuse/core";
import { PaginationPrev, useForwardProps } from "reka-ui";
import { useI18n } from "vue-i18n";
import { sharedUiText } from "@/i18n/sharedUiMessages";
import { cn } from "@/lib/utils";
import { buttonVariants } from '@/components/ui/button';

const props = defineProps({
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  size: { type: null, required: false, default: "default" },
  class: {
    type: [Boolean, null, String, Object, Array],
    required: false,
    skipCheck: true,
  },
});

const delegatedProps = reactiveOmit(props, "class", "size");
const forwarded = useForwardProps(delegatedProps);
const { locale } = useI18n();
const text = key => sharedUiText(key, locale.value);
</script>

<template>
  <PaginationPrev
    data-slot="pagination-previous"
    :class="
      cn(buttonVariants({ variant: 'ghost', size }), 'pl-1.5!', props.class)
    "
    v-bind="forwarded"
  >
    <slot>
      <ChevronLeftIcon data-icon="inline-start" class="cn-rtl-flip" />
      <span class="hidden sm:block">{{ text('pagination.previous') }}</span>
    </slot>
  </PaginationPrev>
</template>
