<template>
  <div class="page-container">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card class="main-card">
          <template v-slot:header>
<div  class="clearfix">
            <span>系统设置</span>
            <el-button style="float: right; padding: 3px 0" type="text" @click="loadSettings">刷新</el-button>
          </div>
</template>

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
                    <el-option label="English" value="en-US" disabled></el-option>
                    <el-option label="日本語" value="ja-JP" disabled></el-option>
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
                    @click="settings.theme = '#d97932'">
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
                  <el-switch v-model="settings.twoFactorAuth" disabled></el-switch>
                  <span class="setting-desc">需要先完成身份验证器密钥绑定，当前版本尚未开放</span>
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
                    value-format="HH:mm"
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
                  <span class="setting-desc">真实本地备份路径，修改后重启服务生效</span>
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
                  <el-input v-model="settings.smtpPassword" type="password" :placeholder="smtpPasswordConfigured ? '已配置，留空表示保持不变' : '邮箱密码或授权码'" show-password :disabled="!settings.emailNotification"></el-input>
                </el-form-item>

                <el-form-item label="发件人邮箱" prop="senderEmail" :disabled="!settings.emailNotification">
                  <el-input v-model="settings.senderEmail" placeholder="系统发送邮件的邮箱地址" :disabled="!settings.emailNotification"></el-input>
                </el-form-item>

                <el-form-item>
                  <el-button type="primary" @click="testEmailConnection" :disabled="!settings.emailNotification">测试邮件连接</el-button>
                </el-form-item>

                <el-divider content-position="left">通知事件</el-divider>

                <el-form-item label="服务器状态变更" prop="notifyServerStatus">
                  <el-switch v-model="settings.notifyServerStatus" disabled></el-switch>
                </el-form-item>

                <el-form-item label="用户登录异常" prop="notifyLoginFailures">
                  <el-switch v-model="settings.notifyLoginFailures" disabled></el-switch>
                </el-form-item>

                <el-form-item label="数据库备份结果" prop="notifyBackupResults">
                  <el-switch v-model="settings.notifyBackupResults" disabled></el-switch>
                </el-form-item>

                <el-form-item label="系统更新通知" prop="notifySystemUpdates">
                  <el-switch v-model="settings.notifySystemUpdates" disabled></el-switch>
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
                      <template v-slot:header>
<div  class="status-card-header">
                        <component :is="'el-icon-cpu'" class="legacy-icon" /> CPU状态
                      </div>
</template>
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
                      <template v-slot:header>
<div  class="status-card-header">
                        <component :is="'el-icon-loading'" class="legacy-icon" /> 系统负载
                      </div>
</template>
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
                      <template v-slot:header>
<div  class="status-card-header">
                        <component :is="'el-icon-coin'" class="legacy-icon" /> 内存状态
                      </div>
</template>
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
                      <template v-slot:header>
<div  class="status-card-header">
                        <component :is="'el-icon-folder'" class="legacy-icon" /> 磁盘状态
                      </div>
</template>
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
                      <template v-slot:header>
<div  class="status-card-header">
                        <component :is="'el-icon-s-operation'" class="legacy-icon" /> 进程信息
                      </div>
</template>
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
                      <template v-slot:header>
<div  class="status-card-header">
                        <component :is="'el-icon-s-platform'" class="legacy-icon" /> Go运行时
                      </div>
</template>
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
                      <template v-slot:header>
<div  class="status-card-header">
                        <component :is="'el-icon-time'" class="legacy-icon" /> 时间信息
                      </div>
