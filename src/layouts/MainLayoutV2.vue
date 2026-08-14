<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Eye, EyeOff, GitFork, KeyRound, Settings, TriangleAlert } from '@lucide/vue'
import { authAPI } from '@/api/v2'
import AppSidebarV2 from '@/components/v2/AppSidebarV2.vue'
import RuntimeTargetSelectV2 from '@/components/v2/RuntimeTargetSelectV2.vue'
import ThemeSwitch from '@/components/ThemeSwitch.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  getActiveRuntimeTarget,
  LOCAL_RUNTIME_TARGET_ID,
  RUNTIME_TARGET_CHANGED_EVENT,
  setActiveRuntimeTarget
} from '@/utils/runtimeTarget'
import { getSystemPreferences } from '@/utils/systemPreferences'
import { toast } from 'vue-sonner'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const systemName = ref(getSystemPreferences().systemName)
const currentUser = ref({})
const runtimeTarget = ref(getActiveRuntimeTarget())
const profileOpen = ref(false)
const passwordOpen = ref(false)
const passwordSaving = ref(false)
const passwordsVisible = ref(false)
const passwordForm = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const passwordErrors = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })

const remoteContextBlocked = computed(() => runtimeTarget.value.id !== LOCAL_RUNTIME_TARGET_ID
  && !route.path.startsWith('/agents'))
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

function handleRuntimeTarget(target) {
  runtimeTarget.value = target
}

function handleRuntimeTargetEvent(event) {
  runtimeTarget.value = event.detail || getActiveRuntimeTarget()
}

function switchToLocalRuntime() {
  runtimeTarget.value = setActiveRuntimeTarget()
}

async function loadCurrentUser() {
  try {
    const session = await authAPI.session()
    currentUser.value = session.user || {}
  } catch {
    currentUser.value = {}
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
  window.addEventListener(RUNTIME_TARGET_CHANGED_EVENT, handleRuntimeTargetEvent)
  loadCurrentUser()
})

onBeforeUnmount(() => {
  if (document.body.dataset.uiVersion === 'v2') delete document.body.dataset.uiVersion
  window.removeEventListener('system-preferences-updated', updateSystemName)
  window.removeEventListener(RUNTIME_TARGET_CHANGED_EVENT, handleRuntimeTargetEvent)
})
</script>

<template>
  <SidebarProvider>
    <AppSidebarV2
      :system-name="systemName"
      :user="currentUser"
      @profile="profileOpen = true"
      @password="passwordOpen = true"
      @logout="logout"
    />
    <SidebarInset class="min-w-0">
      <header class="bg-background/95 sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b px-4 backdrop-blur md:px-6">
        <SidebarTrigger />
        <Separator orientation="vertical" class="mr-1 h-4" />
        <Breadcrumb class="hidden md:block">
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
        <div class="ml-auto flex min-w-0 items-center gap-1.5">
          <RuntimeTargetSelectV2 @change="handleRuntimeTarget" />
          <ThemeSwitch />
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

      <div class="bg-muted/30 min-h-0 flex-1 overflow-auto">
        <main id="main-content-v2" class="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-6 lg:px-8 lg:py-8" tabindex="-1">
          <Card v-if="remoteContextBlocked" class="mx-auto mt-8 max-w-3xl">
            <CardHeader>
              <CardTitle class="flex items-center gap-2"><Settings />{{ runtimeTarget.name }}</CardTitle>
              <CardDescription>{{ t('app.remote.selectedDescription') }}</CardDescription>
            </CardHeader>
            <CardContent class="flex flex-col gap-4">
              <Alert>
                <TriangleAlert />
                <AlertTitle>{{ t('app.remote.disabledTitle') }}</AlertTitle>
                <AlertDescription>{{ t('app.remote.disabledDescription') }}</AlertDescription>
              </Alert>
              <dl class="grid gap-3 sm:grid-cols-2">
                <div class="rounded-md border p-3"><dt class="text-muted-foreground text-xs">{{ t('app.remote.host') }}</dt><dd class="mt-1 font-medium">{{ runtimeTarget.hostname || '--' }}</dd></div>
                <div class="rounded-md border p-3"><dt class="text-muted-foreground text-xs">{{ t('app.remote.status') }}</dt><dd class="mt-1"><Badge :variant="runtimeTarget.online ? 'secondary' : 'destructive'">{{ runtimeTarget.online ? t('app.remote.agentOnline') : t('app.remote.agentOffline') }}</Badge></dd></div>
                <div class="rounded-md border p-3"><dt class="text-muted-foreground text-xs">{{ t('app.remote.archivePath') }}</dt><dd class="mt-1 break-all font-mono text-xs">{{ runtimeTarget.config?.savePath || t('common.states.unconfigured') }}</dd></div>
                <div class="rounded-md border p-3"><dt class="text-muted-foreground text-xs">{{ t('app.remote.serverPath') }}</dt><dd class="mt-1 break-all font-mono text-xs">{{ runtimeTarget.config?.serverPath || t('common.states.unconfigured') }}</dd></div>
              </dl>
              <div class="flex flex-wrap gap-2">
                <Button @click="router.push('/agents/list')"><Settings data-icon="inline-start" />{{ t('app.remote.configure') }}</Button>
                <Button variant="outline" @click="switchToLocalRuntime">{{ t('app.remote.switchLocal') }}</Button>
              </div>
            </CardContent>
          </Card>
          <RouterView v-else />
        </main>
      </div>
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
