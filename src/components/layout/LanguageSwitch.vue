<script setup>
import { computed } from 'vue'
import { Languages } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { normalizeLocale } from '@/i18n'
import { previewSystemLanguage } from '@/utils/systemPreferences'

const { locale, t } = useI18n()
const currentLocale = computed(() => normalizeLocale(locale.value))

function switchLanguage(value) {
  if (value === currentLocale.value) return
  previewSystemLanguage(value)
}
</script>

<template>
  <DropdownMenu>
    <Tooltip>
      <TooltipTrigger as-child>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="icon-sm" :aria-label="t('settings.language.label')">
            <Languages />
          </Button>
        </DropdownMenuTrigger>
      </TooltipTrigger>
      <TooltipContent>{{ t('settings.language.label') }}</TooltipContent>
    </Tooltip>
    <DropdownMenuContent align="end" class="w-40">
      <DropdownMenuLabel>{{ t('settings.language.label') }}</DropdownMenuLabel>
      <DropdownMenuRadioGroup :model-value="currentLocale" @update:model-value="switchLanguage">
        <DropdownMenuRadioItem value="zh-CN">{{ t('settings.language.zhCN') }}</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="en-US">{{ t('settings.language.enUS') }}</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
