<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleAlert, Download, ExternalLink, PackageCheck, RefreshCw } from '@lucide/vue'
import { useSoftwareUpdate } from '@/composables/useSoftwareUpdate'
import { formatSoftwareBytes, softwareUpdateActive } from '@/lib/softwareUpdate.mjs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const { t } = useI18n()
const update = useSoftwareUpdate()
const { state } = update
const source = ref('auto')
const confirmation = ref('')
const confirmingVersion = ref('')
const snapshot = computed(() => state.snapshot)
const latest = computed(() => snapshot.value?.check?.latest)
const operation = computed(() => snapshot.value?.operation)
const busy = computed(() => state.acting || state.reconnecting || softwareUpdateActive(operation.value) || snapshot.value?.supported && snapshot.value?.ready === false)
const phaseLabel = computed(() => operation.value ? t(`softwareUpdate.phases.${operation.value.phase}`) : '')
const confirmationTitle = computed(() => t(`softwareUpdate.${confirmation.value === 'apply' ? 'confirmApply' : 'confirmUpdate'}`, { version: confirmingVersion.value }))
const errorMessage = computed(() => {
  const key = { SOFTWARE_RESTART_TIMEOUT: 'softwareUpdate.restartTimeout', SOFTWARE_CONNECTION_TIMEOUT: 'softwareUpdate.connectionTimeout' }[state.error]
  return key ? t(key) : state.error
})

function confirm(action) {
  confirmingVersion.value = action === 'apply' ? operation.value.version : latest.value.version
  confirmation.value = action
}

async function execute() {
  const action = confirmation.value, version = confirmingVersion.value
  confirmation.value = ''
  if (action === 'apply') await update.apply()
  else await update.update(version, source.value)
}
</script>

