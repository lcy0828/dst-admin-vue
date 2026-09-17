<template>
  <div class="command-manager-page">
    <header class="page-header">
      <div>
        <h1>{{ $t('commands.title') }}</h1>
        <p>{{ $t('commands.subtitle') }}</p>
      </div>
      <UiButton size="sm" variant="outline" :disabled="loading" @click="reloadCommandData">
        <Spinner v-if="loading" data-icon="inline-start" />
        <RefreshCw v-else data-icon="inline-start" />
        {{ $t('commands.actions.refresh') }}
      </UiButton>
    </header>

    <Alert v-if="loadError" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ $t('commands.load.title') }}</AlertTitle>
      <AlertDescription>{{ loadErrorMessage }}</AlertDescription>
      <AlertAction><UiButton size="sm" variant="outline" @click="reloadCommandData">{{ $t('commands.actions.reload') }}</UiButton></AlertAction>
    </Alert>

    <Card>
      <CardHeader>
        <CardTitle>{{ $t('commands.execute.title') }}</CardTitle>
        <CardDescription>{{ $t('commands.execute.description') }}</CardDescription>
        <CardAction class="max-sm:col-span-full max-sm:row-auto max-sm:justify-self-start">
          <ToggleGroup v-model="commandMode" type="single">
            <ToggleGroupItem value="structured">{{ $t('commands.execute.modes.structured') }}</ToggleGroupItem>
            <ToggleGroupItem value="raw">{{ $t('commands.execute.modes.raw') }}</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent class="content-stack">
        <FieldGroup v-if="commandMode === 'structured'">
          <Field>
            <FieldLabel>{{ $t('commands.execute.server') }}</FieldLabel>
            <UiSelect v-model="executeForm.server">
              <SelectTrigger class="w-full"><SelectValue :placeholder="$t('commands.execute.selectServer')" /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem v-for="server in servers" :key="server.id" :value="server.session_name">{{ server.name }}</SelectItem></SelectGroup></SelectContent>
            </UiSelect>
          </Field>
          <Field>
            <FieldLabel>{{ $t('commands.execute.command') }}</FieldLabel>
            <UiSelect v-model="executeForm.commandId" @update:model-value="handleCommandChange">
              <SelectTrigger class="w-full"><SelectValue :placeholder="$t('commands.execute.selectCommand')" /></SelectTrigger>
              <SelectContent>
                <SelectGroup v-for="group in commandGroups" :key="group.type">
                  <SelectLabel>{{ commandCategoryLabel(group.type) }}</SelectLabel>
                  <SelectItem v-for="command in group.commands" :key="command.id" :value="command.id">{{ commandDisplayText(command, 'name') }}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </UiSelect>
          </Field>
          <template v-if="currentCommand && (currentCommand.parameterized || currentCommand.needs_params)">
            <Separator />
            <h3 class="subheading">{{ $t('commands.execute.parameters') }}</h3>
            <Field v-for="param in currentCommand.parameters" :key="param.name">
              <FieldLabel :for="`execute-${param.name}`">{{ commandParameterText(param, 'label') || param.name }}</FieldLabel>
              <div v-if="param.type === 'string' || !param.type" class="input-action">
                <UiInput :id="`execute-${param.name}`" v-model="executeForm.params[param.name]" :placeholder="parameterPlaceholder(param)" />
                <UiButton v-if="currentCommand.example" size="sm" variant="outline" @click="applyExample(param.name)">{{ $t('commands.actions.useExample') }}</UiButton>
              </div>
              <UiInput v-else-if="param.type === 'number' || param.type === 'integer'" :id="`execute-${param.name}`" v-model.number="executeForm.params[param.name]" type="number" :min="param.minimum" :max="param.maximum" />
              <UiSwitch v-else-if="param.type === 'boolean'" :id="`execute-${param.name}`" v-model="executeForm.params[param.name]" />
              <UiSelect v-else-if="param.type === 'enum'" v-model="executeForm.params[param.name]">
                <SelectTrigger class="w-full"><SelectValue :placeholder="$t('commands.execute.selectParameter', { name: commandParameterText(param, 'label') || param.name })" /></SelectTrigger>
                <SelectContent><SelectGroup><SelectItem v-for="option in param.options" :key="option" :value="option">{{ commandParameterOptionLabel(param, option) }}</SelectItem></SelectGroup></SelectContent>
              </UiSelect>
              <FieldDescription v-if="param.description || currentCommand.example">
                {{ commandParameterText(param, 'description') }}<span v-if="currentCommand.example"> {{ $t('commands.execute.exampleDescription', { example: currentCommand.example }) }}</span>
              </FieldDescription>
            </Field>
          </template>
          <div v-else-if="currentCommand" class="command-preview"><strong>{{ $t('commands.execute.preview') }}</strong><pre>{{ currentCommand.command || currentCommand.script }}</pre></div>
          <UiButton :disabled="executing" @click="executeCommand"><Spinner v-if="executing" data-icon="inline-start" /><Play v-else data-icon="inline-start" />{{ $t('commands.actions.execute') }}</UiButton>
        </FieldGroup>

        <FieldGroup v-else>
          <Field>
            <FieldLabel>{{ $t('commands.execute.server') }}</FieldLabel>
            <UiSelect v-model="rawCommandForm.server">
              <SelectTrigger class="w-full"><SelectValue :placeholder="$t('commands.execute.selectServer')" /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem v-for="server in servers" :key="server.id" :value="server.session_name">{{ server.name }}</SelectItem></SelectGroup></SelectContent>
            </UiSelect>
          </Field>
          <Field><FieldLabel for="raw-command">{{ $t('commands.execute.rawContent') }}</FieldLabel><UiTextarea id="raw-command" v-model="rawCommandForm.command" rows="4" :placeholder="$t('commands.execute.rawPlaceholder', { example: rawCommandExample })" /></Field>
          <div class="form-actions">
            <UiButton :disabled="executing" @click="executeRawCommand"><Spinner v-if="executing" data-icon="inline-start" /><Play v-else data-icon="inline-start" />{{ $t('commands.actions.execute') }}</UiButton>
            <Popover>
              <PopoverTrigger as-child><UiButton variant="outline"><BookOpen data-icon="inline-start" />{{ $t('commands.actions.commonCommands') }}</UiButton></PopoverTrigger>
              <PopoverContent class="common-command-popover">
                <Field><FieldLabel class="sr-only" for="command-search">{{ $t('commands.execute.searchCommands') }}</FieldLabel><UiInput id="command-search" v-model="commandSearch" :placeholder="$t('commands.execute.searchCommands')" /></Field>
                <div class="common-command-list"><UiButton v-for="command in filteredCommonCommands" :key="command.command" variant="ghost" class="common-command-item" @click="applyCommonCommand(command.command)"><strong>{{ command.name }}</strong><span>{{ command.description }}</span></UiButton></div>
              </PopoverContent>
            </Popover>
            <UiButton variant="outline" @click="showBatchCommandDialog"><ListPlus data-icon="inline-start" />{{ $t('commands.actions.batch') }}</UiButton>
          </div>
        </FieldGroup>

        <Alert
          v-if="executionResult"
          :variant="executionResult.success || executionResult.warning ? 'default' : 'destructive'"
          :class="{ 'border-amber-500/50 bg-amber-50 text-amber-950 dark:bg-amber-950/20 dark:text-amber-200': executionResult.warning }"
        >
          <CircleCheck v-if="executionResult.success" />
          <CircleAlert v-else />
          <AlertTitle>{{ $t(executionResult.warning ? 'commands.execute.result.uncertain' : (executionResult.success ? 'commands.execute.result.success' : 'commands.execute.result.failed')) }}</AlertTitle>
          <AlertDescription><pre>{{ executionResultMessage }}</pre></AlertDescription>
        </Alert>

        <div v-if="commandHistory.length" class="command-history">
          <Separator />
          <div class="section-heading"><h3>{{ $t('commands.history.title') }}</h3><div><UiButton size="sm" variant="ghost" @click="clearHistory">{{ $t('commands.actions.clearHistory') }}</UiButton><UiButton size="sm" variant="ghost" @click="saveHistoryToFile"><Download data-icon="inline-start" />{{ $t('commands.actions.saveFile') }}</UiButton></div></div>
          <ShadcnTable>
            <TableHeader><TableRow><TableHead>{{ $t('commands.history.columns.time') }}</TableHead><TableHead>{{ $t('commands.history.columns.server') }}</TableHead><TableHead>{{ $t('commands.history.columns.command') }}</TableHead><TableHead>{{ $t('commands.history.columns.status') }}</TableHead><TableHead>{{ $t('commands.history.columns.actions') }}</TableHead></TableRow></TableHeader>
            <TableBody><TableRow v-for="item in commandHistory" :key="item.id"><TableCell>{{ commandTime(item.createdAt) }}</TableCell><TableCell>{{ item.serverName }}</TableCell><TableCell class="truncate-cell">{{ item.mode === 'structured' ? item.commandName : item.command }}</TableCell><TableCell><Badge :variant="historyStatusVariant(item.status)">{{ historyStatusLabel(item.status) }}</Badge></TableCell><TableCell><div class="table-actions"><UiButton size="xs" variant="ghost" @click="rerunCommand(item)">{{ $t('commands.actions.rerun') }}</UiButton><UiButton size="xs" variant="ghost" @click="copyCommand(item)">{{ $t('commands.actions.copy') }}</UiButton></div></TableCell></TableRow></TableBody>
          </ShadcnTable>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>{{ $t('commands.manage.title') }}</CardTitle>
        <CardDescription>{{ $t('commands.manage.description') }}</CardDescription>
        <CardAction class="form-actions max-sm:col-span-full max-sm:row-auto max-sm:justify-self-stretch"><UiButton size="sm" variant="outline" @click="exportCommands"><Download data-icon="inline-start" />{{ $t('commands.actions.export') }}</UiButton><UiButton size="sm" variant="outline" @click="importCommands"><Upload data-icon="inline-start" />{{ $t('commands.actions.import') }}</UiButton><UiButton size="sm" @click="showAddCommandDialog"><Plus data-icon="inline-start" />{{ $t('commands.actions.add') }}</UiButton></CardAction>
      </CardHeader>
      <CardContent class="content-stack">
        <ToggleGroup :model-value="currentType || '__all'" type="single" class="type-filter" @update:model-value="filterCommandsByType($event === '__all' ? '' : $event)"><ToggleGroupItem value="__all">{{ $t('commands.manage.all') }}</ToggleGroupItem><ToggleGroupItem v-for="type in commandTypes" :key="type" :value="type">{{ commandCategoryLabel(type) }}</ToggleGroupItem></ToggleGroup>
        <div v-if="loading" class="command-skeleton" aria-busy="true" :aria-label="$t('commands.load.loadingAria')"><Skeleton v-for="row in 5" :key="row" class="h-12 w-full" /></div>
        <div v-else-if="displayCommands.length" class="table-wrap">
          <ShadcnTable>
            <TableHeader><TableRow><TableHead>{{ $t('commands.manage.columns.name') }}</TableHead><TableHead>{{ $t('commands.manage.columns.type') }}</TableHead><TableHead>{{ $t('commands.manage.columns.description') }}</TableHead><TableHead>{{ $t('commands.manage.columns.builtin') }}</TableHead><TableHead>{{ $t('commands.manage.columns.actions') }}</TableHead></TableRow></TableHeader>
            <TableBody><TableRow v-for="command in displayCommands" :key="command.id"><TableCell class="font-medium">{{ commandDisplayText(command, 'name') }}</TableCell><TableCell>{{ commandCategoryLabel(command.type || command.category) }}</TableCell><TableCell>{{ commandDisplayText(command, 'description') }}</TableCell><TableCell><Badge :variant="command.isBuiltin || command.is_builtin ? 'default' : 'outline'">{{ $t(command.isBuiltin || command.is_builtin ? 'commands.manage.yes' : 'commands.manage.no') }}</Badge></TableCell><TableCell><div class="table-actions"><UiButton size="xs" variant="outline" :disabled="command.isBuiltin || command.is_builtin" @click="editCommand(command)"><Pencil data-icon="inline-start" />{{ $t('commands.actions.edit') }}</UiButton><UiButton size="xs" variant="destructive" :disabled="command.isBuiltin || command.is_builtin" @click="handleDelete(command)"><Trash2 data-icon="inline-start" />{{ $t('commands.actions.delete') }}</UiButton></div></TableCell></TableRow></TableBody>
          </ShadcnTable>
        </div>
        <Empty v-else-if="!loadError"><EmptyHeader><EmptyMedia variant="icon"><SquareTerminal /></EmptyMedia><EmptyTitle>{{ $t('commands.manage.empty') }}</EmptyTitle><EmptyDescription>{{ $t('commands.manage.emptyDescription') }}</EmptyDescription></EmptyHeader></Empty>
      </CardContent>
    </Card>

    <UiDialog v-model:open="dialogVisible">
      <DialogScrollContent class="sm:max-w-3xl">
        <DialogHeader><DialogTitle>{{ $t(dialogType === 'add' ? 'commands.dialog.addTitle' : 'commands.dialog.editTitle') }}</DialogTitle><DialogDescription>{{ $t('commands.dialog.description') }}</DialogDescription></DialogHeader>
        <FieldGroup>
          <Field><FieldLabel for="command-name">{{ $t('commands.dialog.name') }}</FieldLabel><UiInput id="command-name" v-model="commandForm.name" :placeholder="$t('commands.dialog.namePlaceholder')" /></Field>
          <Field><FieldLabel>{{ $t('commands.dialog.type') }}</FieldLabel><UiSelect v-model="commandForm.type"><SelectTrigger class="w-full"><SelectValue :placeholder="$t('commands.dialog.typePlaceholder')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="type in commandTypes" :key="type" :value="type">{{ commandCategoryLabel(type) }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
          <Field><FieldLabel for="command-description">{{ $t('commands.dialog.commandDescription') }}</FieldLabel><UiTextarea id="command-description" v-model="commandForm.description" rows="2" :placeholder="$t('commands.dialog.descriptionPlaceholder')" /></Field>
          <Field><FieldLabel for="command-script">{{ $t('commands.dialog.script') }}</FieldLabel><UiTextarea id="command-script" v-model="commandForm.command" rows="5" :placeholder="$t('commands.dialog.scriptPlaceholder', { example: scriptExample })" /></Field>
          <Field orientation="horizontal"><UiSwitch id="command-parameterized" v-model="commandForm.parameterized" @update:model-value="handleParamSwitch" /><FieldLabel for="command-parameterized">{{ $t('commands.dialog.parameterized') }}</FieldLabel></Field>
          <template v-if="commandForm.parameterized">
            <Separator />
            <div v-for="(param, index) in commandForm.parameters" :key="index" class="parameter-editor"><div class="parameter-grid"><Field><FieldLabel :for="`param-name-${index}`">{{ $t('commands.dialog.parameter.name') }}</FieldLabel><UiInput :id="`param-name-${index}`" v-model="param.name" placeholder="message" /></Field><Field><FieldLabel :for="`param-label-${index}`">{{ $t('commands.dialog.parameter.label') }}</FieldLabel><UiInput :id="`param-label-${index}`" v-model="param.label" :placeholder="$t('commands.dialog.parameter.labelPlaceholder')" /></Field><Field><FieldLabel>{{ $t('commands.dialog.parameter.type') }}</FieldLabel><UiSelect v-model="param.type"><SelectTrigger class="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="string">{{ $t('commands.dialog.parameterTypes.string') }}</SelectItem><SelectItem value="number">{{ $t('commands.dialog.parameterTypes.number') }}</SelectItem><SelectItem value="boolean">{{ $t('commands.dialog.parameterTypes.boolean') }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field><Field><FieldLabel :for="`param-default-${index}`">{{ $t('commands.dialog.parameter.default') }}</FieldLabel><UiInput :id="`param-default-${index}`" v-model="param.default" :placeholder="$t('commands.dialog.parameter.defaultPlaceholder')" /></Field><Field orientation="horizontal"><UiSwitch :id="`param-required-${index}`" v-model="param.required" /><FieldLabel :for="`param-required-${index}`">{{ $t('commands.dialog.parameter.required') }}</FieldLabel></Field><UiButton size="icon" variant="destructive" :aria-label="$t('commands.actions.deleteParameter')" :title="$t('commands.actions.deleteParameter')" @click="removeParam(index)"><Trash2 /></UiButton></div></div>
            <UiButton variant="outline" @click="addParameter"><Plus data-icon="inline-start" />{{ $t('commands.actions.addParameter') }}</UiButton>
          </template>
        </FieldGroup>
        <DialogFooter><UiButton variant="outline" @click="dialogVisible = false">{{ $t('commands.actions.cancel') }}</UiButton><UiButton @click="submitForm">{{ $t('commands.actions.confirm') }}</UiButton></DialogFooter>
      </DialogScrollContent>
    </UiDialog>

    <input ref="importInput" type="file" accept=".json" style="display: none" @change="handleImportFile" />

    <UiDialog v-model:open="batchCommandDialogVisible">
      <DialogScrollContent class="sm:max-w-3xl">
        <DialogHeader><DialogTitle>{{ $t('commands.batch.title') }}</DialogTitle><DialogDescription>{{ $t('commands.batch.description') }}</DialogDescription></DialogHeader>
        <FieldGroup>
          <Field><FieldLabel>{{ $t('commands.execute.server') }}</FieldLabel><UiSelect v-model="batchCommandForm.server"><SelectTrigger class="w-full"><SelectValue :placeholder="$t('commands.execute.selectServer')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="server in servers" :key="server.id" :value="server.session_name">{{ server.name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
          <Field><FieldLabel for="batch-commands">{{ $t('commands.batch.commandList') }}</FieldLabel><UiTextarea id="batch-commands" v-model="batchCommandForm.commands" rows="10" :placeholder="$t('commands.batch.listPlaceholder')" /></Field>
          <Field><FieldLabel for="batch-interval">{{ $t('commands.batch.interval') }}</FieldLabel><UiInput id="batch-interval" v-model.number="batchCommandForm.interval" type="number" min="100" max="5000" step="100" /></Field>
          <div v-if="batchResults.length" class="batch-results"><UiProgress :model-value="batchProgress" /><div class="batch-result-list"><div v-for="(result, index) in batchResults" :key="index" class="batch-result-item"><span class="batch-command">{{ result.command }}</span><Badge :variant="result.success ? 'default' : 'destructive'">{{ $t(result.success ? 'commands.batch.success' : 'commands.batch.failed') }}</Badge></div></div></div>
        </FieldGroup>
        <DialogFooter><UiButton variant="outline" @click="batchCommandDialogVisible = false">{{ $t('commands.actions.close') }}</UiButton><UiButton :disabled="executingBatch || !batchCommandForm.server || !batchCommandForm.commands" @click="executeBatchCommands"><Spinner v-if="executingBatch" data-icon="inline-start" />{{ $t('commands.actions.start') }}</UiButton></DialogFooter>
      </DialogScrollContent>
    </UiDialog>
  </div>
