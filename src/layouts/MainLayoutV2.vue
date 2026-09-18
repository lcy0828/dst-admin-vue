<script setup>
import { computed, onBeforeUnmount, onMounted, provide, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Eye, EyeOff, GitFork, KeyRound } from '@lucide/vue'
import { authAPI, systemV2API } from '@/api/v2'
import AppSidebarV2 from '@/components/v2/AppSidebarV2.vue'
import GameVersionStatus from '@/components/layout/GameVersionStatus.vue'
import GlobalJobStatus from '@/components/layout/GlobalJobStatus.vue'
import RoomUpdateProgress from '@/components/layout/RoomUpdateProgress.vue'
import { provideGlobalJobStatus } from '@/composables/useGlobalJobStatus'
import LanguageSwitch from '@/components/layout/LanguageSwitch.vue'
import ManagementScopeSwitch from '@/components/layout/ManagementScopeSwitch.vue'
import RoomManagementScopeNotice from '@/components/layout/RoomManagementScopeNotice.vue'
import SystemResourceRefreshInterval from '@/components/layout/SystemResourceRefreshInterval.vue'
import SystemResourceStatus from '@/components/layout/SystemResourceStatus.vue'
import ThemeSwitch from '@/components/ThemeSwitch.vue'
import WeatherPreviewControl from '@/components/layout/WeatherPreviewControl.vue'
import RoomWeatherLayer from '@/components/layout/RoomWeatherLayer.vue'
import { provideRoomWeather } from '@/composables/useRoomWeather'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getSystemPreferences } from '@/utils/systemPreferences'
import { MANAGEMENT_SCOPE_CHANGED_EVENT, managementScopeTargetId } from '@/lib/managementScope.mjs'
import { toast } from 'vue-sonner'
import { pageHasMachineScope, queryAfterMachineChange } from '@/lib/pageScope.mjs'

const router = useRouter()
provideGlobalJobStatus()
const roomWeather = provideRoomWeather()
const route = useRoute()
const roomScopeTarget = ref(null)
provide('room-scope-target', roomScopeTarget)
provide('machine-scope-guard', { check: async () => true })
const hasMachineScope = computed(() => pageHasMachineScope(route))
const { t } = useI18n()
const systemName = ref(getSystemPreferences().systemName)
const currentUser = ref({})
const setupPending = ref(false)
const runtimeFeatures = ref({})
const profileOpen = ref(false)
const passwordOpen = ref(false)
const passwordSaving = ref(false)
const passwordsVisible = ref(false)
const passwordForm = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const passwordErrors = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const managementScopeRevision = ref(0)
let selectedScopeTargetId = managementScopeTargetId()

const userInitial = computed(() => (currentUser.value.username || t('app.administrator')).trim().slice(0, 1).toUpperCase())
const breadcrumbs = computed(() => {
  if (route.path === '/dashboard') return [{ label: t('navigation.dashboard') }]

  const items = [{ label: t('navigation.dashboard'), to: '/dashboard' }]
  const matchedTitles = route.matched
    .map(record => record.meta?.titleKey ? t(record.meta.titleKey) : record.meta?.title)
    .filter(Boolean)
  for (const label of matchedTitles) {
    if (label !== items.at(-1)?.label) items.push({ label })
  }
  if (items.length === 1) items.push({ label: route.meta.titleKey ? t(route.meta.titleKey) : (route.meta.title || t('app.currentPage')) })
  return items
})

function updateSystemName(event) {
  systemName.value = event.detail?.systemName || getSystemPreferences().systemName
}

async function refreshManagementScope(event) {
  const targetId = managementScopeTargetId(event?.detail)
  if (targetId === selectedScopeTargetId) return
  selectedScopeTargetId = targetId
  if (route.path === '/dashboard') return
  const previousPath = route.fullPath
  await router.replace({ query: queryAfterMachineChange(route, targetId) })
  if (route.path === '/mods' || route.fullPath === previousPath) managementScopeRevision.value += 1
}

async function loadCurrentUser() {
  try {
    const session = await authAPI.session()
    currentUser.value = session.user || {}
    setupPending.value = session.onboarding?.required === true
  } catch {
    currentUser.value = {}
  }
}

async function loadRuntimeFeatures() {
  try {
    const capabilities = await systemV2API.capabilities()
    runtimeFeatures.value = capabilities?.features || {}
  } catch {
    runtimeFeatures.value = {}
  }
}

async function logout() {
  try {
    await authAPI.logout()
  } finally {
    await router.push('/login')
  }
}

