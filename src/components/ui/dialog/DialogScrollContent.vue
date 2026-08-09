<script setup>
import { XIcon } from "@lucide/vue";
import { reactiveOmit } from "@vueuse/core";
import {
  DialogClose,
  DialogContent,
  DialogPortal,
  useForwardPropsEmits,
} from "reka-ui";
import { useI18n } from "vue-i18n";
import { sharedUiText } from "@/i18n/sharedUiMessages";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import DialogOverlay from "./DialogOverlay.vue";

defineOptions({
  inheritAttrs: false,
});

const props = defineProps({
  forceMount: { type: Boolean, required: false },
  disableOutsidePointerEvents: { type: Boolean, required: false },
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: {
    type: [Boolean, null, String, Object, Array],
    required: false,
    skipCheck: true,
  },
});
const emits = defineEmits([
  "escapeKeyDown",
  "pointerDownOutside",
  "focusOutside",
  "interactOutside",
  "openAutoFocus",
  "closeAutoFocus",
]);

const delegatedProps = reactiveOmit(props, "class");

const forwarded = useForwardPropsEmits(delegatedProps, emits);
const { locale } = useI18n();
const text = key => sharedUiText(key, locale.value);
</script>

<template>
  <DialogPortal>
    <DialogOverlay
      class="grid place-items-center overflow-y-auto p-4"
    >
      <DialogContent
        :class="
          cn(
            'relative my-4 grid w-full max-w-lg gap-4 rounded-md bg-popover p-4 text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-100 md:w-full',
            props.class,
          )
        "
        v-bind="{ ...$attrs, ...forwarded }"
        @pointer-down-outside="
          (event) => {
            const originalEvent = event.detail.originalEvent;
            const target = originalEvent.target;
            if (
              originalEvent.offsetX > target.clientWidth ||
              originalEvent.offsetY > target.clientHeight
            ) {
              event.preventDefault();
            }
          }
        "
      >
        <slot />

        <DialogClose as-child>
          <Button
            class="absolute top-2 right-2"
            variant="ghost"
            size="icon-sm"
            :aria-label="text('dialog.close')"
            :title="text('dialog.close')"
          >
            <XIcon />
            <span class="sr-only">{{ text('dialog.close') }}</span>
          </Button>
        </DialogClose>
      </DialogContent>
    </DialogOverlay>
  </DialogPortal>
</template>
