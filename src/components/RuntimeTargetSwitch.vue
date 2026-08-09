<template>
  <div class="runtime-target-switch">
    <span class="target-label">{{ $t('app.remote.targetLabel') }}</span>
    <UiSelect
      v-model="selectedId"
      :disabled="loading"
      :aria-label="$t('app.remote.selectTarget')"
      @update:model-value="selectTarget"
    >
      <SelectTrigger class="target-select">
        <Spinner v-if="loading" />
        <SelectValue :placeholder="$t('app.remote.selectTarget')" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem
            v-for="target in targets"
            :key="target.id"
            :value="target.id"
            :disabled="target.kind === 'agent' && !target.configured"
          >
            <div class="target-option">
              <span class="status-dot" :class="statusClass(target)"></span>
              <span class="option-name">{{ targetName(target) }}</span>
              <span class="option-meta">{{ optionMeta(target) }}</span>
            </div>
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </UiSelect>
    <Tooltip>
      <TooltipTrigger as-child>
        <UiButton class="target-settings" variant="ghost" size="icon-sm" :aria-label="$t('app.remote.openConfiguration')" @click="openAgentSettings">
          <SettingsIcon />
        </UiButton>
      </TooltipTrigger>
      <TooltipContent>{{ $t('app.remote.configure') }}</TooltipContent>
    </Tooltip>
  </div>
</template>

<script>
import { SettingsIcon } from '@lucide/vue'
import { runtimeTargetsV2API } from '@/api/v2'
import { Button as UiButton } from '@/components/ui/button'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { retainUnavailableRemoteTarget, runtimeTargetMeta, runtimeTargetName } from '@/lib/runtimeTargetPresentation.mjs'
import {
  getActiveRuntimeTarget,
  RUNTIME_TARGET_CHANGED_EVENT,
  RUNTIME_TARGETS_UPDATED_EVENT,
  setActiveRuntimeTarget
} from '@/utils/runtimeTarget'
import { toast } from 'vue-sonner'

export default {
  name: 'RuntimeTargetSwitch',
  components: {
    UiButton,
    UiSelect,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SettingsIcon,
    Spinner,
    Tooltip,
    TooltipContent,
    TooltipTrigger
  },
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
      const previousTarget = getActiveRuntimeTarget()
      try {
        const value = await runtimeTargetsV2API.list()
        this.targets = retainUnavailableRemoteTarget(value.items, this.selectedId, previousTarget)
        const current = this.targets.find(target => target.id === this.selectedId)
        if (!current) {
          this.selectedId = value.defaultTargetId || 'local'
        }
        this.activateSelectedTarget()
      } catch (error) {
        this.selectedId = previousTarget.id
        this.targets = [previousTarget]
        toast.error(error.message
          ? this.$t('app.remote.loadFailedDetail', { error: error.message })
          : this.$t('app.remote.loadFailed'))
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
    targetName(target) {
      return runtimeTargetName(target, this.$t)
    },
    optionMeta(target) {
      return runtimeTargetMeta(target, this.$t)
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
  background: var(--muted-foreground);
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
