<script setup>
import { ArrowDown, ArrowUp, ArrowUpDown } from '@lucide/vue'
import { Button } from '@/components/ui/button'

defineProps({
  label: { type: String, required: true },
  field: { type: String, required: true },
  activeField: { type: String, default: '' },
  order: { type: String, default: '' },
})

defineEmits(['sort'])
</script>

<template>
  <Button variant="ghost" size="sm" @click="$emit('sort', field)">
    {{ label }}
    <ArrowUp v-if="activeField === field && order === 'ascending'" data-icon="inline-end" />
    <ArrowDown v-else-if="activeField === field && order === 'descending'" data-icon="inline-end" />
    <ArrowUpDown v-else data-icon="inline-end" />
  </Button>
</template>
