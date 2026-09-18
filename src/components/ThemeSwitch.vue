<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { MoonIcon, SunIcon } from '@lucide/vue'
import { Button as UiButton } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import themeManager, { THEMES } from '@/utils/themeManager'

const { t } = useI18n({ useScope: 'global' })
const currentTheme = ref(themeManager.getTheme())
const toggleLabel = computed(() => t(currentTheme.value === THEMES.LIGHT ? 'globalFeedback.theme.switchToDark' : 'globalFeedback.theme.switchToLight'))
function themeChanged(value) { currentTheme.value = value }
onMounted(() => themeManager.addListener(themeChanged))
onBeforeUnmount(() => themeManager.removeListener(themeChanged))
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child><UiButton variant="ghost" size="icon-sm" :aria-label="toggleLabel" @click="themeManager.toggleTheme()"><MoonIcon v-if="currentTheme === THEMES.LIGHT" /><SunIcon v-else /></UiButton></TooltipTrigger>
    <TooltipContent>{{ toggleLabel }}</TooltipContent>
  </Tooltip>
</template>
