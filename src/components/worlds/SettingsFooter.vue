<template>
  <div class="actions-footer">
    <div class="settings-status">
      <el-tag v-if="hasChanges" type="warning">有未保存的更改</el-tag>
      <el-tag v-else type="success">设置已同步</el-tag>
      
      <el-popover
        v-if="hasChanges"
        placement="top-start"
        width="320"
        trigger="click"
        popper-class="changes-popover"
      >
        <div class="changes-list-title">已修改的设置项 ({{ changedItemsCount }})</div>
        <div class="changes-list">
          <div v-for="(item, index) in changedItems" :key="index" class="change-item">
            <div class="change-item-name">{{ item.text }}</div>
            <div class="change-item-values">
              <span class="old-value">{{ item.oldValueText }}</span>
              <component :is="'el-icon-arrow-right'" class="legacy-icon" />
              <span class="new-value">{{ item.newValueText }}</span>
            </div>
          </div>
        </div>
        <template #reference>
          <el-button type="text" class="view-changes-btn">
            <component :is="'el-icon-view'" class="legacy-icon" /> 查看变更 ({{ changedItemsCount }})
          </el-button>
        </template>
      </el-popover>
    </div>
    <div class="action-buttons">
      <el-button 
        type="primary" 
        @click="$emit('save')" 
        :loading="saveLoading" 
        :disabled="loading || saveLoading || !hasChanges"
        icon="el-icon-check"
      >保存设置</el-button>
      <el-button 
        @click="$emit('reset')" 
        :disabled="loading || saveLoading || !hasChanges"
        icon="el-icon-refresh-left"
      >重置</el-button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SettingsFooter',
  props: {
    hasChanges: {
      type: Boolean,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    saveLoading: {
      type: Boolean,
      default: false
    },
    changedItems: {
      type: Array,
      default: () => []
    }
  },
  computed: {
    changedItemsCount() {
      return this.changedItems.length;
    }
  }
}
</script>

<style scoped>
.actions-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
  gap: 12px;
}

.settings-status {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-wrap: wrap;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.action-buttons .el-button {
  min-width: 90px;
}

.action-buttons .el-button--primary {
  font-weight: 500;
}

.view-changes-btn {
  margin-left: 15px;
  color: var(--warning-color);
  transition: color 0.3s;
}

.view-changes-btn:hover {
  color: #cf9236;
  text-decoration: underline;
}

.changes-list-title {
  font-weight: 500;
  margin-bottom: 10px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 8px;
}

.changes-list {
  max-height: 300px;
  overflow-y: auto;
}

.change-item {
  padding: 8px 0;
  border-bottom: 1px dashed var(--border-color);
}

.change-item:last-child {
  border-bottom: none;
}

.change-item-name {
  font-weight: 500;
  margin-bottom: 5px;
}

.change-item-values {
  display: flex;
  align-items: center;
  font-size: 12px;
}

.old-value {
  color: var(--text-secondary);
  text-decoration: line-through;
}

.el-icon-arrow-right {
  margin: 0 8px;
  color: var(--text-secondary);
}

.new-value {
  color: #4f8a5b;
  font-weight: 500;
}

/* 确保弹出层显示在固定底栏上方 */
:deep(.changes-popover) {
  z-index: 10000 !important;
}

/* 确保弹出层箭头正确显示 */
:deep(.changes-popover .popper__arrow) {
  display: none !important;
}

/* 增强弹出层样式使其更明显 */
:deep(.changes-popover .el-popover__title) {
  font-weight: bold;
}

:deep(.el-popover.changes-popover) {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15) !important;
  border: 1px solid #d99b32 !important;
}

/* 增强标签样式 */
:deep(.el-tag) {
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
}

@media (max-width: 768px) {
  .actions-footer {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .settings-status {
    justify-content: space-between;
  }
  
  .action-buttons {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .action-buttons .el-button {
    width: 100%;
    min-width: 0;
    margin: 0;
  }
}
</style>
