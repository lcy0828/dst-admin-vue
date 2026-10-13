<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowUpCircle, Package } from '@lucide/vue'
import { useSoftwareUpdate } from '@/composables/useSoftwareUpdate'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const { t } = useI18n()
const { state } = useSoftwareUpdate()
const version = computed(() => state.snapshot?.current?.version || '—')
const available = computed(() => state.snapshot?.check?.hasUpdate)
const label = computed(() => `${t('softwareUpdate.management')} ${version.value}${available.value ? ` · ${t('softwareUpdate.available')}` : ''}`)
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <Button :variant="available ? 'warning' : 'ghost'" size="sm" as-child>
        <RouterLink :to="{ path: '/system/settings', query: { tab: 'software' } }" :aria-label="label">
          <ArrowUpCircle v-if="available" data-icon="inline-start" />
          <Package v-else data-icon="inline-start" />
          <span class="hidden lg:inline">{{ t('softwareUpdate.management') }}</span>
          <template v-if="available">
            <span class="hidden sm:inline">{{ version }}</span>
            <span>{{ t('softwareUpdate.available') }}</span>
          </template>
          <span v-else>{{ version }}</span>
        </RouterLink>
      </Button>
    </TooltipTrigger>
    <TooltipContent>{{ label }}</TooltipContent>
  </Tooltip>
</template>
