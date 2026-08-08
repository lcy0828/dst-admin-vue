<template>
  <div class="room-categories">
    <div class="categories-header">
      <h3>房间分类</h3>
      <UiButton variant="ghost" size="sm" :disabled="isRefreshing" @click="refreshCategories">
        <RefreshCwIcon data-icon="inline-start" :class="{ 'animate-spin': isRefreshing }" />
        刷新
      </UiButton>
    </div>

    <div class="category-list">
      <div class="menu-item" :class="{'active': activeCategory === 'all'}" @click="handleCategorySelect('all')">
        <LayoutGridIcon />
        <span>所有房间</span>
      </div>

      <div class="menu-item" :class="{'active': activeCategory === 'active'}" @click="handleCategorySelect('active')">
        <PlayIcon />
        <span>活跃房间</span>
        <Badge v-if="getCountByCategory('active') > 0" variant="secondary">{{getCountByCategory('active')}}</Badge>
      </div>

      <div class="menu-item" :class="{'active': activeCategory === 'inactive'}" @click="handleCategorySelect('inactive')">
        <PauseIcon />
        <span>非活跃房间</span>
        <Badge v-if="getCountByCategory('inactive') > 0" variant="secondary">{{getCountByCategory('inactive')}}</Badge>
      </div>

      <div class="submenu">
        <div class="submenu-title" @click="toggleSubmenu('worldTypes')">
          <MapIcon />
          <span>按世界类型</span>
          <ChevronDownIcon class="submenu-arrow" :class="{'is-open': submenuOpen.worldTypes}" />
        </div>
        <div class="submenu-content" v-show="submenuOpen.worldTypes">
          <div class="menu-item submenu-item" :class="{'active': activeCategory === 'forest'}" @click="handleCategorySelect('forest')">
            <SunIcon />
            <span>主世界</span>
            <Badge v-if="getCountByCategory('forest') > 0" variant="secondary">{{getCountByCategory('forest')}}</Badge>
          </div>
          <div class="menu-item submenu-item" :class="{'active': activeCategory === 'cave'}" @click="handleCategorySelect('cave')">
            <MoonIcon />
            <span>洞穴</span>
            <Badge v-if="getCountByCategory('cave') > 0" variant="secondary">{{getCountByCategory('cave')}}</Badge>
          </div>
          <div class="menu-item submenu-item" :class="{'active': activeCategory === 'both'}" @click="handleCategorySelect('both')">
            <NetworkIcon />
            <span>混合房间</span>
            <Badge v-if="getCountByCategory('both') > 0" variant="secondary">{{getCountByCategory('both')}}</Badge>
          </div>
        </div>
      </div>

      <div class="submenu" v-if="customCategories.length > 0">
        <div class="submenu-title" @click="toggleSubmenu('custom')">
          <TagsIcon />
          <span>自定义分类</span>
          <ChevronDownIcon class="submenu-arrow" :class="{'is-open': submenuOpen.custom}" />
        </div>
        <div class="submenu-content" v-show="submenuOpen.custom">
          <div class="menu-item submenu-item"
               v-for="category in customCategories"
               :key="category.id"
               :class="{'active': activeCategory === 'custom_' + category.id}"
               @click="handleCategorySelect('custom_' + category.id)">
            <component :is="categoryIcon(category)" />
            <span>{{ category.name }}</span>
            <Badge v-if="getCountByCategory('custom', category.id) > 0" variant="secondary">{{getCountByCategory('custom', category.id)}}</Badge>
          </div>
        </div>
      </div>

      <div class="category-actions">
        <UiButton variant="ghost" size="sm" @click="showAddCategoryDialog">
          <PlusIcon data-icon="inline-start" />
          添加分类
        </UiButton>
      </div>
    </div>

    <UiDialog v-model:open="addCategoryDialogVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>添加自定义分类</DialogTitle>
          <DialogDescription>设置分类名称和用于识别的图标。</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel for="category-name">分类名称</FieldLabel>
            <UiInput id="category-name" v-model="newCategory.name" placeholder="输入分类名称" />
          </Field>
          <Field>
            <FieldLabel>图标</FieldLabel>
            <UiSelect v-model="newCategory.icon">
              <SelectTrigger><SelectValue placeholder="选择图标" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem v-for="option in iconOptions" :key="option.label" :value="option.icon">
                    <component :is="option.icon" />
                    {{ option.label }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </UiSelect>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <UiButton variant="outline" @click="addCategoryDialogVisible = false">取消</UiButton>
          <UiButton @click="addCategory">确定</UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>
  </div>
</template>

<script>
import {
  ChevronDownIcon,
  FlagIcon,
  FolderIcon,
  HeartIcon,
  LayoutGridIcon,
  MapIcon,
  MapPinIcon,
  MoonIcon,
  NetworkIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  RefreshCwIcon,
  StarIcon,
  SunIcon,
  TagsIcon
} from '@lucide/vue'
import { markRaw } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input as UiInput } from '@/components/ui/input'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'vue-sonner'

