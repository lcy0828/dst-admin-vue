<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>{{ $t('mods.addToRoom.title') }}</DialogTitle>
        <DialogDescription>
          {{ $t('mods.addToRoom.description', { name: mod?.name || mod?.id || '' }) }}
        </DialogDescription>
      </DialogHeader>

      <Alert v-if="loadError" variant="destructive">
        <TriangleAlert />
        <AlertTitle>{{ $t('mods.addToRoom.loadFailedTitle') }}</AlertTitle>
        <AlertDescription>{{ loadError }}</AlertDescription>
      </Alert>

      <FieldGroup>
        <Field :data-disabled="loadingRooms || undefined">
          <FieldLabel for="add-mod-room">{{ $t('mods.addToRoom.room') }}</FieldLabel>
          <UiSelect
            v-model="selectedRoomId"
            :disabled="loadingRooms || rooms.length === 0"
            @update:model-value="loadWorlds"
          >
            <SelectTrigger id="add-mod-room">
              <SelectValue :placeholder="$t(loadingRooms ? 'mods.addToRoom.loadingRooms' : 'mods.addToRoom.selectRoom')" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem v-for="room in rooms" :key="room.id" :value="room.id">
                  {{ room.name }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </UiSelect>
          <FieldDescription>{{ $t('mods.addToRoom.roomDescription') }}</FieldDescription>
        </Field>

        <Alert v-if="!loadingRooms && rooms.length === 0">
          <CircleAlert />
          <AlertTitle>{{ $t('mods.addToRoom.noRoomsTitle') }}</AlertTitle>
          <AlertDescription>{{ $t('mods.addToRoom.noRoomsDescription') }}</AlertDescription>
        </Alert>

        <FieldSet :data-disabled="loadingWorlds || !selectedRoomId || undefined">
          <FieldLegend variant="label">{{ $t('mods.addToRoom.worlds') }}</FieldLegend>
          <FieldDescription>{{ $t('mods.addToRoom.worldsDescription') }}</FieldDescription>
          <ScrollArea v-if="worlds.length" class="max-h-56 rounded-md border p-3">
            <FieldGroup class="gap-3">
              <Field v-for="world in worlds" :key="world.id" orientation="horizontal">
                <Checkbox
                  :id="`add-mod-world-${world.id}`"
                  :model-value="selectedWorldIds.includes(world.id)"
                  :disabled="loadingWorlds"
                  @update:model-value="toggleWorld(world.id, $event)"
                />
                <FieldLabel :for="`add-mod-world-${world.id}`" class="font-normal">
                  {{ world.name }}
                </FieldLabel>
              </Field>
            </FieldGroup>
          </ScrollArea>
          <FieldDescription v-else-if="selectedRoomId && !loadingWorlds">
            {{ $t('mods.addToRoom.noWorlds') }}
          </FieldDescription>
        </FieldSet>

        <FieldSet v-if="targetGroups.length">
          <FieldLegend variant="label">{{ $t('mods.addToRoom.targets') }}</FieldLegend>
          <FieldDescription>{{ $t('mods.addToRoom.targetsDescription') }}</FieldDescription>
          <div class="flex flex-col gap-2 rounded-md border p-3">
            <div v-for="group in targetGroups" :key="group.id" class="flex flex-wrap items-center justify-between gap-2">
              <Badge variant="outline">{{ group.name }}</Badge>
              <span class="text-sm text-muted-foreground">{{ group.worlds.map(world => world.name).join(', ') }}</span>
            </div>
          </div>
        </FieldSet>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>{{ $t('mods.addToRoom.enabled') }}</FieldTitle>
            <FieldDescription>{{ $t('mods.addToRoom.enabledDescription') }}</FieldDescription>
          </FieldContent>
          <UiSwitch v-model="enabled" :aria-label="$t('mods.addToRoom.enabled')" />
        </Field>

        <Field orientation="horizontal">
          <Checkbox id="add-mod-dependencies" v-model="includeDependencies" />
          <FieldContent>
            <FieldLabel for="add-mod-dependencies">{{ $t('mods.addToRoom.dependencies') }}</FieldLabel>
            <FieldDescription>{{ $t('mods.addToRoom.dependenciesDescription') }}</FieldDescription>
          </FieldContent>
        </Field>
      </FieldGroup>

      <Alert v-if="publicationPlan" :variant="publicationPlan.ready ? 'default' : 'destructive'">
        <CircleCheck v-if="publicationPlan.ready" />
        <TriangleAlert v-else />
        <AlertTitle>{{ $t(publicationPlan.ready ? 'mods.addToRoom.planReady' : 'mods.addToRoom.planBlocked') }}</AlertTitle>
        <AlertDescription>
          {{ $t('mods.publication.fields.topologyRevision') }}: {{ publicationPlan.topologyRevision || topologyRevision || '--' }}
        </AlertDescription>
      </Alert>

      <Alert v-for="(blocker, index) in publicationPlan?.blockers || []" :key="`${blocker.code || 'blocker'}:${index}`" variant="destructive">
        <TriangleAlert />
        <AlertTitle>{{ blocker.code || $t('mods.publication.blockers.unknown') }}</AlertTitle>
        <AlertDescription>{{ blocker.message || $t('mods.publication.blockers.unknown') }}</AlertDescription>
      </Alert>

      <DialogFooter>
        <UiButton variant="outline" :disabled="submitting" @click="emit('update:open', false)">
          {{ $t('mods.actions.cancel') }}
        </UiButton>
        <UiButton :disabled="!canSubmit" @click="submit">
          <Spinner v-if="submitting" data-icon="inline-start" />
          <Send v-else-if="publicationPlan" data-icon="inline-start" />
          <ScanSearch v-else data-icon="inline-start" />
          {{ $t(submitting ? 'mods.addToRoom.adding' : publicationPlan ? 'mods.publication.actions.publish' : 'mods.publication.actions.preview') }}
        </UiButton>
      </DialogFooter>
    </DialogContent>
  </UiDialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { CircleAlert, CircleCheck, ScanSearch, Send, TriangleAlert } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { modApi } from '@/api'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog as UiDialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle
} from '@/components/ui/field'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select as UiSelect,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Switch as UiSwitch } from '@/components/ui/switch'
import { createModFailure, formatModFailure } from '@/i18n/modMessages'
import { i18n } from '@/i18n'

