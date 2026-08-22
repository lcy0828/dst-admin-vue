<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Ban as BanIcon,
  Clock3,
  Ellipsis,
  Hammer,
  HeartPulse,
  LogOut,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Skull,
  TriangleAlert
} from '@lucide/vue'
import { toast } from 'vue-sonner'
import { playerApi } from '@/api/playerApi'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
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
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@/components/ui/field'
import { Input as UiInput } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { Switch as UiSwitch } from '@/components/ui/switch'
import { Textarea as UiTextarea } from '@/components/ui/textarea'
import { promptText } from '@/lib/feedback'
import {
  formatPlayerDate,
  isPlayerOnline,
  PLAYER_BAN_DURATION_IDS,
  playerBanDurationLabel,
  playerCharacterLabel,
  playerErrorDetail,
  playerNetworkLabel,
  playerStatusMeta
} from '@/i18n/playerMessages.js'
import CharacterAvatar from './CharacterAvatar.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  player: { type: Object, default: null }
})

const emit = defineEmits(['update:open', 'updated'])
const { locale, t } = useI18n()

const detail = ref(null)
const detailLoading = ref(false)
const detailError = ref(null)
const detailSequence = ref(0)
const activeAction = ref('')
const banDialogOpen = ref(false)
const godModeDialogOpen = ref(false)
const creativeModeDialogOpen = ref(false)
const modeEnabled = ref(true)
const banSubmitted = ref(false)
const banForm = reactive({ reason: '', duration: '1d', confirmation: '' })

const activePlayer = computed(() => props.player ? { ...props.player, ...(detail.value || {}) } : null)
const playerName = computed(() => activePlayer.value?.player_name || activePlayer.value?.user_id || t('players.values.unknownPlayer'))
const status = computed(() => playerStatusMeta(activePlayer.value?.status, t))
const character = computed(() => playerCharacterLabel(activePlayer.value?.prefab, t))
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

watch(
  () => [props.open, props.player?.room_id, props.player?.user_id],
  ([open]) => {
    if (open) loadPlayerDetail()
    else resetDialogs()
  },
  { immediate: true }
)

function setOpen(open) {
  emit('update:open', open)
  if (!open) resetDialogs()
}

function resetDialogs() {
  banDialogOpen.value = false
  godModeDialogOpen.value = false
  creativeModeDialogOpen.value = false
}

async function loadPlayerDetail() {
  if (!props.player?.room_id || !props.player?.user_id) return
  const sequence = ++detailSequence.value
  detailLoading.value = true
  detailError.value = null
  detail.value = null
  try {
    const response = await playerApi.getPlayerDetail(props.player)
    if (sequence === detailSequence.value) detail.value = response?.data || null
  } catch (error) {
    if (sequence === detailSequence.value) detailError.value = error
  } finally {
    if (sequence === detailSequence.value) detailLoading.value = false
  }
}

function formatDate(value) {
  return formatPlayerDate(value, locale.value)
}

function networkLabel(value) {
  return isPlayerOnline(activePlayer.value?.status) ? playerNetworkLabel(value, t) : '-'
}

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
    if (options.close) setOpen(false)
    else await loadPlayerDetail()
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
      close: true,
      execute: confirmation => playerApi.kickPlayer(activePlayer.value, null, confirmation)
    },
    kill: {
      title: 'players.confirmations.killTitle',
      description: 'players.confirmations.killDescription',
      success: 'players.feedback.killSucceeded',
      failure: 'players.feedback.killFailed',
      close: true,
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
      close: true,
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
    definition.failure,
    { close: definition.close }
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
    'players.feedback.banFailed',
    { close: true }
  )
  if (succeeded) banDialogOpen.value = false
}
</script>

