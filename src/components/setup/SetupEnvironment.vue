<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RefreshCw, Save } from '@lucide/vue'
import { systemV2API } from '@/api/v2'
import { applySystemPreferences } from '@/utils/systemPreferences'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'

const { t } = useI18n()
const loading = ref(true), saving = ref(false), error = ref('')
const snapshot = ref(null), readiness = ref(null), capabilities = ref(null), values = ref({})
const advanced = ref(false)
const descriptors = [
  ['ui.systemName', 'systemName'], ['ui.timezone', 'timezone'],
  ['paths.server', 'server'], ['paths.save', 'saves'], ['paths.backup', 'backups'],
  ['paths.ugc', 'ugc'], ['paths.map', 'maps'], ['mod.steamCMD', 'steamcmd'],
  ['mod.workshopDownload', 'workshop'], ['mod.workshopContent', 'workshopContent']
]
const local = computed(() => capabilities.value?.deployment?.localExecutorEnabled !== false)
const fields = computed(() => descriptors.flatMap(([id, key]) => {
  const field = snapshot.value?.fields?.find(field => field.id === id)
  return field && (local.value || id.startsWith('ui.')) ? [{ ...field, key }] : []
}))
const checks = computed(() => local.value ? readiness.value?.checks || [] : [])
const basicKeys = ['systemName', 'timezone', 'server', 'saves', 'backups']
const visibleFields = computed(() => fields.value.filter(field => advanced.value || basicKeys.includes(field.key)))
const checkStatus = check => check.id === 'serverExecutable' && check.status !== 'pass' ? 'installNext'
  : ['luaFallback', 'mapRenderer'].includes(check.id) && check.status !== 'pass' ? 'optional' : check.status
function populate(next) {
  snapshot.value = next
  values.value = Object.fromEntries((next.fields || []).map(field => [field.id, field.value]))
}
async function load() {
  loading.value = true; error.value = ''
  try {
    const [settings, report, caps] = await Promise.all([systemV2API.settings(), systemV2API.setupChecks(), systemV2API.capabilities({ fresh: true })])
    populate(settings); readiness.value = report; capabilities.value = caps
  } catch (e) { error.value = e.message || t('setup.loadFailed') }
  finally { loading.value = false }
}
async function save() {
  if (loading.value || saving.value || !snapshot.value) return false
  error.value = ''
  const changed = Object.fromEntries(fields.value.filter(field => field.editable && values.value[field.id] !== field.value).map(field => [field.id, values.value[field.id]]))
  if (!Object.keys(changed).length && !snapshot.value.restartRequired) return true
  saving.value = true
  try {
    const input = { revision: snapshot.value.revision, values: changed, clearSecrets: [] }
    const preview = await systemV2API.previewSettings(input)
    if (!preview.valid) throw new Error((preview.issues || []).filter(issue => issue.severity === 'error').map(issue => issue.message).join('; ') || t('setup.saveFailed'))
    const result = await systemV2API.applySettings({ ...input, confirmation: 'APPLY SYSTEM SETTINGS' })
    populate(result.settings)
    applySystemPreferences(result.settings)
    const [report, caps] = await Promise.all([systemV2API.setupChecks(), systemV2API.capabilities({ fresh: true })])
    readiness.value = report; capabilities.value = caps
    return true
  } catch (e) { error.value = e.message || t('setup.saveFailed'); return false }
  finally { saving.value = false }
}
defineExpose({ prepare: save })
onMounted(load)
</script>

<template>
  <Card>
    <CardHeader><CardTitle>{{ t('setup.environmentTitle') }}</CardTitle><CardDescription>{{ t('setup.environmentDescription') }}</CardDescription></CardHeader>
    <CardContent class="flex flex-col gap-5">
      <p v-if="loading" role="status" class="flex items-center gap-2"><Spinner />{{ t('setup.loading') }}</p>
      <Alert v-if="error" variant="destructive"><AlertTitle>{{ t('setup.checkSettings') }}</AlertTitle><AlertDescription>{{ error }}</AlertDescription></Alert>
      <template v-if="!loading && snapshot">
        <Alert v-if="snapshot.restartRequired"><AlertTitle>{{ t('setup.restartTitle') }}</AlertTitle><AlertDescription>{{ t('setup.restartDescription') }}</AlertDescription></Alert>
        <p v-else-if="snapshot.runtimeApplySupported" class="text-sm text-muted-foreground">{{ t('setup.dynamicApplyHint') }}</p>
        <Alert v-if="!local"><AlertTitle>{{ t('setup.remoteTitle') }}</AlertTitle><AlertDescription>{{ t('setup.remoteEnvironment') }}</AlertDescription></Alert>
        <FieldGroup>
          <Field v-for="field in visibleFields" :key="field.id" :data-disabled="!field.editable || saving">
            <FieldLabel :for="`setup-${field.key}`">{{ t(`setup.fields.${field.key}`) }}</FieldLabel>
            <Select v-if="field.options?.length" v-model="values[field.id]" :disabled="!field.editable || saving">
              <SelectTrigger :id="`setup-${field.key}`"><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem v-for="option in field.options" :key="option" :value="option">{{ option }}</SelectItem></SelectGroup></SelectContent>
            </Select>
            <Input v-else :id="`setup-${field.key}`" v-model="values[field.id]" :disabled="!field.editable || saving" autocomplete="off" />
            <FieldDescription v-if="['server', 'saves', 'backups'].includes(field.key)">{{ t(`setup.pathHints.${field.key}`) }}</FieldDescription>
            <FieldDescription v-if="!field.editable">{{ t('setup.environmentLocked') }}</FieldDescription>
          </Field>
        </FieldGroup>
        <Button v-if="local" variant="ghost" class="self-start" :aria-expanded="advanced" @click="advanced = !advanced">{{ t(advanced ? 'setup.hideAdvanced' : 'setup.showAdvanced') }}</Button>
        <div v-if="checks.length" class="flex flex-col gap-3" aria-live="polite">
          <div v-for="check in checks" :key="check.id" class="flex flex-col gap-1">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span>{{ t(`setup.checks.${check.id}`) }}</span>
              <Badge :variant="checkStatus(check) === 'fail' ? 'destructive' : 'outline'">{{ t(`setup.checkStatus.${checkStatus(check)}`) }}</Badge>
            </div>
            <p v-if="checkStatus(check) === 'installNext'" class="text-sm text-muted-foreground">{{ t('setup.installNextHint') }}</p>
            <p v-else-if="checkStatus(check) === 'optional'" class="text-sm text-muted-foreground">{{ t('setup.optionalHint') }}</p>
            <p v-else-if="check.status !== 'pass' && check.remediation" class="break-words text-sm text-muted-foreground">{{ check.remediation }}</p>
          </div>
          <p class="text-sm text-muted-foreground">{{ t('setup.checkHint') }}</p>
        </div>
      </template>
    </CardContent>
    <CardFooter class="flex flex-wrap justify-end gap-2">
      <Button variant="outline" :disabled="loading || saving" @click="load"><RefreshCw data-icon="inline-start" />{{ t('setup.reload') }}</Button>
      <Button :disabled="loading || saving || !snapshot" @click="save"><Spinner v-if="saving" data-icon="inline-start" /><Save v-else data-icon="inline-start" />{{ t('setup.save') }}</Button>
    </CardFooter>
  </Card>
</template>
