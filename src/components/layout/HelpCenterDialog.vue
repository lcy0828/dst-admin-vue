<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { CircleHelp, Copy, Search } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { navigationForFeatures } from '@/v2/navigation'
import { REQUEST_ERROR_EVENT, recentRequestErrors } from '@/lib/requestErrors.mjs'
import { readWorkspaceSelection } from '@/lib/workspacePreferences.mjs'
import { managementScopeTargetId } from '@/lib/managementScope.mjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
const props = defineProps({ features: { type: Object, default: () => ({}) } })
const { t, locale } = useI18n()
const router = useRouter()
const open = ref(false), query = ref(''), errors = ref([])
const guides = [ ['firstGame', '/setup'], ['connection', '/rooms/settings'], ['mods', '/mods'], ['backups', '/backups'], ['updates', '/servers/releases'] ]
const entries = computed(() => navigationForFeatures(props.features).flatMap(section => section.items.flatMap(item => item.children || [item])))
const matches = computed(() => {
  const term = query.value.trim().toLocaleLowerCase()
  if (!term) return []
  const aliases = { '/rooms/settings': '密码 名称 凭证 token password name', '/servers/releases': '更新 游戏 install update', '/backups': '存档 恢复 backup restore', '/mods': '模组 mod', '/players/list': '背包 玩家 inventory player', '/logs/service': '报错 异常 error' }
  const candidates = [...entries.value, { labelKey: 'novice.basic', to: '/rooms/settings' }]
  return candidates.filter(item => `${t(item.labelKey)} ${aliases[item.to] || ''}`.toLocaleLowerCase().includes(term)).slice(0, 12)
})
function refreshErrors() { errors.value = recentRequestErrors() }
function navigate(path) {
  open.value = false
  const roomId = readWorkspaceSelection(managementScopeTargetId()).roomId
  router.push({ path, query: roomId && !['/setup', '/servers/releases', '/system/settings'].includes(path) ? path === '/rooms/settings' ? { id: roomId } : { roomId } : {} })
}
async function copy(item) {
  try { await navigator.clipboard.writeText(item.report); toast.success(t('novice.copied')) }
  catch { toast.error(t('novice.copyFailed')) }
}
onMounted(() => { refreshErrors(); window.addEventListener(REQUEST_ERROR_EVENT, refreshErrors) })
onBeforeUnmount(() => window.removeEventListener(REQUEST_ERROR_EVENT, refreshErrors))
</script>
<template>
  <Button variant="ghost" size="icon-sm" :aria-label="t('novice.help')" :title="t('novice.help')" @click="open = true"><CircleHelp /></Button>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>{{ t('novice.help') }}</DialogTitle><DialogDescription>{{ t('novice.helpHint') }}</DialogDescription></DialogHeader>
      <FieldGroup><Field><FieldLabel for="help-search" class="flex items-center gap-2"><Search />{{ t('novice.guides') }}</FieldLabel><Input id="help-search" v-model="query" :placeholder="t('novice.search')" /></Field></FieldGroup>
      <div v-if="query.trim()" class="flex flex-col gap-2"><Button v-for="item in matches" :key="item.to" variant="outline" class="justify-start" @click="navigate(item.to)">{{ t(item.labelKey) }}</Button><p v-if="!matches.length" class="text-sm text-muted-foreground">{{ t('novice.noMatch') }}</p></div>
      <div v-else class="flex flex-col gap-3"><details v-for="[key, path] in guides" :key="key" class="rounded-md border p-3"><summary class="cursor-pointer font-medium">{{ t(`novice.${key}`) }}</summary><p class="pt-2 text-sm text-muted-foreground">{{ t(`novice.${key}Help`) }}</p><Button variant="link" class="px-0" @click="navigate(path)">{{ t('novice.go') }}</Button></details></div>
      <section class="flex flex-col gap-2"><h3 class="font-medium">{{ t('novice.errors') }}</h3><p class="text-xs text-muted-foreground">{{ t('novice.errorHint') }}</p><p v-if="!errors.length" class="text-sm text-muted-foreground">{{ t('novice.noErrors') }}</p><details v-for="(item, index) in errors" :key="index" class="min-w-0 rounded-md border p-3"><summary class="cursor-pointer break-words text-sm">{{ new Date(item.at).toLocaleTimeString(locale) }} · {{ item.message }}</summary><pre class="max-h-48 overflow-auto py-2 text-xs whitespace-pre-wrap break-all">{{ item.report }}</pre><Button size="sm" variant="outline" @click="copy(item)"><Copy data-icon="inline-start" />{{ t('novice.copy') }}</Button></details></section>
    </DialogContent>
  </Dialog>
</template>
