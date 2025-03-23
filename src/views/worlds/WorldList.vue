<template>
  <div class="world-list-page">
    <div class="page-header">
      <h2>世界列表</h2>
      <div class="header-actions">
        <el-input
          placeholder="搜索世界"
          v-model="searchQuery"
          class="search-input"
          prefix-icon="el-icon-search"
          clearable>
        </el-input>
        <el-button type="primary" icon="el-icon-plus" @click="createWorld">创建世界</el-button>
      </div>
    </div>
    
    <el-card shadow="hover" class="world-list-card">
      <div slot="header" class="card-header">
        <span>所有世界</span>
        <div>
          <el-button style="margin-left: 10px;" size="small" icon="el-icon-refresh" @click="refreshWorlds">刷新</el-button>
        </div>
      </div>
      
      <el-table
        :data="filteredWorlds"
        style="width: 100%"
        v-loading="loading"
        @row-click="handleRowClick">
        <el-table-column prop="name" label="世界名称" min-width="150"></el-table-column>
        <el-table-column prop="type" label="世界类型" width="120">
          <template slot-scope="scope">
            <el-tag :type="scope.row.type === 'master' ? 'primary' : 'success'">
              {{ scope.row.type === 'master' ? '主世界' : '洞穴' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="season" label="季节" width="120"></el-table-column>
        <el-table-column prop="day" label="天数" width="100"></el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === 'running' ? 'success' : 'info'" size="mini">
              {{ scope.row.status === 'running' ? '运行中' : '已停止' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template slot-scope="scope">
            <el-button 
              :type="scope.row.status === 'running' ? 'danger' : 'success'" 
              size="mini" 
              @click.stop="toggleWorldStatus(scope.row)">
              {{ scope.row.status === 'running' ? '停止' : '启动' }}
            </el-button>
            <el-button 
              type="primary" 
              size="mini" 
              @click.stop="editWorld(scope.row)">编辑</el-button>
            <el-dropdown trigger="click" @command="handleMoreCommands($event, scope.row)" @click.stop>
              <el-button size="mini">
                更多<i class="el-icon-arrow-down el-icon--right"></i>
              </el-button>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item command="regenerate">重新生成</el-dropdown-item>
                <el-dropdown-item command="backup">备份世界</el-dropdown-item>
                <el-dropdown-item command="delete" divided>
                  <span style="color: #F56C6C;">删除世界</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'WorldList',
  data() {
    return {
      loading: false,
      searchQuery: '',
      worlds: [
        {
          id: 1,
          name: '生存世界',
          type: 'master',
          season: '秋季',
          day: 21,
          status: 'running',
          description: '基础生存世界'
        },
        {
          id: 2,
          name: '生存洞穴',
          type: 'cave',
          season: '秋季',
          day: 21,
          status: 'running',
          description: '与生存世界关联的洞穴'
        },
        {
          id: 3,
          name: '无尽模式',
          type: 'master',
          season: '春季',
          day: 12,
          status: 'stopped',
          description: '无尽模式世界'
        }
      ]
    }
  },
  computed: {
    filteredWorlds() {
      let result = this.worlds;
      
      // 按搜索查询筛选
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        result = result.filter(world => 
          world.name.toLowerCase().includes(query) || 
          world.description.toLowerCase().includes(query)
        );
      }
      
      return result;
    }
  },
  methods: {
    refreshWorlds() {
      this.loading = true;
      console.log("开始获取世界列表");
      
      // 模拟API调用
      setTimeout(() => {
        this.loading = false;
        this.$message({
          message: '世界列表已刷新',
          type: 'success'
        });
      }, 1000);
    },
    createWorld() {
      this.$router.push('/worlds/settings');
    },
    editWorld(world) {
      this.$router.push({
        path: '/worlds/settings',
        query: { id: world.id }
      });
    },
    toggleWorldStatus(world) {
      const action = world.status === 'running' ? '停止' : '启动';
      this.$confirm(`确定要${action}世界 "${world.name}" 吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
        
        // 模拟API调用
        setTimeout(() => {
          // 更新本地状态
          const index = this.worlds.findIndex(w => w.id === world.id);
          if (index > -1) {
            this.worlds[index].status = world.status === 'running' ? 'stopped' : 'running';
          }
          
          this.loading = false;
          this.$message({
            message: `世界 ${world.name} 已${action}`,
            type: 'success'
          });
        }, 1000);
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作'
        });
      });
    },
    handleRowClick(row) {
      // 点击行跳转到详情页
      this.$router.push({
        path: '/worlds/details',
        query: { id: row.id }
      });
    },
    handleMoreCommands(command, world) {
      switch (command) {
        case 'regenerate':
          this.regenerateWorld(world);
          break;
        case 'backup':
          this.backupWorld(world);
          break;
        case 'delete':
          this.deleteWorld(world);
          break;
      }
    },
    regenerateWorld(world) {
      this.$confirm(`确定要重新生成世界 "${world.name}" 吗？现有的世界数据将会丢失！`, '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
        
        // 模拟API调用
        setTimeout(() => {
          this.loading = false;
          this.$message({
            type: 'success',
            message: `世界 ${world.name} 正在重新生成...`
          });
        }, 1000);
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作'
        });
      });
    },
    backupWorld(world) {
      this.$confirm(`确定要备份世界 "${world.name}" 吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        this.loading = true;
        
        // 模拟API调用
        setTimeout(() => {
          this.loading = false;
          this.$message({
            type: 'success',
            message: `世界 ${world.name} 备份已创建`
          });
        }, 1000);
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作'
        });
      });
    },
    deleteWorld(world) {
      this.$confirm(`确定要删除世界 "${world.name}" 吗？此操作不可恢复!`, '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
        
        // 模拟API调用
        setTimeout(() => {
          // 从本地列表中移除
          this.worlds = this.worlds.filter(w => w.id !== world.id);
          
          this.loading = false;
          this.$message({
            type: 'success',
            message: `世界 ${world.name} 已删除`
          });
        }, 1000);
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作'
        });
      });
    }
  },
  mounted() {
    this.refreshWorlds();
  }
}
</script>

<style scoped>
.world-list-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  align-items: center;
}

.search-input {
  width: 250px;
  margin-right: 15px;
}

.world-list-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 表格行悬停样式 */
.el-table >>> .el-table__row {
  cursor: pointer;
}

.el-table >>> .el-table__row:hover {
  background-color: #f5f7fa;
}
</style> 