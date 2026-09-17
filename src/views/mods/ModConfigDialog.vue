<template>
  <UiDialog :open="dialogVisible" @update:open="handleDialogOpenChange">
    <DialogContent class="mod-config-dialog sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>{{ $t('mods.config.title', { name: activeModInfo ? activeModInfo.name || $t('mods.config.unnamed') : $t('mods.config.loadingName') }) }}</DialogTitle>
        <DialogDescription class="space-y-1">
          <span class="block">{{ configurationScope === 'room' ? $t('mods.config.roomDescription', { count: effectiveWorldIds.length }) : $t('mods.config.description', { world: worldName || worldId }) }}</span>
          <span class="block">{{ $t(configurationScope === 'room' ? 'mods.config.roomSaveBehaviorDescription' : 'mods.config.saveBehaviorDescription', { count: effectiveWorldIds.length }) }}</span>
        </DialogDescription>
      </DialogHeader>

      <div v-if="configurationScope !== 'room'" class="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          <Server />
          {{ configTargetLabel }}
        </Badge>
      </div>

      <ScrollArea class="config-scroll-area">
        <div v-if="loading" class="loading-container"><Spinner /><p>{{ $t('mods.config.loading') }}</p></div>

        <Alert v-else-if="loadError" variant="destructive">
          <TriangleAlert />
          <AlertTitle>{{ $t('mods.config.loadFailedTitle') }}</AlertTitle>
          <AlertDescription>{{ loadError }}</AlertDescription>
          <AlertAction><UiButton size="sm" variant="outline" @click="initializeConfig">{{ $t('mods.actions.retry') }}</UiButton></AlertAction>
        </Alert>

        <template v-else-if="activeModInfo">
          <div v-if="hasOptions" class="reset-button-container">
            <UiButton size="sm" variant="outline" @click="resetToDefault">
              <RotateCcw data-icon="inline-start" />{{ $t('mods.actions.resetDefaults') }}
            </UiButton>
          </div>

          <Alert v-if="activeModInfo.description">
            <Info />
            <AlertTitle>{{ $t('mods.config.modDescription') }}</AlertTitle>
            <AlertDescription>{{ activeModInfo.description }}</AlertDescription>
          </Alert>

          <FieldGroup v-if="hasOptions" class="config-form">
            <Field v-for="option in allOptions" :key="option.name" :orientation="isBooleanOption(option) ? 'horizontal' : 'vertical'">
              <FieldContent>
                <div class="field-label-row">
                  <FieldLabel :for="`mod-option-${option.name}`">{{ option.label }}</FieldLabel>
                  <Tooltip v-if="option.hover">
                    <TooltipTrigger as-child>
                      <UiButton type="button" variant="ghost" size="icon-xs" :aria-label="$t('mods.config.optionHelp', { label: option.label })"><CircleHelp /></UiButton>
                    </TooltipTrigger>
                    <TooltipContent>{{ option.hover }}</TooltipContent>
                  </Tooltip>
                </div>
                <FieldDescription v-if="isBooleanOption(option)">{{ $t(configForm[option.name] ? 'mods.values.on' : 'mods.values.off') }}</FieldDescription>
              </FieldContent>

              <UiSwitch
                v-if="isBooleanOption(option)"
                :id="`mod-option-${option.name}`"
                v-model="configForm[option.name]"
                @update:model-value="handleConfigChange(option.name)"
              />

              <UiSelect
                v-else-if="option.options && option.options.length > 0"
                v-model="configForm[option.name]"
                @update:model-value="handleConfigChange(option.name)"
              >
                <SelectTrigger :id="`mod-option-${option.name}`"><SelectValue :placeholder="$t('mods.config.selectOption')" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem v-for="(opt, idx) in option.options" :key="idx" :value="opt.data">{{ opt.description }}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </UiSelect>

              <UiInput
                v-else
                :id="`mod-option-${option.name}`"
                :model-value="configForm[option.name]"
                :type="option.type === 'number' ? 'number' : 'text'"
                @update:model-value="value => updateTextOption(option, value)"
                @change="handleConfigChange(option.name)"
              />
            </Field>
          </FieldGroup>

          <Empty v-else>
            <EmptyHeader><EmptyTitle>{{ $t('mods.config.emptyTitle') }}</EmptyTitle><EmptyDescription>{{ $t('mods.config.emptyDescription') }}</EmptyDescription></EmptyHeader>
          </Empty>
        </template>

        <Empty v-else>
          <EmptyHeader><EmptyTitle>{{ $t('mods.config.unavailable') }}</EmptyTitle></EmptyHeader>
        </Empty>
      </ScrollArea>

      <DialogFooter class="mod-config-footer">
        <div class="save-state" :class="saveJob && ['failed', 'canceled'].includes(saveJob.status) && 'save-state-error'" aria-live="polite" role="status">
          <template v-if="saveJob">
            <TriangleAlert v-if="saveJob.status === 'failed' || saveJob.status === 'canceled'" />
            <Spinner v-else-if="saving && saveJob.status !== 'succeeded'" />
            <CircleCheck v-else />
            <span class="save-state-copy" :title="`${saveJobTitle}：${saveJobDescription}`">{{ saveJobTitle }} · {{ saveJobDescription }}</span>
          </template>
        </div>
        <div class="save-actions">
          <UiButton variant="outline" @click="handleClose">{{ $t('mods.actions.cancel') }}</UiButton>
          <UiButton @click="saveConfig" :disabled="saving || loading || Boolean(loadError) || !modInfo">
            <Spinner v-if="saving" data-icon="inline-start" />{{ $t('mods.actions.saveConfig') }}
          </UiButton>
        </div>
      </DialogFooter>
    </DialogContent>
  </UiDialog>