</template>

<script>
import {
  BookOpen, CircleAlert, CircleCheck, Download, ListPlus, Pencil, Play, Plus, RefreshCw,
  SquareTerminal, Trash2, Upload
} from '@lucide/vue';
import { toast } from 'vue-sonner';
import { commandManager, commandApi, COMMAND_TYPES } from '@/api';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog as UiDialog, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress as UiProgress } from '@/components/ui/progress';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Switch as UiSwitch } from '@/components/ui/switch';
import { Table as ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea as UiTextarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  formatCommandTime, localizeCommandError,
  translateBuiltinCommandField, translateBuiltinParameterField, translateBuiltinParameterOption,
  translateCommandCategory, translateCommandStatus
} from '@/i18n/commandMessages';
import { confirmAction } from '@/lib/feedback';
import { normalizeCommandCategory } from '@/lib/commandCategories.mjs';
import {
  getManagementScope,
  MANAGEMENT_SCOPE_CHANGED_EVENT,
  managementScopeTargetId
} from '@/lib/managementScope.mjs';

export default {
  name: 'CommandManager',
  components: {
    Alert, AlertAction, AlertDescription, AlertTitle, Badge, BookOpen, Card, CardAction, CardContent, CardDescription,
    CardHeader, CardTitle, CircleAlert, CircleCheck, DialogDescription, DialogFooter,
    DialogHeader, DialogScrollContent, DialogTitle, Download, Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle,
    Field, FieldDescription, FieldGroup, FieldLabel, ListPlus,
    Pencil, Play, Plus, Popover, PopoverContent, PopoverTrigger, RefreshCw, SelectContent, SelectGroup,
    SelectItem, SelectLabel, SelectTrigger, SelectValue, Separator, ShadcnTable, Skeleton, Spinner, TableBody,
    SquareTerminal, TableCell, TableHead, TableHeader, TableRow, ToggleGroup, ToggleGroupItem, Trash2, UiButton,
    UiDialog, UiInput, UiProgress, UiSelect, UiSwitch, UiTextarea, Upload
  },
  data() {
    return {
      loading: false,
      loadError: null,
      managementScope: getManagementScope(),
      scopeRequestSequence: 0,
      commands: [],
      displayCommands: [],
      currentType: '',

      // 命令执行相关
      executeForm: {
        server: '',
        commandId: '',
        params: {}
      },
      servers: [],
      currentCommand: null,
      executing: false,
      executionResult: null,

      // 对话框相关
      dialogVisible: false,
      dialogType: 'add', // 'add' or 'edit'
      commandForm: {
        name: '',
        type: '',
        description: '',
        command: '',
        parameterized: false,
        parameters: []
      },

      // 当前编辑的命令ID (用于编辑操作)
      currentCommandId: null,

      // 原始命令模式相关
      rawCommandForm: {
        server: '',
        command: ''
      },

      // 命令模式
      commandMode: 'structured',

      // 常用命令的脚本保持原样，名称和说明由展示层翻译
      commonCommandDefinitions: [
        {
          id: 'announce',
          command: 'c_announce(\'这里输入你的公告内容\')'
        },
        {
          id: 'give',
          command: 'c_give(\'prefab_name\')'
        },
        {
          id: 'spawn',
          command: 'c_spawn(\'prefab_name\')'
        },
        {
          id: 'regenerate',
          command: 'c_regenerateworld()'
        },
        {
          id: 'rollback',
          command: 'c_rollback(1)'
        },
        {
          id: 'kick',
          command: 'TheNet:Kick(UserToPlayer(\'玩家名称\'))'
        },
        {
          id: 'ban',
          command: 'TheNet:Ban(UserToPlayer(\'玩家名称\'))'
        },
        {
          id: 'players',
          command: 'c_listallplayers()'
        },
        {
          id: 'season',
          command: 'print(\'当前季节: \' .. TheWorld.state.season)'
        },
        {
          id: 'day',
          command: 'print(\'当前天数: \' .. TheWorld.state.cycles + 1)'
        },
        {
          id: 'save',
          command: 'c_save()'
        }
      ],
      rawCommandExample: 'c_announce(\'欢迎来到服务器\')',
      scriptExample: 'c_announce(\'Hello World\')',

      // 命令历史记录
      commandHistory: [],

      // 常用命令相关
      commandSearch: '',

      // 批量命令相关
      batchCommandDialogVisible: false,
      batchCommandForm: {
        server: '',
        commands: '',
        interval: 500
      },
      executingBatch: false,
      batchResults: [],
      batchProgress: 0,
      batchStatus: '', // 为进度条设置状态: success, exception
    };
  },
  computed: {
    loadErrorMessage() {
      if (!this.loadError) return '';
      return this.localizedError(this.loadError.error, this.loadError.fallbackKey);
    },
    executionResultMessage() {
      if (!this.executionResult) return '';
      if (this.executionResult.error) {
        return this.localizedError(this.executionResult.error, this.executionResult.messageKey);
      }
      const message = this.$t(this.executionResult.messageKey);
      return this.executionResult.detail
        ? this.$t('commands.errors.withDetail', { message, detail: this.executionResult.detail })
        : message;
    },
    commandTypes() {
      return [...new Set([
        ...Object.values(COMMAND_TYPES),
        ...this.commands.map(command => normalizeCommandCategory(command.type || command.category)).filter(Boolean)
      ])];
    },
    commandGroups() {
      // 按类型分组命令，用于下拉选择
      const groups = {};

      this.commands.forEach(cmd => {
        const type = normalizeCommandCategory(cmd.type || cmd.category);
        if (!groups[type]) {
          groups[type] = {
            type: type,
            commands: []
          };
        }
        groups[type].commands.push(cmd);
      });

      return Object.values(groups);
    },

    commonCommands() {
      return this.commonCommandDefinitions.map(command => ({
        ...command,
        name: this.$t(`commands.common.${command.id}.name`),
        description: this.$t(`commands.common.${command.id}.description`)
      }));
    },

    // 过滤后的常用命令
    filteredCommonCommands() {
      if (!this.commandSearch) {
        return this.commonCommands;
      }

      const keyword = this.commandSearch.toLowerCase();
      return this.commonCommands.filter(cmd =>
        cmd.name.toLowerCase().includes(keyword) ||
        cmd.description.toLowerCase().includes(keyword) ||
        cmd.command.toLowerCase().includes(keyword)
      );
    }
  },
  watch: {
    // 监听命令模式变化
    commandMode() {
      // 当模式变化时重置执行结果
      this.executionResult = null;
    }
  },
  async created() {
    await Promise.all([this.fetchCommands(), this.fetchServers()]);
    await this.loadCommandHistory();
  },
  mounted() {
    window.addEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, this.handleManagementScopeChange);
  },
  beforeUnmount() {
    window.removeEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, this.handleManagementScopeChange);
  },
  methods: {
    localizedError(error, fallbackKey = 'commands.errors.operation') {
      return localizeCommandError(
        (key, parameters) => this.$t(key, parameters),
        key => this.$te(key),
        error,
        fallbackKey
      );
    },
    setLoadError(fallbackKey, error) {
      this.loadError = { fallbackKey, error };
      toast.error(this.localizedError(error, fallbackKey));
    },
    commandCategoryLabel(category) {
      return translateCommandCategory(
        key => this.$t(key),
        key => this.$te(key),
        category
      );
    },
    commandDisplayText(command, field) {
      return translateBuiltinCommandField(
        key => this.$t(key),
        key => this.$te(key),
        command,
        field
      );
    },
    commandParameterText(parameter, field) {
      return translateBuiltinParameterField(
        key => this.$t(key),
        key => this.$te(key),
        this.currentCommand,
        parameter,
        field
      );
    },
    commandParameterOptionLabel(parameter, option) {
      return translateBuiltinParameterOption(
        key => this.$t(key),
        key => this.$te(key),
        this.currentCommand,
        parameter,
        option
      );
    },
    historyStatusLabel(status) {
      return translateCommandStatus(
        key => this.$t(key),
        key => this.$te(key),
        status
      );
    },
    commandTime(value) {
      return formatCommandTime(value, this.$i18n.locale);
    },
    parameterPlaceholder(param) {
      const name = this.commandParameterText(param, 'label') || param.name;
      return this.currentCommand?.example
        ? this.$t('commands.execute.examplePlaceholder', { example: this.currentCommand.example })
        : this.$t('commands.execute.inputPlaceholder', { name });
    },
    async handleManagementScopeChange(event) {
      this.managementScope = event?.detail || getManagementScope();
      const requestSequence = ++this.scopeRequestSequence;
      this.commands = [];
      this.displayCommands = [];
      this.servers = [];
      this.commandHistory = [];
      this.currentCommand = null;
      this.executionResult = null;
      await this.reloadCommandData();
      if (requestSequence === this.scopeRequestSequence) await this.loadCommandHistory();
    },
    async fetchCommands() {
      this.loading = true;
      this.loadError = null;
      try {
        const response = await commandApi.getAllCommands();
        this.commands = response.items;
        this.localFilterCommandsByType(this.currentType);
      } catch (error) {
        this.commands = [];
        this.displayCommands = [];
        this.setLoadError('commands.errors.commandList', error);
      } finally {
        this.loading = false;
      }
    },

    async reloadCommandData() {
      await Promise.all([this.fetchCommands(), this.fetchServers()]);
    },

    filterCommandsByType(type) {
      this.currentType = type ? normalizeCommandCategory(type) : '';
      this.localFilterCommandsByType(this.currentType);
    },

    localFilterCommandsByType(type) {
      if (!type) {
        this.displayCommands = [...this.commands];
      } else {
        const category = normalizeCommandCategory(type);
        this.displayCommands = this.commands.filter(cmd => (
          normalizeCommandCategory(cmd.type || cmd.category) === category
        ));
      }
    },

    showAddCommandDialog() {
      this.dialogType = 'add';
      this.currentCommandId = null;
      // 重置表单
      this.resetForm();
      this.dialogVisible = true;
    },

    editCommand(command) {
      this.dialogType = 'edit';
      this.currentCommandId = command.id;

      // 填充表单数据
      this.commandForm = {
        name: command.name,
        type: normalizeCommandCategory(command.type || command.category),
        description: command.description,
        command: command.command || command.script,
        parameterized: command.parameterized || command.needs_params || false,
        parameters: command.parameters ? [...command.parameters] : []
      };

      this.dialogVisible = true;
    },

    resetForm() {
      // 重置表单数据
      this.commandForm = {
        name: '',
        type: COMMAND_TYPES.CUSTOM, // 默认为自定义命令
        description: '',
        command: '',
        parameterized: false,
        parameters: []
      };

    },

    handleParamSwitch(value) {
      if (value && this.commandForm.parameters.length === 0) {
        // 如果开启了参数但没有参数，添加一个默认参数
        this.addParameter();
      }
    },

    addParameter() {
      // 添加一个新参数
      this.commandForm.parameters.push({
        name: '',
        label: '',
        type: 'string',
        required: false,
        default: ''
      });
    },

    removeParam(index) {
      // 移除指定索引的参数
      this.commandForm.parameters.splice(index, 1);
    },

    async submitForm() {
      const name = this.commandForm.name.trim();
      const invalidParameter = this.commandForm.parameterized && this.commandForm.parameters.some(param => !param.name.trim());
      if (!name || name.length < 2 || name.length > 50 || !this.commandForm.type || !this.commandForm.description.trim() || !this.commandForm.command.trim() || invalidParameter) {
        toast.warning(this.$t(invalidParameter ? 'commands.feedback.invalidParameter' : 'commands.feedback.incompleteForm'));
        return;
      }
      try {
        const requestData = {
          name: this.commandForm.name,
          type: normalizeCommandCategory(this.commandForm.type),
          description: this.commandForm.description,
          command: this.commandForm.command,
          parameterized: this.commandForm.parameterized,
          parameters: this.commandForm.parameterized ? this.commandForm.parameters : []
        };

        if (this.dialogType === 'add') {
          await commandManager.addCommand(requestData);
          toast.success(this.$t('commands.feedback.added'));
        } else {
          await commandManager.updateCommand(this.currentCommandId, requestData);
          toast.success(this.$t('commands.feedback.updated'));
        }

        await this.fetchCommands();
        this.dialogVisible = false;
      } catch (error) {
        toast.error(this.localizedError(error));
      }
    },

    async handleDelete(command) {
      try {
        await confirmAction(this.$t('commands.feedback.deleteConfirm', { name: command.name }), this.$t('commands.feedback.deleteTitle'), {
          confirmButtonText: this.$t('commands.actions.confirm'),
          cancelButtonText: this.$t('commands.actions.cancel'),
          type: 'warning'
        });
        await commandManager.deleteCommand(command.id);
        toast.success(this.$t('commands.feedback.deleted'));
        await this.fetchCommands();
      } catch (error) {
        if (error !== 'cancel') toast.error(this.localizedError(error, 'commands.errors.delete'));
      }
    },

    importCommands() {
      // 触发隐藏的文件输入
      this.$refs.importInput.click();
    },

    handleImportFile(event) {
      const file = event.target.files[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importedCommands = await commandManager.importCommands(e.target.result);
          toast.success(this.$t('commands.feedback.imported', { count: importedCommands.length }));
        } catch (error) {
          if (error.importedCount > 0) {
            toast.warning(this.$t('commands.feedback.importPartial', {
              imported: error.importedCount,
              total: error.totalCount,
              error: this.localizedError(error, 'commands.errors.import')
            }));
          } else {
            toast.error(this.localizedError(error, 'commands.errors.import'));
          }
        } finally {
          await this.fetchCommands();
        }
      };

      reader.readAsText(file);

      // 重置文件输入，允许重复选择相同文件
      event.target.value = '';
    },

    exportCommands() {
      try {
        // 获取要导出的命令（自定义命令）
        const jsonContent = commandManager.exportCommands();

        // 创建Blob对象
        const blob = new Blob([jsonContent], { type: 'application/json' });

        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'dstadmin_commands.json';

        document.body.appendChild(link);
        link.click();

        // 清理
        URL.revokeObjectURL(url);
        document.body.removeChild(link);

        toast.success(this.$t('commands.feedback.exported'));
      } catch (error) {
        toast.error(this.localizedError(error, 'commands.errors.export'));
      }
    },

    async fetchServers() {
      const requestSequence = this.scopeRequestSequence;
      try {
        const servers = await commandApi.getServers(managementScopeTargetId(this.managementScope));
        if (requestSequence !== this.scopeRequestSequence) return;
        this.servers = servers;
      } catch (error) {
        if (requestSequence !== this.scopeRequestSequence) return;
        this.servers = [];
        this.setLoadError('commands.errors.serverList', error);
      }
    },

    async handleCommandChange(commandId) {
      this.executing = true;
      try {
        this.currentCommand = await commandApi.getCommand(commandId);
        const params = {};
        (this.currentCommand.parameters || []).forEach(param => {
          if (param.default !== undefined) params[param.name] = param.default;
          else if (param.type === 'boolean') params[param.name] = false;
          else params[param.name] = '';
        });
        this.executeForm = {
          server: this.executeForm.server,
          commandId,
          params
        };
      } catch (error) {
        this.currentCommand = null;
        toast.error(this.localizedError(error, 'commands.errors.commandDetails'));
      } finally {
        this.executing = false;
      }
    },

    applyExample(paramName) {
      if (this.currentCommand && this.currentCommand.example) {
        this.executeForm.params[paramName] = this.currentCommand.example;
        toast.success(this.$t('commands.feedback.exampleApplied'));
      }
    },

    async executeCommand() {
      if (!this.executeForm.server) {
        toast.warning(this.$t('commands.feedback.selectServer'));
        return;
      }

      if (!this.executeForm.commandId) {
        toast.warning(this.$t('commands.feedback.selectCommand'));
        return;
      }

      let confirmation = '';
      if (['high', 'critical'].includes(this.currentCommand?.risk)) {
        try {
          confirmation = await this.requestRoomConfirmation(this.executeForm.server);
        } catch (error) {
          if (error !== 'cancel' && error !== 'close') toast.error(error.message || this.$t('commands.confirmation.missingServer'));
          return;
        }
      }

      this.executing = true;
      try {
        const run = await commandApi.executeCommand(
          this.executeForm.server,
          this.executeForm.commandId,
          this.executeForm.params,
          confirmation
        );
        this.showRunResult(run);
        if (run.status === 'succeeded') toast.success(this.$t('commands.feedback.sent'));
        await this.loadCommandHistory();
      } catch (error) {
        this.showExecutionError(error);
      } finally {
        this.executing = false;
      }
    },

    async executeRawCommand() {
      if (!this.rawCommandForm.server) {
        toast.warning(this.$t('commands.feedback.selectServer'));
        return;
      }

      if (!this.rawCommandForm.command) {
        toast.warning(this.$t('commands.feedback.enterCommand'));
        return;
      }

      let confirmation;
      try {
        confirmation = await this.requestRoomConfirmation(this.rawCommandForm.server);
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') toast.error(error.message || this.$t('commands.confirmation.missingServer'));
        return;
      }

      this.executing = true;
      try {
        const run = await commandApi.executeRawCommand(
          this.rawCommandForm.server,
          this.rawCommandForm.command,
          confirmation
        );
        this.showRunResult(run);
        if (run.status === 'succeeded') toast.success(this.$t('commands.feedback.sent'));
        await this.loadCommandHistory();
      } catch (error) {
        this.showExecutionError(error);
      } finally {
        this.executing = false;
      }
    },

    async requestRoomConfirmation(serverKey) {
      const server = this.servers.find(item => item.session_name === serverKey);
      if (!server) throw new Error(this.$t('commands.confirmation.missingServer'));
      await confirmAction(
        this.$t('commands.confirmation.message', { room: server.room_name }),
        this.$t('commands.confirmation.title'),
        {
          confirmButtonText: this.$t('commands.confirmation.execute'),
          cancelButtonText: this.$t('commands.actions.cancel'),
          type: 'warning'
        }
      );
      return server.room_name;
    },

    showRunResult(run) {
      const success = run.status === 'succeeded';
      this.executionResult = {
        success,
        status: run.status,
        warning: ['sent', 'uncertain'].includes(run.status),
        messageKey: success ? 'commands.feedback.sentToConsole' : 'commands.errors.executionFailed',
        detail: success ? '' : (run.errorMessage || run.message || '')
      };
    },

    showExecutionError(error) {
      const status = error?.run?.status || 'failed';
      const warning = ['sent', 'uncertain'].includes(status);
      this.executionResult = {
        success: false,
        status,
        warning,
        messageKey: 'commands.errors.execution',
        detail: '',
        error
      };
      const message = this.localizedError(error, 'commands.errors.execution');
      if (warning) toast.warning(message);
      else toast.error(message);
    },

    // 根据服务器ID获取服务器名称
    getServerNameById(sessionName) {
      const server = this.servers.find(s => s.session_name === sessionName);
      return server ? server.name : sessionName;
    },

    async loadCommandHistory() {
      const requestSequence = this.scopeRequestSequence;
      try {
        const runs = await commandApi.getCommandHistory(managementScopeTargetId(this.managementScope));
        if (requestSequence !== this.scopeRequestSequence) return;
        this.commandHistory = runs.map(run => this.mapHistoryRun(run));
      } catch (error) {
        if (requestSequence !== this.scopeRequestSequence) return;
        this.commandHistory = [];
        toast.error(this.localizedError(error, 'commands.errors.history'));
      }
    },

    mapHistoryRun(run) {
      const server = this.servers.find(item => item.room_id === run.roomId && item.world_id === run.worldId);
      const definition = this.commands.find(command => command.id === run.commandId);
      return {
        id: run.id,
        mode: run.mode === 'raw' ? 'raw' : 'structured',
        createdAt: run.createdAt,
        serverName: server?.name || `${run.roomId} - ${run.worldId}`,
        server: server?.session_name || `${run.roomId}::${run.worldId}`,
        commandId: run.commandId,
        commandName: definition ? this.commandDisplayText(definition, 'name') : run.name,
        params: run.arguments || {},
        command: run.rawCommand || '',
        status: run.status
      };
    },

    historyStatusVariant(status) {
      if (status === 'succeeded') return 'default';
      if (status === 'sending') return 'secondary';
      if (status === 'sent' || status === 'uncertain') return 'outline';
      return 'destructive';
    },

    // 清空历史记录
    async clearHistory() {
      try {
        await confirmAction(this.$t('commands.feedback.historyClearConfirm'), this.$t('commands.feedback.historyClearTitle'), {
          confirmButtonText: this.$t('commands.actions.confirm'),
          cancelButtonText: this.$t('commands.actions.cancel'),
          type: 'warning'
        });
        const deleted = await commandApi.clearCommandHistory(managementScopeTargetId(this.managementScope));
        await this.loadCommandHistory();
        toast.success(this.$t('commands.feedback.historyCleared', { count: deleted }));
      } catch (error) {
        if (error === 'cancel' || error === 'close') return;
        toast.error(this.localizedError(error, 'commands.errors.clearHistory'));
      }
    },

    // 保存历史记录到文件
    saveHistoryToFile() {
      const historyData = JSON.stringify(this.commandHistory, null, 2);
      const blob = new Blob([historyData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'command_history_' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },

    // 重新执行历史命令
    async rerunCommand(historyItem) {
      if (historyItem.mode === 'structured') {
        this.commandMode = 'structured';
        this.executeForm.server = historyItem.server;
        this.executeForm.commandId = historyItem.commandId;
        await this.handleCommandChange(historyItem.commandId);

        // 如果有参数，填充参数
        if (historyItem.params) {
          this.executeForm.params = {...historyItem.params};
        }

        toast.info(this.$t('commands.feedback.loadedForRerun'));
      } else {
        this.commandMode = 'raw';
        this.rawCommandForm.server = historyItem.server;
        this.rawCommandForm.command = historyItem.command;

        toast.info(this.$t('commands.feedback.loadedForRerun'));
      }
    },

    // 复制命令
    copyCommand(historyItem) {
      let textToCopy = '';

      if (historyItem.mode === 'raw') {
        textToCopy = historyItem.command;
      } else if (historyItem.mode === 'structured') {
        // 对于结构化命令，获取其实际执行的脚本
        const command = this.commands.find(cmd => cmd.id === historyItem.commandId);
        textToCopy = command ? (command.command || command.script) : '';
      } else if (historyItem.mode === 'batch') {
        // 对于批量命令，不支持直接复制
        toast.warning(this.$t('commands.feedback.batchCopyUnsupported'));
        return;
      }

      if (textToCopy) {
        // 使用Clipboard API复制文本
        navigator.clipboard.writeText(textToCopy).then(() => {
          toast.success(this.$t('commands.feedback.copied'));
        }).catch(() => {
          toast.error(this.$t('commands.errors.copy'));
        });
      }
    },

    // 应用常用命令
    applyCommonCommand(command) {
      this.rawCommandForm.command = command;
    },

    // 显示批量命令对话框
    showBatchCommandDialog() {
      this.batchCommandDialogVisible = true;
      this.batchCommandForm.server = this.rawCommandForm.server || '';
      this.batchResults = [];
      this.batchProgress = 0;
      this.batchStatus = '';
    },

    // 执行批量命令
    async executeBatchCommands() {
      if (!this.batchCommandForm.server) {
        toast.warning(this.$t('commands.feedback.selectServer'));
        return;
      }

      if (!this.batchCommandForm.commands.trim()) {
        toast.warning(this.$t('commands.feedback.enterCommandList'));
        return;
      }

      this.executingBatch = true;
      this.batchResults = [];
      this.batchProgress = 0;
      this.batchStatus = '';

      try {
        const commandLines = this.batchCommandForm.commands
          .split('\n')
          .filter(line => line.trim() && !line.trim().startsWith('#'));

        if (commandLines.length === 0) {
          toast.warning(this.$t('commands.feedback.noValidCommands'));
          this.executingBatch = false;
          return;
        }

        const totalCommands = commandLines.length;
        let executedCount = 0;
        const confirmation = await this.requestRoomConfirmation(this.batchCommandForm.server);

        for (const command of commandLines) {
          try {
            const run = await commandApi.executeRawCommand(
              this.batchCommandForm.server,
              command.trim(),
              confirmation
            );
            this.batchResults.push({
              command: command.trim(),
              success: run.status === 'succeeded',
              message: run.status === 'succeeded' ? '' : (run.errorMessage || run.message || '')
            });

            executedCount++;
            this.batchProgress = Math.floor((executedCount / totalCommands) * 100);

            if (executedCount < totalCommands) {
              await new Promise(resolve => setTimeout(resolve, this.batchCommandForm.interval));
            }
          } catch (error) {
            this.batchResults.push({
              command: command.trim(),
              success: false,
              message: this.localizedError(error, 'commands.errors.batchItem')
            });

            executedCount++;
            this.batchProgress = Math.floor((executedCount / totalCommands) * 100);

            if (executedCount < totalCommands) {
              await new Promise(resolve => setTimeout(resolve, this.batchCommandForm.interval));
            }
          }
        }

        const successCount = this.batchResults.filter(r => r.success).length;
        this.batchStatus = successCount === totalCommands ? 'success' : 'exception';
        const summary = this.$t('commands.feedback.batchSummary', {
          total: totalCommands,
          success: successCount,
          failed: totalCommands - successCount
        });
        if (successCount === totalCommands) toast.success(summary);
        else if (successCount > 0) toast.warning(summary);
        else toast.error(summary);
        await this.loadCommandHistory();
      } catch (error) {
        if (error === 'cancel' || error === 'close') return;
        this.batchStatus = 'exception';
        toast.error(this.localizedError(error, 'commands.errors.batch'));
      } finally {
        this.executingBatch = false;
      }
    }
  }
};
</script>

