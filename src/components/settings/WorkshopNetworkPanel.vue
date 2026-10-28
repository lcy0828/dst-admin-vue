<template>
  <Card>
    <CardHeader><CardTitle>{{ t('workshop.title') }}</CardTitle><CardDescription>{{ t('workshop.description') }}</CardDescription></CardHeader>
    <CardContent class="flex flex-col gap-5">
      <Alert v-if="error" variant="destructive"><AlertTitle>{{ error }}</AlertTitle></Alert>
      <Skeleton v-if="loading" class="h-48 w-full" />
      <form v-else class="flex flex-col gap-5" @submit.prevent="save">
        <FieldGroup>
          <Field>
            <FieldLabel for="workshop-mode">{{ t('workshop.mode') }}</FieldLabel>
            <Select v-model="form['mod.proxyMode']" :disabled="locked('mod.proxyMode') || busy">
              <SelectTrigger id="workshop-mode"><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem v-for="mode in ['system', 'direct', 'custom']" :key="mode" :value="mode">{{ t(`workshop.modes.${mode}`) }}</SelectItem></SelectGroup></SelectContent>
            </Select>
            <FieldDescription v-if="locked('mod.proxyMode')">{{ environment('mod.proxyMode') }}</FieldDescription>
          </Field>
          <Field v-if="form['mod.proxyMode'] === 'custom'">
            <FieldLabel for="workshop-proxy">{{ t('workshop.proxy') }}</FieldLabel>
            <Input id="workshop-proxy" v-model="form['mod.proxyURL']" type="url" autocomplete="off" spellcheck="false" :disabled="locked('mod.proxyURL') || busy" :placeholder="fields['mod.proxyURL']?.configured && !fields['mod.proxyURL']?.displayValue ? secretPlaceholder('mod.proxyURL') : 'http://proxy.example:7890'" @update:model-value="proxyEdited = true" />
            <FieldDescription>{{ locked('mod.proxyURL') ? environment('mod.proxyURL') : t('workshop.proxyHint') }}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel for="workshop-key">{{ t('workshop.key') }}</FieldLabel>
            <div class="flex min-w-0 gap-2">
              <Input id="workshop-key" v-model="form['mod.steamAPIKey']" type="password" autocomplete="new-password" class="min-w-0 flex-1" :disabled="locked('mod.steamAPIKey') || busy || clearKey" :placeholder="secretPlaceholder('mod.steamAPIKey')" />
              <Button v-if="fields['mod.steamAPIKey']?.configured && !locked('mod.steamAPIKey')" type="button" variant="outline" :disabled="busy" class="shrink-0" @click="clearKey = !clearKey">{{ t(clearKey ? 'workshop.keep' : 'workshop.clear') }}</Button>
            </div>
            <FieldDescription>{{ locked('mod.steamAPIKey') ? environment('mod.steamAPIKey') : t('workshop.keyHint') }}</FieldDescription>
          </Field>
        </FieldGroup>
        <Collapsible>
          <CollapsibleTrigger as-child><Button type="button" variant="ghost" size="sm">{{ t('workshop.advanced') }}<ChevronDown data-icon="inline-end" /></Button></CollapsibleTrigger>
          <CollapsibleContent class="pt-4">
            <FieldGroup>
              <Field v-for="id in ['mod.steamAPIBase', 'mod.steamCommunityBase']" :key="id">
                <FieldLabel :for="id">{{ t(id === 'mod.steamAPIBase' ? 'workshop.apiBase' : 'workshop.communityBase') }}</FieldLabel>
                <Input :id="id" v-model="form[id]" type="url" :disabled="locked(id) || busy" />
                <FieldDescription v-if="locked(id)">{{ environment(id) }}</FieldDescription>
              </Field>
              <Field>
                <FieldLabel for="workshop-sample">{{ t('workshop.sample') }}</FieldLabel>
                <Input id="workshop-sample" v-model="sampleId" inputmode="numeric" pattern="[0-9]*" :disabled="busy" />
                <FieldDescription>{{ t('workshop.sampleHint') }}</FieldDescription>
              </Field>
            </FieldGroup>
          </CollapsibleContent>
        </Collapsible>
        <Alert v-if="String(form['mod.steamAPIBase']).startsWith('http://')"><AlertTitle>{{ t('workshop.httpHint') }}</AlertTitle></Alert>
        <div class="flex flex-wrap gap-2">
          <Button type="button" variant="outline" :disabled="busy" @click="test"><Spinner v-if="testing" data-icon="inline-start" />{{ t('workshop.test') }}</Button>
          <Button type="submit" :disabled="busy"><Spinner v-if="saving" data-icon="inline-start" />{{ t('workshop.save') }}</Button>
        </div>
      </form>
      <div v-if="testResult" class="flex flex-col gap-2" aria-live="polite">
        <p class="text-sm font-medium">{{ t('workshop.result') }}</p>
        <div v-for="stage in testResult.stages" :key="stage.name" class="flex flex-wrap items-center gap-2 text-sm">
          <span>{{ t(`workshop.stages.${stage.name}`) }}</span>
          <Badge :variant="stage.status === 'available' ? 'success' : stage.status === 'unavailable' ? 'warning' : 'secondary'">{{ t(`workshop.statuses.${stage.status}`) }}</Badge>
          <span class="text-muted-foreground">{{ stage.durationMs }} ms</span>
          <span v-if="stage.code" class="text-muted-foreground">{{ describeCode(stage.code) }}</span>
        </div>
      </div>
    </CardContent>
    <CardFooter><p class="text-sm text-muted-foreground">{{ t('workshop.scope') }}</p></CardFooter>
  </Card>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { workshopV2API } from '@/api/v2'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'

