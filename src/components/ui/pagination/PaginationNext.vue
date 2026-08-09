<script setup>
import { ChevronRightIcon } from "@lucide/vue";
import { reactiveOmit } from "@vueuse/core";
import { PaginationNext, useForwardProps } from "reka-ui";
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
  <PaginationNext
    data-slot="pagination-next"
    :class="
      cn(buttonVariants({ variant: 'ghost', size }), 'pr-1.5!', props.class)
    "
    v-bind="forwarded"
  >
    <slot>
      <span class="hidden sm:block">{{ text('pagination.next') }}</span>
      <ChevronRightIcon data-icon="inline-end" class="cn-rtl-flip" />
    </slot>
  </PaginationNext>
</template>
