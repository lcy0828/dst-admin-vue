<script setup>
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { CircleAlert, History, MessageSquare, Settings2 } from '@lucide/vue'
import { aiPageRoom, useAIAssistant } from '@/composables/useAIAssistant'
import AIChat from '@/components/ai/AIChat.vue'
import AIConnections from '@/components/ai/AIConnections.vue'
import AIActivity from '@/components/ai/AIActivity.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const { t } = useI18n()
const route = useRoute(), router = useRouter()
const session = useAIAssistant()
const { loading, error, rooms, calls, tools, mcpPath, config, activityLoading, open } = session
const validTab = value => ['chat', 'connection', 'history'].includes(value) ? value : 'chat'
const tab = ref(validTab(route.query.tab))
watch(() => route.query.tab, value => { tab.value = validTab(value) })
watch(tab, value => {
  router.replace({ query: { ...route.query, tab: value } })
  if (value === 'history') session.refreshCalls()
})
onMounted(async () => {
  await session.load({ roomId: aiPageRoom(route) })
  if (tab.value === 'history') session.refreshCalls()
})
</script>

<template>
  <div class="flex min-w-0 flex-col gap-5">
    <header class="flex flex-wrap items-start justify-between gap-3"><div><h1 class="text-2xl font-semibold">{{ t('ai.title') }}</h1><p class="mt-1 text-sm text-muted-foreground">{{ t('ai.subtitle') }}</p></div><Badge variant="outline">{{ t('ai.scope') }}</Badge></header>
    <Alert v-if="error && tab !== 'chat'" variant="destructive"><CircleAlert /><AlertTitle>{{ t('ai.failure') }}</AlertTitle><AlertDescription class="break-words">{{ error }}<Button v-if="!session.initialized.value" variant="outline" size="sm" :disabled="loading" @click="session.load({ force: true })">{{ t('ai.retry') }}</Button></AlertDescription></Alert>
    <Tabs v-model="tab" class="min-w-0">
      <TabsList class="max-w-full"><TabsTrigger value="chat"><MessageSquare data-icon="inline-start" />{{ t('ai.chat') }}</TabsTrigger><TabsTrigger value="connection"><Settings2 data-icon="inline-start" />{{ t('ai.connection') }}</TabsTrigger><TabsTrigger value="history"><History data-icon="inline-start" />{{ t('ai.history') }}</TabsTrigger></TabsList>
      <TabsContent value="chat" class="pt-3">
        <Card class="min-w-0">
          <CardHeader><CardTitle>{{ t('ai.chat') }}</CardTitle><CardDescription>{{ t('ai.privacy') }}</CardDescription></CardHeader>
          <CardContent>
            <Empty v-if="open"><EmptyHeader><EmptyTitle>{{ t('ai.openInPanel') }}</EmptyTitle></EmptyHeader><EmptyContent><Button variant="outline" @click="open = false">{{ t('ai.returnToPage') }}</Button></EmptyContent></Empty>
            <AIChat v-else-if="tab === 'chat'" @configure="tab = 'connection'" />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="connection" class="pt-3">
        <Skeleton v-if="loading && !session.initialized.value" class="h-80 w-full" />
        <AIConnections v-else-if="session.initialized.value && tab === 'connection'" :config="config" :mcp-path="mcpPath" @saved="session.saved" @error="session.fail" />
        <details v-if="tools.length" class="mt-4 text-sm"><summary class="cursor-pointer">{{ t('ai.toolCatalog') }} · {{ tools.length }}</summary><p class="mt-2 text-xs text-muted-foreground">{{ t('ai.toolDescription') }}</p><ul class="mt-3 grid gap-x-5 gap-y-2 text-xs sm:grid-cols-2"><li v-for="tool in tools" :key="tool.name">{{ t(`ai.tools.${tool.name}`, tool.name) }}</li></ul></details>
      </TabsContent>
      <TabsContent value="history" class="pt-3"><AIActivity :calls="calls" :rooms="rooms" :loading="activityLoading" @refresh="session.refreshCalls" @error="session.fail" /></TabsContent>
    </Tabs>
  </div>
</template>
