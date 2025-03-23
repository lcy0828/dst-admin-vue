<template>
  <div class="room-settings-page">
    <div class="page-header">
      <h2>房间设置</h2>
      <p>配置游戏房间的基本信息和风格设置</p>
    </div>
    
    <el-card class="settings-card">
      <div slot="header" class="card-header">
        <span>基本信息设置</span>
        <el-button style="float: right; padding: 3px 0" type="text" @click="saveSettings">保存设置</el-button>
      </div>
      
      <el-form :model="roomForm" label-width="100px" :rules="rules" ref="roomForm">
        <el-form-item label="房间名称" prop="name">
          <el-input v-model="roomForm.name" placeholder="请输入房间名称"></el-input>
        </el-form-item>
        
        <el-form-item label="房间描述" prop="description">
          <el-input type="textarea" v-model="roomForm.description" placeholder="请输入房间描述" :rows="4"></el-input>
        </el-form-item>
        
        <el-form-item label="房间风格" prop="style">
          <el-select v-model="roomForm.style" placeholder="请选择房间风格" style="width: 100%">
            <el-option v-for="item in roomStyles" :key="item.value" :label="item.label" :value="item.value">
              <div class="style-option">
                <div class="style-color" :style="{ backgroundColor: item.color }"></div>
                <span>{{ item.label }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="预览">
          <div class="room-preview" :class="'room-style-' + roomForm.style">
            <div class="preview-header">{{ roomForm.name || '房间名称' }}</div>
            <div class="preview-content">{{ roomForm.description || '房间描述内容' }}</div>
          </div>
        </el-form-item>
        
        <el-form-item label="高级设置">
          <el-collapse>
            <el-collapse-item title="自定义样式设置" name="1">
              <el-form-item label="文字颜色">
                <el-color-picker v-model="customStyle.textColor" show-alpha></el-color-picker>
              </el-form-item>
              <el-form-item label="背景颜色">
                <el-color-picker v-model="customStyle.backgroundColor" show-alpha></el-color-picker>
              </el-form-item>
              <el-form-item label="边框样式">
                <el-select v-model="customStyle.borderStyle" placeholder="请选择边框样式">
                  <el-option label="无边框" value="none"></el-option>
                  <el-option label="实线边框" value="solid"></el-option>
                  <el-option label="虚线边框" value="dashed"></el-option>
                  <el-option label="点线边框" value="dotted"></el-option>
                </el-select>
              </el-form-item>
            </el-collapse-item>
          </el-collapse>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'RoomSettings',
  data() {
    return {
      roomForm: {
        name: '饥荒联机版游戏房间',
        description: '欢迎加入我们的饥荒联机版游戏房间，在这里一起探索、生存、冒险！',
        style: 'default'
      },
      customStyle: {
        textColor: '#333333',
        backgroundColor: '#f9f9f9',
        borderStyle: 'solid'
      },
      roomStyles: [
        { value: 'default', label: '默认风格', color: '#f9f9f9' },
        { value: 'dark', label: '暗黑风格', color: '#333333' },
        { value: 'forest', label: '森林风格', color: '#2c7744' },
        { value: 'desert', label: '沙漠风格', color: '#e8c07d' },
        { value: 'winter', label: '冬季风格', color: '#a8d8ff' },
        { value: 'cave', label: '洞穴风格', color: '#514b4a' }
      ],
      rules: {
        name: [
          { required: true, message: '请输入房间名称', trigger: 'blur' },
          { min: 3, max: 30, message: '长度在 3 到 30 个字符', trigger: 'blur' }
        ],
        description: [
          { max: 200, message: '描述不能超过200个字符', trigger: 'blur' }
        ]
      }
    }
  },
  methods: {
    saveSettings() {
      this.$refs.roomForm.validate((valid) => {
        if (valid) {
          this.$message({
            message: '房间设置已保存',
            type: 'success'
          });
          // 这里可以添加API调用，将设置保存到后端
        } else {
          this.$message.error('表单验证失败，请检查输入');
          return false;
        }
      });
    }
  }
}
</script>

<style scoped>
.room-settings-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.settings-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.style-option {
  display: flex;
  align-items: center;
}

.style-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  margin-right: 10px;
}

.room-preview {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 15px;
  background-color: #f9f9f9;
  min-height: 150px;
}

.preview-header {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
  border-bottom: 1px solid #eaeaea;
  padding-bottom: 10px;
}

.preview-content {
  font-size: 14px;
  color: #606266;
}

/* 不同风格的房间预览 */
.room-style-dark {
  background-color: #333333;
  color: #ffffff;
}

.room-style-dark .preview-header {
  border-bottom-color: #555555;
}

.room-style-dark .preview-content {
  color: #cccccc;
}

.room-style-forest {
  background-color: #e8f5e9;
  color: #1b5e20;
}

.room-style-forest .preview-header {
  border-bottom-color: #c8e6c9;
}

.room-style-forest .preview-content {
  color: #388e3c;
}

.room-style-desert {
  background-color: #fff8e1;
  color: #ff8f00;
}

.room-style-desert .preview-header {
  border-bottom-color: #ffecb3;
}

.room-style-desert .preview-content {
  color: #ff6f00;
}

.room-style-winter {
  background-color: #e3f2fd;
  color: #0d47a1;
}

.room-style-winter .preview-header {
  border-bottom-color: #bbdefb;
}

.room-style-winter .preview-content {
  color: #1976d2;
}

.room-style-cave {
  background-color: #3e3e3e;
  color: #e0e0e0;
}

.room-style-cave .preview-header {
  border-bottom-color: #4a4a4a;
}

.room-style-cave .preview-content {
  color: #bdbdbd;
}
</style> 