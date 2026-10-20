<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronRight, Download, KeyRound, Paperclip } from '@lucide/vue'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Spinner } from '@/components/ui/spinner'

const props = defineProps({ message: { type: Object, required: true }, statuses: { type: Map, required: true }, pending: Boolean, phase: String })
const { t } = useI18n()
const expanded = ref(false)
function pretty(value) { try { return JSON.stringify(value, null, 2) } catch { return String(value) } }
const resources = computed(() => (props.message.calls || []).filter(call => call.status === 'succeeded').flatMap(call => [call.data?.resource, call.data?.privateResult]).filter(resource => resource?.kind === 'download' && /^\/api\/v2\/system\/ai\/(resources|private-results)\/[a-f0-9-]{36}$/.test(resource.url)))
const toolLabel = call => call.tool?.startsWith('api_') ? t('ai.apiOperation') : t(`ai.tools.${call.tool}`, call.tool)
</script>

<template>
  <article data-ai-message :class="cn('flex min-w-0 shrink-0 flex-col gap-2 rounded-xl p-3', message.role === 'user' ? 'ml-6 bg-muted' : 'mr-2 border')">
    <p class="text-xs font-medium text-muted-foreground">{{ message.role === 'user' ? t('ai.you') : t('ai.assistant') }}</p>
    <Collapsible v-if="message.calls?.length" v-model:open="expanded" class="min-w-0">
      <CollapsibleTrigger as-child>
        <Button variant="ghost" size="sm" class="max-w-full justify-start" :aria-label="t('ai.process')">
          <Spinner v-if="pending" data-icon="inline-start" />
          <ChevronRight v-else data-icon="inline-start" :class="cn('transition-transform', expanded && 'rotate-90')" />
          <span class="truncate">{{ pending ? phase || t('ai.thinking') : t('ai.process') }}</span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div class="mt-2 flex max-h-64 min-w-0 flex-col gap-3 overflow-y-auto overscroll-contain rounded-md bg-muted p-3">
          <details v-for="(call, index) in message.calls" :key="call.callId || index" class="min-w-0 text-xs">
            <summary class="cursor-pointer [overflow-wrap:anywhere]">{{ toolLabel(call) }} · {{ t(`ai.statuses.${statuses.get(call.callId) || call.status}`) }}</summary>
            <pre class="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all">{{ pretty(call) }}</pre>
          </details>
        </div>
      </CollapsibleContent>
    </Collapsible>
    <p v-else-if="pending" class="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Spinner />{{ phase || t('ai.thinking') }}</p>
    <p v-if="message.content" data-ai-answer class="text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">{{ message.content }}</p>
    <p v-for="file in message.attachments || []" :key="file.id" class="flex items-center gap-2 text-xs text-muted-foreground"><Paperclip class="size-3 shrink-0" /><span class="truncate">{{ file.name }}</span></p>
    <p v-for="input in message.privateInputs || []" :key="input.id" class="flex items-center gap-2 text-xs text-muted-foreground"><KeyRound class="size-3 shrink-0" /><span class="truncate">{{ input.name }} · {{ t('ai.privateInput') }}</span></p>
    <div v-if="resources.length" class="flex flex-col items-start gap-2"><Button v-for="resource in resources" :key="resource.url" as-child variant="outline" size="sm" class="max-w-full"><a :href="resource.url" target="_blank" rel="noopener noreferrer"><Download data-icon="inline-start" /><span class="truncate">{{ t('ai.downloadResult') }}</span></a></Button><p class="text-xs text-muted-foreground">{{ t('ai.resourceExpiry') }}</p></div>
  </article>
</template>
