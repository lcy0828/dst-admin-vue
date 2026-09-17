<script setup>
import { computed, inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, ChevronDown, House, Search } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'
import { managementScopeTargetId } from '@/lib/managementScope.mjs'
import { rememberRoomSelection } from '@/lib/workspacePreferences.mjs'

const props = defineProps({
  rooms: { type: Array, default: () => [] },
  modelValue: { type: [String, Number], default: '' },
  valueKey: { type: String, default: 'id' },
  loading: Boolean,
  disabled: Boolean,
  allowAll: Boolean
})
const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()
const headerTarget = inject('room-scope-target', null)
const target = computed(() => headerTarget?.value)
const open = ref(false)
const search = ref('')
const selected = computed(() => props.rooms.find(room => [room[props.valueKey], room.id, room.name].some(value => String(value) === String(props.modelValue))))
const label = computed(() => selected.value?.name || t(props.loading ? 'roomScope.loading' : props.allowAll && !props.modelValue ? 'roomScope.all' : props.rooms.length ? 'roomScope.choose' : 'roomScope.empty'))
const visibleRooms = computed(() => props.rooms.filter(room => String(room.name).toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase())))

function select(value) {
  open.value = false
  if (String(value) !== String(props.modelValue || '')) emit('update:modelValue', value)
}

// Remember accepted page state, so a canceled configuration switch is not saved.
watch(() => [props.modelValue, selected.value?.id, props.loading, target.value], () => {
  if (!target.value || props.loading || !props.rooms.length) return
  if (selected.value) rememberRoomSelection(managementScopeTargetId(), String(selected.value.id))
  else if (props.allowAll && !props.modelValue) rememberRoomSelection(managementScopeTargetId(), '')
}, { immediate: true, flush: 'post' })
watch(open, () => { search.value = '' })
</script>

<template>
  <Teleport :to="target || 'body'" :disabled="!target">
    <Popover v-model:open="open">
      <PopoverTrigger as-child>
        <Button variant="outline" size="sm" class="w-36 shrink-0 justify-between sm:w-44 2xl:w-52" :disabled="disabled || loading" :aria-label="t('roomScope.current', { name: label })" :title="t('roomScope.current', { name: label })">
          <Spinner v-if="loading" data-icon="inline-start" /><House v-else data-icon="inline-start" />
          <span class="min-w-0 flex-1 truncate text-left">{{ label }}</span><ChevronDown data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" :side-offset="8" class="w-[min(22rem,calc(100vw-2rem))] gap-3 p-3">
        <PopoverHeader><PopoverTitle>{{ t('roomScope.choose') }}</PopoverTitle></PopoverHeader>
        <InputGroup v-if="rooms.length > 8"><InputGroupAddon><Search /></InputGroupAddon><InputGroupInput v-model="search" :aria-label="t('roomScope.search')" :placeholder="t('roomScope.search')" /></InputGroup>
        <ScrollArea class="[&_[data-slot=scroll-area-viewport]]:max-h-[min(22rem,calc(100dvh-14rem))]">
          <div class="flex flex-col gap-1">
            <Button v-if="allowAll" :variant="!modelValue ? 'secondary' : 'ghost'" class="w-full justify-start" :aria-pressed="!modelValue" @click="select('')"><Check v-if="!modelValue" data-icon="inline-start" /><House v-else data-icon="inline-start" />{{ t('roomScope.all') }}</Button>
            <Button v-for="room in visibleRooms" :key="room.id" :variant="room === selected ? 'secondary' : 'ghost'" class="h-auto w-full justify-start py-2 text-left" :aria-pressed="room === selected" @click="select(String(room[valueKey]))">
              <Check v-if="room === selected" data-icon="inline-start" /><House v-else data-icon="inline-start" />
              <span class="min-w-0 flex-1 truncate" :title="room.name">{{ room.name }}</span>
              <span v-if="room.isRunning || room.status === 'running' || room.worlds?.some(world => world.status === 'running')" class="text-xs font-normal text-muted-foreground">{{ t('roomScope.running') }}</span>
              <span v-else-if="room.status === 'stopped' || (room.worlds?.length && room.worlds.every(world => world.status === 'stopped'))" class="text-xs font-normal text-muted-foreground">{{ t('roomScope.stopped') }}</span>
            </Button>
            <p v-if="!visibleRooms.length" class="px-2 py-4 text-sm text-muted-foreground">{{ t(rooms.length ? 'roomScope.noMatches' : 'roomScope.empty') }}</p>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  </Teleport>
</template>
