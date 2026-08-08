<template>
  <div class="presets-section">
    <div class="preset-title">
      <span>快速预设：</span>
      <el-tooltip content="根据预设快速配置所有设置项" placement="top">
        <component :is="'el-icon-question'" class="legacy-icon" />
      </el-tooltip>
    </div>
    <div class="preset-options">
      <el-radio-group v-model="selectedPreset" size="small" @change="handlePresetChange">
        <el-radio-button label="default">默认设置</el-radio-button>
        <el-radio-button label="easy">简单模式</el-radio-button>
        <el-radio-button label="hard">困难模式</el-radio-button>
        <el-radio-button label="abundant">资源丰富</el-radio-button>
        <el-radio-button label="scarce">资源稀缺</el-radio-button>
        <el-radio-button label="custom">自定义</el-radio-button>
      </el-radio-group>
      <el-button 
        type="success" 
        size="small" 
        icon="el-icon-star-off" 
        @click="handleSavePreset"
        :disabled="selectedPreset !== 'custom' || disabled"
      >保存为预设</el-button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SettingsPreset',
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
    handlePresetChange(value) {
      this.$emit('preset-change', value);
    },
    handleSavePreset() {
      this.$emit('save-preset');
    }
  }
}
</script>

<style scoped>
.presets-section {
  margin-bottom: 16px;
  background-color: var(--surface-muted);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 12px;
  box-shadow: none;
}

.preset-title {
  margin-bottom: 10px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 5px;
}

.preset-title i {
  color: var(--text-secondary);
  font-size: 16px;
  cursor: help;
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
}
</style>
