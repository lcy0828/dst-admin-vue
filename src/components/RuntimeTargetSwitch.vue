<template>
  <div class="runtime-target-switch">
    <span class="target-label">管理目标</span>
    <el-select
      v-model="selectedId"
      class="target-select"
      :loading="loading"
      aria-label="选择管理目标"
      popper-class="runtime-target-popper"
      @change="selectTarget"
    >
      <el-option
        v-for="target in targets"
        :key="target.id"
        :label="optionLabel(target)"
        :value="target.id"
        :disabled="target.kind === 'agent' && !target.configured"
      >
        <div class="target-option">
          <span class="status-dot" :class="statusClass(target)"></span>
          <span class="option-name">{{ target.name }}</span>
          <span class="option-meta">{{ optionMeta(target) }}</span>
        </div>
      </el-option>
    </el-select>
    <el-tooltip content="远程运行时配置" placement="bottom">
      <el-button class="target-settings" text circle aria-label="打开远程运行时配置" @click="openAgentSettings">
        <component :is="'el-icon-setting'" class="target-settings-icon" />
      </el-button>
    </el-tooltip>
  </div>
</template>

<script>
import { runtimeTargetsV2API } from '@/api/v2'
import {
  getActiveRuntimeTarget,
  RUNTIME_TARGET_CHANGED_EVENT,
  RUNTIME_TARGETS_UPDATED_EVENT,
  setActiveRuntimeTarget
} from '@/utils/runtimeTarget'

export default {
  name: 'RuntimeTargetSwitch',
  emits: ['change'],
  data() {
    return {
      loading: false,
      selectedId: getActiveRuntimeTarget().id,
      targets: [getActiveRuntimeTarget()]
    }
  },
  mounted() {
    window.addEventListener(RUNTIME_TARGETS_UPDATED_EVENT, this.loadTargets)
    window.addEventListener(RUNTIME_TARGET_CHANGED_EVENT, this.syncActiveTarget)
    this.loadTargets()
  },
  beforeUnmount() {
    window.removeEventListener(RUNTIME_TARGETS_UPDATED_EVENT, this.loadTargets)
    window.removeEventListener(RUNTIME_TARGET_CHANGED_EVENT, this.syncActiveTarget)
  },
  methods: {
    async loadTargets() {
      this.loading = true
      try {
        const value = await runtimeTargetsV2API.list()
        this.targets = value.items || []
        const current = this.targets.find(target => target.id === this.selectedId)
        if (!current || (current.kind === 'agent' && !current.configured)) {
          this.selectedId = value.defaultTargetId || 'local'
        }
        this.activateSelectedTarget()
      } catch (error) {
        const local = setActiveRuntimeTarget()
        this.selectedId = local.id
        this.targets = [local]
        this.$emit('change', local)
        this.$message.error(error.message || '获取管理目标失败')
      } finally {
        this.loading = false
      }
    },
    selectTarget() {
      this.activateSelectedTarget()
    },
    syncActiveTarget(event) {
      if (event.detail?.id && event.detail.id !== this.selectedId) {
        this.selectedId = event.detail.id
      }
    },
    activateSelectedTarget() {
      const target = this.targets.find(item => item.id === this.selectedId) || this.targets[0]
      const active = setActiveRuntimeTarget(target)
      this.$emit('change', active)
    },
    optionLabel(target) {
      if (target.kind === 'local') return target.name || '本机'
      const suffix = target.configured ? '远程' : '未配置'
      return `${target.name} · ${suffix}`
    },
    optionMeta(target) {
      if (target.kind === 'local') return target.status === 'ready' ? '本机 · 可用' : '本机 · 待检查'
      if (!target.configured) return '远程 · 未配置'
      return target.online ? '远程 · 在线' : '远程 · 离线'
    },
    statusClass(target) {
      if (!target.configured || target.status === 'configuration_required') return 'needs-config'
      return target.online ? 'online' : 'offline'
    },
    openAgentSettings() {
      this.$router.push('/agents/list')
    }
  }
}
</script>

<style scoped>
.runtime-target-switch {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.target-label {
  flex: 0 0 auto;
  color: var(--text-secondary);
  font-size: 12px;
}

.target-select {
  width: 210px;
}

.target-settings {
  flex: 0 0 34px;
  width: 34px;
  height: 34px;
  color: var(--text-regular);
}

.target-settings:hover,
.target-settings:focus-visible {
  color: var(--primary-color);
  background: var(--el-color-primary-light-9);
}

.target-settings-icon {
  width: 17px;
  height: 17px;
}

.target-option {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--el-text-color-placeholder);
}

.status-dot.online {
  background: var(--success-color);
}

.status-dot.offline {
  background: var(--danger-color);
}

.status-dot.needs-config {
  background: var(--warning-color);
}

.option-name {
  overflow: hidden;
  color: var(--text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-meta {
  color: var(--text-secondary);
  font-size: 12px;
}

@media (max-width: 980px) {
  .target-label {
    display: none;
  }

  .target-select {
    width: 168px;
  }
}

@media (max-width: 768px) {
  .target-select {
    width: 132px;
  }

  .target-settings {
    display: none;
  }
}
</style>