<template>
  <Sheet :open="open" @update:open="setOpen">
    <SheetContent side="right" class="player-operation-sheet">
      <SheetHeader class="player-operation-header">
        <div v-if="activePlayer" class="player-identity">
          <CharacterAvatar :prefab="activePlayer.prefab" :name="playerName" size="lg" />
          <div>
            <div class="player-identity-title">
              <SheetTitle>{{ playerName }}</SheetTitle>
              <Badge :variant="status.variant">{{ status.label }}</Badge>
            </div>
            <SheetDescription>{{ character }} · {{ activePlayer.archive_name }} / {{ activePlayer.world_name || t('players.values.unknownWorld') }}</SheetDescription>
          </div>
        </div>
        <template v-else>
          <SheetTitle>{{ t('players.detail.title') }}</SheetTitle>
          <SheetDescription>{{ t('players.detail.description') }}</SheetDescription>
        </template>
      </SheetHeader>

      <ScrollArea class="player-operation-scroll">
        <div v-if="activePlayer" class="player-operation-content">
          <div v-if="detailLoading" class="player-detail-loading" role="status">
            <Spinner />
            <span>{{ t('players.list.loading') }}</span>
          </div>
          <Alert v-else-if="detailError" variant="destructive">
            <TriangleAlert />
            <AlertTitle>{{ t('players.list.loadFailedTitle') }}</AlertTitle>
            <AlertDescription>{{ errorText(detailError) }}</AlertDescription>
            <UiButton size="sm" variant="outline" @click="loadPlayerDetail">
              <RefreshCw data-icon="inline-start" />{{ t('players.actions.retry') }}
            </UiButton>
          </Alert>

          <Alert v-if="activePlayer.presence_conflict" variant="destructive">
            <TriangleAlert />
            <AlertTitle>{{ t('players.detail.presenceConflictTitle') }}</AlertTitle>
            <AlertDescription>{{ t('players.detail.presenceConflictDescription', { worlds: (activePlayer.observed_world_ids || []).join(', ') }) }}</AlertDescription>
          </Alert>
          <Alert v-else-if="activePlayer.status === 'stale'">
            <Clock3 />
            <AlertTitle>{{ t('players.detail.staleTitle') }}</AlertTitle>
            <AlertDescription>{{ t('players.detail.staleDescription', { time: formatDate(activePlayer.presence_observed_at) }) }}</AlertDescription>
          </Alert>

          <dl class="player-facts">
            <div><dt>{{ t('players.fields.character') }}</dt><dd>{{ character }}</dd></div>
            <div><dt>{{ t('players.fields.roomAndWorld') }}</dt><dd>{{ activePlayer.archive_name }} / {{ activePlayer.world_name || t('players.values.unknownWorld') }}</dd></div>
            <div><dt>{{ t('players.fields.days') }}</dt><dd>{{ activePlayer.player_age ?? '-' }}</dd></div>
            <div><dt>{{ t('players.fields.network') }}</dt><dd>{{ networkLabel(activePlayer.net_score) }}</dd></div>
            <div><dt>{{ t('players.fields.lastSeen') }}</dt><dd>{{ formatDate(activePlayer.last_seen) }}</dd></div>
            <div><dt>KU ID</dt><dd>{{ activePlayer.user_id }}</dd></div>
          </dl>

          <Separator />

          <section class="player-action-section">
            <h3>{{ t('players.detail.gameActions') }}</h3>
            <div class="player-action-grid">
              <UiButton size="sm" variant="outline" :disabled="!canUseLiveActions || Boolean(activeAction)" @click="openModeDialog('god')"><ShieldCheck data-icon="inline-start" />{{ t('players.operations.godMode') }}</UiButton>
              <UiButton size="sm" variant="outline" :disabled="!canUseLiveActions || Boolean(activeAction)" @click="openModeDialog('creative')"><Hammer data-icon="inline-start" />{{ t('players.operations.creativeMode') }}</UiButton>
              <UiButton size="sm" variant="outline" :disabled="!canUseLiveActions || Boolean(activeAction)" @click="runConfirmedAction('resurrect')"><HeartPulse data-icon="inline-start" />{{ t('players.operations.resurrect') }}</UiButton>
              <UiButton size="sm" variant="outline" :disabled="!canUseLiveActions || Boolean(activeAction)" @click="runConfirmedAction('character')"><RotateCcw data-icon="inline-start" />{{ t('players.operations.changeCharacter') }}</UiButton>
            </div>
          </section>

          <section class="player-action-section player-management-section">
            <h3>{{ t('players.detail.managementActions') }}</h3>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <UiButton size="sm" variant="outline" :disabled="Boolean(activeAction)">
                  <Ellipsis data-icon="inline-start" />{{ t('players.actions.playerActions') }}
                </UiButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="min-w-44">
                <DropdownMenuGroup>
                  <DropdownMenuItem :disabled="!canUseLiveActions" @select="runConfirmedAction('kick')"><LogOut />{{ t('players.operations.kick') }}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" @select="openBanDialog"><BanIcon />{{ t('players.operations.ban') }}</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" :disabled="!canUseLiveActions" @select="runConfirmedAction('kill')"><Skull />{{ t('players.operations.kill') }}</DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </section>
        </div>
      </ScrollArea>
    </SheetContent>
  </Sheet>

  <UiDialog v-model:open="banDialogOpen">
    <DialogContent>
      <DialogHeader><DialogTitle>{{ t('players.dialogs.ban.title') }}</DialogTitle><DialogDescription>{{ playerName }}</DialogDescription></DialogHeader>
      <FieldGroup>
        <Field :data-invalid="banReasonInvalid"><FieldLabel for="workspace-ban-reason">{{ t('players.fields.banReason') }}</FieldLabel><UiTextarea id="workspace-ban-reason" v-model="banForm.reason" rows="3" :placeholder="t('players.dialogs.ban.reasonPlaceholder')" :aria-invalid="banReasonInvalid" /><FieldError v-if="banReasonInvalid">{{ t('players.validation.banReasonRequired') }}</FieldError></Field>
        <Field><FieldLabel for="workspace-ban-duration">{{ t('players.fields.banDuration') }}</FieldLabel><UiSelect v-model="banForm.duration"><SelectTrigger id="workspace-ban-duration"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="duration in banDurations" :key="duration.value" :value="duration.value">{{ duration.label }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
        <Field :data-invalid="banConfirmationInvalid"><FieldLabel for="workspace-ban-confirmation">{{ t('players.fields.fullRoomName') }}</FieldLabel><UiInput id="workspace-ban-confirmation" v-model="banForm.confirmation" :placeholder="t('players.dialogs.ban.roomPlaceholderNamed', { room: activePlayer?.archive_name || '' })" :aria-invalid="banConfirmationInvalid" /><FieldDescription>{{ t('players.dialogs.ban.description') }}</FieldDescription><FieldError v-if="banConfirmationInvalid">{{ t('players.validation.banRoomMismatch') }}</FieldError></Field>
      </FieldGroup>
      <DialogFooter><UiButton variant="outline" :disabled="Boolean(activeAction)" @click="banDialogOpen = false">{{ t('players.actions.cancel') }}</UiButton><UiButton variant="destructive" :disabled="Boolean(activeAction)" @click="confirmBan"><Spinner v-if="activeAction === 'ban'" data-icon="inline-start" />{{ t('players.actions.confirmBan') }}</UiButton></DialogFooter>
    </DialogContent>
  </UiDialog>

  <UiDialog v-model:open="godModeDialogOpen">
    <DialogContent>
      <DialogHeader><DialogTitle>{{ t('players.dialogs.godMode.title') }}</DialogTitle><DialogDescription>{{ t('players.dialogs.godMode.player', { player: playerName }) }}</DialogDescription></DialogHeader>
      <Field orientation="horizontal"><FieldContent><FieldLabel for="workspace-god-mode">{{ t('players.operations.godMode') }}</FieldLabel><FieldDescription>{{ t(modeEnabled ? 'players.values.enabled' : 'players.values.disabled') }}</FieldDescription></FieldContent><UiSwitch id="workspace-god-mode" v-model="modeEnabled" /></Field>
      <DialogFooter><UiButton variant="outline" :disabled="Boolean(activeAction)" @click="godModeDialogOpen = false">{{ t('players.actions.cancel') }}</UiButton><UiButton :disabled="Boolean(activeAction)" @click="confirmMode('god')"><Spinner v-if="activeAction === 'god'" data-icon="inline-start" />{{ t('players.actions.confirm') }}</UiButton></DialogFooter>
    </DialogContent>
  </UiDialog>

  <UiDialog v-model:open="creativeModeDialogOpen">
    <DialogContent>
      <DialogHeader><DialogTitle>{{ t('players.dialogs.creativeMode.title') }}</DialogTitle><DialogDescription>{{ t('players.dialogs.creativeMode.player', { player: playerName }) }}</DialogDescription></DialogHeader>
      <Field orientation="horizontal"><FieldContent><FieldLabel for="workspace-creative-mode">{{ t('players.operations.creativeMode') }}</FieldLabel><FieldDescription>{{ t(modeEnabled ? 'players.values.enabled' : 'players.values.disabled') }}</FieldDescription></FieldContent><UiSwitch id="workspace-creative-mode" v-model="modeEnabled" /></Field>
      <DialogFooter><UiButton variant="outline" :disabled="Boolean(activeAction)" @click="creativeModeDialogOpen = false">{{ t('players.actions.cancel') }}</UiButton><UiButton :disabled="Boolean(activeAction)" @click="confirmMode('creative')"><Spinner v-if="activeAction === 'creative'" data-icon="inline-start" />{{ t('players.actions.confirm') }}</UiButton></DialogFooter>
    </DialogContent>
  </UiDialog>
</template>

<style scoped>
.player-operation-sheet {
  width: min(100vw, 480px);
  max-width: 480px;
}

.player-operation-header {
  padding: 16px 48px 14px 16px;
  border-bottom: 1px solid var(--border);
}

.player-identity,
.player-identity-title,
.player-detail-loading {
  display: flex;
  align-items: center;
  gap: 10px;
}

.player-identity > div {
  min-width: 0;
}

.player-identity-title {
  gap: 8px;
}

.player-identity-title :deep([data-slot='sheet-title']) {
  overflow-wrap: anywhere;
}

.player-identity :deep([data-slot='sheet-description']) {
  margin-top: 3px;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.player-operation-scroll {
  min-height: 0;
  flex: 1;
}

.player-operation-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 16px 24px;
}

.player-detail-loading {
  min-height: 40px;
  color: var(--muted-foreground);
}

.player-facts {
  display: flex;
  flex-direction: column;
}

.player-facts > div {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  align-items: baseline;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid var(--border);
}

.player-facts > div:last-child {
  border-bottom: 0;
}

.player-facts dt {
  color: var(--muted-foreground);
  font-size: 12px;
}

.player-facts dd {
  min-width: 0;
  overflow-wrap: anywhere;
}

.player-action-section h3 {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
}

.player-action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.player-management-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.player-management-section h3 {
  margin-bottom: 0;
}

@media (max-width: 520px) {
  .player-action-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .player-facts > div {
    grid-template-columns: 76px minmax(0, 1fr);
  }
}
</style>
