<script setup>
import { useI18n } from 'vue-i18n'
import { reactive } from 'vue'
import { aiV2API } from '@/api/v2'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { RefreshCw } from '@lucide/vue'

defineProps({ calls: { type: Array, default: () => [] }, rooms: { type: Array, default: () => [] }, loading: Boolean })
const emit = defineEmits(['refresh', 'error'])
const { t, locale } = useI18n()
const results = reactive({}), reading = reactive({})
async function readResult(event, call) {
  if (!event.target.open || reading[call.id] || results[call.id]) return
  reading[call.id] = true
  try { results[call.id] = (await aiV2API.call(call.id)).result || '—' } catch (error) { emit('error', error) } finally { reading[call.id] = false }
}
function pretty(raw) { try { return JSON.stringify(JSON.parse(raw), null, 2) } catch { return raw || '—' } }
function date(raw) { return new Date(raw).toLocaleString(locale.value) }
</script>

<template>
  <div class="flex min-w-0 flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <p class="text-sm text-muted-foreground">{{ t('ai.jobHint') }}</p>
      <Button variant="outline" size="sm" :disabled="loading" @click="$emit('refresh')"><Spinner v-if="loading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{ t('ai.refresh') }}</Button>
    </div>
    <Empty v-if="!calls.length && !loading"><EmptyHeader><EmptyTitle>{{ t('ai.noCalls') }}</EmptyTitle></EmptyHeader></Empty>
    <article v-for="call in calls" :key="call.id" class="flex min-w-0 flex-col gap-3 rounded-lg border p-4">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-medium">{{ t(`ai.tools.${call.tool}`, call.tool) }}</span>
        <Badge :variant="call.status === 'failed' ? 'destructive' : 'secondary'">{{ t(`ai.statuses.${call.status}`, call.status) }}</Badge>
        <span class="text-sm text-muted-foreground">{{ rooms.find(room => room.id === call.roomId)?.name || call.roomId }}</span>
        <time class="text-xs text-muted-foreground sm:ml-auto">{{ date(call.createdAt) }}</time>
      </div>
      <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>{{ t('ai.source') }} · {{ call.source === 'page' ? t('ai.page') : t('ai.external') }}</span><span class="break-all">{{ call.id }}</span></div>
      <details><summary class="cursor-pointer text-sm">{{ t('ai.arguments') }}</summary><pre class="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap break-all">{{ pretty(call.arguments) }}</pre></details>
      <details v-if="call.resultAvailable || call.result" @toggle="readResult($event, call)"><summary class="cursor-pointer text-sm">{{ t('ai.result') }}</summary><Spinner v-if="reading[call.id]" /><pre v-else class="mt-2 max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap break-all">{{ pretty(results[call.id] || call.result) }}</pre></details>
    </article>
  </div>
</template>
