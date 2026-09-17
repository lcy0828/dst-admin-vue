<template>
  <div class="ban-list-page">
    <header class="page-heading">
      <div>
        <h1>{{ t('players.banList.title') }}</h1>
      </div>
      <UiButton variant="outline" size="sm" :disabled="loading" @click="loadBans">
        <RefreshCw data-icon="inline-start" />
        {{ t('players.actions.refresh') }}
      </UiButton>
    </header>

    <Card>
      <CardHeader><CardTitle>{{ t('players.banList.filterTitle') }}</CardTitle></CardHeader>
      <CardContent>
        <FieldGroup class="filter-grid">
          <RoomScopeSelect v-model="filters.archive_name" :rooms="archives" allow-all @update:model-value="applyFilters" />
          <Field>
            <FieldLabel for="ban-keyword-filter">{{ t('players.fields.keyword') }}</FieldLabel>
            <InputGroup>
              <InputGroupAddon><Search /></InputGroupAddon>
              <InputGroupInput
                id="ban-keyword-filter"
                v-model="filters.keyword"
                :placeholder="t('players.banList.keywordPlaceholder')"
                @keyup.enter="applyFilters"
              />
            </InputGroup>
          </Field>
          <div class="filter-actions">
            <UiButton size="sm" @click="applyFilters"><Search data-icon="inline-start" />{{ t('players.actions.query') }}</UiButton>
            <UiButton variant="outline" size="sm" @click="resetFilters">{{ t('players.actions.reset') }}</UiButton>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>

    <Alert v-if="error" variant="destructive">
      <TriangleAlert />
      <AlertTitle>{{ t('players.banList.loadFailedTitle') }}</AlertTitle>
      <AlertDescription>{{ errorText }}</AlertDescription>
      <AlertAction><UiButton variant="outline" size="sm" @click="loadBans">{{ t('players.actions.retry') }}</UiButton></AlertAction>
    </Alert>

    <Card>
      <CardHeader>
        <div>
          <CardTitle>{{ t('players.banList.recordsTitle') }}</CardTitle>
          <CardDescription>{{ t('players.banList.total', { count: pagination.total }) }}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div v-if="loading" class="loading-state"><Spinner /><span>{{ t('players.banList.loading') }}</span></div>
        <div v-else-if="bans.length" class="table-wrap">
          <UiTable>
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('players.fields.playerName') }}</TableHead>
                <TableHead>{{ t('players.fields.roomAndWorld') }}</TableHead>
                <TableHead>{{ t('players.fields.banReason') }}</TableHead>
                <TableHead>{{ t('players.fields.bannedAt') }}</TableHead>
                <TableHead>{{ t('players.fields.expiresAt') }}</TableHead>
                <TableHead class="action-column">{{ t('players.fields.action') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="player in bans" :key="`${player.room_id}:${player.user_id}`">
                <TableCell>
                  <div class="player-cell"><strong>{{ player.player_name || t('players.values.unknownPlayer') }}</strong><code>{{ player.user_id }}</code></div>
                </TableCell>
                <TableCell>{{ player.archive_name }} / {{ player.world_name || t('players.values.unknownWorld') }}</TableCell>
                <TableCell class="reason-cell">{{ player.ban_reason || t('players.values.noReason') }}</TableCell>
                <TableCell>{{ formatDate(player.banned_at) }}</TableCell>
                <TableCell>
                  <Badge :variant="expiryVariant(player)">{{ formatExpiry(player.ban_expires_at) }}</Badge>
                </TableCell>
                <TableCell class="action-column">
                  <UiButton
                    variant="outline"
                    size="sm"
                    :disabled="unbanningId === player.user_id"
                    @click="unban(player)"
                  >
                    <Spinner v-if="unbanningId === player.user_id" data-icon="inline-start" />
                    {{ t('players.actions.unban') }}
                  </UiButton>
                </TableCell>
              </TableRow>
            </TableBody>
          </UiTable>
        </div>
        <Empty v-else>
          <EmptyHeader>
            <EmptyMedia variant="icon"><ShieldCheck /></EmptyMedia>
            <EmptyTitle>{{ t('players.banList.emptyTitle') }}</EmptyTitle>
            <EmptyDescription>{{ t('players.banList.emptyDescription') }}</EmptyDescription>
          </EmptyHeader>
        </Empty>

      </CardContent>
      <CardFooter v-if="!loading && pagination.total > pagination.page_size" class="pagination-bar">
          <Pagination
            :page="pagination.page"
            :total="pagination.total"
            :items-per-page="pagination.page_size"
            show-edges
            @update:page="changePage"
          >
            <PaginationContent v-slot="{ items }">
              <PaginationPrevious />
              <template v-for="(item, index) in items" :key="index">
                <PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === pagination.page">
                  {{ item.value }}
                </PaginationItem>
                <PaginationEllipsis v-else :index="index" />
              </template>
              <PaginationNext />
            </PaginationContent>
          </Pagination>
      </CardFooter>
    </Card>
  </div>
</template>

<script setup>
import RoomScopeSelect from '@/components/layout/RoomScopeSelect.vue'
import { readWorkspaceSelection } from '@/lib/workspacePreferences.mjs'
import { managementScopeTargetId } from '@/lib/managementScope.mjs'
import { useRoute } from 'vue-router'
import { computed, onMounted, reactive, ref } from 'vue'
import { RefreshCw, Search, ShieldCheck, TriangleAlert } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { playerApi } from '@/api/playerApi'
import { confirmAction } from '@/lib/feedback'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Spinner } from '@/components/ui/spinner'
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatBanExpiry, formatPlayerDate, playerErrorDetail } from '@/i18n/playerMessages.js'

