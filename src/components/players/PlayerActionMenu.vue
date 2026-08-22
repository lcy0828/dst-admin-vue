<script setup>
import { computed, reactive, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Ban as BanIcon,
  Ellipsis,
  Hammer,
  HeartPulse,
  LogOut,
  RotateCcw,
  ShieldCheck,
  Skull
} from '@lucide/vue'
import { toast } from 'vue-sonner'
import { playerApi } from '@/api/playerApi'
import { Button as UiButton } from '@/components/ui/button'
import {
  Dialog as UiDialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@/components/ui/field'
import { Input as UiInput } from '@/components/ui/input'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Switch as UiSwitch } from '@/components/ui/switch'
import { Textarea as UiTextarea } from '@/components/ui/textarea'
import { promptText } from '@/lib/feedback'
import {
  isPlayerOnline,
  PLAYER_BAN_DURATION_IDS,
  playerBanDurationLabel,
  playerErrorDetail
} from '@/i18n/playerMessages.js'

const props = defineProps({
  player: { type: Object, required: true }
})

const emit = defineEmits(['updated'])
const { t } = useI18n()
const fieldId = useId()
const activeAction = ref('')
const banDialogOpen = ref(false)
const godModeDialogOpen = ref(false)
const creativeModeDialogOpen = ref(false)
const modeEnabled = ref(true)
const banSubmitted = ref(false)
const banForm = reactive({ reason: '', duration: '1d', confirmation: '' })

const activePlayer = computed(() => props.player)
const playerName = computed(() => activePlayer.value?.player_name || activePlayer.value?.user_id || t('players.values.unknownPlayer'))
const canUseLiveActions = computed(() => (
  isPlayerOnline(activePlayer.value?.status) && !activePlayer.value?.presence_conflict
))
const banReasonInvalid = computed(() => banSubmitted.value && !banForm.reason.trim())
const banConfirmationInvalid = computed(() => (
  banSubmitted.value && banForm.confirmation !== activePlayer.value?.archive_name
))
const banDurations = computed(() => PLAYER_BAN_DURATION_IDS.map(value => ({
  value,
  label: playerBanDurationLabel(value, t)
})))
const banReasonId = `${fieldId}-ban-reason`
const banDurationId = `${fieldId}-ban-duration`
const banConfirmationId = `${fieldId}-ban-confirmation`
const godModeId = `${fieldId}-god-mode`
const creativeModeId = `${fieldId}-creative-mode`

function errorText(error) {
  return playerErrorDetail(error, t)
}

async function confirmPlayerAction(title, description) {
  const result = await promptText(
    t('players.confirmations.appendKuId', {
      description,
      id: activePlayer.value.user_id
    }),
    title,
    {
      confirmButtonText: t('players.actions.confirmAction'),
      cancelButtonText: t('players.actions.cancel'),
      inputPlaceholder: activePlayer.value.user_id,
      inputValidator: value => value === activePlayer.value.user_id || t('players.validation.kuIdMismatch')
    }
  )
  return result.value
}

async function runAction(kind, execute, successKey, failureKey, options = {}) {
  if (activeAction.value || !activePlayer.value) return false
  activeAction.value = kind
  const loadingId = toast.loading(t('players.feedback.actionLoading'))
  try {
    await execute()
    toast.success(t(successKey, {
      player: playerName.value,
      ...(options.successParams || {})
    }))
    emit('updated', {
      roomId: activePlayer.value.room_id,
      playerId: activePlayer.value.user_id,
      action: kind
    })
    return true
  } catch (error) {
    toast.error(t(failureKey, { error: errorText(error) }))
    return false
  } finally {
    toast.dismiss(loadingId)
    activeAction.value = ''
  }
}

