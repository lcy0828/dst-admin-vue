<template>
  <div class="room-categories">
    <div class="categories-header">
      <h3>房间分类</h3>
      <el-button type="text" @click="refreshCategories" icon="el-icon-refresh">刷新</el-button>
    </div>
    
    <el-card shadow="hover" class="category-list">
      <el-menu 
        :default-active="activeCategory" 
        @select="handleCategorySelect">
        <el-menu-item index="all">
          <i class="el-icon-s-grid"></i>
          <span slot="title">所有房间</span>
        </el-menu-item>
        
        <el-menu-item index="active">
          <i class="el-icon-video-play"></i>
          <span slot="title">活跃房间</span>
          <el-badge :value="getCountByCategory('active')" class="category-badge" type="primary" v-if="getCountByCategory('active') > 0" />
        </el-menu-item>
        
        <el-menu-item index="inactive">
          <i class="el-icon-video-pause"></i>
          <span slot="title">非活跃房间</span>
          <el-badge :value="getCountByCategory('inactive')" class="category-badge" v-if="getCountByCategory('inactive') > 0" />
        </el-menu-item>
        
        <el-submenu index="worldTypes">
          <template slot="title">
            <i class="el-icon-map-location"></i>
            <span>按世界类型</span>
          </template>
          <el-menu-item index="forest">
            <i class="el-icon-sunny"></i>
            <span slot="title">主世界</span>
            <el-badge :value="getCountByCategory('forest')" class="category-badge" v-if="getCountByCategory('forest') > 0" />
          </el-menu-item>
          <el-menu-item index="cave">
            <i class="el-icon-moon"></i>
            <span slot="title">洞穴</span>
            <el-badge :value="getCountByCategory('cave')" class="category-badge" v-if="getCountByCategory('cave') > 0" />
          </el-menu-item>
          <el-menu-item index="both">
            <i class="el-icon-connection"></i>
            <span slot="title">混合房间</span>
            <el-badge :value="getCountByCategory('both')" class="category-badge" v-if="getCountByCategory('both') > 0" />
          </el-menu-item>
        </el-submenu>
        
        <el-submenu index="custom" v-if="customCategories.length > 0">
          <template slot="title">
            <i class="el-icon-collection-tag"></i>
            <span>自定义分类</span>
          </template>
          <el-menu-item v-for="category in customCategories" :key="category.id" :index="'custom_' + category.id">
            <i :class="category.icon || 'el-icon-folder'"></i>
            <span slot="title">{{ category.name }}</span>
            <el-badge :value="getCountByCategory('custom', category.id)" class="category-badge" v-if="getCountByCategory('custom', category.id) > 0" />
          </el-menu-item>
        </el-submenu>
      </el-menu>
      
      <div class="category-actions">
        <el-button type="text" @click="showAddCategoryDialog" size="small">
          <i class="el-icon-plus"></i> 添加分类
        </el-button>
      </div>
    </el-card>
    
    <!-- 添加分类对话框 -->
    <el-dialog
      title="添加自定义分类"
      :visible.sync="addCategoryDialogVisible"
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
      <span slot="footer" class="dialog-footer">
        <el-button @click="addCategoryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addCategory">确定</el-button>
      </span>
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
      customCategories: [
        // 示例自定义分类
        {
          id: 1,
          name: '生存服务器',
          icon: 'el-icon-star-off'
        },
        {
          id: 2,
          name: '创造服务器',
          icon: 'el-icon-heart'
        }
      ]
    }
  },
  methods: {
    handleCategorySelect(index) {
      this.activeCategory = index;
      this.$emit('category-change', index);
    },
    refreshCategories() {
      // 刷新分类统计数据
      this.$emit('refresh');
    },
    getCountByCategory(category, customId = null) {
      switch(category) {
        case 'active':
          return this.rooms.filter(room => room.status === 'running').length;
        case 'inactive':
          return this.rooms.filter(room => room.status !== 'running').length;
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
          // 自定义分类的计数逻辑，这里需要根据实际情况实现
          // 目前只是返回一个示例数字
          return 2;
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
      
      const newId = this.customCategories.length > 0 
        ? Math.max(...this.customCategories.map(c => c.id)) + 1 
        : 1;
      
      this.customCategories.push({
        id: newId,
        name: this.newCategory.name,
        icon: this.newCategory.icon
      });
      
      this.$message.success(`分类 "${this.newCategory.name}" 已添加`);
      this.addCategoryDialogVisible = false;
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
  margin-bottom: 10px;
}

.categories-header h3 {
  margin: 0;
}

.category-list {
  border-radius: 4px;
}

.el-menu {
  border-right: none;
}

.el-menu-item, .el-submenu__title {
  height: 45px;
  line-height: 45px;
}

.category-badge {
  margin-top: 14px;
}

.category-actions {
  padding: 10px;
  border-top: 1px solid #ebeef5;
  text-align: center;
}
</style> 