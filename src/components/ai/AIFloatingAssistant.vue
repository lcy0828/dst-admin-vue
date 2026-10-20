<script setup>
import { defineAsyncComponent, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useMediaQuery } from '@vueuse/core'
import { Maximize2, Settings2, Sparkles, X } from '@lucide/vue'
import { aiPageRoom, useAIAssistant } from '@/composables/useAIAssistant'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const AIChat = defineAsyncComponent(() => import('./AIChat.vue'))
const { t } = useI18n()
const route = useRoute(), router = useRouter()
const session = useAIAssistant()
const { open, busy } = session
const mobile = useMediaQuery('(max-width: 639px)')
watch(() => route.fullPath, () => { if (open.value) session.load({ roomId: aiPageRoom(route) }) })
function navigate(tab) {
  open.value = false
  router.push({ path: '/ai', query: { tab } })
}
function outside(event) { if (!mobile.value) event.preventDefault() }
</script>

<template>
  <Sheet v-model:open="open" :modal="mobile">
    <Tooltip>
      <TooltipTrigger as-child>
        <SheetTrigger as-child><Button class="ai-assistant-launcher fixed z-40 size-12 rounded-full shadow-lg" size="icon-lg" :aria-label="busy ? t('ai.openBusy') : t('ai.open')" :title="t('ai.title')"><Spinner v-if="busy" /><Sparkles v-else /></Button></SheetTrigger>
      </TooltipTrigger>
      <TooltipContent side="left">{{ busy ? t('ai.openBusy') : t('ai.open') }}</TooltipContent>
    </Tooltip>
    <SheetContent side="right" :show-close-button="false" class="ai-assistant-panel gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[30rem]" @interact-outside="outside">
      <SheetHeader class="shrink-0 border-b p-4">
        <div class="flex items-center justify-between gap-2">
          <SheetTitle class="flex items-center gap-2"><Sparkles class="size-4" />{{ t('ai.title') }}</SheetTitle>
          <div class="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" :aria-label="t('ai.configure')" :title="t('ai.configure')" @click="navigate('connection')"><Settings2 /></Button>
            <Button variant="ghost" size="icon-sm" :aria-label="t('ai.fullPage')" :title="t('ai.fullPage')" @click="navigate('chat')"><Maximize2 /></Button>
            <SheetClose as-child><Button variant="ghost" size="icon-sm" :aria-label="t('ai.minimize')" :title="t('ai.minimize')"><X /></Button></SheetClose>
          </div>
        </div>
        <SheetDescription>{{ t('ai.floatingDescription') }}</SheetDescription>
      </SheetHeader>
      <div class="ai-assistant-body flex min-h-0 flex-1 flex-col p-4">
        <Suspense><AIChat floating @configure="navigate('connection')" /><template #fallback><Skeleton class="h-24 w-full" /></template></Suspense>
      </div>
    </SheetContent>
  </Sheet>
</template>

<style scoped>
.ai-assistant-launcher {
  right: max(1rem, env(safe-area-inset-right));
  bottom: max(1rem, env(safe-area-inset-bottom));
}
.ai-assistant-panel { height: 100dvh; }
.ai-assistant-body { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
</style>
