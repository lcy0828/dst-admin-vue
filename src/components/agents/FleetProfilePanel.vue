<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CircleAlert,
  KeyRound,
  MonitorCog,
  Network,
  RefreshCw,
  Save,
  ServerCog,
  Unplug
} from '@lucide/vue'
import { toast } from 'vue-sonner'
import { systemV2API } from '@/api/v2'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { FLEET_ROLES, fleetFlagsForRole, fleetRoleFromFlags } from '@/lib/fleetProfile.mjs'

const APPLY_CONFIRMATION = 'APPLY SYSTEM SETTINGS'
const ROLE_FIELD_IDS = [
  'fleet.localExecutorEnabled',
  'fleet.controllerEnabled',
  'fleet.memberEnabled'
]

const { t } = useI18n()
const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const settingsResponse = ref(null)
const capabilities = ref(null)
const selectedRole = ref(FLEET_ROLES.STANDALONE)
const controllerUrl = ref('')
const memberKey = ref('')
const formErrors = ref({})

const roleOptions = computed(() => [
  { value: FLEET_ROLES.STANDALONE, icon: MonitorCog },
  { value: FLEET_ROLES.CONTROLLER_WORKER, icon: Network },
  { value: FLEET_ROLES.MANAGED_WORKER, icon: Unplug },
  { value: FLEET_ROLES.CONTROLLER_ONLY, icon: ServerCog }
])

const fieldMap = computed(() => Object.fromEntries(
  (settingsResponse.value?.fields || []).map(field => [field.id, field])
))
const deployment = computed(() => capabilities.value?.deployment || {})
const packaging = computed(() => deployment.value.packaging || fieldMap.value['deployment.packaging']?.value || 'native')
const actualRole = computed(() => deployment.value.role || FLEET_ROLES.STANDALONE)
const profileSupported = computed(() => ROLE_FIELD_IDS.every(id => Boolean(fieldMap.value[id])))
const roleLocked = computed(() => ROLE_FIELD_IDS.some(id => fieldMap.value[id]?.editable === false))
const controllerUrlLocked = computed(() => fieldMap.value['fleet.controllerUrl']?.editable === false)
const memberKeyField = computed(() => fieldMap.value['fleet.memberKey'] || {})
const memberKeyConfigured = computed(() => Boolean(memberKeyField.value.configured || deployment.value.memberKeyConfigured))
const memberKeyLocked = computed(() => memberKeyField.value.editable === false)
const managedWorkerSelected = computed(() => selectedRole.value === FLEET_ROLES.MANAGED_WORKER)
const pendingRestart = computed(() => Boolean(settingsResponse.value?.restartRequired))

function booleanField(id, fallback) {
  const value = fieldMap.value[id]?.value
  if (value === undefined || value === '') return fallback
  return value === 'true'
}

function populateForm() {
  selectedRole.value = fleetRoleFromFlags({
    localExecutorEnabled: booleanField('fleet.localExecutorEnabled', true),
    controllerEnabled: booleanField('fleet.controllerEnabled', true),
    memberEnabled: booleanField('fleet.memberEnabled', false)
  })
  controllerUrl.value = fieldMap.value['fleet.controllerUrl']?.value || deployment.value.controllerUrl || ''
  memberKey.value = ''
  formErrors.value = {}
}

async function loadProfile() {
  loading.value = true
  loadError.value = ''
  try {
    const [nextCapabilities, nextSettings] = await Promise.all([
      systemV2API.capabilities(),
      systemV2API.settings()
    ])
    capabilities.value = nextCapabilities
    settingsResponse.value = nextSettings
    populateForm()
  } catch (error) {
    loadError.value = error?.message || t('common.errors.unknown')
  } finally {
    loading.value = false
  }
}

