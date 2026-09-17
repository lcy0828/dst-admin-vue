<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ $t('mods.downloadToMachine.title') }}</DialogTitle>
        <DialogDescription>{{ $t('mods.downloadToMachine.description', { name: mod?.name || mod?.id || '' }) }}</DialogDescription>
      </DialogHeader>

      <Alert v-if="failure" variant="destructive">
        <TriangleAlert />
        <AlertTitle>{{ $t('mods.downloadToMachine.failedTitle') }}</AlertTitle>
        <AlertDescription>{{ failure }}</AlertDescription>
      </Alert>

      <FieldGroup>
        <Field :data-disabled="submitting || undefined">
          <FieldLabel for="download-mod-machine">{{ $t('mods.downloadToMachine.machine') }}</FieldLabel>
          <UiSelect v-model="selectedKey" :disabled="submitting || onlineOptions.length === 0">
            <SelectTrigger id="download-mod-machine">
              <SelectValue :placeholder="$t('mods.downloadToMachine.selectMachine')" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem v-for="option in onlineOptions" :key="option.key" :value="option.key">
                  {{ option.label }} · {{ $t(`mods.downloadToMachine.states.${option.downloadState || 'missing'}`) }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </UiSelect>
          <FieldDescription>{{ selectedDescription }}</FieldDescription>
        </Field>
      </FieldGroup>

      <DialogFooter>
        <UiButton variant="outline" :disabled="submitting" @click="emit('update:open', false)">{{ $t('mods.actions.cancel') }}</UiButton>
        <UiButton :disabled="!canSubmit" @click="submit">
          <Spinner v-if="submitting" data-icon="inline-start" />
          <Download v-else data-icon="inline-start" />
          {{ $t(submitting ? 'mods.downloadToMachine.downloadingAction' : actionKey) }}
        </UiButton>
      </DialogFooter>
    </DialogContent>
  </UiDialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Download, TriangleAlert } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { modApi } from '@/api'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button as UiButton } from '@/components/ui/button'
import {
  Dialog as UiDialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { createModFailure, formatModFailure } from '@/i18n/modMessages'
import { i18n } from '@/i18n'
import { emitGlobalJobSubmitted } from '@/lib/globalJobs.mjs'
import { useSharedJobStatus } from '@/composables/useGlobalJobStatus'

const props = defineProps({
  open: { type: Boolean, default: false },
  mod: { type: Object, default: null },
  installationOptions: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:open', 'downloaded'])
const selectedKey = ref('')
const submitting = ref(false)
const jobStatus = useSharedJobStatus()
const failure = ref('')

const translate = (...args) => i18n.global.t(...args)

const onlineOptions = computed(() => props.installationOptions.filter(option => option.online))
const selected = computed(() => onlineOptions.value.find(option => option.key === selectedKey.value) || null)
const canSubmit = computed(() => Boolean(props.mod?.id && selected.value && !submitting.value))
const actionKey = computed(() => {
  if (['current', 'unknown'].includes(selected.value?.downloadState)) return 'mods.downloadToMachine.redownload'
  if (selected.value?.downloadState === 'outdated') return 'mods.downloadToMachine.downloadUpdate'
  return 'mods.downloadToMachine.download'
})
const selectedDescription = computed(() => selected.value
  ? i18n.global.t('mods.downloadToMachine.machineDescription', { machine: selected.value.label })
  : i18n.global.t('mods.downloadToMachine.noMachine'))

watch(() => props.open, open => {
  if (!open) return
  const preferred = onlineOptions.value.find(option => option.downloadState !== 'current') || onlineOptions.value[0]
  selectedKey.value = preferred?.key || ''
  failure.value = ''
})

async function submit() {
  if (!canSubmit.value) return
  const option = selected.value
  const mod = props.mod
  let accepted = false
  submitting.value = true
  failure.value = ''
  try {
    await modApi.downloadMod({
      id: mod.id,
      targetId: option.targetId,
      installationId: option.installationId,
      waitForJob: jobStatus?.waitForJob,
      onProgress: value => {
        if (accepted || !value?.id) return
        accepted = true
        emitGlobalJobSubmitted({ ...value, displayName: `${mod.name || mod.id} · ${option.label}` })
        submitting.value = false
        emit('update:open', false)
      }
    })
    toast.success(i18n.global.t('mods.downloadToMachine.downloaded', {
      name: mod.name || mod.id,
      machine: option.label
    }))
    emit('downloaded', { modId: mod.id, targetId: option.targetId, installationId: option.installationId })
  } catch (error) {
    const message = formatModFailure(translate, createModFailure('mods.errors.download', error))
    if (!accepted) failure.value = message
    else if (!jobStatus || !['JOB_FAILED', 'JOB_CANCELED'].includes(error?.code)) toast.error(message)
  } finally {
    if (!accepted) submitting.value = false
  }
}
</script>
