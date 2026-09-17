<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="flex min-w-0 flex-col gap-1"><h1 class="text-2xl font-semibold tracking-normal">{{ $t('rules.management.title') }}</h1><p class="text-sm text-muted-foreground">{{ $t('rules.management.subtitle') }}</p></header>

    <Alert v-if="loadError" variant="destructive"><CircleAlertIcon /><AlertTitle>{{ loadErrorContext === 'rooms' ? $t('rules.management.roomLoadFailed') : $t('rules.management.ruleLoadFailed') }}</AlertTitle><AlertDescription>{{ loadError }}</AlertDescription><AlertAction><UiButton size="sm" variant="outline" @click="loadErrorContext === 'rooms' ? loadRooms() : getParserRulesList()">{{ $t('common.actions.retry') }}</UiButton></AlertAction></Alert>

    <Alert v-if="migrationNoticeVisible"><HistoryIcon /><AlertTitle>{{ $t('rules.management.legacyDetected') }}</AlertTitle><AlertDescription>{{ $t('rules.management.legacySummary', { ready: migrationPreview.ready, review: migrationPreview.conflicts + migrationPreview.incompatible }) }}</AlertDescription><AlertAction><UiButton size="sm" variant="outline" :disabled="migrationLoading" @click="openMigrationDialog"><Spinner v-if="migrationLoading" data-icon="inline-start" />{{ $t('rules.management.viewUpgrade') }}</UiButton></AlertAction></Alert>

    <Card>
      <CardHeader>
        <CardTitle>{{ $t('rules.management.cardTitle') }}</CardTitle><CardDescription>{{ $t('rules.management.cardDescription') }}</CardDescription>
        <CardAction class="flex flex-wrap items-end justify-end gap-2">
          <Field><FieldLabel for="rule-room" class="sr-only">{{ $t('rules.management.archive') }}</FieldLabel>
          <UiSelect
            v-model="selectedRoomId"
            :disabled="loading.rooms"
            @update:model-value="getParserRulesList"
          >
            <SelectTrigger id="rule-room" class="room-select"><SelectValue :placeholder="loading.rooms ? $t('rules.management.loadingArchive') : $t('rules.management.selectArchive')" /></SelectTrigger>
            <SelectContent><SelectGroup><SelectItem v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</SelectItem></SelectGroup></SelectContent>
          </UiSelect></Field>
          <UiButton v-if="migrationPreview && migrationPreview.ready > 0" size="sm" variant="outline" :disabled="migrationLoading || loading.parser" @click="openMigrationDialog"><HistoryIcon data-icon="inline-start" />{{ $t('rules.management.upgradeLegacy') }}</UiButton>
          <UiButton size="sm" :disabled="loading.rooms || loading.parser || !selectedRoomId" @click="addParserRule"><PlusIcon data-icon="inline-start" />{{ $t('rules.management.addRule') }}</UiButton>
        </CardAction>
      </CardHeader>
      <CardContent><ShadcnTable class="min-w-[1120px]"><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>{{ $t('rules.management.columns.name') }}</TableHead><TableHead>{{ $t('rules.management.columns.description') }}</TableHead><TableHead>{{ $t('rules.management.columns.type') }}</TableHead><TableHead>{{ $t('rules.management.columns.pattern') }}</TableHead><TableHead>{{ $t('rules.management.columns.matchMode') }}</TableHead><TableHead><UiButton variant="ghost" size="xs" @click="togglePrioritySort">{{ $t('rules.management.columns.priority') }}<ArrowUpDownIcon data-icon="inline-end" /></UiButton></TableHead><TableHead>{{ $t('rules.management.columns.status') }}</TableHead><TableHead class="actions-column">{{ $t('rules.management.columns.actions') }}</TableHead></TableRow></TableHeader><TableBody>
        <template v-if="!loading.parser && !loading.rooms"><TableRow v-for="rule in displayedParserRules" :key="rule.id"><TableCell>{{ rule.id }}</TableCell><TableCell>{{ getRuleName(rule) }}</TableCell><TableCell class="max-w-60 truncate">{{ getRuleDescription(rule) }}</TableCell><TableCell><Badge :variant="getLogTypeTag(rule.log_type)" :title="rule.log_type">{{ getLogTypeText(rule.log_type) }}</Badge></TableCell><TableCell><div class="pattern-container"><span class="max-w-64 truncate">{{ rule.pattern }}</span><Tooltip><TooltipTrigger as-child><UiButton variant="ghost" size="icon-xs" :aria-label="$t('rules.management.copyPattern')" @click.stop="copyPattern(rule.pattern)"><CopyIcon /></UiButton></TooltipTrigger><TooltipContent>{{ $t('rules.management.copyPattern') }}</TooltipContent></Tooltip></div></TableCell><TableCell><Badge :variant="getMatchModeTag(rule.match_mode)">{{ getMatchModeText(rule.match_mode) }}</Badge></TableCell><TableCell>{{ rule.priority }}</TableCell><TableCell><UiSwitch v-model="rule.is_enabled" :disabled="togglingRuleIds.includes(rule.id)" :aria-label="$t('rules.management.toggleRule', { name: getRuleName(rule) })" @update:model-value="toggleRuleStatus(rule)" /></TableCell><TableCell><div class="row-actions"><UiButton variant="outline" size="sm" :disabled="deletingRuleId === rule.id || togglingRuleIds.includes(rule.id)" @click="editParserRule(rule)">{{ $t('common.actions.edit') }}</UiButton><UiButton variant="destructive" size="sm" :disabled="rule.built_in || deletingRuleId === rule.id || togglingRuleIds.includes(rule.id)" :title="rule.built_in ? $t('rules.management.builtInCannotDelete') : $t('rules.management.deleteRule')" @click="removeParserRule(rule)"><Spinner v-if="deletingRuleId === rule.id" data-icon="inline-start" />{{ $t('common.actions.delete') }}</UiButton></div></TableCell></TableRow></template>
        <TableEmpty v-if="loading.parser || loading.rooms" :colspan="9"><div class="flex flex-col gap-2 py-4"><Skeleton v-for="index in 4" :key="index" class="h-8 w-full" /></div></TableEmpty>
        <TableEmpty v-else-if="!loadError && displayedParserRules.length === 0" :colspan="9"><Empty><EmptyHeader><EmptyMedia variant="icon"><ScrollTextIcon /></EmptyMedia><EmptyTitle>{{ selectedRoomId ? $t('rules.management.noRules') : $t('rules.management.selectArchiveEmpty') }}</EmptyTitle><EmptyDescription>{{ selectedRoomId ? $t('rules.management.noRulesDescription') : $t('rules.management.selectArchiveDescription') }}</EmptyDescription></EmptyHeader></Empty></TableEmpty>
      </TableBody></ShadcnTable></CardContent>
      <CardFooter v-if="!loading.parser && !loading.rooms && !loadError" class="text-sm text-muted-foreground">{{ $t('rules.management.total', { count: displayedParserRules.length }) }}</CardFooter>
    </Card>

    <UiDialog :open="dialogVisible.parser" @update:open="handleDialogOpenChange"><DialogScrollContent class="sm:max-w-3xl"><DialogHeader><DialogTitle>{{ ruleForm.id ? $t('rules.management.editRule') : $t('rules.management.addRule') }}</DialogTitle><DialogDescription>{{ $t('rules.management.editorDescription') }}</DialogDescription></DialogHeader>
      <FieldGroup>
        <Field :data-invalid="Boolean(formErrors.name)"><FieldLabel for="rule-name">{{ $t('rules.management.name') }}</FieldLabel><UiInput id="rule-name" v-model="ruleForm.name" :aria-invalid="Boolean(formErrors.name)" /><FieldError v-if="formErrors.name">{{ formErrors.name }}</FieldError></Field>
        <Field :data-invalid="Boolean(formErrors.description)"><FieldLabel for="rule-description">{{ $t('rules.management.description') }}</FieldLabel><UiTextarea id="rule-description" v-model="ruleForm.description" :aria-invalid="Boolean(formErrors.description)" /><FieldError v-if="formErrors.description">{{ formErrors.description }}</FieldError></Field>
        <Field :data-invalid="Boolean(formErrors.log_type)"><FieldLabel for="rule-log-type">{{ $t('rules.type') }}</FieldLabel><UiInput id="rule-log-type" v-model="ruleForm.log_type" list="known-log-types" :aria-invalid="Boolean(formErrors.log_type)" :placeholder="$t('rules.management.selectOrEnterType')" @change="handleLogTypeChange(ruleForm.log_type)" /><datalist id="known-log-types"><option v-for="type in uniqueLogTypes" :key="type" :value="type">{{ getLogTypeText(type) }}</option></datalist><FieldDescription>{{ $t('rules.management.customTypeDescription') }}</FieldDescription><FieldError v-if="formErrors.log_type">{{ formErrors.log_type }}</FieldError></Field>
        <Field :data-invalid="Boolean(formErrors.pattern)"><FieldLabel for="rule-pattern">{{ $t('rules.management.pattern') }}</FieldLabel><UiTextarea id="rule-pattern" v-model="ruleForm.pattern" rows="3" :aria-invalid="Boolean(formErrors.pattern)" /><FieldDescription>Regex: \[\d{2}:\d{2}:\d{2}\]: Player .* joined the game</FieldDescription><FieldError v-if="formErrors.pattern">{{ formErrors.pattern }}</FieldError></Field>
        <Field orientation="horizontal"><div><FieldLabel for="rule-regex">{{ $t('rules.management.regex') }}</FieldLabel><FieldDescription>{{ $t('rules.management.regexDescription') }}</FieldDescription></div><UiSwitch id="rule-regex" v-model="ruleForm.is_regex" /></Field>
        <Field orientation="horizontal"><div><FieldLabel for="rule-enabled">{{ $t('rules.management.enabled') }}</FieldLabel><FieldDescription>{{ $t('rules.management.enabledDescription') }}</FieldDescription></div><UiSwitch id="rule-enabled" v-model="ruleForm.is_enabled" /></Field>
        <Field :data-invalid="Boolean(formErrors.match_mode)"><FieldLabel for="rule-match-mode">{{ $t('rules.management.matchMode') }}</FieldLabel><UiSelect v-model="ruleForm.match_mode" @update:model-value="handleMatchModeChange"><SelectTrigger id="rule-match-mode" :aria-invalid="Boolean(formErrors.match_mode)"><SelectValue :placeholder="$t('rules.management.selectMatchMode')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="single">{{ $t('rules.matchModes.single') }}</SelectItem><SelectItem value="multi_line">{{ $t('rules.matchModes.multi_line') }}</SelectItem><SelectItem value="head_tail">{{ $t('rules.matchModes.head_tail') }}</SelectItem></SelectGroup></SelectContent></UiSelect><FieldDescription>
            <span v-if="ruleForm.match_mode === 'single'">{{ $t('rules.management.matchModeDescriptions.single') }}</span>
            <span v-else-if="ruleForm.match_mode === 'multi_line'">{{ $t('rules.management.matchModeDescriptions.multi_line') }}</span>
            <span v-else-if="ruleForm.match_mode === 'head_tail'">{{ $t('rules.management.matchModeDescriptions.head_tail') }}</span>
          </FieldDescription><FieldError v-if="formErrors.match_mode">{{ formErrors.match_mode }}</FieldError></Field>
        <Field v-if="ruleForm.match_mode === 'head_tail'" :data-invalid="Boolean(formErrors.tail_pattern)"><FieldLabel for="rule-tail-pattern">{{ $t('rules.management.tailPattern') }}</FieldLabel><UiTextarea id="rule-tail-pattern" v-model="ruleForm.tail_pattern" rows="3" :aria-invalid="Boolean(formErrors.tail_pattern)" /><FieldDescription>{{ $t('rules.management.tailPatternDescription') }}</FieldDescription><FieldError v-if="formErrors.tail_pattern">{{ formErrors.tail_pattern }}</FieldError></Field>
        <Field :data-invalid="Boolean(formErrors.priority)"><FieldLabel for="rule-priority">{{ $t('rules.management.columns.priority') }}</FieldLabel><UiInput id="rule-priority" v-model="ruleForm.priority" type="number" min="0" max="1000" :aria-invalid="Boolean(formErrors.priority)" /><FieldDescription>{{ $t('rules.management.priorityDescription') }}</FieldDescription><FieldError v-if="formErrors.priority">{{ formErrors.priority }}</FieldError></Field>
      </FieldGroup>
      <DialogFooter><UiButton variant="outline" :disabled="savingRule" @click="handleCancelClick">{{ $t('common.actions.cancel') }}</UiButton><UiButton :disabled="savingRule" @click="confirmRuleAction"><Spinner v-if="savingRule" data-icon="inline-start" />{{ $t('common.actions.confirm') }}</UiButton></DialogFooter>
    </DialogScrollContent></UiDialog>

    <UiDialog v-model:open="dialogVisible.migration"><DialogScrollContent class="sm:max-w-4xl"><DialogHeader><DialogTitle>{{ $t('rules.management.migration.title') }}</DialogTitle><DialogDescription>{{ $t('rules.management.migration.description') }}</DialogDescription></DialogHeader>
      <template v-if="migrationPreview">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4"><div class="flex flex-col gap-1"><span class="text-xs text-muted-foreground">{{ getMigrationStatusText('ready') }}</span><span class="text-lg font-semibold">{{ migrationPreview.ready }}</span></div><div class="flex flex-col gap-1"><span class="text-xs text-muted-foreground">{{ getMigrationStatusText('skipped') }}</span><span class="text-lg font-semibold">{{ migrationPreview.skipped }}</span></div><div class="flex flex-col gap-1"><span class="text-xs text-muted-foreground">{{ getMigrationStatusText('conflict') }}</span><span class="text-lg font-semibold">{{ migrationPreview.conflicts }}</span></div><div class="flex flex-col gap-1"><span class="text-xs text-muted-foreground">{{ getMigrationStatusText('incompatible') }}</span><span class="text-lg font-semibold">{{ migrationPreview.incompatible }}</span></div></div>
        <Alert v-if="migrationPreview.conflicts + migrationPreview.incompatible > 0"><CircleAlertIcon /><AlertTitle>{{ $t('rules.management.migration.blockedTitle') }}</AlertTitle><AlertDescription>{{ $t('rules.management.migration.blockedDescription') }}</AlertDescription></Alert>
        <ShadcnTable class="min-w-[760px]"><TableHeader><TableRow><TableHead>{{ $t('rules.management.migration.oldId') }}</TableHead><TableHead>{{ $t('rules.management.migration.rule') }}</TableHead><TableHead>{{ $t('rules.type') }}</TableHead><TableHead>{{ $t('rules.management.migration.mode') }}</TableHead><TableHead>{{ $t('rules.management.columns.priority') }}</TableHead><TableHead>{{ $t('rules.management.migration.result') }}</TableHead><TableHead>{{ $t('rules.management.migration.reason') }}</TableHead></TableRow></TableHeader><TableBody><TableRow v-for="item in migrationPreview.items" :key="item.legacyId"><TableCell>{{ item.legacyId }}</TableCell><TableCell><div class="flex max-w-56 flex-col gap-1"><span class="font-medium">{{ item.name }}</span><span class="truncate text-xs text-muted-foreground" :title="item.pattern">{{ item.pattern }}</span></div></TableCell><TableCell><Badge variant="secondary" :title="item.logType">{{ getLogTypeText(item.logType) }}</Badge></TableCell><TableCell>{{ getMatchModeText(item.matchMode) }}</TableCell><TableCell>{{ item.priority }}</TableCell><TableCell><Badge :variant="getMigrationStatusVariant(item.status)">{{ getMigrationStatusText(item.status) }}</Badge></TableCell><TableCell class="max-w-64 text-sm text-muted-foreground">{{ getMigrationReasonText(item.reason) }}</TableCell></TableRow><TableEmpty v-if="migrationPreview.items.length === 0" :colspan="7">{{ $t('rules.management.migration.none') }}</TableEmpty></TableBody></ShadcnTable>
      </template>
      <div v-else class="flex flex-col gap-2 py-4"><Skeleton v-for="index in 4" :key="index" class="h-8 w-full" /></div>
      <DialogFooter><UiButton variant="outline" :disabled="migrationApplying" @click="dialogVisible.migration = false">{{ $t('common.actions.cancel') }}</UiButton><UiButton :disabled="migrationApplying || !migrationPreview || migrationPreview.ready === 0" @click="migrateLegacyRules"><Spinner v-if="migrationApplying" data-icon="inline-start" />{{ $t('rules.management.migration.importAndParse', { count: migrationPreview?.ready || 0 }) }}</UiButton></DialogFooter>
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
import { logTypeLabel } from '@/i18n/logTypes'
import { logRuleDescription, logRuleName } from '@/i18n/logRules'
import { migrationReasonLabel } from '@/i18n/migrationReasons'
import {
  getManagementScope,
  MANAGEMENT_SCOPE_CHANGED_EVENT,
  managementScopeTargetId
} from '@/lib/managementScope.mjs'
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
      managementScope: getManagementScope(),
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
    window.addEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, this.handleManagementScopeChange);
    this.loadRooms();
  },
  beforeUnmount() {
    window.removeEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, this.handleManagementScopeChange);
  },
  methods: {
    handleManagementScopeChange(event) {
      this.managementScope = event?.detail || getManagementScope();
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
        this.rooms = await logApi.getRoomOptions(managementScopeTargetId(this.managementScope));
        if (requestSequence !== this.roomRequestSequence) return;
        if (this.rooms.length === 1) {
          this.selectedRoomId = this.rooms[0].id;
          await this.getParserRulesList();
        }
      } catch (error) {
        if (requestSequence !== this.roomRequestSequence) return;
        this.rooms = [];
        this.loadError = error.message || this.$t('common.errors.unknown');
        this.loadErrorContext = 'rooms';
        toast.error(this.$t('rules.management.feedback.archiveLoadFailed', { error: this.loadError }));
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
          throw new Error(response?.msg || this.$t('rules.management.feedback.rulesResponseInvalid'));
        }
        this.parserRulesList = response.data;

        // 提取唯一的log_type值
        this.extractUniqueLogTypes();
        this.getRuleMigrationPreview(requestSequence);
      } catch (error) {
        if (requestSequence !== this.ruleRequestSequence) return;
        this.loadError = error.message || this.$t('rules.management.feedback.rulesLoadFailed');
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
        toast.error(this.$t('rules.management.feedback.migrationPreviewFailed'))
        return
      }
      this.dialogVisible.migration = true
    },

    async migrateLegacyRules() {
      if (this.migrationApplying || !this.migrationPreview?.ready) return
      const roomId = this.selectedRoomId
      const scopeTargetId = managementScopeTargetId(this.managementScope)
      const requestSequence = this.ruleRequestSequence
      this.migrationApplying = true
      try {
        const result = await ruleManagementApi.migrateLegacyRules(roomId)
        const imported = Number(result?.imported || 0)
        this.dialogVisible.migration = false
        if (requestSequence !== this.ruleRequestSequence || roomId !== this.selectedRoomId || scopeTargetId !== managementScopeTargetId(this.managementScope)) {
          toast.warning(this.$t('rules.management.feedback.importedOnPreviousTarget', { count: imported }))
          return
        }
        await this.getParserRulesList()
        if (roomId !== this.selectedRoomId || scopeTargetId !== managementScopeTargetId(this.managementScope)) {
          toast.warning(this.$t('rules.management.feedback.importedTargetChanged', { count: imported }))
          return
        }
        if (imported === 0) {
          toast.info(this.$t('rules.management.feedback.nothingToImport'))
          return
        }
        toast.success(this.$t('rules.management.feedback.importedParsing', { count: imported }))
        try {
          await logApi.refresh(roomId)
          toast.success(this.$t('rules.management.feedback.importedComplete', { count: imported }))
        } catch (error) {
          toast.warning(this.$t('rules.management.feedback.importedParseFailed', {
            error: error.message || this.$t('common.errors.unknown')
          }))
        }
      } catch (error) {
        toast.error(this.$t('rules.management.feedback.migrationFailed', {
          error: error.message || this.$t('common.errors.unknown')
        }))
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
        toast.warning(this.$t('rules.management.feedback.selectArchiveFirst'));
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
      this.formErrors.name = validateLength(this.ruleForm.name, 1, 80, this.$t('rules.management.feedback.nameRequired'), this.$t('rules.management.feedback.nameTooLong'))
      this.formErrors.description = String(this.ruleForm.description || '').trim().length > 300 ? this.$t('rules.management.feedback.descriptionTooLong') : ''
      this.formErrors.log_type = /^[A-Za-z0-9_.-]{1,48}$/.test(this.ruleForm.log_type.trim()) ? '' : this.$t('rules.management.feedback.typeInvalid')
      this.formErrors.pattern = validateLength(this.ruleForm.pattern, 1, 512, this.$t('rules.management.feedback.patternRequired'), this.$t('rules.management.feedback.patternTooLong'))
      this.formErrors.match_mode = this.ruleForm.match_mode ? '' : this.$t('rules.management.feedback.matchModeRequired')
      this.formErrors.tail_pattern = this.ruleForm.match_mode === 'head_tail' && (!this.ruleForm.tail_pattern.trim() || this.ruleForm.tail_pattern.length > 512) ? this.$t('rules.management.feedback.tailPatternInvalid') : ''
      const priority = Number(this.ruleForm.priority)
      this.formErrors.priority = Number.isInteger(priority) && priority >= 0 && priority <= 1000 ? '' : this.$t('rules.management.feedback.priorityInvalid')
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
            toast.success(this.$t('rules.management.feedback.ruleEdited'));
          } else {
            await ruleManagementApi.addRule(this.selectedRoomId, formData);
            toast.success(this.$t('rules.management.feedback.ruleAdded'));

            // 如果是新的日志类型，直接添加到唯一日志类型列表中
            if (this.ruleForm.log_type && !this.uniqueLogTypes.includes(this.ruleForm.log_type)) {
              this.uniqueLogTypes.push(this.ruleForm.log_type);
            }
          }
          this.dialogVisible.parser = false;
          await this.getParserRulesList();
        } catch (error) {
          toast.error(this.$t('rules.management.feedback.ruleActionFailed', {
            error: error.message || this.$t('common.errors.unknown')
          }));
        } finally {
          this.savingRule = false
      }
    },

    // 移除解析规则
    async removeParserRule(row) {
      if (this.deletingRuleId !== null) return
      try {
        await confirmAction(this.$t('rules.management.feedback.deleteConfirmation'), this.$t('rules.management.feedback.deleteTitle'), {
          confirmButtonText: this.$t('common.actions.confirm'),
          cancelButtonText: this.$t('common.actions.cancel'),
          type: 'warning'
        })
        this.deletingRuleId = row.id
        await ruleManagementApi.deleteRule(this.selectedRoomId, row.id);
        toast.success(this.$t('rules.management.feedback.ruleDeleted'));
        await this.getParserRulesList();
      } catch (error) {
        if (error === 'cancel' || error === 'close') {
          toast.info(this.$t('rules.management.feedback.deleteCanceled'))
          return
        }
        toast.error(this.$t('rules.management.feedback.deleteFailed', {
          error: error.message || this.$t('common.errors.unknown')
        }));
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
        toast.success(this.$t('rules.management.feedback.statusUpdated'));
        await this.getParserRulesList();
      } catch (error) {
        rule.is_enabled = !rule.is_enabled; // 恢复原状态
        toast.error(this.$t('rules.management.feedback.statusUpdateFailed', {
          error: error.message || this.$t('common.errors.unknown')
        }));
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
        startup: 'secondary',
        worldgen: 'default',
        diagnostic: 'secondary',
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
      const key = ['single', 'multi_line', 'head_tail'].includes(match_mode)
        ? `rules.matchModes.${match_mode}`
        : ''
      return key ? this.$t(key) : match_mode;
    },

    getLogTypeText(logType) {
      return logTypeLabel(logType, this.$t)
    },

    getRuleName(rule) {
      return logRuleName(rule, this.$t)
    },

    getRuleDescription(rule) {
      return logRuleDescription(rule, this.$t)
    },

    getMigrationStatusText(status) {
      const key = ['ready', 'skipped', 'conflict', 'incompatible'].includes(status)
        ? `rules.migrationStatuses.${status}`
        : ''
      return key ? this.$t(key) : status
    },

    getMigrationStatusVariant(status) {
      return {
        ready: 'default',
        skipped: 'secondary',
        conflict: 'destructive',
        incompatible: 'outline'
      }[status] || 'secondary'
    },

    getMigrationReasonText(reason) {
      return migrationReasonLabel(reason, this.$t)
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
        toast.warning(this.$t('rules.management.feedback.emptyPattern'));
        return;
      }

      if (!navigator.clipboard?.writeText) {
        this.fallbackCopy(pattern);
        return;
      }

      // 使用浏览器的剪贴板 API 复制文本
      navigator.clipboard.writeText(pattern)
        .then(() => {
          toast.success(this.$t('rules.management.feedback.patternCopied'));
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
          toast.success(this.$t('rules.management.feedback.patternCopied'));
        } else {
          toast.warning(this.$t('rules.management.feedback.copyManually'));
        }
      } catch {
        toast.error(this.$t('rules.management.feedback.copyManually'));
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
          await confirmAction(this.$t('rules.management.feedback.discardDescription'), this.$t('rules.management.feedback.discardTitle'), {
            confirmButtonText: this.$t('rules.management.feedback.closeWithoutSaving'),
            cancelButtonText: this.$t('rules.management.feedback.continueEditing'),
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