function resetPasswordForm() {
  passwordForm.currentPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  passwordErrors.currentPassword = ''
  passwordErrors.newPassword = ''
  passwordErrors.confirmPassword = ''
  passwordsVisible.value = false
}

function validatePasswordField(field) {
  const value = passwordForm[field]
  let message = ''
  if (!value) {
    message = field === 'currentPassword' ? t('app.password.currentRequired') : t('app.password.nextRequired')
    if (field === 'confirmPassword') message = t('app.password.confirmRequired')
  } else if (field === 'newPassword' && value.length < 6) {
    message = t('app.password.tooShort')
  } else if (field === 'confirmPassword' && value !== passwordForm.newPassword) {
    message = t('app.password.mismatch')
  }
  passwordErrors[field] = message
  return !message
}

async function changePassword() {
  const valid = ['currentPassword', 'newPassword', 'confirmPassword']
    .map(validatePasswordField)
    .every(Boolean)
  if (!valid) return

  passwordSaving.value = true
  try {
    await authAPI.changePassword(passwordForm.currentPassword, passwordForm.newPassword)
    passwordOpen.value = false
    resetPasswordForm()
    toast.success(t('app.password.success'))
    await router.push('/login')
  } catch (error) {
    toast.error(error.message || t('app.password.failed'))
  } finally {
    passwordSaving.value = false
  }
}

onMounted(() => {
  document.body.dataset.uiVersion = 'v2'
  window.addEventListener('system-preferences-updated', updateSystemName)
  window.addEventListener('system-runtime-updated', loadRuntimeFeatures)
  window.addEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, refreshManagementScope)
  loadCurrentUser()
  loadRuntimeFeatures()
})

onBeforeUnmount(() => {
  if (document.body.dataset.uiVersion === 'v2') delete document.body.dataset.uiVersion
  window.removeEventListener('system-preferences-updated', updateSystemName)
  window.removeEventListener('system-runtime-updated', loadRuntimeFeatures)
  window.removeEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, refreshManagementScope)
})
</script>

