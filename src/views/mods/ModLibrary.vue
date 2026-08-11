<template>
  <div class="page-container">
    <header class="page-heading">
      <div>
        <h1>{{ $t('mods.library.title') }}</h1>
        <p>{{ $t('mods.library.subtitle') }}</p>
      </div>
      <div class="header-actions">
        <UiButton variant="outline" size="sm" :disabled="loading" @click="loadLibrary">
          <RefreshCw data-icon="inline-start" />
          {{ $t('mods.actions.refresh') }}
        </UiButton>
        <UiButton size="sm" @click="$router.push('/mods/search')">
          <Search data-icon="inline-start" />
          {{ $t('mods.actions.searchWorkshop') }}
        </UiButton>
      </div>
    </header>

    <Card>
      <CardHeader>
        <CardTitle>{{ $t('mods.library.filters.title') }}</CardTitle>
        <CardDescription>{{ $t('mods.library.filters.description') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup class="filter-form">
          <Field>
            <FieldLabel for="library-keyword">{{ $t('mods.library.filters.keyword') }}</FieldLabel>
            <InputGroup>
              <InputGroupAddon><Search /></InputGroupAddon>
              <InputGroupInput
                id="library-keyword"
                v-model="keyword"
                :placeholder="$t('mods.library.filters.keywordPlaceholder')"
              />
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel for="library-status">{{ $t('mods.library.filters.status') }}</FieldLabel>
            <UiSelect v-model="status">
              <SelectTrigger id="library-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{{ $t('mods.library.filters.statuses.all') }}</SelectItem>
                  <SelectItem value="downloaded">{{ $t('mods.library.filters.statuses.downloaded') }}</SelectItem>
                  <SelectItem value="attention">{{ $t('mods.library.filters.statuses.attention') }}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </UiSelect>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>

    <Alert v-if="loadError" variant="destructive">
      <TriangleAlert />
      <AlertTitle>{{ $t('mods.library.loadFailedTitle') }}</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
      <AlertAction>
        <UiButton size="sm" variant="outline" @click="loadLibrary">{{ $t('mods.actions.retry') }}</UiButton>
      </AlertAction>
    </Alert>

    <Card v-if="loading">
      <CardHeader>
        <Skeleton class="h-5 w-40" />
        <Skeleton class="h-4 w-72 max-w-full" />
      </CardHeader>
      <CardContent class="flex flex-col gap-3">
        <Skeleton v-for="index in 5" :key="index" class="h-14 w-full" />
      </CardContent>
    </Card>

    <Card v-else-if="!loadError && filteredMods.length">
      <CardHeader>
        <CardTitle>{{ $t('mods.library.table.title') }}</CardTitle>
        <CardDescription>{{ $t('mods.library.table.total', { count: filteredMods.length }) }}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{{ $t('mods.library.table.mod') }}</TableHead>
              <TableHead>{{ $t('mods.library.table.status') }}</TableHead>
              <TableHead>{{ $t('mods.library.table.updatedAt') }}</TableHead>
              <TableHead class="text-right">{{ $t('mods.library.table.actions') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="mod in filteredMods" :key="mod.id">
              <TableCell class="min-w-64 whitespace-normal">
                <div class="mod-identity">
                  <div class="mod-preview">
                    <ImageIcon />
                    <img v-if="mod.image" :src="mod.image" :alt="mod.name" loading="lazy" @error="hideImage" />
                  </div>
                  <div class="min-w-0">
                    <p class="truncate font-medium" :title="mod.name">{{ mod.name || `Workshop ${mod.id}` }}</p>
                    <p class="text-muted-foreground text-xs">{{ mod.author || $t('mods.values.unknownAuthor') }} · {{ mod.id }}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div class="flex flex-wrap gap-2">
                  <Badge :variant="mod.downloaded ? 'default' : 'destructive'">
                    {{ $t(mod.downloaded ? 'mods.values.downloaded' : 'mods.values.notDownloaded') }}
                  </Badge>
                  <Badge v-if="mod.updateAvailable" variant="secondary">{{ $t('mods.values.health.updateAvailable') }}</Badge>
                  <Badge v-else-if="mod.health && mod.health !== 'healthy'" variant="outline">
                    {{ healthLabel(mod.health) }}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>{{ formatDate(mod.updatedAt || mod.localUpdatedAt) }}</TableCell>
              <TableCell>
                <div class="row-actions">
                  <UiButton
                    size="sm"
                    variant="outline"
                    :disabled="isBusy(mod)"
                    @click="downloadOrUpdate(mod)"
                  >
                    <Spinner v-if="isBusy(mod)" data-icon="inline-start" />
                    <RefreshCw v-else-if="mod.downloaded" data-icon="inline-start" />
                    <Download v-else data-icon="inline-start" />
                    {{ $t(mod.downloaded ? 'mods.actions.update' : 'mods.actions.download') }}
                  </UiButton>
                  <UiButton size="sm" :disabled="!mod.downloaded || isBusy(mod)" @click="openAddDialog(mod)">
                    <PackagePlus data-icon="inline-start" />
                    {{ $t('mods.actions.addToRoom') }}
                  </UiButton>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Empty v-else-if="!loadError">
      <EmptyHeader>
        <EmptyMedia variant="icon"><PackageOpen /></EmptyMedia>
        <EmptyTitle>{{ $t(keyword || status !== 'all' ? 'mods.library.empty.noMatches' : 'mods.library.empty.noMods') }}</EmptyTitle>
        <EmptyDescription>{{ $t(keyword || status !== 'all' ? 'mods.library.empty.noMatchesDescription' : 'mods.library.empty.noModsDescription') }}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <UiButton @click="$router.push('/mods/search')">
          <Search data-icon="inline-start" />
          {{ $t('mods.actions.searchWorkshop') }}
        </UiButton>
      </EmptyContent>
    </Empty>

    <AddModToRoomDialog v-model:open="addDialogOpen" :mod="selectedMod" @added="loadLibrary" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Download, ImageIcon, PackageOpen, PackagePlus, RefreshCw, Search, TriangleAlert } from '@lucide/vue'
import { toast } from 'vue-sonner'
import AddModToRoomDialog from './AddModToRoomDialog.vue'
import { modApi } from '@/api'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createModFailure, formatModDate, formatModFailure, translateModBuiltinValue } from '@/i18n/modMessages'
import { i18n } from '@/i18n'

const mods = ref([])
const keyword = ref('')
const status = ref('all')
const loading = ref(false)
const loadFailure = ref(null)
const busyMods = ref({})
const addDialogOpen = ref(false)
const selectedMod = ref(null)

const translate = (...args) => i18n.global.t(...args)
const loadError = computed(() => formatModFailure(translate, loadFailure.value))
const filteredMods = computed(() => {
  const normalized = keyword.value.trim().toLowerCase()
  return mods.value.filter(mod => {
    const matchesKeyword = !normalized || [mod.name, mod.author, mod.id, mod.description]
      .some(value => String(value || '').toLowerCase().includes(normalized))
    const matchesStatus = status.value === 'all' ||
      (status.value === 'downloaded' && mod.downloaded) ||
      (status.value === 'attention' && (!mod.downloaded || mod.health !== 'healthy'))
    return matchesKeyword && matchesStatus
  })
})

onMounted(loadLibrary)

async function loadLibrary() {
  loading.value = true
  loadFailure.value = null
  try {
    const response = await modApi.getLibrary()
    mods.value = response.items || []
  } catch (error) {
    mods.value = []
    loadFailure.value = createModFailure('mods.errors.library', error)
    toast.error(loadError.value)
  } finally {
    loading.value = false
  }
}

function isBusy(mod) {
  return Boolean(busyMods.value[mod?.id])
}

function setBusy(mod, busy) {
  busyMods.value = { ...busyMods.value, [mod.id]: busy }
}

async function downloadOrUpdate(mod) {
  if (isBusy(mod)) return
  setBusy(mod, true)
  const pendingToast = toast.loading(translate(mod.downloaded ? 'mods.library.feedback.updating' : 'mods.library.feedback.downloading'))
  try {
    await modApi.downloadMod({ id: mod.id, downloaded: mod.downloaded, includeDependencies: true })
    await loadLibrary()
    toast.success(translate(mod.downloaded ? 'mods.library.feedback.updated' : 'mods.library.feedback.downloaded', { name: mod.name || mod.id }))
  } catch (error) {
    toast.error(formatModFailure(translate, createModFailure(mod.downloaded ? 'mods.errors.update' : 'mods.errors.download', error)))
  } finally {
    toast.dismiss(pendingToast)
    setBusy(mod, false)
  }
}

function openAddDialog(mod) {
  selectedMod.value = mod
  addDialogOpen.value = true
}

function formatDate(value) {
  return formatModDate(value, i18n.global.locale)
}

function healthLabel(value) {
  return translateModBuiltinValue(translate, 'health', value)
}

function hideImage(event) {
  event.currentTarget.hidden = true
}
</script>

<style scoped>
.page-container {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-heading,
.header-actions,
.mod-identity,
.row-actions {
  display: flex;
  align-items: center;
}

.page-heading {
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-heading h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;
}

.page-heading p {
  margin: 4px 0 0;
  color: var(--muted-foreground);
  font-size: 14px;
}

.header-actions,
.row-actions,
.mod-identity {
  gap: 8px;
}

.header-actions,
.row-actions {
  justify-content: flex-end;
}

.filter-form {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(180px, 1fr);
  align-items: end;
  gap: 12px;
}

.mod-preview {
  position: relative;
  display: grid;
  place-items: center;
  width: 44px;
  aspect-ratio: 1;
  flex: none;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--muted);
  color: var(--muted-foreground);
}

.mod-preview img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 760px) {
  .page-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .header-actions > * {
    flex: 1;
  }

  .filter-form {
    grid-template-columns: 1fr;
  }
}
</style>
