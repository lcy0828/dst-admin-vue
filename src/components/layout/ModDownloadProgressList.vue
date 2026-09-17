<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, ChevronDown, CircleAlert, Clock3, LocateFixed, Package, WifiOff } from '@lucide/vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { taskProgressMessages } from '@/i18n/taskProgressMessages'
import { formatJobBytes, formatJobRate } from '@/lib/globalJobs.mjs'
import { modThumbnailUrl } from '@/lib/modImages.mjs'
import { modDownloadIssue } from '@/lib/taskProgress.mjs'

const props = defineProps({ groups: { type: Array, required: true }, targetLabels: { type: Object, default: () => ({}) }, connected: { type: Boolean, default: true } })
const { t } = useI18n({ useScope: 'local', messages: taskProgressMessages })
const list = ref(null)
const hasDownloads = computed(() => props.groups.some(group => group.downloads.some(item => item.status === 'downloading')))
const hasFailures = computed(() => props.groups.some(group => group.status === 'failed'))
const state = status => !props.connected && status === 'downloading' ? 'disconnected' : status
const variant = status => status === 'succeeded' ? 'success' : status === 'failed' ? 'destructive' : status === 'downloading' ? 'info' : 'outline'
function locate(status, focus = true) {
  const container = list.value
  const item = container?.querySelector(status === 'downloading' ? '[data-downloading]' : '[data-status="failed"]')
  if (!item) return
  const top = container.scrollTop + item.getBoundingClientRect().top - container.getBoundingClientRect().top - 3
  container.scrollTo({ top, behavior: 'instant' })
  if (focus) item.focus({ preventScroll: true })
}
async function revealError(open, key) {
  if (!open) return
  await nextTick()
  // Collapsible's presence is committed after its own render tick.
  await new Promise(resolve => requestAnimationFrame(resolve))
  const container = list.value
  const error = [...(container?.querySelectorAll('[data-error-key]') || [])].find(element => element.dataset.errorKey === key)
  if (!error) return
  const overflow = error.getBoundingClientRect().bottom - container.getBoundingClientRect().bottom + 4
  if (overflow > 0) container.scrollTo({ top: container.scrollTop + overflow, behavior: 'instant' })
}
// Start a long batch at its current item. Later progress events never move
// the list while the user is reading previous results.
onMounted(() => { if (props.groups.length > 4) locate(hasFailures.value ? 'failed' : 'downloading', false) })
function transfer(item) {
  if (item.status === 'queued' || item.status === 'notStarted') return ''
  if (item.status === 'succeeded') return formatJobBytes(item.totalBytes || item.currentBytes) || ''
  const bytes = Number(item.totalBytes) > 0 ? `${formatJobBytes(item.currentBytes) || '0 B'} / ${formatJobBytes(item.totalBytes)}`
    : Number(item.currentBytes) > 0 ? formatJobBytes(item.currentBytes) : ''
  return [bytes, item.status === 'downloading' ? formatJobRate(item.bytesPerSecond) : ''].filter(Boolean).join(' · ')
}
</script>

