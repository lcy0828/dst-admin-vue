<template>
  <div class="page-container">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card class="main-card">
          <div slot="header" class="clearfix">
            <span>系统设置</span>
            <el-button style="float: right; padding: 3px 0" type="text" @click="loadSettings">刷新</el-button>
          </div>
          
          <el-form :model="settings" :rules="rules" ref="settingsForm" label-width="160px" v-loading="loading">
            <el-tabs v-model="activeTab">
              <!-- 基本设置 -->
              <el-tab-pane label="基本设置" name="basic">
                <el-form-item label="管理系统名称" prop="systemName">
                  <el-input v-model="settings.systemName" placeholder="请输入管理系统名称"></el-input>
                </el-form-item>
                
                <el-form-item label="管理员联系邮箱" prop="adminEmail">
                  <el-input v-model="settings.adminEmail" placeholder="请输入管理员联系邮箱"></el-input>
                </el-form-item>
                
                <el-form-item label="系统语言" prop="language">
                  <el-select v-model="settings.language" placeholder="请选择系统语言" style="width: 100%">
                    <el-option label="简体中文" value="zh-CN"></el-option>
                    <el-option label="English" value="en-US"></el-option>
                    <el-option label="日本語" value="ja-JP"></el-option>
                  </el-select>
                </el-form-item>
                
                <el-form-item label="时区设置" prop="timezone">
                  <el-select v-model="settings.timezone" placeholder="请选择时区" style="width: 100%">
                    <el-option label="(GMT+08:00) 北京时间" value="Asia/Shanghai"></el-option>
                    <el-option label="(GMT+00:00) 协调世界时" value="UTC"></el-option>
                    <el-option label="(GMT-08:00) 太平洋标准时间" value="America/Los_Angeles"></el-option>
                    <el-option label="(GMT-05:00) 东部标准时间" value="America/New_York"></el-option>
                    <el-option label="(GMT+01:00) 中欧标准时间" value="Europe/Berlin"></el-option>
                    <el-option label="(GMT+09:00) 日本标准时间" value="Asia/Tokyo"></el-option>
                  </el-select>
                </el-form-item>
                
                <el-form-item label="日期格式" prop="dateFormat">
                  <el-select v-model="settings.dateFormat" placeholder="请选择日期格式" style="width: 100%">
                    <el-option label="YYYY-MM-DD" value="YYYY-MM-DD"></el-option>
                    <el-option label="MM/DD/YYYY" value="MM/DD/YYYY"></el-option>
                    <el-option label="DD/MM/YYYY" value="DD/MM/YYYY"></el-option>
                    <el-option label="YYYY年MM月DD日" value="YYYY年MM月DD日"></el-option>
                  </el-select>
                </el-form-item>
                
                <el-form-item label="主题颜色" prop="theme">
                  <el-color-picker v-model="settings.theme" show-alpha></el-color-picker>
                  <el-button 
                    type="text" 
                    style="margin-left: 10px;" 
                    @click="settings.theme = '#409EFF'">
                    重置为默认
                  </el-button>
                </el-form-item>
              </el-tab-pane>
              
              <!-- 安全设置 -->
              <el-tab-pane label="安全设置" name="security">
                <el-form-item label="启用密码复杂度检查" prop="passwordComplexity">
                  <el-switch v-model="settings.passwordComplexity"></el-switch>
                  <span class="setting-desc">开启后，密码必须包含大小写字母、数字和特殊字符</span>
                </el-form-item>
                
                <el-form-item label="密码最小长度" prop="minPasswordLength">
                  <el-input-number 
                    v-model="settings.minPasswordLength" 
                    :min="6" 
                    :max="20" 
                    :disabled="!settings.passwordComplexity">
                  </el-input-number>
                  <span class="setting-desc">密码的最小长度要求</span>
                </el-form-item>
                
                <el-form-item label="会话超时时间(分钟)" prop="sessionTimeout">
                  <el-input-number 
                    v-model="settings.sessionTimeout" 
                    :min="5" 
                    :max="1440">
                  </el-input-number>
                  <span class="setting-desc">用户无操作后自动退出系统的时间</span>
                </el-form-item>
                
                <el-form-item label="最大登录尝试次数" prop="maxLoginAttempts">
                  <el-input-number 
                    v-model="settings.maxLoginAttempts" 
                    :min="3" 
                    :max="10">
                  </el-input-number>
                  <span class="setting-desc">超过次数后账户将被临时锁定</span>
                </el-form-item>
                
                <el-form-item label="启用双因素认证" prop="twoFactorAuth">
                  <el-switch v-model="settings.twoFactorAuth"></el-switch>
                  <span class="setting-desc">登录时需要额外验证码进行身份验证</span>
                </el-form-item>
                
                <el-form-item label="IP白名单" prop="ipWhitelist">
                  <el-input 
                    type="textarea" 
                    v-model="settings.ipWhitelist" 
                    rows="3"
                    placeholder="每行一个IP地址或网段，例如：192.168.1.1 或 192.168.1.0/24">
                  </el-input>
                  <span class="setting-desc">仅允许这些IP地址访问管理系统，留空表示不限制</span>
                </el-form-item>
              </el-tab-pane>
              
              <!-- 备份设置 -->
              <el-tab-pane label="备份设置" name="backup">
                <el-form-item label="启用自动备份" prop="autoBackup">
                  <el-switch v-model="settings.autoBackup"></el-switch>
                  <span class="setting-desc">定期自动备份系统数据</span>
                </el-form-item>
                
                <el-form-item label="备份频率" prop="backupFrequency" :disabled="!settings.autoBackup">
                  <el-select v-model="settings.backupFrequency" placeholder="请选择备份频率" style="width: 100%" :disabled="!settings.autoBackup">
                    <el-option label="每天" value="daily"></el-option>
                    <el-option label="每周" value="weekly"></el-option>
                    <el-option label="每月" value="monthly"></el-option>
                  </el-select>
                </el-form-item>
                
                <el-form-item label="备份时间" prop="backupTime" :disabled="!settings.autoBackup">
                  <el-time-picker
                    v-model="settings.backupTime"
                    format="HH:mm"
                    placeholder="选择备份时间"
                    style="width: 100%"
                    :disabled="!settings.autoBackup">
                  </el-time-picker>
                </el-form-item>
                
                <el-form-item label="保留备份数量" prop="backupRetention" :disabled="!settings.autoBackup">
                  <el-input-number 
                    v-model="settings.backupRetention" 
                    :min="1" 
                    :max="100"
                    :disabled="!settings.autoBackup">
                  </el-input-number>
                  <span class="setting-desc">系统将保留的最近备份数量</span>
                </el-form-item>
                
                <el-form-item label="备份存储位置" prop="backupLocation" :disabled="!settings.autoBackup">
                  <el-input v-model="settings.backupLocation" placeholder="请输入备份存储路径" :disabled="!settings.autoBackup"></el-input>
                  <span class="setting-desc">备份文件的存储路径，可以是本地路径或远程服务器地址</span>
                </el-form-item>
                
                <el-divider content-position="left">手动备份</el-divider>
                
                <el-form-item>
                  <el-button type="primary" @click="handleBackupNow">立即备份</el-button>
                  <el-button type="success" @click="showBackupHistory">查看备份历史</el-button>
                </el-form-item>
              </el-tab-pane>
              
              <!-- 通知设置 -->
              <el-tab-pane label="通知设置" name="notification">
                <el-form-item label="启用邮件通知" prop="emailNotification">
                  <el-switch v-model="settings.emailNotification"></el-switch>
                  <span class="setting-desc">启用系统邮件通知功能</span>
                </el-form-item>
                
                <el-form-item label="SMTP服务器" prop="smtpServer" :disabled="!settings.emailNotification">
                  <el-input v-model="settings.smtpServer" placeholder="例如：smtp.example.com" :disabled="!settings.emailNotification"></el-input>
                </el-form-item>
                
                <el-form-item label="SMTP端口" prop="smtpPort" :disabled="!settings.emailNotification">
                  <el-input-number v-model="settings.smtpPort" :min="1" :max="65535" :disabled="!settings.emailNotification"></el-input-number>
                </el-form-item>
                
                <el-form-item label="SMTP用户名" prop="smtpUsername" :disabled="!settings.emailNotification">
                  <el-input v-model="settings.smtpUsername" placeholder="邮箱账号" :disabled="!settings.emailNotification"></el-input>
                </el-form-item>
                
                <el-form-item label="SMTP密码" prop="smtpPassword" :disabled="!settings.emailNotification">
                  <el-input v-model="settings.smtpPassword" type="password" placeholder="邮箱密码或授权码" show-password :disabled="!settings.emailNotification"></el-input>
                </el-form-item>
                
                <el-form-item label="发件人邮箱" prop="senderEmail" :disabled="!settings.emailNotification">
                  <el-input v-model="settings.senderEmail" placeholder="系统发送邮件的邮箱地址" :disabled="!settings.emailNotification"></el-input>
                </el-form-item>
                
                <el-form-item>
                  <el-button type="primary" @click="testEmailConnection" :disabled="!settings.emailNotification">测试邮件连接</el-button>
                </el-form-item>
                
                <el-divider content-position="left">通知事件</el-divider>
                
                <el-form-item label="服务器状态变更" prop="notifyServerStatus">
                  <el-switch v-model="settings.notifyServerStatus" :disabled="!settings.emailNotification"></el-switch>
                </el-form-item>
                
                <el-form-item label="用户登录异常" prop="notifyLoginFailures">
                  <el-switch v-model="settings.notifyLoginFailures" :disabled="!settings.emailNotification"></el-switch>
                </el-form-item>
                
                <el-form-item label="数据库备份结果" prop="notifyBackupResults">
                  <el-switch v-model="settings.notifyBackupResults" :disabled="!settings.emailNotification"></el-switch>
                </el-form-item>
                
                <el-form-item label="系统更新通知" prop="notifySystemUpdates">
                  <el-switch v-model="settings.notifySystemUpdates" :disabled="!settings.emailNotification"></el-switch>
                </el-form-item>
              </el-tab-pane>
            </el-tabs>
            
            <div class="form-actions">
              <el-button type="primary" @click="saveSettings">保存设置</el-button>
              <el-button @click="resetSettings">重置</el-button>
            </div>
          </el-form>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 备份历史对话框 -->
    <el-dialog title="备份历史记录" :visible.sync="backupHistoryVisible" width="700px">
      <el-table :data="backupHistory" border style="width: 100%">
        <el-table-column prop="id" label="ID" width="60" align="center"></el-table-column>
        <el-table-column prop="filename" label="文件名" min-width="180"></el-table-column>
        <el-table-column prop="size" label="大小" width="100" align="center"></el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="170" align="center"></el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === 'success' ? 'success' : 'danger'">
              {{ scope.row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center">
          <template slot-scope="scope">
            <el-button size="mini" type="primary" @click="downloadBackup(scope.row)">下载</el-button>
            <el-button size="mini" type="danger" @click="deleteBackup(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'SystemSettings',
  data() {
    return {
      loading: false,
      activeTab: 'basic',
      settings: {
        // 基本设置
        systemName: '饥荒管理系统',
        adminEmail: 'admin@example.com',
        language: 'zh-CN',
        timezone: 'Asia/Shanghai',
        dateFormat: 'YYYY-MM-DD',
        theme: '#409EFF',
        
        // 安全设置
        passwordComplexity: true,
        minPasswordLength: 8,
        sessionTimeout: 30,
        maxLoginAttempts: 5,
        twoFactorAuth: false,
        ipWhitelist: '',
        
        // 备份设置
        autoBackup: true,
        backupFrequency: 'daily',
        backupTime: new Date(2023, 1, 1, 3, 0),
        backupRetention: 7,
        backupLocation: '/data/backups',
        
        // 通知设置
        emailNotification: false,
        smtpServer: '',
        smtpPort: 587,
        smtpUsername: '',
        smtpPassword: '',
        senderEmail: '',
        notifyServerStatus: true,
        notifyLoginFailures: true,
        notifyBackupResults: true,
        notifySystemUpdates: true
      },
      
      rules: {
        systemName: [
          { required: true, message: '请输入系统名称', trigger: 'blur' }
        ],
        adminEmail: [
          { required: true, message: '请输入管理员邮箱', trigger: 'blur' },
          { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
        ],
        smtpServer: [
          { required: true, message: '请输入SMTP服务器地址', trigger: 'blur' }
        ],
        smtpUsername: [
          { required: true, message: '请输入SMTP用户名', trigger: 'blur' }
        ],
        smtpPassword: [
          { required: true, message: '请输入SMTP密码', trigger: 'blur' }
        ],
        senderEmail: [
          { required: true, message: '请输入发件人邮箱', trigger: 'blur' },
          { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
        ]
      },
      
      // 备份历史
      backupHistoryVisible: false,
      backupHistory: [
        {
          id: 1,
          filename: 'backup_20231010_030005.zip',
          size: '25.4 MB',
          createTime: '2023-10-10 03:00:05',
          status: 'success'
        },
        {
          id: 2,
          filename: 'backup_20231009_030002.zip',
          size: '24.8 MB',
          createTime: '2023-10-09 03:00:02',
          status: 'success'
        },
        {
          id: 3,
          filename: 'backup_20231008_030003.zip',
          size: '24.6 MB',
          createTime: '2023-10-08 03:00:03',
          status: 'success'
        },
        {
          id: 4,
          filename: 'backup_20231007_030001.zip',
          size: '24.5 MB',
          createTime: '2023-10-07 03:00:01',
          status: 'success'
        },
        {
          id: 5,
          filename: 'backup_20231006_030004.zip',
          size: '0 KB',
          createTime: '2023-10-06 03:00:04',
          status: 'failed'
        }
      ]
    };
  },
  created() {
    this.loadSettings();
  },
  methods: {
    // 加载设置
    loadSettings() {
      this.loading = true;
      
      // 模拟从API获取设置
      setTimeout(() => {
        // 实际应用中，这里应该从API获取数据
        // 此处使用的是初始设置（模拟数据）
        
        this.loading = false;
        
        this.$message({
          type: 'success',
          message: '设置已刷新'
        });
      }, 600);
    },
    
    // 保存设置
    saveSettings() {
      this.$refs.settingsForm.validate((valid) => {
        if (valid) {
          this.loading = true;
          
          // 模拟保存到API
          setTimeout(() => {
            this.loading = false;
            
            this.$message({
              type: 'success',
              message: '设置已保存'
            });
          }, 800);
        } else {
          return false;
        }
      });
    },
    
    // 重置设置
    resetSettings() {
      this.$confirm('确定要重置所有设置吗？这将恢复到初始值。', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loadSettings();
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消重置'
        });
      });
    },
    
    // 立即备份
    handleBackupNow() {
      this.loading = true;
      
      // 模拟备份操作
      setTimeout(() => {
        this.loading = false;
        
        // 新增备份记录
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        const filename = `backup_${year}${month}${day}_${hours}${minutes}${seconds}.zip`;
        
        this.backupHistory.unshift({
          id: this.backupHistory.length + 1,
          filename,
          size: '25.6 MB',
          createTime: `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`,
          status: 'success'
        });
        
        this.$message({
          type: 'success',
          message: '备份成功'
        });
      }, 2000);
    },
    
    // 显示备份历史
    showBackupHistory() {
      this.backupHistoryVisible = true;
    },
    
    // 下载备份
    downloadBackup(backup) {
      this.$message({
        type: 'success',
        message: `开始下载：${backup.filename}`
      });
    },
    
    // 删除备份
    deleteBackup(backup) {
      this.$confirm(`确定要删除备份：${backup.filename}吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 模拟删除备份
        this.backupHistory = this.backupHistory.filter(item => item.id !== backup.id);
        
        this.$message({
          type: 'success',
          message: '备份已删除'
        });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消删除'
        });
      });
    },
    
    // 测试邮件连接
    testEmailConnection() {
      if (!this.settings.smtpServer || !this.settings.smtpUsername || !this.settings.smtpPassword) {
        this.$message.error('请先完成SMTP设置');
        return;
      }
      
      this.loading = true;
      
      // 模拟测试邮件连接
      setTimeout(() => {
        this.loading = false;
        
        this.$message({
          type: 'success',
          message: '邮件连接测试成功'
        });
      }, 1500);
    }
  }
};
</script>

<style scoped>
.page-container {
  padding: 20px;
}

.main-card {
  margin-bottom: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.form-actions {
  margin-top: 30px;
  text-align: center;
}

.setting-desc {
  font-size: 12px;
  color: #909399;
  margin-left: 10px;
}

::v-deep .el-tabs__header {
  margin-bottom: 25px;
}

::v-deep .el-tabs__item {
  font-size: 15px;
  font-weight: 500;
}

::v-deep .el-tabs__item.is-active {
  color: #409EFF;
}

::v-deep .el-form-item {
  margin-bottom: 22px;
}

::v-deep .el-form-item__label {
  font-weight: 500;
}

::v-deep .el-input-number {
  width: 200px;
}

::v-deep .el-select {
  width: 100%;
}

::v-deep .el-divider__text {
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  background-color: #fff;
}

::v-deep .el-tabs__nav-wrap::after {
  height: 1px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  ::v-deep .el-form-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  
  ::v-deep .el-form-item__label {
    text-align: left;
    width: 100% !important;
    padding: 0 0 10px 0;
  }
  
  ::v-deep .el-form-item__content {
    width: 100%;
    margin-left: 0 !important;
  }
  
  .setting-desc {
    display: block;
    margin-left: 0;
    margin-top: 5px;
  }
}
</style> 