<template>
  <div class="presets-section">
    <div class="preset-title">
      <span>快速预设</span>
      <Tooltip>
        <TooltipTrigger as-child>
          <UiButton variant="ghost" size="icon-xs" aria-label="查看预设说明" title="查看预设说明"><CircleHelpIcon /></UiButton>
        </TooltipTrigger>
        <TooltipContent>根据预设快速配置所有设置项</TooltipContent>
      </Tooltip>
    </div>
    <div class="preset-options">
      <ToggleGroup v-model="selectedPreset" type="single" variant="outline" :spacing="1">
        <ToggleGroupItem value="default">默认设置</ToggleGroupItem>
        <ToggleGroupItem value="easy">简单模式</ToggleGroupItem>
        <ToggleGroupItem value="hard">困难模式</ToggleGroupItem>
        <ToggleGroupItem value="abundant">资源丰富</ToggleGroupItem>
        <ToggleGroupItem value="scarce">资源稀缺</ToggleGroupItem>
        <ToggleGroupItem value="custom">自定义</ToggleGroupItem>
      </ToggleGroup>
      <UiButton
        variant="secondary"
        size="sm"
        @click="handleSavePreset"
        :disabled="selectedPreset !== 'custom' || disabled"
      >
        <StarIcon data-icon="inline-start" />
        保存为预设
      </UiButton>
    </div>
  </div>
</template>

<script>
import { CircleHelpIcon, StarIcon } from '@lucide/vue'
import { Button as UiButton } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export default {
  name: 'SettingsPreset',
  components: {
    CircleHelpIcon,
    StarIcon,
    ToggleGroup,
    ToggleGroupItem,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    UiButton
  },
  props: {
    currentPreset: {
      type: String,
      default: 'default'
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    selectedPreset: {
      get() {
        return this.currentPreset;
      },
      set(value) {
        // 使用事件通知父组件
        this.$emit('preset-change', value);
      }
    }
  },
  methods: {
    handleSavePreset() {
      this.$emit('save-preset');
    }
  }
}
</script>

<style scoped>
.presets-section {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.preset-title {
  margin-bottom: 10px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 5px;
}

.preset-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

@media (max-width: 768px) {
  .preset-options {
    flex-direction: column;
    align-items: stretch;
  }

  .preset-options [data-slot="toggle-group"] {
    max-width: 100%;
    justify-content: flex-start;
    overflow-x: auto;
  }
}
</style>
