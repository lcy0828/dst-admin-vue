<template>
  <dl class="topology-node-facts" :class="{ 'is-master': master, 'has-pending': node.pending }">
    <div>
      <dt>{{ t('roomTopology.fields.machine') }}</dt>
      <dd :title="node.targetId">{{ node.targetName || '--' }}</dd>
    </div>
    <div>
      <dt>{{ t('roomTopology.fields.worldType') }}</dt>
      <dd>{{ t(`roomTopology.worldTypes.${worldType(node.type)}`) }}</dd>
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

function worldType(value) {
  return ['forest', 'cave'].includes(String(value || '').trim().toLowerCase())
    ? String(value).trim().toLowerCase()
    : 'unknown'
}

function shardId(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}
</script>

<style scoped>
.topology-node-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 12px;
  margin: 8px 0 0;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.topology-node-facts.is-master,
.topology-node-facts.has-pending {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.topology-node-facts > div {
  min-width: 0;
}

.topology-node-facts dt,
.topology-node-facts dd {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topology-node-facts dt {
  color: var(--muted-foreground);
  font-size: 10px;
  line-height: 14px;
}

.topology-node-facts dd {
  margin-top: 1px;
  font-size: 11px;
  font-weight: 600;
  line-height: 16px;
}

@media (max-width: 767px) {
  .topology-node-facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .topology-node-facts.is-master,
  .topology-node-facts.has-pending {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