export default {
  name: 'RoomCategories',
  components: {
    Badge,
    ChevronDownIcon,
    UiDialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Field,
    FieldGroup,
    FieldLabel,
    FolderIcon,
    LayoutGridIcon,
    MapIcon,
    MoonIcon,
    NetworkIcon,
    PauseIcon,
    PlayIcon,
    PlusIcon,
    RefreshCwIcon,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SunIcon,
    TagsIcon,
    UiButton,
    UiInput,
    UiSelect
  },
  props: {
    rooms: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      activeCategory: 'all',
      addCategoryDialogVisible: false,
      newCategory: {
        name: '',
        icon: markRaw(FolderIcon)
      },
      iconOptions: [
        { label: '文件夹', icon: markRaw(FolderIcon) },
        { label: '星星', icon: markRaw(StarIcon) },
        { label: '心形', icon: markRaw(HeartIcon) },
        { label: '旗帜', icon: markRaw(FlagIcon) },
        { label: '位置', icon: markRaw(MapPinIcon) }
      ],
      customCategories: [],
      isRefreshing: false,
      lastRefreshTime: 0,
      submenuOpen: {
        worldTypes: true,
        custom: false
      }
    }
  },
  methods: {
    categoryIcon(category) {
      return category.icon || FolderIcon
    },
    handleCategorySelect(index) {
      this.activeCategory = index;
      this.$emit('category-change', index);
    },
    toggleSubmenu(menu) {
      this.submenuOpen[menu] = !this.submenuOpen[menu];
    },
    refreshCategories() {
      // 如果正在刷新或者距离上次刷新不足2秒，则不进行刷新
      const now = Date.now();
      if (this.isRefreshing || (now - this.lastRefreshTime < 2000)) {
        return;
      }

      this.isRefreshing = true;
      this.lastRefreshTime = now;

      // 发出刷新请求给父组件
      this.$emit('refresh');

      // 重置状态
      setTimeout(() => {
        this.isRefreshing = false;
      }, 2000);
    },
    getCountByCategory(category) {
      switch(category) {
        case 'active':
          return this.rooms.filter(room => room.status === 'running').length;
        case 'inactive':
          return this.rooms.filter(room => room.status === 'stopped').length;
        case 'forest':
          return this.rooms.filter(room => {
            if (!room.worlds) return false;
            return room.worlds.some(world => world.type === 'forest') &&
                  !room.worlds.some(world => world.type === 'cave');
          }).length;
        case 'cave':
          return this.rooms.filter(room => {
            if (!room.worlds) return false;
            return room.worlds.some(world => world.type === 'cave') &&
                  !room.worlds.some(world => world.type === 'forest');
          }).length;
        case 'both':
          return this.rooms.filter(room => {
            if (!room.worlds) return false;
            return room.worlds.some(world => world.type === 'forest') &&
                  room.worlds.some(world => world.type === 'cave');
          }).length;
        case 'custom':
          return 0;
        default:
          return this.rooms.length;
      }
    },
    showAddCategoryDialog() {
      this.addCategoryDialogVisible = true;
      this.newCategory = {
        name: '',
        icon: markRaw(FolderIcon)
      };
    },
    addCategory() {
      if (!this.newCategory.name) {
        toast.warning('请输入分类名称');
        return;
      }

      toast.error('真实 v2 后端暂未提供自定义分类持久化接口，未保存任何数据');
    }
  }
}
</script>

<style scoped>
.room-categories {
  width: 100%;
  margin-bottom: 16px;
}

.categories-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}

.categories-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0;
}

.category-list {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  background-color: var(--surface-color);
  box-shadow: none;
}

/* 菜单项基础样式 */
.menu-item {
  position: relative;
  height: 40px;
  line-height: 40px;
  padding: 0 16px;
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;
  background-color: var(--surface-color);
  margin: 0;
  display: flex;
  align-items: center;
}

.menu-item i {
  font-size: 16px;
  margin-right: 8px;
  color: var(--text-secondary);
  width: 24px;
  text-align: center;
}

.menu-item span {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
}

.menu-item:hover {
  background-color: var(--surface-muted);
}

.menu-item.active {
  background-color: var(--accent);
}

.menu-item.active i,
.menu-item.active span {
  color: var(--primary-color);
  font-weight: 500;
}

/* 徽章样式 */
/* 子菜单样式 */
.submenu {
  border-bottom: 1px solid var(--border-color);
}

.submenu-title {
  position: relative;
  height: 40px;
  line-height: 40px;
  padding: 0 16px;
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;
  display: flex;
  align-items: center;
}

.submenu-title i {
  font-size: 16px;
  margin-right: 8px;
  color: var(--text-secondary);
  width: 24px;
  text-align: center;
}

.submenu-title span {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
}

.submenu-arrow {
  color: var(--text-secondary);
  transition: transform 0.15s ease;
  transform: rotate(0deg);
}

.submenu-arrow.is-open {
  transform: rotate(180deg);
}

.submenu-title:hover {
  background-color: var(--surface-muted);
}

.submenu-content {
  background-color: var(--surface-muted);
}

.submenu-item {
  padding-left: 48px;
  background-color: var(--surface-muted);
  height: 36px;
  line-height: 36px;
}

.submenu-item i {
  width: 18px;
}

/* 添加分类按钮 */
.category-actions {
  padding: 12px;
  text-align: center;
  background-color: var(--surface-muted);
  border-top: 1px solid var(--border-color);
}

.category-actions button {
  color: var(--primary-color);
  font-size: 13px;
}

.category-actions button:hover {
  color: var(--primary);
  background-color: transparent;
}
</style>
