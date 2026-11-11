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
import {
  STEAM_GUARD_CODE_PATTERN,
  buildSteamLoginSavePlan,
  canFallbackApprovalToCode,
  canSubmitSteamLoginConfig,
  hasSavedSteamPassword,
  initialSteamLoginUiMode,
  isSteamGuardCodePrompt,
  isSteamLoginActive,
  isValidOptionalGuardCode,
  isValidSteamUsername,
} from '@/lib/steamLoginSupport.mjs'

const props = defineProps({ targetId: { type: String, required: true }, installationId: { type: String, required: true }, nodeLabel: { type: String, default: '' }, disabled: Boolean })
const { t } = useI18n(), id = useId()
const open = ref(false), loading = ref(false), submitting = ref(false), error = ref(''), status = ref(null)
const resetOpen = ref(false)
const uiMode = ref('anonymous'), username = ref(''), password = ref(''), loginCode = ref(''), code = ref('')
const active = computed(() => isSteamLoginActive(status.value))
const guard = computed(() => isSteamGuardCodePrompt(status.value))
const approvalFallback = computed(() => canFallbackApprovalToCode(status.value))
const savedPassword = computed(() => hasSavedSteamPassword(status.value, username.value))
const recovery = computed(() => Boolean(status.value?.recoveryRequired))
const usernameInvalid = computed(() => uiMode.value !== 'anonymous' && Boolean(username.value.trim()) && !isValidSteamUsername(username.value))
const loginCodeInvalid = computed(() => uiMode.value === 'account_password' && !isValidOptionalGuardCode(loginCode.value))
const canSave = computed(() => canSubmitSteamLoginConfig({
  loading: loading.value,
  submitting: submitting.value,
  status: status.value,
  uiMode: uiMode.value,
  username: username.value,
  password: password.value,
  loginCode: loginCode.value,
}))
let timer = 0, generation = 0, alive = true
const identity = () => ({ targetId: props.targetId, installationId: props.installationId })
function clearSecrets() {
  password.value = ''
  loginCode.value = ''
  code.value = ''
}
function schedule(current) {
  clearTimeout(timer)
  if (open.value && active.value) timer = window.setTimeout(() => read(current), 1500)
}
async function read(current = generation, initial = false) {
  try {
    const value = await gameInstallationsV2API.steamLogin(props.targetId, props.installationId)
    if (!alive || current !== generation || !open.value) return
    status.value = value; error.value = ''
    if (!isSteamLoginActive(value)) code.value = ''
    if (initial) { uiMode.value = initialSteamLoginUiMode(value); username.value = value.username || '' }
    schedule(current)
  } catch (e) { if (alive && current === generation && open.value) error.value = e.message }
  finally { if (alive && current === generation) loading.value = false }
}
async function changeOpen(value) {
  if (submitting.value && !value) return
  generation += 1; clearTimeout(timer); open.value = value; resetOpen.value = false; clearSecrets(); error.value = ''
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
watch(uiMode, clearSecrets)
async function save() {
  if (!canSave.value) return
  const { configureInput, loginInput } = buildSteamLoginSavePlan({
    uiMode: uiMode.value,
    username: username.value,
    password: password.value,
    loginCode: loginCode.value,
  })
  clearSecrets()
  const value = await action(configureInput)
  if (value?.mode === 'account' && loginInput) await action(loginInput)
  else if (value?.mode === 'anonymous') username.value = ''
}
async function submitCode() {
  const normalized = code.value.trim().toUpperCase()
  if (!STEAM_GUARD_CODE_PATTERN.test(normalized) || !guard.value || submitting.value) return
  code.value = ''
  await action({ action: 'code', sessionId: status.value.sessionId, code: normalized })
}
async function cancelSession() {
  if (!active.value || submitting.value) return
  const current = generation
  const result = await action({ action: 'cancel', sessionId: status.value.sessionId })
  if (!result && alive && current === generation && open.value) {
    await read(current)
  }
}
async function switchApprovalToCode() {
  const normalized = code.value.trim().toUpperCase()
  if (!STEAM_GUARD_CODE_PATTERN.test(normalized) || !approvalFallback.value || submitting.value) return
  const current = generation
  code.value = ''
  submitting.value = true
  error.value = ''
  clearTimeout(timer)
  let latest = null
  try {
    try {
      latest = await gameInstallationsV2API.manageSteamLogin({ ...identity(), action: 'cancel', sessionId: status.value.sessionId })
    } catch (cancelErr) {
      latest = await gameInstallationsV2API.steamLogin(props.targetId, props.installationId)
      if (isSteamLoginActive(latest)) throw cancelErr
    }
    if (!alive || current !== generation || !open.value) return
    for (let i = 0; i < 30 && isSteamLoginActive(latest); i += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 120))
      if (!alive || current !== generation || !open.value) return
      latest = await gameInstallationsV2API.steamLogin(props.targetId, props.installationId)
      if (!alive || current !== generation || !open.value) return
    }
    if (latest?.state === 'ready') {
      status.value = latest
      return
    }
    const started = await gameInstallationsV2API.manageSteamLogin({ ...identity(), action: 'login', code: normalized })
    if (!alive || current !== generation) return
    status.value = started
    schedule(current)
  } catch (e) {
    if (alive && current === generation) {
      if (latest) status.value = latest
      error.value = e.message
      schedule(current)
    }
  } finally {
    if (alive && current === generation) submitting.value = false
  }
}
async function resetCredentials() {
  resetOpen.value = false
  if (submitting.value || !recovery.value) return
  const value = await action({ action: 'reset' })
  if (value) { uiMode.value = 'anonymous'; username.value = ''; clearSecrets() }
}
watch([() => props.targetId, () => props.installationId], () => { generation += 1; clearTimeout(timer); open.value = false; resetOpen.value = false; clearSecrets(); status.value = null; loading.value = false; submitting.value = false })
onBeforeUnmount(() => { alive = false; generation += 1; clearTimeout(timer); clearSecrets() })
</script>

