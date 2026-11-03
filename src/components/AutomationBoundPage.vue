<script setup>
import { provide } from 'vue'
const props = defineProps({ page: { type: [Object, Function], required: true }, api: { type: Object, required: true } })
// Capture, do not provide a computed reference to the next room's API. Old
// confirmation callbacks must keep their disposed binding after unmount.
provide('automationApi', props.api)
</script>
<template><component :is="page" /></template>
