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
            <el-radio label="unknown">仅其他世界</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="服务器模式">
          <el-radio-group v-model="formData.serverMode">
            <el-radio label="32" disabled>32位</el-radio>
            <el-radio label="64" disabled>64位</el-radio>
          </el-radio-group>
          <span class="mode-hint">v2 使用系统设置中的服务端位数</span>
        </el-form-item>
        
        <el-divider></el-divider>
        
        <!-- 世界列表预览 -->
        <div class="world-preview" v-if="room.worlds && room.worlds.length > 0">
          <h4>将启动以下世界:</h4>
          <div class="world-list">
            <template v-if="formData.worldType === 'all'">
              <div v-for="world in room.worlds" :key="world.name" class="world-item">
                <component :is="'el-icon-check'" class="legacy-icon" />
                <span>{{ world.name }}</span>
                <el-tag size="mini" :type="getWorldTagType(world.type)">
                  {{ getWorldTypeName(world.type) }}
                </el-tag>
              </div>
            </template>
            
            <template v-else-if="formData.worldType === 'forest'">
              <div v-for="world in forestWorlds" :key="world.name" class="world-item">
                <component :is="'el-icon-check'" class="legacy-icon" />
                <span>{{ world.name }}</span>
                <el-tag size="mini" type="primary">森林</el-tag>
              </div>
              <div v-if="forestWorlds.length === 0" class="no-worlds">
                <component :is="'el-icon-warning-outline'" class="legacy-icon" />
                <span>未找到森林世界</span>
              </div>
            </template>
            
            <template v-else-if="formData.worldType === 'cave'">
              <div v-for="world in caveWorlds" :key="world.name" class="world-item">
                <component :is="'el-icon-check'" class="legacy-icon" />
                <span>{{ world.name }}</span>
                <el-tag size="mini" type="success">洞穴</el-tag>
              </div>
              <div v-if="caveWorlds.length === 0" class="no-worlds">
                <component :is="'el-icon-warning-outline'" class="legacy-icon" />
                <span>未找到洞穴世界</span>
              </div>
            </template>
            
            <template v-else-if="formData.worldType === 'unknown'">
              <div v-for="world in unknownWorlds" :key="world.name" class="world-item">
                <component :is="'el-icon-check'" class="legacy-icon" />
                <span>{{ world.name }}</span>
                <el-tag size="mini" type="info">其他</el-tag>
              </div>
              <div v-if="unknownWorlds.length === 0" class="no-worlds">
                <component :is="'el-icon-warning-outline'" class="legacy-icon" />
                <span>未找到其他类型世界</span>
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
      <component :is="'el-icon-warning-outline'" class="legacy-icon" />
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
        serverMode: '64'
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
      return this.room.worlds.filter(world => world.type === 'forest');
    },
    caveWorlds() {
      if (!this.room || !this.room.worlds) return [];
      return this.room.worlds.filter(world => world.type === 'cave');
    },
    unknownWorlds() {
      if (!this.room || !this.room.worlds) return [];
      return this.room.worlds.filter(world => world.type === 'unknown');
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
    },
    getWorldTagType(type) {
      if (type === 'forest') return 'primary';
      if (type === 'cave') return 'success';
      return '';
    },
    getWorldTypeName(type) {
      if (type === 'forest') return '森林';
      if (type === 'cave') return '洞穴';
      return '其他世界';
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
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
      text-align: left;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border-color);
      
      &:after {
        display: none;
      }
    }
  }
  
  .world-preview {
    margin-top: 20px;
    
    h4 {
      font-size: 16px;
      margin-bottom: 12px;
      color: var(--text-regular);
    }
    
    .world-list {
      display: flex;
      gap: 8px;
      padding: 12px;
      background-color: var(--surface-muted);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      box-shadow: none;
      flex-direction: column;
      
      .world-item {
        margin: 0;
        display: flex;
        align-items: center;
        background-color: var(--surface-color);
        padding: 8px 12px;
        border: 1px solid var(--border-color);
        border-radius: 3px;
        box-shadow: none;
        
        i {
          color: #4f8a5b;
          margin-right: 8px;
        }
        
        span {
          flex: 1;
          font-weight: 500;
        }
      }
      
      .no-worlds {
        display: flex;
        align-items: center;
        color: #d99b32;
        background-color: #fdf6ec;
        padding: 10px 15px;
        border-radius: 6px;
        
        i {
          margin-right: 8px;
          font-size: 18px;
        }
      }
    }
  }

  .mode-hint {
    margin-left: 12px;
    color: #909399;
    font-size: 12px;
  }
  
  .form-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 20px;
    text-align: right;
    
    .el-button {
      padding: 10px 25px;
      border-radius: 4px;
      margin: 0;
    }
  }
  
  .error-message {
    text-align: center;
    padding: 30px 0;
    color: #c94f4f;
    
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
