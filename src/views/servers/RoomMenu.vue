<template>
  <div class="room-menu-page">
    <div class="page-header">
      <h2>房间管理</h2>
      <p>管理游戏房间的所有设置选项</p>
    </div>
    
    <el-row :gutter="20">
      <!-- 房间设置卡片 -->
      <el-col :span="8">
        <el-card shadow="hover" class="menu-card" @click.native="navigateTo('/servers/room')">
          <div class="card-icon">
            <i class="el-icon-setting"></i>
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
        <el-card shadow="hover" class="menu-card" @click.native="navigateTo('/servers/room/permissions')">
          <div class="card-icon permission-icon">
            <i class="el-icon-lock"></i>
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
        <el-card shadow="hover" class="menu-card" @click.native="navigateTo('/servers/room/gameplay')">
          <div class="card-icon gameplay-icon">
            <i class="el-icon-odometer"></i>
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
        <el-card shadow="hover" class="menu-card" @click.native="navigateTo('/servers/room/mods')">
          <div class="card-icon mods-icon">
            <i class="el-icon-s-grid"></i>
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
        <el-card shadow="hover" class="menu-card" @click.native="navigateTo('/servers/room/seasons')">
          <div class="card-icon seasons-icon">
            <i class="el-icon-sunny"></i>
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
        <el-card shadow="hover" class="menu-card" @click.native="navigateTo('/servers/room/world')">
          <div class="card-icon world-icon">
            <i class="el-icon-map-location"></i>
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
      <div slot="header" class="clearfix">
        <span>当前激活房间</span>
        <el-button style="float: right; padding: 3px 0" type="text" @click="refreshRooms">刷新列表</el-button>
      </div>
      
      <el-table :data="activeRooms" style="width: 100%">
        <el-table-column prop="name" label="房间名称"></el-table-column>
        <el-table-column prop="players" label="玩家数" width="100"></el-table-column>
        <el-table-column prop="mode" label="游戏模式" width="120"></el-table-column>
        <el-table-column prop="style" label="风格" width="100">
          <template slot-scope="scope">
            <div class="style-tag" :class="'style-' + scope.row.style">{{ scope.row.styleName }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '开放' ? 'success' : 'info'" size="mini">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template slot-scope="scope">
            <el-button type="text" size="small" @click="editRoom(scope.row)">编辑</el-button>
            <el-button type="text" size="small" @click="duplicateRoom(scope.row)">复制</el-button>
            <el-button type="text" size="small" class="danger-text" @click="deleteRoom(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="add-room-button">
        <el-button type="primary" icon="el-icon-plus" @click="createNewRoom">创建新房间</el-button>
      </div>
    </el-card>
  </div>
</template>

<script>
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
      ]
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
    editRoom(room) {
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
    }
  }
}
</script>

<style scoped>
.room-menu-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.menu-card {
  height: 200px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.menu-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.card-icon {
  width: 70px;
  height: 70px;
  border-radius: 35px;
  background-color: #409EFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  color: white;
  margin-bottom: 15px;
}

.permission-icon {
  background-color: #67C23A;
}

.gameplay-icon {
  background-color: #E6A23C;
}

.mods-icon {
  background-color: #F56C6C;
}

.seasons-icon {
  background-color: #909399;
}

.world-icon {
  background-color: #9C27B0;
}

.card-content {
  text-align: center;
}

.card-content h3 {
  margin: 0 0 10px 0;
  font-size: 18px;
}

.card-content p {
  color: #606266;
  font-size: 14px;
  margin-bottom: 15px;
}

.card-features {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
  color: #909399;
}

.card-features span {
  margin-bottom: 5px;
}

.active-rooms-card {
  margin-top: 20px;
}

.style-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.style-default {
  background-color: #f9f9f9;
  color: #333333;
  border: 1px solid #dcdfe6;
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
  background-color: #e3f2fd;
  color: #0d47a1;
}

.style-cave {
  background-color: #3e3e3e;
  color: #e0e0e0;
}

.danger-text {
  color: #F56C6C;
}

.danger-text:hover {
  color: #f78989;
}

.add-room-button {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .el-col {
    width: 50% !important;
    margin-bottom: 20px;
  }
}

@media (max-width: 768px) {
  .el-col {
    width: 100% !important;
  }
}
</style> 