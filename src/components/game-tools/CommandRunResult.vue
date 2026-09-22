<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useClipboard } from '@vueuse/core'
import { Copy, Check } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

const props = defineProps({ run: { type: Object, required: true }, target: { type: String, default: '' } })
const { t } = useI18n()
const { copy, copied } = useClipboard({ legacy: true })
const status = computed(() => props.run.status === 'succeeded' ? 'succeeded' : props.run.status === 'failed' ? 'runFailed' : 'uncertain')
const code = computed(() => props.run.script || props.run.rawCommand || '')
async function copyOutput() {
  try { await copy(props.run.output.text) } catch { toast.error(t('workbench.commands.copyFailed')) }
}
</script>

<template>
  <section class="flex min-w-0 flex-col gap-2" data-command-result :data-run-id="run.id" aria-live="polite">
    <Alert :variant="run.status === 'failed' ? 'destructive' : 'default'">
      <AlertTitle>{{ t(`workbench.commands.${status}`) }}</AlertTitle>
      <AlertDescription class="flex min-w-0 flex-col gap-1 break-words">
        <span>{{ target }} · {{ run.message }}</span>
        <span v-if="run.errorMessage" class="whitespace-pre-wrap">{{ run.errorMessage }}</span>
        <span class="break-all text-xs">{{ t('workbench.commands.runId') }} {{ run.id }}</span>
      </AlertDescription>
    </Alert>
    <div class="flex items-center justify-between gap-2">
      <span class="text-sm font-medium">{{ t('workbench.commands.outputTitle') }}</span>
      <Button v-if="run.output?.text" size="sm" variant="ghost" @click="copyOutput"><Check v-if="copied" data-icon="inline-start" /><Copy v-else data-icon="inline-start" />{{ t(copied ? 'workbench.commands.copied' : 'workbench.commands.copy') }}</Button>
    </div>
    <pre v-if="run.output?.text" data-command-output class="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 font-mono text-xs [overflow-wrap:anywhere]">{{ run.output.text }}</pre>
    <p v-else class="text-sm text-muted-foreground">{{ t(run.output ? 'workbench.commands.noOutput' : 'workbench.commands.outputUnavailable') }}</p>
    <p v-if="run.output?.truncated" class="text-xs text-muted-foreground">{{ t('workbench.commands.outputTruncated') }}</p>
    <details v-if="code" class="min-w-0"><summary class="cursor-pointer text-xs text-muted-foreground">{{ t('workbench.commands.executedCode') }}</summary><pre class="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 font-mono text-xs [overflow-wrap:anywhere]">{{ code }}</pre></details>
  </section>
</template>
