<script setup>
import { computed, reactive, ref, watch, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { softwareV2API, agentsV2API } from '@/api/v2'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

const props = defineProps({ settings: Object, agentId: { type: String, default: '' }, disabled: Boolean, notifications: Boolean })
const emit = defineEmits(['saved'])
const { t } = useI18n()
const id = useId()
const form = reactive({})
const checkIntervalMinutes = computed({
  get: () => Math.round(Number(form.checkIntervalHours) * 60),
  set: value => { form.checkIntervalHours = Number(value) / 60 }
})
const saving = ref(false)
const error = ref('')
watch(() => JSON.stringify(props.settings), () => { if (props.settings) Object.assign(form, props.settings, { proxyURL: '' }) }, { immediate: true })
async function save() {
  saving.value = true; error.value = ''
  try {
    const value = { ...form, timeoutMinutes: Number(form.timeoutMinutes), checkIntervalHours: Number(form.checkIntervalHours) }
    if (props.agentId) await agentsV2API.saveSoftwareSettings(props.agentId, value)
    else await softwareV2API.saveSettings(value)
    form.proxyURL = ''
    emit('saved')
    toast.success(t('softwareUpdate.settingsSaved'))
  } catch (e) { error.value = e.message || String(e) }
  finally { saving.value = false }
}
</script>

<template>
  <form v-if="settings" class="flex flex-col gap-4" @submit.prevent="save">
    <FieldGroup v-if="!notifications" class="grid gap-4 sm:grid-cols-2">
      <Field><FieldLabel :for="`${id}-source`">{{ t('softwareUpdate.source') }}</FieldLabel>
        <Select v-model="form.source" :disabled="disabled || saving"><SelectTrigger :id="`${id}-source`" class="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="auto">{{ t('softwareUpdate.auto') }}</SelectItem><SelectItem value="direct">{{ t('softwareUpdate.direct') }}</SelectItem><SelectItem value="mirror">{{ t('softwareUpdate.proxy') }}</SelectItem></SelectGroup></SelectContent></Select>
        <FieldDescription>{{ t('softwareUpdate.autoDescription') }}</FieldDescription>
      </Field>
      <Field><FieldLabel :for="`${id}-proxy`">{{ t('softwareUpdate.proxyMode') }}</FieldLabel>
        <Select v-model="form.proxyMode" :disabled="disabled || saving"><SelectTrigger :id="`${id}-proxy`" class="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="mode in ['inherit', 'system', 'direct', 'custom']" :key="mode" :value="mode">{{ t(`softwareUpdate.proxyModes.${agentId && mode === 'inherit' ? 'agentInherit' : mode}`) }}</SelectItem></SelectGroup></SelectContent></Select>
        <FieldDescription>{{ t(agentId ? 'softwareUpdate.agentProxyHelp' : 'softwareUpdate.proxyHelp') }}</FieldDescription>
      </Field>
      <Field v-if="form.source !== 'direct'" class="sm:col-span-2"><FieldLabel :for="`${id}-mirror`">{{ t('softwareUpdate.mirrorPrefix') }}</FieldLabel>
        <Input :id="`${id}-mirror`" v-model="form.mirrorPrefix" type="url" inputmode="url" autocomplete="off" spellcheck="false" maxlength="1024" pattern="https://.*" placeholder="https://ghfast.top/" :aria-describedby="`${id}-mirror-help`" :disabled="disabled || saving" />
        <FieldDescription :id="`${id}-mirror-help`">{{ t('softwareUpdate.mirrorPrefixHelp') }}</FieldDescription>
      </Field>
      <Field v-if="form.proxyMode === 'custom'"><FieldLabel :for="`${id}-url`">{{ t('softwareUpdate.proxyURL') }}</FieldLabel><Input :id="`${id}-url`" v-model="form.proxyURL" type="password" autocomplete="new-password" :placeholder="form.proxyConfigured ? t('softwareUpdate.secretSaved') : 'http://127.0.0.1:7890'" :disabled="disabled || saving" /></Field>
      <Field><FieldLabel :for="`${id}-timeout`">{{ t('softwareUpdate.timeout') }}</FieldLabel><Input :id="`${id}-timeout`" v-model="form.timeoutMinutes" type="number" min="10" max="240" required :disabled="disabled || saving" /></Field>
      <Field v-if="agentId" orientation="horizontal"><Switch :id="`${id}-relay`" v-model="form.controllerRelay" :disabled="disabled || saving" /><FieldLabel :for="`${id}-relay`">{{ t('softwareUpdate.controllerTransfer') }}</FieldLabel><FieldDescription>{{ t('softwareUpdate.agentSources') }}</FieldDescription></Field>
    </FieldGroup>
    <FieldGroup v-else>
      <Field orientation="horizontal"><Switch :id="`${id}-background`" v-model="form.backgroundCheck" :disabled="disabled || saving" /><FieldLabel :for="`${id}-background`">{{ t('softwareUpdate.backgroundCheck') }}</FieldLabel></Field>
      <FieldDescription>{{ t('softwareUpdate.backgroundHelp') }}</FieldDescription>
      <Field v-if="form.backgroundCheck"><FieldLabel :for="`${id}-interval`">{{ t('softwareUpdate.interval') }}</FieldLabel><Input :id="`${id}-interval`" v-model="checkIntervalMinutes" type="number" min="30" max="10080" step="1" required class="max-w-40" :disabled="disabled || saving" /></Field>
    </FieldGroup>
    <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
    <Button type="submit" variant="outline" class="self-start" :disabled="saving || disabled">{{ t(saving ? 'softwareUpdate.savingSettings' : 'softwareUpdate.saveSettings') }}</Button>
  </form>
</template>
