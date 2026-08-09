<template>
  <div class="login-page">
    <div class="login-backdrop" aria-hidden="true"></div>
    <Card class="login-card">
      <CardHeader>
        <div class="login-brand-row">
          <div class="login-brand">
            <span class="login-mark" aria-hidden="true"><Gamepad2Icon /></span>
            <span>DST Admin</span>
          </div>
          <UiSelect :model-value="$i18n.locale" @update:model-value="switchLanguage">
            <SelectTrigger size="sm" class="login-language" :aria-label="$t('settings.language.label')">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="zh-CN">{{ $t('settings.language.zhCN') }}</SelectItem>
                <SelectItem value="en-US">{{ $t('settings.language.enUS') }}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </UiSelect>
        </div>
        <CardTitle class="login-title">{{ $t('login.title') }}</CardTitle>
        <CardDescription>
          {{ setupRequired ? $t('login.setupDescription') : $t('login.description') }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form class="login-form" @submit.prevent="handleLogin">
          <FieldGroup>
            <Field :data-invalid="Boolean(validationErrors.username)">
              <FieldLabel for="login-username">{{ $t('login.username') }}</FieldLabel>
              <InputGroup>
                <InputGroupAddon><UserIcon /></InputGroupAddon>
                <InputGroupInput
                  id="login-username"
                  v-model="loginForm.username"
                  :placeholder="$t('login.usernamePlaceholder')"
                  autocomplete="username"
                  :aria-invalid="Boolean(validationErrors.username)"
                />
              </InputGroup>
              <FieldError v-if="validationErrors.username">{{ validationErrors.username }}</FieldError>
            </Field>

            <Field :data-invalid="Boolean(validationErrors.password)">
              <FieldLabel for="login-password">{{ $t('login.password') }}</FieldLabel>
              <InputGroup>
                <InputGroupAddon><LockKeyholeIcon /></InputGroupAddon>
                <InputGroupInput
                  id="login-password"
                  v-model="loginForm.password"
                  type="password"
                  :placeholder="$t('login.passwordPlaceholder')"
                  autocomplete="current-password"
                  :aria-invalid="Boolean(validationErrors.password)"
                />
              </InputGroup>
              <FieldError v-if="validationErrors.password">{{ validationErrors.password }}</FieldError>
            </Field>

            <Field orientation="horizontal">
              <div class="remember-field">
                <Checkbox id="remember-login" v-model="loginForm.remember" />
                <FieldLabel for="remember-login">{{ $t('login.remember') }}</FieldLabel>
              </div>
              <FieldDescription v-if="setupRequired">{{ $t('login.passwordHint') }}</FieldDescription>
            </Field>

            <UiButton type="submit" class="login-button" :disabled="loading">
              <Spinner v-if="loading" data-icon="inline-start" />
              {{ setupRequired ? $t('login.createAdministrator') : $t('login.submit') }}
            </UiButton>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter class="login-footer">
        <span>{{ $t('login.localFirst') }}</span>
        <span>{{ $t('login.remoteSeparate') }}</span>
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
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { previewSystemLanguage } from '@/utils/systemPreferences'
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
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Spinner,
    UiButton,
    UiSelect,
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
    switchLanguage(locale) {
      previewSystemLanguage(locale)
    },
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
      this.validationErrors.username = this.loginForm.username.trim() ? '' : this.$t('login.validation.usernameRequired')
      this.validationErrors.password = this.loginForm.password
        ? (this.loginForm.password.length >= 6 ? '' : this.$t('login.validation.passwordTooShort'))
        : this.$t('login.validation.passwordRequired')
      if (this.validationErrors.username || this.validationErrors.password) return

      this.loading = true
      try {
        const action = this.setupRequired ? authAPI.setup : authAPI.login
        await action(this.loginForm.username, this.loginForm.password)
        const redirect = this.$route.query.redirect
        const target = typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
          ? redirect
          : '/dashboard'
        await this.$router.push(target)
        toast.success(this.setupRequired ? this.$t('login.feedback.setupSucceeded') : this.$t('login.feedback.loginSucceeded'))
      } catch (error) {
        toast.error(error.message || this.$t('login.feedback.loginFailed'))
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
  color: var(--muted-foreground);
  font-size: 13px;
  font-weight: 600;
}

.login-brand-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.login-language {
  width: 128px;
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
