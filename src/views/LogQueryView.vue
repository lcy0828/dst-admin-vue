<template>
  <div class="log-query-container">
    <div class="page-header">
      <h1 class="page-title">日志查询</h1>
    </div>

    <div class="filter-section">
      <FieldGroup class="filter-grid">
        <Field><FieldLabel>存档</FieldLabel><UiSelect v-model="queryParams.archive" @update:model-value="handleArchiveChange"><SelectTrigger><SelectValue placeholder="选择存档" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="item in archives" :key="item.name" :value="item.name">{{ item.name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
        <Field><FieldLabel>世界</FieldLabel><UiSelect v-model="queryParams.world"><SelectTrigger><SelectValue placeholder="选择世界" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="world in worlds" :key="world.name" :value="world.name">{{ world.name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
        <Field><FieldLabel>日志类型</FieldLabel><UiSelect v-model="queryTypeModel"><SelectTrigger><SelectValue placeholder="选择日志类型" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="type in logTypes" :key="type.type || '__all__'" :value="type.type || '__all__'">{{ type.name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
        <div class="filter-actions"><UiButton :disabled="loading" @click="queryLogs"><SearchIcon data-icon="inline-start" />查询</UiButton><UiButton variant="outline" @click="resetQuery"><RotateCcwIcon data-icon="inline-start" />重置</UiButton><UiButton variant="destructive" @click="showCleanupLogDialog"><Trash2Icon data-icon="inline-start" />清空日志</UiButton></div>
      </FieldGroup>
    </div>

    <div class="result-section">
      <ShadcnTable><TableHeader><TableRow><TableHead>时间</TableHead><TableHead>类型</TableHead><TableHead>内容</TableHead><TableHead>世界</TableHead><TableHead>操作</TableHead></TableRow></TableHeader><TableBody>
        <TableRow v-for="log in logData" :key="log.id || `${log.timestamp}-${log.world_name}-${log.content}`"><TableCell>{{ formatDate(log.timestamp) }}</TableCell><TableCell><Badge :variant="getLogTypeTag(log.log_type)">{{ log.log_type }}</Badge></TableCell><TableCell><div class="log-content">{{ log.content }}</div></TableCell><TableCell>{{ log.world_name }}</TableCell><TableCell><UiButton variant="ghost" size="sm" @click="createRuleFromLog(log)">创建规则</UiButton></TableCell></TableRow>
        <TableEmpty v-if="loading" :colspan="5"><Spinner />正在查询日志</TableEmpty><TableEmpty v-else-if="logData.length === 0" :colspan="5"><Empty><EmptyHeader><EmptyTitle>暂无日志</EmptyTitle><EmptyDescription>调整筛选条件后重新查询。</EmptyDescription></EmptyHeader></Empty></TableEmpty>
      </TableBody></ShadcnTable>

      <div class="pagination-container">
        <AppPagination
          :page="queryParams.page"
          :limit="queryParams.page_size"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          @update:page="handleCurrentChange"
          @update:limit="handleSizeChange"
        />
      </div>
    </div>

    <UiDialog :open="ruleDialogVisible" @update:open="handleRuleDialogOpenChange"><DialogContent class="rule-dialog sm:max-w-4xl"><DialogHeader><DialogTitle>基于日志创建解析规则</DialogTitle><DialogDescription>完善规则信息并验证匹配表达式。</DialogDescription></DialogHeader>
      <div v-if="selectedLog" class="rule-dialog-content">
        <section class="rule-form-section"><h3>规则基本信息</h3><FieldGroup><Field :data-invalid="Boolean(ruleFormErrors.name)"><FieldLabel for="log-rule-name">规则名称</FieldLabel><UiInput id="log-rule-name" v-model="ruleForm.name" :aria-invalid="Boolean(ruleFormErrors.name)" /><FieldError v-if="ruleFormErrors.name">{{ ruleFormErrors.name }}</FieldError></Field><Field :data-invalid="Boolean(ruleFormErrors.description)"><FieldLabel for="log-rule-description">描述</FieldLabel><UiTextarea id="log-rule-description" v-model="ruleForm.description" rows="2" :aria-invalid="Boolean(ruleFormErrors.description)" /><FieldError v-if="ruleFormErrors.description">{{ ruleFormErrors.description }}</FieldError></Field><Field :data-invalid="Boolean(ruleFormErrors.log_type)"><FieldLabel for="log-rule-type">日志类型</FieldLabel><UiInput id="log-rule-type" v-model="ruleForm.log_type" :aria-invalid="Boolean(ruleFormErrors.log_type)" /><FieldError v-if="ruleFormErrors.log_type">{{ ruleFormErrors.log_type }}</FieldError></Field></FieldGroup></section>
        <Separator />
        <section class="regex-tester-card"><h3>正则表达式测试</h3>
          <regex-tester
            :initial-content="selectedLog.raw_content || selectedLog.content"
            :initial-pattern="initialPattern"
            :initial-is-regex="true"
            :initial-match-mode="'single'"
            @apply="applyRegexToRule"
            ref="regexTester"
          />
        </section>
      </div>
      <DialogFooter><UiButton variant="outline" @click="cancelRule">取消</UiButton><UiButton @click="saveRule">保存规则</UiButton></DialogFooter></DialogContent></UiDialog>

    <UiDialog v-model:open="cleanupDialogVisible"><DialogContent><DialogHeader><DialogTitle>清空日志</DialogTitle><DialogDescription>清理已解析记录并重置解析位置。</DialogDescription></DialogHeader>
      <div class="cleanup-dialog-content">
        <Alert variant="destructive"><TriangleAlertIcon /><AlertTitle>确认清空解析日志</AlertTitle><AlertDescription>原始服务器日志不会删除，可重新解析恢复。</AlertDescription></Alert>
        <FieldGroup><Field data-disabled><FieldLabel for="cleanup-archive">存档</FieldLabel><UiInput id="cleanup-archive" v-model="cleanupForm.archive_name" disabled /></Field><Field data-disabled><FieldLabel for="cleanup-world">世界</FieldLabel><UiInput id="cleanup-world" v-model="cleanupForm.world_name" disabled /></Field></FieldGroup>
      </div>
      <DialogFooter><UiButton variant="outline" @click="cleanupDialogVisible = false">取消</UiButton><UiButton variant="destructive" :disabled="cleanupLoading" @click="cleanupLog"><Spinner v-if="cleanupLoading" data-icon="inline-start" />确认清空</UiButton></DialogFooter></DialogContent></UiDialog>
  </div>
</template>

<script>
import { RotateCcwIcon, SearchIcon, Trash2Icon, TriangleAlertIcon } from '@lucide/vue'
import { logApi, ruleManagementApi } from '@/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input as UiInput } from '@/components/ui/input'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Table as ShadcnTable, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea as UiTextarea } from '@/components/ui/textarea'
import AppPagination from '@/components/Pagination.vue'
import RegexTester from '@/components/RegexTester.vue';
import { confirmAction } from '@/lib/feedback'
import { toast } from 'vue-sonner'

export default {
  name: 'LogQueryView',
  components: {
    Alert,
    AlertDescription,
    AlertTitle,
    AppPagination,
    Badge,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
    RegexTester,
    RotateCcwIcon,
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
    TableEmpty,
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
        { type: 'connection', name: '连接' },
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

      // 规则对话框相关
      ruleDialogVisible: false,
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
        archive_name: '',
        world_name: ''
      }
    };
  },
  computed: {
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
    this.getArchives();
    this.getLogTypes();
  },
  methods: {
    // 获取存档列表
    async getArchives() {
      try {
        console.log('开始获取有日志的存档列表');
        const response = await logApi.getArchivesWithLogs();
        console.log('获取到存档列表响应:', response);

        // 处理新接口的响应格式
        if (response && response.status === 200 && response.data && Array.isArray(response.data.data)) {
          // 新接口格式
          const archivesData = response.data.data;
          // 将新格式转换为兼容现有代码的格式
          this.archives = archivesData.map(item => ({
            name: item.archive_name,
            worlds: item.worlds.map(worldName => ({ name: worldName }))
          }));

          if (this.archives.length > 0) {
            const requestedArchive = this.$route.query.archive;
            this.queryParams.archive = this.archives.some(item => item.name === requestedArchive)
              ? requestedArchive
              : this.archives[0].name;
            this.getWorlds(this.queryParams.archive);
          }
        } else if (response && response.data && Array.isArray(response.data)) {
          // 直接返回数组的格式
          const archivesData = response.data;
          this.archives = archivesData.map(item => ({
            name: item.archive_name,
            worlds: item.worlds.map(worldName => ({ name: worldName }))
          }));

          if (this.archives.length > 0) {
            this.queryParams.archive = this.archives[0].name;
            this.getWorlds(this.queryParams.archive);
          }
        } else if (response && response.status === 200 && Array.isArray(response.data)) {
          // 兼容旧接口格式
          this.archives = response.data;
          if (this.archives.length > 0) {
            this.queryParams.archive = this.archives[0].name;
            this.getWorlds(this.queryParams.archive);
          }
        } else if (response && response.data && response.data.status === 200 && Array.isArray(response.data.data)) {
          // 兼容旧接口格式
          this.archives = response.data.data;
          if (this.archives.length > 0) {
            this.queryParams.archive = this.archives[0].name;
            this.getWorlds(this.queryParams.archive);
          }
        } else {
          console.error('获取存档列表格式错误:', response);
          toast.warning('获取存档列表格式错误，尝试使用旧接口');
          // 尝试使用旧接口
          const oldResponse = await logApi.getArchiveList();
          if (oldResponse && oldResponse.status === 200 && Array.isArray(oldResponse.data)) {
            this.archives = oldResponse.data;
            if (this.archives.length > 0) {
              this.queryParams.archive = this.archives[0].name;
              this.getWorlds(this.queryParams.archive);
            }
          } else if (oldResponse && oldResponse.data && oldResponse.data.status === 200 && Array.isArray(oldResponse.data.data)) {
            this.archives = oldResponse.data.data;
            if (this.archives.length > 0) {
              this.queryParams.archive = this.archives[0].name;
              this.getWorlds(this.queryParams.archive);
            }
          }
        }
      } catch (error) {
        console.error('获取存档列表失败:', error);
        // 显示详细错误信息
        if (error.response) {
          console.error('错误响应数据:', error.response.data);
          console.error('错误状态码:', error.response.status);
        } else if (error.request) {
          console.error('无响应错误:', error.request);
        } else {
          console.error('请求配置错误:', error.message);
        }
        console.error('完整错误对象:', error);
        toast.error('获取存档列表失败');

        // 尝试使用旧接口
        try {
          console.log('尝试使用旧接口获取存档列表');
          const oldResponse = await logApi.getArchiveList();
          if (oldResponse && oldResponse.status === 200 && Array.isArray(oldResponse.data)) {
            this.archives = oldResponse.data;
            if (this.archives.length > 0) {
              this.queryParams.archive = this.archives[0].name;
              this.getWorlds(this.queryParams.archive);
            }
          } else if (oldResponse && oldResponse.data && oldResponse.data.status === 200 && Array.isArray(oldResponse.data.data)) {
            this.archives = oldResponse.data.data;
            if (this.archives.length > 0) {
              this.queryParams.archive = this.archives[0].name;
              this.getWorlds(this.queryParams.archive);
            }
          }
        } catch (oldError) {
          console.error('旧接口获取存档列表也失败:', oldError);
        }
      }
    },

    // 根据存档获取世界列表
    async getWorlds(archiveName) {
      if (!archiveName) return;

      try {
        console.log('开始获取世界列表，存档名:', archiveName);

        // 直接从archives中查找当前选择的存档
        const selectedArchive = this.archives.find(archive => archive.name === archiveName);
        if (selectedArchive && selectedArchive.worlds && Array.isArray(selectedArchive.worlds)) {
          this.worlds = this.sortWorlds(selectedArchive.worlds);
          console.log('从选中存档中获取并排序世界列表:', this.worlds);

          if (this.worlds.length > 0) {
            const requestedWorld = this.$route.query.world;
            this.queryParams.world = this.worlds.some(item => item.name === requestedWorld)
              ? requestedWorld
              : this.worlds[0].name;
            // 触发一次查询
            this.$nextTick(() => {
              this.queryLogs();
            });
          } else {
            this.queryParams.world = '';
          }
        } else {
          // 如果在存档对象中找不到worlds，则尝试使用新API
          try {
            console.log('使用新API获取世界列表');
            const response = await logApi.getArchivesWithLogs();

            if (response && response.status === 200 && response.data && Array.isArray(response.data.data)) {
              // 新接口格式
              const archive = response.data.data.find(item => item.archive_name === archiveName);
              if (archive && Array.isArray(archive.worlds)) {
                this.worlds = this.sortWorlds(archive.worlds.map(worldName => ({ name: worldName })));
                console.log('使用新API获取并排序世界列表:', this.worlds);

                if (this.worlds.length > 0) {
                  this.queryParams.world = this.worlds[0].name;
                  // 触发一次查询
                  this.$nextTick(() => {
                    this.queryLogs();
                  });
                } else {
                  this.queryParams.world = '';
                }
                return;
              }
            } else if (response && response.data && Array.isArray(response.data)) {
              // 直接返回数组的格式
              const archive = response.data.find(item => item.archive_name === archiveName);
              if (archive && Array.isArray(archive.worlds)) {
                this.worlds = this.sortWorlds(archive.worlds.map(worldName => ({ name: worldName })));
                console.log('使用新API获取并排序世界列表:', this.worlds);

                if (this.worlds.length > 0) {
                  this.queryParams.world = this.worlds[0].name;
                  // 触发一次查询
                  this.$nextTick(() => {
                    this.queryLogs();
                  });
                } else {
                  this.queryParams.world = '';
                }
                return;
              }
            }

            // 如果新API没有找到对应的存档或世界，则尝试旧API
            console.log('新API没有找到对应的存档或世界，尝试旧API');
          } catch (newApiError) {
            console.error('新API获取世界列表失败:', newApiError);
          }

          // 尝试旧API
          console.log('尝试使用旧API获取世界列表');
          const worlds = await logApi.getWorldsByArchive(archiveName);
          this.worlds = this.sortWorlds(worlds || []);
          console.log('通过旧API获取并排序世界列表:', this.worlds);

          if (this.worlds.length > 0) {
            this.queryParams.world = this.worlds[0].name;
            // 触发一次查询
            this.$nextTick(() => {
              this.queryLogs();
            });
          } else {
            this.queryParams.world = '';
          }
        }
      } catch (error) {
        console.error('获取世界列表失败:', error);
        toast.error('获取世界列表失败');
        this.worlds = [];
        this.queryParams.world = '';
      }
    },

    // 获取日志类型统计
    async getLogTypes() {
      try {
        const response = await logApi.getLogTypes(this.queryParams);
        const existing = new Set(this.logTypes.map(item => item.type));
        for (const type of response.data || []) {
          if (!existing.has(type)) this.logTypes.push({ type, name: type });
        }
      } catch (error) {
        console.error('获取日志类型统计失败:', error);
      }
    },

    // 存档变更处理
    handleArchiveChange(value) {
      this.getWorlds(value);
    },

    // 查询日志
    async queryLogs() {
      this.loading = true;
      try {
        await this.getLogTypes();
        console.log('查询参数:', this.queryParams);
        const response = await logApi.getLogsData(this.queryParams);
        console.log('日志查询响应:', response);

        // 递归查找logs数组
        const findLogs = (obj) => {
          if (!obj || typeof obj !== 'object') return null;

          if (obj.logs && Array.isArray(obj.logs)) {
            return {
              logs: obj.logs,
              total: obj.total || 0
            };
          }

          for (const key in obj) {
            const result = findLogs(obj[key]);
            if (result) return result;
          }

          return null;
        };

        const result = findLogs(response);

        if (result) {
          this.logData = result.logs;
          this.total = result.total;
          console.log('成功找到并处理日志数据:', this.logData);
        } else {
          console.error('未找到有效的日志数据:', response);
          this.logData = [];
          this.total = 0;
        }
      } catch (error) {
        console.error('查询日志失败:', error);
        toast.error('查询日志失败: ' + (error.message || '未知错误'));
        this.logData = [];
        this.total = 0;
      } finally {
        this.loading = false;
      }
    },

    // 格式化日期
    formatDate(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    },

    // 重置查询条件
    resetQuery() {
      this.queryParams = {
        archive: this.archives.length > 0 ? this.archives[0].name : '',
        world: this.worlds.length > 0 ? this.worlds[0].name : '',
        type: '',
        page: 1,
        page_size: 20
      };
      this.getWorlds(this.queryParams.archive);
    },

    // 分页大小变更
    handleSizeChange(val) {
      this.queryParams.page_size = val;
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
        const nameA = a.name || '';
        const nameB = b.name || '';

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
      console.log('创建规则使用的日志:', log);

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

      console.log('为日志生成正则表达式:', content);

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

      console.log('生成的正则表达式:', this.initialPattern);
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
      this.ruleFormErrors.name = validateLength(this.ruleForm.name, 2, 50, '请输入规则名称', '规则名称长度应在2-50个字符之间')
      this.ruleFormErrors.description = validateLength(this.ruleForm.description, 2, 200, '请输入规则描述', '规则描述长度应在2-200个字符之间')
      this.ruleFormErrors.log_type = this.ruleForm.log_type.trim() ? '' : '请选择日志类型'
      return !Object.values(this.ruleFormErrors).some(Boolean)
    },
    async saveRule() {
      if (!this.validateRuleForm()) return
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

          console.log('提交的规则数据:', formData);

          // 添加解析规则
          const response = await ruleManagementApi.addRule(formData);
          console.log('添加规则响应:', response);
          toast.success('添加解析规则成功');

          // 关闭对话框
          this.ruleDialogVisible = false;
          // 清空选中的日志
          this.selectedLog = null;
          this.initialPattern = '';
        } catch (error) {
          console.error('解析规则操作失败:', error);
          toast.error('解析规则操作失败: ' + (error.message || '未知错误'));
      }
    },

    // 取消规则创建
    cancelRule() {
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
      this.cleanupForm.archive_name = this.queryParams.archive;
      this.cleanupForm.world_name = this.queryParams.world;

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
        console.log('清空日志响应:', response);

        if (response && response.status === 200) {
          toast.success(response.msg || '成功清空日志记录');
          // 关闭对话框
          this.cleanupDialogVisible = false;
          // 重新查询日志，刷新列表
          this.queryLogs();
        } else {
          toast.error(response?.msg || '清空日志失败');
        }
      } catch (error) {
        console.error('清空日志失败:', error);
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
  width: 100%;
}

.filter-section {
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid var(--border-color);
  background: var(--surface-color);
  border-radius: 4px;
  box-shadow: none;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
  align-items: end;
  gap: 12px;
}

.filter-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.result-section {
  padding: 16px;
  border: 1px solid var(--border-color);
  background: var(--surface-color);
  border-radius: 4px;
  box-shadow: none;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.log-content {
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
  font-family: monospace;
  line-height: 1.5;
}

.rule-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.rule-form-section h3,
.regex-tester-card h3 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
}

.rule-dialog {
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
}

/* 清空日志对话框样式 */
.cleanup-dialog-content {
  padding: 10px 0;
}

.warning-text {
  color: var(--warning-color);
  font-weight: 500;
  margin-bottom: 20px;
  padding: 10px;
  background-color: var(--surface-muted);
  border-radius: 4px;
  border-left: 4px solid var(--warning-color);
}

@media (max-width: 768px) {
  .filter-section,
  .result-section {
    padding: 12px;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .filter-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .filter-actions button {
    width: 100%;
  }

  .filter-actions button:last-child {
    grid-column: 1 / -1;
  }

  .pagination-container {
    justify-content: center;
  }
}
</style>
