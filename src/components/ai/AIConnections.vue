<script setup>
import { computed, defineAsyncComponent, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { aiV2API, roomsV2API } from '@/api/v2'
import { confirmAction } from '@/lib/feedback'
import { aiLimitValue, aiLimitsInput, aiSettingsForm, aiTokenInput } from '@/lib/aiSettings.mjs'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Copy, KeyRound, PlugZap } from '@lucide/vue'

const props = defineProps({ config: { type: Object, required: true }, mcpPath: { type: String, default: '/mcp' } })
const NotificationChannelsPanel = defineAsyncComponent(() => import('@/components/settings/NotificationChannelsPanel.vue'))
const notificationsOpen = ref(false)
const notificationFeed = computed(() => new URL('/api/v2/system/notifications/events', window.location.origin).href)
const emit = defineEmits(['saved', 'error'])
const { t, locale } = useI18n()
const form = reactive(aiSettingsForm(props.config))
watch(() => props.config, value => Object.assign(form, aiSettingsForm(value)))
const limitFields = ['maxRounds', 'maxToolCalls', 'timeoutSeconds']
const saving = ref(false), testing = ref(false), creating = ref(false), revoking = ref('')
const tokens = ref([]), secret = ref(''), secretOpen = ref(false)
const credential = reactive({ name: '', days: 30, profile: 'game-read', roomIds: [] })
const rooms = ref([]), roomsLoading = ref(false), roomsError = ref(false)
const profiles = ['game-read', 'game-manage', 'panel-manage']
const tokenInput = computed(() => aiTokenInput(credential))
function chooseRoom(id, checked) { credential.roomIds = checked ? [...new Set([...credential.roomIds, id])] : credential.roomIds.filter(value => value !== id) }
async function loadRooms() { roomsLoading.value = true; roomsError.value = false; try { rooms.value = (await roomsV2API.controlPlaneList({ all: true })).items || [] } catch (error) { roomsError.value = true; fail(error) } finally { roomsLoading.value = false } }
const endpoint = computed(() => new URL(props.mcpPath, window.location.origin).href)
const sample = computed(() => JSON.stringify({ mcpServers: { 'dst-admin': { type: 'http', url: endpoint.value, headers: { Authorization: 'Bearer <ACCESS_TOKEN>' } } } }, null, 2))
function fail(error) { emit('error', error.message || t('ai.failure')) }
async function save() {
  const limits = aiLimitsInput(form.limits)
  if (!limits) { fail(new Error(t('ai.invalidLimits'))); return }
  saving.value = true
  try { const value = await aiV2API.save({ ...form, limits }); form.apiKey = ''; form.clearKey = false; emit('saved', value); toast.success(t('ai.saved')) } catch (error) { fail(error) } finally { saving.value = false }
}
async function test() {
  testing.value = true
  try { await aiV2API.test(); toast.success(t('ai.tested')) } catch (error) { fail(error) } finally { testing.value = false }
}
async function loadTokens() { try { tokens.value = (await aiV2API.tokens()).items || [] } catch (error) { fail(error) } }
async function create() {
  if (!tokenInput.value) { fail(new Error(t('ai.scopeInvalid'))); return }
  creating.value = true
  try {
    const result = await aiV2API.createToken(tokenInput.value)
    secret.value = result.secret; secretOpen.value = true; credential.name = ''; await loadTokens()
  } catch (error) { fail(error) } finally { creating.value = false }
}
async function revoke(token) {
  try { await confirmAction(t('ai.revokeQuestion', { name: token.name }), { title: t('ai.revoke'), confirmButtonText: t('ai.revoke'), type: 'warning' }) } catch { return }
  revoking.value = token.id
  try { await aiV2API.revoke(token.id); await loadTokens(); toast.success(t('ai.revoked')) } catch (error) { fail(error) } finally { revoking.value = '' }
}
async function copy(value) {
  try { await navigator.clipboard.writeText(value); toast.success(t('ai.copied')) } catch { toast.error(t('ai.copyManually')) }
}
onMounted(() => { loadTokens(); loadRooms() })
</script>

