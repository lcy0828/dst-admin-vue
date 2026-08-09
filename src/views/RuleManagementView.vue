<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="flex min-w-0 flex-col gap-1"><h1 class="text-2xl font-semibold tracking-normal">规则管理</h1><p class="text-sm text-muted-foreground">配置房间日志的识别方式、优先级与启用状态。</p></header>

    <Alert v-if="loadError" variant="destructive"><CircleAlertIcon /><AlertTitle>{{ loadErrorContext === 'rooms' ? '存档列表加载失败' : '解析规则加载失败' }}</AlertTitle><AlertDescription>{{ loadError }}</AlertDescription><AlertAction><UiButton size="sm" variant="outline" @click="loadErrorContext === 'rooms' ? loadRooms() : getParserRulesList()">重试</UiButton></AlertAction></Alert>

    <Alert v-if="migrationNoticeVisible"><HistoryIcon /><AlertTitle>检测到旧版日志规则</AlertTitle><AlertDescription>当前存档有 {{ migrationPreview.ready }} 条规则可升级，另有 {{ migrationPreview.conflicts + migrationPreview.incompatible }} 条需要检查。迁移前可以逐条预览，不会导入过宽兜底规则。</AlertDescription><AlertAction><UiButton size="sm" variant="outline" :disabled="migrationLoading" @click="openMigrationDialog"><Spinner v-if="migrationLoading" data-icon="inline-start" />查看升级</UiButton></AlertAction></Alert>

    <Card>
      <CardHeader>
        <CardTitle>日志解析规则</CardTitle><CardDescription>为选定房间配置日志识别和解析优先级。</CardDescription>
        <CardAction class="flex flex-wrap items-end justify-end gap-2">
          <Field><FieldLabel for="rule-room" class="sr-only">存档</FieldLabel>
          <UiSelect
            v-model="selectedRoomId"
            :disabled="loading.rooms"
            @update:model-value="getParserRulesList"
          >
            <SelectTrigger id="rule-room" class="room-select"><SelectValue :placeholder="loading.rooms ? '正在加载存档' : '请选择存档'" /></SelectTrigger>
            <SelectContent><SelectGroup><SelectItem v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</SelectItem></SelectGroup></SelectContent>
          </UiSelect></Field>
          <UiButton v-if="migrationPreview && migrationPreview.ready > 0" size="sm" variant="outline" :disabled="migrationLoading || loading.parser" @click="openMigrationDialog"><HistoryIcon data-icon="inline-start" />升级旧规则</UiButton>
          <UiButton size="sm" :disabled="loading.rooms || loading.parser || !selectedRoomId" @click="addParserRule"><PlusIcon data-icon="inline-start" />添加解析规则</UiButton>
        </CardAction>
      </CardHeader>
      <CardContent><ShadcnTable class="min-w-[1120px]"><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>规则名称</TableHead><TableHead>描述</TableHead><TableHead>日志类型</TableHead><TableHead>匹配模式</TableHead><TableHead>模式类型</TableHead><TableHead><UiButton variant="ghost" size="xs" @click="togglePrioritySort">优先级<ArrowUpDownIcon data-icon="inline-end" /></UiButton></TableHead><TableHead>状态</TableHead><TableHead class="actions-column">操作</TableHead></TableRow></TableHeader><TableBody>
        <template v-if="!loading.parser && !loading.rooms"><TableRow v-for="rule in displayedParserRules" :key="rule.id"><TableCell>{{ rule.id }}</TableCell><TableCell>{{ rule.name }}</TableCell><TableCell class="max-w-60 truncate">{{ rule.description }}</TableCell><TableCell><Badge :variant="getLogTypeTag(rule.log_type)">{{ rule.log_type }}</Badge></TableCell><TableCell><div class="pattern-container"><span class="max-w-64 truncate">{{ rule.pattern }}</span><Tooltip><TooltipTrigger as-child><UiButton variant="ghost" size="icon-xs" aria-label="复制匹配模式" @click.stop="copyPattern(rule.pattern)"><CopyIcon /></UiButton></TooltipTrigger><TooltipContent>复制匹配模式</TooltipContent></Tooltip></div></TableCell><TableCell><Badge :variant="getMatchModeTag(rule.match_mode)">{{ getMatchModeText(rule.match_mode) }}</Badge></TableCell><TableCell>{{ rule.priority }}</TableCell><TableCell><UiSwitch v-model="rule.is_enabled" :disabled="togglingRuleIds.includes(rule.id)" :aria-label="`切换规则 ${rule.name}`" @update:model-value="toggleRuleStatus(rule)" /></TableCell><TableCell><div class="row-actions"><UiButton variant="outline" size="sm" :disabled="deletingRuleId === rule.id || togglingRuleIds.includes(rule.id)" @click="editParserRule(rule)">编辑</UiButton><UiButton variant="destructive" size="sm" :disabled="rule.built_in || deletingRuleId === rule.id || togglingRuleIds.includes(rule.id)" :title="rule.built_in ? '内建规则不能删除' : '删除规则'" @click="removeParserRule(rule)"><Spinner v-if="deletingRuleId === rule.id" data-icon="inline-start" />删除</UiButton></div></TableCell></TableRow></template>
        <TableEmpty v-if="loading.parser || loading.rooms" :colspan="9"><div class="flex flex-col gap-2 py-4"><Skeleton v-for="index in 4" :key="index" class="h-8 w-full" /></div></TableEmpty>
        <TableEmpty v-else-if="!loadError && displayedParserRules.length === 0" :colspan="9"><Empty><EmptyHeader><EmptyMedia variant="icon"><ScrollTextIcon /></EmptyMedia><EmptyTitle>{{ selectedRoomId ? '暂无解析规则' : '请选择存档' }}</EmptyTitle><EmptyDescription>{{ selectedRoomId ? '添加第一条日志解析规则，开始识别服务器日志。' : '选择一个存档后查看和管理解析规则。' }}</EmptyDescription></EmptyHeader></Empty></TableEmpty>
      </TableBody></ShadcnTable></CardContent>
      <CardFooter v-if="!loading.parser && !loading.rooms && !loadError" class="text-sm text-muted-foreground">共 {{ displayedParserRules.length }} 条解析规则</CardFooter>
    </Card>

    <UiDialog :open="dialogVisible.parser" @update:open="handleDialogOpenChange"><DialogScrollContent class="sm:max-w-3xl"><DialogHeader><DialogTitle>{{ ruleForm.id ? '编辑解析规则' : '添加解析规则' }}</DialogTitle><DialogDescription>配置日志匹配表达式、模式和执行优先级。</DialogDescription></DialogHeader>
      <FieldGroup>
        <Field :data-invalid="Boolean(formErrors.name)"><FieldLabel for="rule-name">规则名称</FieldLabel><UiInput id="rule-name" v-model="ruleForm.name" :aria-invalid="Boolean(formErrors.name)" /><FieldError v-if="formErrors.name">{{ formErrors.name }}</FieldError></Field>
        <Field :data-invalid="Boolean(formErrors.description)"><FieldLabel for="rule-description">描述</FieldLabel><UiTextarea id="rule-description" v-model="ruleForm.description" :aria-invalid="Boolean(formErrors.description)" /><FieldError v-if="formErrors.description">{{ formErrors.description }}</FieldError></Field>
        <Field :data-invalid="Boolean(formErrors.log_type)"><FieldLabel for="rule-log-type">日志类型</FieldLabel><UiInput id="rule-log-type" v-model="ruleForm.log_type" list="known-log-types" :aria-invalid="Boolean(formErrors.log_type)" placeholder="选择或输入日志类型" @change="handleLogTypeChange(ruleForm.log_type)" /><datalist id="known-log-types"><option v-for="type in uniqueLogTypes" :key="type" :value="type" /></datalist><FieldDescription>可以选择已有类型或输入自定义类型。</FieldDescription><FieldError v-if="formErrors.log_type">{{ formErrors.log_type }}</FieldError></Field>
        <Field :data-invalid="Boolean(formErrors.pattern)"><FieldLabel for="rule-pattern">匹配模式</FieldLabel><UiTextarea id="rule-pattern" v-model="ruleForm.pattern" rows="3" :aria-invalid="Boolean(formErrors.pattern)" /><FieldDescription>使用正则表达式，如: \[\d{2}:\d{2}:\d{2}\]: Player .* joined the game</FieldDescription><FieldError v-if="formErrors.pattern">{{ formErrors.pattern }}</FieldError></Field>
        <Field orientation="horizontal"><div><FieldLabel for="rule-regex">使用正则表达式</FieldLabel><FieldDescription>关闭后按普通字符串匹配。</FieldDescription></div><UiSwitch id="rule-regex" v-model="ruleForm.is_regex" /></Field>
        <Field orientation="horizontal"><div><FieldLabel for="rule-enabled">启用规则</FieldLabel><FieldDescription>关闭后规则将保留但不参与解析。</FieldDescription></div><UiSwitch id="rule-enabled" v-model="ruleForm.is_enabled" /></Field>
        <Field :data-invalid="Boolean(formErrors.match_mode)"><FieldLabel for="rule-match-mode">匹配模式类型</FieldLabel><UiSelect v-model="ruleForm.match_mode" @update:model-value="handleMatchModeChange"><SelectTrigger id="rule-match-mode" :aria-invalid="Boolean(formErrors.match_mode)"><SelectValue placeholder="选择匹配模式类型" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="single">单行匹配</SelectItem><SelectItem value="multi_line">多行匹配</SelectItem><SelectItem value="head_tail">首尾行匹配</SelectItem></SelectGroup></SelectContent></UiSelect><FieldDescription>
            <span v-if="ruleForm.match_mode === 'single'">单行匹配：每行日志单独匹配和处理</span>
            <span v-else-if="ruleForm.match_mode === 'multi_line'">多行匹配：匹配到一条日志后，继续向下匹配相同类型的日志</span>
            <span v-else-if="ruleForm.match_mode === 'head_tail'">首尾行匹配：需要提供首行和尾行的匹配规则</span>
          </FieldDescription><FieldError v-if="formErrors.match_mode">{{ formErrors.match_mode }}</FieldError></Field>
        <Field v-if="ruleForm.match_mode === 'head_tail'" :data-invalid="Boolean(formErrors.tail_pattern)"><FieldLabel for="rule-tail-pattern">尾行匹配模式</FieldLabel><UiTextarea id="rule-tail-pattern" v-model="ruleForm.tail_pattern" rows="3" :aria-invalid="Boolean(formErrors.tail_pattern)" /><FieldDescription>仅当匹配模式为首尾行匹配时有效。</FieldDescription><FieldError v-if="formErrors.tail_pattern">{{ formErrors.tail_pattern }}</FieldError></Field>
        <Field :data-invalid="Boolean(formErrors.priority)"><FieldLabel for="rule-priority">优先级</FieldLabel><UiInput id="rule-priority" v-model="ruleForm.priority" type="number" min="0" max="1000" :aria-invalid="Boolean(formErrors.priority)" /><FieldDescription>0-1000，数值越大优先级越高。</FieldDescription><FieldError v-if="formErrors.priority">{{ formErrors.priority }}</FieldError></Field>
      </FieldGroup>
      <DialogFooter><UiButton variant="outline" :disabled="savingRule" @click="handleCancelClick">取消</UiButton><UiButton :disabled="savingRule" @click="confirmRuleAction"><Spinner v-if="savingRule" data-icon="inline-start" />确认</UiButton></DialogFooter>
    </DialogScrollContent></UiDialog>

    <UiDialog v-model:open="dialogVisible.migration"><DialogScrollContent class="sm:max-w-4xl"><DialogHeader><DialogTitle>升级旧版日志规则</DialogTitle><DialogDescription>将旧版全局规则复制到当前存档。可导入规则会保留匹配模式并提升到细分类优先级，完成后重新解析真实日志。</DialogDescription></DialogHeader>
      <template v-if="migrationPreview">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4"><div class="flex flex-col gap-1"><span class="text-xs text-muted-foreground">可导入</span><span class="text-lg font-semibold">{{ migrationPreview.ready }}</span></div><div class="flex flex-col gap-1"><span class="text-xs text-muted-foreground">已跳过</span><span class="text-lg font-semibold">{{ migrationPreview.skipped }}</span></div><div class="flex flex-col gap-1"><span class="text-xs text-muted-foreground">冲突</span><span class="text-lg font-semibold">{{ migrationPreview.conflicts }}</span></div><div class="flex flex-col gap-1"><span class="text-xs text-muted-foreground">不兼容</span><span class="text-lg font-semibold">{{ migrationPreview.incompatible }}</span></div></div>
        <Alert v-if="migrationPreview.conflicts + migrationPreview.incompatible > 0"><CircleAlertIcon /><AlertTitle>有规则不会自动导入</AlertTitle><AlertDescription>冲突和不兼容项会原样保留在旧表中，可根据下方原因手动调整；本次操作只导入标记为“可导入”的规则。</AlertDescription></Alert>
        <ShadcnTable class="min-w-[760px]"><TableHeader><TableRow><TableHead>旧 ID</TableHead><TableHead>规则</TableHead><TableHead>日志类型</TableHead><TableHead>模式</TableHead><TableHead>优先级</TableHead><TableHead>处理结果</TableHead><TableHead>说明</TableHead></TableRow></TableHeader><TableBody><TableRow v-for="item in migrationPreview.items" :key="item.legacyId"><TableCell>{{ item.legacyId }}</TableCell><TableCell><div class="flex max-w-56 flex-col gap-1"><span class="font-medium">{{ item.name }}</span><span class="truncate text-xs text-muted-foreground" :title="item.pattern">{{ item.pattern }}</span></div></TableCell><TableCell><Badge variant="secondary">{{ item.logType }}</Badge></TableCell><TableCell>{{ getMatchModeText(item.matchMode) }}</TableCell><TableCell>{{ item.priority }}</TableCell><TableCell><Badge :variant="getMigrationStatusVariant(item.status)">{{ getMigrationStatusText(item.status) }}</Badge></TableCell><TableCell class="max-w-64 text-sm text-muted-foreground">{{ item.reason }}</TableCell></TableRow><TableEmpty v-if="migrationPreview.items.length === 0" :colspan="7">没有检测到旧版规则</TableEmpty></TableBody></ShadcnTable>
      </template>
      <div v-else class="flex flex-col gap-2 py-4"><Skeleton v-for="index in 4" :key="index" class="h-8 w-full" /></div>
      <DialogFooter><UiButton variant="outline" :disabled="migrationApplying" @click="dialogVisible.migration = false">取消</UiButton><UiButton :disabled="migrationApplying || !migrationPreview || migrationPreview.ready === 0" @click="migrateLegacyRules"><Spinner v-if="migrationApplying" data-icon="inline-start" />导入 {{ migrationPreview?.ready || 0 }} 条并重新解析</UiButton></DialogFooter>
    </DialogScrollContent></UiDialog>
  </div>
