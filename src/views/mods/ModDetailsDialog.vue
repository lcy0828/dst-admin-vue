<template>
  <UiDialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="mod-details-dialog sm:max-w-5xl" :aria-busy="loading">
      <DialogHeader class="details-dialog-header">
        <DialogTitle class="details-dialog-title">{{ mod?.name || $t('mods.workshop.detailsTitle') }}</DialogTitle>
        <DialogDescription class="details-dialog-description">
          <Spinner v-if="loading" />
          <span>{{ $t('mods.workshop.detailsDescription') }}</span>
        </DialogDescription>
      </DialogHeader>

      <ScrollArea v-if="mod" class="details-scroll-area">
        <div class="details-content">
          <div class="mod-identity">
            <div class="mod-preview">
              <ImageIcon />
              <img v-if="mod.image" :src="mod.image" :alt="mod.name" @error="hideImage" />
            </div>
            <div class="mod-identity-content">
              <div class="identity-badges">
                <Badge v-if="downloaded">{{ $t('mods.values.downloaded') }}</Badge>
                <Badge v-if="updateAvailable" variant="destructive">{{ $t('mods.values.health.updateAvailable') }}</Badge>
                <Badge v-if="mod.version" variant="secondary">v{{ mod.version }}</Badge>
              </div>
              <dl class="identity-list">
                <div>
                  <dt>{{ $t('mods.workshop.author') }}</dt>
                  <dd>{{ mod.author || $t('mods.values.unknownAuthor') }}</dd>
                </div>
                <div>
                  <dt>{{ $t('mods.workshop.workshopId') }}</dt>
                  <dd><code>{{ mod.id }}</code></dd>
                </div>
              </dl>
            </div>
          </div>

          <Separator />

          <section class="details-section" aria-labelledby="mod-workshop-summary">
            <h3 id="mod-workshop-summary">{{ $t('mods.workshop.summary') }}</h3>
            <dl class="metadata-grid metadata-grid--primary">
              <div>
                <dt>{{ $t('mods.workshop.rating') }}</dt>
                <dd><Star />{{ ratingLabel }}</dd>
              </div>
              <div>
                <dt>{{ $t('mods.workshop.subscriptions') }}</dt>
                <dd><Users />{{ formatNumber(mod.subscriptions) }}</dd>
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
          </section>

          <section class="details-section" aria-labelledby="mod-file-activity">
            <h3 id="mod-file-activity">{{ $t('mods.workshop.fileAndActivity') }}</h3>
            <dl class="metadata-grid">
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
            </dl>
          </section>

          <section v-if="displayTags.length" class="details-section" aria-labelledby="mod-category-tags">
            <h3 id="mod-category-tags">{{ $t('mods.workshop.tags') }}</h3>
            <div class="tag-list">
              <Badge v-for="tag in displayTags" :key="tag" variant="outline">{{ tagLabel(tag) }}</Badge>
            </div>
          </section>

          <Separator />

          <section class="details-section" aria-labelledby="mod-workshop-description">
            <h3 id="mod-workshop-description">{{ $t('mods.workshop.description') }}</h3>
            <p class="mod-description">{{ formattedDescription }}</p>
          </section>
        </div>
      </ScrollArea>

      <div v-else class="details-loading"><Spinner />{{ $t('mods.workshop.loadingDetails') }}</div>

      <DialogFooter v-if="mod" class="details-dialog-footer">
        <div class="footer-links">
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
          <div v-if="actions" class="footer-actions">
            <UiButton v-if="downloaded && !updateAvailable" variant="outline" :disabled="busy" @click="$emit('refresh', mod)">
              <Spinner v-if="busy" data-icon="inline-start" />
              <RefreshCw v-else data-icon="inline-start" />
              {{ $t(busy ? 'mods.actions.refreshing' : 'mods.actions.refresh') }}
            </UiButton>
            <UiButton v-else :disabled="busy" @click="$emit('download', mod)">
              <Spinner v-if="busy" data-icon="inline-start" />
              <CircleArrowUp v-else-if="updateAvailable" data-icon="inline-start" />
              <Download v-else data-icon="inline-start" />
              {{ $t(updateAvailable ? 'mods.actions.updateMod' : 'mods.actions.downloadMod') }}
            </UiButton>
            <UiButton v-if="downloaded" :disabled="busy" @click="$emit('add-to-room', mod)">
              <PackagePlus data-icon="inline-start" />
              {{ $t('mods.actions.addToRoom') }}
            </UiButton>
          </div>
        </slot>
      </DialogFooter>
    </DialogContent>
  </UiDialog>
