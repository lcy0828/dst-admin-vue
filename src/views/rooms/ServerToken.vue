<template>
  <div class="server-token-page">
    <div class="page-header" v-if="!savename">
      <h2>服务器令牌管理</h2>
    </div>
    
    <el-card shadow="hover" class="token-card" v-loading="loading">
      <div slot="header" class="card-header">
        <span>服务器令牌</span>
        <div v-if="serverToken">
          <el-button 
            size="small" 
            type="primary" 
            icon="el-icon-edit" 
            @click="showTokenDialog" >
            修改令牌
          </el-button>
          <el-button 
            size="small" 
            type="success" 
            icon="el-icon-refresh" 
            @click="fetchServerToken">
            刷新
          </el-button>
        </div>
      </div>
      
      <div v-if="serverToken" class="token-info">
        <div class="token-display">
          <el-input
            ref="tokenInput"
            :value="serverToken"
            readonly
            style="width: 100%;"
            size="medium">
            <template slot="append">
              <el-button @click="copyToken">复制</el-button>
            </template>
          </el-input>
        </div>
        
        <div class="token-help">
          <el-alert
            title="令牌用法说明"
            type="info"
            description="服务器令牌用于在您的服务器中标识饥荒服务器。更改令牌将导致您的服务器在玩家列表中显示为新服务器。若无特殊需求，建议保持默认令牌。"
            show-icon
            :closable="false">
          </el-alert>
        </div>
      </div>

      <div v-else>
        <el-form :model="ruleForm" :rules="rules" ref="ruleForm" label-width="100px">
          <el-form-item label="服务器令牌" prop="token">
            <el-input v-model="ruleForm.token" placeholder="请输入服务器令牌" @input="handleInput"/>
          </el-form-item>
        </el-form>

        <div class="token-help">
          <el-alert
            title="令牌用法说明"
            type="info"
            description="服务器令牌用于在您的服务器中标识饥荒服务器。示例: pds-g^KU_HQpffVs^dasdadadawqwqfrdgth5435gf="
            show-icon
            :closable="false">
          </el-alert>
        </div>
      </div>
    </el-card>
    
    <!-- 修改令牌对话框 -->
    <el-dialog title="修改服务器令牌" 
               :visible.sync="dialogVisible" 
               width="30%" 
               @closed="resetForm">
      <el-form :model="tokenForm" ref="tokenForm">
        <el-form-item prop="token">
          <el-input v-model="tokenForm.token" placeholder="请输入新令牌"></el-input>
        </el-form-item>
        <div class="dialog-warning">
          <el-alert
            title="警告"
            type="warning"
            description="修改服务器令牌会导致您的服务器在玩家列表中显示为新服务器。确定要继续吗？"
            show-icon
            :closable="false">
          </el-alert>
        </div>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitTokenForm" :loading="submitting">确定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { serverApi } from '@/api/index';

export default {
  name: 'ServerToken',
  props: {
    savename: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      currentSave: '',
      serverToken: '',
      loading: false,
      
      // 对话框相关
      dialogVisible: false,
      tokenForm: {
        token: ''
      },
      submitting: false,

      // 表单相关
      ruleForm: {
        token: ''
      },
      rules: {
        token: [
          { required: true, message: '请输入服务器令牌', trigger: 'blur' },
          { min: 3, max: 32, message: '长度在 3 到 32 个字符', trigger: 'blur' }
        ]
      }
      
    };
  },
  watch: {
    savename: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          this.currentSave = newVal;
        }
      }
    }
  },
  methods: {
    handleInput() {
      this.$emit('input-token', this.ruleForm.token);
    },
    
    // 获取服务器令牌
    fetchServerToken() {
      const saveToUse = this.savename || this.currentSave;
      if (!saveToUse) return;
      
      this.loading = true;
      serverApi.getServerToken(saveToUse)
        .then(res => {
          this.serverToken = res.data;
          this.$emit('input-token', this.serverToken);
        })
        .catch(err => {
          this.$message.error('获取服务器令牌失败');
        })
        .finally(() => {
          this.loading = false;
        });
    },
    
    // 复制令牌到剪贴板
    copyToken() {
      const input = this.$refs.tokenInput.$el.querySelector('input');
      input.select();
      document.execCommand('copy');
      this.$message.success('令牌已复制到剪贴板');
    },
    
    // 显示修改令牌对话框
    showTokenDialog() {
      this.tokenForm = {
        token: ''
      };
      this.dialogVisible = true;
    },
    
    // 重置表单
    resetForm() {
      if (this.$refs.tokenForm) {
        this.$refs.tokenForm.resetFields();
      }
      this.tokenForm = {
        token: ''
      };
    },
    
    // 提交表单
    submitTokenForm() {
      if (!this.tokenForm.token) {
        this.$message.error('请输入服务器令牌');
        return;
      }
      this.submitting = true;
      const saveToUse = this.savename || this.currentSave;
      const newToken = this.tokenForm.token;
      serverApi.updateServerToken(saveToUse, newToken)
        .then(res => {
          this.dialogVisible = false;
          this.$message.success('服务器令牌已更新');
        })
        .catch(err => {
          this.$message.error('更新令牌失败: ' + (err.message || '未知错误'));
          this.dialogVisible = false;
        })
        .finally(() => {
          this.submitting = false;
          this.fetchServerToken();
        });
    },
    
    
    // 格式化时间
  
    // 格式化时间
    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
  },
  mounted() {
    if (this.savename) {
      this.currentSave = this.savename;
      this.fetchServerToken();
    }
  }
}
</script>

<style scoped>
.server-token-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.save-selector {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.token-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.token-display {
  margin-bottom: 15px;
}

.token-help {
  margin-top: 10px;
}

.token-note {
  margin-top: 15px;
  color: #909399;
  display: flex;
  align-items: center;
  font-size: 14px;
}

.token-note i {
  margin-right: 5px;
}

.empty-token {
  text-align: center;
  padding: 30px 0;
  color: #909399;
}

.empty-token i {
  font-size: 40px;
  margin-bottom: 10px;
}

.dialog-warning {
  margin-top: 20px;
}
</style> 