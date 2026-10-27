<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

const props = defineProps({ report: { type: Object, required: true } })
const { t, te } = useI18n()
const observation = computed(() => props.report.observation || {})
const codes = computed(() => [...new Set(props.report.limitations || [])])
const criticalLimitations = computed(() => codes.value.filter(code => ['LOG_UNAVAILABLE', 'LOG_FROM_PREVIOUS_START', 'MOD_FACTS_UNAVAILABLE', 'RUNTIME_UNAVAILABLE', 'PLACEMENT_CHANGED'].includes(code)))
const modCount = computed(() => {
  if (codes.value.some(code => ['MOD_FACTS_UNAVAILABLE', 'RUNTIME_UNAVAILABLE', 'PLACEMENT_CHANGED'].includes(code))) return t('modDiagnostics.unknownCount')
  const count = observation.value.mods?.length || 0
  return codes.value.includes('MOD_LIMIT_REACHED') ? t('modDiagnostics.atLeast', { count }) : t('modDiagnostics.enabledCount', { count })
})
const label = code => te(`modDiagnostics.codes.${code}`) ? t(`modDiagnostics.codes.${code}`) : code
const modName = id => {
  const mod = observation.value.mods?.find(item => item.id === id) || props.report.baseline?.observation?.mods?.find(item => item.id === id)
  return mod?.name ? `${mod.name} (${id})` : id
}
const date = value => value ? new Date(value).toLocaleString() : '--'
</script>

<template>
  <div class="flex min-w-0 flex-col gap-3" data-mod-report>
    <div class="flex flex-wrap items-center gap-2">
      <span class="font-medium">{{ observation.worldName || observation.worldId }}</span>
      <Badge :variant="report.status === 'observed_problem' ? 'destructive' : report.status === 'suspected' ? 'warning' : 'secondary'">{{ t(`modDiagnostics.status.${report.status}`) }}</Badge>
      <span class="text-xs text-muted-foreground">{{ observation.targetId === 'local' ? t('modDiagnostics.local') : observation.targetId }}<template v-if="observation.installationId"> · {{ observation.installationId }}</template></span>
    </div>
    <p class="text-sm text-muted-foreground">
      {{ t('modDiagnostics.versions', { game: observation.version?.gameVersion || '--', build: observation.version?.steamBuild || '--', mods: modCount }) }}
    </p>
    <Alert v-if="criticalLimitations.length">
      <AlertTitle>{{ t('modDiagnostics.incomplete') }}</AlertTitle>
      <AlertDescription class="flex flex-col gap-1"><span v-for="code in criticalLimitations" :key="code">{{ label(code) }}</span></AlertDescription>
    </Alert>
    <Alert v-if="report.findings?.length" :variant="report.status === 'observed_problem' ? 'destructive' : 'default'">
      <AlertTitle>{{ t('modDiagnostics.findings') }}</AlertTitle>
      <AlertDescription>
        <ul class="flex list-disc flex-col gap-1 pl-4">
          <li v-for="(finding, index) in report.findings" :key="index">
            {{ label(finding.code) }}<span v-if="finding.modIds?.length"> · {{ finding.modIds.map(modName).join('、') }}</span>
          </li>
        </ul>
      </AlertDescription>
    </Alert>
    <p v-else class="text-sm">{{ t('modDiagnostics.noFindings') }}</p>

    <div v-if="report.evidence?.length" class="flex min-w-0 flex-col gap-2">
      <p class="text-xs text-muted-foreground">{{ t(`modDiagnostics.correlation.${report.logCorrelation}`) }}</p>
      <details v-for="(evidence, index) in report.evidence" :key="evidence.errorCursor" :open="index === 0" class="min-w-0 rounded-md border p-3">
        <summary class="cursor-pointer text-sm font-medium">{{ t('modDiagnostics.errorBlock', { index: index + 1, cursor: evidence.errorCursor }) }}</summary>
        <pre class="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs">{{ evidence.lines.join('\n') }}</pre>
        <p v-if="evidence.truncated" class="mt-2 text-xs text-muted-foreground">{{ t('modDiagnostics.codes.STACK_TRUNCATED') }}</p>
      </details>
    </div>

    <details v-if="report.baseline || report.changes?.length" class="rounded-md border p-3">
      <summary class="cursor-pointer text-sm font-medium">{{ t('modDiagnostics.comparison', { count: report.changes?.length || 0 }) }}</summary>
      <p class="mt-2 text-xs text-muted-foreground">{{ t('modDiagnostics.baseline', { time: date(report.baseline?.capturedAt) }) }}</p>
      <ul v-if="report.changes?.length" class="mt-2 flex flex-col gap-1 text-sm">
        <li v-for="(change, index) in report.changes" :key="index" class="break-all">
          {{ t(`modDiagnostics.fields.${change.field}`) }}<template v-if="change.modId"> · {{ modName(change.modId) }}</template>：{{ change.before || '--' }} → {{ change.after || '--' }}
        </li>
      </ul>
    </details>

    <details v-if="observation.mods?.length" class="rounded-md border p-3">
      <summary class="cursor-pointer text-sm font-medium">{{ t('modDiagnostics.modList', { count: observation.mods.length }) }}</summary>
      <ul class="mt-2 flex flex-col gap-2 text-sm">
        <li v-for="mod in observation.mods" :key="mod.id" class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span class="break-all font-medium">{{ mod.name || mod.id }}</span>
          <span class="text-xs text-muted-foreground">{{ t('modDiagnostics.modVersion', { version: mod.version || '--', manifest: mod.manifest || '--' }) }}</span>
          <span class="text-xs text-muted-foreground">{{ t('modDiagnostics.declaration', { dst: mod.dstCompatible === undefined ? '--' : String(mod.dstCompatible), api: mod.apiVersion || '--' }) }}</span>
        </li>
      </ul>
    </details>

    <details class="rounded-md border p-3">
      <summary class="cursor-pointer text-sm font-medium">{{ t('modDiagnostics.limits') }}</summary>
      <ul class="mt-2 flex list-disc flex-col gap-1 pl-4 text-xs text-muted-foreground">
        <li v-for="code in codes" :key="code">{{ label(code) }}</li>
      </ul>
      <p class="mt-2 text-xs text-muted-foreground">{{ t('modDiagnostics.observedAt', { time: date(observation.observedAt) }) }}</p>
    </details>
    <ul v-if="report.recommendations?.length" class="flex list-disc flex-col gap-1 pl-4 text-sm">
      <li v-for="code in report.recommendations" :key="code">{{ label(code) }}</li>
    </ul>
  </div>
</template>
