<template>
  <div class="page-container">
    <header class="page-heading">
      <div>
        <h1>{{ $t('mods.management.title') }}</h1>
        <p>{{ $t('mods.management.subtitle') }}</p>
      </div>
    </header>

    <Tabs :model-value="activeTab" @update:model-value="setActiveTab">
      <TabsList>
        <TabsTrigger value="library">
          <Search data-icon="inline-start" />
          {{ $t('mods.management.tabs.library') }}
        </TabsTrigger>
        <TabsTrigger value="room">
          <SlidersHorizontal data-icon="inline-start" />
          {{ $t('mods.management.tabs.room') }}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="library" class="tab-content">
        <div class="scope-toolbar">
          <div>
            <h2>{{ $t('mods.management.library.title') }}</h2>
            <p>{{ $t('mods.management.library.description') }}</p>
          </div>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            :model-value="libraryScope"
            @update:model-value="setLibraryScope"
          >
            <ToggleGroupItem value="workshop">{{ $t('mods.management.scopes.workshop') }}</ToggleGroupItem>
            <ToggleGroupItem value="downloaded">{{ $t('mods.management.scopes.downloaded') }}</ToggleGroupItem>
            <ToggleGroupItem value="updates">{{ $t('mods.management.scopes.updates') }}</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <ModSearch v-if="libraryScope === 'workshop'" embedded />
        <ModLibrary
          v-else
          :key="libraryScope"
          embedded
          :initial-status="libraryScope"
          @browse-workshop="setLibraryScope('workshop')"
        />
      </TabsContent>

      <TabsContent value="room" class="tab-content">
        <ModList embedded @browse-workshop="openWorkshop" />
      </TabsContent>
    </Tabs>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, SlidersHorizontal } from '@lucide/vue'
import ModLibrary from './ModLibrary.vue'
import ModList from './ModList.vue'
import ModSearch from './ModSearch.vue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const route = useRoute()
const router = useRouter()

const activeTab = computed(() => route.query.tab === 'room' ? 'room' : 'library')
const libraryScope = computed(() => {
  const scope = String(route.query.scope || '')
  return ['workshop', 'downloaded', 'updates'].includes(scope) ? scope : 'workshop'
})

function replaceQuery(patch) {
  router.replace({
    path: '/mods',
    query: { ...route.query, ...patch }
  })
}

function setActiveTab(value) {
  if (!value) return
  replaceQuery({ tab: value === 'room' ? 'room' : undefined })
}

function setLibraryScope(value) {
  if (!value) return
  replaceQuery({ tab: undefined, scope: value === 'workshop' ? undefined : value })
}

function openWorkshop() {
  setLibraryScope('workshop')
}
</script>

<style scoped>
.page-container,
.tab-content {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.page-container {
  width: 100%;
  gap: 20px;
}

.page-heading h1,
.scope-toolbar h2,
.page-heading p,
.scope-toolbar p {
  margin: 0;
}

.page-heading h1 {
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;
}

.page-heading p,
.scope-toolbar p {
  color: var(--muted-foreground);
  font-size: 14px;
}

.page-heading p {
  margin-top: 4px;
}

.tab-content {
  gap: 20px;
  margin-top: 20px;
}

.scope-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.scope-toolbar h2 {
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}

@media (max-width: 760px) {
  .scope-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
