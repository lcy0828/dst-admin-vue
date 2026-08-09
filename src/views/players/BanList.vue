<template>
  <div class="ban-list-page">
    <header class="page-heading">
      <div>
        <h1>封禁管理</h1>
        <p>查看各房间的封禁记录，并在确认后解除封禁。</p>
      </div>
      <UiButton variant="outline" size="sm" :disabled="loading" @click="loadBans">
        <RefreshCw data-icon="inline-start" />
        刷新
      </UiButton>
    </header>

    <Card size="sm">
      <CardHeader><div><CardTitle>筛选记录</CardTitle><CardDescription>按房间或玩家关键词查询封禁记录。</CardDescription></div></CardHeader>
      <CardContent>
        <FieldGroup class="filter-grid">
          <Field>
            <FieldLabel for="ban-room-filter">房间</FieldLabel>
            <NativeSelect id="ban-room-filter" v-model="filters.archive_name" @change="applyFilters">
              <NativeSelectOption value="">全部房间</NativeSelectOption>
              <NativeSelectOption v-for="archive in archives" :key="archive.id" :value="archive.id">
                {{ archive.name }}
              </NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel for="ban-keyword-filter">关键词</FieldLabel>
            <InputGroup>
              <InputGroupAddon><Search /></InputGroupAddon>
              <InputGroupInput
                id="ban-keyword-filter"
                v-model="filters.keyword"
                placeholder="玩家名称、KU ID 或封禁原因"
                @keyup.enter="applyFilters"
              />
            </InputGroup>
          </Field>
          <div class="filter-actions">
            <UiButton size="sm" @click="applyFilters"><Search data-icon="inline-start" />查询</UiButton>
            <UiButton variant="outline" size="sm" @click="resetFilters">重置</UiButton>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>

    <Alert v-if="error" variant="destructive">
      <TriangleAlert />
      <AlertTitle>封禁记录加载失败</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
      <AlertAction><UiButton variant="outline" size="sm" @click="loadBans">重试</UiButton></AlertAction>
    </Alert>

    <Card size="sm">
      <CardHeader>
        <div>
          <CardTitle>封禁记录</CardTitle>
          <CardDescription>共 {{ pagination.total }} 条有效记录</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div v-if="loading" class="loading-state"><Spinner /><span>正在读取封禁记录</span></div>
        <div v-else-if="bans.length" class="table-wrap">
          <UiTable>
            <TableHeader>
              <TableRow>
                <TableHead>玩家</TableHead>
                <TableHead>房间 / 世界</TableHead>
                <TableHead>封禁原因</TableHead>
                <TableHead>封禁时间</TableHead>
                <TableHead>到期时间</TableHead>
                <TableHead class="action-column">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="player in bans" :key="`${player.room_id}:${player.user_id}`">
                <TableCell>
                  <div class="player-cell"><strong>{{ player.player_name || '未知玩家' }}</strong><code>{{ player.user_id }}</code></div>
                </TableCell>
                <TableCell>{{ player.archive_name }} / {{ player.world_name || '未知世界' }}</TableCell>
                <TableCell class="reason-cell">{{ player.ban_reason || '未记录原因' }}</TableCell>
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
                    解除封禁
                  </UiButton>
                </TableCell>
              </TableRow>
            </TableBody>
          </UiTable>
        </div>
        <Empty v-else>
          <EmptyHeader>
            <EmptyMedia variant="icon"><ShieldCheck /></EmptyMedia>
            <EmptyTitle>没有封禁记录</EmptyTitle>
            <EmptyDescription>当前筛选范围内没有被封禁的玩家。</EmptyDescription>
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
import { onMounted, reactive, ref } from 'vue'
import { RefreshCw, Search, ShieldCheck, TriangleAlert } from '@lucide/vue'
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
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Spinner } from '@/components/ui/spinner'
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const archives = ref([])
const bans = ref([])
const loading = ref(false)
const error = ref('')
const unbanningId = ref('')
const filters = reactive({ archive_name: '', keyword: '' })
const pagination = reactive({ page: 1, page_size: 20, total: 0 })

function errorMessage(value) {
  return value?.response?.data?.message || value?.message || '未知错误'
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN')
}

function formatExpiry(value) {
  if (!value) return '永久'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未知'
  if (date.getTime() <= Date.now()) return '已到期'
  return date.toLocaleString('zh-CN')
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
    toast.error(`房间列表加载失败：${errorMessage(value)}`)
  }
}

async function loadBans() {
  loading.value = true
  error.value = ''
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
    error.value = errorMessage(value)
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
      `确定要解除玩家 ${player.player_name || player.user_id} 的封禁吗？`,
      '解除封禁',
      { confirmButtonText: '解除封禁', destructive: true }
    )
    unbanningId.value = player.user_id
    await playerApi.unbanPlayer(player)
    toast.success(`已解除 ${player.player_name || player.user_id} 的封禁`)
    await loadBans()
  } catch (value) {
    if (value === 'cancel' || value === 'close') return
    toast.error(`解除封禁失败：${errorMessage(value)}`)
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
  gap: 16px;
}

.page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-heading h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 650;
  line-height: 28px;
}

.page-heading p {
  margin: 2px 0 0;
  color: var(--muted-foreground);
  font-size: 12px;
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
