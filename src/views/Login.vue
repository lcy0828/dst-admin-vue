<template>
  <div class="login-container">
    <div class="login-form-wrapper">
      <div class="login-header">
        <h1>饥荒服务器管理系统</h1>
        <p>{{ setupRequired ? '首次使用，请创建管理员' : "Don't Starve Together 管理后台" }}</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <FieldGroup>
          <Field :data-invalid="Boolean(validationErrors.username)">
            <FieldLabel for="login-username" class="sr-only">用户名</FieldLabel>
            <InputGroup>
              <InputGroupAddon><UserIcon /></InputGroupAddon>
              <InputGroupInput
                id="login-username"
            v-model="loginForm.username"
                placeholder="用户名"
                autocomplete="username"
                :aria-invalid="Boolean(validationErrors.username)"
              />
            </InputGroup>
            <FieldError v-if="validationErrors.username">{{ validationErrors.username }}</FieldError>
          </Field>

          <Field :data-invalid="Boolean(validationErrors.password)">
            <FieldLabel for="login-password" class="sr-only">密码</FieldLabel>
            <InputGroup>
              <InputGroupAddon><LockKeyholeIcon /></InputGroupAddon>
              <InputGroupInput
                id="login-password"
            v-model="loginForm.password"
            type="password"
                placeholder="密码"
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

          <Field>
            <UiButton
              type="submit"
            class="login-button"
              :disabled="loading"
            >
              <Spinner v-if="loading" data-icon="inline-start" />
            {{ setupRequired ? '创建管理员' : '登录' }}
            </UiButton>
          </Field>
        </FieldGroup>
      </form>

      <div class="login-footer">
        <p>DST Admin · Don't Starve Together Server Console</p>
      </div>
    </div>

    <div class="login-background">
      <div class="login-illustration"></div>
    </div>
  </div>
</template>

<script>
import { LockKeyholeIcon, UserIcon } from '@lucide/vue'
import { authAPI } from '@/api/v2'
import { Button as UiButton } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'vue-sonner'

export default {
  name: 'LoginView',
  components: {
    Checkbox,
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
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
.login-container {
  display: flex;
  min-height: 100dvh;
  width: 100%;
  background-color: var(--bg-color);
}

.login-form-wrapper {
  width: 440px;
  padding: 48px;
  background-color: var(--surface-color);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.login-header {
  text-align: left;
  margin-bottom: 32px;
}

.login-header h1 {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 650;
  line-height: 32px;
  color: var(--text-primary);
}

.login-header p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.login-form {
  margin-bottom: 24px;
}

.login-button {
  width: 100%;
  border-radius: 4px;
}

.remember-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.login-footer {
  text-align: left;
  color: var(--text-secondary);
  font-size: 12px;
  margin-top: auto;
}

.login-background {
  flex: 1;
  background-color: var(--sidebar-color);
  position: relative;
  overflow: hidden;
}

.login-illustration {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background-image: url('/static/misc/worldgen_customization.webp');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0.74;
}

@media (max-width: 768px) {
  .login-container {
    flex-direction: column-reverse;
  }

  .login-form-wrapper {
    width: 100%;
    min-height: calc(100dvh - 132px);
    padding: 32px 20px;
  }

  .login-background {
    flex: 0 0 132px;
  }
}
</style>