const props = defineProps({
  open: { type: Boolean, default: false },
  mod: { type: Object, default: null }
})

const emit = defineEmits(['update:open', 'added'])

const rooms = ref([])
const worlds = ref([])
const selectedRoomId = ref('')
const selectedWorldIds = ref([])
const enabled = ref(true)
const includeDependencies = ref(true)
const loadingRooms = ref(false)
const loadingWorlds = ref(false)
const submitting = ref(false)
const loadFailure = ref(null)
const topologyRevision = ref('')
const publicationPlan = ref(null)

const translate = (...args) => i18n.global.t(...args)
const loadError = computed(() => formatModFailure(translate, loadFailure.value))
const canSubmit = computed(() => (
  Boolean(props.mod?.id) &&
  Boolean(selectedRoomId.value) &&
  selectedWorldIds.value.length > 0 &&
  !loadingRooms.value &&
  !loadingWorlds.value &&
  !submitting.value &&
  (!publicationPlan.value || publicationPlan.value.ready)
))
const targetGroups = computed(() => {
  const selected = new Set(selectedWorldIds.value)
  const grouped = new Map()
  for (const world of worlds.value.filter(item => selected.has(item.id))) {
    const id = world.appliedTargetId || 'unknown'
    if (!grouped.has(id)) {
      grouped.set(id, {
        id,
        name: world.appliedTargetName || translate('mods.addToRoom.unknownTarget'),
        worlds: []
      })
    }
    grouped.get(id).worlds.push(world)
  }
  return [...grouped.values()]
})

watch(() => props.open, open => {
  if (open) initialize()
})

async function initialize() {
  rooms.value = []
  worlds.value = []
  selectedRoomId.value = ''
  selectedWorldIds.value = []
  enabled.value = true
  includeDependencies.value = true
  topologyRevision.value = ''
  publicationPlan.value = null
  loadFailure.value = null
  loadingRooms.value = true
  try {
    rooms.value = await modApi.getManagedRooms()
    if (rooms.value.length === 1) {
      selectedRoomId.value = rooms.value[0].id
      await loadWorlds(selectedRoomId.value)
    }
  } catch (error) {
    loadFailure.value = createModFailure('mods.errors.context', error)
  } finally {
    loadingRooms.value = false
  }
}

async function loadWorlds(roomId) {
  worlds.value = []
  selectedWorldIds.value = []
  topologyRevision.value = ''
  publicationPlan.value = null
  loadFailure.value = null
  if (!roomId) return
  loadingWorlds.value = true
  try {
    const [roomWorlds, topology] = await Promise.all([
      modApi.getRoomWorlds(roomId),
      modApi.getRoomTopology(roomId).catch(() => null)
    ])
    worlds.value = roomWorlds
    topologyRevision.value = topology?.revision || topology?.topologyRevision || ''
    selectedWorldIds.value = worlds.value.map(world => world.id)
  } catch (error) {
    loadFailure.value = createModFailure('mods.errors.roomSwitch', error)
  } finally {
    loadingWorlds.value = false
  }
}

function toggleWorld(worldId, checked) {
  publicationPlan.value = null
  selectedWorldIds.value = checked
    ? [...new Set([...selectedWorldIds.value, worldId])]
    : selectedWorldIds.value.filter(id => id !== worldId)
}

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  const input = {
    roomId: selectedRoomId.value,
    action: 'add',
    modId: props.mod.id,
    worldIds: selectedWorldIds.value,
    enabled: enabled.value,
    includeDependencies: includeDependencies.value,
    ...(topologyRevision.value ? { expectedTopologyRevision: topologyRevision.value } : {})
  }
  try {
    if (!publicationPlan.value) {
      const response = await modApi.previewModPublication(input)
      publicationPlan.value = response?.plan || response
      toast.success(translate('mods.publication.feedback.previewReady'))
      return
    }

    const result = await modApi.createModPublication({
      ...input,
      planHash: publicationPlan.value.planHash,
      expectedTopologyRevision: publicationPlan.value.topologyRevision || topologyRevision.value,
      confirmation: publicationPlan.value.planHash
    })
    finishAdded(result)
  } catch (error) {
    toast.error(formatModFailure(translate, createModFailure('mods.errors.addToRoom', error)))
  } finally {
    submitting.value = false
  }
}

function finishAdded(result) {
  toast.success(translate('mods.addToRoom.added', { name: props.mod.name || props.mod.id }))
  emit('added', { result, roomId: selectedRoomId.value, worldIds: selectedWorldIds.value })
  emit('update:open', false)
}

watch([selectedRoomId, selectedWorldIds, enabled, includeDependencies], () => {
  publicationPlan.value = null
}, { deep: true })
</script>
