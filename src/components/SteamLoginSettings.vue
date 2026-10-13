<script setup>
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { KeyRound } from '@lucide/vue'
import { gameInstallationsV2API } from '@/api/v2'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'

const props = defineProps({ targetId: { type: String, required: true }, installationId: { type: String, required: true }, nodeLabel: { type: String, default: '' }, disabled: Boolean })
const { t } = useI18n(), id = useId()
const open = ref(false), loading = ref(false), submitting = ref(false), error = ref(''), status = ref(null)
const resetOpen = ref(false)
const mode = ref('anonymous'), username = ref(''), password = ref(''), code = ref('')
const active = computed(() => ['connecting', 'guard_email', 'guard_mobile', 'guard_approval'].includes(status.value?.state))
const guard = computed(() => ['guard_email', 'guard_mobile'].includes(status.value?.state))
const savedPassword = computed(() => status.value?.passwordSet && status.value?.username === username.value.trim())
const recovery = computed(() => Boolean(status.value?.recoveryRequired))
const canSave = computed(() => !loading.value && !submitting.value && !active.value && !recovery.value && Boolean(status.value)
  && (mode.value === 'anonymous' || (username.value.trim() && (password.value || savedPassword.value))))
let timer = 0, generation = 0, alive = true
const identity = () => ({ targetId: props.targetId, installationId: props.installationId })
function schedule(current) {
  clearTimeout(timer)
  if (open.value && active.value) timer = window.setTimeout(() => read(current), 1500)
}
async function read(current = generation, initial = false) {
  try {
    const value = await gameInstallationsV2API.steamLogin(props.targetId, props.installationId)
    if (!alive || current !== generation || !open.value) return
    status.value = value; error.value = ''
    if (initial) { mode.value = value.mode === 'account' ? 'account' : 'anonymous'; username.value = value.username || '' }
    schedule(current)
  } catch (e) { if (alive && current === generation && open.value) error.value = e.message }
  finally { if (alive && current === generation) loading.value = false }
}
async function changeOpen(value) {
  if (submitting.value && !value) return
  generation += 1; clearTimeout(timer); open.value = value; resetOpen.value = false; password.value = ''; code.value = ''; error.value = ''
  if (value) { status.value = null; loading.value = true; await read(generation, true) }
}
async function retryRead() {
  if (loading.value || submitting.value) return
  loading.value = true
  await read(generation, !status.value)
}
async function action(input) {
  const current = generation
  submitting.value = true; error.value = ''
  try {
    const value = await gameInstallationsV2API.manageSteamLogin({ ...identity(), ...input })
    if (!alive || current !== generation) return null
    status.value = value; schedule(current); return value
  } catch (e) { if (alive && current === generation) error.value = e.message; return null }
  finally { if (alive && current === generation) submitting.value = false }
}
watch(mode, () => { password.value = ''; code.value = '' })
async function save() {
  if (!canSave.value) return
  const input = { action: 'configure', mode: mode.value }
  if (mode.value === 'account') Object.assign(input, { username: username.value.trim(), ...(password.value ? { password: password.value } : {}) })
  password.value = ''
  const value = await action(input)
  if (value?.mode === 'account') await action({ action: 'login' })
  else if (value?.mode === 'anonymous') username.value = ''
}
async function submitCode() {
  if (!/^[A-Za-z0-9]{5}$/.test(code.value) || !guard.value || submitting.value) return
  const input = { action: 'code', sessionId: status.value.sessionId, code: code.value }
  code.value = ''; await action(input)
}
async function resetCredentials() {
  resetOpen.value = false
  if (submitting.value || !recovery.value) return
  const value = await action({ action: 'reset' })
  if (value) { mode.value = 'anonymous'; username.value = ''; password.value = ''; code.value = '' }
}
watch([() => props.targetId, () => props.installationId], () => { generation += 1; clearTimeout(timer); open.value = false; resetOpen.value = false; password.value = ''; code.value = ''; status.value = null; loading.value = false; submitting.value = false })
onBeforeUnmount(() => { alive = false; generation += 1; clearTimeout(timer); password.value = ''; code.value = '' })
</script>

