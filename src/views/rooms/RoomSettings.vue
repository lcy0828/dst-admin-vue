<template>
  <div class="room-settings">
    <div class="settings-header">
      <div class="left">
        <h2>房间设置</h2>
      </div>
      <div class="right">
        <el-select 
          v-model="selectedRoom" 
          placeholder="请选择房间"
          filterable
          clearable
          @change="handleRoomChange"
          style="width: 300px; margin-right: 15px;">
          <el-option
            v-for="item in roomList"
            :key="item.id"
            :label="item.name"
            :value="item.id">
            <span style="float: left">{{ item.name }}</span>
            <span style="float: right; color: #8492a6; font-size: 13px">{{ item.description }}</span>
          </el-option>
        </el-select>
        <el-button @click="fetchRoomList" :loading="loading" icon="el-icon-refresh">刷新列表</el-button>
        <el-button type="primary" @click="saveSettings" icon="el-icon-check">保存设置</el-button>
        <el-button @click="goBack" icon="el-icon-back">返回列表</el-button>
      </div>
    </div>

    <div v-loading="loading" class="settings-content">
      <el-alert
        v-if="!selectedRoom"
        title="请先选择一个房间进行设置"
        type="info"
        :closable="false"
        show-icon>
      </el-alert>
      
      <div v-if="selectedRoom">
        <el-tabs v-model="activeTab" type="card">
          <el-tab-pane label="基本信息" name="basic">
            <el-form ref="roomForm" :model="roomForm" :rules="rules" label-width="120px">
              <el-form-item label="房间名称" prop="name">
                <el-input v-model="roomForm.name"></el-input>
              </el-form-item>
              <el-form-item label="房间描述" prop="description">
                <el-input type="textarea" v-model="roomForm.description" :rows="3"></el-input>
              </el-form-item>
              <el-form-item label="游戏模式">
                <el-select v-model="roomForm.mode" placeholder="请选择游戏模式">
                  <el-option label="生存模式" value="survival"></el-option>
                  <el-option label="野外模式" value="wilderness"></el-option>
                  <el-option label="无尽模式" value="endless"></el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="最大玩家数">
                <el-slider v-model="roomForm.maxPlayers" :marks="playerMarks" :min="1" :max="64" :step="1" show-stops></el-slider>
              </el-form-item>
              <el-form-item label="访问方式">
                <el-radio-group v-model="roomForm.access">
                  <el-radio label="public">公开</el-radio>
                  <el-radio label="friends">仅好友</el-radio>
                  <el-radio label="private">私有</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-form>
          </el-tab-pane>
          
          <el-tab-pane label="风格设置" name="style">
            <div class="style-settings">
              <div class="style-preview" :style="{
                backgroundColor: roomForm.style === 'custom' ? customStyle.backgroundColor : roomStyles.find(s => s.value === roomForm.style)?.color,
                color: roomForm.style === 'custom' ? customStyle.textColor : '#ffffff',
                borderColor: roomForm.style === 'custom' ? customStyle.borderColor : 'transparent'
              }">
                <h3>房间预览</h3>
                <p>{{ roomForm.name }}</p>
                <p>{{ roomForm.description }}</p>
              </div>
              
              <el-form label-width="120px">
                <el-form-item label="选择风格">
                  <el-radio-group v-model="roomForm.style">
                    <el-radio v-for="style in roomStyles" :key="style.value" :label="style.value">{{ style.label }}</el-radio>
                    <el-radio label="custom">自定义风格</el-radio>
                  </el-radio-group>
                </el-form-item>
                
                <template v-if="roomForm.style === 'custom'">
                  <el-form-item label="文字颜色">
                    <el-color-picker v-model="customStyle.textColor"></el-color-picker>
                  </el-form-item>
                  <el-form-item label="背景颜色">
                    <el-color-picker v-model="customStyle.backgroundColor"></el-color-picker>
                  </el-form-item>
                  <el-form-item label="边框颜色">
                    <el-color-picker v-model="customStyle.borderColor"></el-color-picker>
                  </el-form-item>
                </template>
              </el-form>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="高级设置" name="advanced">
            <el-form label-width="200px">
              <el-form-item label="启用PvP">
                <el-switch v-model="advancedSettings.pvpEnabled"></el-switch>
              </el-form-item>
              <el-form-item label="允许控制台命令">
                <el-switch v-model="advancedSettings.consoleEnabled"></el-switch>
              </el-form-item>
              <el-form-item label="自动保存">
                <el-switch v-model="advancedSettings.autoSave"></el-switch>
              </el-form-item>
              <el-form-item label="自动保存间隔(分钟)" v-if="advancedSettings.autoSave">
                <el-input-number v-model="advancedSettings.autoSaveInterval" :min="5" :max="60"></el-input-number>
              </el-form-item>
              <el-form-item label="启用密码保护">
                <el-switch v-model="advancedSettings.passwordProtected"></el-switch>
              </el-form-item>
              <el-form-item label="房间密码" v-if="advancedSettings.passwordProtected">
                <el-input v-model="advancedSettings.password" show-password></el-input>
              </el-form-item>
            </el-form>
          </el-tab-pane>
          
          <el-tab-pane label="特殊名单" name="specialLists">
            <special-lists v-if="selectedRoom && currentSavename" :savename="currentSavename" :key="`special-${currentSavename}`"></special-lists>
            <el-alert
              v-else
              title="请先选择一个房间才能管理特殊名单"
              type="warning"
              :closable="false"
              show-icon>
            </el-alert>
          </el-tab-pane>
          
          <el-tab-pane label="服务器令牌" name="serverToken">
            <server-token v-if="selectedRoom && currentSavename" :savename="currentSavename" :key="`token-${currentSavename}`"></server-token>
            <el-alert
              v-else
              title="请先选择一个房间才能管理服务器令牌"
              type="warning"
              :closable="false"
              show-icon>
            </el-alert>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </div>
