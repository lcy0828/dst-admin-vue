<script setup>
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, ArrowRight, Check, RefreshCw } from '@lucide/vue'
import { authAPI, gameInstallationsV2API, roomsV2API, systemV2API } from '@/api/v2'
import LoginView from '@/views/Login.vue'
import LanguageSwitch from '@/components/layout/LanguageSwitch.vue'
import ManagementScopeSwitch from '@/components/layout/ManagementScopeSwitch.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SETUP_STEPS, setupPendingItems, setupStep } from '@/lib/initialSetup.mjs'
import { setManagementScope } from '@/lib/managementScope.mjs'

const FleetProfilePanel = defineAsyncComponent(() => import('@/components/agents/FleetProfilePanel.vue'))
const SetupEnvironment = defineAsyncComponent(() => import('@/components/setup/SetupEnvironment.vue'))
const GameInstallationManager = defineAsyncComponent(() => import('@/components/GameInstallationManager.vue'))
const LuaJITInstaller = defineAsyncComponent(() => import('@/components/LuaJITInstaller.vue'))
const RoomSettings = defineAsyncComponent(() => import('@/views/rooms/RoomSettings.vue'))
const SaveImportsPanel = defineAsyncComponent(() => import('@/views/backups/SaveImportsPanel.vue'))
const { t } = useI18n(), router = useRouter(), route = useRoute()
const session = ref(null), loading = ref(true), busy = ref(false), error = ref('')
const step = ref('deployment'), editor = ref(null), roomEditor = ref(null), importEditor = ref(null), roomMode = ref('')
const facts = ref({ errors: [] }), refreshing = ref(false), showLuaJIT = ref(false)
const titles = ['account', ...SETUP_STEPS]
const stepIndex = computed(() => SETUP_STEPS.indexOf(step.value))
const member = computed(() => facts.value.capabilities?.deployment?.memberEnabled === true)
const remote = computed(() => facts.value.capabilities?.deployment?.localExecutorEnabled === false)
const restartRequired = computed(() => facts.value.restartRequired === true)
const pending = computed(() => setupPendingItems(facts.value))
const rooms = computed(() => Array.isArray(facts.value.rooms) ? facts.value.rooms : [])
const showPlacement = computed(() => remote.value || new Set((facts.value.installations || []).map(item => item.targetId)).size > 1)
let leaving = false

async function load() {
  loading.value = true; error.value = ''
  try {
    session.value = await authAPI.session()
    step.value = setupStep(session.value.onboarding?.required ? session.value.onboarding.step : route.query.step)
    if (session.value.authenticated) await refresh()
  } catch (e) { error.value = e.message || t('setup.loadFailed') }
  finally { loading.value = false }
}
async function acceptSession(value) {
  session.value = value
  step.value = setupStep(value.onboarding?.step)
  setManagementScope({ kind: 'all' })
  await refresh()
}
async function refresh() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    const keys = ['capabilities', 'readiness', 'settings', 'installations', 'rooms']
    const results = await Promise.allSettled([
      systemV2API.capabilities({ fresh: true }), systemV2API.setupChecks(), systemV2API.settings(),
      gameInstallationsV2API.list(''), roomsV2API.controlPlaneList({ all: true })
    ])
    const next = { errors: [] }
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') next[keys[index]] = result.value
      else next.errors.push(result.reason?.message || t('setup.loadFailed'))
    })
    next.restartRequired = next.settings?.restartRequired === true
    next.rooms = next.rooms?.items || []
    facts.value = next
  } finally { refreshing.value = false }
}
async function leaveRoomEditor() {
  if (importEditor.value?.busy) { error.value = t('setup.importBusy'); return false }
  if (roomEditor.value?.saving) return false
  return !roomEditor.value || await roomEditor.value.confirmLeaveRoomSettings()
}
async function changeStep(direction) {
  if (busy.value || refreshing.value) return
  busy.value = true; error.value = ''
  try {
    if (!(await leaveRoomEditor())) return
    if (['deployment', 'environment'].includes(step.value) && !editor.value) return
    if (editor.value && !(await editor.value.prepare())) return
    const next = SETUP_STEPS[stepIndex.value + direction]
    if (!next) return
    await authAPI.saveOnboarding(next)
    step.value = next; roomMode.value = ''; showLuaJIT.value = false
    await refresh()
    window.scrollTo({ top: 0 })
  } catch (e) { error.value = e.message || t('setup.saveFailed') }
  finally { busy.value = false }
}
async function cancelRoom() {
  if (await leaveRoomEditor()) roomMode.value = ''
}
async function roomSaved() {
  roomMode.value = ''
  await refresh()
}
async function finish(openRooms = false) {
  if (busy.value || refreshing.value) return
  busy.value = true; error.value = ''
  try {
    await authAPI.saveOnboarding('complete')
    leaving = true
    await router.replace(openRooms && rooms.value.length
      ? { path: '/dashboard', query: { roomId: rooms.value[0].id }, hash: '#room-operations' }
      : '/dashboard')
  } catch (e) { leaving = false; error.value = e.message || t('setup.saveFailed') }
  finally { busy.value = false }
}
onBeforeRouteLeave(async () => leaving || await leaveRoomEditor())
onMounted(load)
</script>

