<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useClipboard } from '@vueuse/core'
import { ChevronDown, Copy, Check, RefreshCw } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Spinner } from '@/components/ui/spinner'
import { consoleV2API } from '@/api/v2'
import { commandResultState, receiptCheckState, canRefreshCommandReceipt } from '@/lib/commandResult.mjs'
import { loadInventoryNames } from '@/api/inventoryNames'
import { batchReason } from '@/lib/workbenchInteraction.mjs'
import SpawnAuditResult from './SpawnAuditResult.vue'

const props = defineProps({ run: { type: Object, default: null }, target: { type: String, default: '' }, pending: Boolean })
const emit = defineEmits(['updated'])
const names = ref(new Map())
const refreshed = ref(null), refreshing = ref(false), refreshError = ref('')
let sequence = 0, alive = true, expiryTimer
const now = ref(Date.now())
const current = computed(() => refreshed.value || props.run || {})
watch(() => current.value.batch, async batch => { if (batch?.items?.length) { try { const value = await loadInventoryNames(); if (alive) names.value = value } catch { /* Keep unknown prefabs readable. */ } } }, { immediate: true })
const itemName = item => names.value.get(item.prefab)?.[locale.value.startsWith('en') ? 'en' : 'zh'] || item.prefab
watch(() => props.run, () => { ++sequence; refreshed.value = null; refreshing.value = false; refreshError.value = '' }, { flush: 'sync' })
onMounted(() => {
  watch(current, run => {
    clearTimeout(expiryTimer)
    now.value = Date.now()
    const until = Date.parse(run.receiptRefreshUntil || '')
    if (canRefreshCommandReceipt(run, now.value)) expiryTimer = setTimeout(() => { now.value = Date.now() }, until - now.value + 10)
  }, { immediate: true })
})
onBeforeUnmount(() => { alive = false; ++sequence; clearTimeout(expiryTimer) })
const { t, locale } = useI18n()
const { copy, copied } = useClipboard({ legacy: true })
const state = computed(() => props.pending ? 'waiting' : commandResultState(current.value))
const status = computed(() => ({ waiting: 'waiting', output: 'outputReady', no_output: 'completedNoOutput', output_unavailable: 'succeeded', failed: 'runFailed', unconfirmed: 'uncertain' })[state.value])
const heading = computed(() => !props.pending && current.value.batch ? t(`workbench.batch.${current.value.batch.state}`) : t(`workbench.commands.${status.value}`))
const checkState = computed(() => receiptCheckState(current.value, now.value))
const canRefresh = computed(() => canRefreshCommandReceipt(current.value, now.value))
const hasOutput = computed(() => typeof current.value.output?.text === 'string' && current.value.output.text.length > 0)
const outputHint = computed(() => ({ waiting: 'waitingHint', failed: 'failedOutput', unconfirmed: 'unconfirmedOutput', no_output: 'noOutput', output_unavailable: 'outputUnavailable' })[state.value] || 'outputUnavailable')
const code = computed(() => current.value.script || current.value.rawCommand || '')
const runTime = computed(() => {
  const value = current.value.createdAt || current.value.completedAt
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : ''
})
async function copyOutput() {
  try { await copy(current.value.output?.text || '') } catch { toast.error(t('workbench.commands.copyFailed')) }
}
async function refreshReceipt() {
  if (refreshing.value || !canRefresh.value) return
  const run = current.value, token = ++sequence
  refreshing.value = true; refreshError.value = ''
  try {
    const result = await consoleV2API.run(run.roomId, run.id, { refresh: true })
    if (!alive || token !== sequence) return
    if (result.id !== run.id || result.roomId !== run.roomId || result.worldId !== run.worldId) throw new Error(t('workbench.commands.receiptMismatch'))
    refreshed.value = result
    emit('updated', result)
  } catch (error) {
    if (alive && token === sequence) refreshError.value = error.detail || error.message
  } finally { if (alive && token === sequence) refreshing.value = false }
}
</script>