const { t, te } = useI18n()
const fields = ref({}), revision = ref(''), loading = ref(true), testing = ref(false), saving = ref(false), error = ref(''), clearKey = ref(false), testResult = ref(null), sampleId = ref('')
const form = reactive({ 'mod.proxyMode': 'system', 'mod.proxyURL': '', 'mod.steamAPIKey': '', 'mod.steamAPIBase': '', 'mod.steamCommunityBase': '' })
const proxyEdited = ref(false)
const busy = computed(() => loading.value || testing.value || saving.value)
let controller
const locked = id => fields.value[id]?.editable === false
const environment = id => t('workshop.environment', { name: fields.value[id]?.environment || '' })
const secretPlaceholder = id => t(fields.value[id]?.configured ? 'workshop.configured' : 'workshop.notConfigured')
function describeCode(code) { const key = `workshop.codes.${String(code).split(' ')[0]}`; return te(key) ? t(key) : code }
function accept(data) {
  revision.value = data.revision
  fields.value = Object.fromEntries((data.fields || []).map(field => [field.id, field]))
  for (const id of Object.keys(form)) form[id] = fields.value[id]?.value || ''
  form['mod.proxyURL'] = fields.value['mod.proxyURL']?.displayValue || ''
  proxyEdited.value = false
  clearKey.value = false
}
function input() {
  return { revision: revision.value, values: Object.fromEntries(Object.entries(form).filter(([id, value]) => !locked(id) && (id !== 'mod.proxyURL' || proxyEdited.value) && (id !== 'mod.steamAPIKey' || !clearKey.value) && (!fields.value[id]?.sensitive || value.trim()))), clearSecrets: clearKey.value ? ['mod.steamAPIKey'] : [] }
}
async function load() {
  try { accept(await workshopV2API.get()) } catch (e) { error.value = e.message || t('workshop.loadFailed') } finally { loading.value = false }
}
async function save() {
  saving.value = true; error.value = ''
  try { accept(await workshopV2API.save(input())); toast.success(t('workshop.saved')) } catch (e) { error.value = e.message || t('workshop.saveFailed') } finally { saving.value = false }
}
async function test() {
  testing.value = true; error.value = ''; controller?.abort(); controller = new AbortController()
  try { testResult.value = await workshopV2API.test({ ...input(), ...(sampleId.value.trim() ? { sampleId: sampleId.value.trim() } : {}) }, { signal: controller.signal }) } catch (e) { if (e.code !== 'ERR_CANCELED') error.value = e.message || t('workshop.testFailed') } finally { testing.value = false }
}
watch([form, clearKey, sampleId], () => { testResult.value = null })
onMounted(load)
onBeforeUnmount(() => controller?.abort())
</script>
