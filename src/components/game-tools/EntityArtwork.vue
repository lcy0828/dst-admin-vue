<script setup>
import { computed, ref, watch } from 'vue'
import { useIntersectionObserver } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { Box } from '@lucide/vue'
import apiConfig from '@/api/config'
import { entityArtworkCandidates } from '@/lib/entityArtwork.mjs'
import { artworkPackIndex } from '@/composables/useArtworkPack'
const props = defineProps({ entity: { type: Object, default: null }, roomId: { type: String, default: '' }, worldId: { type: String, default: '' } })
const { t } = useI18n()
const candidates = computed(() => entityArtworkCandidates(props.entity, { roomId: props.roomId, worldId: props.worldId, apiBase: apiConfig.BASE_URL, pack: artworkPackIndex.value }))
const attempt = ref(0)
const target = ref(null)
const visible = ref(false)
const { stop } = useIntersectionObserver(target, ([entry]) => {
 if (entry?.isIntersecting) { visible.value = true; stop() }
})
watch(() => candidates.value.join('\n'), () => { attempt.value = 0 })
</script>
<template>
 <span ref="target" class="flex size-full items-center justify-center" :title="!candidates[attempt] ? t('workbench.catalog.noArtwork') : undefined">
  <img v-if="visible && candidates[attempt]" :key="candidates[attempt]" :src="candidates[attempt]" alt="" loading="lazy" decoding="async" class="size-full object-contain" @error="attempt++">
  <Box v-else class="size-5 text-muted-foreground" aria-hidden="true" />
 </span>
</template>
