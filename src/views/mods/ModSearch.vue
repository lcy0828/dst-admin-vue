<template>
  <div class="page-container">
    <header v-if="!embedded" class="page-heading">
      <div>
        <h1>{{ $t('mods.search.title') }}</h1>
        <p>{{ $t('mods.search.subtitle') }}</p>
      </div>
      <UiButton variant="outline" size="sm" @click="goToLibrary"><ArrowLeft data-icon="inline-start" />{{ $t('mods.actions.backToLibrary') }}</UiButton>
    </header>

    <Card class="search-panel">
      <CardHeader
        ><div>
          <CardTitle>{{ $t('mods.search.form.title') }}</CardTitle
          ><CardDescription>{{ $t('mods.search.form.description') }}</CardDescription>
        </div></CardHeader
      >
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
            <UiSelect v-model="searchForm.sort" @update:model-value="filtersChanged">
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
            <div class="mod-image"><ImageIcon /><img v-if="mod.image || defaultImage" :src="mod.image || defaultImage" :alt="mod.name" loading="lazy" @error="handleImageError" /></div>
            <div class="min-w-0 flex-1">
              <div class="mod-title-row">
                <CardTitle class="truncate" :title="mod.name">{{ mod.name }}</CardTitle
                ><Badge v-if="mod.isDownloaded">{{ $t('mods.values.downloaded') }}</Badge>
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
            <Alert v-if="downloadStates[mod.id]" :variant="downloadStateVariant(downloadStates[mod.id])" class="mod-download-status">
              <Spinner v-if="isDownloadActive(downloadStates[mod.id])" />
              <CircleCheck v-else-if="downloadStates[mod.id].status === 'succeeded'" />
              <TriangleAlert v-else />
              <AlertTitle>{{ downloadStateTitle(downloadStates[mod.id]) }}</AlertTitle>
              <AlertDescription>{{ downloadStateDescription(downloadStates[mod.id]) }}</AlertDescription>
              <UiProgress v-if="isDownloadActive(downloadStates[mod.id])" :model-value="downloadStates[mod.id].progress" class="col-span-full mt-2" />
            </Alert>
          </CardContent>
          <CardFooter class="mod-actions">
            <UiButton size="sm" :variant="mod.isDownloaded ? 'outline' : 'default'" :disabled="isModActionBusy(mod)" @click="handlePrimaryAction(mod)">
              <Spinner v-if="isModActionBusy(mod)" data-icon="inline-start" />
              <RefreshCw v-else-if="mod.isDownloaded && !mod.updateAvailable" data-icon="inline-start" />
              <CircleArrowUp v-else-if="mod.updateAvailable" data-icon="inline-start" />
              <Download v-else data-icon="inline-start" />
              {{ $t(primaryActionLabel(mod)) }}
            </UiButton>
            <UiButton v-if="mod.isDownloaded" size="sm" @click="openAddDialog(mod)"><PackagePlus data-icon="inline-start" />{{ $t('mods.actions.addToRoom') }}</UiButton>
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

    <ModDetailsDialog v-model:open="detailsDialogVisible" :mod="currentModInfo" :loading="detailsLoading" :busy="isModActionBusy(currentModInfo)" @download="handleDownloadMod" @refresh="refreshModStatus" @add-to-room="openAddDialog" />

    <AddModToRoomDialog v-model:open="addDialogOpen" :mod="addTarget" />
  </div>
</template>

<script>
import { ArrowLeft, CircleArrowUp, CircleCheck, Clock, Download, ImageIcon, Info, PackagePlus, RefreshCw, Search, SearchX, Star, TriangleAlert, Users } from '@lucide/vue'
import { toast } from 'vue-sonner'
import AddModToRoomDialog from './AddModToRoomDialog.vue'
import ModDetailsDialog from './ModDetailsDialog.vue'
import { modApi } from '@/api'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Progress as UiProgress } from '@/components/ui/progress'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { createModFailure, formatModDate, formatModFailure } from '@/i18n/modMessages'

