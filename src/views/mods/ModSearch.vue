<template>
  <div class="page-container">
    <header v-if="!embedded" class="page-heading">
      <div>
        <h1>{{ $t('mods.search.title') }}</h1>
      </div>
      <UiButton variant="outline" size="sm" @click="goToLibrary"><ArrowLeft data-icon="inline-start" />{{ $t('mods.actions.backToLibrary') }}</UiButton>
    </header>

    <Card class="search-panel">
      <CardHeader><CardTitle>{{ $t('mods.search.form.title') }}</CardTitle></CardHeader>
      <CardContent>
        <FieldGroup class="search-form">
          <Field class="search-keyword">
            <FieldLabel for="mod-search-keyword">{{ $t('mods.search.form.name') }}</FieldLabel>
            <InputGroup>
              <InputGroupAddon><Search /></InputGroupAddon>
              <InputGroupInput id="mod-search-keyword" v-model="searchForm.keyword" :placeholder="$t('mods.search.form.namePlaceholder')" @keyup.enter="startSearch" />
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel for="mod-search-sort">{{ $t('mods.search.form.sort') }}</FieldLabel>
            <UiSelect v-model="searchForm.sort" @update:model-value="sortChanged">
              <SelectTrigger id="mod-search-sort"><SelectValue /></SelectTrigger>
              <SelectContent
                ><SelectGroup>
                  <SelectItem value="relevance">{{ $t('mods.search.sorts.relevance') }}</SelectItem>
                  <SelectItem value="trend">{{ $t('mods.search.sorts.trend') }}</SelectItem>
                  <SelectItem value="most_recent">{{ $t('mods.search.sorts.mostRecent') }}</SelectItem>
                  <SelectItem value="last_updated">{{ $t('mods.search.sorts.lastUpdated') }}</SelectItem>
                  <SelectItem value="most_subscribed">{{ $t('mods.search.sorts.mostSubscribed') }}</SelectItem>
                  <SelectItem value="top_rated">{{ $t('mods.search.sorts.topRated') }}</SelectItem>
                </SelectGroup></SelectContent
              >
            </UiSelect>
          </Field>
          <Field>
            <FieldLabel for="mod-search-category">{{ $t('mods.search.form.category') }}</FieldLabel>
            <UiSelect v-model="searchForm.category" @update:model-value="filtersChanged">
              <SelectTrigger id="mod-search-category"><SelectValue /></SelectTrigger>
              <SelectContent
                ><SelectGroup>
                  <SelectItem v-for="category in categories" :key="category.value" :value="category.value">{{ $t(category.label) }}</SelectItem>
                </SelectGroup></SelectContent
              >
            </UiSelect>
          </Field>
          <Field>
            <FieldLabel for="mod-search-days">{{ $t('mods.search.form.days') }}</FieldLabel>
            <UiSelect v-model="searchForm.days" @update:model-value="filtersChanged">
              <SelectTrigger id="mod-search-days"><SelectValue /></SelectTrigger>
              <SelectContent
                ><SelectGroup>
                  <SelectItem value="1">{{ $t('mods.search.days.one') }}</SelectItem>
                  <SelectItem value="7">{{ $t('mods.search.days.seven') }}</SelectItem>
                  <SelectItem value="30">{{ $t('mods.search.days.thirty') }}</SelectItem>
                  <SelectItem value="90">{{ $t('mods.search.days.ninety') }}</SelectItem>
                  <SelectItem value="365">{{ $t('mods.search.days.year') }}</SelectItem>
                  <SelectItem value="-1">{{ $t('mods.search.days.all') }}</SelectItem>
                </SelectGroup></SelectContent
              >
            </UiSelect>
          </Field>
          <Field>
            <FieldLabel for="mod-search-page-size">{{ $t('mods.search.form.pageSize') }}</FieldLabel>
            <UiSelect v-model="searchForm.pageSize" @update:model-value="pageSizeChanged">
              <SelectTrigger id="mod-search-page-size"><SelectValue /></SelectTrigger>
              <SelectContent
                ><SelectGroup>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectGroup></SelectContent
              >
            </UiSelect>
          </Field>
          <Field class="search-actions">
            <FieldLabel class="sr-only">{{ $t('mods.actions.search') }}</FieldLabel>
            <div class="search-action-buttons">
              <UiButton @click="startSearch" :disabled="searching"> <Spinner v-if="searching" data-icon="inline-start" /><Search v-else data-icon="inline-start" />{{ $t('mods.actions.search') }} </UiButton>
              <UiButton variant="outline" @click="resetSearch">{{ $t('mods.actions.reset') }}</UiButton>
            </div>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>

    <Alert v-if="loadError" variant="destructive">
      <TriangleAlert />
      <AlertTitle>{{ $t('mods.search.loadFailedTitle') }}</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
      <AlertAction
        ><UiButton size="sm" variant="outline" @click="retryLoad">{{ $t('mods.actions.retry') }}</UiButton></AlertAction
      >
    </Alert>

    <Alert v-if="runtimeStatusFailure">
      <TriangleAlert />
      <AlertTitle>{{ $t('mods.search.runtimeStatus.failedTitle') }}</AlertTitle>
      <AlertDescription>{{ runtimeStatusFailure }}</AlertDescription>
      <AlertAction><UiButton size="sm" variant="outline" @click="loadRuntimeDownloads">{{ $t('mods.actions.retry') }}</UiButton></AlertAction>
    </Alert>

    <div v-if="searching" class="mod-grid">
      <Card v-for="index in 8" :key="index" class="mod-card">
        <CardHeader class="mod-card-header"
          ><Skeleton class="mod-image" />
          <div class="flex min-w-0 flex-1 flex-col gap-2"><Skeleton class="skeleton-title" /><Skeleton class="skeleton-meta" /></div
        ></CardHeader>
        <CardContent><Skeleton class="skeleton-description" /></CardContent>
        <CardFooter><Skeleton class="skeleton-button" /></CardFooter>
      </Card>
    </div>

    <div v-else-if="!loadError && searchResults.length > 0">
      <div class="result-heading">
        <p>
          {{ $t('mods.search.results', { count: formatNumber(totalResults) }) }}
        </p>
        <p>{{ $t(`mods.search.sorts.${sortTranslationKey}`) }}</p>
      </div>
      <div class="mod-grid">
        <Card v-for="mod in searchResults" :key="mod.id" class="mod-card">
          <CardHeader class="mod-card-header">
            <div class="mod-image"><ImageIcon /><img v-if="mod.image || defaultImage" :src="modThumbnailUrl(mod.image || defaultImage, 184)" :alt="mod.name" loading="lazy" @error="handleImageError" /></div>
            <div class="min-w-0 flex-1">
              <div class="mod-title-row">
                <CardTitle class="truncate" :title="mod.name">{{ mod.name }}</CardTitle>
              </div>
              <CardDescription class="truncate">{{ mod.author || $t('mods.values.unknownAuthor') }} · {{ mod.id }}</CardDescription>
              <div class="mt-2 flex flex-wrap gap-2">
                <Badge v-if="mod.version" variant="secondary">v{{ mod.version }}</Badge
                ><Badge v-for="tag in visibleTags(mod)" :key="tag" variant="outline">{{ tagLabel(tag) }}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent class="mod-meta">
            <p class="mod-description">
              {{ mod.description || $t('mods.workshop.noDescription') }}
            </p>
            <div class="mod-stats">
              <span><Star />{{ formatRating(mod.rating) }}</span>
              <span><Users />{{ formatNumber(mod.subscriptions) }}</span>
              <span><Clock />{{ formatDate(mod.updatedAt) }}</span>
            </div>
            <div class="mod-download-state" aria-live="polite">
              <Skeleton v-if="runtimeStatusLoading" class="h-5 w-36" />
              <template v-else-if="downloadedInstallations(mod).length">
                <Badge
                  v-for="option in downloadedInstallations(mod)"
                  :key="option.key"
                  :variant="downloadStateVariant(option.downloadState)"
                  :title="option.label"
                >{{ option.label }} · {{ $t(`mods.search.runtimeStatus.${option.downloadState}`) }}</Badge>
              </template>
              <Badge v-else variant="outline">{{ $t('mods.search.runtimeStatus.notDownloaded') }}</Badge>
            </div>
          </CardContent>
          <CardFooter class="mod-actions">
            <UiButton size="sm" variant="outline" :disabled="runtimeStatusLoading || downloadOptionsFor(mod).every(option => !option.online)" @click="openDownloadDialog(mod)"><Download data-icon="inline-start" />{{ $t('mods.actions.downloadMod') }}</UiButton>
            <UiButton size="sm" @click="openAddDialog(mod)"><PackagePlus data-icon="inline-start" />{{ $t('mods.actions.downloadAndAddToRoom') }}</UiButton>
            <UiButton variant="ghost" size="sm" @click="showModDetails(mod)"><Info data-icon="inline-start" />{{ $t('mods.actions.details') }}</UiButton>
          </CardFooter>
        </Card>
      </div>

      <Pagination v-if="totalResults > pageSize" :page="currentPage" :total="totalResults" :items-per-page="pageSize" show-edges @update:page="handlePageChange">
        <PaginationContent v-slot="{ items }">
          <PaginationPrevious />
          <template v-for="(item, index) in items" :key="index">
            <PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === currentPage">{{ item.value }}</PaginationItem>
            <PaginationEllipsis v-else :index="index" />
          </template>
          <PaginationNext />
        </PaginationContent>
      </Pagination>
    </div>

    <Empty v-else-if="!loadError && hasSearched">
      <EmptyHeader
        ><EmptyMedia variant="icon"><SearchX /></EmptyMedia><EmptyTitle>{{ $t('mods.search.empty.noResults') }}</EmptyTitle
        ><EmptyDescription>{{ $t('mods.search.empty.noResultsDescription') }}</EmptyDescription></EmptyHeader
      >
    </Empty>
    <Empty v-else-if="!loadError">
      <EmptyHeader
        ><EmptyMedia variant="icon"><Search /></EmptyMedia><EmptyTitle>{{ $t('mods.search.empty.notSearched') }}</EmptyTitle></EmptyHeader
      >
    </Empty>

    <ModDetailsDialog v-model:open="detailsDialogVisible" :mod="currentModInfo" :loading="detailsLoading">
      <template #actions="{ mod }">
        <UiButton variant="outline" @click="openDownloadDialog(mod)"><Download data-icon="inline-start" />{{ $t('mods.actions.downloadMod') }}</UiButton>
        <UiButton @click="openAddDialog(mod)"><PackagePlus data-icon="inline-start" />{{ $t('mods.actions.downloadAndAddToRoom') }}</UiButton>
      </template>
    </ModDetailsDialog>

    <DownloadModDialog v-model:open="downloadDialogOpen" :mod="downloadTarget" :installation-options="downloadOptionsFor(downloadTarget)" @downloaded="loadRuntimeDownloads" />
    <AddModToRoomDialog v-model:open="addDialogOpen" :mod="addTarget" @added="loadRuntimeDownloads" />
  </div>