function validateForm() {
  const errors = {}
  if (managedWorkerSelected.value) {
    if (!controllerUrl.value.trim()) errors.controllerUrl = t('agents.profile.validation.controllerUrlRequired')
    if (!memberKeyConfigured.value && !memberKey.value.trim()) {
      errors.memberKey = t('agents.profile.validation.memberKeyRequired')
    }
  }
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

function editableValue(values, id, value) {
  if (fieldMap.value[id]?.editable !== false) values[id] = String(value)
}

function selectRole(role) {
  if (role) selectedRole.value = role
}

async function saveProfile() {
  if (!profileSupported.value || roleLocked.value || !validateForm()) return
  saving.value = true
  try {
    const flags = fleetFlagsForRole(selectedRole.value)
    const values = {}
    editableValue(values, 'fleet.localExecutorEnabled', flags.localExecutorEnabled)
    editableValue(values, 'fleet.controllerEnabled', flags.controllerEnabled)
    editableValue(values, 'fleet.memberEnabled', flags.memberEnabled)
    if (managedWorkerSelected.value) {
      editableValue(values, 'fleet.controllerUrl', controllerUrl.value.trim())
      if (memberKey.value.trim()) editableValue(values, 'fleet.memberKey', memberKey.value.trim())
    }
    const input = {
      revision: settingsResponse.value.revision,
      values,
      clearSecrets: []
    }
    const preview = await systemV2API.previewSettings(input)
    if (!preview.valid) {
      const messages = preview.issues
        .filter(issue => issue.severity === 'error')
        .map(issue => issue.message)
      throw new Error(messages.join('; ') || t('agents.profile.feedback.invalid'))
    }
    if (preview.changes.length === 0) {
      toast.info(t('agents.profile.feedback.unchanged'))
      return
    }
    const result = await systemV2API.applySettings({
      ...input,
      confirmation: APPLY_CONFIRMATION
    })
    settingsResponse.value = result.settings
    populateForm()
    toast.success(t('agents.profile.feedback.saved'))
  } catch (error) {
    toast.error(error?.message || t('agents.profile.feedback.saveFailed'))
  } finally {
    saving.value = false
  }
}

function roleLabel(role) {
  const key = Object.values(FLEET_ROLES).includes(role) ? role : FLEET_ROLES.STANDALONE
  return t(`agents.profile.roles.${key}.label`)
}

function packagingLabel(value) {
  const known = ['native', 'all_in_one', 'container', 'control_plane']
  return t(`agents.profile.packaging.${known.includes(value) ? value : 'native'}`)
}

onMounted(loadProfile)
</script>

<template>
  <Card size="sm">
    <CardHeader>
      <div class="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <CardTitle>{{ t('agents.profile.title') }}</CardTitle>
          <CardDescription>{{ t('agents.profile.description') }}</CardDescription>
        </div>
        <div class="flex flex-wrap gap-2">
          <Badge variant="outline">{{ packagingLabel(packaging) }}</Badge>
          <Badge variant="secondary">{{ roleLabel(actualRole) }}</Badge>
          <Badge v-if="deployment.memberEnabled" :variant="deployment.memberConnected ? 'secondary' : 'destructive'">
            {{ t(deployment.memberConnected ? 'agents.profile.connection.connected' : 'agents.profile.connection.disconnected') }}
          </Badge>
        </div>
      </div>
    </CardHeader>

    <CardContent class="flex flex-col gap-4">
      <div v-if="loading" class="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        {{ t('agents.profile.loading') }}
      </div>

      <Alert v-else-if="loadError" variant="destructive">
        <CircleAlert />
        <AlertTitle>{{ t('agents.profile.feedback.loadFailed') }}</AlertTitle>
        <AlertDescription>{{ loadError }}</AlertDescription>
      </Alert>

      <Alert v-else-if="!profileSupported" variant="destructive">
        <CircleAlert />
        <AlertTitle>{{ t('agents.profile.unsupported.title') }}</AlertTitle>
        <AlertDescription>{{ t('agents.profile.unsupported.description') }}</AlertDescription>
      </Alert>

      <template v-else>
        <Alert v-if="roleLocked">
          <KeyRound />
          <AlertTitle>{{ t('agents.profile.environmentManaged.title') }}</AlertTitle>
          <AlertDescription>{{ t('agents.profile.environmentManaged.description') }}</AlertDescription>
        </Alert>

        <Alert v-if="pendingRestart">
          <RefreshCw />
          <AlertTitle>{{ t('agents.profile.restart.title') }}</AlertTitle>
          <AlertDescription>{{ t('agents.profile.restart.description') }}</AlertDescription>
        </Alert>

        <FieldGroup>
          <Field :data-disabled="roleLocked">
            <FieldContent>
              <FieldTitle id="fleet-role-label">{{ t('agents.profile.roleLabel') }}</FieldTitle>
              <FieldDescription>{{ t('agents.profile.roleDescription') }}</FieldDescription>
            </FieldContent>
            <ToggleGroup
              :model-value="selectedRole"
              type="single"
              class="grid w-full gap-2 md:grid-cols-2 xl:grid-cols-4"
              aria-labelledby="fleet-role-label"
              :disabled="roleLocked"
              @update:model-value="selectRole"
            >
              <ToggleGroupItem
                v-for="option in roleOptions"
                :key="option.value"
                :value="option.value"
                class="h-auto min-w-0 items-start justify-start whitespace-normal px-3 py-3 text-left"
              >
                <component :is="option.icon" />
                <span class="flex min-w-0 flex-col gap-1">
                  <span class="font-medium">{{ t(`agents.profile.roles.${option.value}.label`) }}</span>
                  <span class="text-xs text-muted-foreground">{{ t(`agents.profile.roles.${option.value}.description`) }}</span>
                </span>
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>

          <template v-if="managedWorkerSelected">
            <Field :data-invalid="Boolean(formErrors.controllerUrl)" :data-disabled="controllerUrlLocked">
              <FieldLabel for="fleet-controller-url">{{ t('agents.profile.controllerUrl.label') }}</FieldLabel>
              <Input
                id="fleet-controller-url"
                v-model="controllerUrl"
                :disabled="controllerUrlLocked"
                :aria-invalid="Boolean(formErrors.controllerUrl)"
                placeholder="wss://controller.example.com/agent"
                autocomplete="url"
                @input="formErrors.controllerUrl = ''"
              />
              <FieldDescription>{{ t('agents.profile.controllerUrl.description') }}</FieldDescription>
              <FieldError v-if="formErrors.controllerUrl">{{ formErrors.controllerUrl }}</FieldError>
            </Field>

            <Field :data-invalid="Boolean(formErrors.memberKey)" :data-disabled="memberKeyLocked">
              <FieldLabel for="fleet-member-key">{{ t('agents.profile.memberKey.label') }}</FieldLabel>
              <Input
                id="fleet-member-key"
                v-model="memberKey"
                type="password"
                :disabled="memberKeyLocked"
                :aria-invalid="Boolean(formErrors.memberKey)"
                :placeholder="t(memberKeyConfigured ? 'agents.profile.memberKey.configuredPlaceholder' : 'agents.profile.memberKey.placeholder')"
                autocomplete="new-password"
                @input="formErrors.memberKey = ''"
              />
              <FieldDescription>{{ t('agents.profile.memberKey.description') }}</FieldDescription>
              <FieldError v-if="formErrors.memberKey">{{ formErrors.memberKey }}</FieldError>
            </Field>
          </template>
        </FieldGroup>
      </template>
    </CardContent>

    <CardFooter v-if="!loading && !loadError && profileSupported" class="flex flex-wrap justify-between gap-2">
      <p class="text-xs text-muted-foreground">{{ t('agents.profile.saveHint') }}</p>
      <div class="flex gap-2">
        <Button variant="outline" :disabled="saving" @click="loadProfile">
          <RefreshCw data-icon="inline-start" />
          {{ t('common.actions.reset') }}
        </Button>
        <Button :disabled="saving || roleLocked" @click="saveProfile">
          <Spinner v-if="saving" data-icon="inline-start" />
          <Save v-else data-icon="inline-start" />
          {{ t('agents.profile.actions.save') }}
        </Button>
      </div>
    </CardFooter>
  </Card>
</template>