</template>

<script setup>
import { computed } from 'vue'
import { CalendarDays, CircleArrowUp, Clock3, Download, ExternalLink, Eye, FileText, HardDrive, Heart, ImageIcon, PackagePlus, RefreshCw, Star, Tag, Users } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
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

defineEmits(['update:open', 'download', 'refresh', 'add-to-room'])

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
const updateAvailable = computed(() => Boolean(props.mod?.updateAvailable))
const displayTags = computed(() => (props.mod?.tags || []).filter(tag => !String(tag).toLowerCase().startsWith('version:')))
const formattedDescription = computed(() => formatWorkshopDescription(props.mod && props.mod.description) || i18n.global.t('mods.workshop.noDescription'))
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

function formatWorkshopDescription(value) {
  if (!value) return ''
  return String(value)
    .replace(/\[h[1-6]\](.*?)\[\/h[1-6]\]/gis, '\n$1\n')
    .replace(/\[url=([^\]]+)\](.*?)\[\/url\]/gis, '$2 ($1)')
    .replace(/\[url\](.*?)\[\/url\]/gis, '$1')
    .replace(/\[img\](.*?)\[\/img\]/gis, '$1')
    .replace(/\[\*\]/g, '\n- ')
    .replace(/\[\/?(?:b|i|u|s|strike|spoiler|code|quote|list|olist|table|tr|td|th)(?:=[^\]]+)?\]/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function hideImage(event) {
  event.currentTarget.hidden = true
}
</script>

<style scoped>
.mod-details-dialog {
  display: grid;
  max-height: min(92vh, 920px);
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
}

.details-dialog-header {
  min-width: 0;
  padding-right: 32px;
}

.details-dialog-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.details-dialog-description,
.details-loading,
.identity-badges,
.tag-list,
.footer-links,
.footer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.details-scroll-area {
  min-height: 260px;
}

.details-content {
  display: flex;
  padding-right: 12px;
  flex-direction: column;
  gap: 20px;
}

.details-loading {
  min-height: 260px;
  justify-content: center;
  color: var(--muted-foreground);
}

.mod-identity {
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  align-items: center;
  gap: 16px;
}

.mod-identity-content,
.details-section {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
}

.details-section h3,
.mod-description {
  margin: 0;
}

.details-section h3 {
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}

.identity-badges,
.tag-list,
.footer-links,
.footer-actions {
  flex-wrap: wrap;
}

.identity-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 24px;
  margin: 0;
}

.identity-list div {
  min-width: 0;
}

.identity-list dt,
.metadata-grid dt {
  color: var(--muted-foreground);
  font-size: 12px;
}

.identity-list dd {
  min-width: 0;
  margin: 4px 0 0;
  overflow-wrap: anywhere;
  font-weight: 500;
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

.metadata-grid dd {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
  margin: 4px 0 0;
  overflow-wrap: anywhere;
  font-weight: 500;
}

.metadata-grid--primary dd {
  font-size: 15px;
}

.metadata-grid dd svg {
  width: 14px;
  height: 14px;
  margin-top: 2px;
  flex: none;
}

.mod-description {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--muted-foreground);
  line-height: 1.7;
}

.details-dialog-footer {
  flex-wrap: wrap;
  padding-top: 4px;
}

@media (min-width: 640px) {
  .details-dialog-footer {
    justify-content: space-between;
  }
}

@media (max-width: 760px) {
  .metadata-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .mod-identity {
    grid-template-columns: 64px minmax(0, 1fr);
  }

  .identity-list,
  .metadata-grid {
    grid-template-columns: 1fr;
  }
}
</style>
