<template>
  <div class="settings-wrapper">
    <div class="search-box">
      <InputGroup>
        <InputGroupAddon><SearchIcon /></InputGroupAddon>
        <InputGroupInput
        placeholder="搜索设置项..."
        :model-value="searchText"
        @update:model-value="$emit('search-input', $event)"
        />
      </InputGroup>
    </div>
    
    <div v-if="showGroup">
      <div 
        v-for="(group, groupKey) in filteredSettings" 
        :key="groupKey"
      >
        <div 
          v-for="category in getSortedCategories(group)" 
          :key="category.key" 
          class="settings-category"
        >
          <div class="category-header">
            <h4>{{ category.value.text }}</h4>
          </div>
          
          <div class="settings-grid">
            <setting-item
              v-for="(item, itemKey) in category.value.items" 
              :key="itemKey"
              :item="item"
              :item-key="itemKey"
              :category="category.value"
              :world-type="worldType"
              :is-changed="isItemChanged(item, itemKey)"
              v-show="matchesSearch(item.text)"
              @setting-change="handleSettingChange"
            />
          </div>
        </div>
      </div>
    </div>
    
    <Tabs v-else :default-value="Object.keys(settings)[0]" class="settings-tabs">
      <TabsList>
        <TabsTrigger v-for="(group, groupKey) in settings" :key="groupKey" :value="groupKey">
          {{ groupKey === 'WORLDGEN_GROUP' ? '世界生成组' : '世界设置组' }}
        </TabsTrigger>
      </TabsList>
      <TabsContent v-for="(group, groupKey) in settings" :key="groupKey" :value="groupKey">
        <div 
          v-for="category in getSortedCategories(group)" 
          :key="category.key" 
          class="settings-category"
        >
          <div class="category-header">
            <h4>{{ category.value.text }}</h4>
          </div>
          
          <div class="settings-grid">
            <setting-item
              v-for="(item, itemKey) in category.value.items" 
              :key="itemKey"
              :item="item"
              :item-key="itemKey"
              :category="category.value"
              :world-type="worldType"
              :is-changed="isItemChanged(item, itemKey)"
              v-show="matchesSearch(item.text)"
              @setting-change="handleSettingChange"
            />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  </div>
</template>

<script>
import { SearchIcon } from '@lucide/vue'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import SettingItem from './SettingItem.vue';

export default {
  name: 'WorldSettingsPanel',
  components: {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    SearchIcon,
    SettingItem,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
  },
  props: {
    settings: {
      type: Object,
      required: true
    },
    originalSettings: {
      type: Object,
      default: null
    },
    worldType: {
      type: String,
      required: true
    },
    searchText: {
      type: String,
      default: ''
    },
    showGroup: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      descriptionCache: {},
      itemOptionsCache: {}
    };
  },
  computed: {
    filteredSettings() {
      if (!this.showGroup || !this.settings) return this.settings;
      
      // 只返回指定的组
      const result = {};
      if (this.settings[this.showGroup]) {
        result[this.showGroup] = this.settings[this.showGroup];
      }
      return result;
    }
  },
  methods: {
    getSortedCategories(group) {
      // 将对象转换为包含key和value的数组，并按order排序
      return Object.entries(group)
        .map(([key, value]) => ({ key, value }))
        .sort((a, b) => (a.value.order || 999) - (b.value.order || 999));
    },
    matchesSearch(text) {
      if (!this.searchText) return true;
      return text.toLowerCase().includes(this.searchText.toLowerCase());
    },
    isItemChanged(item, itemKey) {
      if (!this.originalSettings || !item) return false;
      
      try {
        // 在原始设置中查找对应的项
        let originalItem = this.findItem(this.originalSettings, itemKey);
        
        // 如果找到原始设置项，比较其值
        if (originalItem) {
          // 特殊情况: 原值为default，当前值也为default - 未变更
          if (originalItem.value === 'default' && item.value === 'default') {
            return false;
          }
          
          // 如果值不同，则认为有变更
          return originalItem.value !== item.value;
        }
        
        return false;
      } catch (e) {
        console.error('比较设置项变化时出错:', e);
        return false;
      }
    },
    findItem(settings, targetKey) {
      let result = null;
      
      if (!settings) return null;
      
      // 遍历搜索目标项
      this.traverseSettings(settings, (item, itemKey) => {
        if (itemKey === targetKey) {
          result = item;
        }
      }, '', () => result !== null); // 找到后立即停止搜索
      
      return result;
    },
    traverseSettings(settings, callback, basePath = '', shouldStop = () => false) {
      const visitedItems = new Set();
      
      for (const groupKey in settings) {
        const group = settings[groupKey];
        const groupPath = basePath ? `${basePath}.${groupKey}` : groupKey;
        
        for (const categoryKey in group) {
          const category = group[categoryKey];
          const categoryPath = `${groupPath}.${categoryKey}`;
          
          if (category && category.items) {
            for (const itemKey in category.items) {
              // 避免重复处理同一个item
              const itemFullPath = `${categoryPath}.items.${itemKey}`;
              if (visitedItems.has(itemFullPath)) continue;
              
              visitedItems.add(itemFullPath);
              callback(category.items[itemKey], itemKey, categoryPath);
              
              // 如果条件满足，提前结束遍历
              if (shouldStop()) return;
            }
          }
        }
      }
    },
    handleSettingChange({ item, value }) {
      this.$emit('setting-change', { item, value });
    }
  }
}
</script>

<style scoped>
.settings-wrapper {
  padding: 0;
}

.search-box {
  width: min(420px, 100%);
  margin-bottom: 14px;
}

.settings-tabs {
  margin-bottom: 20px;
}

.settings-category {
  margin-bottom: 20px;
  padding: 0 0 18px;
  background: transparent;
  border-bottom: 1px solid var(--border-color);
  border-radius: 0;
  box-shadow: none;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
  user-select: none;
}

.category-header:hover h4 {
  color: var(--text-primary);
}

.category-header h4 {
  margin: 0;
  color: var(--text-primary);
  font-size: 14px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 8px;
}

@media (max-width: 768px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
