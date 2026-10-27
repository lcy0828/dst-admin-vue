<script setup>
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'
import ModCompatibilityReport from './ModCompatibilityReport.vue'
defineProps({ reports: { type: Array, default: () => [] } })
const { t } = useI18n()
</script>
<template>
  <section v-if="reports.length" class="flex min-w-0 flex-col gap-3">
    <div><h3 class="text-sm font-medium">{{ t('modDiagnostics.preflightTitle') }}</h3><p class="text-xs text-muted-foreground">{{ t('modDiagnostics.preflightHint') }}</p></div>
    <details v-for="report in reports" :key="`${report.observation.roomId}:${report.observation.worldId}`" class="min-w-0 rounded-md border p-3">
      <summary class="cursor-pointer text-sm"><span v-if="report.observation.roomName">{{ report.observation.roomName }} · </span>{{ report.observation.worldName || report.observation.worldId }} <Badge :variant="report.status === 'observed_problem' ? 'destructive' : report.status === 'suspected' ? 'warning' : 'secondary'">{{ t(`modDiagnostics.status.${report.status}`) }}</Badge></summary>
      <div class="pt-3"><ModCompatibilityReport :report="report" /></div>
    </details>
  </section>
</template>