<template>
  <div class="flex min-w-0 flex-col gap-4">
    <Alert v-if="state.error" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ t(state.snapshot ? 'softwareUpdate.actionFailed' : 'softwareUpdate.loadFailed') }}</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
      <Button variant="outline" size="sm" :disabled="state.loading" @click="update.reconnect()">{{ t('softwareUpdate.retry') }}</Button>
    </Alert>
    <Skeleton v-if="!snapshot" class="h-60 w-full" />
    <Card v-else>
      <CardHeader>
        <CardTitle>{{ t('softwareUpdate.management') }}</CardTitle>
        <CardDescription>{{ t('softwareUpdate.description') }}</CardDescription>
      </CardHeader>
      <CardContent class="flex min-w-0 flex-col gap-5">
        <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1">
            <dt class="text-sm text-muted-foreground">{{ t('softwareUpdate.current') }}</dt>
            <dd class="text-xl font-semibold tabular-nums">{{ snapshot.current.version }}</dd>
          </div>
          <div class="flex flex-col gap-1">
            <dt class="text-sm text-muted-foreground">{{ t('softwareUpdate.latest') }}</dt>
            <dd class="flex flex-wrap items-center gap-2 text-xl font-semibold tabular-nums">
              {{ latest?.version || '—' }}
              <Badge :variant="snapshot.check.hasUpdate ? 'default' : 'secondary'">{{ t(snapshot.check.hasUpdate ? 'softwareUpdate.available' : latest ? 'softwareUpdate.upToDate' : 'softwareUpdate.unknown') }}</Badge>
            </dd>
          </div>
        </dl>
        <Alert v-if="!snapshot.supported">
          <CircleAlert /><AlertTitle>{{ t('softwareUpdate.unsupported') }}</AlertTitle>
          <AlertDescription>{{ t(`softwareUpdate.reasons.${snapshot.unsupportedReason}`) }}</AlertDescription>
        </Alert>
        <Alert v-else-if="snapshot.ready === false"><Spinner /><AlertDescription>{{ t('softwareUpdate.starting') }}</AlertDescription></Alert>
        <Alert v-if="snapshot.check.warning" variant="destructive">
          <CircleAlert /><AlertTitle>{{ t('softwareUpdate.checkFailed') }}</AlertTitle>
          <AlertDescription class="break-words">{{ snapshot.check.warning }}</AlertDescription>
        </Alert>
        <Alert v-if="snapshot.check.hasUpdate && !latest?.onlineUpdate">
          <CircleAlert /><AlertDescription>{{ t('softwareUpdate.packageMissing') }}</AlertDescription>
        </Alert>
        <Field>
          <FieldLabel id="software-source-label">{{ t('softwareUpdate.source') }}</FieldLabel>
          <ToggleGroup :model-value="source" type="single" variant="outline" aria-labelledby="software-source-label" :disabled="busy" @update:model-value="value => { if (value) source = value }">
            <ToggleGroupItem value="auto">{{ t('softwareUpdate.auto') }}</ToggleGroupItem>
            <ToggleGroupItem value="direct">{{ t('softwareUpdate.direct') }}</ToggleGroupItem>
            <ToggleGroupItem value="proxy">{{ t('softwareUpdate.proxy') }}</ToggleGroupItem>
          </ToggleGroup>
          <FieldDescription>{{ t('softwareUpdate.autoDescription') }}</FieldDescription>
        </Field>
        <div v-if="operation" class="flex min-w-0 flex-col gap-2" aria-live="polite">
          <p v-if="state.retrying" class="text-sm text-muted-foreground">{{ t('softwareUpdate.trackingReconnect') }}</p>
          <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span class="flex items-center gap-2"><Spinner v-if="busy" />{{ phaseLabel }} · {{ operation.version }}</span>
            <span v-if="operation.phase === 'downloading'" class="text-muted-foreground tabular-nums">{{ formatSoftwareBytes(operation.bytesPerSecond) }}/s</span>
          </div>
          <Progress v-if="busy || operation.phase === 'prepared'" :model-value="operation.progress" :aria-label="t('softwareUpdate.progress')" />
          <p v-if="operation.totalBytes > 0 && operation.phase === 'downloading'" class="text-sm text-muted-foreground tabular-nums">{{ t('softwareUpdate.downloaded', { downloaded: formatSoftwareBytes(operation.downloadedBytes), total: formatSoftwareBytes(operation.totalBytes) }) }}</p>
          <p v-if="state.reconnecting || operation.phase === 'restarting'" class="text-sm text-muted-foreground">{{ t('softwareUpdate.reconnecting') }}</p>
          <Alert v-if="operation.error" variant="destructive"><CircleAlert /><AlertTitle>{{ phaseLabel }}</AlertTitle><AlertDescription class="break-words">{{ operation.error }}</AlertDescription></Alert>
        </div>
        <div v-if="latest?.notes" class="flex min-w-0 flex-col gap-2">
          <h3 class="text-sm font-medium">{{ t('softwareUpdate.notes') }}</h3>
          <pre class="max-h-64 overflow-auto whitespace-pre-wrap break-words font-sans text-sm text-muted-foreground">{{ latest.notes }}</pre>
        </div>
      </CardContent>
      <CardFooter class="flex flex-wrap gap-2">
        <Button variant="outline" :disabled="state.checking || busy" @click="update.check(true, source)">
          <Spinner v-if="state.checking" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />
          {{ t(state.checking ? 'softwareUpdate.checking' : 'softwareUpdate.check') }}
        </Button>
        <Button v-if="operation?.phase === 'prepared' && snapshot.supported" :disabled="busy" @click="confirm('apply')">
          <PackageCheck data-icon="inline-start" />{{ t('softwareUpdate.apply') }}
        </Button>
        <Button v-else-if="snapshot.check.hasUpdate && latest?.onlineUpdate && snapshot.supported" :disabled="busy" @click="confirm('update')">
          <Download data-icon="inline-start" />{{ t('softwareUpdate.update', { version: latest.version }) }}
        </Button>
        <Button v-if="latest?.url" variant="ghost" as-child><a :href="latest.url" target="_blank" rel="noopener noreferrer">{{ t('softwareUpdate.release') }}<ExternalLink data-icon="inline-end" /></a></Button>
      </CardFooter>
    </Card>
    <p class="text-sm text-muted-foreground">{{ t('softwareUpdate.scope') }} {{ t('softwareUpdate.imageNote') }}</p>
    <AlertDialog :open="Boolean(confirmation)" @update:open="open => { if (!open) confirmation = '' }">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ confirmationTitle }}</AlertDialogTitle>
          <AlertDialogDescription>{{ t('softwareUpdate.confirmDescription') }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>{{ t('softwareUpdate.cancel') }}</AlertDialogCancel><AlertDialogAction @click="execute">{{ t('softwareUpdate.confirm') }}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
