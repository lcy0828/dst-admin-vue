<script setup>
import { computed } from 'vue'
import { ChevronDown } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'
import ModCompatibilityReport from './ModCompatibilityReport.vue'
const props = defineProps({ reports: { type: Array, default: () => [] } })
const { t } = useI18n()
const problems = computed(() => props.reports.filter(report => ['observed_problem', 'suspected'].includes(report.status)))
const other = computed(() => props.reports.filter(report => !['observed_problem', 'suspected'].includes(report.status)))
</script>
<template>
  <section v-if="reports.length" class="flex min-w-0 flex-col gap-3">
    <div><h3 class="text-sm font-medium">{{ t('modDiagnostics.preflightTitle') }}</h3><p class="text-xs text-muted-foreground">{{ t('modDiagnostics.preflightHint') }}</p></div>
    <details v-for="report in problems" :key="`${report.observation.roomId}:${report.observation.worldId}`" class="min-w-0 rounded-md border p-3">
      <summary class="cursor-pointer break-words text-sm"><span v-if="report.observation.roomName">{{ report.observation.roomName }} · </span>{{ report.observation.worldName || report.observation.worldId }} <Badge :variant="report.status === 'observed_problem' ? 'destructive' : report.status === 'suspected' ? 'warning' : 'secondary'">{{ t(`modDiagnostics.status.${report.status}`) }}</Badge></summary>
      <div class="pt-3"><ModCompatibilityReport :report="report" /></div>
    </details>
    <Collapsible v-if="other.length">
      <CollapsibleTrigger as-child><Button variant="ghost" size="sm" class="group">{{ t('modDiagnostics.otherWorlds', { count: other.length }) }}<ChevronDown data-icon="inline-end" class="transition-transform group-data-[state=open]:rotate-180" /></Button></CollapsibleTrigger>
      <CollapsibleContent class="flex min-w-0 flex-col gap-2 pt-2">
        <details v-for="report in other" :key="`${report.observation.roomId}:${report.observation.worldId}`" class="min-w-0 rounded-md border p-3">
          <summary class="cursor-pointer break-words text-sm"><span v-if="report.observation.roomName">{{ report.observation.roomName }} · </span>{{ report.observation.worldName || report.observation.worldId }} <Badge variant="secondary">{{ t(`modDiagnostics.status.${report.status}`) }}</Badge></summary>
          <div class="pt-3"><ModCompatibilityReport :report="report" /></div>
        </details>
      </CollapsibleContent>
    </Collapsible>
  </section>
</template>