async function runConfirmedAction(kind) {
  if (!activePlayer.value || !canUseLiveActions.value) return
  const definitions = {
    kick: {
      title: 'players.confirmations.kickTitle',
      description: 'players.confirmations.kickDescription',
      success: 'players.feedback.kickSucceeded',
      failure: 'players.feedback.kickFailed',
      execute: confirmation => playerApi.kickPlayer(activePlayer.value, null, confirmation)
    },
    kill: {
      title: 'players.confirmations.killTitle',
      description: 'players.confirmations.killDescription',
      success: 'players.feedback.killSucceeded',
      failure: 'players.feedback.killFailed',
      execute: confirmation => playerApi.killPlayer(activePlayer.value, null, confirmation)
    },
    resurrect: {
      title: 'players.confirmations.resurrectTitle',
      description: 'players.confirmations.resurrectDescription',
      success: 'players.feedback.resurrectSucceeded',
      failure: 'players.feedback.resurrectFailed',
      execute: confirmation => playerApi.resurrectPlayer(activePlayer.value, null, confirmation)
    },
    character: {
      title: 'players.confirmations.characterTitle',
      description: 'players.confirmations.characterDescription',
      success: 'players.feedback.characterSucceeded',
      failure: 'players.feedback.characterFailed',
      execute: confirmation => playerApi.changeCharacter(activePlayer.value, null, confirmation)
    }
  }
  const definition = definitions[kind]
  if (!definition) return

  let confirmation
  try {
    confirmation = await confirmPlayerAction(
      t(definition.title),
      t(definition.description, { player: playerName.value })
    )
  } catch {
    return
  }
  await runAction(
    kind,
    () => definition.execute(confirmation),
    definition.success,
    definition.failure
  )
}

function openModeDialog(kind) {
  if (!canUseLiveActions.value || activeAction.value) return
  modeEnabled.value = true
  if (kind === 'god') godModeDialogOpen.value = true
  if (kind === 'creative') creativeModeDialogOpen.value = true
}

async function confirmMode(kind) {
  const godMode = kind === 'god'
  const succeeded = await runAction(
    kind,
    () => godMode
      ? playerApi.setGodMode(activePlayer.value, modeEnabled.value, null)
      : playerApi.setCreativeMode(activePlayer.value, modeEnabled.value, null),
    godMode ? 'players.feedback.godModeSucceeded' : 'players.feedback.creativeModeSucceeded',
    godMode ? 'players.feedback.godModeFailed' : 'players.feedback.creativeModeFailed',
    {
      successParams: {
        status: t(modeEnabled.value ? 'players.values.enabled' : 'players.values.disabled')
      }
    }
  )
  if (!succeeded) return
  if (godMode) godModeDialogOpen.value = false
  else creativeModeDialogOpen.value = false
}

function openBanDialog() {
  if (activeAction.value || !activePlayer.value) return
  banForm.reason = ''
  banForm.duration = '1d'
  banForm.confirmation = ''
  banSubmitted.value = false
  banDialogOpen.value = true
}