<template>
  <section class="flex min-w-0 flex-col gap-2" data-command-result :data-run-id="current.id" aria-live="polite">
    <Alert :variant="state === 'failed' ? 'destructive' : 'default'">
      <AlertTitle class="flex items-center gap-2"><Spinner v-if="state === 'waiting'" />{{ heading }}</AlertTitle>
      <AlertDescription class="flex min-w-0 flex-col gap-1 break-words">
        <span v-if="target || runTime">{{ [target, runTime].filter(Boolean).join(' · ') }}</span>
        <span v-if="pending">{{ t('workbench.commands.waitingHint') }}</span><span v-else-if="current.message">{{ current.message }}</span>
        <span v-if="current.errorMessage" class="whitespace-pre-wrap">{{ current.errorMessage }}</span>
      </AlertDescription>
    </Alert>
    <template v-if="!pending">
    <Alert v-if="current.batch"><AlertTitle>{{ t('workbench.commands.objectsAndEffects') }}</AlertTitle><AlertDescription class="flex flex-col gap-1">
      <p>{{t('workbench.batch.counts',current.batch)}}</p>
      <p v-if="current.batch.state==='completed' && current.batch.matched===0">{{ t('workbench.commands.noBatchMatches') }}</p>
      <p v-if="current.batch.units">{{ t('workbench.commands.confirmedItems', { units: current.batch.units }) }}</p>
      <template v-if="['set_player_hunger_rate','set_wanda_age'].includes(current.batch.action)"><p v-for="(item,index) in current.batch.items || []" :key="`setting-${index}`">{{ t(current.batch.action === 'set_player_hunger_rate' ? 'workbench.commands.panelHungerMultiplier' : 'workbench.commands.age') }}: {{item.before}} → {{item.after}}<span v-if="current.batch.state==='preview'"> ({{ t('workbench.commands.planned') }})</span><span v-else-if="item.state!=='verified'"> ({{ t('workbench.commands.unconfirmed') }})</span></p></template>
      <p v-if="current.batch.state==='preview' && current.batch.items?.some(item=>item.destination==='inventory')">{{ t('workbench.commands.itemsToPlayerHint') }}</p>
      <p v-if="current.batch.items?.some(item=>item.destination==='rebuild')">{{ t('workbench.commands.rebuildHint') }}</p>
      <template v-if="current.batch.state!=='preview'"><p v-for="(item,index) in current.batch.items?.filter(item=>item.reason)||[]" :key="index">{{itemName(item)}} · {{batchReason(item.reason,locale.startsWith('en'))}}</p></template>
    </AlertDescription></Alert>
    <Alert v-if="current.movement"><AlertTitle>{{ t('workbench.commands.playerDestinations') }}</AlertTitle><AlertDescription class="flex flex-col gap-1">
      <p v-for="item in current.movement.items || []" :key="item.playerId">{{ item.playerName || item.playerId }} → X {{ item.point?.x?.toFixed(1) }} / Z {{ item.point?.z?.toFixed(1) }} · {{ t(`workbench.commands.movementStates.${['prepared', 'confirmed', 'rejected', 'uncertain'].includes(item.state) ? item.state : 'unknown'}`) }}</p>
      <p v-if="!current.movement.items?.length">{{ t('workbench.commands.noMovementPlayers') }}</p>
    </AlertDescription></Alert>
    <SpawnAuditResult v-if="current.spawnAudit" :audit="current.spawnAudit" />
    <Collapsible v-if="current.batch || current.movement" class="min-w-0">
      <CollapsibleTrigger as-child>
        <Button type="button" variant="ghost" size="sm" class="group h-auto px-0 py-0 text-xs font-normal text-muted-foreground hover:bg-transparent">
          <span>{{ t('workbench.commands.outputTitle') }}</span>
          <ChevronDown data-icon="inline-end" class="shrink-0 transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent class="pt-2">
        <pre v-if="hasOutput" data-command-output class="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 font-mono text-xs [overflow-wrap:anywhere]">{{ current.output.text }}</pre>
        <p v-else class="text-sm text-muted-foreground">{{ t(`workbench.commands.${outputHint}`) }}</p>
      </CollapsibleContent>
    </Collapsible>
    <template v-else><div class="flex items-center justify-between gap-2">
      <span class="text-sm font-medium">{{ t('workbench.commands.outputTitle') }}</span>
      <Button v-if="hasOutput" size="sm" variant="ghost" @click="copyOutput"><Check v-if="copied" data-icon="inline-start" /><Copy v-else data-icon="inline-start" />{{ t(copied ? 'workbench.commands.copied' : 'workbench.commands.copy') }}</Button>
    </div>
    <pre v-if="hasOutput" data-command-output class="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 font-mono text-xs [overflow-wrap:anywhere]">{{ current.output.text }}</pre>
    <p v-else class="text-sm text-muted-foreground">{{ t(`workbench.commands.${outputHint}`) }}</p>
    </template>
    <p v-if="current.output?.truncated" class="text-xs text-muted-foreground">{{ t('workbench.commands.outputTruncated') }}</p>
    <p v-if="checkState" class="text-sm text-muted-foreground" role="status">{{ t(`workbench.commands.receiptChecks.${checkState}`) }}</p>
    <p v-if="refreshError" class="text-sm text-destructive" role="alert">{{ refreshError }}</p>
    <Button v-if="canRefresh" data-receipt-refresh class="self-start" size="sm" variant="outline" :disabled="refreshing" @click="refreshReceipt"><Spinner v-if="refreshing" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{ t(refreshing ? 'workbench.commands.readingReceipt' : 'workbench.commands.refreshReceipt') }}</Button>
    <p v-if="canRefresh" class="text-xs text-muted-foreground">{{ t('workbench.commands.refreshHint') }}</p>
    <Collapsible v-if="current.id || code" class="min-w-0">
      <CollapsibleTrigger as-child>
        <Button type="button" variant="ghost" size="sm" class="group h-auto px-0 py-0 text-xs font-normal text-muted-foreground hover:bg-transparent">
          <span>{{ t('workbench.commands.details') }}</span>
          <ChevronDown data-icon="inline-end" class="shrink-0 transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent class="pt-2">
        <div class="flex min-w-0 flex-col gap-2"><span v-if="current.id" class="break-all font-mono text-xs text-muted-foreground">{{ t('workbench.commands.runId') }} {{ current.id }}</span><div v-if="code"><span class="text-xs text-muted-foreground">{{ t('workbench.commands.executedCode') }}</span><pre class="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 font-mono text-xs [overflow-wrap:anywhere]">{{ code }}</pre></div></div>
      </CollapsibleContent>
    </Collapsible>
    </template>
  </section>
</template>
