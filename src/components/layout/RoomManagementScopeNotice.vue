<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { GitBranch, Network } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import {
  getManagementScope,
  MANAGEMENT_SCOPE_CHANGED_EVENT,
  MANAGEMENT_SCOPE_TARGET
} from '@/lib/managementScope.mjs'

const { t } = useI18n()
const scope = ref(getManagementScope())
const isTargetScope = computed(() => scope.value.kind === MANAGEMENT_SCOPE_TARGET)
const description = computed(() => isTargetScope.value
  ? t('app.remote.roomScopeTarget', { name: scope.value.targetName || scope.value.targetId })
  : t('app.remote.roomScopeAll'))

function syncScope(event) {
  scope.value = event?.detail || getManagementScope()
}

onMounted(() => window.addEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, syncScope))
onBeforeUnmount(() => window.removeEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, syncScope))
</script>

<template>
  <div class="bg-muted/20 border-b px-4 md:px-6">
    <div class="mx-auto flex h-9 w-full max-w-[1440px] min-w-0 items-center gap-2 text-xs text-muted-foreground lg:px-2">
      <GitBranch v-if="isTargetScope" class="shrink-0" aria-hidden="true" />
      <Network v-else class="shrink-0" aria-hidden="true" />
      <span class="min-w-0 flex-1 truncate" :title="description">{{ description }}</span>
      <Button as-child variant="ghost" size="sm" class="h-7 shrink-0 px-2">
        <RouterLink to="/rooms/topology" :aria-label="t('app.remote.roomScopeTopology')">
          <Network data-icon="inline-start" />
          <span class="hidden sm:inline">{{ t('app.remote.roomScopeTopology') }}</span>
        </RouterLink>
      </Button>
    </div>
  </div>
</template>
