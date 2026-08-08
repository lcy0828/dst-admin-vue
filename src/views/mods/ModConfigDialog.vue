<template>
  <Sheet :open="dialogVisible" @update:open="handleSheetOpenChange">
    <SheetContent side="right" class="mod-config-sheet">
      <SheetHeader>
        <SheetTitle>模组配置 - {{ modInfo ? modInfo.name || '未命名模组' : '加载中...' }}</SheetTitle>
        <SheetDescription>修改当前世界的模组配置选项。</SheetDescription>
      </SheetHeader>

      <ScrollArea class="config-scroll-area">
        <div v-if="loading" class="loading-container"><Spinner /><p>加载模组配置中...</p></div>

        <template v-else-if="modInfo">
          <div v-if="hasOptions" class="reset-button-container">
            <UiButton size="sm" variant="outline" @click="resetToDefault">
              <RotateCcw data-icon="inline-start" />重置为默认配置
            </UiButton>
          </div>

          <Alert v-if="modInfo.description">
            <Info />
            <AlertTitle>模组描述</AlertTitle>
            <AlertDescription>{{ modInfo.description }}</AlertDescription>
          </Alert>

          <FieldGroup v-if="hasOptions" class="config-form">
            <Field v-for="option in allOptions" :key="option.name" :orientation="isBooleanOption(option) ? 'horizontal' : 'vertical'">
              <FieldContent>
                <div class="field-label-row">
                  <FieldLabel :for="`mod-option-${option.name}`">{{ option.label }}</FieldLabel>
                  <Tooltip v-if="option.hover">
                    <TooltipTrigger as-child>
                      <UiButton type="button" variant="ghost" size="icon-xs" :aria-label="`查看 ${option.label} 说明`"><CircleHelp /></UiButton>
                    </TooltipTrigger>
                    <TooltipContent>{{ option.hover }}</TooltipContent>
                  </Tooltip>
                </div>
                <FieldDescription v-if="isBooleanOption(option)">{{ configForm[option.name] ? '开启' : '关闭' }}</FieldDescription>
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
                <SelectTrigger :id="`mod-option-${option.name}`"><SelectValue placeholder="请选择" /></SelectTrigger>
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
            <EmptyHeader><EmptyTitle>该模组没有配置选项</EmptyTitle><EmptyDescription>仍可直接启用或停用该模组。</EmptyDescription></EmptyHeader>
          </Empty>
        </template>

        <Empty v-else>
          <EmptyHeader><EmptyTitle>无法加载模组信息</EmptyTitle></EmptyHeader>
        </Empty>
      </ScrollArea>

      <SheetFooter>
        <UiButton variant="outline" @click="handleClose">取消</UiButton>
        <UiButton @click="saveConfig" :disabled="saving">
          <Spinner v-if="saving" data-icon="inline-start" />保存配置
        </UiButton>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>

<script>
import { CircleHelp, Info, RotateCcw } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { modApi } from '@/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button as UiButton } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Switch as UiSwitch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { confirmAction } from '@/lib/feedback';

