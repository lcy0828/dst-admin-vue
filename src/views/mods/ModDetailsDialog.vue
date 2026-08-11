<template>
  <UiDialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-4xl">
      <DialogHeader>
        <DialogTitle>{{ $t('mods.workshop.detailsTitle') }}</DialogTitle>
        <DialogDescription class="flex items-center gap-2">
          <Spinner v-if="loading" />
          <span>{{ $t('mods.workshop.detailsDescription') }}</span>
        </DialogDescription>
      </DialogHeader>

      <template v-if="mod">
        <div class="mod-heading">
          <div class="mod-preview">
            <ImageIcon />
            <img v-if="mod.image" :src="mod.image" :alt="mod.name" @error="hideImage" />
          </div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="truncate" :title="mod.name">
                {{ mod.name || `Workshop ${mod.id}` }}
              </h3>
              <Badge v-if="mod.version" variant="secondary">v{{ mod.version }}</Badge>
              <Badge v-if="downloaded">{{ $t('mods.values.downloaded') }}</Badge>
            </div>
            <p class="text-muted-foreground mt-1 text-sm">{{ mod.author || $t('mods.values.unknownAuthor') }} · {{ mod.id }}</p>
          </div>
        </div>

        <dl class="metadata-grid">
          <div>
            <dt>{{ $t('mods.workshop.rating') }}</dt>
            <dd><Star />{{ ratingLabel }}</dd>
          </div>
          <div>
            <dt>{{ $t('mods.workshop.subscriptions') }}</dt>
            <dd><Users />{{ formatNumber(mod.subscriptions) }}</dd>
          </div>
          <div>
            <dt>{{ $t('mods.workshop.favorites') }}</dt>
            <dd><Heart />{{ formatNumber(mod.favorites) }}</dd>
          </div>
          <div>
            <dt>{{ $t('mods.workshop.views') }}</dt>
            <dd><Eye />{{ formatNumber(mod.views) }}</dd>
          </div>
          <div>
            <dt>{{ $t('mods.workshop.fileSize') }}</dt>
            <dd><HardDrive />{{ formatFileSize(mod.fileSize) }}</dd>
          </div>
          <div>
            <dt>{{ $t('mods.workshop.publishedAt') }}</dt>
            <dd><CalendarDays />{{ formatDate(mod.createdAt) }}</dd>
          </div>
          <div>
            <dt>{{ $t('mods.workshop.updatedAt') }}</dt>
            <dd><Clock3 />{{ formatDate(mod.updatedAt) }}</dd>
          </div>
          <div>
            <dt>{{ $t('mods.workshop.version') }}</dt>
            <dd><Tag />{{ mod.version || '--' }}</dd>
          </div>
        </dl>

        <div v-if="displayTags.length" class="flex flex-col gap-2">
          <h4>{{ $t('mods.workshop.tags') }}</h4>
          <div class="flex flex-wrap gap-2">
            <Badge v-for="tag in displayTags" :key="tag" variant="outline">{{ tagLabel(tag) }}</Badge>
          </div>
        </div>

        <Separator />

        <div class="flex flex-col gap-2">
          <h4>{{ $t('mods.workshop.description') }}</h4>
          <p class="mod-description">
            {{ mod.description || $t('mods.workshop.noDescription') }}
          </p>
        </div>

        <DialogFooter class="flex-wrap sm:justify-between">
          <div class="flex flex-wrap gap-2">
            <UiButton variant="outline" as-child>
              <a :href="mod.workshopUrl" target="_blank" rel="noopener noreferrer">
                <ExternalLink data-icon="inline-start" />
                {{ $t('mods.workshop.steamPage') }}
              </a>
            </UiButton>
            <UiButton variant="outline" as-child>
              <a :href="mod.changelogUrl" target="_blank" rel="noopener noreferrer">
                <FileText data-icon="inline-start" />
                {{ $t('mods.workshop.changelog') }}
              </a>
            </UiButton>
          </div>
          <slot name="actions" :mod="mod">
            <div v-if="actions" class="flex flex-wrap gap-2">
              <UiButton :disabled="busy" @click="$emit('download', mod)">
                <Spinner v-if="busy" data-icon="inline-start" />
                <RefreshCw v-else-if="downloaded" data-icon="inline-start" />
                <Download v-else data-icon="inline-start" />
                {{ $t(downloaded ? 'mods.actions.updateMod' : 'mods.actions.downloadMod') }}
              </UiButton>
              <UiButton v-if="downloaded" :disabled="busy" @click="$emit('add-to-room', mod)">
                <PackagePlus data-icon="inline-start" />
                {{ $t('mods.actions.addToRoom') }}
              </UiButton>
            </div>
          </slot>
        </DialogFooter>
      </template>
    </DialogContent>
  </UiDialog>
