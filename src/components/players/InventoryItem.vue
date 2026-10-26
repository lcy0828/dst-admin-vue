<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronRight } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import EntityArtwork from '@/components/game-tools/EntityArtwork.vue'
import { cn } from '@/lib/utils'
import { inventoryMetricText } from '@/lib/playerInventory.mjs'
const props = defineProps({ item: { type: Object, required: true }, roomId: { type: String, default: '' }, worldId: { type: String, default: '' }, query: { type: String, default: '' } })
const { t, n } = useI18n()
const expanded = ref(false)
const metrics = computed(() => Object.entries(props.item.metrics || {}).map(([key, value]) => ({ key, text: inventoryMetricText(value, n) })).filter(value => value.text))
const entity = computed(() => ({ id: props.item.prefab, source: 'runtime', modId: props.item.modId || '' }))
</script>
<template>
  <li class="min-w-0 rounded-md border bg-card p-2">
    <div class="flex min-w-0 items-center gap-3">
      <span class="size-10 shrink-0"><EntityArtwork :entity="entity" :room-id="roomId" :world-id="worldId" /></span>
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <div class="flex min-w-0 items-start justify-between gap-2"><span class="truncate font-medium" :title="item.name || item.prefab">{{ item.name || item.prefab }}</span><span v-if="item.count != null" class="shrink-0 tabular-nums text-muted-foreground">× {{ n(item.count) }}</span></div>
        <div class="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"><span class="truncate">{{ item.prefab }}</span><span>{{ t('inventory.slot', { slot: item.slot }) }}</span></div>
        <p v-if="metrics.length" class="text-xs text-muted-foreground">{{ metrics.map(metric => `${t(`inventory.metrics.${metric.key}`)} ${metric.text}`).join(' · ') }}</p>
        <p v-if="item.warnings?.length" class="text-xs text-muted-foreground">{{ t('inventory.unreadContents') }}</p>
      </div>
    </div>
    <Collapsible v-if="item.contents?.length" :open="expanded || Boolean(query)" @update:open="expanded = $event">
      <CollapsibleTrigger as-child><Button variant="ghost" size="sm" class="mt-1 w-full justify-start" :aria-label="t('inventory.contents', { count: item.contents.length })"><ChevronRight data-icon="inline-start" :class="cn((expanded || query) && 'rotate-90')" />{{ t('inventory.contents', { count: item.contents.length }) }}</Button></CollapsibleTrigger>
      <CollapsibleContent><ul v-if="expanded || query" class="mt-2 flex min-w-0 flex-col gap-2 border-l pl-2"><InventoryItem v-for="child in item.contents" :key="child.nodeId" :item="child" :room-id="roomId" :world-id="worldId" :query="query" /></ul></CollapsibleContent>
    </Collapsible>
  </li>
</template>
