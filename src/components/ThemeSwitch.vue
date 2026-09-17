<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePreferredReducedMotion } from '@vueuse/core'
import { CloudRain, MoonIcon, Snowflake, SunIcon, X } from '@lucide/vue'
import { Button as UiButton } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useRoomWeather } from '@/composables/useRoomWeather'
import WeatherPreviewControl from '@/components/layout/WeatherPreviewControl.vue'
import { weatherMessages } from '@/i18n/weatherMessages'
import themeManager, { THEMES } from '@/utils/themeManager'
import { toast } from 'vue-sonner'

const { t } = useI18n({ useScope: 'local', messages: weatherMessages })
const { t: globalT } = useI18n({ useScope: 'global' })
const currentTheme = ref(themeManager.getTheme())
const weather = useRoomWeather()
const reducedMotion = usePreferredReducedMotion()
const toggleLabel = computed(() => globalT(currentTheme.value === THEMES.LIGHT ? 'globalFeedback.theme.switchToDark' : 'globalFeedback.theme.switchToLight'))
const condition = value => t(`weather.conditions.${['none', 'rain', 'snow', 'acid_rain', 'lunar_hail'].includes(value) ? value : 'unknown'}`)
const sourceLabel = computed(() => {
  const source = weather?.source.value
  if (!source) return t('weather.scope')
  if (!source.available) return t('weather.noData')
  return t('weather.following', { room: source.roomName, world: source.worldName, weather: source.paused ? t('weather.paused') : condition(source.precipitation) })
})
function themeChanged(value) { currentTheme.value = value }
function setWeatherEnabled(value) {
  weather.setEnabled(value)
  if (!value) toast.dismiss('weather-preview')
}
function stopPreview() { weather.stopPreview(); toast.dismiss('weather-preview') }
function preview(effect) {
  weather.showPreview(effect)
  toast(t('weather.previewing', { weather: condition(effect) }), {
    id: 'weather-preview', duration: 10_000,
    action: { label: t('weather.stopPreview'), onClick: stopPreview }
  })
}
onMounted(() => themeManager.addListener(themeChanged))
onBeforeUnmount(() => { themeManager.removeListener(themeChanged); toast.dismiss('weather-preview') })
</script>

<template>
  <DropdownMenu v-if="weather" :modal="false">
    <DropdownMenuTrigger as-child>
      <UiButton variant="ghost" size="icon-sm" :aria-label="t('weather.menu')" :title="t('weather.menu')">
        <MoonIcon v-if="currentTheme === THEMES.LIGHT" /><SunIcon v-else />
      </UiButton>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-64">
      <DropdownMenuGroup>
        <DropdownMenuItem @select="themeManager.toggleTheme()"><MoonIcon v-if="currentTheme === THEMES.LIGHT" /><SunIcon v-else />{{ toggleLabel }}</DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuCheckboxItem :model-value="weather.enabled.value" @update:model-value="setWeatherEnabled" @select.prevent>
          <CloudRain />{{ t('weather.enabled') }}
        </DropdownMenuCheckboxItem>
        <p class="px-2 py-1 text-xs text-muted-foreground">{{ sourceLabel }}</p>
        <p v-if="reducedMotion === 'reduce'" class="px-2 py-1 text-xs text-muted-foreground">{{ t('weather.reducedMotion') }}</p>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuLabel>{{ t('weather.preview') }}</DropdownMenuLabel>
        <DropdownMenuItem @select="preview('rain')"><CloudRain />{{ t('weather.previewRain') }}</DropdownMenuItem>
        <DropdownMenuItem @select="preview('snow')"><Snowflake />{{ t('weather.previewSnow') }}</DropdownMenuItem>
        <DropdownMenuItem v-if="weather.preview.value" @select="stopPreview"><X />{{ t('weather.stopPreview') }}</DropdownMenuItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>
  <Tooltip v-else>
    <TooltipTrigger as-child><UiButton variant="ghost" size="icon-sm" :aria-label="toggleLabel" @click="themeManager.toggleTheme()"><MoonIcon v-if="currentTheme === THEMES.LIGHT" /><SunIcon v-else /></UiButton></TooltipTrigger>
    <TooltipContent>{{ toggleLabel }}</TooltipContent>
  </Tooltip>
  <WeatherPreviewControl v-if="weather" />
</template>
