<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ServerIcon } from '@lucide/vue'
import { runtimeTargetsV2API } from '@/api/v2'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import {
  getActiveRuntimeTarget,
  RUNTIME_TARGET_CHANGED_EVENT,
  RUNTIME_TARGETS_UPDATED_EVENT,
  setActiveRuntimeTarget
} from '@/utils/runtimeTarget'
import { toast } from 'vue-sonner'

const emit = defineEmits(['change'])

const loading = ref(false)
const selectedId = ref(getActiveRuntimeTarget().id)
const targets = ref([getActiveRuntimeTarget()])

function targetMeta(target) {
  if (target.kind === 'local') return target.status === 'ready' ? '本机 · 可用' : '本机 · 待检查'
  if (!target.configured) return '远程 · 未配置'
  return target.online ? '远程 · 在线' : '远程 · 离线'
}

function activateSelectedTarget() {
  const target = targets.value.find(item => item.id === selectedId.value) || targets.value[0]
  const active = setActiveRuntimeTarget(target)
  emit('change', active)
}

function syncActiveTarget(event) {
  if (event.detail?.id) selectedId.value = event.detail.id
}

async function loadTargets() {
  loading.value = true
  try {
    const value = await runtimeTargetsV2API.list()
    targets.value = value.items || []
    const current = targets.value.find(target => target.id === selectedId.value)
    if (!current || (current.kind === 'agent' && !current.configured)) {
      selectedId.value = value.defaultTargetId || 'local'
    }
    activateSelectedTarget()
  } catch (error) {
    const local = setActiveRuntimeTarget()
    selectedId.value = local.id
    targets.value = [local]
    emit('change', local)
    toast.error(error.message || '获取管理目标失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  window.addEventListener(RUNTIME_TARGETS_UPDATED_EVENT, loadTargets)
  window.addEventListener(RUNTIME_TARGET_CHANGED_EVENT, syncActiveTarget)
  loadTargets()
})

onBeforeUnmount(() => {
  window.removeEventListener(RUNTIME_TARGETS_UPDATED_EVENT, loadTargets)
  window.removeEventListener(RUNTIME_TARGET_CHANGED_EVENT, syncActiveTarget)
})
</script>

<template>
  <Select v-model="selectedId" :disabled="loading" @update:model-value="activateSelectedTarget">
    <SelectTrigger size="sm" class="w-44 md:w-56" aria-label="选择管理目标">
      <Spinner v-if="loading" />
      <ServerIcon v-else />
      <SelectValue placeholder="选择管理目标" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectItem
          v-for="target in targets"
          :key="target.id"
          :value="target.id"
          :disabled="target.kind === 'agent' && !target.configured"
        >
          <span class="flex min-w-0 items-center gap-2">
            <span class="truncate font-medium">{{ target.name }}</span>
            <span class="text-muted-foreground text-xs">{{ targetMeta(target) }}</span>
          </span>
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
