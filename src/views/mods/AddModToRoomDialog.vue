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

      <DialogFooter>
        <UiButton variant="outline" :disabled="submitting" @click="emit('update:open', false)">
          {{ $t('mods.actions.cancel') }}
        </UiButton>
        <UiButton :disabled="!canSubmit" @click="submit">
          <Spinner v-if="submitting" data-icon="inline-start" />
          <PackagePlus v-else data-icon="inline-start" />
          {{ $t(submitting ? 'mods.addToRoom.applying' : 'mods.addToRoom.apply') }}
        </UiButton>
      </DialogFooter>
    </DialogContent>
  </UiDialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { CircleAlert, PackagePlus, TriangleAlert } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { modApi } from '@/api'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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

const translate = (...args) => i18n.global.t(...args)
const loadError = computed(() => formatModFailure(translate, loadFailure.value))
const canSubmit = computed(() => (
  Boolean(props.mod?.id) &&
  Boolean(selectedRoomId.value) &&
  selectedWorldIds.value.length > 0 &&
  !loadingRooms.value &&
  !loadingWorlds.value &&
  !submitting.value
))

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
  loadFailure.value = null
  if (!roomId) return
  loadingWorlds.value = true
  try {
    worlds.value = await modApi.getRoomWorlds(roomId)
    selectedWorldIds.value = worlds.value.map(world => world.id)
  } catch (error) {
    loadFailure.value = createModFailure('mods.errors.roomSwitch', error)
  } finally {
    loadingWorlds.value = false
  }
}

function toggleWorld(worldId, checked) {
  selectedWorldIds.value = checked
    ? [...new Set([...selectedWorldIds.value, worldId])]
    : selectedWorldIds.value.filter(id => id !== worldId)
}

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    const result = await modApi.addModToRoom({
      roomId: selectedRoomId.value,
      id: props.mod.id,
      worldIds: selectedWorldIds.value,
      enabled: enabled.value,
      includeDependencies: includeDependencies.value
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
</script>
