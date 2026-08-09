<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
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
const systemName = ref(getSystemPreferences().systemName)
const currentUser = ref({})
const runtimeTarget = ref(getActiveRuntimeTarget())
const profileOpen = ref(false)
const passwordOpen = ref(false)
const passwordSaving = ref(false)
const passwordsVisible = ref(false)
const passwordForm = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const passwordErrors = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })

const remoteContextBlocked = computed(() => runtimeTarget.value.id !== LOCAL_RUNTIME_TARGET_ID)
const userInitial = computed(() => (currentUser.value.username || '管').trim().slice(0, 1).toUpperCase())

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
    message = field === 'currentPassword' ? '请输入当前密码' : '请输入新密码'
    if (field === 'confirmPassword') message = '请再次输入新密码'
  } else if (field === 'newPassword' && value.length < 6) {
    message = '密码长度不少于 6 位'
  } else if (field === 'confirmPassword' && value !== passwordForm.newPassword) {
    message = '两次输入的新密码不一致'
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
    toast.success('密码已修改，请重新登录')
    await router.push('/login')
  } catch (error) {
    toast.error(error.message || '修改密码失败')
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
      <header class="bg-background/95 sticky top-0 flex h-14 shrink-0 items-center gap-2 border-b px-3 backdrop-blur md:px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" class="mr-1 h-4" />
        <Breadcrumb class="hidden sm:block">
          <BreadcrumbList>
            <BreadcrumbItem>新界面</BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>服务总览</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div class="ml-auto flex min-w-0 items-center gap-1.5">
          <RuntimeTargetSelectV2 @change="handleRuntimeTarget" />
          <ThemeSwitch />
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon-sm" as-child>
                <a href="https://github.com/lcy0828/dst-admin-go" target="_blank" rel="noopener noreferrer" aria-label="打开 GitHub 仓库">
                  <GitFork />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>GitHub 仓库</TooltipContent>
          </Tooltip>
          <Button variant="outline" size="sm" class="hidden lg:inline-flex" as-child>
            <RouterLink to="/dashboard">返回旧界面</RouterLink>
          </Button>
        </div>
      </header>

      <div class="bg-muted/20 min-h-0 flex-1 overflow-auto">
        <main id="main-content-v2" class="mx-auto w-full max-w-[1600px] p-4 md:p-6" tabindex="-1">
          <Card v-if="remoteContextBlocked" class="mx-auto mt-8 max-w-3xl">
            <CardHeader>
              <CardTitle class="flex items-center gap-2"><Settings />{{ runtimeTarget.name }}</CardTitle>
              <CardDescription>当前选择的是单独配置的远程管理目标</CardDescription>
            </CardHeader>
            <CardContent class="flex flex-col gap-4">
              <Alert>
                <TriangleAlert />
                <AlertTitle>远程领域操作尚未启用</AlertTitle>
                <AlertDescription>房间、世界、模组和备份操作保持锁定，避免请求误落到本机。</AlertDescription>
              </Alert>
              <dl class="grid gap-3 sm:grid-cols-2">
                <div class="rounded-md border p-3"><dt class="text-muted-foreground text-xs">主机</dt><dd class="mt-1 font-medium">{{ runtimeTarget.hostname || '--' }}</dd></div>
                <div class="rounded-md border p-3"><dt class="text-muted-foreground text-xs">状态</dt><dd class="mt-1"><Badge :variant="runtimeTarget.online ? 'secondary' : 'destructive'">{{ runtimeTarget.online ? 'Agent 在线' : 'Agent 离线' }}</Badge></dd></div>
                <div class="rounded-md border p-3"><dt class="text-muted-foreground text-xs">存档路径</dt><dd class="mt-1 break-all font-mono text-xs">{{ runtimeTarget.config?.savePath || '未配置' }}</dd></div>
                <div class="rounded-md border p-3"><dt class="text-muted-foreground text-xs">服务端路径</dt><dd class="mt-1 break-all font-mono text-xs">{{ runtimeTarget.config?.serverPath || '未配置' }}</dd></div>
              </dl>
              <div class="flex flex-wrap gap-2">
                <Button @click="router.push('/agents/list')"><Settings data-icon="inline-start" />远程运行时配置</Button>
                <Button variant="outline" @click="switchToLocalRuntime">切换到本机</Button>
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
          <DialogTitle>个人资料</DialogTitle>
          <DialogDescription>当前登录账户与权限信息</DialogDescription>
        </DialogHeader>
        <div class="flex items-center gap-3">
          <Avatar size="lg"><AvatarFallback>{{ userInitial }}</AvatarFallback></Avatar>
          <div class="flex flex-col"><strong>{{ currentUser.username || '管理员' }}</strong><span class="text-muted-foreground text-sm">系统管理员</span></div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="passwordOpen" @update:open="open => !open && resetPasswordForm()">
      <DialogContent class="sm:max-w-md">
        <form class="flex flex-col gap-5" novalidate @submit.prevent="changePassword">
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>新密码至少 6 位，修改后需要重新登录。</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field :data-invalid="Boolean(passwordErrors.currentPassword)">
              <FieldLabel for="v2-current-password">当前密码</FieldLabel>
              <Input id="v2-current-password" v-model="passwordForm.currentPassword" :type="passwordsVisible ? 'text' : 'password'" autocomplete="current-password" :aria-invalid="Boolean(passwordErrors.currentPassword)" @blur="validatePasswordField('currentPassword')" />
              <FieldError v-if="passwordErrors.currentPassword">{{ passwordErrors.currentPassword }}</FieldError>
            </Field>
            <Field :data-invalid="Boolean(passwordErrors.newPassword)">
              <FieldLabel for="v2-new-password">新密码</FieldLabel>
              <Input id="v2-new-password" v-model="passwordForm.newPassword" :type="passwordsVisible ? 'text' : 'password'" autocomplete="new-password" :aria-invalid="Boolean(passwordErrors.newPassword)" @blur="validatePasswordField('newPassword')" />
              <FieldError v-if="passwordErrors.newPassword">{{ passwordErrors.newPassword }}</FieldError>
            </Field>
            <Field :data-invalid="Boolean(passwordErrors.confirmPassword)">
              <FieldLabel for="v2-confirm-password">确认密码</FieldLabel>
              <Input id="v2-confirm-password" v-model="passwordForm.confirmPassword" :type="passwordsVisible ? 'text' : 'password'" autocomplete="new-password" :aria-invalid="Boolean(passwordErrors.confirmPassword)" @blur="validatePasswordField('confirmPassword')" />
              <FieldError v-if="passwordErrors.confirmPassword">{{ passwordErrors.confirmPassword }}</FieldError>
            </Field>
          </FieldGroup>
          <Button type="button" variant="ghost" class="self-start" @click="passwordsVisible = !passwordsVisible">
            <EyeOff v-if="passwordsVisible" data-icon="inline-start" />
            <Eye v-else data-icon="inline-start" />
            {{ passwordsVisible ? '隐藏密码' : '显示密码' }}
          </Button>
          <DialogFooter>
            <DialogClose as-child><Button type="button" variant="outline">取消</Button></DialogClose>
            <Button type="submit" :disabled="passwordSaving">
              <Spinner v-if="passwordSaving" data-icon="inline-start" />
              <KeyRound v-else data-icon="inline-start" />
              {{ passwordSaving ? '正在修改' : '确认修改' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </SidebarProvider>
</template>
