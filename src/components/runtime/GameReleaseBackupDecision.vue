<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleAlert } from '@lucide/vue'
import { useGameUpdate } from '@/composables/useGameUpdate'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

const props = defineProps({ release: { type: Object, required: true } })
const { t } = useI18n()
const update = useGameUpdate()
const confirmSkip = ref(false)
watch(() => props.release.id, () => { confirmSkip.value = false })
const busy = computed(() => Boolean(update.state.decisionReleaseId || update.state.accepted || update.state.decisionUncertain || update.state.activeJobs.length))
function skip() {
  if (!confirmSkip.value) { confirmSkip.value = true; return }
  void update.resolveBackup(props.release.id, 'skip')
}
</script>

<template>
  <Alert>
    <CircleAlert /><AlertTitle>{{ t('gameReleases.options.backupFailed') }}</AlertTitle>
    <AlertDescription class="flex flex-col gap-2">
      <p>{{ release.errorMessage }}</p>
      <p>{{ t(confirmSkip ? 'gameReleases.options.skipWarning' : 'gameReleases.options.backupDecisionHint') }}</p>
      <div class="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" :disabled="busy" @click="update.resolveBackup(release.id, 'retry')">{{ t('gameReleases.options.retryBackup') }}</Button>
        <Button size="sm" :disabled="busy" @click="skip">{{ t(confirmSkip ? 'gameReleases.options.confirmSkip' : 'gameReleases.options.skipBackup') }}</Button>
        <Button size="sm" variant="outline" :disabled="busy" @click="update.resolveBackup(release.id, 'cancel')">{{ t('gameReleases.options.cancelRestore') }}</Button>
      </div>
      <p v-if="update.state.decisionError" role="alert">{{ update.state.decisionError }}</p>
      <p v-if="update.state.decisionUncertain">{{ t('gameReleases.workflow.uncertainHint') }}</p>
      <Button v-if="update.state.decisionUncertain" size="sm" variant="outline" :disabled="update.state.pendingLoading" @click="update.refreshPending">{{ t('gameReleases.workflow.reconcile') }}</Button>
    </AlertDescription>
  </Alert>
</template>
