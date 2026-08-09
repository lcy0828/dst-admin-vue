<template>
  <section class="room-categories" aria-labelledby="room-category-title">
    <header class="categories-header">
      <div>
        <h2 id="room-category-title">{{ $t('worlds.categories.title') }}</h2>
        <p>{{ $t('worlds.categories.description') }}</p>
      </div>
      <UiButton variant="ghost" size="sm" :disabled="isRefreshing" @click="refreshCategories">
        <Spinner v-if="isRefreshing" data-icon="inline-start" />
        <RefreshCwIcon v-else data-icon="inline-start" />
        {{ $t('common.actions.refresh') }}
      </UiButton>
    </header>

    <ToggleGroup
      :model-value="activeCategory"
      type="single"
      orientation="vertical"
      variant="outline"
      class="category-list"
      @update:model-value="handleCategorySelect"
    >
      <ToggleGroupItem v-for="category in categories" :key="category.value" :value="category.value">
        <component :is="category.icon" />
        <span>{{ category.label }}</span>
        <Badge variant="secondary">{{ getCountByCategory(category.value) }}</Badge>
      </ToggleGroupItem>
    </ToggleGroup>
  </section>
</template>

<script>
import {
  LayoutGridIcon,
  MoonIcon,
  NetworkIcon,
  PauseIcon,
  PlayIcon,
  RefreshCwIcon,
  SunIcon
} from '@lucide/vue';
import { markRaw } from 'vue';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export default {
  name: 'RoomCategories',
  components: { Badge, RefreshCwIcon, Spinner, ToggleGroup, ToggleGroupItem, UiButton },
  props: {
    rooms: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      activeCategory: 'all',
      isRefreshing: false,
      lastRefreshTime: 0
    };
  },
  computed: {
    categories() {
      const icons = {
        all: markRaw(LayoutGridIcon),
        active: markRaw(PlayIcon),
        inactive: markRaw(PauseIcon),
        forest: markRaw(SunIcon),
        cave: markRaw(MoonIcon),
        both: markRaw(NetworkIcon)
      };
      return Object.entries(icons).map(([value, icon]) => ({
        value,
        icon,
        label: this.$t(`worlds.categories.filters.${value}`)
      }));
    }
  },
  methods: {
    handleCategorySelect(category) {
      if (!category) return;
      this.activeCategory = category;
      this.$emit('category-change', category);
    },
    refreshCategories() {
      const now = Date.now();
      if (this.isRefreshing || now - this.lastRefreshTime < 2000) return;

      this.isRefreshing = true;
      this.lastRefreshTime = now;
      this.$emit('refresh');
      window.setTimeout(() => {
        this.isRefreshing = false;
      }, 2000);
    },
    getCountByCategory(category) {
      if (category === 'active') return this.rooms.filter(room => room.status === 'running').length;
      if (category === 'inactive') return this.rooms.filter(room => room.status === 'stopped').length;
      if (category === 'forest') {
        return this.rooms.filter(room => this.hasWorldType(room, 'forest') && !this.hasWorldType(room, 'cave')).length;
      }
      if (category === 'cave') {
        return this.rooms.filter(room => this.hasWorldType(room, 'cave') && !this.hasWorldType(room, 'forest')).length;
      }
      if (category === 'both') {
        return this.rooms.filter(room => this.hasWorldType(room, 'forest') && this.hasWorldType(room, 'cave')).length;
      }
      return this.rooms.length;
    },
    hasWorldType(room, type) {
      return Array.isArray(room.worlds) && room.worlds.some(world => world.type === type);
    }
  }
};
</script>

<style scoped>
.room-categories {
  width: 100%;
  min-width: 0;
}

.categories-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.categories-header h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.categories-header p {
  margin: 3px 0 0;
  color: var(--muted-foreground);
  font-size: 12px;
}

.category-list {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 6px;
}

.category-list > * {
  width: 100%;
  min-width: 0;
  justify-content: flex-start;
}

.category-list span {
  min-width: 0;
  flex: 1;
  text-align: left;
}
</style>
