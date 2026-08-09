<script setup>
import { PanelLeftIcon } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { cn } from '@/lib/utils'
import { sharedUiText } from '@/i18n/sharedUiMessages'
import { Button } from '@/components/ui/button'
import { useSidebar } from './utils'

const props = defineProps({
  class: {
    type: [Boolean, null, String, Object, Array],
    required: false,
    skipCheck: true,
  },
})

const { toggleSidebar } = useSidebar()
const { locale } = useI18n()
const text = key => sharedUiText(key, locale.value)
</script>

<template>
  <Button
    data-sidebar="trigger"
    data-slot="sidebar-trigger"
    variant="ghost"
    size="icon-sm"
    :class="cn('', props.class)"
    :aria-label="text('sidebar.toggle')"
    :title="text('sidebar.toggle')"
    @click="toggleSidebar"
  >
    <PanelLeftIcon class="cn-rtl-flip" />
    <span class="sr-only">{{ text('sidebar.toggle') }}</span>
  </Button>
</template>
