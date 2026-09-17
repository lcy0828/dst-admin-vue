<template>
  <div :class="cn('grid w-full min-w-0 gap-2', reserveInstallationColumn && 'sm:grid-cols-[minmax(0,1.35fr)_minmax(12rem,.65fr)]', props.class)">
    <RuntimeTargetPicker
      :model-value="targetId"
      :targets="targets"
      :label="label"
      :description="description"
      :placeholder="placeholder"
      :search-placeholder="searchPlaceholder"
      :empty-label="emptyLabel"
      :online-label="onlineLabel"
      :offline-label="offlineLabel"
      :capacity-template="capacityTemplate"
      :capacity-unknown="capacityUnknown"
      :disabled="disabled"
      @update:model-value="selectTarget"
    />

    <div v-if="reserveInstallationColumn" class="min-w-0">
      <div v-if="installations.length > 1" class="flex min-w-0 flex-col gap-1.5">
        <span class="text-xs font-medium text-muted-foreground">{{ installationLabel }}</span>
        <Select :model-value="installationId" :disabled="disabled" @update:model-value="selectInstallation">
          <SelectTrigger class="w-full">
            <SelectValue :placeholder="installationPlaceholder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="installation in installations" :key="installation.id" :value="String(installation.id)">
              <span class="min-w-0 truncate">{{ installationName(installation) }}</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import RuntimeTargetPicker from './RuntimeTargetPicker.vue'

const props = defineProps({
  targetId: { type: String, default: '' },
  installationId: { type: String, default: '' },
  targets: { type: Array, default: () => [] },
  label: { type: String, required: true },
  description: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  searchPlaceholder: { type: String, default: '' },
  emptyLabel: { type: String, default: '' },
  onlineLabel: { type: String, default: '' },
  offlineLabel: { type: String, default: '' },
  capacityTemplate: { type: String, default: '{projected} / {limit}' },
  capacityUnknown: { type: String, default: '--' },
  installationLabel: { type: String, default: '' },
  installationPlaceholder: { type: String, default: '' },
  defaultSuffix: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  class: { type: [String, Object, Array], default: undefined }
})

const emit = defineEmits(['update:targetId', 'update:installationId'])

const selectedTarget = computed(() => props.targets.find(target => String(target.id) === props.targetId) || null)
const installations = computed(() => Array.isArray(selectedTarget.value?.installations)
  ? selectedTarget.value.installations.filter(item => String(item?.id || '').trim())
  : [])
const reserveInstallationColumn = computed(() => props.targets.some(target => (target.installations || []).length > 1))

function defaultInstallation(target) {
  const values = Array.isArray(target?.installations) ? target.installations : []
  return String(target?.defaultInstallationId || values.find(item => item.default)?.id || values[0]?.id || '')
}

function selectTarget(value) {
  const targetId = String(value || '')
  const target = props.targets.find(item => String(item.id) === targetId)
  emit('update:targetId', targetId)
  emit('update:installationId', defaultInstallation(target))
}

function selectInstallation(value) {
  emit('update:installationId', String(value || ''))
}

function installationName(installation) {
  const id = String(installation.id || '')
  return installation.default && props.defaultSuffix ? `${id} ${props.defaultSuffix}` : id
}
</script>