</template>

<script>
import { ArrowLeft, Clock, Download, ImageIcon, Info, PackagePlus, Search, SearchX, Star, TriangleAlert, Users } from '@lucide/vue'
import { toast } from 'vue-sonner'
import AddModToRoomDialog from './AddModToRoomDialog.vue'
import DownloadModDialog from './DownloadModDialog.vue'
import ModDetailsDialog from './ModDetailsDialog.vue'
import { modApi } from '@/api'
import { runtimeTargetsV2API } from '@/api/v2'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { createModFailure, formatModDate, formatModFailure } from '@/i18n/modMessages'
import { resolveModSearchSort } from '@/lib/modSearchDefaults.mjs'
import { modThumbnailUrl } from '@/lib/modImages.mjs'
import { getManagementScope, MANAGEMENT_SCOPE_CHANGED_EVENT, managementScopeTargetId } from '@/lib/managementScope.mjs'
import { buildRuntimeInstallationOptions } from '@/lib/runtimeModInventory.mjs'

export default {
  name: 'ModSearch',
  props: {
    embedded: { type: Boolean, default: false }
  },
  components: {
    AddModToRoomDialog,
    DownloadModDialog,
    ModDetailsDialog,
    ArrowLeft,
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
    Badge,
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    Clock,
    Download,
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    Field,
    FieldGroup,
    FieldLabel,
    ImageIcon,
    Info,
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
    PackagePlus,
    Search,
    SearchX,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Skeleton,
    Spinner,
    Star,
    TriangleAlert,
    UiButton,
    UiSelect,
    Users
  },
  data() {
    return {
      searchForm: {
        keyword: '',
        sort: 'trend',
        category: 'all',
        days: '7',
        pageSize: '20'
      },
      sortManuallySelected: false,
      searching: false,
      loadFailure: null,
      searchRequestId: 0,
      hasSearched: false,
      searchResults: [],
      totalResults: 0,
      currentPage: 1,
      defaultImage: '',
      detailsDialogVisible: false, // 详情对话框可见性
      currentModInfo: null, // 当前查看的模组
      detailsLoading: false,
      detailsRequestId: 0,
      addDialogOpen: false,
      addTarget: null,
      downloadDialogOpen: false,
      downloadTarget: null,
      runtimeInstallations: [],
      runtimeStatusLoading: false,
      runtimeStatusFailure: '',
      runtimeStatusRequestId: 0
    }
  },
  computed: {
    loadError() {
      return this.localizedFailure(this.loadFailure)
    },
    pageSize() {
      return Number(this.searchForm.pageSize) || 20
    },
    sortTranslationKey() {
      return (
        {
          relevance: 'relevance',
          trend: 'trend',
          most_recent: 'mostRecent',
          last_updated: 'lastUpdated',
          most_subscribed: 'mostSubscribed',
          top_rated: 'topRated'
        }[this.searchForm.sort] || 'trend'
      )
    },
    categories() {
      return [
        ['all', 'all'],
        ['character', 'character'],
        ['item', 'item'],
        ['pet', 'pet'],
        ['creature', 'creature'],
        ['environment', 'environment'],
        ['interface', 'interface'],
        ['utility', 'utility'],
        ['art', 'art'],
        ['worldgen', 'worldgen'],
        ['tweak', 'tweak'],
        ['scenario', 'scenario'],
        ['language', 'language'],
        ['other', 'other'],
        ['tutorial', 'tutorial'],
        ['client_only_mod', 'clientOnly'],
        ['server_only_mod', 'serverOnly'],
        ['all_clients_require_mod', 'allClientsRequire'],
        ['server_admin', 'serverAdmin']
      ].map(([value, key]) => ({
        value,
        label: `mods.workshop.categories.${key}`
      }))
    }
  },
  async created() {
    const keyword = this.$route.query.keyword
    if (typeof keyword === 'string' && keyword.trim()) {
      this.searchForm.keyword = keyword
    }
    await Promise.all([this.searchMods(), this.loadRuntimeDownloads()])
  },
  mounted() {
    window.addEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, this.handleManagementScopeChanged)
  },
  beforeUnmount() {
    window.removeEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, this.handleManagementScopeChanged)
  },
  methods: {
    modThumbnailUrl,
    handleImageError(event) {
      event.currentTarget.hidden = true
    },
    startSearch() {
      this.currentPage = 1
      this.searchMods()
    },

    sortChanged(sort) {
      this.searchForm.sort = sort
      this.sortManuallySelected = true
      this.filtersChanged()
    },

    applyKeywordSortDefault() {
      this.searchForm.sort = resolveModSearchSort(
        this.searchForm.keyword,
        this.searchForm.sort,
        this.sortManuallySelected
      )
    },

    filtersChanged() {
      this.currentPage = 1
      this.searchMods()
    },

    pageSizeChanged() {
      this.currentPage = 1
      this.searchMods()
    },

    async searchMods() {
      this.applyKeywordSortDefault()
      const requestId = ++this.searchRequestId
      this.searching = true
      this.loadFailure = null
      this.hasSearched = true
      this.searchResults = []

      try {
        const data = await modApi.searchMods({
          keyword: this.searchForm.keyword,
          sort: this.searchForm.sort,
          days: Number(this.searchForm.days),
          tags: this.searchForm.category === 'all' ? [] : [this.searchForm.category],
          page: this.currentPage,
          pageSize: this.pageSize
        })
        if (requestId !== this.searchRequestId) return
        this.searchResults = data.items || []
        this.totalResults = data.total || 0
      } catch (error) {
        if (requestId !== this.searchRequestId) return
        this.loadFailure = this.failure('mods.errors.search', error)
        toast.error(this.loadError)
        this.searchResults = []
        this.totalResults = 0
      } finally {
        if (requestId === this.searchRequestId) this.searching = false
      }
    },
    resetSearch() {
      this.searchForm.keyword = ''
      this.searchForm.sort = 'trend'
      this.sortManuallySelected = false
      this.searchForm.category = 'all'
      this.searchForm.days = '7'
      this.searchForm.pageSize = '20'
      this.currentPage = 1
      this.loadFailure = null
      this.searchMods()
    },

    retryLoad() {
      return this.searchMods()
    },

    handlePageChange(page) {
      this.currentPage = page
      this.searchMods()
    },

    goToLibrary() {
      this.$router.push({ path: '/mods', query: { scope: 'downloaded' } })
    },

    openAddDialog(mod) {
      this.addTarget = mod
      this.addDialogOpen = true
      this.detailsDialogVisible = false
    },

    openDownloadDialog(mod) {
      this.downloadTarget = mod
      this.downloadDialogOpen = true
      this.detailsDialogVisible = false
    },

    handleManagementScopeChanged() {
      this.loadRuntimeDownloads()
    },

    async loadRuntimeDownloads() {
      const requestId = ++this.runtimeStatusRequestId
      this.runtimeStatusLoading = true
      this.runtimeStatusFailure = ''
      try {
        const targets = await runtimeTargetsV2API.list()
        const options = buildRuntimeInstallationOptions(targets, managementScopeTargetId(getManagementScope()))
        const observations = await Promise.all(options.map(async option => {
          if (!option.online) return { ...option, inventory: null, error: null }
          try {
            const inventory = await modApi.getRuntimeModInventory(option.targetId, option.installationId)
            return { ...option, inventory, error: null }
          } catch (error) {
            return { ...option, inventory: null, error }
          }
        }))
        if (requestId !== this.runtimeStatusRequestId) return
        this.runtimeInstallations = observations
        const failed = observations.filter(option => option.online && option.error)
        if (failed.length) {
          this.runtimeStatusFailure = this.$t('mods.search.runtimeStatus.failedDescription', { count: failed.length })
        }
      } catch (error) {
        if (requestId !== this.runtimeStatusRequestId) return
        this.runtimeInstallations = []
        this.runtimeStatusFailure = this.localizedFailure(this.failure('mods.errors.runtimeInventory', error))
      } finally {
        if (requestId === this.runtimeStatusRequestId) this.runtimeStatusLoading = false
      }
    },

    downloadOptionsFor(mod) {
      const modId = String(mod?.id || mod?.modid || '')
      return this.runtimeInstallations.map(option => {
        if (option.error) return { ...option, downloadState: 'unavailable' }
        const item = (option.inventory?.items || []).find(value => String(value.id) === modId)
        if (!item) return { ...option, downloadState: 'missing' }
        if (item.fileStatus !== 'ready' || item.versionStatus === 'invalid') return { ...option, downloadState: 'invalid' }
        if (item.versionStatus === 'outdated') return { ...option, downloadState: 'outdated' }
        return { ...option, downloadState: item.versionStatus === 'current' ? 'current' : 'unknown' }
      })
    },

    downloadedInstallations(mod) {
      return this.downloadOptionsFor(mod).filter(option => ['current', 'outdated', 'unknown', 'invalid'].includes(option.downloadState))
    },

    downloadStateVariant(state) {
      if (state === 'current') return 'success'
      if (state === 'outdated') return 'warning'
      if (state === 'invalid') return 'destructive'
      return 'outline'
    },

    async showModDetails(mod) {
      const requestId = ++this.detailsRequestId
      this.currentModInfo = mod
      this.detailsDialogVisible = true
      this.detailsLoading = true
      try {
        const details = await modApi.getModDetails(mod)
        if (requestId === this.detailsRequestId) this.currentModInfo = details
      } catch (error) {
        if (requestId === this.detailsRequestId) {
          toast.error(this.localizedFailure(this.failure('mods.errors.details', error)))
        }
      } finally {
        if (requestId === this.detailsRequestId) this.detailsLoading = false
      }
    },

    // 提取星级评分
    formatRating(rating) {
      if (rating === null || rating === undefined) return this.$t('mods.workshop.noRatings')
      const score = Number(rating)
      return `${(score <= 1 ? score * 5 : score).toFixed(1)} / 5`
    },

    formatNumber(value) {
      const locale = this.$i18n.locale === 'en-US' ? 'en-US' : 'zh-CN'
      return new Intl.NumberFormat(locale, {
        notation: 'compact',
        maximumFractionDigits: 1
      }).format(Number(value) || 0)
    },

    visibleTags(mod) {
      return (mod.tags || []).filter(tag => !String(tag).toLowerCase().startsWith('version:')).slice(0, 2)
    },

    tagLabel(value) {
      const normalized = String(value).trim().toLowerCase()
      const category = this.categories.find(item => item.value === normalized)
      return category ? this.$t(category.label) : value
    },

    formatDate(value) {
      return formatModDate(value, this.$i18n.locale)
    },

    failure(key, error) {
      return createModFailure(key, error)
    },

    localizedFailure(failure) {
      return formatModFailure(this.$t, failure)
    }
  }
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
.mod-title-row,
.mod-actions,
.result-heading,
.mod-meta span {
  display: flex;
  align-items: center;
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

.search-form {
  display: grid;
  grid-template-columns:
    minmax(260px, 2fr) repeat(4, minmax(130px, 1fr))
    minmax(170px, auto);
  align-items: end;
  gap: 12px;
}

.mod-actions {
  min-width: 0;
  gap: 8px;
}

.search-action-buttons {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.mod-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 430px), 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.mod-card {
  min-width: 0;
  overflow: hidden;
}

.mod-card-header {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 14px;
}

.mod-image {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--muted);
  color: var(--muted-foreground);
}

