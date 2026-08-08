<template>
  <div class="room-menu-page">
    <div class="page-header">
      <h2>房间管理</h2>
      <p>管理游戏房间的所有设置选项</p>
    </div>
    
    <el-row :gutter="20">
      <!-- 房间设置卡片 -->
      <el-col :span="8">
        <el-card shadow="hover" class="menu-card" @click="navigateTo('/servers/room')">
          <div class="card-icon">
            <component :is="'el-icon-setting'" class="legacy-icon" />
          </div>
          <div class="card-content">
            <h3>基本设置</h3>
            <p>配置房间的基本信息和样式</p>
            <div class="card-features">
              <span>• 房间名称</span>
              <span>• 房间描述</span>
              <span>• 房间风格</span>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <!-- 房间权限卡片 -->
      <el-col :span="8">
        <el-card shadow="hover" class="menu-card" @click="navigateTo('/servers/room/permissions')">
          <div class="card-icon permission-icon">
            <component :is="'el-icon-lock'" class="legacy-icon" />
          </div>
          <div class="card-content">
            <h3>权限设置</h3>
            <p>管理房间的访问权限和玩家权限</p>
            <div class="card-features">
              <span>• 访问控制</span>
              <span>• 玩家权限</span>
              <span>• 白名单管理</span>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <!-- 房间游戏设置卡片 -->
      <el-col :span="8">
        <el-card shadow="hover" class="menu-card" @click="navigateTo('/servers/room/gameplay')">
          <div class="card-icon gameplay-icon">
            <component :is="'el-icon-odometer'" class="legacy-icon" />
          </div>
          <div class="card-content">
            <h3>游戏设置</h3>
            <p>调整房间的游戏规则和难度设置</p>
            <div class="card-features">
              <span>• 游戏模式</span>
              <span>• 难度设置</span>
              <span>• 资源设置</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <el-row :gutter="20" style="margin-top: 20px;">
      <!-- 房间模组设置卡片 -->
      <el-col :span="8">
        <el-card shadow="hover" class="menu-card" @click="navigateTo('/servers/room/mods')">
          <div class="card-icon mods-icon">
            <component :is="'el-icon-s-grid'" class="legacy-icon" />
          </div>
          <div class="card-content">
            <h3>模组设置</h3>
            <p>管理房间使用的模组和配置</p>
            <div class="card-features">
              <span>• 模组选择</span>
              <span>• 模组配置</span>
              <span>• 模组兼容性</span>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <!-- 房间季节设置卡片 -->
      <el-col :span="8">
        <el-card shadow="hover" class="menu-card" @click="navigateTo('/servers/room/seasons')">
          <div class="card-icon seasons-icon">
            <component :is="'el-icon-sunny'" class="legacy-icon" />
          </div>
          <div class="card-content">
            <h3>季节设置</h3>
            <p>调整房间的季节时长和天气设置</p>
            <div class="card-features">
              <span>• 季节长度</span>
              <span>• 天气效果</span>
              <span>• 特殊事件</span>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <!-- 房间世界设置卡片 -->
      <el-col :span="8">
        <el-card shadow="hover" class="menu-card" @click="navigateTo('/servers/room/world')">
          <div class="card-icon world-icon">
            <component :is="'el-icon-map-location'" class="legacy-icon" />
          </div>
          <div class="card-content">
            <h3>世界设置</h3>
            <p>配置世界生成和资源分布</p>
            <div class="card-features">
              <span>• 地图大小</span>
              <span>• 资源分布</span>
              <span>• 地形设置</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 激活房间卡片 -->
    <el-card shadow="hover" class="active-rooms-card" style="margin-top: 20px;">
      <template v-slot:header>
<div  class="clearfix">
        <span>当前激活房间</span>
        <el-button style="float: right; padding: 3px 0" type="text" @click="refreshRooms">刷新列表</el-button>
      </div>
