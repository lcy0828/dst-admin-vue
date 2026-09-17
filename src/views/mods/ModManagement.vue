<template>
  <div class="page-container">
    <header class="page-heading">
      <div>
        <h1>{{ $t('mods.management.title') }}</h1>
      </div>
    </header>

    <Tabs :model-value="activeTab" @update:model-value="setActiveTab">
      <TabsList class="scope-tabs">
        <TabsTrigger value="workshop">
          <Search data-icon="inline-start" />
          {{ $t('mods.management.tabs.workshop') }}
        </TabsTrigger>
        <TabsTrigger value="catalog">
          <Monitor data-icon="inline-start" />
          {{ $t('mods.management.tabs.catalog') }}
        </TabsTrigger>
        <TabsTrigger value="room">
          <SlidersHorizontal data-icon="inline-start" />
          {{ $t('mods.management.tabs.room') }}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="workshop" class="tab-content">
        <ModSearch embedded />
      </TabsContent>

      <TabsContent value="catalog" class="tab-content">
        <RuntimeModInventory />
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
import { Monitor, Search, SlidersHorizontal } from '@lucide/vue'
import ModList from './ModList.vue'
import ModSearch from './ModSearch.vue'
import RuntimeModInventory from './RuntimeModInventory.vue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const route = useRoute()
const router = useRouter()

const activeTab = computed(() => {
  if (route.query.tab === 'room') return 'room'
  if (route.query.tab === 'catalog' || route.query.source === 'runtime' || ['downloaded', 'updates'].includes(String(route.query.scope || ''))) return 'catalog'
  return 'workshop'
})

function replaceQuery(patch) {
  router.replace({
    path: '/mods',
    query: { ...route.query, ...patch }
  })
}

function setActiveTab(value) {
  if (!value) return
  replaceQuery({
    tab: value === 'workshop' ? undefined : value,
    source: undefined,
    scope: undefined
  })
}

function openWorkshop() {
  setActiveTab('workshop')
}
</script>

<style scoped>
.page-container,
.tab-content {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.scope-tabs {
  display: grid;
  width: min(100%, 560px);
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.page-container {
  width: 100%;
  gap: 20px;
}

.page-heading h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;
}

.tab-content {
  gap: 20px;
  margin-top: 20px;
}

</style>
