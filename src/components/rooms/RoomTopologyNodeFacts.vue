<template>
  <dl class="topology-node-facts">
    <div>
      <dt>{{ t('roomTopology.fields.machine') }}</dt>
      <dd :title="node.targetId">{{ node.targetName || '--' }}</dd>
    </div>
    <div>
      <dt>{{ t('roomTopology.fields.shardId') }}</dt>
      <dd>{{ shardId(node.shardId) || '--' }}</dd>
    </div>
    <div>
      <dt>{{ t(master ? 'roomTopology.fields.playerPort' : 'roomTopology.fields.worldPort') }}</dt>
      <dd>{{ node.port ? `${node.port} / UDP` : '--' }}</dd>
    </div>
    <div v-if="master">
      <dt>{{ t('roomTopology.fields.shardPort') }}</dt>
      <dd>{{ node.shardPort ? `${node.shardPort} / UDP` : '--' }}</dd>
    </div>
    <div v-if="node.pending" class="topology-placement-fact">
      <dt>{{ t('roomTopology.fields.placement') }}</dt>
      <dd>{{ t('roomTopology.fields.pendingTarget', { machine: node.desiredTargetName || '--' }) }}</dd>
    </div>
  </dl>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

defineProps({
  node: { type: Object, required: true },
  master: { type: Boolean, default: false }
})

const { t } = useI18n()

function shardId(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}
</script>

<style scoped>
.topology-node-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 14px;
  margin: 0;
}

.topology-node-facts > div {
  min-width: 0;
}

.topology-node-facts dt,
.topology-node-facts dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

.topology-node-facts dt {
  color: var(--muted-foreground);
  font-size: 11px;
  line-height: 16px;
}

.topology-node-facts dd {
  margin-top: 1px;
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
}

.topology-placement-fact {
  grid-column: 1 / -1;
}
</style>
