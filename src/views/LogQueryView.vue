<template>
  <div class="log-query-container">
    <header class="page-heading">
      <div>
        <h1>日志查询</h1>
        <p>解析并检索真实的饥荒服务器日志快照。</p>
      </div>
      <UiButton :disabled="refreshLoading || sourceLoading || !queryParams.archive" @click="refreshLogs">
        <Spinner v-if="refreshLoading" data-icon="inline-start" />
        <RefreshCwIcon v-else data-icon="inline-start" />
        {{ refreshLoading ? '正在解析' : '解析最新日志' }}
      </UiButton>
    </header>

    <Card>
      <CardHeader>
        <div><CardTitle>查询条件</CardTitle><CardDescription>按房间、世界、类型或正文内容筛选解析结果。</CardDescription></div>
      </CardHeader>
      <CardContent>
        <FieldGroup class="filter-grid">
          <Field><FieldLabel for="log-archive-filter">存档</FieldLabel><UiSelect v-model="queryParams.archive" :disabled="sourceLoading || worldsLoading" @update:model-value="handleArchiveChange"><SelectTrigger id="log-archive-filter"><SelectValue :placeholder="sourceLoading ? '正在加载存档' : '选择存档'" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="item in archives" :key="item.id" :value="item.id">{{ item.name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
          <Field><FieldLabel for="log-world-filter">世界</FieldLabel><UiSelect v-model="queryParams.world" :disabled="sourceLoading || worldsLoading || !queryParams.archive"><SelectTrigger id="log-world-filter"><SelectValue :placeholder="worldsLoading ? '正在加载世界' : '选择世界'" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="world in worlds" :key="world.id" :value="world.id">{{ world.name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
          <Field><FieldLabel for="log-type-filter">日志类型</FieldLabel><UiSelect v-model="queryTypeModel"><SelectTrigger id="log-type-filter"><SelectValue placeholder="选择日志类型" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="type in logTypes" :key="type.type || '__all__'" :value="type.type || '__all__'">{{ type.name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
          <Field class="query-field"><FieldLabel for="log-query-input">正文检索</FieldLabel><InputGroup><InputGroupInput id="log-query-input" v-model="queryParams.query" maxlength="256" placeholder="日志正文或原始内容" @keyup.enter="queryLogs(true)" /><InputGroupAddon><SearchIcon /></InputGroupAddon></InputGroup></Field>
          <div class="filter-actions"><UiButton :disabled="loading || sourceLoading || worldsLoading || !queryParams.archive || !queryParams.world" @click="queryLogs(true)"><SearchIcon data-icon="inline-start" />查询</UiButton><UiButton variant="outline" :disabled="loading || sourceLoading || worldsLoading" @click="resetQuery"><RotateCcwIcon data-icon="inline-start" />重置</UiButton><UiButton variant="destructive" :disabled="loading || sourceLoading || worldsLoading || !queryParams.archive || !queryParams.world" @click="showCleanupLogDialog"><Trash2Icon data-icon="inline-start" />清空日志</UiButton></div>
        </FieldGroup>
      </CardContent>
    </Card>

    <Alert v-if="refreshStatus" :variant="refreshStatus.variant">
      <CircleCheckIcon v-if="refreshStatus.variant !== 'destructive'" />
      <TriangleAlertIcon v-else />
      <AlertTitle>{{ refreshStatus.title }}</AlertTitle>
      <AlertDescription>{{ refreshStatus.description }}</AlertDescription>
    </Alert>

    <Alert v-if="sourceError" variant="destructive">
      <TriangleAlertIcon />
      <AlertTitle>日志来源加载失败</AlertTitle>
      <AlertDescription>{{ sourceError }}</AlertDescription>
      <AlertAction><UiButton variant="outline" size="sm" :disabled="sourceLoading || worldsLoading" @click="retrySources">重试</UiButton></AlertAction>
    </Alert>

    <Alert v-if="queryError" variant="destructive">
      <TriangleAlertIcon />
      <AlertTitle>日志查询失败</AlertTitle>
      <AlertDescription>{{ queryError }}</AlertDescription>
      <AlertAction><UiButton variant="outline" size="sm" :disabled="loading" @click="queryLogs()">重试</UiButton></AlertAction>
    </Alert>

    <Card class="result-card">
      <CardHeader>
        <div><CardTitle>查询结果</CardTitle><CardDescription>共 {{ total }} 条日志<span v-if="lastRefreshedAt">，解析于 {{ formatDate(lastRefreshedAt) }}</span></CardDescription></div>
        <CardAction v-if="lastRefreshedAt"><Badge variant="outline">快照已就绪</Badge></CardAction>
      </CardHeader>
      <div v-if="lastRefreshedAt" class="count-strip" aria-label="日志类型统计">
        <Badge v-for="type in populatedLogTypes" :key="type.type" variant="outline">{{ type.name }} {{ type.count }}</Badge>
      </div>
      <CardContent>
        <div v-if="loading" class="loading-state"><Spinner /><span>正在查询日志</span></div>
        <div v-else-if="logData.length" class="table-wrap">
          <ShadcnTable><TableHeader><TableRow><TableHead>时间</TableHead><TableHead>类型</TableHead><TableHead>内容</TableHead><TableHead>世界</TableHead><TableHead class="action-column">操作</TableHead></TableRow></TableHeader><TableBody>
            <TableRow v-for="log in logData" :key="log.id || `${log.timestamp}-${log.world_name}-${log.content}`"><TableCell>{{ formatDate(log.timestamp) }}</TableCell><TableCell><Badge :variant="getLogTypeTag(log.log_type)">{{ log.log_type }}</Badge></TableCell><TableCell><div class="log-content">{{ log.content }}</div></TableCell><TableCell>{{ log.world_name }}</TableCell><TableCell class="action-column"><UiButton variant="ghost" size="sm" @click="createRuleFromLog(log)">创建规则</UiButton></TableCell></TableRow>
          </TableBody></ShadcnTable>
        </div>
        <Empty v-else-if="!queryError"><EmptyHeader><EmptyMedia variant="icon"><ScrollTextIcon /></EmptyMedia><EmptyTitle>{{ lastRefreshedAt ? '没有匹配的日志' : '尚未解析日志' }}</EmptyTitle><EmptyDescription>{{ lastRefreshedAt ? '调整筛选条件后重新查询。' : '先解析当前存档的最新服务器日志，再进行检索。' }}</EmptyDescription></EmptyHeader><EmptyContent v-if="!lastRefreshedAt"><UiButton :disabled="refreshLoading || !queryParams.archive" @click="refreshLogs"><RefreshCwIcon data-icon="inline-start" />解析最新日志</UiButton></EmptyContent></Empty>
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

    <UiDialog :open="ruleDialogVisible" @update:open="handleRuleDialogOpenChange"><DialogContent class="rule-dialog sm:max-w-4xl"><DialogHeader><DialogTitle>基于日志创建解析规则</DialogTitle><DialogDescription>完善规则信息并验证匹配表达式。</DialogDescription></DialogHeader>
      <div v-if="selectedLog" class="rule-dialog-content">
        <FieldSet><FieldLegend>规则基本信息</FieldLegend><FieldGroup><Field :data-invalid="Boolean(ruleFormErrors.name)"><FieldLabel for="log-rule-name">规则名称</FieldLabel><UiInput id="log-rule-name" v-model="ruleForm.name" :aria-invalid="Boolean(ruleFormErrors.name)" /><FieldError v-if="ruleFormErrors.name">{{ ruleFormErrors.name }}</FieldError></Field><Field :data-invalid="Boolean(ruleFormErrors.description)"><FieldLabel for="log-rule-description">描述</FieldLabel><UiTextarea id="log-rule-description" v-model="ruleForm.description" rows="2" :aria-invalid="Boolean(ruleFormErrors.description)" /><FieldError v-if="ruleFormErrors.description">{{ ruleFormErrors.description }}</FieldError></Field><Field :data-invalid="Boolean(ruleFormErrors.log_type)"><FieldLabel for="log-rule-type">日志类型</FieldLabel><UiInput id="log-rule-type" v-model="ruleForm.log_type" :aria-invalid="Boolean(ruleFormErrors.log_type)" /><FieldError v-if="ruleFormErrors.log_type">{{ ruleFormErrors.log_type }}</FieldError></Field></FieldGroup></FieldSet>
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
      <DialogFooter><UiButton variant="outline" :disabled="ruleSaving" @click="cancelRule">取消</UiButton><UiButton :disabled="ruleSaving" @click="saveRule"><Spinner v-if="ruleSaving" data-icon="inline-start" />保存规则</UiButton></DialogFooter></DialogContent></UiDialog>

    <UiDialog v-model:open="cleanupDialogVisible"><DialogContent><DialogHeader><DialogTitle>清空日志</DialogTitle><DialogDescription>清理已解析记录并重置解析位置。</DialogDescription></DialogHeader>
      <div class="cleanup-dialog-content">
        <Alert variant="destructive"><TriangleAlertIcon /><AlertTitle>确认清空解析日志</AlertTitle><AlertDescription>原始服务器日志不会删除，可重新解析恢复。</AlertDescription></Alert>
        <FieldGroup><Field data-disabled><FieldLabel for="cleanup-archive">存档</FieldLabel><UiInput id="cleanup-archive" v-model="cleanupForm.archive_name" disabled /></Field><Field data-disabled><FieldLabel for="cleanup-world">世界</FieldLabel><UiInput id="cleanup-world" v-model="cleanupForm.world_name" disabled /></Field></FieldGroup>
      </div>
      <DialogFooter><UiButton variant="outline" @click="cleanupDialogVisible = false">取消</UiButton><UiButton variant="destructive" :disabled="cleanupLoading" @click="cleanupLog"><Spinner v-if="cleanupLoading" data-icon="inline-start" />确认清空</UiButton></DialogFooter></DialogContent></UiDialog>
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
import { normalizeLogSources } from '@/lib/logQuerySupport.mjs'
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
        { type: '', name: '全部' },
        { type: 'system', name: '系统' },
        { type: 'chat', name: '聊天' },
        { type: 'player', name: '玩家' },
        { type: 'entity', name: '实体' },
        { type: 'world', name: '世界' },
        { type: 'error', name: '错误' },
        { type: 'warning', name: '警告' },
        { type: 'unknown', name: '未知' }
      ],
      // 日志数据
      logData: [],
      // 总条数
      total: 0,
      // 加载状态
      loading: false,
      queryError: '',
      counts: {},
      lastRefreshedAt: null,
      refreshLoading: false,
      refreshStatus: null,
      sourceLoading: false,
      worldsLoading: false,
      sourceError: '',
      sourceRequestSequence: 0,
      queryRequestSequence: 0,
      refreshRequestSequence: 0,

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
        .map(item => ({ ...item, count: Number(this.counts[item.type]) }))
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
      this.lastRefreshedAt = null;
      this.refreshLoading = false;
      this.refreshStatus = null;
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
          throw new Error(response?.msg || '存档列表响应格式异常');
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
        this.sourceError = error.message || '获取存档列表失败';
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
        throw new Error(response?.msg || '日志类型响应格式异常');
      }
      const existing = new Set(this.logTypes.map(item => item.type));
      for (const type of response.data) {
        if (!existing.has(type)) this.logTypes.push({ type, name: type });
      }
    },

    // 存档变更处理
    handleArchiveChange(value) {
      this.queryParams.page = 1;
      this.getWorlds(value);
    },

    async refreshLogs() {
      if (!this.queryParams.archive || this.refreshLoading) return
      const requestSequence = ++this.refreshRequestSequence
      const archiveName = this.selectedArchive?.name || '当前存档'
      this.refreshLoading = true
      this.refreshStatus = null
      try {
        const response = await logApi.refresh(this.queryParams.archive)
        if (requestSequence !== this.refreshRequestSequence) return
        if (response?.status !== 200 || !response.data) {
          throw new Error(response?.msg || '日志刷新任务响应格式异常')
        }
        const targets = Array.isArray(response.data.targets) ? response.data.targets : []
        const details = targets
          .filter(target => target.message)
          .map(target => `${target.name || target.targetId}：${target.message}`)
          .join('；')
        this.refreshStatus = {
          variant: 'default',
          title: `${archiveName} 的日志已解析`,
          description: details || '所有世界的结构化日志快照已更新。'
        }
        toast.success(`${archiveName} 的日志解析完成`)
        await this.queryLogs(true)
      } catch (error) {
        if (requestSequence !== this.refreshRequestSequence) return
        this.refreshStatus = {
          variant: 'destructive',
          title: '日志解析失败',
          description: error.message || '无法解析服务器日志'
        }
        toast.error(`日志解析失败：${error.message || '未知错误'}`)
      } finally {
        if (requestSequence === this.refreshRequestSequence) this.refreshLoading = false
      }
    },

    // 查询日志
    async queryLogs(resetPage = false) {
      const requestSequence = ++this.queryRequestSequence;
      if (resetPage) this.queryParams.page = 1;
      this.loading = true;
      this.queryError = '';
      try {
        await this.getLogTypes();
        const response = await logApi.getLogsData(this.queryParams);
        if (requestSequence !== this.queryRequestSequence) return;
        if (response?.status !== 200 || !Array.isArray(response.data?.logs)) {
          throw new Error(response?.msg || '日志查询响应格式异常');
        }
        this.logData = response.data.logs;
        this.total = Number(response.data.total) || 0;
        this.counts = response.data.counts || {};
        this.lastRefreshedAt = response.data.last_refreshed_at || null;
      } catch (error) {
        if (requestSequence !== this.queryRequestSequence) return;
        this.queryError = error.message || '未知错误';
        toast.error('查询日志失败: ' + this.queryError);
        this.logData = [];
        this.total = 0;
        this.counts = {};
        this.lastRefreshedAt = null;
      } finally {
        if (requestSequence === this.queryRequestSequence) this.loading = false;
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
        default:
          return 'secondary';
      }
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
        toast.error('日志内容为空，无法创建规则');
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
        name: `自动生成的规则 - ${log.log_type || '未知类型'}`,
        description: `基于日志内容自动生成的解析规则`,
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
      this.ruleFormErrors.name = validateLength(this.ruleForm.name, 1, 80, '请输入规则名称', '规则名称不能超过80个字符')
      this.ruleFormErrors.description = String(this.ruleForm.description || '').trim().length > 300 ? '规则描述不能超过300个字符' : ''
      this.ruleFormErrors.log_type = /^[A-Za-z0-9_.-]{1,48}$/.test(this.ruleForm.log_type.trim()) ? '' : '日志类型应为1-48个字母、数字、点、横线或下划线'
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
            toast.error('请先设置匹配模式');
            return;
          }

          // 如果是首尾行模式，需要尾行模式
          if (this.ruleForm.match_mode === 'head_tail' && !this.ruleForm.tail_pattern) {
            toast.error('首尾行匹配模式需要提供尾行匹配模式');
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
          toast.success('添加解析规则成功');

          // 关闭对话框
          this.ruleDialogVisible = false;
          // 清空选中的日志
          this.selectedLog = null;
          this.initialPattern = '';
        } catch (error) {
          toast.error('解析规则操作失败: ' + (error.message || '未知错误'));
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
      const hasChanges = this.ruleForm.name !== `自动生成的规则 - ${this.selectedLog?.log_type || '未知类型'}` ||
                        this.ruleForm.description !== `基于日志内容自动生成的解析规则` ||
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
          await confirmAction('关闭将丢失未保存的内容，是否确认关闭？', '放弃更改', {
            confirmButtonText: '确认关闭',
            cancelButtonText: '继续编辑',
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
        toast.warning('请先选择存档');
        return;
      }

      if (!this.queryParams.world) {
        toast.warning('请先选择世界');
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
        await confirmAction('此操作将清空所选存档和世界的解析日志记录，并重置解析位置。原始服务器日志不会删除，可重新解析恢复。是否确认继续？', '清空日志', {
          confirmButtonText: '确认清空',
          cancelButtonText: '取消',
          type: 'warning'
        });
      } catch (e) {
        return; // 用户取消操作
      }

      this.cleanupLoading = true;
      try {
        const response = await logApi.cleanupLog(this.cleanupForm);

        if (response && response.status === 200) {
          toast.success(response.msg || '成功清空日志记录');
          // 关闭对话框
          this.cleanupDialogVisible = false;
          // 重新查询日志，刷新列表
          await this.queryLogs();
        } else {
          toast.error(response?.msg || '清空日志失败');
        }
      } catch (error) {
        toast.error('清空日志失败: ' + (error.message || '未知错误'));
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