async function confirmBan() {
  banSubmitted.value = true
  if (banReasonInvalid.value || banConfirmationInvalid.value) return
  const succeeded = await runAction(
    'ban',
    () => playerApi.banPlayer(activePlayer.value, {
      reason: banForm.reason.trim(),
      duration: banForm.duration,
      confirmation: banForm.confirmation
    }),
    'players.feedback.banSucceeded',
    'players.feedback.banFailed'
  )
  if (succeeded) banDialogOpen.value = false
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <UiButton
        variant="ghost"
        size="icon-sm"
        :disabled="Boolean(activeAction)"
        :aria-label="t('players.actions.openPlayerMenu')"
        :title="t('players.actions.playerActions')"
        @click.stop
      >
        <Ellipsis />
      </UiButton>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="min-w-44">
      <DropdownMenuGroup>
        <DropdownMenuItem :disabled="!canUseLiveActions" @select="openModeDialog('god')"><ShieldCheck />{{ t('players.operations.godMode') }}</DropdownMenuItem>
        <DropdownMenuItem :disabled="!canUseLiveActions" @select="openModeDialog('creative')"><Hammer />{{ t('players.operations.creativeMode') }}</DropdownMenuItem>
        <DropdownMenuItem :disabled="!canUseLiveActions" @select="runConfirmedAction('resurrect')"><HeartPulse />{{ t('players.operations.resurrect') }}</DropdownMenuItem>
        <DropdownMenuItem :disabled="!canUseLiveActions" @select="runConfirmedAction('character')"><RotateCcw />{{ t('players.operations.changeCharacter') }}</DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem variant="destructive" :disabled="!canUseLiveActions" @select="runConfirmedAction('kick')"><LogOut />{{ t('players.operations.kick') }}</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" @select="openBanDialog"><BanIcon />{{ t('players.operations.ban') }}</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" :disabled="!canUseLiveActions" @select="runConfirmedAction('kill')"><Skull />{{ t('players.operations.kill') }}</DropdownMenuItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>

  <UiDialog v-model:open="banDialogOpen">
    <DialogContent>
      <DialogHeader><DialogTitle>{{ t('players.dialogs.ban.title') }}</DialogTitle><DialogDescription>{{ playerName }}</DialogDescription></DialogHeader>
      <FieldGroup>
        <Field :data-invalid="banReasonInvalid"><FieldLabel :for="banReasonId">{{ t('players.fields.banReason') }}</FieldLabel><UiTextarea :id="banReasonId" v-model="banForm.reason" rows="3" :placeholder="t('players.dialogs.ban.reasonPlaceholder')" :aria-invalid="banReasonInvalid" /><FieldError v-if="banReasonInvalid">{{ t('players.validation.banReasonRequired') }}</FieldError></Field>
        <Field><FieldLabel :for="banDurationId">{{ t('players.fields.banDuration') }}</FieldLabel><UiSelect v-model="banForm.duration"><SelectTrigger :id="banDurationId"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="duration in banDurations" :key="duration.value" :value="duration.value">{{ duration.label }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
        <Field :data-invalid="banConfirmationInvalid"><FieldLabel :for="banConfirmationId">{{ t('players.fields.fullRoomName') }}</FieldLabel><UiInput :id="banConfirmationId" v-model="banForm.confirmation" :placeholder="t('players.dialogs.ban.roomPlaceholderNamed', { room: activePlayer?.archive_name || '' })" :aria-invalid="banConfirmationInvalid" /><FieldDescription>{{ t('players.dialogs.ban.description') }}</FieldDescription><FieldError v-if="banConfirmationInvalid">{{ t('players.validation.banRoomMismatch') }}</FieldError></Field>
      </FieldGroup>
      <DialogFooter><UiButton variant="outline" :disabled="Boolean(activeAction)" @click="banDialogOpen = false">{{ t('players.actions.cancel') }}</UiButton><UiButton variant="destructive" :disabled="Boolean(activeAction)" @click="confirmBan"><Spinner v-if="activeAction === 'ban'" data-icon="inline-start" />{{ t('players.actions.confirmBan') }}</UiButton></DialogFooter>
    </DialogContent>
  </UiDialog>

  <UiDialog v-model:open="godModeDialogOpen">
    <DialogContent>
      <DialogHeader><DialogTitle>{{ t('players.dialogs.godMode.title') }}</DialogTitle><DialogDescription>{{ t('players.dialogs.godMode.player', { player: playerName }) }}</DialogDescription></DialogHeader>
      <Field orientation="horizontal"><FieldContent><FieldLabel :for="godModeId">{{ t('players.operations.godMode') }}</FieldLabel><FieldDescription>{{ t(modeEnabled ? 'players.values.enabled' : 'players.values.disabled') }}</FieldDescription></FieldContent><UiSwitch :id="godModeId" v-model="modeEnabled" /></Field>
      <DialogFooter><UiButton variant="outline" :disabled="Boolean(activeAction)" @click="godModeDialogOpen = false">{{ t('players.actions.cancel') }}</UiButton><UiButton :disabled="Boolean(activeAction)" @click="confirmMode('god')"><Spinner v-if="activeAction === 'god'" data-icon="inline-start" />{{ t('players.actions.confirm') }}</UiButton></DialogFooter>
    </DialogContent>
  </UiDialog>

  <UiDialog v-model:open="creativeModeDialogOpen">
    <DialogContent>
      <DialogHeader><DialogTitle>{{ t('players.dialogs.creativeMode.title') }}</DialogTitle><DialogDescription>{{ t('players.dialogs.creativeMode.player', { player: playerName }) }}</DialogDescription></DialogHeader>
      <Field orientation="horizontal"><FieldContent><FieldLabel :for="creativeModeId">{{ t('players.operations.creativeMode') }}</FieldLabel><FieldDescription>{{ t(modeEnabled ? 'players.values.enabled' : 'players.values.disabled') }}</FieldDescription></FieldContent><UiSwitch :id="creativeModeId" v-model="modeEnabled" /></Field>
      <DialogFooter><UiButton variant="outline" :disabled="Boolean(activeAction)" @click="creativeModeDialogOpen = false">{{ t('players.actions.cancel') }}</UiButton><UiButton :disabled="Boolean(activeAction)" @click="confirmMode('creative')"><Spinner v-if="activeAction === 'creative'" data-icon="inline-start" />{{ t('players.actions.confirm') }}</UiButton></DialogFooter>
    </DialogContent>
  </UiDialog>
</template>
