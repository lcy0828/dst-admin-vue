<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Download, RefreshCw } from '@lucide/vue'
import { modDiagnosticsV2API } from '@/api/v2'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import ModCompatibilityReport from './ModCompatibilityReport.vue'

const props = defineProps({ roomId: { type: String, required: true }, worldId: { type: String, required: true } })
const { t } = useI18n()
const report = ref(null), loading = ref(false), error = ref('')
let generation = 0
async function load() {
  const current = ++generation
  report.value = null; error.value = ''; loading.value = true
  try {
    const result = await modDiagnosticsV2API.analyze(props.roomId, props.worldId)
    if (current === generation) report.value = result
  } catch (cause) {
    if (current === generation) error.value = cause.message || t('modDiagnostics.failed')
  } finally { if (current === generation) loading.value = false }
}
function download() {
  if (!report.value) return
  const blob = new Blob([JSON.stringify(report.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = 'dst-mod-diagnostics.json'; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
watch(() => [props.roomId, props.worldId], load, { immediate: true })
onBeforeUnmount(() => { generation += 1 })
defineExpose({ load })
</script>

<template>
  <Card>
    <CardHeader class="flex flex-col gap-3 sm:grid">
      <CardTitle>{{ t('modDiagnostics.title') }}</CardTitle>
      <CardDescription>{{ t('modDiagnostics.description') }}</CardDescription>
      <CardAction class="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" :disabled="!report || loading" @click="download"><Download data-icon="inline-start" />{{ t('modDiagnostics.export') }}</Button>
        <Button variant="outline" size="sm" :disabled="loading" @click="load"><Spinner v-if="loading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{ t('modDiagnostics.analyze') }}</Button>
      </CardAction>
    </CardHeader>
    <CardContent class="flex min-w-0 flex-col gap-3">
      <p v-if="loading" role="status" class="text-sm text-muted-foreground">{{ t('modDiagnostics.loading') }}</p>
      <Alert v-else-if="error" variant="destructive"><AlertTitle>{{ t('modDiagnostics.failed') }}</AlertTitle><AlertDescription>{{ error }}</AlertDescription></Alert>
      <ModCompatibilityReport v-else-if="report" :report="report" />
      <p v-if="report" class="text-xs text-muted-foreground">{{ t('modDiagnostics.exportHint') }}</p>
    </CardContent>
  </Card>
</template>
