<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useClipboard } from '@vueuse/core'
import { Copy, Check, RefreshCw } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
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
    <Alert v-if="current.batch"><AlertTitle>{{locale.startsWith('en')?'Objects and effects':'对象与效果'}}</AlertTitle><AlertDescription class="flex flex-col gap-1">
      <p>{{t('workbench.batch.counts',current.batch)}}</p>
      <p v-if="current.batch.state==='completed' && current.batch.matched===0">{{locale.startsWith('en')?'No eligible objects found.':'附近没有符合条件的对象，没有执行修改。'}}</p>
      <p v-if="current.batch.units">{{locale.startsWith('en')?'Confirmed items received: ':'已确认收到物品：'}}{{current.batch.units}}</p>
      <template v-if="['set_player_hunger_rate','set_wanda_age'].includes(current.batch.action)"><p v-for="(item,index) in current.batch.items || []" :key="`setting-${index}`">{{current.batch.action==='set_player_hunger_rate' ? (locale.startsWith('en')?'Panel hunger multiplier':'面板附加饥饿倍率') : (locale.startsWith('en')?'Age':'年龄')}}：{{item.before}} → {{item.after}}<span v-if="current.batch.state==='preview'">（{{locale.startsWith('en')?'planned':'预计'}}）</span><span v-else-if="item.state!=='verified'">（{{locale.startsWith('en')?'unconfirmed':'结果待确认'}}）</span></p></template>
      <p v-if="current.batch.state==='preview' && current.batch.items?.some(item=>item.destination==='inventory')">{{locale.startsWith('en')?'Items go to the selected player; contents of containers are excluded.':'物品交给所选玩家；不处理容器内的物品。'}}</p>
      <p v-if="current.batch.items?.some(item=>item.destination==='rebuild')">{{locale.startsWith('en')?'Rebuilds the supported station at its original position; lost contents are not restored.':'在原位置重建支持的科技站，不能找回烧毁前已丢失的数据。'}}</p>
      <template v-if="current.batch.state!=='preview'"><p v-for="(item,index) in current.batch.items?.filter(item=>item.reason)||[]" :key="index">{{itemName(item)}} · {{batchReason(item.reason,locale.startsWith('en'))}}</p></template>
    </AlertDescription></Alert>
    <Alert v-if="current.movement"><AlertTitle>{{ locale.startsWith('en') ? 'Player destinations' : '本次玩家与落点' }}</AlertTitle><AlertDescription class="flex flex-col gap-1">
      <p v-for="item in current.movement.items || []" :key="item.playerId">{{ item.playerName || item.playerId }} → X {{ item.point?.x?.toFixed(1) }} / Z {{ item.point?.z?.toFixed(1) }} · {{ locale.startsWith('en') ? ({prepared:'Waiting for confirmation',confirmed:'Confirmed',rejected:'Not moved',uncertain:'Uncertain'}[item.state] || 'Unknown') : ({prepared:'待确认',confirmed:'位置已确认',rejected:'未执行',uncertain:'结果待确认'}[item.state] || '待核对') }}</p>
      <p v-if="!current.movement.items?.length">{{ locale.startsWith('en') ? 'No players to move.' : '本次没有需要移动的玩家。' }}</p>
    </AlertDescription></Alert>
    <SpawnAuditResult v-if="current.spawnAudit" :audit="current.spawnAudit" />
    <details v-if="current.batch || current.movement" class="min-w-0"><summary class="cursor-pointer text-xs text-muted-foreground">{{ t('workbench.commands.outputTitle') }}</summary><pre v-if="hasOutput" data-command-output class="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 font-mono text-xs [overflow-wrap:anywhere]">{{ current.output.text }}</pre><p v-else class="mt-2 text-sm text-muted-foreground">{{ t(`workbench.commands.${outputHint}`) }}</p></details>
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
    <details v-if="current.id || code" class="min-w-0"><summary class="cursor-pointer text-xs text-muted-foreground">{{ t('workbench.commands.details') }}</summary><div class="mt-2 flex min-w-0 flex-col gap-2"><span v-if="current.id" class="break-all font-mono text-xs text-muted-foreground">{{ t('workbench.commands.runId') }} {{ current.id }}</span><div v-if="code"><span class="text-xs text-muted-foreground">{{ t('workbench.commands.executedCode') }}</span><pre class="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 font-mono text-xs [overflow-wrap:anywhere]">{{ code }}</pre></div></div></details>
    </template>
  </section>
</template>