<template>
  <div class="mod-downloads">
    <div v-if="(groups.length > 4 && hasDownloads) || hasFailures" class="mod-download-navigation">
      <span>{{ t('taskProgress.listHint') }}</span>
      <div class="flex flex-wrap gap-1">
        <Button v-if="hasDownloads" variant="outline" size="sm" @click="locate('downloading')"><LocateFixed data-icon="inline-start" />{{ t('taskProgress.locateCurrent') }}</Button>
        <Button v-if="hasFailures" variant="outline" size="sm" @click="locate('failed')"><CircleAlert data-icon="inline-start" />{{ t('taskProgress.locateFailed') }}</Button>
      </div>
    </div>
  <ol ref="list" class="mod-download-list" tabindex="0" :aria-label="t('taskProgress.downloads')">
    <li v-for="group in groups" :key="group.id" class="mod-download-item" tabindex="-1" :aria-label="`${group.name} · ${t(`taskProgress.itemStates.${state(group.status)}`)}`" :data-status="group.status" :data-downloading="group.downloads.some(item => item.status === 'downloading') || undefined">
      <div class="mod-download-heading">
        <Avatar class="size-10 rounded-lg shrink-0">
          <AvatarImage v-if="group.image" :src="modThumbnailUrl(group.image, 80)" :alt="group.name" />
          <AvatarFallback class="rounded-lg"><Package class="size-5" /></AvatarFallback>
        </Avatar>
        <strong class="mod-download-name" :title="group.name">{{ group.name }}</strong>
        <Badge :variant="state(group.status) === 'disconnected' ? 'warning' : variant(group.status)">
          <Check v-if="group.status === 'succeeded'" />
          <CircleAlert v-else-if="group.status === 'failed'" />
          <Spinner v-else-if="group.status === 'downloading' && connected" />
          <WifiOff v-else-if="group.status === 'downloading'" />
          <Clock3 v-else-if="group.status === 'queued'" />
          {{ t(`taskProgress.itemStates.${state(group.status)}`) }}
        </Badge>
      </div>
      <div v-for="item in group.downloads" :key="item.key" class="mod-download-transfer">
        <div class="mod-download-numbers">
          <span class="truncate">{{ targetLabels[item.targetId] || t('taskProgress.machine') }}<template v-if="group.downloads.length > 1"> · {{ t(`taskProgress.itemStates.${state(item.status)}`) }}</template></span>
          <strong v-if="item.percent !== null && item.status === 'downloading'" class="tabular-nums">{{ item.percent }}%</strong>
        </div>
        <Progress
          v-if="['queued', 'downloading'].includes(item.status)"
          :model-value="item.status === 'downloading' && connected ? item.percent : item.percent ?? 0"
          :variant="item.status === 'succeeded' ? 'success' : item.status === 'failed' ? 'destructive' : 'default'"
          :aria-label="`${t('taskProgress.itemProgress', { name: group.name })} · ${targetLabels[item.targetId] || t('taskProgress.machine')}`"
          :aria-valuetext="[t(`taskProgress.itemStates.${state(item.status)}`), item.percent === null ? '' : `${item.percent}%`].filter(Boolean).join(' · ')"
          class="h-1.5"
        />
        <p v-if="item.status === 'downloading' && !connected" class="mod-download-bytes">{{ t('taskProgress.reconnecting') }}</p>
        <p v-else-if="transfer(item)" class="mod-download-bytes">{{ transfer(item) }}</p>
        <p v-else-if="item.status === 'downloading'" class="mod-download-bytes">{{ t(item.percent === 100 ? 'taskProgress.confirmingDownload' : 'taskProgress.noBytes') }}</p>
        <template v-if="item.status === 'failed'">
          <p class="mod-download-error">{{ t(`taskProgress.issues.${modDownloadIssue(item.message)}`) }}</p>
          <Collapsible v-if="item.message" @update:open="open => revealError(open, item.key)">
            <CollapsibleTrigger as-child>
              <Button variant="ghost" size="sm" :aria-label="t('taskProgress.itemError', { name: group.name, machine: targetLabels[item.targetId] || t('taskProgress.machine') })"><ChevronDown data-icon="inline-end" />{{ t('taskProgress.errorDetails') }}</Button>
            </CollapsibleTrigger>
            <CollapsibleContent><p class="mod-download-error-detail" :data-error-key="item.key">{{ item.message }}</p></CollapsibleContent>
          </Collapsible>
        </template>
      </div>
    </li>
  </ol>
  </div>
</template>

<style scoped>
.mod-downloads { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.mod-download-navigation { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px; font-size: 12px; color: var(--muted-foreground); }
.mod-download-list { display: flex; flex-direction: column; gap: 10px; max-height: min(36svh, 320px); overflow-y: auto; overscroll-behavior: contain; overflow-anchor: none; padding: 1px; }
.mod-download-item { min-width: 0; display: flex; flex-direction: column; gap: 9px; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius); }
.mod-download-item:focus-visible, .mod-download-list:focus-visible { outline: 2px solid var(--ring); outline-offset: -2px; }
.mod-download-item[data-status='downloading'] { border-color: var(--info); background: color-mix(in srgb, var(--info) 4%, var(--background)); }
.mod-download-item[data-status='failed'] { border-color: var(--destructive); }
.mod-download-heading { display: flex; align-items: center; gap: 10px; min-width: 0; }
.mod-download-name { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
.mod-download-transfer { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.mod-download-numbers { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 11px; color: var(--muted-foreground); }
.mod-download-numbers strong { color: var(--foreground); font-size: 12px; }
.mod-download-bytes { font-size: 11px; color: var(--muted-foreground); line-height: 1.5; font-variant-numeric: tabular-nums; }
.mod-download-error { font-size: 12px; line-height: 1.6; color: var(--destructive); }
.mod-download-error-detail { font-size: 12px; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 120px; overflow-y: auto; padding-block: 6px; }
@media (max-width: 767px) { .mod-download-item { padding: 10px; } }
</style>
