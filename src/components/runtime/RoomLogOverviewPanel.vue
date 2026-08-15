<template>
  <section class="flex min-w-0 flex-col gap-3" aria-labelledby="room-log-overview-title">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <h2 id="room-log-overview-title" class="text-base font-semibold">{{ t('distributed.roomLogs.title') }}</h2>
          <Badge v-if="snapshot" variant="outline">
            {{ t('distributed.roomLogs.available', { available: snapshot.available, total: snapshot.worlds?.length || 0 }) }}
          </Badge>
        </div>
        <p class="mt-0.5 text-sm text-muted-foreground">{{ t('distributed.roomLogs.description') }}</p>
      </div>
      <form class="flex w-full flex-col gap-2 sm:flex-row lg:max-w-xl" @submit.prevent="loadLogs">
        <Field class="min-w-0 flex-1">
          <FieldLabel for="room-log-query" class="sr-only">{{ t('distributed.roomLogs.query') }}</FieldLabel>
          <InputGroup>
            <InputGroupAddon><Search /></InputGroupAddon>
            <InputGroupInput id="room-log-query" v-model="query" :placeholder="t('distributed.roomLogs.queryPlaceholder')" />
          </InputGroup>
        </Field>
        <div class="flex gap-2">
          <UiButton type="submit" size="sm" :disabled="loading || !roomId">
            <Search data-icon="inline-start" />
            {{ t('common.actions.search') }}
          </UiButton>
          <UiButton type="button" size="sm" variant="outline" :disabled="loading || !roomId" @click="loadLogs">
            <Spinner v-if="loading" data-icon="inline-start" />
            <RefreshCw v-else data-icon="inline-start" />
            {{ t('common.actions.refresh') }}
          </UiButton>
        </div>
      </form>
    </div>

    <Alert v-if="error" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ t('distributed.roomLogs.loadFailed') }}</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <Alert v-else-if="snapshot?.partial">
      <TriangleAlert />
      <AlertTitle>{{ t('distributed.roomLogs.partialTitle') }}</AlertTitle>
      <AlertDescription>{{ t('distributed.roomLogs.partialDescription', { count: snapshot.unavailable }) }}</AlertDescription>
    </Alert>

    <div v-if="loading && !snapshot" class="flex flex-col gap-2" :aria-label="t('common.states.loading')">
      <Skeleton v-for="index in 2" :key="index" class="h-14 w-full" />
    </div>

    <Empty v-else-if="!error && (snapshot?.worlds?.length || 0) === 0">
      <EmptyHeader>
        <EmptyMedia variant="icon"><ScrollText /></EmptyMedia>
        <EmptyTitle>{{ t('distributed.roomLogs.emptyTitle') }}</EmptyTitle>
        <EmptyDescription>{{ t('distributed.roomLogs.emptyDescription') }}</EmptyDescription>
      </EmptyHeader>
    </Empty>

    <Accordion v-else-if="snapshot" type="multiple" class="rounded-lg border px-3">
      <AccordionItem v-for="world in snapshot.worlds" :key="world.worldId" :value="world.worldId">
        <AccordionTrigger>
          <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2 pr-3">
            <span class="font-medium">{{ world.worldName }}</span>
            <Badge variant="outline">{{ worldRoleLabel(world.worldRole) }}</Badge>
            <Badge :variant="world.problem ? 'destructive' : 'secondary'">
              {{ world.problem ? t('distributed.roomLogs.unavailable') : t('distributed.roomLogs.availableStatus') }}
            </Badge>
            <span class="ml-auto text-xs font-normal text-muted-foreground">
              {{ t('distributed.roomLogs.readAt', { time: formatTime(world.readAt) }) }}
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <Alert v-if="world.problem" variant="destructive">
            <CircleAlert />
            <AlertTitle>{{ world.problem.code }}</AlertTitle>
            <AlertDescription>{{ world.problem.message }}</AlertDescription>
          </Alert>
          <template v-else-if="world.snapshot">
            <dl class="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <div class="flex gap-1"><dt>{{ t('distributed.roomLogs.file') }}</dt><dd class="font-mono text-foreground">{{ world.snapshot.fileName }}</dd></div>
              <div class="flex gap-1"><dt>{{ t('distributed.roomLogs.size') }}</dt><dd class="text-foreground">{{ formatBytes(world.snapshot.size) }}</dd></div>
              <div class="flex gap-1"><dt>{{ t('distributed.roomLogs.updatedAt') }}</dt><dd class="text-foreground">{{ formatTime(world.snapshot.updatedAt) }}</dd></div>
            </dl>
            <Empty v-if="world.snapshot.lines.length === 0" class="min-h-36">
              <EmptyHeader>
                <EmptyTitle>{{ t('distributed.roomLogs.noMatchesTitle') }}</EmptyTitle>
                <EmptyDescription>{{ t('distributed.roomLogs.noMatchesDescription') }}</EmptyDescription>
              </EmptyHeader>
            </Empty>
            <ScrollArea v-else class="h-64 rounded-md border bg-muted/30">
              <pre class="min-w-max p-3 font-mono text-xs leading-5"><code><span v-for="line in world.snapshot.lines" :key="line.cursor" class="block">{{ line.text }}</span></code></pre>
            </ScrollArea>
          </template>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleAlert, RefreshCw, ScrollText, Search, TriangleAlert } from '@lucide/vue'
import { worldLogsV2API } from '@/api/v2'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'

const props = defineProps({ roomId: { type: String, default: '' } })
const { locale, t } = useI18n()
const snapshot = ref(null)
const query = ref('')
const loading = ref(false)
const error = ref('')
let requestSequence = 0

async function loadLogs() {
  if (!props.roomId) {
    snapshot.value = null
    return
  }
  const sequence = ++requestSequence
  loading.value = true
  error.value = ''
  try {
    const value = await worldLogsV2API.roomSnapshot(props.roomId, { limit: 300, query: query.value.trim() })
    if (sequence === requestSequence) snapshot.value = value
  } catch (cause) {
    if (sequence === requestSequence) error.value = cause.message || t('common.errors.unknown')
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

function worldRoleLabel(role) {
  const key = ['master', 'caves', 'custom'].includes(role) ? role : 'custom'
  return t(`distributed.roomLogs.roles.${key}`)
}

function formatTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'short', timeStyle: 'medium' }).format(date)
}

function formatBytes(value) {
  const bytes = Number(value) || 0
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

watch(() => props.roomId, () => {
  snapshot.value = null
  void loadLogs()
}, { immediate: true })
</script>