.mod-image {
  width: 92px;
  aspect-ratio: 1;
  flex: none;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.mod-image > svg {
  width: 28px;
  height: 28px;
}

.mod-image img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mod-title-row {
  justify-content: space-between;
  gap: 8px;
}

.mod-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--muted-foreground);
  font-size: 12px;
}

.mod-description {
  display: -webkit-box;
  overflow: hidden;
  min-height: 42px;
  margin: 0;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--muted-foreground);
  line-height: 1.6;
}

.mod-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.mod-download-state {
  display: flex;
  min-height: 22px;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.mod-meta span {
  gap: 5px;
}

.mod-meta svg {
  width: 14px;
  height: 14px;
}

.mod-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
  margin-top: auto;
}

.result-heading {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  color: var(--muted-foreground);
  font-size: 13px;
}

.result-heading p {
  margin: 0;
}

.skeleton-title {
  width: 70%;
  height: 18px;
}

.skeleton-meta {
  width: 45%;
  height: 12px;
}

.skeleton-description {
  width: 100%;
  height: 54px;
}

.skeleton-button {
  width: 84px;
  height: 30px;
}

@media (max-width: 1100px) {
  .search-form {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .search-keyword {
    grid-column: span 2;
  }
}

@media (max-width: 760px) {
  .page-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .search-form {
    grid-template-columns: 1fr;
  }

  .search-keyword {
    grid-column: auto;
  }

  .mod-actions > * {
    flex: 1;
  }
}
</style>
