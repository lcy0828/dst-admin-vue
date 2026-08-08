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
          <template v-slot:header>
<div  class="card-header">
            <span>世界信息</span>
            <el-tag :type="getStatusTag(world.status)">
              {{ getStatusName(world.status) }}
            </el-tag>
          </div>
</template>
          
          <div class="world-info">
            <div class="info-item">
              <div class="info-label">世界名称</div>
              <div class="info-value">{{ world.name || '--' }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">世界类型</div>
              <div class="info-value">
                <el-tag :type="getTypeTag(world.type)">
                  {{ getTypeName(world.type) }}
                </el-tag>
              </div>
            </div>
            <div class="info-item">
              <div class="info-label">当前季节</div>
              <div class="info-value">{{ world.season || '--' }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">当前天数</div>
              <div class="info-value">{{ world.day ?? '--' }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">描述</div>
              <div class="info-value description">{{ world.description || '--' }}</div>
            </div>
          </div>
        </el-card>
        
        <el-card shadow="hover" class="details-card" style="margin-top: 20px;">
          <template v-slot:header>
<div  class="card-header">
            <span>世界统计</span>
          </div>
</template>
          
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-value">--</div>
                <div class="stat-label">玩家访问次数</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-value">{{ world.day ?? '--' }}</div>
                <div class="stat-label">总游戏天数</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-value">--</div>
                <div class="stat-label">死亡次数</div>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card shadow="hover" class="details-card">
          <template v-slot:header>
<div  class="card-header">
            <span>快捷操作</span>
          </div>
</template>
          
          <div class="action-list">
            <el-button 
              :type="world.status === 'running' ? 'danger' : 'success'" 
              icon="el-icon-video-play"
              class="action-button"
              :disabled="world.controlAvailable === false"
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
          <template v-slot:header>
<div  class="card-header">
            <span>最近活动</span>
          </div>
</template>
          
          <div class="activity-list">
            <el-empty description="暂无真实活动数据" :image-size="60" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { roomApi } from '../../api/index';

export default {
  name: 'WorldDetails',
  data() {
    return {
      loading: false,
      roomId: null,
      worldId: null,
      world: {
        id: null,
        name: '',
        type: 'unknown',
        season: null,
        day: null,
        status: 'unknown',
        description: '',
        controlAvailable: false
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
        query: { id: this.worldId, roomId: this.roomId, worldId: this.worldId }
      });
    },
    getStatusName(status) {
      if (status === 'running') return '运行中';
      if (status === 'stopped') return '已停止';
      return '未知';
    },
    getStatusTag(status) {
      if (status === 'running') return 'success';
      if (status === 'stopped') return 'info';
      return 'warning';
    },
    getTypeName(type) {
      if (type === 'forest' || type === 'master') return '主世界';
      if (type === 'cave') return '洞穴';
      return '其他';
    },
    getTypeTag(type) {
      if (type === 'forest' || type === 'master') return 'primary';
      if (type === 'cave') return 'success';
      return 'info';
    },
    toggleWorldStatus() {
      const action = this.world.status === 'running' ? '停止' : '启动';
      this.$confirm(`确定要${action}世界 "${this.world.name}" 吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
        const request = { room_id: this.roomId, world_id: this.worldId };
        const operation = this.world.status === 'running'
          ? roomApi.stopRoom(request)
          : roomApi.startRoom(request);
        operation
          .then(async response => {
            await this.loadWorldData();
            this.$message.success(response.msg || `${action}完成`);
          })
          .catch(error => this.$message.error(`${action}失败：${error.message}`))
          .finally(() => { this.loading = false; });
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
        roomApi.regenerateWorld({ room_id: this.roomId, world_id: this.worldId })
          .then(response => this.$message.success(response.msg))
          .catch(error => this.$message.error(error.message))
          .finally(() => { this.loading = false; });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作'
        });
      });
    },
    backupWorld() {
      this.$confirm(`v2 后端将备份世界 "${this.world.name}" 所属的整个房间 "${this.world.roomName}"，确定继续吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        this.loading = true;
        roomApi.backupRoom(this.roomId, `世界 ${this.world.name}`)
          .then(response => this.$message.success(response.msg || '房间备份已创建'))
          .catch(error => this.$message.error(`备份失败：${error.message}`))
          .finally(() => { this.loading = false; });
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
        roomApi.deleteWorld({ room_id: this.roomId, world_id: this.worldId })
          .then(response => {
            this.$message.success(response.msg);
            this.goBack();
          })
          .catch(error => this.$message.error(error.message))
          .finally(() => { this.loading = false; });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作'
        });
      });
    },
    loadWorldData() {
      if (!this.roomId || !this.worldId) return;
      this.loading = true;
      return Promise.all([
        roomApi.getRoomDetail(this.roomId),
        roomApi.getRoomWorlds(this.roomId)
      ])
        .then(([roomResponse, worlds]) => {
          const world = worlds.find(item => item.id === this.worldId);
          if (!world) throw new Error('未找到指定世界');
          this.world = {
            ...world,
            roomName: roomResponse.data.name,
            description: world.description || ''
          };
        })
        .catch(error => {
          this.$message.error(`获取世界详情失败：${error.message}`);
        })
        .finally(() => { this.loading = false; });
    }
  },
  created() {
    const { id, roomId, worldId } = this.$route.query;
    if (roomId && (worldId || id)) {
      this.roomId = roomId;
      this.worldId = worldId || id;
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
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 10px;
}

.info-label {
  width: 100px;
  color: var(--text-secondary);
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
  color: var(--primary-color);
}

.stat-label {
  color: var(--text-secondary);
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
  border-bottom: 1px solid var(--border-color);
}

.activity-time {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 5px;
}

.activity-content {
  color: var(--text-regular);
}
</style>
