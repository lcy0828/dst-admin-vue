<template>
  <div class="agent-command-container">
    <el-card class="main-card" shadow="hover">
      <template #header>
        <div class="clearfix">
        <span class="card-title">
          <component :is="'el-icon-terminal'" class="legacy-icon" /> Agent命令管理
        </span>
        <div class="header-actions">
          <el-button type="primary" size="small" icon="el-icon-plus" @click="showCommandTemplates">使用模板</el-button>
        </div>
        </div>
      </template>
      
      <div v-loading="loading" class="command-content">
        <!-- 命令执行表单 -->
        <div class="section">
          <div class="section-title">
            <component :is="'el-icon-edit'" class="legacy-icon" /> 命令执行
            <el-switch
              v-model="batchMode"
              active-text="批量执行"
              inactive-text="单个执行"
              class="batch-mode-switch"
              @change="onBatchModeChange">
            </el-switch>
          </div>
          
          <el-form label-position="top" :model="commandForm" ref="commandForm" :rules="commandRules">
            <el-form-item label="Agent ID" prop="agent_id">
              <el-select 
                v-model="commandForm.agent_id" 
                filterable 
                placeholder="请选择Agent" 
                style="width: 100%"
                @visible-change="handleAgentSelectVisibleChange"
                :loading="agentListLoading"
                :multiple="batchMode">
                <template #empty>
                  <div v-if="agentListLoading" class="agent-loading">
                    <component :is="'el-icon-loading'" class="legacy-icon" /> 加载中...
                  </div>
                  <div v-else class="agent-empty">没有已连接的Agent</div>
                </template>
                <el-option 
                  v-for="agent in agentList" 
                  :key="agent.id"
                  :label="`${agent.hostname || '未知'} (${agent.id || '未知'})`"
                  :value="agent.id">
                  <div class="agent-option">
                    <component :is="getOsIcon(agent.os)" class="legacy-icon agent-os-icon" />
                    <div class="agent-option-content">
                      <div class="agent-hostname">{{ agent.hostname || 'Unknown' }}</div>
                      <div class="agent-details">
                        ID: {{ agent.id }} | IP: {{ agent.ip || 'Unknown' }}
                      </div>
                    </div>
                    <el-tag size="mini" :type="agent.status === 'online' ? 'success' : 'danger'">
                      {{ agent.status || 'unknown' }}
                    </el-tag>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
            
            <el-form-item label="命令类型" prop="type">
              <el-select v-model="commandForm.type" placeholder="请选择命令类型" style="width: 100%">
                <el-option label="Shell命令" value="shell"></el-option>
                <el-option label="PowerShell命令" value="powershell"></el-option>
              </el-select>
            </el-form-item>
            
            <el-form-item label="命令内容" prop="content">
              <el-input 
                type="textarea" 
                v-model="commandForm.content" 
                :rows="4"
                placeholder="请输入要执行的命令内容"></el-input>
            </el-form-item>
            
            <el-form-item label="超时时间 (秒)" prop="timeout">
              <el-input-number v-model="commandForm.timeout" :min="1" :max="600" :step="5"></el-input-number>
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="executeCommand" :loading="commandLoading">执行命令</el-button>
              <el-button @click="resetCommand">重置</el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 命令历史记录 -->
        <div class="section">
          <div class="section-title">
            <component :is="'el-icon-time'" class="legacy-icon" /> 命令历史
            <div class="history-filter">
              <el-select
                v-model="historyFilter.agent_id"
                placeholder="选择Agent"
                clearable
                @change="onAgentFilterChange"
                style="width: 240px; margin-left: 15px;">
                <el-option 
                  v-for="agent in agentList" 
                  :key="agent.id"
                  :label="`${agent.hostname || '未知'} (${agent.id || '未知'})`"
                  :value="agent.id">
                </el-option>
              </el-select>
              <el-select
                v-model="historyFilter.status"
                placeholder="命令状态"
                clearable
                @change="onStatusFilterChange"
                style="width: 120px; margin-left: 10px;">
                <el-option value="pending" label="待执行"></el-option>
                <el-option value="running" label="执行中"></el-option>
                <el-option value="completed" label="已完成"></el-option>
                <el-option value="failed" label="失败"></el-option>
                <el-option value="timeout" label="超时"></el-option>
                <el-option value="canceled" label="已取消"></el-option>
              </el-select>
              <el-input
                v-model="historyFilter.search"
                placeholder="搜索命令内容"
                clearable
                prefix-icon="el-icon-search"
                @input="onSearchChange"
                style="width: 180px; margin-left: 10px;">
              </el-input>
              <el-date-picker
                v-model="historyFilter.date_range"
                type="daterange"
                align="right"
                value-format="timestamp"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                :picker-options="pickerOptions"
                style="width: 260px; margin-left: 10px;"
                @change="onDateRangeChange">
              </el-date-picker>
              <el-button type="primary" plain size="small" icon="el-icon-refresh" @click="refreshHistory" style="margin-left: 10px;">刷新</el-button>
              <el-button type="info" plain size="small" @click="getAllHistory" style="margin-left: 10px;">获取全部历史</el-button>
            </div>
          </div>
          
          <el-table
            :data="commandHistory"
            style="width: 100%"
            v-loading="historyLoading">
            <el-table-column prop="command_id" label="命令ID" width="120"></el-table-column>
            <el-table-column prop="agent_id" label="Agent ID" width="120" show-overflow-tooltip></el-table-column>
            <el-table-column prop="type" label="类型" width="100">
              <template #default="scope">
                <el-tag size="mini" :type="scope.row.type === 'shell' ? 'primary' : 'success'">
                  {{ scope.row.type }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="content" label="命令内容" show-overflow-tooltip></el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="scope">
                <el-tag size="mini" :type="getStatusType(scope.row.status)">
                  {{ scope.row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="success" label="结果" width="80">
              <template #default="scope">
                <el-tag 
                  size="mini"
                  :type="scope.row.success ? 'success' : 'danger'"
                  v-if="scope.row.status === 'completed'">
                  {{ scope.row.success ? '成功' : '失败' }}
                </el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="start_time" label="执行时间" width="180">
              <template #default="scope">
                {{ formatTime(scope.row.start_time) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="scope">
                <el-button type="text" size="mini" @click="viewCommandDetail(scope.row)">
                  查看详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-container">
            <el-pagination
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
              :current-page="currentPage"
              :page-sizes="[10, 20, 50, 100]"
              :page-size="pageSize"
              layout="total, sizes, prev, pager, next, jumper"
              :total="total">
            </el-pagination>
          </div>
        </div>

        <!-- 命令详情对话框 -->
        <el-dialog
          title="命令详情"
          v-model="dialogVisible"
          width="70%"
          class="command-detail-dialog">
          <div v-if="selectedCommand" class="command-detail">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="命令ID">{{ selectedCommand.command_id }}</el-descriptions-item>
              <el-descriptions-item label="Agent ID">{{ selectedCommand.agent_id }}</el-descriptions-item>
              <el-descriptions-item label="命令类型">{{ selectedCommand.type }}</el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag :type="getStatusType(selectedCommand.status)">
                  {{ selectedCommand.status }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="退出码">
                <el-tag :type="selectedCommand.exit_code === 0 ? 'success' : 'danger'" v-if="selectedCommand.status === 'completed'">
                  {{ selectedCommand.exit_code }}
                </el-tag>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="成功">
                <el-tag :type="selectedCommand.success ? 'success' : 'danger'" v-if="selectedCommand.status === 'completed'">
                  {{ selectedCommand.success ? '成功' : '失败' }}
                </el-tag>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="开始时间">{{ formatTime(selectedCommand.start_time) }}</el-descriptions-item>
              <el-descriptions-item label="结束时间">{{ formatTime(selectedCommand.end_time) }}</el-descriptions-item>
              <el-descriptions-item label="命令内容" :span="2">
                <pre class="command-content">{{ selectedCommand.content }}</pre>
              </el-descriptions-item>
              <el-descriptions-item label="命令输出" :span="2">
                <el-tabs type="border-card">
                  <el-tab-pane label="输出">
                    <pre class="command-output" v-if="selectedCommand.output">{{ selectedCommand.output }}</pre>
                    <div class="no-output" v-else>无输出内容</div>
                  </el-tab-pane>
                  <el-tab-pane label="错误" v-if="selectedCommand.error_msg">
                    <pre class="command-error">{{ selectedCommand.error_msg }}</pre>
                  </el-tab-pane>
                </el-tabs>
              </el-descriptions-item>
            </el-descriptions>
            
            <div class="detail-actions">
              <el-button 
                type="primary" 
                size="small" 
                icon="el-icon-refresh" 
                @click="refreshCommandDetail(selectedCommand.command_id)"
                :loading="detailLoading">
                刷新结果
              </el-button>
              <el-button 
                type="success" 
                size="small" 
                icon="el-icon-document-copy" 
                @click="copyCommandDetailOutput">
                复制输出
              </el-button>
            </div>
          </div>
        </el-dialog>
        
        <!-- 命令模板对话框 -->
        <el-dialog
          title="命令模板"
          v-model="templateDialogVisible"
          width="60%"
          class="template-dialog">
          <div class="template-container">
            <el-tabs v-model="activeTemplateCategory" type="card">
              <el-tab-pane label="系统信息" name="system">
                <el-table :data="systemTemplates" border style="width: 100%">
                  <el-table-column prop="name" label="模板名称" width="180"></el-table-column>
                  <el-table-column prop="description" label="描述"></el-table-column>
                  <el-table-column label="操作" width="120" fixed="right">
                    <template #default="scope">
                      <el-button type="text" size="small" :disabled="!scope.row.supported" @click="useTemplate(scope.row)">使用</el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </el-tab-pane>
              <el-tab-pane label="文件操作" name="file">
                <el-table :data="fileTemplates" border style="width: 100%">
                  <el-table-column prop="name" label="模板名称" width="180"></el-table-column>
                  <el-table-column prop="description" label="描述"></el-table-column>
                  <el-table-column label="操作" width="120" fixed="right">
                    <template #default="scope">
                      <el-button type="text" size="small" :disabled="!scope.row.supported" @click="useTemplate(scope.row)">使用</el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </el-tab-pane>
              <el-tab-pane label="网络工具" name="network">
                <el-table :data="networkTemplates" border style="width: 100%">
                  <el-table-column prop="name" label="模板名称" width="180"></el-table-column>
                  <el-table-column prop="description" label="描述"></el-table-column>
                  <el-table-column label="操作" width="120" fixed="right">
                    <template #default="scope">
                      <el-button type="text" size="small" :disabled="!scope.row.supported" @click="useTemplate(scope.row)">使用</el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </el-tab-pane>
            </el-tabs>
          </div>
        </el-dialog>
      </div>
    </el-card>
  </div>
</template>

<script>
import { agentApi } from '@/api/index';

export default {
  name: 'AgentCommand',
  data() {
    return {
      loading: false,
      commandLoading: false,
      historyLoading: false,
      agentListLoading: false,
      dialogVisible: false,
      showKey: false,
      currentPage: 1,
      pageSize: 10,
      total: 0,
      agentList: [],
      commandHistory: [],
      selectedCommand: null,
      commandForm: {
        agent_id: '',
        type: 'shell',
        content: '',
        action: '',
        timeout: 30
      },
      commandRules: {
        agent_id: [{ required: true, message: '请选择Agent', trigger: 'change' }],
        type: [{ required: true, message: '请选择命令类型', trigger: 'change' }],
        content: [{ required: true, message: '请输入命令内容', trigger: 'blur' }],
        timeout: [{ required: true, message: '请设置超时时间', trigger: 'change' }]
      },
      historyFilter: {
        agent_id: '',
        status: '',
        search: '',
        date_range: []
      },
      pickerOptions: {
        shortcuts: [{
          text: '最近一周',
          onClick(picker) {
            const end = new Date();
            const start = new Date();
            start.setTime(start.getTime() - 3600 * 1000 * 24 * 7);
            picker.$emit('pick', [start, end]);
          }
        }, {
          text: '最近一个月',
          onClick(picker) {
            const end = new Date();
            const start = new Date();
            start.setTime(start.getTime() - 3600 * 1000 * 24 * 30);
            picker.$emit('pick', [start, end]);
          }
        }, {
          text: '最近三个月',
          onClick(picker) {
            const end = new Date();
            const start = new Date();
            start.setTime(start.getTime() - 3600 * 1000 * 24 * 90);
            picker.$emit('pick', [start, end]);
          }
        }]
      },
      batchMode: false,
      templateDialogVisible: false,
      activeTemplateCategory: 'system',
      systemTemplates: [],
      fileTemplates: [],
      networkTemplates: [],
      detailLoading: false
    };
  },
  created() {
    this.fetchAgentList();
    this.initCommandTemplates();
    this.fetchTemplates();
    this.processQueryParams();
    this.fetchCommandHistory();
  },
  methods: {
    // 处理查询参数
    processQueryParams() {
      const { id } = this.$route.query;
      if (id) {
        this.commandForm.agent_id = id;
      }
    },
    // Agent列表相关方法
    async fetchAgentList() {
      this.agentListLoading = true;
      try {
        const response = await agentApi.getAgentList();
        if (response && response.code === 200) {
          const agentData = response.data || {};
          if (typeof agentData === 'object' && !Array.isArray(agentData)) {
            this.agentList = Object.values(agentData).map(agent => ({
                id: agent.agent_uuid,  // 使用agent_uuid作为id
                hostname: agent.hostname || agent.name || '未知主机',  // 尝试多个可能的名称字段
                ip: agent.ip_addresses ? agent.ip_addresses[0] : agent.ip || '',  // 尝试多种IP字段
                os: agent.os || agent.system || '',  // 操作系统信息
                status: agent.connected ? 'online' : 'offline'  // 连接状态
              }));
          } else if (Array.isArray(agentData)) {
            // 数组格式，直接映射
            this.agentList = agentData.map(agent => ({
              id: agent.agent_uuid || agent.id,
              hostname: agent.hostname || agent.name || '未知主机',
              ip: agent.ip_addresses ? agent.ip_addresses[0] : agent.ip || '',
              os: agent.os || agent.system || '',
              status: agent.connected === true || agent.status === 'online' ? 'online' : 'offline'
            }));
          }
          
        } else {
          console.error('Agent列表响应格式错误:', response);
          this.$message.error('获取Agent列表响应格式错误');
        }
      } catch (error) {
        console.error('获取Agent列表失败:', error);
        this.$message.error('获取Agent列表失败：' + error.message);
      } finally {
        this.agentListLoading = false;
      }
    },
    handleAgentSelectVisibleChange(visible) {
      if (visible) {
        this.fetchAgentList();
      }
    },
    getOsIcon(os) {
      if (!os) return 'el-icon-monitor';
      const osLower = os.toLowerCase();
      if (osLower.includes('windows')) return 'el-icon-platform-eleme';
      if (osLower.includes('linux')) return 'el-icon-platform-eleme';
      if (osLower.includes('darwin')) return 'el-icon-apple';
      return 'el-icon-monitor';
    },

    // 初始化命令模板
    initCommandTemplates() {
      // 初始化内置的命令模板
      this.systemTemplates = [
        { id: 1, name: '系统信息', description: '获取基础系统信息', type: 'shell', content: 'system.refresh', action: 'system.refresh', supported: true },
        { id: 2, name: '磁盘空间', description: '查看磁盘空间使用情况', type: 'shell', content: 'disk.inspect', action: 'disk.inspect', supported: true },
        { id: 3, name: '内存信息', description: '当前生产白名单未开放', type: 'shell', content: 'free -m', supported: false },
        { id: 4, name: 'CPU信息', description: '当前生产白名单未开放', type: 'shell', content: 'cat /proc/cpuinfo', supported: false },
        { id: 5, name: '进程列表', description: '当前生产白名单未开放', type: 'shell', content: 'ps aux --sort=-%cpu | head -10', supported: false }
      ];
      
      this.fileTemplates = [
        { id: 6, name: '列出目录', description: '当前生产白名单未开放', type: 'shell', content: 'ls -la /path/to/directory', supported: false },
        { id: 7, name: '查找文件', description: '当前生产白名单未开放', type: 'shell', content: 'find / -name "filename" -type f', supported: false },
        { id: 8, name: '最近修改', description: '当前生产白名单未开放', type: 'shell', content: 'find / -type f -mtime -1 | grep -v "/proc/" | grep -v "/sys/" | head -20', supported: false }
      ];
      
      this.networkTemplates = [
        { id: 9, name: '网络连接', description: '当前生产白名单未开放', type: 'shell', content: 'netstat -tuln', supported: false },
        { id: 10, name: 'Ping测试', description: '当前生产白名单未开放', type: 'shell', content: 'ping -c 4 127.0.0.1', supported: false },
        { id: 11, name: 'IP配置', description: '当前生产白名单未开放', type: 'shell', content: 'ip addr show', supported: false },
        { id: 12, name: '路由表', description: '当前生产白名单未开放', type: 'shell', content: 'ip route', supported: false }
      ];
    },
    useTemplate(template) {
      if (!template.supported) {
        this.$message.warning('此模板未包含在后端返回的生产动作白名单中');
        return;
      }
      this.commandForm.type = template.type || 'shell';
      this.commandForm.content = template.content;
      this.commandForm.action = template.action;
      this.templateDialogVisible = false;
    },
    // 命令执行相关方法
    async executeCommand() {
      try {
        await this.$refs.commandForm.validate();
        this.commandLoading = true;
        
        if (this.batchMode && Array.isArray(this.commandForm.agent_id) && this.commandForm.agent_id.length > 0) {
          // 批量执行命令
          const results = [];
          let successCount = 0;
          let failCount = 0;
          
          for (const agentId of this.commandForm.agent_id) {
            try {
              const commandData = {
                agent_id: agentId,
                type: this.commandForm.type,
                content: this.commandForm.content,
                action: this.resolveCommandAction(),
                timeout: this.commandForm.timeout
              };
              
              const response = await agentApi.executeCommand(commandData);
              if (response && response.code === 200) {
                successCount++;
                results.push({
                  agentId,
                  commandId: response.data.command_id,
                  success: true
                });
              } else {
                failCount++;
                results.push({
                  agentId,
                  success: false,
                  error: response.msg || '命令执行失败'
                });
              }
            } catch (error) {
              failCount++;
              results.push({
                agentId,
                success: false,
                error: error.message || '命令执行出错'
              });
            }
          }
          
          if (successCount > 0) {
            this.$message.success(`成功发送命令至 ${successCount} 个Agent`);
          }
          if (failCount > 0) {
            this.$message.warning(`${failCount} 个Agent命令发送失败`);
          }
          
          // 更新命令历史
          setTimeout(() => {
            this.fetchCommandHistory();
          }, 1000);
          
          // 重置表单
          this.resetCommand();
        } else {
          // 单个Agent执行命令
          const commandData = {
            agent_id: this.batchMode ? this.commandForm.agent_id[0] : this.commandForm.agent_id,
            type: this.commandForm.type,
            content: this.commandForm.content,
            action: this.resolveCommandAction(),
            timeout: this.commandForm.timeout
          };
          
          const response = await agentApi.executeCommand(commandData);
          if (response && response.code === 200) {
            this.$message.success('命令已发送');
            
            // 获取命令ID
            const commandId = response.data.command_id;
            if (commandId) {
              // 立即获取并显示命令详情
              this.pollCommandResult(commandId);
            }
            
            // 更新命令历史
            setTimeout(() => {
              this.fetchCommandHistory();
            }, 1000);
            
            // 重置表单
            this.resetCommand();
          } else {
            this.$message.error(response.msg || '命令执行失败');
          }
        }
      } catch (error) {
        this.$message.error('命令执行失败：' + (error.message || '未知错误'));
      } finally {
        this.commandLoading = false;
      }
    },
    
    // 轮询命令结果
    async pollCommandResult(commandId, attempts = 0) {
      if (attempts > 20) { // 最多尝试20次，约1分钟
        this.$message.warning('命令执行时间较长，请在历史记录中查看结果');
        return;
      }
      
      try {
        const response = await agentApi.getCommandResult(commandId);
        
        if (response && response.code === 200) {
          const result = response.data;
          
          // 如果命令已完成或出错，显示详情
          if (result.status === 'completed' || result.status === 'failed' || result.status === 'timeout' || result.status === 'canceled') {
            this.selectedCommand = result;
            this.dialogVisible = true;
            
            // 根据结果显示不同的消息
            if (result.success) {
              this.$message.success('命令执行成功');
            } else {
              this.$message.warning('命令执行失败: ' + (result.error_msg || '未知错误'));
            }
            
            return;
          }
          
          // 如果命令仍在执行，继续轮询
          setTimeout(() => {
            this.pollCommandResult(commandId, attempts + 1);
          }, 3000); // 每3秒查询一次
        } else {
          // 查询失败，但仍继续尝试
          setTimeout(() => {
            this.pollCommandResult(commandId, attempts + 1);
          }, 3000);
        }
      } catch (error) {
        console.error('获取命令结果失败:', error);
        // 出错后仍继续尝试
        setTimeout(() => {
          this.pollCommandResult(commandId, attempts + 1);
        }, 3000);
      }
    },
    resetCommand() {
      this.$refs.commandForm.resetFields();
      this.commandForm.action = '';
    },
    resolveCommandAction() {
      if (this.commandForm.action) return this.commandForm.action;
      const content = String(this.commandForm.content || '').trim();
      if (content === 'system.refresh' || content === 'uname -a && cat /etc/os-release') return 'system.refresh';
      if (content === 'disk.inspect' || content === 'df -h' || content === 'df -Pk') return 'disk.inspect';
      return '';
    },

    // 命令历史相关方法
    async fetchCommandHistory() {
      this.historyLoading = true;
      try {
        const params = this.commandHistoryParams();
        const agentId = this.historyFilter.agent_id || '';
        const response = agentId
          ? await agentApi.getCommandHistoryByAgentId(agentId, params)
          : await agentApi.getCommandHistory(params);
        let items = response.data?.items || [];
        if (this.historyFilter.status === 'timeout') {
          items = items.filter(item => String(item.error_msg || '').includes('超时'));
        }
        this.commandHistory = items;
        this.total = this.historyFilter.status === 'timeout' ? items.length : (response.data?.total || 0);
      } catch (error) {
        this.$message.error('获取命令历史失败：' + (error.message || '未知错误'));
        this.commandHistory = [];
        this.total = 0;
      } finally {
        this.historyLoading = false;
      }
    },
    handleSizeChange(val) {
      this.pageSize = val;
      this.currentPage = 1;
      this.fetchCommandHistory();
    },
    handleCurrentChange(val) {
      this.currentPage = val;
      this.fetchCommandHistory();
    },
    getStatusType(status) {
      const statusMap = {
        'pending': 'info',
        'running': 'warning',
        'completed': 'success',
        'failed': 'danger',
        'timeout': 'danger',
        'canceled': 'info'
      };
      return statusMap[status] || 'info';
    },
    commandHistoryParams() {
      const params = {
        page: this.currentPage,
        page_size: this.pageSize,
        status: this.historyFilter.status,
        search: this.historyFilter.search
      };
      const range = this.historyFilter.date_range || [];
      if (range[0]) params.startDate = this.formatFilterDate(range[0]);
      if (range[1]) params.endDate = this.formatFilterDate(range[1]);
      return params;
    },
    formatFilterDate(value) {
      const date = new Date(value);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },
    viewCommandDetail(command) {
      this.selectedCommand = command;
      this.dialogVisible = true;
    },
    formatTime(timestamp) {
      if (!timestamp) return 'N/A';
      
      // 处理不同格式的时间戳
      let ts = timestamp;
      
      // 如果是秒级时间戳（10位数字），转换为毫秒级
      if (typeof ts === 'number' && ts.toString().length === 10) {
        ts = ts * 1000;
      }
      // 如果是字符串形式的时间戳，尝试转换为数值
      else if (typeof ts === 'string' && !isNaN(Number(ts))) {
        ts = Number(ts);
        if (ts.toString().length === 10) {
          ts = ts * 1000;
        }
      }
      
      try {
        const date = new Date(ts);
        // 检查日期是否有效
        if (isNaN(date.getTime())) {
          return 'N/A (无效时间戳)';
        }
        return date.toLocaleString();
      } catch (e) {
        console.error('时间格式化错误:', e);
        return 'N/A (格式错误)';
      }
    },
    onAgentFilterChange() {
      this.currentPage = 1;
      this.fetchCommandHistory();
    },
    onStatusFilterChange() {
      this.currentPage = 1;
      this.fetchCommandHistory();
    },
    onSearchChange() {
      this.currentPage = 1;
      this.fetchCommandHistory();
    },
    onDateRangeChange() {
      this.currentPage = 1;
      this.fetchCommandHistory();
    },
    refreshHistory() {
      this.fetchCommandHistory();
    },
    onBatchModeChange() {
      this.fetchAgentList();
    },
    showCommandTemplates() {
      this.templateDialogVisible = true;
    },
    async fetchTemplates() {
      try {
        const response = await agentApi.getActions();
        const allowed = new Set((response.data || []).map(item => item.id));
        this.systemTemplates = this.systemTemplates.map(item => ({
          ...item,
          supported: item.action ? allowed.has(item.action) : false
        }));
      } catch (error) {
        this.$message.error('获取允许动作失败：' + error.message);
      }
    },
    async refreshCommandDetail(commandId) {
      this.detailLoading = true;
      try {
        const response = await agentApi.getCommandResult(commandId);
        if (response && response.code === 200) {
          this.selectedCommand = response.data;
          this.dialogVisible = true;
          this.$message.success('命令结果刷新成功');
        } else {
          this.$message.error(response.msg || '刷新命令结果失败');
        }
      } catch (error) {
        this.$message.error('刷新命令结果失败：' + (error.message || '未知错误'));
      } finally {
        this.detailLoading = false;
      }
    },
    copyCommandDetailOutput() {
      if (this.selectedCommand && this.selectedCommand.output) {
        const textArea = document.createElement('textarea');
        textArea.value = this.selectedCommand.output;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        this.$message.success('命令输出已复制到剪贴板');
      } else {
        this.$message.warning('没有可复制的命令输出');
      }
    },
    getAllHistory() {
      this.historyFilter = { agent_id: '', status: '', search: '', date_range: [] };
      this.currentPage = 1;
      this.fetchCommandHistory();
    }
  }
};
</script>

<style lang="scss" scoped>
.agent-command-container {
  padding: 20px;

  .main-card {
    .card-title {
      font-size: 18px;
      font-weight: bold;
      i {
        margin-right: 8px;
      }
    }
    
    .header-actions {
      float: right;
    }
  }

  .section {
    margin-bottom: 30px;

    .section-title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 20px;
      color: var(--primary-color);
      display: flex;
      align-items: center;
      
      i {
        margin-right: 8px;
      }
      
      .history-filter {
        margin-left: auto;
        display: flex;
        align-items: center;
      }
      
      .batch-mode-switch {
        margin-left: auto;
      }
    }
  }

  .agent-option {
    display: flex;
    align-items: center;
    padding: 5px 0;

    .agent-os-icon {
      margin-right: 10px;
      font-size: 20px;
    }

    .agent-option-content {
      flex: 1;

      .agent-hostname {
        font-weight: bold;
      }

      .agent-details {
        font-size: 12px;
        color: var(--text-secondary);
      }
    }
  }

  .command-detail {
    .command-content {
      background: var(--surface-muted);
      padding: 10px;
      border-radius: 4px;
      font-family: monospace;
      white-space: pre-wrap;
    }

    .command-output,
    .command-error {
      background: #1e1e1e;
      color: #fff;
      padding: 10px;
      border-radius: 4px;
      font-family: monospace;
      white-space: pre-wrap;
      max-height: 300px;
      overflow-y: auto;
    }

    .command-error {
      color: #ff4949;
    }

    .no-output {
      color: var(--text-secondary);
      text-align: center;
      padding: 20px;
    }
    
    .detail-actions {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
  }

  .pagination-container {
    margin-top: 20px;
    text-align: right;
  }
  
  .template-container {
    max-height: 500px;
    overflow-y: auto;
  }
}
</style>