<template>
  <Button size="sm" variant="outline" :disabled="disabled" @click="changeOpen(true)"><KeyRound data-icon="inline-start" />{{ t('gameInstallation.steamLogin.title') }}</Button>
  <Dialog :open="open" @update:open="changeOpen">
    <DialogContent :show-close-button="!submitting">
      <DialogHeader><DialogTitle>{{ t('gameInstallation.steamLogin.title') }}<template v-if="nodeLabel"> · {{ nodeLabel }}</template></DialogTitle><DialogDescription>{{ t('gameInstallation.steamLogin.description') }}</DialogDescription></DialogHeader>
      <p v-if="loading" role="status" class="flex items-center gap-2 text-sm text-muted-foreground"><Spinner />{{ t('gameInstallation.steamLogin.loading') }}</p>
      <template v-else-if="status">
        <FieldGroup v-if="!recovery">
          <Field><FieldLabel :for="`${id}-mode`">{{ t('gameInstallation.steamLogin.mode') }}</FieldLabel><Select v-model="uiMode" :disabled="submitting || active"><SelectTrigger :id="`${id}-mode`" class="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="anonymous">{{ t('gameInstallation.steamLogin.anonymous') }}</SelectItem><SelectItem value="account_password">{{ t('gameInstallation.steamLogin.account') }}</SelectItem><SelectItem value="account_cached">{{ t('gameInstallation.steamLogin.accountCached') }}</SelectItem></SelectGroup></SelectContent></Select></Field>
          <template v-if="uiMode !== 'anonymous'">
            <Field><FieldLabel :for="`${id}-username`">{{ t('gameInstallation.steamLogin.username') }}</FieldLabel><Input :id="`${id}-username`" v-model="username" autocomplete="username" autocapitalize="none" :aria-invalid="usernameInvalid || undefined" :disabled="submitting || active" maxlength="64" /><FieldDescription :class="usernameInvalid ? 'text-destructive' : ''">{{ t(usernameInvalid ? 'gameInstallation.steamLogin.usernameInvalidHint' : 'gameInstallation.steamLogin.usernameHint') }}</FieldDescription></Field>
            <p v-if="uiMode === 'account_cached'" class="text-sm text-muted-foreground">{{ t('gameInstallation.steamLogin.cachedHint') }}</p>
            <template v-if="uiMode === 'account_password'">
              <Field><FieldLabel :for="`${id}-password`">{{ t('gameInstallation.steamLogin.password') }}</FieldLabel><Input :id="`${id}-password`" v-model="password" type="password" autocomplete="new-password" maxlength="256" :placeholder="savedPassword ? t('gameInstallation.steamLogin.passwordSaved') : ''" :disabled="submitting || active" /><FieldDescription>{{ t('gameInstallation.steamLogin.passwordHint') }}</FieldDescription></Field>
              <Field><FieldLabel :for="`${id}-login-code`">{{ t('gameInstallation.steamLogin.optionalLoginCode') }}</FieldLabel><Input :id="`${id}-login-code`" v-model="loginCode" autocomplete="one-time-code" autocapitalize="characters" maxlength="5" :aria-invalid="loginCodeInvalid || undefined" :placeholder="t('gameInstallation.steamLogin.optionalLoginCodePlaceholder')" :disabled="submitting || active" /><FieldDescription :class="loginCodeInvalid ? 'text-destructive' : ''">{{ t(loginCodeInvalid ? 'gameInstallation.steamLogin.optionalLoginCodeInvalidHint' : 'gameInstallation.steamLogin.optionalLoginCodeHint') }}</FieldDescription></Field>
            </template>
          </template>
        </FieldGroup>
        <div role="status" aria-live="polite" class="flex flex-wrap items-center gap-2"><Spinner v-if="status.state === 'connecting'" /><Badge :variant="status.state === 'failed' ? 'destructive' : status.state === 'ready' ? 'success' : 'secondary'">{{ t(`gameInstallation.steamLogin.states.${status.state}`) }}</Badge><Badge v-if="status.mode === 'account' && !status.passwordSet" variant="outline">{{ t('gameInstallation.steamLogin.cachedBadge') }}</Badge></div>
        <Alert v-if="status.errorCode" variant="destructive"><AlertTitle>{{ t('gameInstallation.steamLogin.failed') }}</AlertTitle><AlertDescription>{{ t(`gameInstallation.steamLogin.errors.${status.errorCode}`, t('gameInstallation.steamLogin.errors.LOGIN_FAILED')) }}</AlertDescription></Alert>
        <form v-if="guard" class="flex flex-col gap-3" @submit.prevent="submitCode"><Field><FieldLabel :for="`${id}-code`">{{ t(status.state === 'guard_email' ? 'gameInstallation.steamLogin.emailCode' : 'gameInstallation.steamLogin.mobileCode') }}</FieldLabel><Input :id="`${id}-code`" v-model="code" autocomplete="one-time-code" autocapitalize="characters" maxlength="5" :disabled="submitting" /><FieldDescription>{{ t('gameInstallation.steamLogin.codeHint') }}</FieldDescription></Field><Button type="submit" :disabled="submitting || !STEAM_GUARD_CODE_PATTERN.test(code.trim())">{{ t('gameInstallation.steamLogin.submitCode') }}</Button></form>
        <template v-if="status.state === 'guard_approval'">
          <Alert><AlertTitle>{{ t('gameInstallation.steamLogin.approvalTitle') }}</AlertTitle><AlertDescription>{{ t('gameInstallation.steamLogin.approvalHint') }}</AlertDescription></Alert>
          <form v-if="approvalFallback" class="flex flex-col gap-3" @submit.prevent="switchApprovalToCode"><Field><FieldLabel :for="`${id}-approval-code`">{{ t('gameInstallation.steamLogin.approvalFallbackLabel') }}</FieldLabel><Input :id="`${id}-approval-code`" v-model="code" autocomplete="one-time-code" autocapitalize="characters" maxlength="5" :placeholder="t('gameInstallation.steamLogin.optionalLoginCodePlaceholder')" :disabled="submitting" /><FieldDescription>{{ t('gameInstallation.steamLogin.approvalFallbackHint') }}</FieldDescription></Field><Button type="submit" variant="secondary" :disabled="submitting || !STEAM_GUARD_CODE_PATTERN.test(code.trim())"><Spinner v-if="submitting" data-icon="inline-start" />{{ t('gameInstallation.steamLogin.approvalFallbackSubmit') }}</Button></form>
        </template>
        <p v-if="status.state === 'ready'" class="text-sm text-muted-foreground">{{ t('gameInstallation.steamLogin.readyHint') }}</p>
        <p v-if="uiMode === 'anonymous' && status.mode === 'account'" class="text-sm text-muted-foreground">{{ t('gameInstallation.steamLogin.clearHint') }}</p>
      </template>
      <Alert v-if="error" variant="destructive"><AlertTitle>{{ t('gameInstallation.steamLogin.failed') }}</AlertTitle><AlertDescription>{{ error }}</AlertDescription></Alert>
      <DialogFooter>
        <Button variant="outline" :disabled="submitting" @click="changeOpen(false)">{{ t('gameInstallation.steamLogin.close') }}</Button>
        <Button v-if="error" variant="outline" :disabled="loading || submitting" @click="retryRead">{{ t('gameInstallation.steamLogin.retryRead') }}</Button>
        <Button v-if="active" variant="outline" :disabled="submitting" @click="cancelSession">{{ t('gameInstallation.steamLogin.cancelLogin') }}</Button>
        <Button v-else-if="recovery" variant="destructive" :disabled="loading || submitting" @click="resetOpen = true"><Spinner v-if="submitting" data-icon="inline-start" />{{ t('gameInstallation.steamLogin.reset') }}</Button>
        <Button v-else :disabled="!canSave" @click="save"><Spinner v-if="submitting" data-icon="inline-start" />{{ t(uiMode !== 'anonymous' ? 'gameInstallation.steamLogin.saveAndVerify' : 'gameInstallation.steamLogin.save') }}</Button>
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