</template>

<script>
import { CircleCheck, CircleHelp, Info, RotateCcw, TriangleAlert } from '@lucide/vue';
import { Server } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { modApi } from '@/api';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button as UiButton } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch as UiSwitch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { createModFailure, formatModFailure } from '@/i18n/modMessages';
import { confirmAction } from '@/lib/feedback';

export default {
  name: 'ModConfigDialog',
  components: {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
    Badge,
    CircleCheck,
    CircleHelp,
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
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    Info,
    RotateCcw,
    ScrollArea,
    Server,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Spinner,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TriangleAlert,
    UiButton,
    UiDialog,
    UiInput,
    UiSelect,
    UiSwitch
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    modId: {
      type: String,
      default: null
    },
    modInfo: {
      type: Object,
      default: null
    },
    isNewMod: {
      type: Boolean,
      default: false
    },
    roomId: {
      type: String,
      default: ''
    },
    worldId: {
      type: String,
      default: ''
    },
    worldName: {
      type: String,
      default: ''
    },
    targetId: {
      type: String,
      default: ''
    },
    targetName: {
      type: String,
      default: ''
    },
    expectedTopologyRevision: {
      type: String,
      default: ''
    },
    configurationScope: {
      type: String,
      default: 'world'
    },
    worldIds: {
      type: Array,
      default: () => []
    },
    expectedRevisions: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      dialogVisible: false,
      loading: false,
      loadFailure: null,
      saving: false,
      saveJob: null,
      configForm: {},
      originalConfig: {},
      defaultConfig: {},
      userCustomConfig: {},
      customOverrides: {},
      resetRequested: false,
      configRevision: '',
      configRequestId: 0,
      configWorldRevisions: {},
      configuredEnabled: true,
      topologyRevision: '',
      resolvedTargetId: '',
      resolvedTargetName: '',
      isInitialized: false,
      resolvedModInfo: null
    };
  },
  computed: {
    loadError() {
      return formatModFailure(this.$t, this.loadFailure);
    },
    // 是否有配置选项
    hasOptions() {
      return this.activeModInfo &&
        this.activeModInfo.configuration_options &&
        this.activeModInfo.configuration_options.length > 0;
    },
    activeModInfo() {
      return this.resolvedModInfo || this.modInfo;
    },
    effectiveWorldIds() {
      return this.worldIds.length > 0 ? this.worldIds : [this.worldId].filter(Boolean);
    },
    configTargetLabel() {
      if (this.configurationScope === 'room') {
        return this.$t('mods.config.roomTarget', { count: this.effectiveWorldIds.length });
      }
      const target = this.targetName || this.resolvedTargetName || this.targetId || this.resolvedTargetId;
      return target
        ? this.$t('mods.config.target', { target })
        : this.$t('mods.config.targetUnknown');
    },
    saveJobTitle() {
      if (this.saveJob?.status === 'succeeded') return this.$t('mods.config.feedback.saveCompletedTitle');
      if (this.saveJob?.status === 'failed' || this.saveJob?.status === 'canceled') return this.$t('mods.config.feedback.saveFailedTitle');
      return this.$t('mods.config.feedback.savingTitle');
    },
    saveJobDescription() {
      if (this.saveJob?.status === 'succeeded') return this.$t('mods.config.feedback.saved');
      if (this.saveJob?.status === 'failed' || this.saveJob?.status === 'canceled') {
        return this.saveJob?.error?.message || this.saveJob?.message || this.$t('mods.config.feedback.saveFailedDescription');
      }
      return this.$t('mods.config.feedback.savingDescription');
    },
    // 所有配置选项(已扁平化)
    allOptions() {
      if (!this.hasOptions) return [];
      return this.activeModInfo.configuration_options.filter(option =>
        option.name && option.name !== "Title" && option.name !== "null"
      );
    }
  },
  watch: {
    modelValue(newVal) {
      this.dialogVisible = newVal;
      if (newVal) {
        // 确保在打开对话框时重置状态
        this.resetComponentState();
        this.$nextTick(() => {
          // 如果已有模组信息，立即初始化
          if (this.modInfo) {
            this.initializeConfig();
          }
        });
      }
    },
    dialogVisible(newVal) {
      if (!newVal) {
        this.$emit('update:modelValue', false);
      }
    },
    modInfo: {
      handler(newModInfo) {
        if (newModInfo && this.dialogVisible && !this.isInitialized) {
          this.$nextTick(() => {
            this.initializeConfig();
          });
        }
      },
      immediate: true
    }
  },
  methods: {
    handleDialogOpenChange(open) {
      if (open) {
        this.dialogVisible = true;
        return;
      }
      this.handleClose();
    },
    // 重置组件状态
    resetComponentState() {
      this.configRequestId += 1;
      this.isInitialized = false;
      this.loading = false;
      this.loadFailure = null;
      this.saving = false;
      this.saveJob = null;
      this.configForm = {};
      this.originalConfig = {};
      this.defaultConfig = {};
      this.userCustomConfig = {};
      this.customOverrides = {};
      this.resetRequested = false;
      this.configRevision = '';
      this.configWorldRevisions = { ...this.expectedRevisions };
      this.configuredEnabled = true;
      this.topologyRevision = '';
      this.resolvedTargetId = '';
      this.resolvedTargetName = '';
      this.resolvedModInfo = null;
    },
    
    // 初始化配置
    async initializeConfig() {
      if (this.isInitialized) return;
      if (!this.modInfo) return;
      const requestId = this.configRequestId;
      
      this.isInitialized = true;
      this.loading = true;
      this.loadFailure = null;
      
      this.configForm = {};
      this.originalConfig = {};
      this.defaultConfig = {};
      this.userCustomConfig = {};
      this.customOverrides = {};
      this.resetRequested = false;
      
      try {
        const [response, topology] = await Promise.all([
          modApi.getModConfig({
            roomId: this.roomId,
            worldId: this.worldId,
            modid: this.modId,
            mod: this.modInfo
          }),
          this.expectedTopologyRevision
            ? Promise.resolve(null)
            : modApi.getRoomTopology(this.roomId).catch(() => null)
        ]);
        if (requestId !== this.configRequestId) return;
        this.topologyRevision = this.expectedTopologyRevision || topology?.revision || topology?.topologyRevision || '';
        const placement = (topology?.placements || []).find(item => item.worldId === this.worldId);
        const target = (topology?.targets || []).find(item => item.id === placement?.appliedTargetId);
        this.resolvedTargetId = this.targetId || placement?.appliedTargetId || '';
        this.resolvedTargetName = this.targetName || target?.name || '';
        this.resolvedModInfo = response.modinfo;
        const configuration = response.modinfo.configuration || {};
        this.userCustomConfig = configuration.values || {};
        this.customOverrides = configuration.overrides || {};
        this.configRevision = configuration.revision || '';
        this.configWorldRevisions = { ...this.configWorldRevisions, [this.worldId]: this.configRevision };
        this.configuredEnabled = configuration.enabled !== false;
        if (this.activeModInfo.configuration_options) {
          this.initializeConfigFromData(this.activeModInfo.configuration_options);
        }
      } catch (error) {
        if (requestId !== this.configRequestId) return;
        this.isInitialized = false;
        this.loadFailure = createModFailure('mods.errors.config', error);
      } finally {
        if (requestId === this.configRequestId) this.loading = false;
      }
    },
    
    // 获取用户自定义配置
    getUserCustomConfig() {
      if (!this.modId) {
        return Promise.resolve();
      }
      
      return modApi.getModCustomConfig({
        roomId: this.roomId,
        worldId: this.worldId,
        modid: this.modId
      })
        .then(res => {
          if (res && res.modinfo && res.modinfo.configuration_options) {
            this.userCustomConfig = res.modinfo.configuration_options;
            this.customOverrides = res.modinfo.overridden_configuration_options || {};
            this.configRevision = res.modinfo.revision;
            this.configuredEnabled = res.modinfo.enabled;
          }
        })
        .catch(err => {
          console.error('获取用户自定义配置失败', err);
          toast.error(formatModFailure(this.$t, createModFailure('mods.errors.customConfig', err)));
          throw err;
        });
    },
    
    // 从数据初始化配置表单
    initializeConfigFromData(configOptions) {
      if (!Array.isArray(configOptions)) return;
      
      configOptions.forEach(option => {
        if (!option.name || option.name === "Title" || option.name === "null") return;
        
        try {
          const parsedValue = this.parseOptionValue(option.default);
          
          // 检查是否有用户自定义配置
          const hasUserConfig = Object.prototype.hasOwnProperty.call(this.userCustomConfig, option.name);
          const userValue = hasUserConfig ? this.userCustomConfig[option.name] : undefined;
          
          if (userValue !== undefined) {
            // 使用用户自定义配置
            this.configForm[option.name] = userValue;
            this.originalConfig[option.name] = userValue;
            // 默认值仍保留原始默认值
            this.defaultConfig[option.name] = parsedValue;
          } else if (parsedValue === undefined && option.options && option.options.length > 0) {
            const defaultOption = option.options.find(opt => 
              opt.description && (opt.description.includes('默认') || /\bdefault\b/i.test(opt.description))
            );
            if (defaultOption) {
              this.configForm[option.name] = defaultOption.data;
              this.originalConfig[option.name] = defaultOption.data;
              this.defaultConfig[option.name] = defaultOption.data;
              return;
            }
          } else {
            // 使用默认值
            this.configForm[option.name] = parsedValue;
            this.originalConfig[option.name] = parsedValue;
            this.defaultConfig[option.name] = parsedValue;
          }
        } catch (error) {
          console.error(`解析选项 ${option.name} 的默认值失败`, error);
        }
      });
      
      this.configForm = {...this.configForm};
      this.originalConfig = {...this.originalConfig};
      this.defaultConfig = {...this.defaultConfig};
    },
    
    // 解析配置值
    parseOptionValue(value) {
      if (value === undefined || value === null) return value;
      
      try {
        if (typeof value === 'string') {
          const lowerValue = value.toLowerCase();
          if (lowerValue === 'true') return true;
          if (lowerValue === 'false') return false;
          
          if (!isNaN(value) && value !== '') {
            return Number(value);
          }
        }
        return value;
      } catch (error) {
        return value;
      }
    },
    
    // 判断是否是布尔选项
    isBooleanOption(option) {
      if (option.type === 'boolean') return true;
      if (!option.options || !Array.isArray(option.options) || option.options.length !== 2) {
        return false;
      }
      
      const values = option.options.map(opt => String(opt.data).toLowerCase());
      return values.includes('true') && values.includes('false');
    },

    updateTextOption(option, value) {
      if (option.type === 'number' && value !== '') {
        const numeric = Number(value);
        this.configForm[option.name] = Number.isFinite(numeric) ? numeric : value;
      } else {
        this.configForm[option.name] = value;
      }
    },
    
    // 重置为默认配置
    resetToDefault() {
      this.configForm = JSON.parse(JSON.stringify(this.defaultConfig));
      this.resetRequested = true;
      toast.success(this.$t('mods.config.feedback.resetSuccess'));
    },
    
    // 保存配置
    async saveConfig() {
      if (this.saving) return;
      const requestId = this.configRequestId;
      const prepared = this.prepareConfigForSubmit(this.configForm);
      let changedConfig;
      if (this.configurationScope === 'room') {
        changedConfig = Object.fromEntries(
          this.allOptions.map(option => [
            option.name,
            prepared[option.name] === undefined ? null : prepared[option.name]
          ])
        );
      } else {
        changedConfig = Object.fromEntries(
          Object.entries(prepared).filter(([key, value]) =>
            JSON.stringify(value) !== JSON.stringify(this.originalConfig[key])
          )
        );
      }
      if (this.resetRequested && this.configurationScope !== 'room') {
        changedConfig = Object.fromEntries(
          Object.keys(this.customOverrides)
            .filter(key => this.findOptionByName(key))
            .map(key => [key, null])
        );
        for (const [key, value] of Object.entries(prepared)) {
          if (JSON.stringify(value) !== JSON.stringify(this.defaultConfig[key])) {
            changedConfig[key] = value;
          }
        }
      }
      const enabled = this.activeModInfo?.configuration?.enabled ?? this.configuredEnabled;
      if (this.configurationScope !== 'room' && Object.keys(changedConfig).length === 0 && enabled === this.configuredEnabled) {
        this.resetRequested = false;
        toast.info(this.$t('mods.config.feedback.noChanges'));
        return;
      }

      this.saving = true;
      this.saveJob = { status: 'running' };
      const customConfigData = {
        roomId: this.roomId,
        worldId: this.worldId,
        modid: this.modId,
        expectedRevision: this.configRevision,
        configuration_options: changedConfig,
        enabled
      };
      
      // 只使用新接口保存用户自定义配置
      try {
        const result = await this.persistConfig(customConfigData);
        if (requestId !== this.configRequestId) return;
        this.saveJob = {
          ...(this.saveJob || {}),
          status: result?.result?.status || 'succeeded',
          progress: 100
        };
        const saved = result?.result || {};
        const revisions = { ...(saved.revisions || {}) };
        if (saved.revision) revisions[this.worldId] = saved.revision;
        this.configWorldRevisions = { ...this.configWorldRevisions, ...revisions };
        this.configRevision = revisions[this.worldId] || this.configRevision;
        const overrides = { ...this.customOverrides };
        for (const [key, value] of Object.entries(changedConfig)) {
          if (value === null) delete overrides[key];
          else overrides[key] = value;
        }
        this.customOverrides = overrides;
        this.userCustomConfig = { ...this.defaultConfig, ...overrides };
        this.configForm = { ...prepared };
        this.originalConfig = { ...prepared };
        this.resetRequested = false;
        this.resolvedModInfo = {
          ...this.activeModInfo,
          configuration: {
            ...this.activeModInfo?.configuration,
            revision: this.configRevision,
            values: this.userCustomConfig,
            overrides
          }
        };
        this.$emit('config-updated', {
          roomId: this.roomId,
          modId: this.modId,
          configData: this.configForm,
          revisions
        });
        toast.success(this.$t('mods.config.feedback.saved'));
      } catch (error) {
        if (requestId !== this.configRequestId) return;
        this.saveJob = {
          ...(this.saveJob || {}),
          status: error?.code === 'JOB_CANCELED' ? 'canceled' : 'failed',
          progress: 100,
          error: { message: formatModFailure(this.$t, createModFailure('mods.errors.saveConfig', error)) }
        };
        toast.error(formatModFailure(this.$t, createModFailure('mods.errors.saveConfig', error)));
      } finally {
        if (requestId === this.configRequestId) this.saving = false;
      }
    },

    async persistConfig(customConfigData) {
      const requestId = this.configRequestId;
      const targetId = this.targetId || this.resolvedTargetId;
      return modApi.saveModConfigurationForWorld({
        ...customConfigData,
        sourceWorldId: this.configurationScope === 'room' ? this.worldId : '',
        worldIds: this.effectiveWorldIds,
        expectedRevisions: this.configurationScope === 'room' ? this.configWorldRevisions : {},
        preserveEnabled: this.configurationScope === 'room',
        targetId,
        expectedTopologyRevision: this.topologyRevision,
        onProgress: job => {
          if (requestId === this.configRequestId) this.saveJob = job;
        }
      });
    },
    
    // 准备提交数据
    prepareConfigForSubmit(configData) {
      const result = {};
      
      Object.keys(configData).forEach(key => {
        const value = configData[key];
        const option = this.findOptionByName(key);
        
        if (option && option.options && option.options.length > 0) {
          const matchingOption = option.options.find(opt => opt.data === value);
          result[key] = matchingOption ? matchingOption.data : value;
        } else {
          result[key] = value;
        }
      });
      
      return result;
    },
    
    // 查找选项定义
    findOptionByName(name) {
      if (!this.activeModInfo || !this.activeModInfo.configuration_options) return null;
      return this.activeModInfo.configuration_options.find(option => option.name === name);
    },
    
    // 处理配置变更
    handleConfigChange(optionName) {
      return this.configForm[optionName];
    },

    hasUnsavedChanges() {
      if (this.resetRequested && Object.keys(this.customOverrides).some(key => this.findOptionByName(key))) return true;
      return Object.keys(this.configForm).some(key =>
        JSON.stringify(this.configForm[key]) !== JSON.stringify(this.originalConfig[key])
      );
    },
    
    // 关闭对话框
    handleClose(done) {
      if (this.hasUnsavedChanges()) {
        confirmAction(this.$t('mods.config.feedback.unsavedConfirm'), this.$t('mods.config.feedback.closeTitle'), {
          confirmButtonText: this.$t('mods.actions.confirm'),
          cancelButtonText: this.$t('mods.actions.cancel'),
          type: 'warning'
        }).then(() => {
          if (typeof done === 'function') done();
          else this.dialogVisible = false;
        }).catch(() => {});
      } else {
        if (typeof done === 'function') done();
        else this.dialogVisible = false;
      }
    }
  },
  beforeUnmount() {
    this.resetComponentState();
  }
};
</script>

<style scoped>
.mod-config-dialog {
  display: grid;
  max-height: min(90vh, 900px);
  grid-template-rows: auto minmax(0, 1fr) auto;
}

.config-scroll-area {
  min-height: 220px;
  max-height: min(68vh, 680px);
  padding-right: 12px;
}

.mod-config-footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.save-state {
  display: flex;
  min-width: 0;
  min-height: 40px;
  align-items: center;
  gap: 8px;
  color: var(--muted-foreground);
  font-size: 0.8125rem;
}

.save-state > :first-child {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
}

.save-state-copy {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.save-state-error {
  color: var(--destructive);
}

.save-actions {
  display: flex;
  gap: 8px;
}

.loading-container {
  display: flex;
  min-height: 240px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: var(--muted-foreground);
}

.reset-button-container {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.config-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.field-label-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

@media (max-width: 768px) {
  .mod-config-footer {
    grid-template-columns: minmax(0, 1fr);
  }

  .save-actions {
    justify-content: flex-end;
  }

  .config-form {
    grid-template-columns: minmax(0, 1fr);
  }
}

</style>