export default {
  name: 'ModConfigDialog',
  components: {
    Alert,
    AlertDescription,
    AlertTitle,
    CircleHelp,
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
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    Spinner,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    UiButton,
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
    }
  },
  data() {
    return {
      dialogVisible: false,
      loading: false,
      saving: false,
      configForm: {},
      originalConfig: {},
      defaultConfig: {},
      userCustomConfig: {},
      configRevision: '',
      configuredEnabled: true,
      isInitialized: false,
      keepAliveInterval: null
    };
  },
  computed: {
    // 是否有配置选项
    hasOptions() {
      return this.modInfo && 
        this.modInfo.configuration_options && 
        this.modInfo.configuration_options.length > 0;
    },
    
    // 所有配置选项(已扁平化)
    allOptions() {
      if (!this.hasOptions) return [];
      return this.modInfo.configuration_options.filter(option => 
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
          this.setupKeepAliveTimer();
        });
      } else {
        this.clearKeepAliveTimer();
      }
    },
    dialogVisible(newVal) {
      if (!newVal) {
        this.$emit('update:modelValue', false);
        this.clearKeepAliveTimer();
      } else {
        this.setupKeepAliveTimer();
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
    handleSheetOpenChange(open) {
      if (open) {
        this.dialogVisible = true;
        return;
      }
      this.handleClose();
    },
    // 重置组件状态
    resetComponentState() {
      this.isInitialized = false;
      this.loading = false;
      this.saving = false;
      this.configForm = {};
      this.originalConfig = {};
      this.defaultConfig = {};
      this.userCustomConfig = {};
      this.configRevision = '';
      this.configuredEnabled = true;
      // 清除定时器
      this.clearKeepAliveTimer();
    },
    
    // 设置保持对话框活跃的定时器
    setupKeepAliveTimer() {
      this.clearKeepAliveTimer();
      this.keepAliveInterval = setInterval(() => {
        if (!this.dialogVisible) {
          this.clearKeepAliveTimer();
        }
      }, 5000);
    },
    
    // 清除定时器
    clearKeepAliveTimer() {
      if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = null;
      }
    },
    
    // 初始化配置
    async initializeConfig() {
      if (this.isInitialized) return;
      if (!this.modInfo) return;
      
      this.isInitialized = true;
      this.loading = true;
      
      this.configForm = {};
      this.originalConfig = {};
      this.defaultConfig = {};
      this.userCustomConfig = {};
      
      try {
        await this.getUserCustomConfig();
        if (this.modInfo.configuration_options) {
          this.initializeConfigFromData(this.modInfo.configuration_options);
        }
      } catch (error) {
        this.isInitialized = false;
      } finally {
        this.loading = false;
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
            this.configRevision = res.modinfo.revision;
            this.configuredEnabled = res.modinfo.enabled;
          }
        })
        .catch(err => {
          console.error('获取用户自定义配置失败', err);
          toast.error(`获取用户自定义配置失败：${err.message || '未知错误'}`);
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
              opt.description && opt.description.includes('默认')
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
      confirmAction('确定要重置所有配置为默认值吗？', '确认重置', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.configForm = JSON.parse(JSON.stringify(this.defaultConfig));
        toast.success('配置已重置为默认值');
      }).catch(() => {});
    },
    
    // 保存配置
    saveConfig() {
      if (this.saving) return;
      const prepared = this.prepareConfigForSubmit(this.configForm);
      const changedConfig = Object.fromEntries(
        Object.entries(prepared).filter(([key, value]) =>
          JSON.stringify(value) !== JSON.stringify(this.originalConfig[key])
        )
      );
      const enabled = this.modInfo?.configuration?.enabled ?? this.configuredEnabled;
      if (Object.keys(changedConfig).length === 0 && enabled === this.configuredEnabled) {
        toast.info('没有需要保存的配置变更');
        return;
      }

      this.saving = true;
      const customConfigData = {
        roomId: this.roomId,
        worldId: this.worldId,
        modid: this.modId,
        expectedRevision: this.configRevision,
        configuration_options: changedConfig,
        enabled
      };
      
      // 只使用新接口保存用户自定义配置
      modApi.saveModCustomConfig(customConfigData)
        .then(() => {
          this.originalConfig = JSON.parse(JSON.stringify(this.configForm));
          
          this.$emit('config-updated', {
            modId: this.modId,
            configData: this.configForm
          });
          
          this.dialogVisible = false;
          
          toast.success('配置已保存');
        })
        .catch(error => {
          toast.error(`保存模组配置失败：${error.message || '未知错误'}`);
        })
        .finally(() => {
          this.saving = false;
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
      if (!this.modInfo || !this.modInfo.configuration_options) return null;
      return this.modInfo.configuration_options.find(option => option.name === name);
    },
    
    // 处理配置变更
    handleConfigChange(optionName) {
      return this.configForm[optionName];
    },
    
    // 关闭对话框
    handleClose(done) {
      let hasChanges = false;
      
      for (const key in this.configForm) {
        if (this.configForm[key] !== this.originalConfig[key]) {
          hasChanges = true;
          break;
        }
      }
      
      if (hasChanges) {
        confirmAction('您有未保存的配置更改，确定要关闭吗？', '关闭模组配置', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          if (typeof done === 'function') done();
          else this.dialogVisible = false;
          this.clearKeepAliveTimer();
        }).catch(() => {});
      } else {
        if (typeof done === 'function') done();
        else this.dialogVisible = false;
        this.clearKeepAliveTimer();
      }
    }
  },
  beforeUnmount() {
    this.resetComponentState();
  }
};
</script>

<style scoped>
.mod-config-sheet {
  width: min(680px, 96vw);
  max-width: min(680px, 96vw);
}

.config-scroll-area {
  height: calc(100vh - 150px);
  padding: 0 18px 18px;
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
  margin-top: 16px;
}

.field-label-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

@media (max-width: 640px) {
  .mod-config-sheet {
    width: 100vw;
    max-width: 100vw;
  }
}
</style>