<template>
  <Button size="sm" variant="outline" :disabled="disabled" @click="changeOpen(true)"><KeyRound data-icon="inline-start" />{{ t('gameInstallation.steamLogin.title') }}</Button>
  <Dialog :open="open" @update:open="changeOpen">
    <DialogContent :show-close-button="!submitting">
      <DialogHeader><DialogTitle>{{ t('gameInstallation.steamLogin.title') }}<template v-if="nodeLabel"> · {{ nodeLabel }}</template></DialogTitle><DialogDescription>{{ t('gameInstallation.steamLogin.description') }}</DialogDescription></DialogHeader>
      <p v-if="loading" role="status" class="flex items-center gap-2 text-sm text-muted-foreground"><Spinner />{{ t('gameInstallation.steamLogin.loading') }}</p>
      <template v-else-if="status">
        <FieldGroup v-if="!recovery">
          <Field><FieldLabel :for="`${id}-mode`">{{ t('gameInstallation.steamLogin.mode') }}</FieldLabel><Select v-model="mode" :disabled="submitting || active"><SelectTrigger :id="`${id}-mode`" class="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="anonymous">{{ t('gameInstallation.steamLogin.anonymous') }}</SelectItem><SelectItem value="account">{{ t('gameInstallation.steamLogin.account') }}</SelectItem></SelectGroup></SelectContent></Select></Field>
          <template v-if="mode === 'account'">
            <Field><FieldLabel :for="`${id}-username`">{{ t('gameInstallation.steamLogin.username') }}</FieldLabel><Input :id="`${id}-username`" v-model="username" autocomplete="username" autocapitalize="none" :disabled="submitting || active" maxlength="64" /><FieldDescription>{{ t('gameInstallation.steamLogin.usernameHint') }}</FieldDescription></Field>
            <Field><FieldLabel :for="`${id}-password`">{{ t('gameInstallation.steamLogin.password') }}</FieldLabel><Input :id="`${id}-password`" v-model="password" type="password" autocomplete="new-password" maxlength="256" :placeholder="savedPassword ? t('gameInstallation.steamLogin.passwordSaved') : ''" :disabled="submitting || active" /><FieldDescription>{{ t('gameInstallation.steamLogin.passwordHint') }}</FieldDescription></Field>
          </template>
        </FieldGroup>
        <div role="status" aria-live="polite" class="flex items-center gap-2"><Spinner v-if="status.state === 'connecting'" /><Badge :variant="status.state === 'failed' ? 'destructive' : status.state === 'ready' ? 'success' : 'secondary'">{{ t(`gameInstallation.steamLogin.states.${status.state}`) }}</Badge></div>
        <Alert v-if="status.errorCode" variant="destructive"><AlertTitle>{{ t('gameInstallation.steamLogin.failed') }}</AlertTitle><AlertDescription>{{ t(`gameInstallation.steamLogin.errors.${status.errorCode}`, t('gameInstallation.steamLogin.errors.LOGIN_FAILED')) }}</AlertDescription></Alert>
        <form v-if="guard" class="flex flex-col gap-3" @submit.prevent="submitCode"><Field><FieldLabel :for="`${id}-code`">{{ t(status.state === 'guard_email' ? 'gameInstallation.steamLogin.emailCode' : 'gameInstallation.steamLogin.mobileCode') }}</FieldLabel><Input :id="`${id}-code`" v-model="code" autocomplete="one-time-code" autocapitalize="characters" maxlength="5" :disabled="submitting" /><FieldDescription>{{ t('gameInstallation.steamLogin.codeHint') }}</FieldDescription></Field><Button type="submit" :disabled="submitting || !/^[A-Za-z0-9]{5}$/.test(code)">{{ t('gameInstallation.steamLogin.submitCode') }}</Button></form>
		<Alert v-if="status.state === 'guard_approval'"><AlertTitle>{{ t('gameInstallation.steamLogin.approvalTitle') }}</AlertTitle><AlertDescription>{{ t('gameInstallation.steamLogin.approvalHint') }}</AlertDescription></Alert>
        <p v-if="status.state === 'ready'" class="text-sm text-muted-foreground">{{ t('gameInstallation.steamLogin.readyHint') }}</p>
        <p v-if="mode === 'anonymous' && status.mode === 'account'" class="text-sm text-muted-foreground">{{ t('gameInstallation.steamLogin.clearHint') }}</p>
      </template>
      <Alert v-if="error" variant="destructive"><AlertTitle>{{ t('gameInstallation.steamLogin.failed') }}</AlertTitle><AlertDescription>{{ error }}</AlertDescription></Alert>
      <DialogFooter>
        <Button variant="outline" :disabled="submitting" @click="changeOpen(false)">{{ t('gameInstallation.steamLogin.close') }}</Button>
        <Button v-if="error" variant="outline" :disabled="loading || submitting" @click="retryRead">{{ t('gameInstallation.steamLogin.retryRead') }}</Button>
        <Button v-if="active" variant="outline" :disabled="submitting" @click="action({ action: 'cancel', sessionId: status.sessionId })">{{ t('gameInstallation.steamLogin.cancelLogin') }}</Button>
        <Button v-else-if="recovery" variant="destructive" :disabled="loading || submitting" @click="resetOpen = true"><Spinner v-if="submitting" data-icon="inline-start" />{{ t('gameInstallation.steamLogin.reset') }}</Button>
        <Button v-else :disabled="!canSave" @click="save"><Spinner v-if="submitting" data-icon="inline-start" />{{ t(mode === 'account' ? 'gameInstallation.steamLogin.saveAndVerify' : 'gameInstallation.steamLogin.save') }}</Button>
      </DialogFooter>
      <AlertDialog v-model:open="resetOpen">
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{{ t('gameInstallation.steamLogin.resetTitle') }}</AlertDialogTitle><AlertDialogDescription>{{ t('gameInstallation.steamLogin.resetDescription') }}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{{ t('gameInstallation.cancel') }}</AlertDialogCancel><AlertDialogAction variant="destructive" @click="resetCredentials">{{ t('gameInstallation.steamLogin.resetConfirm') }}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogContent>
  </Dialog>
</template>
