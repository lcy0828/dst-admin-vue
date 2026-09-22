<script setup>
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, ChevronLeft, ChevronRight, RefreshCw, Search, X } from '@lucide/vue'
import { entityCatalogV2API } from '@/api/v2'
import { manualEntity } from '@/lib/workbench.mjs'
import { createWorldCatalogRead } from '@/lib/worldCatalogRead.mjs'
import { clearResourceHistory, mergeResourceDirectory, queryResources, readResourceHistory, rememberResource, resourceCategories } from '@/lib/resourceLibrary.mjs'
import EntityArtwork from './EntityArtwork.vue'
import ArtworkPackManager from './ArtworkPackManager.vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const props = defineProps({ roomId: { type: String, default: '' }, worldId: { type: String, default: '' }, running: Boolean, targetLoading: Boolean, worldStatus: { type: String, default: '' }, selectedKey: { type: String, default: '' } })
const emit = defineEmits(['select', 'refresh-target'])
const { t, locale } = useI18n()
const searchID = `resource-search-${useId()}`
const builtin = shallowRef([]), snapshot = shallowRef(null), history = shallowRef(readResourceHistory())
const query = ref(''), settledQuery = ref(''), category = ref('all'), source = ref('all'), sort = ref('smart'), page = ref(0)
const readState = ref({ phase: 'idle', attempt: 0 })
const loading = computed(() => ['loading', 'retrying'].includes(readState.value.phase))
const baseLoading = ref(true), errorKey = ref(''), baseError = ref(''), gameVersion = ref('')
const error = computed(() => errorKey.value ? t(`workbench.resources.${errorKey.value}`) : '')
const grid = ref(null)
let timer, baseController
const merged = computed(() => mergeResourceDirectory(builtin.value, snapshot.value?.items || []))
const result = computed(() => queryResources(merged.value, { query: settledQuery.value, category: category.value, source: source.value, sort: sort.value, history: history.value, locale: locale.value }))
const pages = computed(() => Math.max(1, Math.ceil(result.value.items.length / 60)))
const visible = computed(() => result.value.items.slice(page.value * 60, (page.value + 1) * 60))
const manual = computed(() => {
  const value = query.value.trim()
  return merged.value.some(item => item.id === value) ? null : manualEntity(value)
})
const canRead = computed(() => props.roomId && props.worldId && props.running && !props.targetLoading)
const selectedID = computed(() => props.selectedKey.split(':').slice(1).join(':'))
const observed = computed(() => snapshot.value?.observedAt ? new Date(snapshot.value.observedAt).toLocaleTimeString(locale.value) : '')
function resetResults() { page.value = 0; history.value = readResourceHistory(); if (grid.value) grid.value.scrollTop = 0 }
function select(item) { emit('select', item); if (settledQuery.value.trim()) rememberResource(item, 'search') }
function clearHistory() { clearResourceHistory(); resetResults() }
async function loadBase() {
  baseController?.abort(); baseController = new AbortController(); baseError.value = ''; baseLoading.value = true
  try {
    const data = await entityCatalogV2API.directory({ signal: baseController.signal })
    builtin.value = data.items || []; gameVersion.value = data.gameVersion
  } catch (e) { if (e.code !== 'ERR_CANCELED') baseError.value = t('workbench.resources.baseFailed') }
  finally { baseLoading.value = false }
}
function synchronizeSelection() {
  if (selectedID.value) emit('select', merged.value.find(item => item.id === selectedID.value) || null)
}
const reader = createWorldCatalogRead({
  request: ({ roomId, worldId, refresh }, signal) => entityCatalogV2API.snapshot(roomId, worldId, refresh, { signal }),
  onState: state => { readState.value = state },
  onResult: data => { snapshot.value = data; errorKey.value = ''; synchronizeSelection() },
  onError: failure => {
    const key = { RUNTIME_NOT_INSTALLED: 'worldNeedsRuntime', RUNTIME_CATALOG_LIMIT: 'worldLimited', RUNTIME_BUSY: 'worldBusy' }[failure?.code] || 'worldFailed'
    errorKey.value = key
    // Keep the previous completed snapshot of this exact world during a failed
    // refresh, with its original timestamp and an explicit stale-data message.
  }
})
function readWorld(refresh = false) {
  if (!canRead.value || loading.value) return
  errorKey.value = ''
  void reader.start({ roomId: props.roomId, worldId: props.worldId, refresh })
}
const idleHint = computed(() => {
  if (props.targetLoading) return 'targetLoading'
  if (!props.roomId || !props.worldId) return 'chooseWorld'
  if (props.worldStatus === 'starting') return 'worldStarting'
  return props.running ? 'worldPending' : props.worldStatus === 'stopped' ? 'worldStopped' : 'worldUnready'
})
const readLabel = computed(() => readState.value.phase === 'retrying' ? 'worldRetrying' : readState.value.attempt > 1 ? 'worldReadingAgain' : 'reading')
watch(query, () => { clearTimeout(timer); timer = setTimeout(() => { settledQuery.value = query.value; resetResults() }, 180) })
watch([category, source, sort], resetResults)
watch(pages, value => { if (page.value >= value) page.value = value - 1 })
watch(page, () => { if (grid.value) grid.value.scrollTop = 0 })
watch(() => [props.roomId, props.worldId, props.running, props.targetLoading], () => {
  reader.cancel(); readState.value = { phase: 'idle', attempt: 0 }; errorKey.value = ''
  snapshot.value = null; source.value = 'all'; resetResults(); emit('select', null); readWorld()
})
onMounted(() => { loadBase(); readWorld() })
onBeforeUnmount(() => { reader.dispose(); baseController?.abort(); clearTimeout(timer) })
</script>