<template>
  <TooltipProvider>
  <div v-if="loading" class="flex min-h-dvh items-center justify-center gap-2" role="status"><Spinner />{{ t('setup.loading') }}</div>
  <LoginView v-else-if="session && !session.authenticated" @authenticated="acceptSession" />
  <main v-else class="mx-auto flex min-h-dvh w-full max-w-5xl min-w-0 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
    <header class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 flex-col gap-2"><p class="text-sm text-muted-foreground">DST Admin</p><h1 class="text-2xl font-semibold">{{ t('setup.title') }}</h1><p class="text-sm text-muted-foreground">{{ t('setup.description') }}</p></div>
      <LanguageSwitch />
    </header>
    <Alert v-if="error" variant="destructive"><AlertTitle>{{ t('setup.loadFailed') }}</AlertTitle><AlertDescription>{{ error }}</AlertDescription><Button v-if="!session" variant="outline" @click="load">{{ t('setup.reload') }}</Button></Alert>
    <template v-if="session?.authenticated">
      <Card>
        <CardHeader><CardTitle>{{ t(`setup.steps.${step}`) }}</CardTitle><CardDescription>{{ t('setup.progress', { current: stepIndex + 2, total: titles.length }) }}</CardDescription></CardHeader>
        <CardContent class="flex flex-col gap-4">
          <Progress :model-value="((stepIndex + 1) / titles.length) * 100" :aria-label="t('setup.title')" />
          <ol class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <li v-for="(item, index) in titles" :key="item" :aria-current="item === step ? 'step' : undefined" class="flex items-center gap-2 text-sm">
              <Badge :variant="item === step ? 'default' : 'outline'"><Check v-if="index === 0" /><span v-else>{{ index + 1 }}</span></Badge>{{ t(`setup.steps.${item}`) }}
            </li>
          </ol>
        </CardContent>
      </Card>

      <Alert v-if="restartRequired"><AlertTitle>{{ t('setup.restartTitle') }}</AlertTitle><AlertDescription>{{ t('setup.restartDescription') }}</AlertDescription><Button variant="outline" :disabled="refreshing" @click="refresh"><RefreshCw data-icon="inline-start" />{{ t('setup.recheck') }}</Button></Alert>

      <FleetProfilePanel v-if="step === 'deployment'" ref="editor" />
      <SetupEnvironment v-else-if="step === 'environment'" ref="editor" />

      <template v-else-if="step === 'game'">
        <Alert v-if="member"><AlertTitle>{{ t('setup.memberTitle') }}</AlertTitle><AlertDescription>{{ t('setup.memberDescription') }}</AlertDescription></Alert>
        <template v-else-if="!restartRequired && facts.capabilities">
          <Alert v-if="remote"><AlertTitle>{{ t('setup.remoteTitle') }}</AlertTitle><AlertDescription>{{ t('setup.remoteGame') }}</AlertDescription><Button variant="outline" @click="router.push('/agents/list')">{{ t('setup.manageAgents') }}</Button></Alert>
          <ManagementScopeSwitch />
          <GameInstallationManager @changed="refresh" />
          <Card>
            <CardHeader><CardTitle>{{ t('setup.luaTitle') }}</CardTitle><CardDescription>{{ t('setup.luaDescription') }}</CardDescription></CardHeader>
            <CardFooter><Button variant="outline" :aria-expanded="showLuaJIT" @click="showLuaJIT = !showLuaJIT">{{ t(showLuaJIT ? 'setup.hideLua' : 'setup.showLua') }}</Button></CardFooter>
          </Card>
          <LuaJITInstaller v-if="showLuaJIT" />
        </template>
      </template>

      <template v-else-if="step === 'room'">
        <Alert v-if="member"><AlertTitle>{{ t('setup.memberTitle') }}</AlertTitle><AlertDescription>{{ t('setup.memberDescription') }}</AlertDescription></Alert>
        <template v-else-if="!restartRequired && facts.capabilities">
          <Card>
            <CardHeader><CardTitle>{{ t('setup.roomTitle') }}</CardTitle><CardDescription>{{ t('setup.roomDescription') }}</CardDescription></CardHeader>
            <CardContent class="flex flex-col gap-3">
              <p v-if="rooms.length">{{ t('setup.existingRooms', { count: rooms.length }) }}</p>
              <ul v-if="rooms.length" class="flex flex-col gap-2">
                <li v-for="room in rooms" :key="room.id" class="flex flex-wrap items-center justify-between gap-2">
                  <span class="min-w-0 break-words">{{ room.displayName || room.name || room.id }}</span>
                  <Button variant="outline" size="sm" @click="router.push({ path: '/rooms/settings', query: { id: room.id, ...(showPlacement ? { deployment: 'edit' } : {}) } })">{{ t(showPlacement ? 'setup.configurePlacement' : 'setup.configureRoom') }}</Button>
                </li>
              </ul>
              <p v-if="showPlacement" class="text-sm text-muted-foreground">{{ t('setup.placementHint') }}</p>
              <Alert v-if="remote"><AlertTitle>{{ t('setup.remoteImportTitle') }}</AlertTitle><AlertDescription>{{ t('setup.remoteImportHint') }}</AlertDescription></Alert>
              <p class="text-sm text-muted-foreground">{{ t('setup.roomHint') }}</p>
            </CardContent>
            <CardFooter v-if="!roomMode" class="flex flex-wrap gap-2">
              <Button @click="roomMode = 'create'">{{ t('setup.createRoom') }}</Button>
              <Button v-if="!remote" variant="outline" @click="roomMode = 'import'">{{ t('setup.importRoom') }}</Button>
              <Button variant="outline" :disabled="refreshing" @click="refresh"><RefreshCw data-icon="inline-start" />{{ t('setup.recheck') }}</Button>
            </CardFooter>
          </Card>
          <RoomSettings v-if="roomMode === 'create'" ref="roomEditor" setup-mode @saved="roomSaved" @cancel="cancelRoom" />
          <SaveImportsPanel v-if="roomMode === 'import' && !remote" ref="importEditor" create-only @rooms-changed="refresh" />
          <Button v-if="roomMode === 'import'" variant="outline" class="self-start" @click="cancelRoom">{{ t('setup.backToRooms') }}</Button>
        </template>
      </template>

      <Card v-else-if="step === 'review'">
        <CardHeader><CardTitle>{{ t('setup.reviewTitle') }}</CardTitle><CardDescription>{{ t('setup.reviewDescription') }}</CardDescription></CardHeader>
        <CardContent class="flex flex-col gap-4">
          <p>{{ t('setup.accountReady', { username: session.user?.username || '' }) }}</p>
          <p>{{ t('setup.existingRooms', { count: rooms.length }) }}</p>
          <Alert v-if="pending.length"><AlertTitle>{{ t('setup.pendingTitle') }}</AlertTitle><AlertDescription><ul class="flex flex-col gap-2"><li v-for="item in pending" :key="item">{{ t(`setup.pending.${item}`) }}</li></ul></AlertDescription></Alert>
          <p v-else>{{ t(member ? 'setup.memberReady' : 'setup.ready') }}</p>
          <p class="text-sm text-muted-foreground">{{ t('setup.finishHint') }}</p>
        </CardContent>
        <CardFooter><Button variant="outline" :disabled="refreshing" @click="refresh"><Spinner v-if="refreshing" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{ t('setup.recheck') }}</Button></CardFooter>
      </Card>

      <Alert v-if="facts.errors?.length" variant="destructive"><AlertTitle>{{ t('setup.incompleteChecks') }}</AlertTitle><AlertDescription><p v-for="(message, index) in facts.errors" :key="index" class="break-words">{{ message }}</p></AlertDescription><Button variant="outline" :disabled="refreshing" @click="refresh">{{ t('setup.recheck') }}</Button></Alert>

      <footer class="flex flex-col gap-3">
        <p class="text-sm text-muted-foreground">{{ t(['deployment', 'environment'].includes(step) ? 'setup.saveAndContinueHint' : 'setup.continueHint') }}</p>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" :disabled="stepIndex === 0 || busy || refreshing" @click="changeStep(-1)"><ArrowLeft data-icon="inline-start" />{{ t('setup.previous') }}</Button>
          <Button v-if="step !== 'review'" :disabled="busy || refreshing" @click="changeStep(1)"><Spinner v-if="busy" data-icon="inline-start" />{{ t(['deployment', 'environment'].includes(step) ? 'setup.saveContinue' : 'setup.next') }}<ArrowRight data-icon="inline-end" /></Button>
          <div v-else class="flex flex-wrap gap-2">
            <Button variant="outline" :disabled="busy || refreshing" @click="finish(false)">{{ t(pending.length ? 'setup.finishLater' : 'setup.finish') }}</Button>
            <Button v-if="rooms.length && !member && !restartRequired && !pending.length" :disabled="busy || refreshing" @click="finish(true)">{{ t('setup.finishStart') }}<ArrowRight data-icon="inline-end" /></Button>
          </div>
        </div>
      </footer>
    </template>
  </main>
  </TooltipProvider>
</template>