export default {
  name: 'ModSearch',
  props: {
    embedded: { type: Boolean, default: false }
  },
  components: {
    AddModToRoomDialog,
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
    CircleArrowUp,
    CircleCheck,
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
    RefreshCw,
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
    UiProgress,
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
      searching: false,
      loadFailure: null,
      searchRequestId: 0,
      hasSearched: false,
      searchResults: [],
      totalResults: 0,
      currentPage: 1,
      defaultImage: '',
      downloadingMods: {}, // 跟踪正在下载的模组
      refreshingMods: {},
      downloadStates: {},
      libraryMods: [],
      loadingLibrary: false,
      detailsDialogVisible: false, // 详情对话框可见性
      currentModInfo: null, // 当前查看的模组
      detailsLoading: false,
      detailsRequestId: 0,
      addDialogOpen: false,
      addTarget: null
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
    await this.getLibraryMods()
    const keyword = this.$route.query.keyword
    if (typeof keyword === 'string' && keyword.trim()) {
      this.searchForm.keyword = keyword
      this.searchForm.sort = 'relevance'
    }
    await this.searchMods()
  },
  methods: {
    handleImageError(event) {
      event.currentTarget.hidden = true
    },
    async getLibraryMods() {
      this.loadingLibrary = true
      this.loadFailure = null
      try {
        const response = await modApi.getLibrary()
        this.libraryMods = response.items || []
      } catch (error) {
        this.libraryMods = []
        this.loadFailure = this.failure('mods.errors.library', error)
        toast.error(this.loadError)
      } finally {
        this.loadingLibrary = false
      }
    },

    findLibraryMod(modId) {
      return this.libraryMods.find(mod => String(mod.modid || mod.id) === String(modId))
    },

    startSearch() {
      if (!this.searchForm.keyword.trim() && this.searchForm.sort === 'relevance') {
        this.searchForm.sort = 'trend'
      }
      this.currentPage = 1
      this.searchMods()
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
        this.searchResults = (data.items || []).map(mod => {
          const localMod = this.findLibraryMod(mod.id)
          return {
            ...mod,
            isDownloaded: Boolean(localMod?.downloaded),
            updateAvailable: Boolean(localMod?.updateAvailable)
          }
        })
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
    isModActionBusy(mod) {
      return Boolean(mod?.id && (this.downloadingMods[mod.id] || this.refreshingMods[mod.id]))
    },

    primaryActionLabel(mod) {
      if (this.downloadingMods[mod?.id]) return 'mods.actions.downloading'
      if (this.refreshingMods[mod?.id]) return 'mods.actions.refreshing'
      if (mod?.updateAvailable) return 'mods.actions.update'
      return mod?.isDownloaded ? 'mods.actions.refresh' : 'mods.actions.download'
    },

    handlePrimaryAction(mod) {
      if (mod?.isDownloaded && !mod.updateAvailable) {
        this.refreshModStatus(mod)
        return
      }
      this.handleDownloadMod(mod)
    },

    handleDownloadMod(mod) {
      if (mod && (!mod.isDownloaded || mod.updateAvailable)) this.downloadMod(mod)
    },

    async refreshModStatus(mod) {
      if (!mod?.id || this.isModActionBusy(mod)) return
      this.refreshingMods[mod.id] = true
      try {
        const response = await modApi.getLibrary()
        this.libraryMods = response.items || []
        const localMod = this.findLibraryMod(mod.id)
        const localState = {
          downloaded: Boolean(localMod?.downloaded),
          isDownloaded: Boolean(localMod?.downloaded),
          updateAvailable: Boolean(localMod?.updateAvailable)
        }
        Object.assign(mod, localState)
        const details = await modApi.getModDetails({ ...mod, ...localState })
        Object.assign(mod, details, localState)
        toast.success(this.$t('mods.search.feedback.refreshed'))
      } catch (error) {
        toast.error(this.localizedFailure(this.failure('mods.errors.refresh', error)))
      } finally {
        this.refreshingMods[mod.id] = false
      }
    },

    // 实际执行下载的方法
    async downloadMod(mod) {
      if (!mod || this.downloadingMods[mod.id] || (mod.isDownloaded && !mod.updateAvailable)) return
      const id = mod.id
      const wasDownloaded = Boolean(mod.isDownloaded)

      // 显示下载中消息
      const loadingMessage = toast.loading(this.$t('mods.search.feedback.downloading'))

      this.downloadingMods[id] = true
      this.downloadStates[id] = { status: 'queued', progress: 0, detail: '' }

      try {
        await modApi.downloadMod({
          id,
          downloaded: wasDownloaded,
          includeDependencies: true,
          onProgress: job => {
            this.downloadStates[id] = {
              status: job.status || 'running',
              progress: Number.isFinite(Number(job.progress)) ? Number(job.progress) : 0,
              detail: ''
            }
          }
        })
        mod.isDownloaded = true
        mod.updateAvailable = false
        await this.getLibraryMods()
        this.downloadStates[id] = {
          status: 'succeeded',
          progress: 100,
          detail: ''
        }
        toast.success(this.$t(wasDownloaded ? 'mods.search.feedback.updated' : 'mods.search.feedback.downloaded'))
      } catch (error) {
        const detail = this.localizedFailure(this.failure(wasDownloaded ? 'mods.errors.update' : 'mods.errors.download', error))
        this.downloadStates[id] = { status: 'failed', progress: 100, detail }
        toast.error(detail)
      } finally {
        toast.dismiss(loadingMessage)
        this.downloadingMods[id] = false
      }
    },

    resetSearch() {
      this.searchForm.keyword = ''
      this.searchForm.sort = 'trend'
      this.searchForm.category = 'all'
      this.searchForm.days = '7'
      this.searchForm.pageSize = '20'
      this.currentPage = 1
      this.loadFailure = null
      this.searchMods()
    },

    retryLoad() {
      if (!this.libraryMods.length) return this.getLibraryMods()
      if (this.hasSearched) return this.searchMods()
      return this.getLibraryMods()
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
    },

    isDownloadActive(state) {
      return state?.status === 'queued' || state?.status === 'running'
    },

    downloadStateVariant(state) {
      return state?.status === 'failed' ? 'destructive' : 'default'
    },

    downloadStateTitle(state) {
      const status = ['queued', 'running', 'succeeded', 'failed'].includes(state?.status) ? state.status : 'failed'
      return this.$t(`mods.search.downloadStatus.${status}Title`)
    },

    downloadStateDescription(state) {
      if (state?.status === 'failed' && state.detail) return state.detail
      const status = ['queued', 'running', 'succeeded', 'failed'].includes(state?.status) ? state.status : 'failed'
      return this.$t(`mods.search.downloadStatus.${status}Description`)
    },

    // 处理下拉菜单命令
    handleCommand(command) {
      switch (command.type) {
        case 'details':
          this.showModDetails(command.mod)
          break
      }
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

.mod-download-status {
  margin-top: 6px;
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
