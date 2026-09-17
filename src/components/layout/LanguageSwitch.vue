<script setup>
import { computed } from 'vue'
import { Languages } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { normalizeLocale } from '@/i18n'
import { previewSystemLanguage } from '@/utils/systemPreferences'

const { locale, t } = useI18n()
const currentLocale = computed(() => normalizeLocale(locale.value))
const targetLocale = computed(() => currentLocale.value === 'zh-CN' ? 'en-US' : 'zh-CN')
const currentLanguageCode = computed(() => currentLocale.value === 'zh-CN' ? '中' : 'EN')
const switchLabel = computed(() => {
  const targetKey = targetLocale.value === 'zh-CN' ? 'zhCN' : 'enUS'
  return `${t('settings.language.label')}: ${t(`settings.language.${targetKey}`)}`
})

function switchLanguage() {
  previewSystemLanguage(targetLocale.value)
}
</script>

<template>
  <Button
    type="button"
    variant="ghost"
    size="sm"
    :aria-label="switchLabel"
    :title="switchLabel"
    @click="switchLanguage"
  >
    <Languages data-icon="inline-start" />
    <span class="hidden min-w-5 text-center sm:inline">{{ currentLanguageCode }}</span>
  </Button>
</template>
