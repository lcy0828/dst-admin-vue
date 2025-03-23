<template>
  <div class="world-details-page">
    <div class="page-header">
      <h2>世界详情</h2>
      <div class="header-actions">
        <el-button @click="goBack">返回列表</el-button>
        <el-button type="primary" @click="editWorld" icon="el-icon-edit">编辑世界</el-button>
      </div>
    </div>
    
    <el-row :gutter="20" v-loading="loading">
      <el-col :span="16">
        <el-card shadow="hover" class="details-card">
          <div slot="header" class="card-header">
            <span>世界信息</span>
            <el-tag :type="world.status === 'running' ? 'success' : 'info'">
              {{ world.status === 'running' ? '运行中' : '已停止' }}
            </el-tag>
          </div>
          
          <div class="world-info">
            <div class="info-item">
              <div class="info-label">世界名称</div>
              <div class="info-value">{{ world.name }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">世界类型</div>
              <div class="info-value">
                <el-tag :type="world.type === 'master' ? 'primary' : 'success'">
                  {{ world.type === 'master' ? '主世界' : '洞穴' }}
                </el-tag>
              </div>
            </div>
            <div class="info-item">
              <div class="info-label">当前季节</div>
              <div class="info-value">{{ world.season }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">当前天数</div>
              <div class="info-value">{{ world.day }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">描述</div>
              <div class="info-value description">{{ world.description }}</div>
            </div>
          </div>
        </el-card>
        
        <el-card shadow="hover" class="details-card" style="margin-top: 20px;">
          <div slot="header" class="card-header">
            <span>世界统计</span>
          </div>
          
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-value">12</div>
                <div class="stat-label">玩家访问次数</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-value">35</div>
                <div class="stat-label">总游戏天数</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-value">5</div>
                <div class="stat-label">死亡次数</div>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card shadow="hover" class="details-card">
          <div slot="header" class="card-header">
            <span>快捷操作</span>
          </div>
          
          <div class="action-list">
            <el-button 
              :type="world.status === 'running' ? 'danger' : 'success'" 
              icon="el-icon-video-play"
              class="action-button"
              @click="toggleWorldStatus">
              {{ world.status === 'running' ? '停止世界' : '启动世界' }}
            </el-button>
            
            <el-button 
              type="primary" 
              icon="el-icon-refresh-right"
              class="action-button"
              @click="regenerateWorld">
              重新生成
            </el-button>
            
            <el-button 
              type="warning" 
              icon="el-icon-copy-document"
              class="action-button"
              @click="backupWorld">
              备份世界
            </el-button>
            
            <el-button 
              type="danger" 
              icon="el-icon-delete"
              class="action-button"
              @click="deleteWorld">
              删除世界
            </el-button>
          </div>
        </el-card>
        
        <el-card shadow="hover" class="details-card" style="margin-top: 20px;">
          <div slot="header" class="card-header">
            <span>最近活动</span>
          </div>
          
          <div class="activity-list">
            <div class="activity-item">
              <div class="activity-time">10分钟前</div>
              <div class="activity-content">玩家 <b>Steve</b> 加入了世界</div>
            </div>
            <div class="activity-item">
              <div class="activity-time">30分钟前</div>
              <div class="activity-content">进入了 <b>冬季</b></div>
            </div>
            <div class="activity-item">
              <div class="activity-time">1小时前</div>
              <div class="activity-content">玩家 <b>Alex</b> 死亡</div>
            </div>
            <div class="activity-item">
              <div class="activity-time">2小时前</div>
              <div class="activity-content">世界启动</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
export default {
  name: 'WorldDetails',
  data() {
    return {
      loading: false,
      worldId: null,
      world: {
        id: 1,
        name: '生存世界',
        type: 'master',
        season: '秋季',
        day: 21,
        status: 'running',
        description: '基础生存世界，适合新手玩家体验。这个世界资源丰富，怪物刷新率较低，是学习游戏机制的理想环境。'
      }
    }
  },
  methods: {
    goBack() {
      this.$router.push('/worlds/list');
    },
    editWorld() {
      this.$router.push({
        path: '/worlds/settings',
        query: { id: this.worldId }
      });
    },
    toggleWorldStatus() {
      const action = this.world.status === 'running' ? '停止' : '启动';
      this.$confirm(`确定要${action}世界 "${this.world.name}" 吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
        
        // 模拟API调用
        setTimeout(() => {
          this.world.status = this.world.status === 'running' ? 'stopped' : 'running';
          
          this.loading = false;
          this.$message({
            message: `世界 ${this.world.name} 已${action}`,
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
    regenerateWorld() {
      this.$confirm(`确定要重新生成世界 "${this.world.name}" 吗？现有的世界数据将会丢失！`, '警告', {
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
            message: `世界 ${this.world.name} 正在重新生成...`
          });
          this.goBack();
        }, 1000);
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作'
        });
      });
    },
    backupWorld() {
      this.$confirm(`确定要备份世界 "${this.world.name}" 吗?`, '提示', {
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
            message: `世界 ${this.world.name} 备份已创建`
          });
        }, 1000);
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作'
        });
      });
    },
    deleteWorld() {
      this.$confirm(`确定要删除世界 "${this.world.name}" 吗？此操作不可恢复!`, '警告', {
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
            message: `世界 ${this.world.name} 已删除`
          });
          this.goBack();
        }, 1000);
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作'
        });
      });
    },
    loadWorldData() {
      if (!this.worldId) return;
      
      this.loading = true;
      
      // 模拟API调用，获取世界详情
      setTimeout(() => {
        // 在实际项目中，这里会从API获取数据
        // 这里假设已经获取到了数据并存储在this.world中
        
        this.loading = false;
      }, 1000);
    }
  },
  created() {
    const { id } = this.$route.query;
    if (id) {
      this.worldId = parseInt(id);
      this.loadWorldData();
    } else {
      this.$message.error('未指定世界ID');
      this.goBack();
    }
  }
}
</script>

<style scoped>
.world-details-page {
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
  gap: 10px;
}

.details-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.world-info {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.info-item {
  display: flex;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 10px;
}

.info-label {
  width: 100px;
  color: #909399;
  font-weight: bold;
}

.info-value {
  flex: 1;
}

.info-value.description {
  white-space: pre-line;
  line-height: 1.5;
}

.stat-item {
  text-align: center;
  padding: 15px 0;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
}

.stat-label {
  color: #909399;
  margin-top: 5px;
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-button {
  display: block;
  width: 100%;
  margin-bottom: 10px;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.activity-item {
  display: flex;
  flex-direction: column;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
}

.activity-time {
  font-size: 12px;
  color: #909399;
  margin-bottom: 5px;
}

.activity-content {
  color: #606266;
}
</style> 