<template>
  <div class="login-page">
    <div class="login-backdrop" aria-hidden="true"></div>
    <Card class="login-card">
      <CardHeader>
        <div class="login-brand">
          <span class="login-mark" aria-hidden="true"><Gamepad2Icon /></span>
          <span>DST Admin</span>
        </div>
        <CardTitle class="login-title">饥荒服务器管理系统</CardTitle>
        <CardDescription>
          {{ setupRequired ? '首次使用，请创建管理员账户。' : "Don't Starve Together Server Console" }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form class="login-form" @submit.prevent="handleLogin">
          <FieldGroup>
            <Field :data-invalid="Boolean(validationErrors.username)">
              <FieldLabel for="login-username">用户名</FieldLabel>
              <InputGroup>
                <InputGroupAddon><UserIcon /></InputGroupAddon>
                <InputGroupInput
                  id="login-username"
                  v-model="loginForm.username"
                  placeholder="请输入用户名"
                  autocomplete="username"
                  :aria-invalid="Boolean(validationErrors.username)"
                />
              </InputGroup>
              <FieldError v-if="validationErrors.username">{{ validationErrors.username }}</FieldError>
            </Field>

            <Field :data-invalid="Boolean(validationErrors.password)">
              <FieldLabel for="login-password">密码</FieldLabel>
              <InputGroup>
                <InputGroupAddon><LockKeyholeIcon /></InputGroupAddon>
                <InputGroupInput
                  id="login-password"
                  v-model="loginForm.password"
                  type="password"
                  placeholder="请输入密码"
                  autocomplete="current-password"
                  :aria-invalid="Boolean(validationErrors.password)"
                />
              </InputGroup>
              <FieldError v-if="validationErrors.password">{{ validationErrors.password }}</FieldError>
            </Field>

            <Field orientation="horizontal">
              <div class="remember-field">
                <Checkbox id="remember-login" v-model="loginForm.remember" />
                <FieldLabel for="remember-login">记住我</FieldLabel>
              </div>
              <FieldDescription v-if="setupRequired">密码至少 6 位</FieldDescription>
            </Field>

            <UiButton type="submit" class="login-button" :disabled="loading">
              <Spinner v-if="loading" data-icon="inline-start" />
              {{ setupRequired ? '创建管理员' : '登录' }}
            </UiButton>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter class="login-footer">
        <span>本地优先</span>
        <span>远程节点独立配置</span>
      </CardFooter>
    </Card>
  </div>
</template>

<script>
import { Gamepad2Icon, LockKeyholeIcon, UserIcon } from '@lucide/vue'
import { authAPI } from '@/api/v2'
import { Button as UiButton } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'vue-sonner'

export default {
  name: 'LoginView',
  components: {
    Checkbox,
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    Gamepad2Icon,
    LockKeyholeIcon,
    Spinner,
    UiButton,
    UserIcon
  },
  data() {
    return {
      loginForm: {
        username: '',
        password: '',
        remember: false
      },
      validationErrors: {
        username: '',
        password: ''
      },
      loading: false,
      setupRequired: false
    }
  },
  mounted() {
    this.loadSession()
  },
  methods: {
    async loadSession() {
      try {
        const session = await authAPI.session()
        this.setupRequired = session.setupRequired === true
      } catch (error) {
        if (this.$route.query.reason === 'backend-unavailable') {
          toast.error(error.message)
        }
      }
    },
    async handleLogin() {
      this.validationErrors.username = this.loginForm.username.trim() ? '' : '请输入用户名'
      this.validationErrors.password = this.loginForm.password
        ? (this.loginForm.password.length >= 6 ? '' : '密码长度不少于6位')
        : '请输入密码'
      if (this.validationErrors.username || this.validationErrors.password) return

      this.loading = true
      try {
        const action = this.setupRequired ? authAPI.setup : authAPI.login
        await action(this.loginForm.username, this.loginForm.password)
        await this.$router.push('/')
        toast.success(this.setupRequired ? '管理员创建成功' : '登录成功')
      } catch (error) {
        toast.error(error.message || '登录失败')
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.login-page {
  position: relative;
  display: grid;
  min-height: 100dvh;
  width: 100%;
  place-items: center;
  overflow: hidden;
  padding: 32px;
  background: var(--background);
}

.login-backdrop {
  position: absolute;
  inset: 0;
  background-image: url('/static/misc/worldgen_customization.webp');
  background-position: center;
  background-size: cover;
}

.login-backdrop::after {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--sidebar) 48%, transparent);
  content: '';
}

.login-card {
  position: relative;
  width: min(420px, 100%);
  border-color: color-mix(in srgb, var(--border) 75%, transparent);
  box-shadow: var(--shadow-overlay);
}

.login-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  color: var(--muted-foreground);
  font-size: 13px;
  font-weight: 600;
}

.login-title {
  font-size: 22px;
  font-weight: 700;
  line-height: 30px;
}

.login-mark {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  color: var(--sidebar-primary-foreground);
  background: var(--sidebar-primary);
  border-radius: var(--radius-md);
}

.login-mark svg {
  width: 18px;
  height: 18px;
}

.login-form {
  width: 100%;
}

.login-button {
  width: 100%;
}

.remember-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.login-footer {
  justify-content: space-between;
  color: var(--muted-foreground);
  font-size: 12px;
}

@media (max-width: 520px) {
  .login-page {
    align-items: end;
    padding: 16px;
  }

  .login-footer {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }
}
</style>