const { locale, t } = useI18n()

const archives = ref([])
const bans = ref([])
const loading = ref(false)
const error = ref(null)
const unbanningId = ref('')
const filters = reactive({ archive_name: useRoute().query.roomId ?? readWorkspaceSelection(managementScopeTargetId()).roomId, keyword: '' })
const pagination = reactive({ page: 1, page_size: 20, total: 0 })

const errorText = computed(() => error.value ? playerErrorDetail(error.value, t) : '')

function errorMessage(value) {
  return playerErrorDetail(value, t)
}

function formatDate(value) {
  return formatPlayerDate(value, locale.value)
}

function formatExpiry(value) {
  return formatBanExpiry(value, locale.value, t)
}

function expiryVariant(player) {
  if (!player.ban_expires_at) return 'destructive'
  return new Date(player.ban_expires_at).getTime() <= Date.now() ? 'secondary' : 'outline'
}

async function loadArchives() {
  try {
    const response = await playerApi.getArchives()
    archives.value = response.data || []
  } catch (value) {
    toast.error(t('players.banList.archivesLoadFailed', { error: errorMessage(value) }))
  }
}

async function loadBans() {
  loading.value = true
  error.value = null
  try {
    const response = await playerApi.getBannedPlayers({
      ...filters,
      page: pagination.page,
      page_size: pagination.page_size
    })
    bans.value = response.data || []
    pagination.total = response.total || 0
    const lastPage = Math.max(1, Math.ceil(pagination.total / pagination.page_size))
    if (pagination.page > lastPage) {
      pagination.page = lastPage
      await loadBans()
    }
  } catch (value) {
    bans.value = []
    pagination.total = 0
    error.value = value
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  pagination.page = 1
  loadBans()
}

function resetFilters() {
  filters.archive_name = ''
  filters.keyword = ''
  applyFilters()
}

function changePage(page) {
  pagination.page = page
  loadBans()
}

async function unban(player) {
  try {
    await confirmAction(
      t('players.banList.unbanPrompt', { room: player.archive_name }),
      t('players.actions.unban'),
      {
        confirmButtonText: t('players.actions.unban'),
        cancelButtonText: t('players.actions.cancel'),
        type: 'warning'
      }
    )
    unbanningId.value = player.user_id
    await playerApi.unbanPlayer(player, player.archive_name)
    toast.success(t('players.banList.unbanSucceeded', { player: player.player_name || player.user_id }))
    await loadBans()
  } catch (value) {
    if (value === 'cancel' || value === 'close') return
    toast.error(t('players.banList.unbanFailed', { error: errorMessage(value) }))
  } finally {
    unbanningId.value = ''
  }
}

onMounted(() => {
  loadArchives()
  loadBans()
})
</script>

<style scoped>
.ban-list-page {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 24px;
}

.page-heading {
  display: flex;
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

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  align-items: end;
  gap: 12px;
}

.filter-actions,
.loading-state,
.pagination-bar {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.filter-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.loading-state {
  min-height: 220px;
  justify-content: center;
  color: var(--muted-foreground);
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
}

.table-wrap table {
  min-width: 960px;
}

.player-cell {
  display: flex;
  min-width: 160px;
  flex-direction: column;
  gap: 2px;
}

.player-cell code,
.reason-cell {
  color: var(--muted-foreground);
}

.reason-cell {
  min-width: 180px;
  max-width: 320px;
  overflow-wrap: anywhere;
}

.action-column {
  position: sticky;
  right: 0;
  width: 112px;
  background: var(--card);
  box-shadow: -1px 0 var(--border);
}

.pagination-bar {
  justify-content: flex-end;
}

@media (max-width: 720px) {
  .page-heading {
    align-items: stretch;
  }

  .page-heading {
    flex-direction: column;
  }
}
</style>