</template>
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
    <el-dialog title="备份历史记录" v-model="backupHistoryVisible" width="700px">
      <el-table :data="backupHistory" border style="width: 100%">
        <el-table-column prop="id" label="ID" width="60" align="center"></el-table-column>
        <el-table-column prop="filename" label="文件名" min-width="180"></el-table-column>
        <el-table-column prop="size" label="大小" width="100" align="center"></el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="170" align="center"></el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template v-slot="scope">
            <el-tag :type="scope.row.status === 'success' ? 'success' : 'danger'">
              {{ scope.row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center">
          <template v-slot="scope">
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
import { backupsV2API, jobsV2API, roomsV2API, systemV2API } from '@/api/v2';
import { applySystemPreferences } from '@/utils/systemPreferences';

const APPLY_CONFIRMATION = 'APPLY SYSTEM SETTINGS';
const TERMINAL_JOB_STATES = new Set(['succeeded', 'failed', 'cancelled']);

export default {
  name: 'SystemSettings',
  data() {
    const requiredEmailSetting = (label, configuredSecret = false) => (_rule, value, callback) => {
      if (!this.settings.emailNotification || String(value || '').trim() || configuredSecret && this.smtpPasswordConfigured) {
        callback();
        return;
      }
      callback(new Error(`请输入${label}`));
    };
    return {
      loading: false,
      activeTab: 'basic',
      revision: '',
      settingsResponse: null,
      smtpPasswordConfigured: false,
      settings: {
        // 基本设置
        systemName: '',
        adminEmail: '',
        language: 'zh-CN',
        timezone: 'Asia/Shanghai',
        dateFormat: 'YYYY-MM-DD',
        theme: '#d97932',

        // 安全设置
        passwordComplexity: false,
        minPasswordLength: 6,
        sessionTimeout: 1440,
        maxLoginAttempts: 5,
        twoFactorAuth: false,
        ipWhitelist: '',

        // 备份设置
        autoBackup: true,
        backupFrequency: 'daily',
        backupTime: '03:00',
        backupRetention: 7,
        backupLocation: '',

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
          { validator: requiredEmailSetting('SMTP服务器地址'), trigger: 'blur' }
        ],
        smtpUsername: [
          { validator: requiredEmailSetting('SMTP用户名'), trigger: 'blur' }
        ],
        smtpPassword: [
          { validator: requiredEmailSetting('SMTP密码', true), trigger: 'blur' }
        ],
        senderEmail: [
          { validator: requiredEmailSetting('发件人邮箱'), trigger: 'blur' },
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
        {color: '#4f8a5b', percentage: 40},
        {color: '#d99b32', percentage: 70},
        {color: '#c94f4f', percentage: 90}
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
    this.loadSettings(false);
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
    field(response, id, fallback = '') {
      return response.fields?.find(item => item.id === id) || { value: fallback, configured: false };
    },
    fieldNumber(response, id, fallback) {
      const value = Number(this.field(response, id, fallback).value);
      return Number.isFinite(value) ? value : fallback;
    },
    fieldBoolean(response, id, fallback = false) {
      return this.field(response, id, String(fallback)).value === 'true';
    },
    populateSettings(response) {
      this.settingsResponse = response;
      this.revision = response.revision;
      this.smtpPasswordConfigured = this.field(response, 'notification.smtpPassword').configured;
      this.settings = {
        systemName: this.field(response, 'ui.systemName').value,
        adminEmail: this.field(response, 'ui.adminEmail').value,
        language: this.field(response, 'ui.language', 'zh-CN').value,
        timezone: this.field(response, 'ui.timezone', 'Asia/Shanghai').value,
        dateFormat: this.field(response, 'ui.dateFormat', 'YYYY-MM-DD').value,
        theme: this.field(response, 'ui.theme', '#d97932').value,
        passwordComplexity: this.fieldBoolean(response, 'security.passwordComplexity'),
        minPasswordLength: this.fieldNumber(response, 'security.minPasswordLength', 6),
        sessionTimeout: this.fieldNumber(response, 'security.sessionTimeout', 1440),
        maxLoginAttempts: this.fieldNumber(response, 'security.maxLoginAttempts', 5),
        twoFactorAuth: this.fieldBoolean(response, 'security.twoFactorAuth'),
        ipWhitelist: this.field(response, 'security.ipWhitelist').value,
        autoBackup: this.fieldBoolean(response, 'backup.auto', true),
        backupFrequency: this.field(response, 'backup.frequency', 'daily').value,
        backupTime: this.field(response, 'backup.time', '03:00').value,
        backupRetention: this.fieldNumber(response, 'backup.retention', 7),
        backupLocation: this.field(response, 'paths.backup').value,
        emailNotification: this.fieldBoolean(response, 'notification.emailEnabled'),
        smtpServer: this.field(response, 'notification.smtpServer').value,
        smtpPort: this.fieldNumber(response, 'notification.smtpPort', 587),
        smtpUsername: this.field(response, 'notification.smtpUsername').value,
        smtpPassword: '',
        senderEmail: this.field(response, 'notification.senderEmail').value,
        notifyServerStatus: this.fieldBoolean(response, 'notification.serverStatus', true),
        notifyLoginFailures: this.fieldBoolean(response, 'notification.loginFailures', true),
        notifyBackupResults: this.fieldBoolean(response, 'notification.backupResults', true),
        notifySystemUpdates: this.fieldBoolean(response, 'notification.systemUpdates', true)
      };
    },
    async loadSettings(showMessage = true) {
      this.loading = true;
      try {
        const response = await systemV2API.settings();
        this.populateSettings(response);
        applySystemPreferences(response);
        if (showMessage === true) this.$message.success('设置已刷新');
      } catch (error) {
        this.$message.error(error.message || '读取系统设置失败');
      } finally {
        this.loading = false;
      }
    },
    settingsInput() {
      const values = {
        'ui.systemName': this.settings.systemName,
        'ui.adminEmail': this.settings.adminEmail,
        'ui.language': this.settings.language,
        'ui.timezone': this.settings.timezone,
        'ui.dateFormat': this.settings.dateFormat,
        'ui.theme': this.settings.theme,
        'security.passwordComplexity': String(this.settings.passwordComplexity),
        'security.minPasswordLength': String(this.settings.minPasswordLength),
        'security.sessionTimeout': String(this.settings.sessionTimeout),
        'security.maxLoginAttempts': String(this.settings.maxLoginAttempts),
        'security.ipWhitelist': this.settings.ipWhitelist,
        'backup.auto': String(this.settings.autoBackup),
        'backup.frequency': this.settings.backupFrequency,
        'backup.time': this.settings.backupTime,
        'backup.retention': String(this.settings.backupRetention),
        'paths.backup': this.settings.backupLocation,
        'notification.emailEnabled': String(this.settings.emailNotification),
        'notification.smtpServer': this.settings.smtpServer,
        'notification.smtpPort': String(this.settings.smtpPort),
        'notification.smtpUsername': this.settings.smtpUsername,
        'notification.senderEmail': this.settings.senderEmail,
        'notification.serverStatus': String(this.settings.notifyServerStatus),
        'notification.loginFailures': String(this.settings.notifyLoginFailures),
        'notification.backupResults': String(this.settings.notifyBackupResults),
        'notification.systemUpdates': String(this.settings.notifySystemUpdates)
      };
      if (this.settings.smtpPassword) values['notification.smtpPassword'] = this.settings.smtpPassword;
      return { revision: this.revision, values, clearSecrets: [] };
    },
    async saveSettings() {
      const valid = await this.$refs.settingsForm.validate().catch(() => false);
      if (!valid) return;
      this.loading = true;
      try {
        const input = this.settingsInput();
        const preview = await systemV2API.previewSettings(input);
        if (!preview.valid) {
          const messages = preview.issues.filter(issue => issue.severity === 'error').map(issue => issue.message);
          throw new Error(messages.join('；') || '系统设置校验失败');
        }
        if (preview.changes.length === 0) {
          this.$message.info('设置没有变化');
          return;
        }
        const result = await systemV2API.applySettings({ ...input, confirmation: APPLY_CONFIRMATION });
        if (preview.changes.some(change => change.fieldId.startsWith('backup.'))) await this.syncBackupPolicies();
        this.populateSettings(result.settings);
        applySystemPreferences(result.settings);
        const suffix = result.settings.restartRequired ? '；路径或运行参数需要重启服务后生效' : '';
        this.$message.success(`设置已保存并生效${suffix}`);
      } catch (error) {
        this.$message.error(error.message || '保存系统设置失败');
      } finally {
        this.loading = false;
      }
    },
    resetSettings() {
      this.$confirm('确定放弃当前未保存的修改，并重新读取服务器设置吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loadSettings(false);
      }).catch(() => {});
    },
    backupIntervalMinutes() {
      return { daily: 1440, weekly: 10080, monthly: 43200 }[this.settings.backupFrequency] || 1440;
    },
    nextBackupRun() {
      const [hour, minute] = String(this.settings.backupTime || '03:00').split(':').map(Number);
      const next = new Date();
      next.setHours(hour, minute, 0, 0);
      if (next <= new Date()) next.setDate(next.getDate() + 1);
      return next.toISOString();
    },
    async managedRooms() {
      const response = await roomsV2API.list();
      return (response.items || []).filter(room => room.managed);
    },
    async syncBackupPolicies() {
      const rooms = await this.managedRooms();
      const policy = {
        enabled: this.settings.autoBackup,
        intervalMinutes: this.backupIntervalMinutes(),
        maxSnapshots: this.settings.backupRetention,
        nextRunAt: this.settings.autoBackup ? this.nextBackupRun() : undefined
      };
      await Promise.all(rooms.map(room => backupsV2API.savePolicy(room.id, policy)));
    },
    async handleBackupNow() {
      this.loading = true;
      try {
        const rooms = await this.managedRooms();
        if (rooms.length === 0) throw new Error('没有已接管的房间可以备份');
        const jobs = await Promise.all(rooms.map(room => backupsV2API.create(room.id)));
        await this.waitForJobs(jobs);
        await this.loadBackupHistory();
        this.$message.success(`已完成 ${rooms.length} 个房间的真实备份`);
      } catch (error) {
        this.$message.error(error.message || '创建备份失败');
      } finally {
        this.loading = false;
      }
    },
    async waitForJobs(jobs) {
      let current = jobs;
      for (let attempt = 0; attempt < 120; attempt += 1) {
        current = await Promise.all(current.map(job => jobsV2API.get(job.id)));
        if (current.every(job => TERMINAL_JOB_STATES.has(job.status))) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (current.some(job => !TERMINAL_JOB_STATES.has(job.status))) throw new Error('备份任务仍在执行，请稍后查看历史记录');
      const failed = current.find(job => job.status !== 'succeeded');
      if (failed) throw new Error(failed.error?.message || '部分房间备份失败');
    },
    async loadBackupHistory() {
      const response = await roomsV2API.list();
      const rooms = response.items || [];
      const results = await Promise.all(rooms.map(async room => ({ room, backups: await backupsV2API.list(room.id) })));
      this.backupHistory = results.flatMap(({ room, backups }) => (backups.items || []).map(item => ({
        id: item.id,
        name: item.name,
        filename: item.fileName || `${item.name}.zip`,
        size: this.formatBytes(item.size),
        createTime: this.formatDateTime(item.createdAt),
        status: item.status === 'verified' ? 'success' : 'failed',
        roomName: room.name
      }))).sort((first, second) => second.createTime.localeCompare(first.createTime));
    },
    async showBackupHistory() {
      this.loading = true;
      try {
        await this.loadBackupHistory();
        this.backupHistoryVisible = true;
      } catch (error) {
        this.$message.error(error.message || '读取备份历史失败');
      } finally {
        this.loading = false;
      }
    },
    downloadBackup(backup) {
      const link = document.createElement('a');
      link.href = backupsV2API.downloadURL(backup.id);
      link.download = backup.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    },
    async deleteBackup(backup) {
      try {
        await this.$confirm(`确定要删除备份：${backup.filename}吗？`, '提示', {
          confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
        });
        await backupsV2API.delete(backup.id, backup.name);
        await this.loadBackupHistory();
        this.$message.success('备份已删除');
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') this.$message.error(error.message || '删除备份失败');
      }
    },
    async testEmailConnection() {
      const valid = await this.$refs.settingsForm.validateField(['smtpServer', 'smtpUsername', 'smtpPassword']).then(() => true).catch(() => false);
      if (!valid) return;
      this.loading = true;
      try {
        const result = await systemV2API.testEmail({
          server: this.settings.smtpServer,
          port: this.settings.smtpPort,
          username: this.settings.smtpUsername,
          password: this.settings.smtpPassword
        });
        this.$message.success(`SMTP 连接与认证成功（${result.tls ? 'TLS' : '本机明文连接'}）`);
      } catch (error) {
        this.$message.error(error.details?.reason || error.message || 'SMTP 连接测试失败');
      } finally {
        this.loading = false;
      }
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

    formatBytes(bytes) {
      const value = Number(bytes) || 0;
      if (value < 1024) return `${value} B`;
      if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
      if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
      return `${(value / 1024 ** 3).toFixed(1)} GB`;
    },
    formatDateTime(value) {
      if (!value) return '';
      return new Intl.DateTimeFormat('zh-CN', {
        timeZone: this.settings.timezone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      }).format(new Date(value)).replaceAll('/', '-');
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
        return '#4f8a5b'; // 绿色 - 低负载
      } else if (percentage < 70) {
        return '#d99b32'; // 黄色 - 中等负载
      } else if (percentage <= 100) {
        return '#c94f4f'; // 红色 - 高负载
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
  color: #758078;
  margin-left: 10px;
}

:deep(.el-tabs__header) {
  margin-bottom: 25px;
}

:deep(.el-tabs__item) {
  font-size: 15px;
  font-weight: 500;
}

:deep(.el-tabs__item.is-active) {
  color: #d97932;
}

:deep(.el-form-item) {
  margin-bottom: 22px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-input-number) {
  width: 200px;
}

:deep(.el-select) {
  width: 100%;
}

:deep(.el-divider__text) {
  font-size: 14px;
  font-weight: 600;
  color: #536159;
  background-color: #fff;
}

:deep(.el-tabs__nav-wrap::after) {
  height: 1px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  :deep(.el-form-item) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  :deep(.el-form-item__label) {
    text-align: left;
    width: 100% !important;
    padding: 0 0 10px 0;
  }

  :deep(.el-form-item__content) {
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
  color: #536159;
  font-size: 14px;
}

.status-value {
  flex: 1;
  color: #27352f;
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
  color: #536159;
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
  color: #758078;
  text-align: right;
}

.core-overload-indicator {
  font-size: 10px;
  color: white;
  margin-left: 5px;
  background-color: #c94f4f;
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
