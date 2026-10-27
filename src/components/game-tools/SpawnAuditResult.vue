<script setup>
import { useI18n } from 'vue-i18n'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

defineProps({ audit: { type: Object, required: true } })
const { t } = useI18n()
function position(value) {
  if (!value || ![value.x, value.y, value.z].every(Number.isFinite)) return t('spawnAudit.unknown')
  return `X ${value.x.toFixed(2)} · Y ${value.y.toFixed(2)} · Z ${value.z.toFixed(2)}`
}
function destination(record) {
  return record.destination === 'world' ? position(record.position) : t(record.destination === 'inventory' ? 'spawnAudit.inventory' : 'spawnAudit.unresolved')
}
</script>

<template>
  <section class="flex min-w-0 flex-col gap-2" data-spawn-audit :aria-label="t('spawnAudit.title')">
    <p class="text-sm font-medium">{{ t('spawnAudit.title') }}</p>
    <Alert v-if="audit.status !== 'complete'">
      <AlertTitle>{{ t(audit.status === 'partial' ? 'spawnAudit.partial' : 'spawnAudit.unavailable') }}</AlertTitle>
      <AlertDescription>{{ t('spawnAudit.incompleteHint') }}</AlertDescription>
    </Alert>
    <p v-if="audit.origin" class="break-words text-xs text-muted-foreground">{{ t('spawnAudit.origin') }} · {{ position(audit.origin) }}</p>
    <p v-if="Number.isInteger(audit.total)" class="text-xs text-muted-foreground">{{ t('spawnAudit.total', { count: audit.total }) }}</p>
    <div v-if="audit.records?.length" class="max-h-64 overflow-auto">
      <Table>
        <TableHeader><TableRow><TableHead>{{ t('spawnAudit.prefab') }}</TableHead><TableHead>{{ t('spawnAudit.quantity') }}</TableHead><TableHead>{{ t('spawnAudit.destination') }}</TableHead></TableRow></TableHeader>
        <TableBody>
          <TableRow v-for="(record, index) in audit.records" :key="index">
            <TableCell class="max-w-52 break-all font-mono text-xs">{{ record.prefab }}</TableCell>
            <TableCell>{{ record.quantity }}</TableCell>
            <TableCell class="whitespace-normal text-xs">{{ destination(record) }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
    <p v-if="audit.omitted" class="text-xs text-muted-foreground">{{ t('spawnAudit.omitted', { count: audit.omitted }) }}</p>
    <p v-if="audit.records?.length" class="text-xs text-muted-foreground">{{ t('spawnAudit.positionHint') }}</p>
  </section>
</template>
