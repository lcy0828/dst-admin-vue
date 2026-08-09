<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
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
import { retainUnavailableRemoteTarget, runtimeTargetMeta, runtimeTargetName } from '@/lib/runtimeTargetPresentation.mjs'
import {
  getActiveRuntimeTarget,
  RUNTIME_TARGET_CHANGED_EVENT,
  RUNTIME_TARGETS_UPDATED_EVENT,
  setActiveRuntimeTarget
} from '@/utils/runtimeTarget'
import { toast } from 'vue-sonner'

const emit = defineEmits(['change'])
const { t } = useI18n()

const loading = ref(false)
const selectedId = ref(getActiveRuntimeTarget().id)
const targets = ref([getActiveRuntimeTarget()])

function targetMeta(target) {
  return runtimeTargetMeta(target, t)
}

function targetName(target) {
  return runtimeTargetName(target, t)
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
  const previousTarget = getActiveRuntimeTarget()
  try {
    const value = await runtimeTargetsV2API.list()
    targets.value = retainUnavailableRemoteTarget(value.items, selectedId.value, previousTarget)
    const current = targets.value.find(target => target.id === selectedId.value)
    if (!current) {
      selectedId.value = value.defaultTargetId || 'local'
    }
    activateSelectedTarget()
  } catch (error) {
    selectedId.value = previousTarget.id
    targets.value = [previousTarget]
    toast.error(error.message
      ? t('app.remote.loadFailedDetail', { error: error.message })
      : t('app.remote.loadFailed'))
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
    <SelectTrigger size="sm" class="w-40 sm:w-52 md:w-60" :aria-label="t('app.remote.selectTarget')">
      <Spinner v-if="loading" />
      <ServerIcon v-else />
      <SelectValue :placeholder="t('app.remote.selectTarget')" />
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
            <span class="truncate font-medium">{{ targetName(target) }}</span>
            <span class="text-muted-foreground text-xs">{{ targetMeta(target) }}</span>
          </span>
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
