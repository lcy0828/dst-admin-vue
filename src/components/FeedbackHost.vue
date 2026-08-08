<template>
  <AlertDialog :open="activeRequest?.kind === 'confirm'" @update:open="handleConfirmOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ activeRequest?.title }}</AlertDialogTitle>
        <AlertDialogDescription>{{ activeRequest?.message }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="cancelRequest">
          {{ activeRequest?.options?.cancelButtonText || '取消' }}
        </AlertDialogCancel>
        <AlertDialogAction
          :variant="isDestructive ? 'destructive' : 'default'"
          @click="confirmRequest"
        >
          {{ activeRequest?.options?.confirmButtonText || '确认' }}
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
        <FieldLabel for="global-feedback-prompt" class="sr-only">输入内容</FieldLabel>
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
          {{ activeRequest?.options?.cancelButtonText || '取消' }}
        </Button>
        <Button @click="confirmPrompt">
          {{ activeRequest?.options?.confirmButtonText || '确认' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
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
import { registerFeedbackHost } from '@/lib/feedback'

const activeRequest = ref(null)
const requestQueue = []
const promptValue = ref('')
const promptError = ref('')
const promptInput = ref(null)

const isDestructive = computed(() => {
  const options = activeRequest.value?.options || {}
  return options.danger === true || options.type === 'error' || options.type === 'warning'
})

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
    promptError.value = options.inputErrorMessage || '输入内容格式不正确'
    return false
  }

  if (typeof options.inputValidator === 'function') {
    const result = options.inputValidator(value)
    if (result !== true && result !== undefined) {
      promptError.value = typeof result === 'string'
        ? result
        : options.inputErrorMessage || '输入内容格式不正确'
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
  if (!open && activeRequest.value?.kind === 'confirm') cancelRequest()
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
