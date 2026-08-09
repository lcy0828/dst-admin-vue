<template>
  <div class="log-query-container">
    <header class="page-heading">
      <div>
        <h1>{{ $t('logs.title') }}</h1>
        <p>{{ $t('logs.query.subtitle') }}</p>
      </div>
      <UiButton :disabled="refreshLoading || sourceLoading || !queryParams.archive" @click="refreshLogs">
        <Spinner v-if="refreshLoading" data-icon="inline-start" />
        <RefreshCwIcon v-else data-icon="inline-start" />
        {{ refreshLoading ? $t('logs.query.parsing') : $t('logs.query.parseLatest') }}
      </UiButton>
    </header>

    <Card>
      <CardHeader>
        <div><CardTitle>{{ $t('logs.query.filters') }}</CardTitle><CardDescription>{{ $t('logs.query.filtersDescription') }}</CardDescription></div>
      </CardHeader>
      <CardContent>
        <FieldGroup class="filter-grid">
          <Field><FieldLabel for="log-archive-filter">{{ $t('logs.query.archive') }}</FieldLabel><UiSelect v-model="queryParams.archive" :disabled="sourceLoading || worldsLoading" @update:model-value="handleArchiveChange"><SelectTrigger id="log-archive-filter"><SelectValue :placeholder="sourceLoading ? $t('logs.query.loadingArchive') : $t('logs.query.selectArchive')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="item in archives" :key="item.id" :value="item.id">{{ item.name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
          <Field><FieldLabel for="log-world-filter">{{ $t('logs.query.world') }}</FieldLabel><UiSelect v-model="queryParams.world" :disabled="sourceLoading || worldsLoading || !queryParams.archive" @update:model-value="handleWorldChange"><SelectTrigger id="log-world-filter"><SelectValue :placeholder="worldsLoading ? $t('logs.query.loadingWorld') : $t('logs.query.selectWorld')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="world in worlds" :key="world.id" :value="world.id">{{ world.name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
          <Field><FieldLabel for="log-type-filter">{{ $t('logs.type') }}</FieldLabel><UiSelect v-model="queryTypeModel"><SelectTrigger id="log-type-filter"><SelectValue :placeholder="$t('logs.query.selectType')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="type in localizedLogTypes" :key="type.type || '__all__'" :value="type.type || '__all__'">{{ type.name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
          <Field class="query-field"><FieldLabel for="log-query-input">{{ $t('logs.query.contentSearch') }}</FieldLabel><InputGroup><InputGroupInput id="log-query-input" v-model="queryParams.query" maxlength="256" :placeholder="$t('logs.query.contentPlaceholder')" @keyup.enter="queryLogs(true)" /><InputGroupAddon><SearchIcon /></InputGroupAddon></InputGroup></Field>
          <div class="filter-actions"><UiButton :disabled="loading || sourceLoading || worldsLoading || !queryParams.archive || !queryParams.world" @click="queryLogs(true)"><SearchIcon data-icon="inline-start" />{{ $t('common.actions.search') }}</UiButton><UiButton variant="outline" :disabled="loading || sourceLoading || worldsLoading" @click="resetQuery"><RotateCcwIcon data-icon="inline-start" />{{ $t('common.actions.reset') }}</UiButton><UiButton variant="destructive" :disabled="loading || sourceLoading || worldsLoading || !queryParams.archive || !queryParams.world" @click="showCleanupLogDialog"><Trash2Icon data-icon="inline-start" />{{ $t('logs.query.clearLogs') }}</UiButton></div>
        </FieldGroup>
      </CardContent>
    </Card>

    <Alert v-if="refreshStatus" :variant="refreshStatus.variant">
      <CircleCheckIcon v-if="refreshStatus.variant !== 'destructive' && !refreshStatus.partial" />
      <TriangleAlertIcon v-else />
      <AlertTitle>{{ refreshStatus.title }}</AlertTitle>
      <AlertDescription>{{ refreshStatus.description }}</AlertDescription>
    </Alert>

    <Alert v-if="sourceError" variant="destructive">
      <TriangleAlertIcon />
      <AlertTitle>{{ $t('logs.query.sourceFailed') }}</AlertTitle>
      <AlertDescription>{{ sourceError }}</AlertDescription>
      <AlertAction><UiButton variant="outline" size="sm" :disabled="sourceLoading || worldsLoading" @click="retrySources">{{ $t('common.actions.retry') }}</UiButton></AlertAction>
    </Alert>

    <Alert v-if="queryError" variant="destructive">
      <TriangleAlertIcon />
      <AlertTitle>{{ $t('logs.query.queryFailed') }}</AlertTitle>
      <AlertDescription>{{ queryError }}</AlertDescription>
      <AlertAction><UiButton variant="outline" size="sm" :disabled="loading" @click="queryLogs()">{{ $t('common.actions.retry') }}</UiButton></AlertAction>
    </Alert>

    <Alert v-if="typeMetadataError">
      <TriangleAlertIcon />
      <AlertTitle>{{ $t('logs.query.typeMetadataIncomplete') }}</AlertTitle>
      <AlertDescription>{{ $t('logs.query.typeMetadataDescription', { error: typeMetadataError }) }}</AlertDescription>
    </Alert>

    <Card class="result-card">
      <CardHeader>
        <div><CardTitle>{{ $t('logs.query.results') }}</CardTitle><CardDescription>{{ $t('logs.query.resultCount', { count: total }) }}<span v-if="lastRefreshedAt">{{ $t('logs.query.parsedAt', { time: formatDate(lastRefreshedAt) }) }}</span><span v-else-if="snapshotState === 'cleared' && snapshotUpdatedAt">{{ $t('logs.query.clearedAt', { time: formatDate(snapshotUpdatedAt) }) }}</span></CardDescription></div>
        <CardAction v-if="snapshotState !== 'uninitialized'"><Badge variant="outline">{{ snapshotState === 'cleared' ? $t('logs.query.cleared') : $t('logs.query.ready') }}</Badge></CardAction>
      </CardHeader>
      <div v-if="lastRefreshedAt" class="count-strip" :aria-label="$t('logs.query.typeStatistics')">
        <Badge v-for="type in populatedLogTypes" :key="type.type" variant="outline">{{ type.name }} {{ type.count }}</Badge>
      </div>
      <CardContent>
        <div v-if="loading" class="loading-state"><Spinner /><span>{{ $t('logs.query.querying') }}</span></div>
        <div v-else-if="logData.length" class="table-wrap">
          <ShadcnTable><TableHeader><TableRow><TableHead>{{ $t('logs.query.columns.time') }}</TableHead><TableHead>{{ $t('logs.query.columns.type') }}</TableHead><TableHead>{{ $t('logs.query.columns.content') }}</TableHead><TableHead>{{ $t('logs.query.columns.world') }}</TableHead><TableHead class="action-column">{{ $t('logs.query.columns.actions') }}</TableHead></TableRow></TableHeader><TableBody>
            <TableRow v-for="log in logData" :key="log.id || `${log.timestamp}-${log.world_name}-${log.content}`"><TableCell>{{ formatDate(log.timestamp) }}</TableCell><TableCell><Badge :variant="getLogTypeTag(log.log_type)" :title="log.log_type">{{ getLogTypeText(log.log_type) }}</Badge></TableCell><TableCell><div class="log-content">{{ log.content }}</div></TableCell><TableCell>{{ log.world_name }}</TableCell><TableCell class="action-column"><UiButton variant="ghost" size="sm" @click="createRuleFromLog(log)">{{ $t('logs.query.createRule') }}</UiButton></TableCell></TableRow>
          </TableBody></ShadcnTable>
        </div>
        <Empty v-else-if="!queryError"><EmptyHeader><EmptyMedia variant="icon"><ScrollTextIcon /></EmptyMedia><EmptyTitle>{{ emptyStateTitle }}</EmptyTitle><EmptyDescription>{{ emptyStateDescription }}</EmptyDescription></EmptyHeader><EmptyContent v-if="snapshotState !== 'ready'"><UiButton :disabled="refreshLoading || !queryParams.archive" @click="refreshLogs"><RefreshCwIcon data-icon="inline-start" />{{ snapshotState === 'cleared' ? $t('logs.query.parseAgain') : $t('logs.query.parseLatest') }}</UiButton></EmptyContent></Empty>
      </CardContent>
      <CardFooter v-if="!loading && total > 0" class="pagination-container">
        <AppPagination
          :page="queryParams.page"
          :limit="queryParams.page_size"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          @update:page="handleCurrentChange"
          @update:limit="handleSizeChange"
        />
      </CardFooter>
    </Card>

    <UiDialog :open="ruleDialogVisible" @update:open="handleRuleDialogOpenChange"><DialogContent class="rule-dialog sm:max-w-4xl"><DialogHeader><DialogTitle>{{ $t('logs.query.ruleDialog.title') }}</DialogTitle><DialogDescription>{{ $t('logs.query.ruleDialog.description') }}</DialogDescription></DialogHeader>
      <div v-if="selectedLog" class="rule-dialog-content">
        <FieldSet><FieldLegend>{{ $t('logs.query.ruleDialog.basic') }}</FieldLegend><FieldGroup><Field :data-invalid="Boolean(ruleFormErrors.name)"><FieldLabel for="log-rule-name">{{ $t('logs.query.ruleDialog.name') }}</FieldLabel><UiInput id="log-rule-name" v-model="ruleForm.name" :aria-invalid="Boolean(ruleFormErrors.name)" /><FieldError v-if="ruleFormErrors.name">{{ ruleFormErrors.name }}</FieldError></Field><Field :data-invalid="Boolean(ruleFormErrors.description)"><FieldLabel for="log-rule-description">{{ $t('logs.query.ruleDialog.descriptionField') }}</FieldLabel><UiTextarea id="log-rule-description" v-model="ruleForm.description" rows="2" :aria-invalid="Boolean(ruleFormErrors.description)" /><FieldError v-if="ruleFormErrors.description">{{ ruleFormErrors.description }}</FieldError></Field><Field :data-invalid="Boolean(ruleFormErrors.log_type)"><FieldLabel for="log-rule-type">{{ $t('logs.query.ruleDialog.type') }}</FieldLabel><UiInput id="log-rule-type" v-model="ruleForm.log_type" :aria-invalid="Boolean(ruleFormErrors.log_type)" /><FieldError v-if="ruleFormErrors.log_type">{{ ruleFormErrors.log_type }}</FieldError></Field></FieldGroup></FieldSet>
        <Separator />
        <regex-tester
          :initial-content="selectedLog.raw_content || selectedLog.content"
          :initial-pattern="initialPattern"
          :initial-is-regex="true"
          :initial-match-mode="'single'"
          @apply="applyRegexToRule"
          ref="regexTester"
        />
      </div>
      <DialogFooter><UiButton variant="outline" :disabled="ruleSaving" @click="cancelRule">{{ $t('common.actions.cancel') }}</UiButton><UiButton :disabled="ruleSaving" @click="saveRule"><Spinner v-if="ruleSaving" data-icon="inline-start" />{{ $t('logs.query.ruleDialog.save') }}</UiButton></DialogFooter></DialogContent></UiDialog>

    <UiDialog v-model:open="cleanupDialogVisible"><DialogContent><DialogHeader><DialogTitle>{{ $t('logs.query.cleanup.title') }}</DialogTitle><DialogDescription>{{ $t('logs.query.cleanup.description') }}</DialogDescription></DialogHeader>
      <div class="cleanup-dialog-content">
        <Alert variant="destructive"><TriangleAlertIcon /><AlertTitle>{{ $t('logs.query.cleanup.warningTitle') }}</AlertTitle><AlertDescription>{{ $t('logs.query.cleanup.warningDescription') }}</AlertDescription></Alert>
        <FieldGroup><Field data-disabled><FieldLabel for="cleanup-archive">{{ $t('logs.query.archive') }}</FieldLabel><UiInput id="cleanup-archive" v-model="cleanupForm.archive_name" disabled /></Field><Field data-disabled><FieldLabel for="cleanup-world">{{ $t('logs.query.world') }}</FieldLabel><UiInput id="cleanup-world" v-model="cleanupForm.world_name" disabled /></Field></FieldGroup>
      </div>
      <DialogFooter><UiButton variant="outline" @click="cleanupDialogVisible = false">{{ $t('common.actions.cancel') }}</UiButton><UiButton variant="destructive" :disabled="cleanupLoading" @click="cleanupLog"><Spinner v-if="cleanupLoading" data-icon="inline-start" />{{ $t('logs.query.cleanup.confirm') }}</UiButton></DialogFooter></DialogContent></UiDialog>
  </div>
