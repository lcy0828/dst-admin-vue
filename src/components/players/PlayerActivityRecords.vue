<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { TriangleAlert } from '@lucide/vue'
import { activityPaths, activityPlot } from '@/lib/playerActivity.mjs'
import { formatSystemDateTime } from '@/lib/dateTime.mjs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { Table, TableBody, TableRow, TableCell, TableHead, TableHeader } from '@/components/ui/table'
const props = defineProps({ data: { type: Object, required: true }, tab: { type: String, default: 'timeline' }, worlds: { type: Array, default: () => [] } })
const { t } = useI18n()
const items = computed(() => props.data?.items || [])
const paths = computed(() => activityPlot(activityPaths(items.value)))
const time = value => value ? formatSystemDateTime(value) : '—'
const worldName = value => props.worlds.find(w => w.worldId === value)?.worldName || value
const kindLabel = value => t(`activity.kinds.${String(value).replaceAll('.', '_')}`)
const incomplete = computed(() => props.data?.coverage?.some(w => !w.complete))
</script>
<template>
  <div class="flex flex-col gap-3">
    <Alert v-if="incomplete"><TriangleAlert /><AlertDescription>{{ t('activity.incomplete') }}</AlertDescription></Alert>
          <template v-if="tab === 'trajectory'">
            <p class="text-xs text-muted-foreground">{{ t('activity.sampled') }}</p>
            <svg v-if="paths.length" viewBox="0 0 600 280" class="max-h-72 w-full rounded-md border bg-muted/30" role="img" :aria-label="t('activity.trajectory')"><g v-for="(path, index) in paths" :key="index"><polyline :points="path.line" fill="none" stroke="currentColor" stroke-width="1.5" :stroke-dasharray="index % 2 ? '4 3' : undefined" /><circle v-for="(point, i) in path.line.split(' ')" :key="i" :cx="point.split(',')[0]" :cy="point.split(',')[1]" r="2.5" fill="currentColor"><title>{{ worldName(path.worldId) }} · {{ time(path.points[i].at) }} · {{ path.points[i].x.toFixed(1) }}, {{ path.points[i].z.toFixed(1) }}</title></circle></g></svg>
          </template>
          <template v-if="tab === 'combat'">
            <Alert v-if="data.truncated"><TriangleAlert /><AlertDescription>{{ t('activity.combatLimit') }}</AlertDescription></Alert>
            <Table v-if="items.length"><TableHeader><TableRow><TableHead>{{ t('activity.player') }}</TableHead><TableHead>{{ t('activity.world') }}</TableHead><TableHead>{{ t('activity.target') }}</TableHead><TableHead>{{ t('activity.direction') }}</TableHead><TableHead>{{ t('activity.hits') }}</TableHead><TableHead>{{ t('activity.damage') }}</TableHead><TableHead>{{ t('activity.kills') }}</TableHead></TableRow></TableHeader><TableBody><TableRow v-for="(row, index) in items" :key="index"><TableCell>{{ row.userId }}</TableCell><TableCell>{{ worldName(row.worldId) }}</TableCell><TableCell>{{ row.targetPrefab }}<Badge v-if="row.epic" variant="outline">{{ t('activity.epic') }}</Badge></TableCell><TableCell>{{ t(`activity.${row.direction}`) }}</TableCell><TableCell>{{ row.hits }}</TableCell><TableCell>{{ row.damage == null ? t('activity.unknown') : row.damage.toFixed(1) }}<p v-if="row.unknownDamageHits" class="text-xs text-muted-foreground">{{ t('activity.unknownHits', { count: row.unknownDamageHits }) }}</p></TableCell><TableCell>{{ row.kills }}</TableCell></TableRow></TableBody></Table>
          </template>
          <div v-else class="flex flex-col gap-2">
            <article v-for="event in items" :key="event.id" class="flex flex-col gap-1 rounded-md border p-3 text-sm">
              <div class="flex flex-wrap items-center gap-2"><span class="font-medium">{{ event.source ? t(event.source === 'sample' ? 'activity.position' : 'activity.action') : event.fields?.recovered ? t('activity.recoveredBoundary') : kindLabel(event.kind) }}</span><Badge variant="outline">{{ worldName(event.worldId) }}</Badge><span>{{ event.name || event.userId }}</span><time class="text-xs text-muted-foreground">{{ time(event.occurredAt) }}</time></div>
              <p v-if="event.kind?.startsWith('collection.')" class="text-xs text-muted-foreground">{{ t(event.kind === 'collection.instance' ? 'activity.instanceHint' : event.fields?.recovered ? 'activity.recoveredHint' : 'activity.gapHint') }} · {{ event.fields?.code }}</p>
              <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span v-if="event.position">X {{ event.position.x.toFixed(1) }} / Z {{ event.position.z.toFixed(1) }}</span><span v-if="event.fields?.targetPrefab">{{ event.fields?.targetPrefab }}</span><span v-if="event.fields?.count">{{ t('activity.count') }} {{ event.fields?.count }}</span><span v-if="event.fields?.hits">{{ t('activity.hits') }} {{ event.fields?.hits }}</span><Badge v-if="event.fields?.epic" variant="secondary">{{ t('activity.epic') }}</Badge></div>
            </article>
          </div>
          <Empty v-if="!items.length"><EmptyHeader><EmptyTitle>{{ t('activity.empty') }}</EmptyTitle><EmptyDescription>{{ t('activity.emptyHint') }}</EmptyDescription></EmptyHeader></Empty>
  </div>
</template>
