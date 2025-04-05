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
              
              <!-- 高级系统状态 -->
              <el-tab-pane label="高级系统状态" name="systemStatus">
                <div class="status-header">
                  <span class="status-title">系统详细监控</span>
                  <el-button type="primary" size="small" icon="el-icon-refresh" @click="refreshSystemStatus">刷新状态</el-button>
                </div>
                
                <el-divider content-position="left">系统状态</el-divider>
                
                <el-row :gutter="20" class="status-row">
                  <el-col :xs="24" :sm="12" :md="6">
                    <el-card shadow="hover" class="status-card">
                      <div slot="header" class="status-card-header">
                        <i class="el-icon-cpu"></i> CPU状态
                      </div>
                      <div class="status-card-content">
                        <div class="status-item">
                          <div class="status-label">型号:</div>
                          <div class="status-value">{{ systemStatus.cpu_model }}</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">频率:</div>
                          <div class="status-value">{{ systemStatus.cpu_mhz }} MHz</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">物理核心:</div>
                          <div class="status-value">{{ systemStatus.cpu_cores }}</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">逻辑核心:</div>
                          <div class="status-value">{{ systemStatus.cpu_threads }}</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">使用率:</div>
                          <div class="status-value progress-value">
                            <el-progress :percentage="systemStatus.cpu_usage" :color="customColors"></el-progress>
                          </div>
                        </div>
                        
                        <!-- 添加CPU核心使用率 -->
                        <div class="status-item cpu-cores-item">
                          <div class="status-label">核心使用率:</div>
                          <div class="status-value">
                            <div class="core-usage-container" :class="getCoreGridClass">
                              <div 
                                v-for="(usage, index) in systemStatus.cpu_core_usage" 
                                :key="index"
                                class="core-usage-item"
                              >
                                <div class="core-usage-label">
                                  核心 {{ index }}
                                  <span v-if="isCoreOverloaded(usage)" class="core-overload-indicator">高负载</span>
                                </div>
                                <div class="core-usage-bar-container">
                                  <div 
                                    class="core-usage-bar" 
                                    :style="{ width: formatCoreUsageWidth(usage), backgroundColor: getCoreColor(usage) }"
                                  ></div>
                                </div>
                                <div class="core-usage-value">{{ usage.toFixed(2) }}%</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </el-card>
                  </el-col>
                  
                  <el-col :xs="24" :sm="12" :md="6">
                    <el-card shadow="hover" class="status-card">
                      <div slot="header" class="status-card-header">
                        <i class="el-icon-loading"></i> 系统负载
                      </div>
                      <div class="status-card-content">
                        <div class="status-item">
                          <div class="status-label">1分钟:</div>
                          <div class="status-value">{{ systemStatus.cpu_load1 }}</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">5分钟:</div>
                          <div class="status-value">{{ systemStatus.cpu_load5 }}</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">15分钟:</div>
                          <div class="status-value">{{ systemStatus.cpu_load15 }}</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">主机名:</div>
                          <div class="status-value">{{ systemStatus.hostname }}</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">系统:</div>
                          <div class="status-value">{{ systemStatus.os_info }}</div>
                        </div>
                      </div>
                    </el-card>
                  </el-col>
                  
                  <el-col :xs="24" :sm="12" :md="6">
                    <el-card shadow="hover" class="status-card">
                      <div slot="header" class="status-card-header">
                        <i class="el-icon-coin"></i> 内存状态
                      </div>
                      <div class="status-card-content">
                        <div class="status-item">
                          <div class="status-label">总内存:</div>
                          <div class="status-value">{{ formatMemory(systemStatus.total_memory) }}</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">已用内存:</div>
                          <div class="status-value">{{ formatMemory(systemStatus.used_memory) }}</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">空闲内存:</div>
                          <div class="status-value">{{ formatMemory(systemStatus.free_memory) }}</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">使用率:</div>
                          <div class="status-value progress-value">
                            <el-progress :percentage="systemStatus.memory_usage" :color="customColors"></el-progress>
                          </div>
                        </div>
                      </div>
                    </el-card>
                  </el-col>
                  
                  <el-col :xs="24" :sm="12" :md="6">
                    <el-card shadow="hover" class="status-card">
                      <div slot="header" class="status-card-header">
                        <i class="el-icon-folder"></i> 磁盘状态
                      </div>
                      <div class="status-card-content">
                        <div class="status-item">
                          <div class="status-label">总空间:</div>
                          <div class="status-value">{{ systemStatus.total_disk }} GB</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">已用空间:</div>
                          <div class="status-value">{{ systemStatus.used_disk }} GB</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">空闲空间:</div>
                          <div class="status-value">{{ systemStatus.free_disk }} GB</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">使用率:</div>
                          <div class="status-value progress-value">
                            <el-progress :percentage="systemStatus.disk_usage" :color="customColors"></el-progress>
                          </div>
                        </div>
                      </div>
                    </el-card>
                  </el-col>
                </el-row>
                
                <el-divider content-position="left">程序状态</el-divider>
                
                <el-row :gutter="20" class="status-row">
                  <el-col :xs="24" :sm="12">
                    <el-card shadow="hover" class="status-card">
                      <div slot="header" class="status-card-header">
                        <i class="el-icon-s-operation"></i> 进程信息
                      </div>
                      <div class="status-card-content">
                        <div class="status-item">
                          <div class="status-label">进程ID:</div>
                          <div class="status-value">{{ systemStatus.process_id }}</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">运行时间:</div>
                          <div class="status-value">{{ systemStatus.process_uptime_fmt }}</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">物理内存:</div>
                          <div class="status-value">{{ systemStatus.process_memory_rss }} MB</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">虚拟内存:</div>
                          <div class="status-value">{{ systemStatus.process_memory_vms }} MB</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">CPU使用率:</div>
                          <div class="status-value progress-value">
                            <el-progress :percentage="systemStatus.process_cpu_usage" :color="customColors"></el-progress>
                          </div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">线程数:</div>
                          <div class="status-value">{{ systemStatus.process_threads }}</div>
                        </div>
                      </div>
                    </el-card>
                  </el-col>
                  
                  <el-col :xs="24" :sm="12">
                    <el-card shadow="hover" class="status-card">
                      <div slot="header" class="status-card-header">
                        <i class="el-icon-s-platform"></i> Go运行时
                      </div>
                      <div class="status-card-content">
                        <div class="status-item">
                          <div class="status-label">版本:</div>
                          <div class="status-value">{{ systemStatus.go_version }}</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">Goroutines:</div>
                          <div class="status-value">{{ systemStatus.go_routines }}</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">堆分配:</div>
                          <div class="status-value">{{ systemStatus.go_memory_alloc }} MB</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">系统分配:</div>
                          <div class="status-value">{{ systemStatus.go_memory_sys }} MB</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">堆对象数:</div>
                          <div class="status-value">{{ systemStatus.go_memory_heap_objs }}</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">GC暂停:</div>
                          <div class="status-value">{{ (systemStatus.go_gc_pause / 1000000).toFixed(2) }} ms</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">GC运行次数:</div>
                          <div class="status-value">{{ systemStatus.go_gc_runs }}</div>
                        </div>
                      </div>
                    </el-card>
                  </el-col>
                </el-row>
                
                <el-divider content-position="left">系统时间</el-divider>
                
                <el-row :gutter="20" class="status-row">
                  <el-col :span="24">
                    <el-card shadow="hover" class="status-card">
                      <div slot="header" class="status-card-header">
                        <i class="el-icon-time"></i> 时间信息
                      </div>
                      <div class="status-card-content time-card-content">
                        <div class="status-item">
                          <div class="status-label">系统运行时间:</div>
                          <div class="status-value">{{ systemStatus.uptime_formatted }}</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">当前时间:</div>
                          <div class="status-value">{{ systemStatus.current_time }}</div>
                        </div>
                        <div class="status-item">
                          <div class="status-label">启动时间:</div>
                          <div class="status-value">{{ systemStatus.start_time }}</div>
                        </div>
                      </div>
                    </el-card>
                  </el-col>
                </el-row>
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
import { systemApi } from '@/api';

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
      
      // 系统状态信息
      systemStatus: {
        cpu_model: '加载中...',
        cpu_mhz: 0,
        cpu_cores: 0,
        cpu_threads: 0,
        cpu_usage: 0,
        cpu_core_usage: [],
        cpu_load1: 0,
        cpu_load5: 0,
        cpu_load15: 0,
        total_memory: 0,
        used_memory: 0,
        free_memory: 0,
        memory_usage: 0,
        total_disk: 0,
        used_disk: 0,
        free_disk: 0,
        disk_usage: 0,
        os_info: '加载中...',
        hostname: '加载中...',
        uptime: 0,
        uptime_formatted: '加载中...',
        go_version: '加载中...',
        go_routines: 0,
        process_id: 0,
        process_uptime: 0,
        process_uptime_fmt: '加载中...',
        process_memory_rss: 0,
        process_memory_vms: 0,
        process_cpu_usage: 0,
        process_threads: 0,
        go_memory_alloc: 0,
        go_memory_sys: 0,
        go_memory_heap_sys: 0,
        go_memory_heap_objs: 0,
        go_gc_pause: 0,
        go_gc_runs: 0,
        current_time: '加载中...',
        start_time: '加载中...'
      },
      
      // 自定义进度条颜色
      customColors: [
        {color: '#67C23A', percentage: 40},
        {color: '#E6A23C', percentage: 70},
        {color: '#F56C6C', percentage: 90}
      ],
      
      // 备份历史
      backupHistoryVisible: false,
      backupHistory: [
      ]
    };
  },
  computed: {
    // 根据CPU核心数量确定网格布局类名
    getCoreGridClass() {
      const coreCount = this.systemStatus.cpu_core_usage.length;
      if (coreCount <= 4) {
        return 'grid-cols-2';
      } else if (coreCount <= 8) {
        return 'grid-cols-4';
      } else if (coreCount <= 16) {
        return 'grid-cols-4';
      } else {
        return 'grid-cols-6';
      }
    }
  },
  created() {
    this.loadSettings();
  },
  mounted() {
    // 初始加载系统状态
    if (this.activeTab === 'systemStatus') {
      this.refreshSystemStatus();
    }
  },
  watch: {
    // 监听标签页切换，在切换到系统状态标签页时刷新数据
    activeTab(newVal) {
      if (newVal === 'systemStatus') {
        this.refreshSystemStatus();
      }
    }
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
    },
    
    // 刷新系统状态信息
    refreshSystemStatus() {
      this.loading = true;
      
      systemApi.getDashboardStatus()
        .then(res => {
          if (res && res.data && res.status === 200) {
            this.systemStatus = res.data;
            
            this.$message({
              type: 'success',
              message: '系统状态已刷新'
            });
          } else {
            this.$message.error('获取系统状态失败：' + (res.msg || '未知错误'));
          }
        })
        .catch(err => {
          this.$message.error('获取系统状态失败：' + (err.message || '未知错误'));
        })
        .finally(() => {
          this.loading = false;
        });
    },
    
    // 格式化内存显示
    formatMemory(memory) {
      if (!memory) return '0 MB';
      if (memory < 1024) {
        return memory.toFixed(0) + ' MB';
      } else {
        return (memory / 1024).toFixed(2) + ' GB';
      }
    },
    
    // 格式化CPU核心使用率显示宽度
    formatCoreUsageWidth(usage) {
      // 数值本身就是百分比，最大限制为100%显示
      return Math.min(usage, 100) + '%';
    },
    
    // 判断CPU核心是否过载
    isCoreOverloaded(usage) {
      // 当使用率超过70%时认为是高负载
      return usage > 70;
    },
    
    // 根据使用率获取颜色
    getCoreColor(percentage) {
      // 接口返回的就是百分比值
      if (percentage < 40) {
        return '#67C23A'; // 绿色 - 低负载
      } else if (percentage < 70) {
        return '#E6A23C'; // 黄色 - 中等负载
      } else if (percentage <= 100) {
        return '#F56C6C'; // 红色 - 高负载
      } else {
        return '#800080'; // 紫色 - 超过100%负载
      }
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

/* 系统状态样式 */
.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.status-title {
  font-size: 16px;
  font-weight: 500;
}

.status-row {
  margin-bottom: 20px;
}

.status-card {
  margin-bottom: 20px;
  height: 100%;
}

.status-card-header {
  display: flex;
  align-items: center;
  font-weight: 500;
}

.status-card-header i {
  margin-right: 8px;
  font-size: 18px;
}

.status-card-content {
  padding: 5px 0;
}

.status-item {
  display: flex;
  margin-bottom: 8px;
  line-height: 1.4;
}

.status-label {
  width: 90px;
  color: #606266;
  font-size: 14px;
}

.status-value {
  flex: 1;
  color: #303133;
  font-size: 14px;
  word-break: break-all;
}

.progress-value {
  padding-right: 10px;
}

.cpu-cores-item {
  flex-direction: column;
  align-items: flex-start;
  margin-top: 10px;
}

.cpu-cores-item .status-label {
  margin-bottom: 8px;
  width: 100%;
}

.cpu-cores-item .status-value {
  width: 100%;
}

.core-usage-container {
  width: 100%;
  display: grid;
  grid-gap: 10px;
}

.grid-cols-2 {
  grid-template-columns: repeat(2, 1fr);
}

.grid-cols-4 {
  grid-template-columns: repeat(4, 1fr);
}

.grid-cols-6 {
  grid-template-columns: repeat(6, 1fr);
}

.core-usage-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 5px;
}

.core-usage-label {
  font-size: 12px;
  color: #606266;
  margin-bottom: 2px;
}

.core-usage-bar-container {
  width: 100%;
  height: 6px;
  background-color: #E9E9E9;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 2px;
}

.core-usage-bar {
  height: 100%;
  border-radius: 3px;
}

.core-usage-value {
  font-size: 11px;
  color: #909399;
  text-align: right;
}

.core-overload-indicator {
  font-size: 10px;
  color: white;
  margin-left: 5px;
  background-color: #F56C6C;
  padding: 1px 4px;
  border-radius: 2px;
}

.time-card-content .status-item .status-label {
  width: 120px;
}

@media (max-width: 768px) {
  .status-item {
    flex-direction: column;
  }
  
  .status-label {
    width: 100%;
    margin-bottom: 4px;
  }
}
</style> 