<template>
  <div class="grid min-w-0 items-start gap-5 xl:grid-cols-2">
    <Card>
      <CardHeader><CardTitle>{{ t('ai.settings') }}</CardTitle><CardDescription>{{ t('ai.endpointHint') }}</CardDescription></CardHeader>
      <form @submit.prevent="save">
        <CardContent>
          <FieldGroup>
            <Field orientation="horizontal"><Switch id="ai-enabled" v-model="form.enabled" :disabled="saving" /><FieldLabel for="ai-enabled">{{ t('ai.enabled') }}</FieldLabel></Field>
            <Field><FieldLabel for="ai-endpoint">{{ t('ai.endpoint') }}</FieldLabel><Input id="ai-endpoint" v-model="form.endpoint" type="url" maxlength="2048" placeholder="https://api.example.com/v1" :disabled="saving" /></Field>
            <Field><FieldLabel for="ai-model">{{ t('ai.model') }}</FieldLabel><Input id="ai-model" v-model="form.model" maxlength="200" :disabled="saving" /></Field>
            <Field><FieldLabel for="ai-key">{{ t('ai.key') }}</FieldLabel><Input id="ai-key" v-model="form.apiKey" type="password" autocomplete="new-password" maxlength="2048" :placeholder="config.keyConfigured ? t('ai.keySaved') : ''" :disabled="saving" /></Field>
            <Field v-if="config.keyConfigured" orientation="horizontal"><Checkbox id="ai-clear-key" v-model="form.clearKey" :disabled="saving" /><FieldLabel for="ai-clear-key">{{ t('ai.clearKey') }}</FieldLabel></Field>
            <FieldSet>
              <FieldLegend>{{ t('ai.limitsTitle') }}</FieldLegend>
              <FieldDescription>{{ t('ai.limitsHint') }}</FieldDescription>
              <FieldGroup class="grid gap-4 sm:grid-cols-3">
                <Field v-for="key in limitFields" :key="key" :data-invalid="aiLimitValue(key, form.limits[key]) == null">
                  <FieldLabel :for="`ai-limit-${key}`">{{ t(`ai.limits.${key}`) }}</FieldLabel>
                  <Input :id="`ai-limit-${key}`" v-model="form.limits[key]" type="number" min="0" step="1" required :disabled="saving" :aria-invalid="aiLimitValue(key, form.limits[key]) == null" />
                  <FieldError v-if="aiLimitValue(key, form.limits[key]) == null">{{ t('ai.invalidLimits') }}</FieldError>
                </Field>
              </FieldGroup>
              <Button type="button" variant="ghost" size="sm" class="self-start" :disabled="saving" @click="form.limits = aiSettingsForm().limits">{{ t('ai.resetLimits') }}</Button>
            </FieldSet>
          </FieldGroup>
        </CardContent>
        <CardFooter class="mt-6 flex flex-wrap gap-2"><Button type="submit" :disabled="saving || testing"><Spinner v-if="saving" data-icon="inline-start" />{{ t('ai.save') }}</Button><Button type="button" variant="outline" :disabled="saving || testing || !config.endpoint || !config.model" @click="test"><Spinner v-if="testing" data-icon="inline-start" /><PlugZap v-else data-icon="inline-start" />{{ t('ai.test') }}</Button><p class="w-full text-xs text-muted-foreground">{{ t('ai.testSaved') }}</p></CardFooter>
      </form>
    </Card>
    <Card>
      <CardHeader><CardTitle>{{ t('ai.mcp') }}</CardTitle><CardDescription>{{ t('ai.mcpDescription') }}</CardDescription></CardHeader>
      <CardContent class="flex min-w-0 flex-col gap-5">
        <FieldGroup>
          <Field><FieldLabel for="ai-mcp-address">{{ t('ai.address') }}</FieldLabel><Input id="ai-mcp-address" :model-value="endpoint" readonly @focus="$event.target.select()" /><FieldDescription>{{ t('ai.authorization') }} · Authorization: Bearer &lt;ACCESS_TOKEN&gt;</FieldDescription></Field>
        </FieldGroup>
        <details><summary class="cursor-pointer text-sm">{{ t('ai.clientExample') }}</summary><pre class="mt-2 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap break-all">{{ sample }}</pre><p class="mt-2 text-xs text-muted-foreground">{{ t('ai.clientHint') }}</p></details>
        <form class="flex flex-col gap-5" @submit.prevent="create">
          <FieldGroup>
            <Field><FieldLabel for="ai-token-name">{{ t('ai.tokenName') }}</FieldLabel><Input id="ai-token-name" v-model="credential.name" required maxlength="100" :disabled="creating" /></Field>
            <Field>
              <FieldLabel id="ai-token-profile-label">{{ t('ai.tokenProfile') }}</FieldLabel>
              <ToggleGroup v-model="credential.profile" type="single" variant="outline" :spacing="1" :disabled="creating" aria-labelledby="ai-token-profile-label" class="max-w-full flex-wrap">
                <ToggleGroupItem v-for="profile in profiles" :key="profile" :value="profile">{{ t(`ai.profiles.${profile}`) }}</ToggleGroupItem>
              </ToggleGroup>
              <FieldDescription>{{ t(`ai.profileHints.${credential.profile || 'game-read'}`) }}</FieldDescription>
            </Field>
            <FieldSet :data-invalid="credential.profile !== 'panel-manage' && !credential.roomIds.length">
              <FieldLegend>{{ t('ai.allowedRooms') }}</FieldLegend>
              <FieldDescription>{{ credential.profile === 'panel-manage' ? t('ai.allRoomsIfEmpty') : t('ai.chooseRooms') }}</FieldDescription>
              <Spinner v-if="roomsLoading" :aria-label="t('ai.reading', { tool: t('ai.room') })" />
              <Button v-else-if="roomsError" type="button" variant="outline" size="sm" class="self-start" @click="loadRooms">{{ t('ai.retry') }}</Button>
              <FieldGroup v-else class="max-h-48 overflow-auto">
                <Field v-for="room in rooms" :key="room.id" orientation="horizontal">
                  <Checkbox :id="`ai-token-room-${room.id}`" :model-value="credential.roomIds.includes(room.id)" :disabled="creating" @update:model-value="checked => chooseRoom(room.id, checked === true)" />
                  <FieldLabel :for="`ai-token-room-${room.id}`">{{ room.name }}</FieldLabel>
                </Field>
              </FieldGroup>
              <FieldError v-if="!roomsLoading && !roomsError && credential.profile !== 'panel-manage' && !credential.roomIds.length">{{ t('ai.chooseRooms') }}</FieldError>
            </FieldSet>
            <Field><FieldLabel for="ai-token-days">{{ t('ai.tokenDays') }}</FieldLabel><Input id="ai-token-days" v-model="credential.days" type="number" min="1" max="365" required :disabled="creating" /></Field>
          </FieldGroup>
          <Button type="submit" :disabled="creating || !config.enabled || !tokenInput" class="self-start"><Spinner v-if="creating" data-icon="inline-start" /><KeyRound v-else data-icon="inline-start" />{{ t('ai.createToken') }}</Button>
        </form>
      </CardContent>
      <CardFooter class="flex flex-col items-stretch gap-3">
        <h3 class="text-sm font-medium">{{ t('ai.credentials') }}</h3><p v-if="!tokens.length" class="text-sm text-muted-foreground">{{ t('ai.noTokens') }}</p>
        <div v-for="token in tokens" :key="token.id" class="flex flex-wrap items-center gap-2 rounded-md border p-3">
          <div class="min-w-0 flex-1"><p class="break-words font-medium">{{ token.name }}</p><Badge variant="secondary">{{ t(`ai.profiles.${token.profile || 'panel-manage'}`) }}</Badge><p class="text-xs text-muted-foreground">{{ token.roomIds?.length ? token.roomIds.map(id => rooms.find(room => room.id === id)?.name || id).join('、') : t('ai.allRooms') }}</p><p class="text-xs text-muted-foreground">{{ t('ai.expires') }} {{ new Date(token.expiresAt).toLocaleString(locale) }}</p></div>
          <Button variant="outline" size="sm" :disabled="!!revoking" @click="revoke(token)">{{ t('ai.revoke') }}</Button>
        </div>
      </CardFooter>
    </Card>
    <Card class="min-w-0 xl:col-span-2">
      <CardHeader><CardTitle>{{ t('ai.notifications.title') }}</CardTitle><CardDescription>{{ t('ai.notifications.description') }}</CardDescription></CardHeader>
      <CardContent class="flex min-w-0 flex-col gap-4">
        <p class="text-sm text-muted-foreground">{{ t('ai.notifications.webhook') }}</p>
        <details @toggle="notificationsOpen = $event.target.open"><summary class="cursor-pointer text-sm font-medium">{{ t('ai.notifications.configure') }}</summary><div class="mt-4"><NotificationChannelsPanel v-if="notificationsOpen" /></div></details>
        <details><summary class="cursor-pointer text-sm font-medium">{{ t('ai.notifications.mcp') }}</summary>
          <p class="mt-3 text-sm text-muted-foreground">{{ t('ai.notifications.mcpHelp') }}</p>
          <Field class="mt-3"><FieldLabel for="ai-notification-feed">{{ t('ai.notifications.feed') }}</FieldLabel><div class="flex min-w-0 gap-2"><Input id="ai-notification-feed" :model-value="notificationFeed" readonly @focus="$event.target.select()" /><Button variant="outline" size="icon" :aria-label="t('ai.copy')" @click="copy(notificationFeed)"><Copy /></Button></div></Field>
          <p class="mt-3 rounded-md bg-muted p-3 text-sm whitespace-pre-wrap break-words">{{ t('ai.notifications.example') }}</p>
        </details>
      </CardContent>
    </Card>
    <Dialog v-model:open="secretOpen" @update:open="value => { if (!value) secret = '' }">
      <DialogContent><DialogHeader><DialogTitle>{{ t('ai.token') }}</DialogTitle><DialogDescription>{{ t('ai.oneTime') }}</DialogDescription></DialogHeader><Input :model-value="secret" readonly :aria-label="t('ai.token')" @focus="$event.target.select()" /><DialogFooter><Button variant="outline" @click="copy(secret)"><Copy data-icon="inline-start" />{{ t('ai.copy') }}</Button><Button @click="secretOpen = false; secret = ''">{{ t('ai.dismiss') }}</Button></DialogFooter></DialogContent>
    </Dialog>
  </div>
</template>