</template>
      
      <el-table :data="activeRooms" style="width: 100%">
        <el-table-column prop="name" label="房间名称"></el-table-column>
        <el-table-column prop="players" label="玩家数" width="100"></el-table-column>
        <el-table-column prop="mode" label="游戏模式" width="120"></el-table-column>
        <el-table-column prop="style" label="风格" width="100">
          <template v-slot="scope">
            <div class="style-tag" :class="'style-' + scope.row.style">{{ scope.row.styleName }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template v-slot="scope">
            <el-tag :type="scope.row.status === '开放' ? 'success' : 'info'" size="mini">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250">
          <template v-slot="scope">
            <el-button type="text" size="small" @click="editRoom(scope.row)">编辑</el-button>
            <el-button type="text" size="small" @click="startRoom(scope.row)">启动</el-button>
            <el-button type="text" size="small" @click="duplicateRoom(scope.row)">复制</el-button>
            <el-button type="text" size="small" class="danger-text" @click="deleteRoom(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="add-room-button">
        <el-button type="primary" icon="el-icon-plus" @click="createNewRoom">创建新房间</el-button>
      </div>
    </el-card>

    <el-dialog
      title="启动房间服务器"
      v-model="startRoomDialogVisible"
      width="500px"
      :close-on-click-modal="false"
      custom-class="start-room-dialog">
      <div v-if="currentRoom" class="start-room-dialog-content">
        <div class="room-info">
          <component :is="'el-icon-video-play'" class="legacy-icon" />
          <p>您正在启动房间：<strong>{{ currentRoom.name }}</strong></p>
        </div>
        
        <el-form :model="startForm" label-width="120px">
          <el-form-item label="启动模式">
            <el-radio-group v-model="startForm.worldType">
              <el-radio label="both">完整房间（主世界+洞穴）</el-radio>
              <el-radio label="forest">仅主世界</el-radio>
              <el-radio label="cave">仅洞穴</el-radio>
              <el-radio label="unknown">仅其他世界</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item label="服务器模式">
            <el-select v-model="startForm.serverMode" placeholder="选择服务器模式">
              <el-option label="普通模式" value="32"></el-option>
              <el-option label="专家模式" value="64"></el-option>
            </el-select>
          </el-form-item>
        </el-form>
      </div>
      <template v-slot:footer>
<div  class="dialog-footer">
        <el-button @click="startRoomDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmStartRoom" :loading="startLoading">启动</el-button>
      </div>
</template>
    </el-dialog>
  </div>
</template>

<script>
import { roomApi } from '@/api/index';

export default {
  name: 'RoomMenu',
  data() {
    return {
      activeRooms: [
        {
          id: 1,
          name: '饥荒联机版主世界',
          players: '12/20',
          mode: '生存模式',
          style: 'default',
          styleName: '默认风格',
          status: '开放'
        },
        {
          id: 2,
          name: '洞穴探险',
          players: '8/16',
          mode: '冒险模式',
          style: 'cave',
          styleName: '洞穴风格',
          status: '开放'
        },
        {
          id: 3,
          name: '永冬世界',
          players: '5/10',
          mode: '困难模式',
          style: 'winter',
          styleName: '冬季风格',
          status: '开放'
        },
        {
          id: 4,
          name: '测试房间',
          players: '1/8',
          mode: '创造模式',
          style: 'desert',
          styleName: '沙漠风格',
          status: '关闭'
        }
      ],
      startRoomDialogVisible: false,
      startForm: {
        worldType: 'both',
        serverMode: '32'
      },
      currentRoom: null,
      startLoading: false
    }
  },
  methods: {
    navigateTo(path) {
      this.$router.push(path);
    },
    refreshRooms() {
      this.$message({
        message: '房间列表已刷新',
        type: 'success'
      });
    },
    editRoom() {
      this.$router.push('/servers/room');
      // 可以传递房间ID作为参数，以便加载特定房间的设置
      // this.$router.push({ path: '/servers/room', query: { id: room.id } });
    },
    duplicateRoom(room) {
      this.$confirm(`确定要复制房间 "${room.name}" 吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        this.$message({
          type: 'success',
          message: `已复制房间 ${room.name}`
        });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作'
        });          
      });
    },
    deleteRoom(room) {
      this.$confirm(`确定要删除房间 "${room.name}" 吗? 此操作不可恢复!`, '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.$message({
          type: 'success',
          message: `已删除房间 ${room.name}`
        });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作'
        });          
      });
    },
    createNewRoom() {
      this.$router.push('/servers/room');
    },
    startRoom(room) {
      this.currentRoom = room;
      this.startRoomDialogVisible = true;
    },
    confirmStartRoom() {
      if (!this.currentRoom || !this.currentRoom.id) {
        this.$message.error('无法获取房间信息');
        return;
      }
      this.startLoading = true;
      const archiveName = this.currentRoom.id.toString();
      const { worldType, serverMode } = this.startForm;
      
      if (worldType === 'both') {
        // 获取所有世界列表，然后为每个世界发起请求
        roomApi.getRoomWorlds(archiveName)
          .then(worlds => {
            if (!worlds || worlds.length === 0) {
              // 如果没有找到世界，则默认启动Forest1和Caves1
              const startPromises = [
                roomApi.startRoom({
                  archive_name: archiveName,
                  world_name: "Forest1",
                  server_mode: serverMode,
                  world_type: "forest"
                }),
                roomApi.startRoom({
                  archive_name: archiveName,
                  world_name: "Caves2",
                  server_mode: serverMode,
                  world_type: "cave"
                })
              ];
              return Promise.all(startPromises);
            } else {
              // 为每个世界单独发起请求
              const startPromises = worlds.map(world => {
                // 使用API返回的type字段，对于unknown类型的世界，根据名称推断类型
                let worldType = world.type;
                // 对于unknown类型，如果需要启动，需要推断一个有效的type(forest或cave)
                if (worldType === 'unknown') {
                  worldType = world.name.toLowerCase().includes('forest') ? 'forest' : 'cave';
                }
                
                return roomApi.startRoom({
                  archive_name: archiveName,
                  world_name: world.worldName || world.name,
                  server_mode: serverMode,
                  world_type: worldType
                });
              });
              return Promise.all(startPromises);
            }
          })
          .then(() => {
            this.$message.success('房间启动成功');
          })
          .catch(error => {
            this.$message.error('启动房间失败: ' + (error.message || '未知错误'));
          })
          .finally(() => {
            this.startRoomDialogVisible = false;
            this.startLoading = false;
          });
      } else if (worldType === 'unknown') {
        // 处理特殊情况：用户选择启动unknown类型的世界
        roomApi.getRoomWorlds(archiveName)
          .then(worlds => {
            // 过滤出unknown类型的世界
            const filteredWorlds = worlds.filter(world => world.type === 'unknown');
            if (filteredWorlds.length === 0) {
              this.$message.warning('没有找到其他类型的世界');
              this.startLoading = false;
              this.startRoomDialogVisible = false;
              return;
            }
            
            // 为每个unknown世界启动，根据名称推断类型
            const startPromises = filteredWorlds.map(world => {
              const inferredType = world.name.toLowerCase().includes('forest') ? 'forest' : 'cave';
              return roomApi.startRoom({
                archive_name: archiveName,
                world_name: world.worldName || world.name,
                server_mode: serverMode,
                world_type: inferredType
              });
            });
            
            return Promise.all(startPromises);
          })
          .then(responses => {
            if (responses) {
              this.$message.success('其他类型世界启动成功');
            }
          })
          .catch(error => {
            this.$message.error('启动世界失败: ' + (error.message || '未知错误'));
          })
          .finally(() => {
            this.startRoomDialogVisible = false;
            this.startLoading = false;
          });
      } else {
        roomApi.getRoomWorlds(archiveName)
          .then(worlds => {
            // 严格使用API返回的type字段进行过滤
            const filteredWorlds = worlds.filter(world => world.type === worldType);
            if (filteredWorlds.length === 0) {
              const defaultWorldName = worldType === 'forest' ? 'Forest1' : 'Caves1';
              return roomApi.startRoom({
                archive_name: archiveName,
                world_name: defaultWorldName,
                server_mode: serverMode,
                world_type: worldType
              });
            } else {
              const worldToStart = filteredWorlds[0];
              return roomApi.startRoom({
                archive_name: archiveName,
                world_name: worldToStart.worldName || worldToStart.name,
                server_mode: serverMode,
                world_type: worldToStart.type
              });
            }
          })
          .then(response => {
            if (response && (response.status === 200 || (response.data && response.data.status === 200))) {
              this.$message.success(`${worldType === 'forest' ? '主世界' : '洞穴世界'}启动成功`);
            } else {
              this.$message.error(response && response.msg ? response.msg : '启动世界失败');
            }
          })
          .catch(error => {
            this.$message.error('启动世界失败: ' + (error.message || '未知错误'));
          })
          .finally(() => {
            this.startRoomDialogVisible = false;
            this.startLoading = false;
          });
      }
    }
  }
}
</script>

<style scoped>
.room-menu-page {
  width: 100%;
  min-width: 0;
}

.page-header {
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-color);
}

.page-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 28px;
}

.page-header p {
  margin: 2px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.menu-card {
  height: 164px;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
  display: flex;
  align-items: flex-start;
  padding: 16px;
  border-radius: 4px;
  box-shadow: none;
}

.menu-card:hover {
  transform: none;
  border-color: var(--el-color-primary-light-5);
  box-shadow: none;
}

.card-icon {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 4px;
  background-color: var(--el-color-primary-light-9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--primary-color);
  margin-right: 12px;
}

.permission-icon,
.gameplay-icon,
.mods-icon,
.seasons-icon,
.world-icon {
  background-color: var(--surface-muted);
  color: var(--text-regular);
}

.card-content {
  min-width: 0;
  text-align: left;
}

.card-content h3 {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
}

.card-content p {
  color: var(--text-regular);
  font-size: 13px;
  margin: 0 0 10px;
}

.card-features {
  display: flex;
  gap: 5px 10px;
  align-items: flex-start;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--text-secondary);
}

.card-features span {
  margin: 0;
}

.active-rooms-card {
  margin-top: 16px;
  border-radius: 4px;
  box-shadow: none;
}

.style-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
}

.style-default {
  background-color: #f9f9f9;
  color: #333333;
  border: 1px solid var(--el-border-color);
}

.style-dark {
  background-color: #333333;
  color: #ffffff;
}

.style-forest {
  background-color: #e8f5e9;
  color: #1b5e20;
}

.style-desert {
  background-color: #fff8e1;
  color: #ff8f00;
}

.style-winter {
  background-color: #edf6ee;
  color: #326343;
}

.style-cave {
  background-color: #3e3e3e;
  color: #e0e0e0;
}

.danger-text {
  color: #c94f4f;
}

.danger-text:hover {
  color: #f78989;
}

.add-room-button {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .room-menu-page > .el-row > .el-col {
    width: 50% !important;
    margin-bottom: 16px;
  }
}

@media (max-width: 768px) {
  .room-menu-page > .el-row > .el-col {
    width: 100% !important;
  }

  .menu-card {
    height: auto;
    min-height: 136px;
  }
}

.start-room-dialog {
  border-radius: 4px;
  overflow: hidden;
  
  .start-room-dialog-content {
    .room-info {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px dashed var(--border-color);
      
      i {
        font-size: 24px;
        color: #4f8a5b;
        margin-right: 10px;
      }
      
      p {
        margin: 0;
        font-size: 16px;
        
        strong {
          color: var(--primary-color);
        }
      }
    }
  }
}
</style>