</template>

<script setup>
import { computed } from 'vue'
import { CalendarDays, Clock3, Download, ExternalLink, Eye, FileText, HardDrive, Heart, ImageIcon, PackagePlus, RefreshCw, Star, Tag, Users } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { formatModDate } from '@/i18n/modMessages'
import { i18n } from '@/i18n'

const props = defineProps({
  open: { type: Boolean, default: false },
  mod: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  actions: { type: Boolean, default: true }
})

defineEmits(['update:open', 'download', 'add-to-room'])

const categoryKeys = Object.freeze({
  character: 'character',
  item: 'item',
  pet: 'pet',
  creature: 'creature',
  environment: 'environment',
  interface: 'interface',
  utility: 'utility',
  art: 'art',
  worldgen: 'worldgen',
  tweak: 'tweak',
  scenario: 'scenario',
  language: 'language',
  other: 'other',
  tutorial: 'tutorial',
  client_only_mod: 'clientOnly',
  server_only_mod: 'serverOnly',
  all_clients_require_mod: 'allClientsRequire',
  server_admin: 'serverAdmin'
})

const downloaded = computed(() => Boolean(props.mod?.downloaded || props.mod?.isDownloaded))
const displayTags = computed(() => (props.mod?.tags || []).filter(tag => !String(tag).toLowerCase().startsWith('version:')))
const ratingLabel = computed(() => {
  if (props.mod?.rating === null || props.mod?.rating === undefined) return i18n.global.t('mods.workshop.noRatings')
  const score = Number(props.mod.rating)
  const stars = score <= 1 ? score * 5 : score
  const count = Number(props.mod.ratingCount) || 0
  const label = `${stars.toFixed(1)} / 5`
  return count ? `${label} · ${i18n.global.t('mods.workshop.ratingCount', { count: formatNumber(count) })}` : label
})

function formatNumber(value) {
  const number = Number(value) || 0
  const locale = i18n.global.locale.value === 'en-US' ? 'en-US' : 'zh-CN'
  return new Intl.NumberFormat(locale).format(number)
}

function formatFileSize(value) {
  let bytes = Number(value) || 0
  if (!bytes) return '--'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let index = 0
  while (bytes >= 1024 && index < units.length - 1) {
    bytes /= 1024
    index += 1
  }
  return `${bytes.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function formatDate(value) {
  return formatModDate(value, i18n.global.locale)
}

function tagLabel(value) {
  const normalized = String(value).trim().toLowerCase()
  const key = categoryKeys[normalized]
  return key ? i18n.global.t(`mods.workshop.categories.${key}`) : value
}

function hideImage(event) {
  event.currentTarget.hidden = true
}
</script>

<style scoped>
.mod-heading {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  align-items: center;
  gap: 16px;
}

.mod-heading h3,
.mod-description {
  margin: 0;
}

h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.mod-heading h3 {
  font-size: 18px;
  font-weight: 600;
  line-height: 28px;
}

.mod-preview {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--muted);
  color: var(--muted-foreground);
}

.mod-preview > svg {
  width: 24px;
  height: 24px;
}

.mod-preview img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  margin: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--border);
}

.metadata-grid > div {
  min-width: 0;
  padding: 12px;
  background: var(--background);
}

.metadata-grid dt {
  color: var(--muted-foreground);
  font-size: 12px;
}

.metadata-grid dd {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  margin: 4px 0 0;
  font-weight: 500;
}

.metadata-grid dd svg {
  width: 14px;
  height: 14px;
  flex: none;
}

.mod-description {
  max-height: 320px;
  overflow-y: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--muted-foreground);
  line-height: 1.7;
}

@media (max-width: 760px) {
  .metadata-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .mod-heading {
    grid-template-columns: 64px minmax(0, 1fr);
  }

  .metadata-grid {
    grid-template-columns: 1fr;
  }
}
</style>