<template>
  <div class="flex min-w-0 flex-col gap-3" data-resource-library>
    <div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
      <Field>
        <FieldLabel class="sr-only" :for="searchID">{{ t('workbench.catalog.search') }}</FieldLabel>
        <InputGroup>
          <InputGroupAddon><Search /></InputGroupAddon>
          <InputGroupInput :id="searchID" data-resource-search v-model="query" :placeholder="t('workbench.catalog.search')" maxlength="100" />
          <InputGroupAddon v-if="query" align="inline-end" class="has-[>button]:mr-0"><InputGroupButton :aria-label="t('entityTools.catalog.clearSearch')" @click="query = ''"><X /></InputGroupButton></InputGroupAddon>
        </InputGroup>
      </Field>
      <Field>
        <FieldLabel class="sr-only">{{ t('workbench.resources.sort') }}</FieldLabel>
        <Select v-model="sort"><SelectTrigger class="w-full" :aria-label="t('workbench.resources.sort')"><SelectValue>{{ t(`workbench.resources.sorts.${sort}`) }}</SelectValue></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="key in ['smart', 'recent', 'name']" :key="key" :value="key">{{ t(`workbench.resources.sorts.${key}`) }}</SelectItem></SelectGroup></SelectContent></Select>
      </Field>
    </div>
    <ToggleGroup :model-value="category" type="single" variant="outline" spacing="1" class="flex flex-wrap justify-start gap-1" :aria-label="t('workbench.resources.category')" @update:model-value="value => { if (value) category = value }">
      <ToggleGroupItem v-for="key in resourceCategories" :key="key" :value="key" class="gap-1.5 px-2.5 text-xs sm:text-sm"><span>{{ t(`workbench.resources.categories.${key}`) }}</span><span class="text-[10px] tabular-nums opacity-60">{{ result.counts[key] }}</span></ToggleGroupItem>
    </ToggleGroup>
    <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <span aria-live="polite">{{ t('workbench.catalog.count', { count: result.items.length }) }}<span v-if="observed"> · {{ t(error ? 'workbench.resources.lastWorldRead' : 'workbench.resources.worldRead', { time: observed }) }}</span></span>
      <Button v-if="canRead" size="sm" variant="outline" :disabled="loading" @click="readWorld(Boolean(snapshot))"><Spinner v-if="loading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{ t(loading ? 'workbench.resources.readingButton' : error ? 'workbench.resources.retryWorld' : snapshot ? 'workbench.catalog.refresh' : 'workbench.catalog.read') }}</Button>
      <Button v-else-if="roomId" size="sm" variant="outline" :disabled="targetLoading" @click="emit('refresh-target')"><RefreshCw data-icon="inline-start" />{{ t('workbench.resources.checkWorld') }}</Button>
    </div>
    <Alert v-if="baseError" variant="destructive"><AlertDescription class="flex flex-wrap items-center justify-between gap-2">{{ baseError }}<Button size="sm" variant="outline" @click="loadBase">{{ t('workbench.pack.retry') }}</Button></AlertDescription></Alert>
    <Alert v-if="loading || targetLoading" role="status" data-world-catalog-state="loading"><Spinner /><AlertDescription class="flex flex-col gap-1"><strong>{{ t(`workbench.resources.${targetLoading ? 'targetLoading' : readLabel}`, { attempt: readState.attempt }) }}</strong><span>{{ t('workbench.resources.readingHint') }}</span></AlertDescription></Alert>
    <Alert v-else-if="error" variant="destructive" role="alert" data-world-catalog-state="failed"><AlertDescription class="flex flex-col gap-1"><strong>{{ error }}</strong><span>{{ t(snapshot ? 'workbench.resources.previousSnapshot' : 'workbench.resources.vanillaAvailable') }}</span></AlertDescription></Alert>
    <p v-else-if="!snapshot" class="text-xs text-muted-foreground" data-world-catalog-state="idle">{{ t(`workbench.resources.${idleHint}`) }}</p>
    <div v-if="baseLoading && !merged.length" class="flex items-center gap-2 py-10 text-sm text-muted-foreground" role="status"><Spinner />{{ t('entityTools.catalog.searching') }}</div>
    <div v-else-if="visible.length" ref="grid" class="grid max-h-96 grid-cols-1 gap-2 overflow-y-auto overscroll-contain p-0.5 sm:grid-cols-2 xl:grid-cols-3" data-resource-grid>
      <button v-for="item in visible" :key="item.key" type="button" :data-prefab="item.id" class="flex min-w-0 cursor-pointer items-center gap-2 rounded-md border p-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring" :class="selectedKey === item.key ? 'border-primary bg-accent' : 'border-border'" :aria-pressed="selectedKey === item.key" :title="[item.nameZhCN, item.nameEn, item.id, item.modName].filter(Boolean).join(' · ')" @click="select(item)">
        <span class="size-11 shrink-0 overflow-hidden rounded-md bg-muted"><EntityArtwork :entity="item" :room-id="roomId" :world-id="worldId" /></span>
        <span class="flex min-w-0 flex-1 flex-col"><strong class="truncate text-sm">{{ locale === 'zh-CN' ? item.nameZhCN || item.nameEn || item.id : item.nameEn || item.nameZhCN || item.id }}</strong><code class="truncate text-xs text-muted-foreground">{{ item.id }}</code><span v-if="item.modId" class="truncate text-xs text-muted-foreground">{{ item.modName || item.modId }}</span></span>
        <Check v-if="selectedKey === item.key" class="size-4 shrink-0 text-primary" />
      </button>
    </div>
    <div v-else class="flex flex-col items-start gap-2 rounded-md border border-dashed p-5 text-sm">
      <strong>{{ t('workbench.catalog.empty') }}</strong><span class="text-muted-foreground">{{ t('workbench.resources.emptyHint') }}</span>
      <Button v-if="category !== 'all' || source !== 'all'" size="sm" variant="outline" @click="category = 'all'; source = 'all'">{{ t('workbench.resources.resetFilters') }}</Button>
    </div>
    <div v-if="manual" class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed p-2.5 text-xs text-muted-foreground"><span>{{ t('workbench.resources.manualHint') }}</span><Button size="sm" variant="outline" class="h-auto min-h-8 max-w-full whitespace-normal break-all text-left" @click="select(manual)">{{ t('workbench.resources.manual', { id: manual.id }) }}</Button></div>
    <div class="flex flex-wrap items-center justify-between gap-2">
      <ArtworkPackManager />
      <div class="flex items-center gap-2"><span class="text-xs tabular-nums text-muted-foreground">{{ page + 1 }} / {{ pages }}</span><Button size="icon-sm" variant="outline" :aria-label="t('workbench.catalog.previous')" :disabled="page === 0" @click="page--"><ChevronLeft /></Button><Button size="icon-sm" variant="outline" :aria-label="t('workbench.catalog.next')" :disabled="page + 1 >= pages" @click="page++"><ChevronRight /></Button></div>
    </div>
    <details class="rounded-md border border-dashed text-xs text-muted-foreground">
      <summary class="cursor-pointer px-3 py-2">{{ t('workbench.resources.options') }}</summary>
      <div class="flex flex-col gap-3 border-t p-3">
        <div class="flex flex-wrap items-center gap-2">
          <Select :key="locale" v-model="source"><SelectTrigger class="w-full sm:w-52" :aria-label="t('workbench.catalog.source')"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">{{ t('workbench.catalog.all') }}</SelectItem><SelectItem value="vanilla">{{ t('workbench.catalog.vanilla') }}</SelectItem><SelectItem value="mods">{{ t('workbench.catalog.mods') }}</SelectItem><SelectItem v-for="mod in snapshot?.mods || []" :key="mod.id" :value="mod.id">{{ mod.name || mod.id }}</SelectItem></SelectGroup></SelectContent></Select>
          <Button size="sm" variant="ghost" @click="clearHistory">{{ t('workbench.resources.clearHistory') }}</Button>
        </div>
        <p>{{ t('workbench.resources.historyHint') }}</p>
        <p>{{ t('workbench.resources.coverage', { version: gameVersion || '—' }) }}</p>
      </div>
    </details>
  </div>
</template>
