<script setup>
import { computed, reactive, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Ban as BanIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Hammer,
  HeartPlus,
  HeartPulse,
  LogOut,
  RotateCcw,
  ShieldCheck,
  Skull,
  Sparkles,
  X
} from '@lucide/vue'
import { toast } from 'vue-sonner'
import { playerApi } from '@/api/playerApi'
import { commandApi } from '@/api/commandManager'
import { Button as UiButton } from '@/components/ui/button'
import {
  Dialog as UiDialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@/components/ui/field'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Slider } from '@/components/ui/slider'
import { Switch as UiSwitch } from '@/components/ui/switch'
import { Textarea as UiTextarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import GameToolsDialog from '@/components/game-tools/GameToolsDialog.vue'
import CharacterAvatar from '@/components/players/CharacterAvatar.vue'
import { playerCanUseCharacterActions, playerQuickCommands } from '@/lib/playerQuickActions.mjs'
import { globalJobFailureToastId } from '@/lib/globalJobs.mjs'
import {
  isPlayerOnline,
  PLAYER_BAN_DURATION_IDS,
  playerBanDurationLabel,
  playerErrorDetail
} from '@/i18n/playerMessages.js'

const props = defineProps({
  player: { type: Object, required: true },
  workbenchRequest: { type: Number, default: 0 },
  requestedWorkbenchSection: {
    type: String,
    default: '',
    validator: value => !value || ['entity', 'player', 'world'].includes(value)
  }
})

const emit = defineEmits(['updated', 'player-state-refreshed', 'world-state-refreshed'])
const { t } = useI18n()
const fieldId = useId()
// Temporary UI review requested while no players are online. Production builds
// keep the normal availability checks; this preview never dispatches actions.
const previewMode = import.meta.env.DEV
const activeAction = ref('')
const menuOpen = ref(false)
const quickAction = ref('')
const workbenchOpen = ref(false)
const activeWorkbenchSection = ref('entity')
const modeEnabled = ref(true)
const speedMultiplier = ref(1)
const banSubmitted = ref(false)
const banForm = reactive({ reason: '', duration: '1d' })

const activePlayer = computed(() => props.player)
const playerName = computed(() => activePlayer.value?.player_name || activePlayer.value?.user_id || t('players.values.unknownPlayer'))
const canUseLiveActions = computed(() => (
  isPlayerOnline(activePlayer.value?.status) && !activePlayer.value?.presence_conflict &&
  Boolean(activePlayer.value?.room_id && activePlayer.value?.world_id)
))
const canUseCharacterActions = computed(() => canUseLiveActions.value && playerCanUseCharacterActions(activePlayer.value))
const canResurrect = computed(() => canUseLiveActions.value && ['ghost', 'dead'].includes(activePlayer.value?.gameplay_state))
const actionTitleKeys = {
  god: 'players.dialogs.godMode.title', creative: 'players.dialogs.creativeMode.title',
  ban: 'players.dialogs.ban.title', kick: 'players.confirmations.kickTitle',
  kill: 'players.confirmations.killTitle', character: 'players.confirmations.characterTitle', unban: 'players.quick.unban'
}
const menuTitle = computed(() => quickAction.value
  ? t(actionTitleKeys[quickAction.value] || `players.quick.${quickAction.value}`)
  : t('players.actions.playerActions'))
const confirmingAction = computed(() => ['kick', 'kill', 'character', 'unban'].includes(quickAction.value))
const confirmationDescription = computed(() => quickAction.value === 'unban'
  ? t('players.banList.unbanPrompt', { room: activePlayer.value.archive_name })
  : t(`players.confirmations.${quickAction.value}Description`, { player: playerName.value }))
const commonActions = [
  { id: 'recover', icon: HeartPulse }, { id: 'clean', icon: Sparkles }
]
const defaultWorkbenchSection = computed(() => canUseLiveActions.value ? 'player' : 'world')
const speedInputValid = computed(() => playerQuickCommands('speed', activePlayer.value.user_id, { multiplier: speedMultiplier.value }).length > 0)
const speedInputId = `${fieldId}-speed`
const banReasonInvalid = computed(() => banSubmitted.value && !banForm.reason.trim())
const banDurations = computed(() => PLAYER_BAN_DURATION_IDS.map(value => ({
  value,
  label: playerBanDurationLabel(value, t)
})))
const banReasonId = `${fieldId}-ban-reason`
const banDurationId = `${fieldId}-ban-duration`
const godModeId = `${fieldId}-god-mode`
const creativeModeId = `${fieldId}-creative-mode`

watch(
  () => props.workbenchRequest,
  request => {
    if (!request) return
    openWorkbench(props.requestedWorkbenchSection || 'player')
  }
)

watch(menuOpen, open => { if (open) quickAction.value = '' })
watch([() => props.player.room_id, () => props.player.world_id, () => props.player.user_id], () => {
  menuOpen.value = false
  workbenchOpen.value = false
})

function errorText(error) {
  return playerErrorDetail(error, t)
}

function openWorkbench(section = defaultWorkbenchSection.value) {
  if (activeAction.value) return
  if (previewMode) return toast.info(t('players.quick.previewNotice'))
  menuOpen.value = false
  activeWorkbenchSection.value = ['entity', 'player', 'world'].includes(section)
    ? section
    : defaultWorkbenchSection.value
  workbenchOpen.value = true
}

async function runAction(kind, execute, successKey, failureKey, options = {}) {
  if (previewMode) {
    toast.info(t('players.quick.previewNotice'))
    return false
  }
  if (activeAction.value || !activePlayer.value) return false
  const target = { ...activePlayer.value }
  const name = playerName.value
  activeAction.value = kind
  const loadingId = toast.loading(t('players.feedback.actionLoading'))
  try {
    await execute(target)
    toast.success(t(successKey, {
      player: name,
      ...(options.successParams || {})
    }))
    emit('updated', {
      roomId: target.room_id,
      playerId: target.user_id,
      action: kind
    })
    return true
  } catch (error) {
    toast.error(t(failureKey, { error: errorText(error) }), {
      id: globalJobFailureToastId(error?.context?.jobId)
    })
    return false
  } finally {
    toast.dismiss(loadingId)
    activeAction.value = ''
  }
}

async function runConfirmedAction(kind) {
  if (!activePlayer.value || activeAction.value || quickAction.value !== kind) return
  if (kind === 'unban' ? !activePlayer.value.banned : (!previewMode && !canUseLiveActions.value)) return
  if (!previewMode && kind === 'kill' && !canUseCharacterActions.value) return
  const definitions = {
    kick: {
      success: 'players.feedback.kickSucceeded',
      failure: 'players.feedback.kickFailed',
      execute: confirmation => playerApi.kickPlayer(activePlayer.value, null, confirmation)
    },
    kill: {
      success: 'players.feedback.killSucceeded',
      failure: 'players.feedback.killFailed',
      execute: confirmation => playerApi.killPlayer(activePlayer.value, null, confirmation)
    },
    character: {
      success: 'players.feedback.characterSucceeded',
      failure: 'players.feedback.characterFailed',
      execute: confirmation => playerApi.changeCharacter(activePlayer.value, null, confirmation)
    },
    unban: {
      success: 'players.banList.unbanSucceeded', failure: 'players.banList.unbanFailed',
      execute: () => playerApi.unbanPlayer(activePlayer.value, activePlayer.value.archive_name)
    }
  }
  const definition = definitions[kind]
  if (!definition) return

  const confirmation = activePlayer.value.user_id
  const succeeded = await runAction(
    kind,
    () => definition.execute(confirmation),
    definition.success,
    definition.failure
  )
  if (succeeded) menuOpen.value = false
}

async function resurrectPlayer() {
  if (!activePlayer.value || (!previewMode && !canResurrect.value)) return
  menuOpen.value = false
  await runAction(
    'resurrect',
    () => playerApi.resurrectPlayer(activePlayer.value, null, activePlayer.value.user_id),
    'players.feedback.resurrectSucceeded',
    'players.feedback.resurrectFailed'
  )
}

function openModeDialog(kind) {
  if ((!previewMode && !canUseCharacterActions.value) || activeAction.value) return
  modeEnabled.value = true
  quickAction.value = kind
}

async function confirmMode(kind) {
  if (!previewMode && !canUseCharacterActions.value) return
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
  if (succeeded) menuOpen.value = false
}

function openBanDialog() {
  if (activeAction.value || !activePlayer.value) return
  banForm.reason = ''
  banForm.duration = '1d'
  banSubmitted.value = false
  quickAction.value = activePlayer.value.banned ? 'unban' : 'ban'
}

async function confirmBan() {
  banSubmitted.value = true
  if (banReasonInvalid.value) return
  const succeeded = await runAction(
    'ban',
    () => playerApi.banPlayer(activePlayer.value, {
      reason: banForm.reason.trim(),
      duration: banForm.duration,
      confirmation: activePlayer.value.archive_name
    }),
    'players.feedback.banSucceeded',
    'players.feedback.banFailed'
  )
  if (succeeded) menuOpen.value = false
}

function quickActionAvailable(action) {
  return ['recover', 'clean', 'penalty', 'speed'].includes(action) &&
    !activeAction.value && (previewMode || canUseCharacterActions.value)
}

function selectQuickAction(action) {
  if (!quickActionAvailable(action)) return
  if (action === 'speed') speedMultiplier.value = 1
  if (['recover', 'clean', 'penalty'].includes(action)) runQuickAction({ action })
  else quickAction.value = action
}

async function runQuickAction({ action, input = {} }) {
  if (!quickActionAvailable(action)) return
  const target = { ...activePlayer.value }
  const commands = playerQuickCommands(action, target.user_id, input)
  if (commands.length === 0) return
  let completed = 0
  const succeeded = await runAction(action, async () => {
    try {
      for (const command of commands) {
        await commandApi.executeCommand(`${target.room_id}::${target.world_id}`, command.commandId, command.arguments, target.archive_name)
        completed += 1
      }
    } catch (error) {
      if (completed > 0) {
        emit('updated', { roomId: target.room_id, playerId: target.user_id, action })
        throw new Error(t('players.quick.partialFailure', { completed, total: commands.length, error: errorText(error) }))
      }
      throw error
    }
  }, 'players.quick.succeeded', 'players.quick.failed', { successParams: { action: t(`players.quick.${action}`) } })
  if (succeeded) menuOpen.value = false
}

</script>

<template>
  <div class="player-action-buttons" @click.stop>
    <UiDialog v-model:open="menuOpen">
      <DialogTrigger as-child>
        <UiButton
          variant="outline"
          size="sm"
          :disabled="Boolean(activeAction)"
          :aria-label="t('players.actions.openPlayerMenu')"
          :title="t('players.actions.playerActions')"
        >
          <Spinner v-if="activeAction" data-icon="inline-start" />
          {{ t('players.quick.trigger') }}
          <ChevronDown data-icon="inline-end" />
        </UiButton>
      </DialogTrigger>
      <DialogContent
        :show-close-button="false"
        overlay-class="supports-backdrop-filter:backdrop-blur-none"
        class="inset-0 m-auto flex h-[min(34rem,calc(100dvh-2rem))] translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:h-[min(25rem,calc(100dvh-2rem))] sm:max-w-xl data-[state=open]:animate-none data-[state=closed]:animate-none"
        @click.stop
      >
        <div class="flex shrink-0 items-center gap-3 px-4 py-3">
          <UiButton v-if="quickAction" variant="ghost" size="icon-lg" :disabled="Boolean(activeAction)" :aria-label="t('players.quick.back')" @click="quickAction = ''"><ChevronLeft /></UiButton>
          <CharacterAvatar v-else :prefab="activePlayer.prefab" :name="playerName" :player="activePlayer" size="lg" />
          <DialogHeader class="min-w-0 flex-1 gap-1 text-left">
            <DialogTitle class="truncate"><template v-if="!quickAction">{{ playerName }} · </template>{{ menuTitle }}</DialogTitle>
            <DialogDescription class="truncate"><template v-if="quickAction">{{ playerName }} · </template><template v-if="activePlayer.archive_name">{{ activePlayer.archive_name }} · </template>{{ activePlayer.world_name || activePlayer.world_id }}</DialogDescription>
          </DialogHeader>
          <UiButton variant="ghost" size="icon-sm" :aria-label="t('players.quick.close')" @click="menuOpen = false"><X /></UiButton>
        </div>
        <Separator />
        <div class="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable_both-edges]">
        <form v-if="quickAction === 'speed'" class="flex flex-col gap-5 p-4" @submit.prevent="runQuickAction({ action: 'speed', input: { multiplier: speedMultiplier } })">
          <Field>
            <div class="flex items-center justify-between gap-3">
              <FieldLabel :for="speedInputId">{{ t('players.quick.speedValue') }}</FieldLabel>
              <output :for="speedInputId">{{ speedMultiplier }} ×</output>
            </div>
            <Slider :id="speedInputId" :model-value="[speedMultiplier]" :min="0.5" :max="3" :step="0.1" :disabled="!quickActionAvailable('speed')" @update:model-value="speedMultiplier = $event[0]" />
            <ToggleGroup :model-value="String(speedMultiplier)" type="single" variant="outline" :spacing="2" class="grid grid-cols-3" :disabled="!quickActionAvailable('speed')" :aria-label="t('players.quick.speedValue')" @update:model-value="value => { if (value) speedMultiplier = Number(value) }">
              <ToggleGroupItem v-for="value in [1, 1.5, 2]" :key="value" :value="String(value)">{{ value === 1 ? t('players.quick.normalSpeed') : `${value} ×` }}</ToggleGroupItem>
            </ToggleGroup>
            <FieldDescription>{{ t('players.quick.speedHint') }}</FieldDescription>
          </Field>
          <DialogFooter><UiButton type="button" variant="outline" :disabled="Boolean(activeAction)" @click="quickAction = ''">{{ t('players.actions.cancel') }}</UiButton><UiButton type="submit" :disabled="!speedInputValid || !quickActionAvailable('speed')"><Spinner v-if="activeAction" data-icon="inline-start" />{{ t('players.quick.speedSubmit') }}</UiButton></DialogFooter>
        </form>
        <form v-else-if="quickAction === 'ban'" class="flex flex-col gap-5 p-5" @submit.prevent="confirmBan">
          <FieldGroup>
            <Field :data-invalid="banReasonInvalid"><FieldLabel :for="banReasonId">{{ t('players.fields.banReason') }}</FieldLabel><UiTextarea :id="banReasonId" v-model="banForm.reason" rows="3" :placeholder="t('players.dialogs.ban.reasonPlaceholder')" :aria-invalid="banReasonInvalid" :disabled="Boolean(activeAction)" /><FieldError v-if="banReasonInvalid">{{ t('players.validation.banReasonRequired') }}</FieldError></Field>
            <Field><FieldLabel :for="banDurationId">{{ t('players.fields.banDuration') }}</FieldLabel><UiSelect v-model="banForm.duration" :disabled="Boolean(activeAction)"><SelectTrigger :id="banDurationId" class="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="duration in banDurations" :key="duration.value" :value="duration.value">{{ duration.label }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
          </FieldGroup>
          <DialogFooter><UiButton type="button" variant="outline" :disabled="Boolean(activeAction)" @click="quickAction = ''">{{ t('players.actions.cancel') }}</UiButton><UiButton type="submit" variant="destructive" :disabled="Boolean(activeAction)"><Spinner v-if="activeAction === 'ban'" data-icon="inline-start" />{{ t('players.actions.confirmBan') }}</UiButton></DialogFooter>
        </form>
        <form v-else-if="['god', 'creative'].includes(quickAction)" class="flex flex-col gap-5 p-5" @submit.prevent="confirmMode(quickAction)">
          <Field orientation="horizontal"><FieldContent><FieldLabel :for="quickAction === 'god' ? godModeId : creativeModeId">{{ t(quickAction === 'god' ? 'players.operations.godMode' : 'players.operations.creativeMode') }}</FieldLabel><FieldDescription>{{ t(modeEnabled ? 'players.values.enabled' : 'players.values.disabled') }}</FieldDescription></FieldContent><UiSwitch :id="quickAction === 'god' ? godModeId : creativeModeId" v-model="modeEnabled" :disabled="Boolean(activeAction)" /></Field>
          <DialogFooter><UiButton type="button" variant="outline" :disabled="Boolean(activeAction)" @click="quickAction = ''">{{ t('players.actions.cancel') }}</UiButton><UiButton type="submit" :disabled="(!previewMode && !canUseCharacterActions) || Boolean(activeAction)"><Spinner v-if="activeAction" data-icon="inline-start" />{{ t('players.actions.confirm') }}</UiButton></DialogFooter>
        </form>
        <form v-else-if="confirmingAction" class="flex flex-col gap-5 p-5" @submit.prevent="runConfirmedAction(quickAction)">
          <p class="text-sm text-muted-foreground">{{ confirmationDescription }}</p>
          <DialogFooter><UiButton type="button" variant="outline" :disabled="Boolean(activeAction)" @click="quickAction = ''">{{ t('players.actions.cancel') }}</UiButton><UiButton type="submit" variant="destructive" :disabled="Boolean(activeAction)"><Spinner v-if="activeAction" data-icon="inline-start" />{{ t('players.actions.confirmAction') }}</UiButton></DialogFooter>
        </form>
        <div v-else class="flex flex-col gap-3 px-4 py-3">
          <section class="flex flex-col gap-2" :aria-label="t('players.quick.recovery')">
            <div class="flex items-center justify-between gap-2">
              <h3 class="text-xs text-muted-foreground">{{ t('players.quick.recovery') }}</h3>
              <UiButton variant="ghost" size="sm" :disabled="Boolean(activeAction)" :aria-label="t('players.actions.openWorkbench')" @click="openWorkbench()">{{ t('players.quick.more') }}<ChevronRight data-icon="inline-end" /></UiButton>
            </div>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 [&_button]:h-auto [&_button]:min-h-11 [&_button]:min-w-0 [&_button]:justify-start [&_button]:gap-1.5 [&_button]:whitespace-normal [&_button]:text-left">
              <UiButton v-for="action in commonActions" :key="action.id" variant="outline" size="sm" :disabled="!quickActionAvailable(action.id)" @click="selectQuickAction(action.id)">
                <Spinner v-if="activeAction === action.id" data-icon="inline-start" /><component :is="action.icon" v-else data-icon="inline-start" /><span>{{ t(`players.quick.${action.id}`) }}</span>
              </UiButton>
              <UiButton variant="outline" size="sm" :disabled="(!previewMode && !canResurrect) || Boolean(activeAction)" @click="resurrectPlayer"><HeartPulse data-icon="inline-start" />{{ t('players.operations.resurrect') }}</UiButton>
              <UiButton variant="outline" size="sm" :disabled="!quickActionAvailable('penalty')" @click="selectQuickAction('penalty')"><HeartPlus data-icon="inline-start" />{{ t('players.quick.penalty') }}</UiButton>
            </div>
          </section>
          <section class="flex flex-col gap-2" :aria-label="t('players.quick.character')">
            <h3 class="text-xs text-muted-foreground">{{ t('players.quick.character') }}</h3>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 [&_button]:h-auto [&_button]:min-h-10 [&_button]:min-w-0 [&_button]:justify-start [&_button]:gap-2 [&_button]:whitespace-normal [&_button]:text-left">
              <UiButton variant="outline" size="sm" :disabled="!quickActionAvailable('speed')" @click="selectQuickAction('speed')"><Gauge data-icon="inline-start" />{{ t('players.quick.speed') }}</UiButton>
              <UiButton variant="outline" size="sm" :disabled="(!previewMode && !canUseCharacterActions) || Boolean(activeAction)" @click="openModeDialog('god')"><ShieldCheck data-icon="inline-start" />{{ t('players.operations.godMode') }}</UiButton>
              <UiButton variant="outline" size="sm" :disabled="(!previewMode && !canUseCharacterActions) || Boolean(activeAction)" @click="openModeDialog('creative')"><Hammer data-icon="inline-start" />{{ t('players.operations.creativeMode') }}</UiButton>
            </div>
          </section>
          <Separator />
          <section class="flex flex-col gap-2" :aria-label="t('players.quick.management')">
            <div class="flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground">
              <h3>{{ t('players.quick.management') }}</h3>
              <span>{{ t('players.quick.managementHint') }}</span>
            </div>
            <div class="grid grid-cols-2 gap-1 sm:grid-cols-4 [&_button]:h-auto [&_button]:min-h-10 [&_button]:whitespace-normal [&_button]:text-left">
              <UiButton variant="ghost" size="sm" class="justify-start" :disabled="(!previewMode && !canUseLiveActions) || Boolean(activeAction)" @click="quickAction = 'character'"><RotateCcw data-icon="inline-start" class="text-destructive" />{{ t('players.operations.changeCharacter') }}</UiButton>
              <UiButton variant="ghost" size="sm" class="justify-start" :disabled="(!previewMode && !canUseLiveActions) || Boolean(activeAction)" @click="quickAction = 'kick'"><LogOut data-icon="inline-start" class="text-destructive" />{{ t('players.operations.kick') }}</UiButton>
              <UiButton variant="ghost" size="sm" class="justify-start" :disabled="Boolean(activeAction)" @click="openBanDialog"><BanIcon data-icon="inline-start" class="text-destructive" />{{ t(activePlayer.banned ? 'players.quick.unban' : 'players.operations.ban') }}</UiButton>
              <UiButton variant="ghost" size="sm" class="justify-start" :disabled="(!previewMode && !canUseCharacterActions) || Boolean(activeAction)" @click="quickAction = 'kill'"><Skull data-icon="inline-start" class="text-destructive" />{{ t('players.operations.kill') }}</UiButton>
            </div>
          </section>
          <p v-if="!previewMode && !canUseLiveActions" class="text-xs text-muted-foreground">{{ t('players.quick.liveUnavailable') }}</p>
        </div>
        </div>
        <p v-if="previewMode" class="shrink-0 px-4 py-3 text-xs text-muted-foreground">{{ t('players.quick.previewNotice') }}</p>
      </DialogContent>
    </UiDialog>
  </div>

  <GameToolsDialog
    v-model:open="workbenchOpen"
    :room-id="activePlayer.room_id || activePlayer.roomId || ''"
    :room-name="activePlayer.archive_name || activePlayer.room_name || ''"
    :world-id="activePlayer.world_id || activePlayer.worldId || ''"
    :world-name="activePlayer.world_name || activePlayer.worldName || ''"
    :player-id="activePlayer.user_id || activePlayer.id || ''"
    :player="activePlayer"
    :initial-section="activeWorkbenchSection"
    @player-state-refreshed="emit('player-state-refreshed', $event)"
    @world-state-refreshed="emit('world-state-refreshed', $event)"
  />

</template>

<style scoped>
.player-action-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
