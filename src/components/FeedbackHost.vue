<template>
  <AlertDialog :open="isAlertDialogOpen" @update:open="handleConfirmOpen">
    <AlertDialogContent :class="cn(isCapacityRisk && 'sm:max-w-xl')">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ isCapacityRisk ? t('capacityRisk.title') : activeRequest?.title }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ isCapacityRisk ? t('capacityRisk.description') : activeRequest?.message }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <template v-if="isCapacityRisk">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{{ t('capacityRisk.node') }}</TableHead>
              <TableHead class="text-right">{{ t('capacityRisk.current') }}</TableHead>
              <TableHead class="text-right">{{ t('capacityRisk.starting') }}</TableHead>
              <TableHead class="text-right">{{ t('capacityRisk.projected') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="target in capacityTargets" :key="target.targetId">
              <TableCell>
                <div class="flex min-w-0 flex-col gap-1">
                  <span class="truncate font-medium">{{ target.targetName || target.targetId }}</span>
                  <Badge :variant="capacityBadgeVariant(target)" class="w-fit">
                    {{ capacityStatusLabel(target) }}
                  </Badge>
                </div>
              </TableCell>
              <TableCell class="text-right tabular-nums">
                {{ t('capacityRisk.shards', { count: target.currentRunningShards || 0 }) }}
              </TableCell>
              <TableCell class="text-right tabular-nums">
                {{ t('capacityRisk.addedShards', { count: target.startingShards || 0 }) }}
              </TableCell>
              <TableCell class="text-right font-medium tabular-nums">
                {{ projectedCapacityLabel(target) }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Alert>
          <Cpu />
          <AlertTitle>{{ t('capacityRisk.policyTitle') }}</AlertTitle>
          <AlertDescription>
            {{ t('capacityRisk.policyFallback') }}
          </AlertDescription>
        </Alert>
      </template>
      <AlertDialogFooter>
        <AlertDialogCancel @click="cancelRequest">
          {{ isCapacityRisk ? t('capacityRisk.cancel') : activeRequest?.options?.cancelButtonText || t('common.actions.cancel') }}
        </AlertDialogCancel>
        <AlertDialogAction
          :variant="isDestructive ? 'destructive' : 'default'"
          @click="confirmRequest"
        >
          {{ isCapacityRisk ? t('capacityRisk.confirm') : activeRequest?.options?.confirmButtonText || t('common.actions.confirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <Dialog :open="activeRequest?.kind === 'prompt'" @update:open="handlePromptOpen">
    <DialogContent :show-close-button="false">
      <DialogHeader>
        <DialogTitle>{{ activeRequest?.title }}</DialogTitle>
        <DialogDescription>{{ activeRequest?.message }}</DialogDescription>
      </DialogHeader>
      <Field :data-invalid="Boolean(promptError)">
        <FieldLabel for="global-feedback-prompt" class="sr-only">{{ t('common.feedback.input') }}</FieldLabel>
        <Input
          id="global-feedback-prompt"
          ref="promptInput"
          v-model="promptValue"
          :placeholder="activeRequest?.options?.inputPlaceholder || ''"
          :aria-invalid="Boolean(promptError)"
          @keyup.enter="confirmPrompt"
        />
        <FieldError v-if="promptError">{{ promptError }}</FieldError>
      </Field>
      <DialogFooter>
        <Button variant="outline" @click="cancelRequest">
          {{ activeRequest?.options?.cancelButtonText || t('common.actions.cancel') }}
        </Button>
        <Button @click="confirmPrompt">
          {{ activeRequest?.options?.confirmButtonText || t('common.actions.confirm') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Cpu } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { capacityRiskLimit, capacityRiskTargets } from '@/lib/capacityRisk.mjs'
import { registerFeedbackHost } from '@/lib/feedback'
import { cn } from '@/lib/utils'

const { t } = useI18n()
const activeRequest = ref(null)
const requestQueue = []
const promptValue = ref('')
const promptError = ref('')
const promptInput = ref(null)
const isCapacityRisk = computed(() => activeRequest.value?.kind === 'capacity-risk')
const isAlertDialogOpen = computed(() => ['confirm', 'capacity-risk'].includes(activeRequest.value?.kind))
const capacityPreview = computed(() => activeRequest.value?.options?.preview || null)
const capacityTargets = computed(() => capacityRiskTargets(capacityPreview.value))

const isDestructive = computed(() => {
  const options = activeRequest.value?.options || {}
  return options.danger === true || options.type === 'error' || options.type === 'warning'
})

function capacityBadgeVariant(target) {
  if (target?.capacity?.state === 'overcommitted') return 'destructive'
  if (['available', 'full'].includes(target?.capacity?.state)) return 'secondary'
  return 'outline'
}

function capacityStatusLabel(target) {
  const state = ['available', 'full', 'overcommitted'].includes(target?.capacity?.state)
    ? target.capacity.state
    : 'unknown'
  return t(`capacityRisk.${state}`)
}

function projectedCapacityLabel(target) {
  const projected = Number(target?.projectedRunningShards) || 0
  const limit = capacityRiskLimit(target)
  return limit === null
    ? t('capacityRisk.unknownLimit', { projected })
    : t('capacityRisk.projectedLimit', { projected, limit })
}

function showNextRequest() {
  if (activeRequest.value || requestQueue.length === 0) return

  activeRequest.value = requestQueue.shift()
  promptValue.value = String(activeRequest.value.options?.inputValue ?? '')
  promptError.value = ''

  if (activeRequest.value.kind === 'prompt') {
    nextTick(() => promptInput.value?.$el?.focus?.() || promptInput.value?.focus?.())
  }
}

function enqueueRequest(request) {
  requestQueue.push(request)
  showNextRequest()
}

function finishRequest(callback) {
  const request = activeRequest.value
  if (!request) return

  activeRequest.value = null
  callback(request)
  nextTick(showNextRequest)
}

function cancelRequest() {
  finishRequest(request => request.reject('cancel'))
}

function confirmRequest() {
  finishRequest(request => request.resolve('confirm'))
}

function validatePrompt() {
  const options = activeRequest.value?.options || {}
  const value = promptValue.value

  if (options.inputPattern && !options.inputPattern.test(value)) {
    promptError.value = options.inputErrorMessage || t('common.feedback.invalidInput')
    return false
  }

  if (typeof options.inputValidator === 'function') {
    const result = options.inputValidator(value)
    if (result !== true && result !== undefined) {
      promptError.value = typeof result === 'string'
        ? result
        : options.inputErrorMessage || t('common.feedback.invalidInput')
      return false
    }
  }

  promptError.value = ''
  return true
}

function confirmPrompt() {
  if (!validatePrompt()) return

  finishRequest(request => request.resolve({
    action: 'confirm',
    value: promptValue.value,
  }))
}

function handleConfirmOpen(open) {
  if (!open && ['confirm', 'capacity-risk'].includes(activeRequest.value?.kind)) cancelRequest()
}

function handlePromptOpen(open) {
  if (!open && activeRequest.value?.kind === 'prompt') cancelRequest()
}

let unregister

onMounted(() => {
  unregister = registerFeedbackHost(enqueueRequest)
})

onBeforeUnmount(() => unregister?.())
</script>
