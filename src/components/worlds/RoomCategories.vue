<template>
  <div class="room-categories">
    <div class="categories-header">
      <h3>房间分类</h3>
      <el-button type="text" @click="refreshCategories" icon="el-icon-refresh" size="small">刷新</el-button>
    </div>

    <div class="category-list">
      <div class="menu-item" :class="{'active': activeCategory === 'all'}" @click="handleCategorySelect('all')">
        <component :is="'el-icon-s-grid'" class="legacy-icon" />
        <span>所有房间</span>
      </div>

      <div class="menu-item" :class="{'active': activeCategory === 'active'}" @click="handleCategorySelect('active')">
        <component :is="'el-icon-video-play'" class="legacy-icon" />
        <span>活跃房间</span>
        <div class="badge" v-if="getCountByCategory('active') > 0">{{getCountByCategory('active')}}</div>
      </div>

      <div class="menu-item" :class="{'active': activeCategory === 'inactive'}" @click="handleCategorySelect('inactive')">
        <component :is="'el-icon-video-pause'" class="legacy-icon" />
        <span>非活跃房间</span>
        <div class="badge" v-if="getCountByCategory('inactive') > 0">{{getCountByCategory('inactive')}}</div>
      </div>

      <div class="submenu">
        <div class="submenu-title" @click="toggleSubmenu('worldTypes')">
          <component :is="'el-icon-map-location'" class="legacy-icon" />
          <span>按世界类型</span>
          <component :is="'el-icon-arrow-down'" class="legacy-icon submenu-arrow" :class="{'is-open': submenuOpen.worldTypes}" />
        </div>
        <div class="submenu-content" v-show="submenuOpen.worldTypes">
          <div class="menu-item submenu-item" :class="{'active': activeCategory === 'forest'}" @click="handleCategorySelect('forest')">
            <component :is="'el-icon-sunny'" class="legacy-icon" />
            <span>主世界</span>
            <div class="badge" v-if="getCountByCategory('forest') > 0">{{getCountByCategory('forest')}}</div>
          </div>
          <div class="menu-item submenu-item" :class="{'active': activeCategory === 'cave'}" @click="handleCategorySelect('cave')">
            <component :is="'el-icon-moon'" class="legacy-icon" />
            <span>洞穴</span>
            <div class="badge" v-if="getCountByCategory('cave') > 0">{{getCountByCategory('cave')}}</div>
          </div>
          <div class="menu-item submenu-item" :class="{'active': activeCategory === 'both'}" @click="handleCategorySelect('both')">
            <component :is="'el-icon-connection'" class="legacy-icon" />
            <span>混合房间</span>
            <div class="badge" v-if="getCountByCategory('both') > 0">{{getCountByCategory('both')}}</div>
          </div>
        </div>
      </div>

      <div class="submenu" v-if="customCategories.length > 0">
        <div class="submenu-title" @click="toggleSubmenu('custom')">
          <component :is="'el-icon-collection-tag'" class="legacy-icon" />
          <span>自定义分类</span>
          <component :is="'el-icon-arrow-down'" class="legacy-icon submenu-arrow" :class="{'is-open': submenuOpen.custom}" />
        </div>
        <div class="submenu-content" v-show="submenuOpen.custom">
          <div class="menu-item submenu-item"
               v-for="category in customCategories"
               :key="category.id"
               :class="{'active': activeCategory === 'custom_' + category.id}"
               @click="handleCategorySelect('custom_' + category.id)">
            <component :is="category.icon || 'el-icon-folder'" class="legacy-icon" />
            <span>{{ category.name }}</span>
            <div class="badge" v-if="getCountByCategory('custom', category.id) > 0">{{getCountByCategory('custom', category.id)}}</div>
          </div>
        </div>
      </div>

      <div class="category-actions">
        <el-button type="text" @click="showAddCategoryDialog" size="small">
          <component :is="'el-icon-plus'" class="legacy-icon" /> 添加分类
        </el-button>
      </div>
    </div>

    <!-- 添加分类对话框 -->
    <el-dialog
      title="添加自定义分类"
      v-model="addCategoryDialogVisible"
      width="400px">
      <el-form :model="newCategory" label-width="80px">
        <el-form-item label="分类名称">
          <el-input v-model="newCategory.name" placeholder="输入分类名称"></el-input>
        </el-form-item>
        <el-form-item label="图标">
          <el-select v-model="newCategory.icon" placeholder="选择图标">
            <el-option label="文件夹" value="el-icon-folder"></el-option>
            <el-option label="星星" value="el-icon-star-off"></el-option>
            <el-option label="心形" value="el-icon-heart"></el-option>
            <el-option label="旗帜" value="el-icon-flag"></el-option>
            <el-option label="位置" value="el-icon-location"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <template v-slot:footer>
<span  class="dialog-footer">
        <el-button @click="addCategoryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addCategory">确定</el-button>
      </span>
</template>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'RoomCategories',
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
        icon: 'el-icon-folder'
      },
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
        icon: 'el-icon-folder'
      };
    },
    addCategory() {
      if (!this.newCategory.name) {
        this.$message.warning('请输入分类名称');
        return;
      }

      this.$message.error('真实 v2 后端暂未提供自定义分类持久化接口，未保存任何数据');
    }
  }
}
</script>

<style scoped>
.room-categories {
  width: 100%;
  margin-bottom: 20px;
}

.categories-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}

.categories-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  position: relative;
  padding-left: 12px;
  letter-spacing: 0.5px;
}

.categories-header h3::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 16px;
  background-color: var(--primary-color);
  border-radius: 2px;
}

.category-list {
  border-radius: 8px;
  overflow: hidden;
  background-color: #fff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

/* 菜单项基础样式 */
.menu-item {
  position: relative;
  height: 40px;
  line-height: 40px;
  padding: 0 16px;
  cursor: pointer;
  transition: all 0.3s;
  background-color: #fff;
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
  background-color: #fff3e6;
}

.menu-item.active i,
.menu-item.active span {
  color: var(--primary-color);
  font-weight: 500;
}

/* 徽章样式 */
.badge {
  position: relative;
  height: 20px;
  min-width: 20px;
  line-height: 20px;
  text-align: center;
  background-color: var(--primary-color);
  color: #fff;
  border-radius: 10px;
  font-size: 12px;
  padding: 0 6px;
  box-sizing: border-box;
}

/* 子菜单样式 */
.submenu {
  border-bottom: 1px solid #f4f4f4;
}

.submenu-title {
  position: relative;
  height: 40px;
  line-height: 40px;
  padding: 0 16px;
  cursor: pointer;
  transition: all 0.3s;
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
  transition: transform 0.3s;
  transform: rotate(0deg);
}

.submenu-arrow.is-open {
  transform: rotate(180deg);
}

.submenu-title:hover {
  background-color: var(--surface-muted);
}

.submenu-content {
  background-color: #f9f9f9;
}

.submenu-item {
  padding-left: 48px;
  background-color: #f9f9f9;
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

.category-actions .el-button {
  color: var(--primary-color);
  font-size: 13px;
}

.category-actions .el-button:hover {
  color: var(--el-color-primary-light-3);
  background-color: transparent;
}
</style>