</template>

<script>
import { roomApi } from '@/api/index';
import SpecialLists from './SpecialLists.vue';
import ServerToken from './ServerToken.vue';

export default {
  name: 'RoomSettings',
  components: {
    SpecialLists,
    ServerToken
  },
  data() {
    return {
      activeTab: 'basic',
      roomForm: {
        name: '饥荒联机版游戏房间',
        description: '欢迎加入我们的饥荒联机版游戏房间，在这里一起探索、生存、冒险！',
        style: 'default',
        mode: 'survival',
        maxPlayers: 16,
        access: 'public'
      },
      customStyle: {
        textColor: '#333333',
        backgroundColor: '#f9f9f9',
        borderColor: '#dcdfe6'
      },
      advancedSettings: {
        pvpEnabled: false,
        consoleEnabled: true,
        autoSave: true,
        autoSaveInterval: '15',
        passwordProtected: false,
        password: ''
      },
      roomStyles: [
        { value: 'default', label: '默认风格', color: '#f9f9f9' },
        { value: 'dark', label: '暗黑风格', color: '#333333' },
        { value: 'forest', label: '森林风格', color: '#2c7744' },
        { value: 'desert', label: '沙漠风格', color: '#e8c07d' },
        { value: 'winter', label: '冬季风格', color: '#a8d8ff' },
        { value: 'cave', label: '洞穴风格', color: '#514b4a' }
      ],
      playerMarks: {
        4: '4',
        8: '8',
        16: '16',
        32: '32',
        64: '64'
      },
      rules: {
        name: [
          { required: true, message: '请输入房间名称', trigger: 'blur' },
          { min: 3, max: 30, message: '长度在 3 到 30 个字符', trigger: 'blur' }
        ],
        description: [
          { max: 200, message: '描述不能超过200个字符', trigger: 'blur' }
        ]
      },
      selectedRoom: '',
      roomList: [],
      loading: false,
      currentSavename: ''
    }
  },
  methods: {
    saveSettings() {
      this.$refs.roomForm.validate((valid) => {
        if (valid) {
          // 显示加载提示
          const loading = this.$loading({
            lock: true,
            text: '正在保存房间设置...',
            spinner: 'el-icon-loading',
            background: 'rgba(0, 0, 0, 0.7)'
          });
          
          // 模拟API请求
          setTimeout(() => {
            loading.close();
            this.$message({
              message: '房间设置已保存',
              type: 'success'
            });
          }, 1000);
        } else {
          this.$message.error('表单验证失败，请检查输入');
          return false;
        }
      });
    },
    goBack() {
      this.$router.push('/rooms/list');
    },
    handleRoomChange(roomId) {
      if (!roomId) return;
      
      this.loading = true;
      this.loadRoomData(roomId);
    },
    loadRoomData(roomId) {
      // 获取房间详情信息
      this.loading = true;
      
      // 在真实环境中，这里应该调用API获取房间详情
      // roomApi.getRoomDetail(roomId).then(response => {
      
      // 模拟API调用
      setTimeout(() => {
        // 设置当前的savename，用于特殊名单和服务器令牌
        const selectedRoom = this.roomList.find(room => room.id === roomId);
        if (selectedRoom) {
          this.currentSavename = this.getSaveName(selectedRoom);
          
          // 更新表单数据
          this.roomForm.name = selectedRoom.name || '';
          this.roomForm.description = selectedRoom.description || '';
          // 更新其他字段...
          
          this.$message({
            message: `已加载房间: ${selectedRoom.name}`,
            type: 'success'
          });
        }
        
        this.loading = false;
      }, 1000);
    },
    fetchRoomList() {
      this.loading = true;
      
      // 调用API获取房间列表
      roomApi.getRoomList()
        .then(response => {
          console.log("房间列表API响应:", response);
          
          // 处理不同的响应格式
          if (Array.isArray(response)) {
            this.roomList = response.map(item => ({
              id: item.name || item.id,
              name: item.name,
              description: item.description,
              savepath: item.savepath
            }));
          } else if (response && response.data) {
            if (Array.isArray(response.data)) {
              this.roomList = response.data.map(item => ({
                id: item.name || item.id,
                name: item.name,
                description: item.description,
                savepath: item.savepath
              }));
            } else if (response.data.data && Array.isArray(response.data.data)) {
              this.roomList = response.data.data.map(item => ({
                id: item.name || item.id,
                name: item.name,
                description: item.description,
                savepath: item.savepath
              }));
            } else {
              throw new Error('返回数据格式不是预期的数组');
            }
          } else {
            throw new Error('API返回数据格式异常');
          }
          
          this.$message({
            message: '房间列表已刷新',
            type: 'success'
          });
        })
        .catch(error => {
          console.error("获取房间列表失败:", error);
          this.$message.error('获取房间列表失败: ' + (error.message || '未知错误'));
          
          // 临时测试数据
          this.roomList = [
            { id: 'room1', name: '生存房间', description: '基本生存房间', savepath: '/save/survival' },
            { id: 'room2', name: '创造房间', description: '创造模式房间', savepath: '/save/creative' },
            { id: 'room3', name: '冒险房间', description: '冒险模式房间', savepath: '/save/adventure' }
          ];
        })
        .finally(() => {
          this.loading = false;
        });
    },
    // 从房间信息中获取存档名称
    getSaveName(room) {
      // 如果savename直接存在，则使用它
      if (room.savename) {
        return room.savename;
      }
      
      // 否则从savepath中提取存档名称
      if (room.savepath) {
        // 假设savepath的格式为"/path/to/savename"
        const pathParts = room.savepath.split('/');
        return pathParts[pathParts.length - 1];
      }
      
      // 如果都不存在，使用房间名称作为存档名称
      return room.name;
    }
  },
  mounted() {
    // 获取URL中的房间ID
    const roomId = this.$route.query.id;
    if (roomId) {
      this.selectedRoom = roomId;
      this.loadRoomData(roomId);
    }
    
    // 获取房间列表
    this.fetchRoomList();
  }
}
</script>

<style scoped>
.room-settings {
  padding: 20px;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ebeef5;
}

.settings-header h2 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.settings-content {
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.style-settings {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.style-preview {
  padding: 20px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  margin-bottom: 20px;
  min-height: 150px;
  transition: all 0.3s ease;
}

.style-preview h3 {
  margin-top: 0;
}

/* 为不同房间风格定义样式 */
.room-style-default {
  background-color: #f9f9f9;
  color: #333333;
}

.room-style-dark {
  background-color: #333333;
  color: #ffffff;
}

.room-style-forest {
  background-color: #2c7744;
  color: #ffffff;
}

.room-style-desert {
  background-color: #e8c07d;
  color: #333333;
}

.room-style-winter {
  background-color: #a8d8ff;
  color: #333333;
}

.room-style-cave {
  background-color: #514b4a;
  color: #ffffff;
}

/* 颜色选择器样式 */
.color-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.room-selector-card {
  margin-bottom: 20px;
}

.room-selector {
  display: flex;
  align-items: center;
}

.selector-label {
  margin-right: 10px;
}
</style> 