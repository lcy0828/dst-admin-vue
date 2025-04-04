<template>
  <div class="start-room-form">
    <div v-if="room" class="form-container">
      <h3>启动房间: {{ room.name }}</h3>
      
      <el-form :model="formData" label-width="120px">
        <el-form-item label="启动模式">
          <el-radio-group v-model="formData.worldType">
            <el-radio label="all">所有世界</el-radio>
            <el-radio label="forest">仅森林世界</el-radio>
            <el-radio label="cave">仅洞穴世界</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="服务器模式">
          <el-radio-group v-model="formData.serverMode">
            <el-radio label="32">普通模式</el-radio>
            <el-radio label="64">专家模式</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-divider></el-divider>
        
        <!-- 世界列表预览 -->
        <div class="world-preview" v-if="room.worlds && room.worlds.length > 0">
          <h4>将启动以下世界:</h4>
          <div class="world-list">
            <template v-if="formData.worldType === 'all'">
              <div v-for="world in room.worlds" :key="world.name" class="world-item">
                <i class="el-icon-check"></i>
                <span>{{ world.name }}</span>
                <el-tag size="mini" :type="world.type === 'forest' ? 'primary' : 'success'">
                  {{ world.type === 'forest' ? '森林' : '洞穴' }}
                </el-tag>
              </div>
              <div v-if="room.worlds.length === 0" class="no-worlds">
                <i class="el-icon-warning-outline"></i>
                <span>未找到世界，将使用默认世界 (Forest1 和 Caves1)</span>
              </div>
            </template>
            
            <template v-else-if="formData.worldType === 'forest'">
              <div v-for="world in forestWorlds" :key="world.name" class="world-item">
                <i class="el-icon-check"></i>
                <span>{{ world.name }}</span>
                <el-tag size="mini" type="primary">森林</el-tag>
              </div>
              <div v-if="forestWorlds.length === 0" class="no-worlds">
                <i class="el-icon-warning-outline"></i>
                <span>未找到森林世界，将使用默认世界 (Forest1)</span>
              </div>
            </template>
            
            <template v-else-if="formData.worldType === 'cave'">
              <div v-for="world in caveWorlds" :key="world.name" class="world-item">
                <i class="el-icon-check"></i>
                <span>{{ world.name }}</span>
                <el-tag size="mini" type="success">洞穴</el-tag>
              </div>
              <div v-if="caveWorlds.length === 0" class="no-worlds">
                <i class="el-icon-warning-outline"></i>
                <span>未找到洞穴世界，将使用默认世界 (Caves1)</span>
              </div>
            </template>
          </div>
        </div>
      </el-form>
      
      <div class="form-actions">
        <el-button @click="$emit('close')">取消</el-button>
        <el-button type="primary" @click="handleConfirm" :loading="loading">启动</el-button>
      </div>
    </div>
    
    <div v-else class="error-message">
      <i class="el-icon-warning-outline"></i>
      <p>无法加载房间信息</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StartRoomForm',
  props: {
    room: {
      type: Object,
      required: true
    },
    startForm: {
      type: Object,
      default: () => ({
        worldType: 'all',
        serverMode: '32'
      })
    }
  },
  data() {
    return {
      formData: {
        worldType: this.startForm.worldType,
        serverMode: this.startForm.serverMode
      },
      loading: false
    }
  },
  computed: {
    forestWorlds() {
      if (!this.room || !this.room.worlds) return [];
      return this.room.worlds.filter(world => {
        const worldType = world.type || (world.name && world.name.includes('Forest') ? 'forest' : 'cave');
        return worldType === 'forest';
      });
    },
    caveWorlds() {
      if (!this.room || !this.room.worlds) return [];
      return this.room.worlds.filter(world => {
        const worldType = world.type || (world.name && world.name.includes('Forest') ? 'forest' : 'cave');
        return worldType === 'cave';
      });
    }
  },
  watch: {
    startForm: {
      handler(newVal) {
        this.formData = { ...newVal };
      },
      deep: true
    }
  },
  methods: {
    handleConfirm() {
      // 更新父组件的表单数据
      Object.assign(this.startForm, this.formData);
      // 触发确认事件
      this.$emit('confirm');
    }
  }
}
</script>

<style lang="scss" scoped>
.start-room-form {
  .form-container {
    padding: 10px 0;
    
    h3 {
      margin-top: 0;
      margin-bottom: 20px;
    }
  }
  
  .world-preview {
    margin-top: 20px;
    
    h4 {
      font-size: 14px;
      margin-bottom: 10px;
    }
    
    .world-list {
      background-color: #f8f8f8;
      border-radius: 4px;
      padding: 10px;
      
      .world-item {
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        
        i {
          color: #67C23A;
          margin-right: 8px;
        }
        
        span {
          flex: 1;
        }
      }
      
      .no-worlds {
        display: flex;
        align-items: center;
        color: #E6A23C;
        
        i {
          margin-right: 8px;
        }
      }
    }
  }
  
  .form-actions {
    margin-top: 30px;
    text-align: right;
  }
  
  .error-message {
    text-align: center;
    padding: 30px 0;
    color: #F56C6C;
    
    i {
      font-size: 36px;
      margin-bottom: 10px;
    }
    
    p {
      margin: 0;
    }
  }
}
</style> 