<style scoped>
.command-manager-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}

.content-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.page-header,
.form-actions,
.section-heading,
.table-actions,
.input-action,
.loading-state,
.parameter-grid {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-header {
  justify-content: space-between;
  align-items: flex-start;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.page-header p {
  margin: 4px 0 0;
  color: var(--muted-foreground);
  font-size: 14px;
}

.section-heading {
  justify-content: space-between;
  align-items: flex-start;
  flex-direction: row;
}

.form-actions,
.table-actions,
.type-filter {
  flex-wrap: wrap;
}

.subheading,
.section-heading h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.command-preview,
.parameter-editor {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--muted);
}

.command-preview pre {
  margin: 8px 0 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.input-action > :first-child {
  flex: 1;
}

.common-command-popover {
  width: min(420px, calc(100vw - 32px));
}

.common-command-list {
  display: flex;
  flex-direction: column;
  max-height: 300px;
  margin-top: 8px;
  overflow-y: auto;
}

.common-command-item {
  display: flex;
  height: auto;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px;
  white-space: normal;
  text-align: left;
}

.common-command-list span {
  color: var(--muted-foreground);
  font-size: 12px;
}

.command-history {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.truncate-cell {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.command-skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
}

.parameter-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.batch-result-list {
  max-height: 200px;
  overflow-y: auto;
  margin-top: 15px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.batch-result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 15px;
  border-bottom: 1px solid var(--border);
}

.batch-result-item:last-child {
  border-bottom: none;
}

.batch-command {
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 10px;
  max-width: 80%;
}

@media (max-width: 768px) {
  .page-header,
  .section-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .parameter-grid {
    grid-template-columns: 1fr;
  }

  .input-action {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