<template>
  <RoomWeatherLayer v-if="roomWeather.weather.value" :weather="roomWeather.weather.value" />
  <SidebarProvider class="h-svh overflow-hidden">
    <AppSidebarV2
      :system-name="systemName"
      :user="currentUser"
      :features="runtimeFeatures"
      @profile="profileOpen = true"
      @password="passwordOpen = true"
      @logout="logout"
    />
    <SidebarInset class="min-h-0 min-w-0">
      <header class="bg-background/95 sticky top-0 z-30 flex min-h-16 shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2 backdrop-blur md:px-4 lg:px-6">
        <SidebarTrigger />
        <Breadcrumb class="hidden min-w-0 flex-1 overflow-hidden xl:block">
          <BreadcrumbList>
            <template v-for="(item, index) in breadcrumbs" :key="`${item.label}-${index}`">
              <BreadcrumbItem>
                <BreadcrumbLink v-if="item.to" as-child><RouterLink :to="item.to">{{ item.label }}</RouterLink></BreadcrumbLink>
                <BreadcrumbPage v-else-if="index === breadcrumbs.length - 1">{{ item.label }}</BreadcrumbPage>
                <span v-else class="text-muted-foreground">{{ item.label }}</span>
              </BreadcrumbItem>
              <BreadcrumbSeparator v-if="index < breadcrumbs.length - 1" />
            </template>
          </BreadcrumbList>
        </Breadcrumb>
        <div v-show="hasMachineScope" class="order-3 flex min-w-0 max-w-full basis-full flex-wrap items-center gap-2 2xl:order-none 2xl:basis-auto">
          <ManagementScopeSwitch v-if="hasMachineScope" />
          <div ref="roomScopeTarget" class="flex min-w-0 items-center empty:hidden" />
        </div>
        <SystemResourceStatus v-if="hasMachineScope" class="hidden md:flex" />
        <div class="ml-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-1.5">
          <GameVersionStatus v-if="hasMachineScope" class="hidden md:block" />
          <GlobalJobStatus />
          <div v-if="hasMachineScope" class="hidden xl:block"><SystemResourceRefreshInterval /></div>
          <LanguageSwitch />
          <Button variant="ghost" size="sm" @click="router.push('/setup')">{{ t('setup.title') }}</Button>
          <ThemeSwitch />
          <WeatherPreviewControl />
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon-sm" as-child>
                <a href="https://github.com/lcy0828/dst-admin-go" target="_blank" rel="noopener noreferrer" :aria-label="t('app.openGithubRepository')">
                  <GitFork />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{{ t('app.githubRepository') }}</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <RoomManagementScopeNotice v-if="hasMachineScope && route.path.startsWith('/rooms')" />

      <div class="bg-muted/30 min-h-0 flex-1 overflow-auto">
        <main id="main-content-v2" class="mx-auto w-full px-4 py-6 md:px-6 lg:px-8 lg:py-8" :class="{ 'max-w-[1440px]': route.path !== '/players/list' }" tabindex="-1">
          <Alert v-if="setupPending" class="mb-4">
            <AlertTitle>{{ t('setup.title') }}</AlertTitle>
            <AlertDescription>{{ t('setup.resume') }}</AlertDescription>
            <AlertAction><Button variant="outline" @click="router.push('/setup')">{{ t('setup.return') }}</Button></AlertAction>
          </Alert>
          <RouterView :key="`${['/mods', '/dashboard'].includes(route.path) ? route.path : route.fullPath}:${route.path === '/dashboard' ? '' : managementScopeRevision}`" />
        </main>
      </div>
      <RoomUpdateProgress />
    </SidebarInset>

    <Dialog v-model:open="profileOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('app.profile') }}</DialogTitle>
          <DialogDescription>{{ t('app.profileDescription') }}</DialogDescription>
        </DialogHeader>
        <div class="flex items-center gap-3">
          <Avatar size="lg"><AvatarFallback>{{ userInitial }}</AvatarFallback></Avatar>
          <div class="flex flex-col"><strong>{{ currentUser.username || t('app.administrator') }}</strong><span class="text-muted-foreground text-sm">{{ t('app.systemAdministrator') }}</span></div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="passwordOpen" @update:open="open => !open && resetPasswordForm()">
      <DialogContent class="sm:max-w-md">
        <form class="flex flex-col gap-5" novalidate @submit.prevent="changePassword">
          <DialogHeader>
            <DialogTitle>{{ t('app.changePassword') }}</DialogTitle>
            <DialogDescription>{{ t('app.password.description') }}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field :data-invalid="Boolean(passwordErrors.currentPassword)">
              <FieldLabel for="v2-current-password">{{ t('app.password.current') }}</FieldLabel>
              <Input id="v2-current-password" v-model="passwordForm.currentPassword" :type="passwordsVisible ? 'text' : 'password'" autocomplete="current-password" :aria-invalid="Boolean(passwordErrors.currentPassword)" @blur="validatePasswordField('currentPassword')" />
              <FieldError v-if="passwordErrors.currentPassword">{{ passwordErrors.currentPassword }}</FieldError>
            </Field>
            <Field :data-invalid="Boolean(passwordErrors.newPassword)">
              <FieldLabel for="v2-new-password">{{ t('app.password.next') }}</FieldLabel>
              <Input id="v2-new-password" v-model="passwordForm.newPassword" :type="passwordsVisible ? 'text' : 'password'" autocomplete="new-password" :aria-invalid="Boolean(passwordErrors.newPassword)" @blur="validatePasswordField('newPassword')" />
              <FieldError v-if="passwordErrors.newPassword">{{ passwordErrors.newPassword }}</FieldError>
            </Field>
            <Field :data-invalid="Boolean(passwordErrors.confirmPassword)">
              <FieldLabel for="v2-confirm-password">{{ t('app.password.confirm') }}</FieldLabel>
              <Input id="v2-confirm-password" v-model="passwordForm.confirmPassword" :type="passwordsVisible ? 'text' : 'password'" autocomplete="new-password" :aria-invalid="Boolean(passwordErrors.confirmPassword)" @blur="validatePasswordField('confirmPassword')" />
              <FieldError v-if="passwordErrors.confirmPassword">{{ passwordErrors.confirmPassword }}</FieldError>
            </Field>
          </FieldGroup>
          <Button type="button" variant="ghost" class="self-start" @click="passwordsVisible = !passwordsVisible">
            <EyeOff v-if="passwordsVisible" data-icon="inline-start" />
            <Eye v-else data-icon="inline-start" />
            {{ passwordsVisible ? t('app.password.hide') : t('app.password.show') }}
          </Button>
          <DialogFooter>
            <DialogClose as-child><Button type="button" variant="outline">{{ t('common.actions.cancel') }}</Button></DialogClose>
            <Button type="submit" :disabled="passwordSaving">
              <Spinner v-if="passwordSaving" data-icon="inline-start" />
              <KeyRound v-else data-icon="inline-start" />
              {{ passwordSaving ? t('app.password.changing') : t('app.password.submit') }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </SidebarProvider>
</template>