</template>

<script>
import { ArrowUpDownIcon, CircleAlertIcon, CopyIcon, HistoryIcon, PlusIcon, ScrollTextIcon } from '@lucide/vue'
import { logApi, ruleManagementApi } from '@/api';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog as UiDialog, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input as UiInput } from '@/components/ui/input'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch as UiSwitch } from '@/components/ui/switch'
import { Table as ShadcnTable, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea as UiTextarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { confirmAction } from '@/lib/feedback'
import { getActiveRuntimeTarget, RUNTIME_TARGET_CHANGED_EVENT } from '@/utils/runtimeTarget'
import { toast } from 'vue-sonner'

export default {
  name: 'RuleManagementView',
  components: {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
    ArrowUpDownIcon,
    Badge,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    CircleAlertIcon,
    CopyIcon,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogScrollContent,
    DialogTitle,
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    HistoryIcon,
    PlusIcon,
    ScrollTextIcon,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    ShadcnTable,
    Skeleton,
    Spinner,
    TableBody,
    TableCell,
    TableEmpty,
    TableHead,
    TableHeader,
    TableRow,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    UiButton,
    UiDialog,
    UiInput,
    UiSelect,
    UiSwitch,
    UiTextarea
  },
  data() {
    return {
      // 加载状态
      loading: {
        parser: false,
        rooms: false
      },
      loadError: '',
      loadErrorContext: '',
      savingRule: false,
      migrationLoading: false,
      migrationApplying: false,
      migrationPreview: null,
      deletingRuleId: null,
      togglingRuleIds: [],
      // 对话框显示状态
      dialogVisible: {
        parser: false,
        migration: false
      },
      // 解析规则表单数据
      ruleForm: {
        id: '',
        name: '',
        description: '',
        log_type: '',
        pattern: '',
        is_regex: false,
        is_enabled: true,
        priority: 50,
        match_mode: 'single',  // 默认单行匹配模式
        tail_pattern: ''       // 尾行匹配模式
      },
      formErrors: { name: '', description: '', log_type: '', pattern: '', match_mode: '', tail_pattern: '', priority: '' },
      prioritySort: 'none',
      // 解析规则列表
      parserRulesList: [],
      // 唯一的日志类型列表
      uniqueLogTypes: [],
      rooms: [],
      selectedRoomId: '',
      roomRequestSequence: 0,
      ruleRequestSequence: 0
    };
  },
  computed: {
    migrationNoticeVisible() {
      if (!this.migrationPreview?.sourceAvailable) return false
      return this.migrationPreview.ready > 0 || this.migrationPreview.conflicts > 0 || this.migrationPreview.incompatible > 0
    },
    displayedParserRules() {
      if (this.prioritySort === 'none') return this.parserRulesList
      const direction = this.prioritySort === 'asc' ? 1 : -1
      return [...this.parserRulesList].sort((left, right) => (Number(left.priority) - Number(right.priority)) * direction)
    }
  },
  mounted() {
    window.addEventListener(RUNTIME_TARGET_CHANGED_EVENT, this.handleRuntimeTargetChange);
    this.loadRooms();
  },
  beforeUnmount() {
    window.removeEventListener(RUNTIME_TARGET_CHANGED_EVENT, this.handleRuntimeTargetChange);
  },
  methods: {
    handleRuntimeTargetChange() {
      this.roomRequestSequence += 1;
      this.ruleRequestSequence += 1;
      this.rooms = [];
      this.selectedRoomId = '';
      this.parserRulesList = [];
      this.uniqueLogTypes = [];
      this.migrationPreview = null;
      this.dialogVisible.migration = false;
      this.loadRooms();
    },
    async loadRooms() {
      const requestSequence = ++this.roomRequestSequence;
      this.loadError = '';
      this.loadErrorContext = '';
      this.loading.rooms = true;
      try {
        this.rooms = await logApi.getRoomOptions();
        if (requestSequence !== this.roomRequestSequence) return;
        if (this.rooms.length === 1) {
          this.selectedRoomId = this.rooms[0].id;
          await this.getParserRulesList();
        }
      } catch (error) {
        if (requestSequence !== this.roomRequestSequence) return;
        this.rooms = [];
        this.loadError = error.message || '未知错误';
        this.loadErrorContext = 'rooms';
        toast.error('获取存档列表失败: ' + this.loadError);
      } finally {
        if (requestSequence === this.roomRequestSequence) this.loading.rooms = false;
      }
    },

    // 获取解析规则列表
    async getParserRulesList() {
      if (!this.selectedRoomId) {
        this.parserRulesList = [];
        this.uniqueLogTypes = [];
        return;
      }
      const requestSequence = ++this.ruleRequestSequence;
      this.loading.parser = true;
      this.loadError = '';
      this.loadErrorContext = '';
      try {
        const response = await ruleManagementApi.getRulesList(this.selectedRoomId);
        if (requestSequence !== this.ruleRequestSequence) return;
        if (response?.status !== 200 || !Array.isArray(response.data)) {
          throw new Error(response?.msg || '解析规则响应格式异常');
        }
        this.parserRulesList = response.data;

        // 提取唯一的log_type值
        this.extractUniqueLogTypes();
        this.getRuleMigrationPreview(requestSequence);
      } catch (error) {
        if (requestSequence !== this.ruleRequestSequence) return;
        this.loadError = error.message || '获取解析规则列表失败';
        this.loadErrorContext = 'rules';
        toast.error(this.loadError);
        this.parserRulesList = [];
        this.uniqueLogTypes = [];
      } finally {
        if (requestSequence === this.ruleRequestSequence) this.loading.parser = false;
      }
    },

    async getRuleMigrationPreview(ruleRequestSequence = this.ruleRequestSequence) {
      if (!this.selectedRoomId) {
        this.migrationPreview = null
        return
      }
      this.migrationLoading = true
      try {
        const preview = await ruleManagementApi.getMigrationPreview(this.selectedRoomId)
        if (ruleRequestSequence !== this.ruleRequestSequence) return
        this.migrationPreview = preview
      } catch {
        if (ruleRequestSequence === this.ruleRequestSequence) this.migrationPreview = null
      } finally {
        if (ruleRequestSequence === this.ruleRequestSequence) this.migrationLoading = false
      }
    },

    async openMigrationDialog() {
      if (!this.selectedRoomId || this.migrationApplying) return
      await this.getRuleMigrationPreview()
      if (!this.migrationPreview) {
        toast.error('旧版规则迁移预览加载失败')
        return
      }
      this.dialogVisible.migration = true
    },

    async migrateLegacyRules() {
      if (this.migrationApplying || !this.migrationPreview?.ready) return
      const roomId = this.selectedRoomId
      const runtimeTargetId = getActiveRuntimeTarget().id
      const requestSequence = this.ruleRequestSequence
      this.migrationApplying = true
      try {
        const result = await ruleManagementApi.migrateLegacyRules(roomId)
        const imported = Number(result?.imported || 0)
        this.dialogVisible.migration = false
        if (requestSequence !== this.ruleRequestSequence || roomId !== this.selectedRoomId || runtimeTargetId !== getActiveRuntimeTarget().id) {
          toast.warning(`已在原运行目标导入 ${imported} 条规则；运行目标已切换，未自动重新解析`)
          return
        }
        await this.getParserRulesList()
        if (roomId !== this.selectedRoomId || runtimeTargetId !== getActiveRuntimeTarget().id) {
          toast.warning(`已导入 ${imported} 条规则；运行目标已切换，未自动重新解析`)
          return
        }
        if (imported === 0) {
          toast.info('没有需要导入的旧版规则')
          return
        }
        toast.success(`已导入 ${imported} 条规则，正在重新解析日志`)
        try {
          await logApi.refresh(roomId)
          toast.success(`日志重新解析完成，${imported} 条旧版规则已生效`)
        } catch (error) {
          toast.warning(`规则已导入，但日志重新解析失败：${error.message || '未知错误'}`)
        }
      } catch (error) {
        toast.error('旧版规则迁移失败: ' + (error.message || '未知错误'))
      } finally {
        this.migrationApplying = false
      }
    },

    // 从规则列表中提取唯一的log_type值
    extractUniqueLogTypes() {
      // 使用Set来自动去重
      const logTypesSet = new Set();

      // 遍历所有规则，收集log_type值
      this.parserRulesList.forEach(rule => {
        if (rule.log_type) {
          logTypesSet.add(rule.log_type);
        }
      });

      this.uniqueLogTypes = Array.from(logTypesSet);
    },

    // 添加解析规则对话框
    addParserRule() {
      if (!this.selectedRoomId) {
        toast.warning('请先选择存档');
        return;
      }
      this.ruleForm = {
        id: '',
        name: '',
        description: '',
        log_type: '',
        pattern: '',
        is_regex: false,
        is_enabled: true,
        priority: 50,
        match_mode: 'single',
        tail_pattern: ''
      };
      this.resetFormErrors()
      this.dialogVisible.parser = true;
    },

    // 编辑解析规则对话框
    editParserRule(rule) {
      this.ruleForm = {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        log_type: rule.log_type,
        pattern: rule.pattern,
        is_regex: rule.is_regex !== undefined ? rule.is_regex : false,
        is_enabled: rule.is_enabled !== undefined ? rule.is_enabled : true,
        priority: rule.priority || 50,
        match_mode: rule.match_mode || 'single',
        tail_pattern: rule.tail_pattern || ''
      };
      this.resetFormErrors()
      this.dialogVisible.parser = true;
    },

    // 确认解析规则操作
    validateRuleForm() {
      const validateLength = (value, min, max, emptyMessage, lengthMessage) => {
        const length = String(value || '').trim().length
        if (length === 0) return emptyMessage
        return length < min || length > max ? lengthMessage : ''
      }
      this.formErrors.name = validateLength(this.ruleForm.name, 1, 80, '请输入规则名称', '规则名称不能超过80个字符')
      this.formErrors.description = String(this.ruleForm.description || '').trim().length > 300 ? '规则描述不能超过300个字符' : ''
      this.formErrors.log_type = /^[A-Za-z0-9_.-]{1,48}$/.test(this.ruleForm.log_type.trim()) ? '' : '日志类型应为1-48个字母、数字、点、横线或下划线'
      this.formErrors.pattern = validateLength(this.ruleForm.pattern, 1, 512, '请输入匹配模式', '匹配模式不能超过512个字符')
      this.formErrors.match_mode = this.ruleForm.match_mode ? '' : '请选择匹配模式类型'
      this.formErrors.tail_pattern = this.ruleForm.match_mode === 'head_tail' && (!this.ruleForm.tail_pattern.trim() || this.ruleForm.tail_pattern.length > 512) ? '首尾行匹配模式需要提供不超过512个字符的尾行正则' : ''
      const priority = Number(this.ruleForm.priority)
      this.formErrors.priority = Number.isInteger(priority) && priority >= 0 && priority <= 1000 ? '' : '优先级必须是0-1000的整数'
      return !Object.values(this.formErrors).some(Boolean)
    },
    resetFormErrors() {
      Object.keys(this.formErrors).forEach(key => { this.formErrors[key] = '' })
    },
    async confirmRuleAction() {
      if (this.savingRule || !this.validateRuleForm()) return
      this.savingRule = true
      try {
          const formData = { ...this.ruleForm };
          formData.priority = parseInt(formData.priority, 10);

          if (this.ruleForm.id) {
            await ruleManagementApi.updateRule(this.selectedRoomId, this.ruleForm.id, formData);
            toast.success('编辑解析规则成功');
          } else {
            await ruleManagementApi.addRule(this.selectedRoomId, formData);
            toast.success('添加解析规则成功');

            // 如果是新的日志类型，直接添加到唯一日志类型列表中
            if (this.ruleForm.log_type && !this.uniqueLogTypes.includes(this.ruleForm.log_type)) {
              this.uniqueLogTypes.push(this.ruleForm.log_type);
            }
          }
          this.dialogVisible.parser = false;
          await this.getParserRulesList();
        } catch (error) {
          toast.error('解析规则操作失败: ' + (error.message || '未知错误'));
        } finally {
          this.savingRule = false
      }
    },

    // 移除解析规则
    async removeParserRule(row) {
      if (this.deletingRuleId !== null) return
      try {
        await confirmAction('确定要删除该解析规则吗？', '删除规则', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        this.deletingRuleId = row.id
        await ruleManagementApi.deleteRule(this.selectedRoomId, row.id);
        toast.success('删除解析规则成功');
        await this.getParserRulesList();
      } catch (error) {
        if (error === 'cancel' || error === 'close') {
          toast.info('已取消删除')
          return
        }
        toast.error('删除解析规则失败: ' + (error.message || '未知错误'));
      } finally {
        this.deletingRuleId = null
      }
    },

    // 切换解析规则状态
    async toggleRuleStatus(rule) {
      if (this.togglingRuleIds.includes(rule.id)) return
      this.togglingRuleIds.push(rule.id)
      try {
        const updatedRule = { ...rule };
        await ruleManagementApi.updateRule(this.selectedRoomId, rule.id, updatedRule);
        toast.success('规则状态更新成功');
        await this.getParserRulesList();
      } catch (error) {
        rule.is_enabled = !rule.is_enabled; // 恢复原状态
        toast.error('规则状态更新失败: ' + (error.message || '未知错误'));
      } finally {
        this.togglingRuleIds = this.togglingRuleIds.filter(id => id !== rule.id)
      }
    },

    // 获取日志类型标签
    getLogTypeTag(log_type) {
      const logTypeMap = {
        system: 'secondary',
        chat: 'default',
        player: 'outline',
        error: 'destructive',
        warning: 'outline',
        version: 'secondary',
        remoteexcute: 'secondary',
        connection: 'secondary'
      };
      return logTypeMap[log_type] || 'secondary';
    },

    // 获取匹配模式标签类型
    getMatchModeTag(match_mode) {
      const matchModeMap = {
        single: 'secondary',
        multi_line: 'default',
        head_tail: 'outline'
      };
      return matchModeMap[match_mode] || 'secondary';
    },

    // 获取匹配模式显示文本
    getMatchModeText(match_mode) {
      const matchModeTextMap = {
        single: '单行',
        multi_line: '多行',
        head_tail: '首尾行'
      };
      return matchModeTextMap[match_mode] || match_mode;
    },

    getMigrationStatusText(status) {
      return {
        ready: '可导入',
        skipped: '已跳过',
        conflict: '冲突',
        incompatible: '不兼容'
      }[status] || status
    },

    getMigrationStatusVariant(status) {
      return {
        ready: 'default',
        skipped: 'secondary',
        conflict: 'destructive',
        incompatible: 'outline'
      }[status] || 'secondary'
    },

    // 处理匹配模式变更
    handleMatchModeChange(value) {
      // 如果不是首尾行匹配模式，清空尾行匹配模式
      if (value !== 'head_tail') {
        this.ruleForm.tail_pattern = '';
      }

      // 如果是首尾行匹配模式，确保使用正则表达式
      if (value === 'head_tail') {
        this.ruleForm.is_regex = true;
      }
    },

    // 处理日志类型变更
    handleLogTypeChange(value) {
      // 确保值被正确设置
      this.ruleForm.log_type = value;

      // 如果是新的日志类型，添加到列表中
      if (value && !this.uniqueLogTypes.includes(value)) {
        this.uniqueLogTypes.push(value);
      }
    },

    // 复制匹配模式
    copyPattern(pattern) {
      if (!pattern) {
        toast.warning('匹配模式为空，无法复制');
        return;
      }

      if (!navigator.clipboard?.writeText) {
        this.fallbackCopy(pattern);
        return;
      }

      // 使用浏览器的剪贴板 API 复制文本
      navigator.clipboard.writeText(pattern)
        .then(() => {
          toast.success('匹配模式已复制到剪贴板');
        })
        .catch(() => {
          // 备用方案：创建一个临时文本区域并复制
          this.fallbackCopy(pattern);
        });
    },

    // 备用复制方案
    fallbackCopy(text) {
      // 创建一个临时文本区域
      const textArea = document.createElement('textarea');
      textArea.value = text;

      // 将文本区域添加到文档中并选中文本
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        // 尝试使用文档的复制命令
        const successful = document.execCommand('copy');
        if (successful) {
          toast.success('匹配模式已复制到剪贴板');
        } else {
          toast.warning('复制失败，请手动复制');
        }
      } catch {
        toast.error('复制失败，请手动复制');
      }

      // 移除临时文本区域
      document.body.removeChild(textArea);
    },

    // 处理对话框关闭
    async handleDialogClose(done) {
      // 检查表单是否有修改
      const hasChanges = this.ruleForm.name ||
                        this.ruleForm.description ||
                        this.ruleForm.log_type ||
                        this.ruleForm.pattern ||
                        this.ruleForm.priority !== 50 ||
                        this.ruleForm.is_regex !== false ||
                        this.ruleForm.is_enabled !== true ||
                        this.ruleForm.match_mode !== 'single' ||
                        this.ruleForm.tail_pattern;

      if (hasChanges) {
        // 如果有修改，弹出确认对话框
        try {
          await confirmAction('关闭将丢失未保存的内容，是否确认关闭？', '放弃更改', {
            confirmButtonText: '确认关闭',
            cancelButtonText: '继续编辑',
            type: 'warning'
          })
          done()
        } catch {
          // 保持对话框打开。
        }
      } else {
        // 如果没有修改，直接关闭
        done();
      }
    },

    // 处理取消按钮点击
    handleCancelClick() {
      // 使用相同的关闭逻辑
      this.handleDialogClose(() => {
        this.dialogVisible.parser = false;
      });
    },
    handleDialogOpenChange(open) {
      if (open) {
        this.dialogVisible.parser = true
        return
      }
      this.handleCancelClick()
    },
    togglePrioritySort() {
      this.prioritySort = this.prioritySort === 'none' ? 'desc' : (this.prioritySort === 'desc' ? 'asc' : 'none')
    }
  }
};
</script>

<style scoped>
.room-select {
  width: 220px;
}

.pattern-container {
  display: flex;
  align-items: center;
  gap: 4px;
}

.actions-column {
  width: 150px;
  text-align: right;
}

.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

@media (max-width: 640px) {
  .room-select {
    width: 100%;
  }

  .row-actions {
    justify-content: flex-start;
  }
}
</style>
