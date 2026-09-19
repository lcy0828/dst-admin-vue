<template>
  <Card :class="cn('topology-world', { 'is-master': master, 'is-error': hasError, 'is-warning': hasWarning })" size="sm">
    <CardHeader class="flex flex-row items-start gap-2.5">
      <span class="topology-world-icon" aria-hidden="true"><Server v-if="master" /><Boxes v-else /></span>
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <CardTitle class="min-w-0 break-words">{{ node.name }}</CardTitle>
          <Badge :variant="runtimeVariant">{{ t(`roomTopology.runtime.${runtimeState}`) }}</Badge>
        </div>
        <CardDescription>
          {{ t(master ? 'roomTopology.nodes.master' : 'roomTopology.nodes.secondary') }} · {{ t(`roomTopology.worldTypes.${worldType}`) }}
        </CardDescription>
      </div>
    </CardHeader>
    <CardContent class="group-data-[size=sm]/card:pt-0">
      <RoomTopologyNodeFacts :node="node" :master="master" />
    </CardContent>
    <CardFooter v-if="node.route" class="topology-route-details flex-col items-stretch gap-1.5" :class="{ 'is-missing': node.route.state === 'missing' }">
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <span class="text-xs text-muted-foreground">{{ t('roomTopology.routes.toMaster') }}</span>
        <Badge :variant="node.route.state === 'missing' ? 'destructive' : 'outline'" class="h-auto whitespace-normal">
          {{ t(`roomTopology.routes.${routeMode}`) }}
        </Badge>
      </div>
      <code v-if="node.route.endpoint" class="topology-endpoint">{{ node.route.endpoint }}</code>
      <span v-else class="text-xs text-muted-foreground">{{ t('roomTopology.routes.unavailable') }}</span>
    </CardFooter>
  </Card>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Boxes, Server } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import RoomTopologyNodeFacts from './RoomTopologyNodeFacts.vue'

const props = defineProps({
  node: { type: Object, required: true },
  master: { type: Boolean, default: false }
})
const { t } = useI18n()
const runtimeState = computed(() => ['running', 'stopped', 'starting', 'failed'].includes(props.node.runtimeState) ? props.node.runtimeState : 'unknown')
const runtimeVariant = computed(() => ({ running: 'success', failed: 'destructive', starting: 'warning' })[runtimeState.value] || 'outline')
const worldType = computed(() => ['forest', 'cave'].includes(props.node.type) ? props.node.type : 'unknown')
const routeMode = computed(() => ['local', 'lan', 'overlay', 'tunnel', 'public', 'configured', 'manual', 'missing'].includes(props.node.route?.mode) ? props.node.route.mode : 'manual')
const hasError = computed(() => props.node.placementTone === 'error' || !props.node.targetOnline)
const hasWarning = computed(() => props.node.placementTone === 'warning' || props.node.installationStale || !props.node.installationAvailable)
</script>

<style scoped>
.topology-world {
  min-width: 0;
  overflow-wrap: anywhere;
}

.topology-world.is-master {
  border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
}

.topology-world.is-warning {
  border-color: color-mix(in srgb, var(--warning) 55%, var(--border));
}

.topology-world.is-error {
  border-color: color-mix(in srgb, var(--destructive) 55%, var(--border));
}

.topology-world-icon {
  display: grid;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  place-items: center;
  color: var(--muted-foreground);
  border-radius: var(--radius-sm);
  background: var(--muted);
}

.is-master .topology-world-icon {
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 10%, var(--background));
}

.topology-world-icon svg {
  width: 17px;
  height: 17px;
}

.topology-route-details.is-missing {
  border-color: color-mix(in srgb, var(--destructive) 45%, var(--border));
}

.topology-endpoint {
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 18px;
  overflow-wrap: anywhere;
}
</style>
