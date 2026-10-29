<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'
import { effectiveWorldRuntimeMode } from '@/lib/runtimeModeInheritance.mjs'

const props = defineProps({ world: { type: Object, required: true } })
const { t } = useI18n()
const mode = computed(() => effectiveWorldRuntimeMode(props.world) || 'unknown')
const title = computed(() => `${t(['running', 'starting'].includes(props.world.status) ? 'runtimeMode.actual' : 'runtimeMode.saved')} · ${t(`runtimeMode.names.${mode.value}`)}`)
</script>

<template>
  <Badge variant="outline" :title="title">{{ t(`runtimeMode.names.${mode}`) }}</Badge>
</template>