</template>

<script>
import { CircleCheckIcon, RefreshCwIcon, RotateCcwIcon, ScrollTextIcon, SearchIcon, Trash2Icon, TriangleAlertIcon } from '@lucide/vue'
import { logApi, ruleManagementApi } from '@/api';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input as UiInput } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Table as ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea as UiTextarea } from '@/components/ui/textarea'
import AppPagination from '@/components/Pagination.vue'
import RegexTester from '@/components/RegexTester.vue';
import { confirmAction } from '@/lib/feedback'
import { logTypeLabel } from '@/i18n/logTypes'
import { normalizeLogSources, shouldBootstrapStructuredLogs, structuredLogSnapshotKey } from '@/lib/logQuerySupport.mjs'
import { RUNTIME_TARGET_CHANGED_EVENT } from '@/utils/runtimeTarget'
import { toast } from 'vue-sonner'

export default {
  name: 'LogQueryView',
  components: {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
    AppPagination,
    Badge,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    CircleCheckIcon,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    RegexTester,
    RefreshCwIcon,
    RotateCcwIcon,
    ScrollTextIcon,
    SearchIcon,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Separator,
    ShadcnTable,
    Spinner,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Trash2Icon,
    TriangleAlertIcon,
    UiButton,
    UiDialog,
    UiInput,
    UiSelect,
    UiTextarea
  },
  data() {
    return {
      // 查询参数
      queryParams: {
        archive: '',
        world: '',
        type: '',
        query: '',
        page: 1,
        page_size: 20
      },
      // 存档列表
      archives: [],
      // 世界列表
      worlds: [],
      // 日志类型
      logTypes: [
        { type: '' },
        { type: 'system' },
        { type: 'chat' },
        { type: 'player' },
        { type: 'entity' },
        { type: 'world' },
        { type: 'error' },
        { type: 'warning' },
        { type: 'startup' },
        { type: 'worldgen' },
        { type: 'diagnostic' },
        { type: 'unknown' }
      ],
      // 日志数据
      logData: [],
      // 总条数
      total: 0,
      // 加载状态
      loading: false,
      queryError: '',
      typeMetadataError: '',
      counts: {},
      snapshotState: 'uninitialized',
      snapshotUpdatedAt: null,
      lastRefreshedAt: null,
      refreshLoading: false,
      refreshStatus: null,
      sourceLoading: false,
      worldsLoading: false,
      sourceError: '',
      sourceRequestSequence: 0,
      queryRequestSequence: 0,
      refreshRequestSequence: 0,
      bootstrapAttemptedKeys: [],

      // 规则对话框相关
      ruleDialogVisible: false,
      ruleSaving: false,
      selectedLog: null,
      initialPattern: '',

      // 规则表单
      ruleForm: {
        name: '',
        description: '',
        log_type: '',
        pattern: '',
        is_regex: true,
        is_enabled: true,
        priority: 50,
        match_mode: 'single',
        tail_pattern: ''
      },

      ruleFormErrors: { name: '', description: '', log_type: '' },

      // 清空日志相关
      cleanupDialogVisible: false,
      cleanupLoading: false,
      cleanupForm: {
        room_id: '',
        world_id: '',
        archive_name: '',
        world_name: ''
      }
    };
  },
  computed: {
    selectedArchive() {
      return this.archives.find(archive => archive.id === this.queryParams.archive) || null
    },
    selectedWorld() {
      return this.worlds.find(world => world.id === this.queryParams.world) || null
    },
    populatedLogTypes() {
      return this.logTypes
        .filter(item => item.type && Number(this.counts[item.type]) > 0)
        .map(item => ({ ...item, name: this.getLogTypeText(item.type), count: Number(this.counts[item.type]) }))
    },
    localizedLogTypes() {
      return this.logTypes.map(item => ({
        ...item,
        name: item.type ? this.getLogTypeText(item.type) : this.$t('logs.allTypes')
      }))
    },
    emptyStateTitle() {
      if (this.snapshotState === 'cleared') return this.$t('logs.query.empty.clearedTitle')
      return this.snapshotState === 'ready'
        ? this.$t('logs.query.empty.noMatchTitle')
        : this.$t('logs.query.empty.uninitializedTitle')
    },
    emptyStateDescription() {
      if (this.snapshotState === 'cleared') return this.$t('logs.query.empty.clearedDescription')
      return this.snapshotState === 'ready'
        ? this.$t('logs.query.empty.noMatchDescription')
        : this.$t('logs.query.empty.uninitializedDescription')
    },
    queryTypeModel: {
      get() {
        return this.queryParams.type || '__all__'
      },
      set(value) {
        this.queryParams.type = value === '__all__' ? '' : value
      }
    }
  },
  mounted() {
    window.addEventListener(RUNTIME_TARGET_CHANGED_EVENT, this.handleRuntimeTargetChange);
    this.getArchives();
  },
  beforeUnmount() {
    this.sourceRequestSequence += 1
    this.queryRequestSequence += 1
    this.refreshRequestSequence += 1
    window.removeEventListener(RUNTIME_TARGET_CHANGED_EVENT, this.handleRuntimeTargetChange);
  },
  methods: {
    handleRuntimeTargetChange() {
      this.sourceRequestSequence += 1;
      this.queryRequestSequence += 1;
      this.refreshRequestSequence += 1;
      this.archives = [];
      this.worlds = [];
      this.logData = [];
      this.total = 0;
      this.counts = {};
      this.snapshotState = 'uninitialized';
      this.snapshotUpdatedAt = null;
      this.lastRefreshedAt = null;
      this.typeMetadataError = '';
      this.refreshLoading = false;
      this.refreshStatus = null;
      this.bootstrapAttemptedKeys = [];
      this.queryParams.archive = '';
      this.queryParams.world = '';
      this.getArchives();
    },
    // 获取存档列表
    async getArchives() {
      const requestSequence = ++this.sourceRequestSequence;
      this.sourceLoading = true;
      this.sourceError = '';
      try {
        const response = await logApi.getArchivesWithLogs();
        if (requestSequence !== this.sourceRequestSequence) return;
        if (response?.status !== 200 || !Array.isArray(response.data)) {
          throw new Error(response?.msg || this.$t('logs.query.feedback.archiveResponseInvalid'));
        }
        this.archives = normalizeLogSources(response.data);
        const requestedArchive = this.$route.query.archive;
        const matchedArchive = this.archives.find(item => item.id === requestedArchive || item.name === requestedArchive)
        this.queryParams.archive = matchedArchive
          ? matchedArchive.id
          : (this.archives[0]?.id || '');
        await this.getWorlds(this.queryParams.archive);
      } catch (error) {
        if (requestSequence !== this.sourceRequestSequence) return;
        this.archives = [];
        this.worlds = [];
        this.queryParams.archive = '';
        this.queryParams.world = '';
        this.sourceError = error.message || this.$t('logs.query.feedback.archiveLoadFailed');
        toast.error(this.sourceError);
      } finally {
        if (requestSequence === this.sourceRequestSequence) this.sourceLoading = false;
      }
    },

    // 根据存档获取世界列表
    async getWorlds(archiveName) {
      if (!archiveName) {
        this.worlds = [];
        this.queryParams.world = '';
        return;
      }

      this.worldsLoading = true;
      this.sourceError = '';
      const selectedArchive = this.archives.find(archive => archive.id === archiveName || archive.name === archiveName);
      this.worlds = this.sortWorlds(selectedArchive?.worlds || []);
      const requestedWorld = this.$route.query.world;
      const matchedWorld = this.worlds.find(item => item.id === requestedWorld || item.name === requestedWorld)
      this.queryParams.world = matchedWorld ? matchedWorld.id : (this.worlds[0]?.id || '');
      this.worldsLoading = false;
      if (this.queryParams.world) await this.queryLogs();
    },

    retrySources() {
      if (this.queryParams.archive) {
        this.getWorlds(this.queryParams.archive);
        return;
      }
      this.getArchives();
    },

    // 获取日志类型统计
    async getLogTypes() {
      const response = await logApi.getLogTypes(this.queryParams);
      if (response?.status !== 200 || !Array.isArray(response.data)) {
        throw new Error(response?.msg || this.$t('logs.query.feedback.typeResponseInvalid'));
      }
      return response.data;
    },

    mergeLogTypes(types) {
      const existing = new Set(this.logTypes.map(item => item.type));
      for (const type of types) {
        if (!existing.has(type)) this.logTypes.push({ type });
      }
    },

    // 存档变更处理
    handleArchiveChange(value) {
      this.queryParams.page = 1;
      this.getWorlds(value);
    },

    handleWorldChange(value) {
      if (!value) return;
      this.queryParams.world = value;
      this.queryParams.page = 1;
      this.queryLogs();
    },

    async refreshLogs(options = {}) {
      if (!this.queryParams.archive || this.refreshLoading) return
      const bootstrapKey = typeof options?.bootstrapKey === 'string' ? options.bootstrapKey : ''
      const bootstrapWorldId = this.queryParams.world
      const requestSequence = ++this.refreshRequestSequence
      const archiveName = this.selectedArchive?.name || this.$t('logs.query.feedback.currentArchive')
      this.refreshLoading = true
      this.refreshStatus = null
      try {
        const response = await logApi.refresh(this.queryParams.archive)
        if (requestSequence !== this.refreshRequestSequence) return
        if (response?.status !== 200 || !response.data) {
          throw new Error(response?.msg || this.$t('logs.query.feedback.refreshResponseInvalid'))
        }
        const targets = Array.isArray(response.data.targets) ? response.data.targets : []
        const succeeded = targets.filter(target => target.status === 'succeeded')
        const failed = targets.filter(target => target.status === 'failed' || target.status === 'canceled')
        const successDetails = succeeded
          .filter(target => target.message)
          .map(target => `${target.name || target.targetId}：${target.message}`)
        const failureDetails = failed.map(target =>
          `${target.name || target.targetId}: ${target.error?.message || this.$t('logs.query.feedback.parseFailed')}`
        )
        const partial = response.data.outcome === 'partial' || failed.length > 0
        this.refreshStatus = {
          variant: 'default',
          partial,
          title: this.$t(partial ? 'logs.query.feedback.partialTitle' : 'logs.query.feedback.completeTitle', { archive: archiveName }),
          description: [...successDetails, ...failureDetails].join('; ') || this.$t('logs.query.feedback.snapshotUpdated')
        }
        if (partial) toast.warning(this.$t('logs.query.feedback.partialToast', { archive: archiveName }))
        else toast.success(this.$t('logs.query.feedback.completeToast', { archive: archiveName }))
        await this.queryLogs(true)
        if (partial && bootstrapKey && !succeeded.some(target => target.targetId === bootstrapWorldId)) {
          this.bootstrapAttemptedKeys = this.bootstrapAttemptedKeys.filter(key => key !== bootstrapKey)
        }
        return true
      } catch (error) {
        if (requestSequence !== this.refreshRequestSequence) return
        if (bootstrapKey) {
          this.bootstrapAttemptedKeys = this.bootstrapAttemptedKeys.filter(key => key !== bootstrapKey)
        }
        this.refreshStatus = {
          variant: 'destructive',
          title: this.$t('logs.query.feedback.parseFailedTitle'),
          description: error.message || this.$t('logs.query.feedback.cannotParse')
        }
        toast.error(this.$t('logs.query.feedback.parseFailedToast', {
          error: error.message || this.$t('common.errors.unknown')
        }))
        return false
      } finally {
        if (requestSequence === this.refreshRequestSequence) this.refreshLoading = false
      }
    },

    // 查询日志
    async queryLogs(resetPage = false) {
      const requestSequence = ++this.queryRequestSequence;
      let bootstrapSnapshot = false;
      if (resetPage) this.queryParams.page = 1;
      this.loading = true;
      this.queryError = '';
      try {
        const [typesResult, logsResult] = await Promise.allSettled([
          this.getLogTypes(),
          logApi.getLogsData(this.queryParams)
        ]);
        if (requestSequence !== this.queryRequestSequence) return;
        if (typesResult.status === 'fulfilled') {
          this.mergeLogTypes(typesResult.value);
          this.typeMetadataError = '';
        } else {
          this.typeMetadataError = typesResult.reason?.message || this.$t('common.errors.unknown');
        }
        if (logsResult.status === 'rejected') throw logsResult.reason;
        const response = logsResult.value;
        if (response?.status !== 200 || !Array.isArray(response.data?.logs)) {
          throw new Error(response?.msg || this.$t('logs.query.feedback.queryResponseInvalid'));
        }
        this.logData = response.data.logs;
        this.total = Number(response.data.total) || 0;
        this.counts = response.data.counts || {};
        this.snapshotState = response.data.snapshot_state || 'uninitialized';
        this.snapshotUpdatedAt = response.data.snapshot_updated_at || null;
        this.lastRefreshedAt = response.data.last_refreshed_at || null;
        bootstrapSnapshot = shouldBootstrapStructuredLogs({
          roomId: this.queryParams.archive,
          worldId: this.queryParams.world,
          snapshotState: this.snapshotState,
          lastRefreshedAt: this.lastRefreshedAt,
          attemptedKeys: this.bootstrapAttemptedKeys
        });
      } catch (error) {
        if (requestSequence !== this.queryRequestSequence) return;
        this.queryError = error.message || this.$t('common.errors.unknown');
        toast.error(this.$t('logs.query.feedback.queryFailedToast', { error: this.queryError }));
        this.logData = [];
        this.total = 0;
        this.counts = {};
        this.snapshotState = 'uninitialized';
        this.snapshotUpdatedAt = null;
        this.lastRefreshedAt = null;
      } finally {
        if (requestSequence === this.queryRequestSequence) this.loading = false;
      }
      if (bootstrapSnapshot && requestSequence === this.queryRequestSequence) {
        const bootstrapKey = structuredLogSnapshotKey(this.queryParams.archive, this.queryParams.world);
        this.bootstrapAttemptedKeys.push(bootstrapKey);
        await this.refreshLogs({ bootstrapKey });
      }
    },

    // 格式化日期
    formatDate(timestamp) {
      if (!timestamp) return '--';
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) return '--';
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    },

    // 重置查询条件
    resetQuery() {
      this.queryParams = {
        archive: this.archives.length > 0 ? this.archives[0].id : '',
        world: this.worlds.length > 0 ? this.worlds[0].id : '',
        type: '',
        query: '',
        page: 1,
        page_size: 20
      };
      this.getWorlds(this.queryParams.archive);
    },

    // 分页大小变更
    handleSizeChange(val) {
      this.queryParams.page_size = val;
      this.queryParams.page = 1;
      this.queryLogs();
    },

    // 页码变更
    handleCurrentChange(val) {
      this.queryParams.page = val;
      this.queryLogs();
    },

    // 获取日志类型对应的标签类型
    getLogTypeTag(type) {
      switch (type) {
        case 'system':
          return 'secondary';
        case 'chat':
          return 'default';
        case 'connection':
          return 'outline';
        case 'player':
          return 'default';
        case 'entity':
          return 'outline';
        case 'world':
          return 'default';
        case 'error':
          return 'destructive';
        case 'warning':
          return 'outline';
        case 'startup':
          return 'secondary';
        case 'worldgen':
          return 'default';
        case 'diagnostic':
          return 'secondary';
        default:
          return 'secondary';
      }
    },

    getLogTypeText(type) {
      return logTypeLabel(type, this.$t)
    },

    // 对世界列表进行排序
    sortWorlds(worlds) {
      if (!worlds || !Array.isArray(worlds)) return [];

      // 先复制一份数组，避免修改原数组
      const sortedWorlds = [...worlds];

      // 自定义排序函数
      return sortedWorlds.sort((a, b) => {
        const nameA = String(a?.name || '');
        const nameB = String(b?.name || '');

        // 检查是否以Forest开头
        const isAForest = nameA.startsWith('Forest');
        const isBForest = nameB.startsWith('Forest');

        // 如果一个是Forest开头而另一个不是，则Forest开头的优先
        if (isAForest && !isBForest) return -1;
        if (!isAForest && isBForest) return 1;

        // 如果两个都是或都不是Forest开头，则提取最后的数字进行比较
        const getLastNumber = (name) => {
          const matches = name.match(/(\d+)(?!.*\d)/);
          return matches ? parseInt(matches[1], 10) : 0;
        };

        const numA = getLastNumber(nameA);
        const numB = getLastNumber(nameB);

        // 按数字升序排序
        return numA - numB;
      });
    },

    // 从日志创建规则
    createRuleFromLog(log) {
      // 确保有日志内容
      if (!log || (!log.raw_content && !log.content)) {
        toast.error(this.$t('logs.query.feedback.emptyContent'));
        return;
      }

      // 优先使用 raw_content，如果没有再使用 content
      const logContent = log.raw_content || log.content;

      this.selectedLog = {
        ...log,
        // 确保内容是最新的
        content: log.content,
        raw_content: log.raw_content
      };

      // 初始化规则表单
      this.ruleForm = {
        name: this.$t('logs.query.ruleDialog.generatedName', {
          type: this.getLogTypeText(log.log_type) || this.$t('logs.unknownType')
        }),
        description: this.$t('logs.query.ruleDialog.generatedDescription'),
        log_type: log.log_type || '',
        pattern: '',
        is_regex: true,
        is_enabled: true,
        priority: 50,
        match_mode: 'single',
        tail_pattern: ''
      };
      this.ruleFormErrors = { name: '', description: '', log_type: '' }

      // 尝试生成初始正则表达式
      this.generateInitialPattern(logContent);

      // 显示对话框
      this.ruleDialogVisible = true;

      // 在对话框显示后更新测试器的内容和正则表达式
      this.$nextTick(() => {
        if (this.$refs.regexTester) {
          // 先更新内容
          this.$refs.regexTester.updateContent(logContent);

          // 然后更新正则表达式
          if (this.initialPattern) {
            this.$refs.regexTester.regexForm.pattern = this.initialPattern;
            // 手动触发测试
            setTimeout(() => {
              this.$refs.regexTester.testRegex();
            }, 100);
          }
        }
      });
    },

    // 生成初始正则表达式
    generateInitialPattern(content) {
      if (!content) {
        this.initialPattern = '';
        return;
      }

      // 尝试生成一个更精确的正则表达式
      // 先检查是否有时间戳格式 [HH:MM:SS]
      const timeStampMatch = content.match(/\[(\d{2}:\d{2}:\d{2})\]/);

      // 分析日志类型并生成相应的正则表达式
      if (content.includes('Available disk space for save files:')) {
        // diskspace 类型的日志
        this.initialPattern = '\\[\\d{2}:\\d{2}:\\d{2}\\]:\\s+Available disk space for save files:';
      } else if (content.includes('Serializing world:')) {
        // snapshot 类型的日志
        this.initialPattern = '\\[\\d{2}:\\d{2}:\\d{2}\\]:\\s+Serializing world:';
      } else if (content.includes('Account Communication Success')) {
        // 账户通信成功的日志
        this.initialPattern = '\\[\\d{2}:\\d{2}:\\d{2}\\]:\\s+\\[200\\] Account Communication Success';
      } else if (content.includes('Received') && content.includes('from')) {
        // 接收信息的日志
        this.initialPattern = '\\[\\d{2}:\\d{2}:\\d{2}\\]:\\s+Received \\(.*?\\) from';
      } else if (timeStampMatch) {
        // 如果有时间戳，使用更通用的模式
        // 先获取时间戳后的内容
        const afterTimestamp = content.substring(timeStampMatch.index + timeStampMatch[0].length).trim();

        // 检查是否有冒号分隔
        if (afterTimestamp.startsWith(':')) {
          // 如果有冒号，提取冒号后的第一个单词
          const colonContent = afterTimestamp.substring(1).trim();
          const firstWord = colonContent.split(/\s+/)[0];

          if (firstWord && firstWord.length > 0) {
            // 将第一个单词转义并添加到模式中
            const escapedWord = firstWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            this.initialPattern = '\\[\\d{2}:\\d{2}:\\d{2}\\]:\\s+' + escapedWord;
          } else {
            // 如果没有单词，使用通用模式
            this.initialPattern = '\\[\\d{2}:\\d{2}:\\d{2}\\]:';
          }
        } else {
          // 如果没有冒号，使用时间戳模式
          this.initialPattern = '\\[\\d{2}:\\d{2}:\\d{2}\\]';
        }
      } else {
        // 如果没有时间戳，尝试使用内容的第一行
        const firstLine = content.split('\n')[0].trim();

        if (firstLine) {
          // 取前30个字符或整行（取较短的）
          const maxLength = Math.min(30, firstLine.length);
          const significantPart = firstLine.substring(0, maxLength);

          // 将特殊字符转义
          const escapedPart = significantPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

          // 如果内容过长，添加通配符
          if (firstLine.length > maxLength) {
            this.initialPattern = escapedPart + '.*';
          } else {
            this.initialPattern = escapedPart;
          }
        } else {
          this.initialPattern = '';
        }
      }

    },

    // 将正则测试器的结果应用到规则
    applyRegexToRule(regexData) {
      this.ruleForm.pattern = regexData.pattern;
      this.ruleForm.is_regex = regexData.isRegex;
      this.ruleForm.match_mode = regexData.matchMode;
      this.ruleForm.tail_pattern = regexData.tailPattern;
    },

    // 保存规则
    validateRuleForm() {
      const validateLength = (value, min, max, emptyMessage, lengthMessage) => {
        const length = String(value || '').trim().length
        if (!length) return emptyMessage
        return length < min || length > max ? lengthMessage : ''
      }
      this.ruleFormErrors.name = validateLength(this.ruleForm.name, 1, 80, this.$t('logs.query.feedback.nameRequired'), this.$t('logs.query.feedback.nameTooLong'))
      this.ruleFormErrors.description = String(this.ruleForm.description || '').trim().length > 300 ? this.$t('logs.query.feedback.descriptionTooLong') : ''
      this.ruleFormErrors.log_type = /^[A-Za-z0-9_.-]{1,48}$/.test(this.ruleForm.log_type.trim()) ? '' : this.$t('logs.query.feedback.typeInvalid')
      return !Object.values(this.ruleFormErrors).some(Boolean)
    },
    async saveRule() {
      if (this.ruleSaving || !this.validateRuleForm()) return
      try {
          // 先获取正则测试器的最新数据
          if (this.$refs.regexTester) {
            // 手动运行一次测试，确保数据是最新的
            this.$refs.regexTester.testRegex();

            // 获取正则测试器的数据
            const regexData = {
              pattern: this.$refs.regexTester.regexForm.pattern,
              isRegex: this.$refs.regexTester.regexForm.isRegex,
              matchMode: this.$refs.regexTester.regexForm.matchMode,
              tailPattern: this.$refs.regexTester.regexForm.tailPattern
            };

            // 应用到规则中
            this.applyRegexToRule(regexData);
          }

          // 确保有模式
          if (!this.ruleForm.pattern) {
            toast.error(this.$t('logs.query.feedback.patternRequired'));
            return;
          }

          // 如果是首尾行模式，需要尾行模式
          if (this.ruleForm.match_mode === 'head_tail' && !this.ruleForm.tail_pattern) {
            toast.error(this.$t('logs.query.feedback.tailPatternRequired'));
            return;
          }

          // 创建一个新的数据对象
          const formData = { ...this.ruleForm };
          formData.archive_name = this.queryParams.archive;
          // 确保优先级是数字类型
          formData.priority = parseInt(formData.priority, 10);

          // 添加解析规则
          this.ruleSaving = true;
          await ruleManagementApi.addRule(this.queryParams.archive, formData);
          toast.success(this.$t('logs.query.feedback.ruleAdded'));

          // 关闭对话框
          this.ruleDialogVisible = false;
          // 清空选中的日志
          this.selectedLog = null;
          this.initialPattern = '';
        } catch (error) {
          toast.error(this.$t('logs.query.feedback.ruleActionFailed', {
            error: error.message || this.$t('common.errors.unknown')
          }));
        } finally {
          this.ruleSaving = false;
      }
    },

    // 取消规则创建
    cancelRule() {
      if (this.ruleSaving) return;
      // 关闭对话框
      this.ruleDialogVisible = false;
      // 清空选中的日志
      this.selectedLog = null;
      this.initialPattern = '';
    },

    // 处理规则对话框关闭
    async handleRuleDialogClose(done) {
      // 检查表单是否有修改
      const generatedName = this.$t('logs.query.ruleDialog.generatedName', {
        type: this.getLogTypeText(this.selectedLog?.log_type) || this.$t('logs.unknownType')
      })
      const hasChanges = this.ruleForm.name !== generatedName ||
                        this.ruleForm.description !== this.$t('logs.query.ruleDialog.generatedDescription') ||
                        this.ruleForm.log_type !== (this.selectedLog?.log_type || '') ||
                        this.ruleForm.pattern !== '' ||
                        this.ruleForm.match_mode !== 'single' ||
                        this.ruleForm.tail_pattern !== '';

      const closeDialog = () => {
        // 在关闭对话框前清空选中的日志
        this.selectedLog = null;
        this.initialPattern = '';
        done();
      };

      if (hasChanges) {
        // 如果有修改，弹出确认对话框
        try {
          await confirmAction(this.$t('logs.query.feedback.discardDescription'), this.$t('logs.query.feedback.discardTitle'), {
            confirmButtonText: this.$t('logs.query.feedback.closeWithoutSaving'),
            cancelButtonText: this.$t('logs.query.feedback.continueEditing'),
            type: 'warning'
          })
          closeDialog()
        } catch {
          // 保持对话框打开。
        }
      } else {
        // 如果没有修改，直接关闭
        closeDialog();
      }
    },
    handleRuleDialogOpenChange(open) {
      if (open) {
        this.ruleDialogVisible = true
        return
      }
      if (this.ruleSaving) return
      this.handleRuleDialogClose(() => { this.ruleDialogVisible = false })
    },

    // 显示清空日志对话框
    showCleanupLogDialog() {
      // 检查是否选择了存档和世界
      if (!this.queryParams.archive) {
        toast.warning(this.$t('logs.query.feedback.selectArchiveFirst'));
        return;
      }

      if (!this.queryParams.world) {
        toast.warning(this.$t('logs.query.feedback.selectWorldFirst'));
        return;
      }

      // 设置清空日志表单的值
      this.cleanupForm.room_id = this.queryParams.archive;
      this.cleanupForm.world_id = this.queryParams.world;
      this.cleanupForm.archive_name = this.selectedArchive?.name || this.queryParams.archive;
      this.cleanupForm.world_name = this.selectedWorld?.name || this.queryParams.world;

      // 显示对话框
      this.cleanupDialogVisible = true;
    },

    // 清空日志
    async cleanupLog() {
      // 再次确认
      try {
        await confirmAction(this.$t('logs.query.feedback.cleanupConfirmation'), this.$t('logs.query.cleanup.title'), {
          confirmButtonText: this.$t('logs.query.cleanup.confirm'),
          cancelButtonText: this.$t('common.actions.cancel'),
          type: 'warning'
        });
      } catch (e) {
        return; // 用户取消操作
      }

      this.cleanupLoading = true;
      try {
        const response = await logApi.cleanupLog(this.cleanupForm);

        if (response && response.status === 200) {
          toast.success(this.$t('logs.query.feedback.cleanupSuccess'));
          // 关闭对话框
          this.cleanupDialogVisible = false;
          // 重新查询日志，刷新列表
          await this.queryLogs();
        } else {
          toast.error(response?.msg || this.$t('logs.query.feedback.cleanupFailed'));
        }
      } catch (error) {
        toast.error(`${this.$t('logs.query.feedback.cleanupFailed')}: ${error.message || this.$t('common.errors.unknown')}`);
      } finally {
        this.cleanupLoading = false;
      }
    }
  }
};
</script>

<style scoped>
.log-query-container {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  gap: 24px;
}

.page-heading h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;
}

.page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-heading p {
  margin: 4px 0 0;
  color: var(--muted-foreground);
  font-size: 14px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr));
  align-items: end;
  gap: 12px;
}

.filter-actions {
  display: grid;
  min-width: 0;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.result-card {
  min-width: 0;
}

.count-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 20px 16px;
}

.loading-state {
  display: flex;
  min-height: 220px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--muted-foreground);
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
}

.table-wrap :deep(table) {
  min-width: 920px;
}

.action-column {
  position: sticky;
  right: 0;
  width: 104px;
  background: var(--card);
  box-shadow: -1px 0 var(--border);
  text-align: right;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
}

.log-content {
  min-width: 360px;
  max-width: 680px;
  max-height: 300px;
  overflow-y: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  line-height: 1.5;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.rule-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.rule-dialog {
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
}

.cleanup-dialog-content {
  padding: 10px 0;
}

@media (max-width: 768px) {
  .page-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .filter-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .pagination-container {
    justify-content: flex-start;
    overflow-x: auto;
  }
}

@media (max-width: 520px) {
  .filter-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-actions > :last-child {
    grid-column: 1 / -1;
  }
}
</style>
