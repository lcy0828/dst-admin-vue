<template>
  <div :class="cn('w-full min-w-0', props.class)">
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <UiButton
        type="button"
        variant="outline"
        class="w-full min-w-0 justify-between"
        role="combobox"
        :aria-expanded="open"
        :aria-label="label"
        :disabled="disabled"
      >
        <span class="min-w-0 truncate">{{ selectedTarget?.name || placeholder }}</span>
        <ChevronsUpDown data-icon="inline-end" />
      </UiButton>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-80 p-2">
      <PopoverHeader class="sr-only">
        <PopoverTitle>{{ label }}</PopoverTitle>
        <PopoverDescription>{{ description }}</PopoverDescription>
      </PopoverHeader>
      <InputGroup>
        <InputGroupAddon><Search /></InputGroupAddon>
        <InputGroupInput v-model="search" :placeholder="searchPlaceholder" autocomplete="off" />
      </InputGroup>
      <ScrollArea class="mt-2 h-64">
        <div v-if="filteredTargets.length" class="flex flex-col gap-1 pr-3">
          <UiButton
            v-for="target in filteredTargets"
            :key="target.id"
            type="button"
            variant="ghost"
            class="h-auto w-full min-w-0 justify-start px-2 py-2 text-left"
            @click="selectTarget(target.id)"
          >
            <Check v-if="target.id === modelValue" data-icon="inline-start" />
            <Server v-else data-icon="inline-start" />
            <span class="flex min-w-0 flex-1 flex-col items-start gap-1">
              <span class="w-full truncate font-medium">{{ target.name || target.id }}</span>
              <span class="flex w-full flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span>{{ capacityLabel(target) }}</span>
                <Badge :variant="target.online ? 'success' : 'destructive'">
                  {{ target.online ? onlineLabel : offlineLabel }}
                </Badge>
              </span>
            </span>
          </UiButton>
        </div>
        <div v-else class="px-3 py-8 text-center text-sm text-muted-foreground">{{ emptyLabel }}</div>
      </ScrollArea>
    </PopoverContent>
  </Popover>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Check, ChevronsUpDown, Search, Server } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

const props = defineProps({
  modelValue: { type: String, default: '' },
  targets: { type: Array, default: () => [] },
  label: { type: String, required: true },
  description: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  searchPlaceholder: { type: String, default: '' },
  emptyLabel: { type: String, default: '' },
  onlineLabel: { type: String, default: '' },
  offlineLabel: { type: String, default: '' },
  capacityTemplate: { type: String, default: '{projected} / {limit}' },
  capacityUnknown: { type: String, default: '--' },
  disabled: { type: Boolean, default: false },
  class: { type: [String, Object, Array], default: undefined }
})

const emit = defineEmits(['update:modelValue'])
const open = ref(false)
const search = ref('')

const selectedTarget = computed(() => props.targets.find(target => String(target.id) === props.modelValue) || null)
const filteredTargets = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase()
  const values = [...props.targets].sort((left, right) => {
    if (left.id === props.modelValue) return -1
    if (right.id === props.modelValue) return 1
    if (left.online !== right.online) return left.online ? -1 : 1
    return String(left.name || left.id).localeCompare(String(right.name || right.id))
  })
  if (!keyword) return values
  return values.filter(target => [target.name, target.hostname, target.id]
    .filter(Boolean)
    .some(value => String(value).toLocaleLowerCase().includes(keyword)))
})

watch(open, value => {
  if (!value) search.value = ''
})

function selectTarget(targetId) {
  emit('update:modelValue', String(targetId))
  open.value = false
}

function capacityLabel(target) {
  const projected = target.projectedShards ?? target.projectedCapacity?.runningShards ?? 0
  const limit = target.projectedCapacity?.recommendedShardLimit || 0
  if (!limit) return props.capacityUnknown
  return props.capacityTemplate
    .replace('{projected}', String(projected))
    .replace('{limit}', String(limit))
}
</script>
