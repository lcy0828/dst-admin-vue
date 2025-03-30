<template>
  <div class="create-task-container">
    <div class="page-header">
      <h2 class="page-title">{{ isEdit ? '编辑任务' : '创建新任务' }}</h2>
      <div class="page-actions">
        <el-button @click="goBack">
          <i class="el-icon-back"></i> 返回列表
        </el-button>
      </div>
    </div>
    
    <el-card shadow="hover" class="task-form-card">
      <el-form ref="taskForm" :model="taskForm" :rules="rules" label-width="120px" label-position="right">
        <el-divider content-position="left">基本信息</el-divider>
        
        <!-- 基本任务信息 -->
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="任务名称" prop="name">
              <el-input v-model="taskForm.name" placeholder="请输入任务名称"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="任务类型" prop="type">
              <el-select v-model="taskForm.type" placeholder="请选择任务类型" style="width: 100%">
                <el-option
                  v-for="item in taskTypes"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value">
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="任务描述" prop="description">
          <el-input
            type="textarea"
            v-model="taskForm.description"
            placeholder="请输入任务描述"
            :rows="3">
          </el-input>
        </el-form-item>
        
        <el-divider content-position="left">执行设置</el-divider>
        
        <!-- 执行设置 -->
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="目标服务器" prop="targets">
              <el-select
                v-model="taskForm.targets"
                multiple
                placeholder="请选择目标服务器"
                style="width: 100%">
                <el-option
                  v-for="server in serverList"
                  :key="server.id"
                  :label="server.name"
                  :value="server.id">
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="任务优先级" prop="priority">
              <el-radio-group v-model="taskForm.priority">
                <el-radio :label="'low'">低</el-radio>
                <el-radio :label="'normal'">中</el-radio>
                <el-radio :label="'high'">高</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        
        <!-- 计划任务设置 -->
        <el-form-item label="调度类型" prop="scheduleType">
          <el-radio-group v-model="taskForm.scheduleType" @change="onScheduleTypeChange">
            <el-radio :label="'once'">单次任务</el-radio>
            <el-radio :label="'daily'">每日任务</el-radio>
            <el-radio :label="'weekly'">每周任务</el-radio>
            <el-radio :label="'custom'">自定义定时</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <!-- 单次任务设置 -->
        <el-form-item v-if="taskForm.scheduleType === 'once'" label="执行时间" prop="schedule.once.dateTime">
          <el-date-picker
            v-model="taskForm.schedule.once.dateTime"
            type="datetime"
            placeholder="选择执行日期和时间"
            format="yyyy-MM-dd HH:mm"
            value-format="yyyy-MM-dd HH:mm"
            :picker-options="{
              disabledDate(time) {
                return time.getTime() < Date.now() - 8.64e7; // 不能选择过去的日期
              }
            }"
            style="width: 100%">
          </el-date-picker>
        </el-form-item>
        
        <!-- 每日任务设置 -->
        <template v-if="taskForm.scheduleType === 'daily'">
          <el-form-item label="执行时间" prop="schedule.daily.time">
            <el-time-picker
              v-model="taskForm.schedule.daily.time"
              placeholder="选择每日执行时间"
              format="HH:mm"
              value-format="HH:mm"
              style="width: 100%">
            </el-time-picker>
          </el-form-item>
          
          <el-form-item label="重复间隔" prop="schedule.daily.repeatDays">
            <el-input-number
              v-model="taskForm.schedule.daily.repeatDays"
              :min="1"
              :max="30"
              style="width: 200px">
            </el-input-number>
            <span class="form-item-hint">天</span>
          </el-form-item>
        </template>
        
        <!-- 每周任务设置 -->
        <template v-if="taskForm.scheduleType === 'weekly'">
          <el-form-item label="执行时间" prop="schedule.weekly.time">
            <el-time-picker
              v-model="taskForm.schedule.weekly.time"
              placeholder="选择每周执行时间"
              format="HH:mm"
              value-format="HH:mm"
              style="width: 100%">
            </el-time-picker>
          </el-form-item>
          
          <el-form-item label="执行日" prop="schedule.weekly.days">
            <el-checkbox-group v-model="taskForm.schedule.weekly.days">
              <el-checkbox :label="1">周一</el-checkbox>
              <el-checkbox :label="2">周二</el-checkbox>
              <el-checkbox :label="3">周三</el-checkbox>
              <el-checkbox :label="4">周四</el-checkbox>
              <el-checkbox :label="5">周五</el-checkbox>
              <el-checkbox :label="6">周六</el-checkbox>
              <el-checkbox :label="0">周日</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </template>
        
        <!-- 自定义定时设置 -->
        <template v-if="taskForm.scheduleType === 'custom'">
          <el-form-item label="Cron 表达式" prop="schedule.custom.expression">
            <el-input
              v-model="taskForm.schedule.custom.expression"
              placeholder="输入Cron表达式，例如: 0 0 * * *"
              style="width: 100%">
            </el-input>
            <div class="form-item-hint">
              <a href="javascript:;" @click="showCronHelp">查看Cron表达式帮助</a>
            </div>
          </el-form-item>
          
          <el-form-item label="表达式说明">
            <el-input
              v-model="cronDescription"
              type="textarea"
              :rows="2"
              readonly
              placeholder="Cron表达式解析将在这里显示">
            </el-input>
          </el-form-item>
        </template>
        
        <el-divider content-position="left">任务操作</el-divider>
        
        <!-- 操作设置 -->
        <el-form-item label="操作类型" prop="action.type">
          <el-select v-model="taskForm.action.type" placeholder="请选择操作类型" style="width: 100%" @change="onActionTypeChange">
            <el-option
              v-for="action in actionTypes"
              :key="action.value"
              :label="action.label"
              :value="action.value">
            </el-option>
          </el-select>
        </el-form-item>
        
        <!-- 根据操作类型显示不同参数设置 -->
        <template v-if="taskForm.action.type === 'server_restart'">
          <el-form-item label="重启模式">
            <el-radio-group v-model="taskForm.action.params.restartMode">
              <el-radio :label="'graceful'">优雅重启（等待玩家保存）</el-radio>
              <el-radio :label="'force'">强制重启</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item label="通知玩家">
            <el-switch v-model="taskForm.action.params.notifyPlayers"></el-switch>
            <span class="form-item-hint" v-if="taskForm.action.params.notifyPlayers">将提前通知玩家服务器即将重启</span>
          </el-form-item>
          
          <el-form-item label="通知时间" v-if="taskForm.action.params.notifyPlayers">
            <el-select v-model="taskForm.action.params.notifyTime" placeholder="选择通知时间" style="width: 200px">
              <el-option label="1分钟前" value="1"></el-option>
              <el-option label="3分钟前" value="3"></el-option>
              <el-option label="5分钟前" value="5"></el-option>
              <el-option label="10分钟前" value="10"></el-option>
              <el-option label="15分钟前" value="15"></el-option>
              <el-option label="30分钟前" value="30"></el-option>
            </el-select>
          </el-form-item>
        </template>
        
        <template v-if="taskForm.action.type === 'game_event'">
          <el-form-item label="事件类型">
            <el-select v-model="taskForm.action.params.eventType" placeholder="选择事件类型" style="width: 100%">
              <el-option label="资源刷新" value="resource_refresh"></el-option>
              <el-option label="怪物攻击" value="monster_attack"></el-option>
              <el-option label="物品掉落提升" value="drop_boost"></el-option>
              <el-option label="季节性活动" value="seasonal_event"></el-option>
              <el-option label="自定义活动" value="custom_event"></el-option>
            </el-select>
          </el-form-item>
          
          <el-form-item label="活动持续时间">
            <el-input-number
              v-model="taskForm.action.params.duration"
              :min="1"
              :max="72"
              style="width: 200px">
            </el-input-number>
            <span class="form-item-hint">小时</span>
          </el-form-item>
        </template>
        
        <el-form-item>
          <el-button type="primary" @click="submitForm" :loading="loading">{{ isEdit ? '保存修改' : '创建任务' }}</el-button>
          <el-button @click="goBack">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'CreateTask',
  data() {
    return {
      isEdit: false,
      taskId: null,
      loading: false,
      taskForm: {
        name: '',
        type: '',
        description: '',
        targets: [],
        priority: 'normal',
        scheduleType: 'once',
        schedule: {
          once: {
            dateTime: null
          },
          daily: {
            time: null,
            repeatDays: 1
          },
          weekly: {
            time: null,
            days: []
          },
          custom: {
            expression: ''
          }
        },
        action: {
          type: '',
          params: {}
        }
      },
      taskTypes: [
        { value: 'server_maintenance', label: '服务器维护' },
        { value: 'game_event', label: '游戏活动' },
        { value: 'data_backup', label: '数据备份' },
        { value: 'system_maintenance', label: '系统维护' },
        { value: 'announcement', label: '公告通知' },
        { value: 'mod_management', label: '模组管理' },
        { value: 'data_analysis', label: '数据分析' }
      ],
      actionTypes: [
        { value: 'server_restart', label: '服务器重启' },
        { value: 'backup_save', label: '备份存档' },
        { value: 'send_announcement', label: '发送公告' },
        { value: 'mod_update', label: '更新模组' },
        { value: 'resource_cleanup', label: '资源清理' },
        { value: 'game_event', label: '游戏事件' },
        { value: 'run_command', label: '运行命令' }
      ],
      cronDescription: '',
      serverList: [
        { id: 1, name: '主世界服务器' },
        { id: 2, name: '洞穴服务器' },
        { id: 3, name: 'MOD测试服务器' },
        { id: 4, name: '活动服务器' },
        { id: 5, name: '开发测试服务器' }
      ],
      rules: {
        name: [
          { required: true, message: '请输入任务名称', trigger: 'blur' },
          { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
        ],
        type: [
          { required: true, message: '请选择任务类型', trigger: 'change' }
        ],
        targets: [
          { required: true, message: '请选择目标服务器', trigger: 'change' },
          { type: 'array', min: 1, message: '至少选择一个服务器', trigger: 'change' }
        ],
        scheduleType: [
          { required: true, message: '请选择调度类型', trigger: 'change' }
        ]
      }
    };
  },
  created() {
    // 检查是否是编辑模式
    const { id } = this.$route.query;
    if (id) {
      this.isEdit = true;
      this.taskId = parseInt(id);
      this.fetchTaskData();
    }
  },
  methods: {
    goBack() {
      this.$router.push('/scheduled/tasks');
    },
    
    onScheduleTypeChange(type) {
      // 根据类型重置表单验证规则
      this.taskForm.scheduleType = type;
    },
    
    onActionTypeChange(actionType) {
      // 根据操作类型初始化参数
      const defaultParams = {
        server_restart: {
          restartMode: 'graceful',
          notifyPlayers: true,
          notifyTime: '5'
        },
        backup_save: {
          backupName: `备份_${new Date().toLocaleDateString().replace(/\//g, '-')}`,
          compress: true
        },
        send_announcement: {
          title: '',
          content: '',
          level: 'info'
        },
        mod_update: {
          checkOnly: false,
          updateAll: true,
          specificMods: []
        },
        resource_cleanup: {
          cleanLogs: true,
          cleanTemp: true,
          backupBeforeCleaning: true
        },
        game_event: {
          eventType: 'resource_refresh',
          duration: 24
        },
        run_command: {
          command: '',
          runAsAdmin: false
        }
      };
      
      this.taskForm.action.params = defaultParams[actionType] || {};
    },
    
    showCronHelp() {
      this.$alert(`
        <div class="cron-help">
          <h3>Cron表达式格式：</h3>
          <p><code>* * * * *</code></p>
          <ul>
            <li>第1位：分钟 (0-59)</li>
            <li>第2位：小时 (0-23)</li>
            <li>第3位：日期 (1-31)</li>
            <li>第4位：月份 (1-12)</li>
            <li>第5位：星期 (0-6, 0=星期日)</li>
          </ul>
          <h3>常用表达式示例：</h3>
          <ul>
            <li><code>0 4 * * *</code> - 每天凌晨4点执行</li>
            <li><code>0 18 * * 5</code> - 每周五晚上6点执行</li>
            <li><code>0 */6 * * *</code> - 每6小时执行一次</li>
            <li><code>0 3 * * 1</code> - 每周一凌晨3点执行</li>
            <li><code>0 12,18 * * *</code> - 每天中午12点和晚上6点执行</li>
            <li><code>0 2 * * *</code> - 每天凌晨2点执行</li>
          </ul>
        </div>
      `, 'Cron表达式帮助', {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '我知道了'
      });
    },
    
    parseCronExpression() {
      // 解析cron表达式并显示人类可读的描述
      const expression = this.taskForm.schedule.custom.expression;
      if (!expression) {
        this.cronDescription = '';
        return;
      }
      
      try {
        const parts = expression.split(' ');
        if (parts.length !== 5) {
          this.cronDescription = '表达式格式不正确，应该包含5个部分';
          return;
        }
        
        let description = '该任务将';
        
        // 解析分钟
        const minute = parts[0];
        if (minute === '*') {
          description += '每分钟';
        } else if (minute.includes('/')) {
          const interval = minute.split('/')[1];
          description += `每${interval}分钟`;
        } else {
          description += `在分钟为${minute}时`;
        }
        
        // 解析小时
        const hour = parts[1];
        if (hour === '*') {
          description += '的每小时';
        } else if (hour.includes('/')) {
          const interval = hour.split('/')[1];
          description += `的每${interval}小时`;
        } else if (hour.includes(',')) {
          description += `的${hour.split(',').join('、')}点`;
        } else {
          description += `的${hour}点`;
        }
        
        // 解析日期
        const day = parts[2];
        if (day === '*') {
          description += '每天';
        } else {
          description += `每月${day}日`;
        }
        
        // 解析月份
        const month = parts[3];
        if (month === '*') {
          description += '每月';
        } else {
          const monthNames = ['', '一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
          if (month.includes(',')) {
            description += `的${month.split(',').map(m => monthNames[parseInt(m)]).join('、')}`;
          } else {
            description += `的${monthNames[parseInt(month)]}`;
          }
        }
        
        // 解析星期
        const weekday = parts[4];
        if (weekday === '*') {
          description += '';
        } else {
          const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
          if (weekday.includes(',')) {
            description += `的${weekday.split(',').map(w => dayNames[parseInt(w)]).join('、')}`;
          } else {
            description += `的${dayNames[parseInt(weekday)]}`;
          }
        }
        
        description += '运行。';
        this.cronDescription = description;
        
      } catch (e) {
        this.cronDescription = '无法解析表达式，请检查格式是否正确';
      }
    },
    
    submitForm() {
      this.$refs.taskForm.validate(valid => {
        if (!valid) {
          this.$message.error('表单填写有误，请检查');
          return;
        }
        
        // 验证特定调度类型的必填字段
        if (this.taskForm.scheduleType === 'once' && !this.taskForm.schedule.once.dateTime) {
          this.$message.error('请选择执行时间');
          return;
        }
        
        if (this.taskForm.scheduleType === 'daily' && !this.taskForm.schedule.daily.time) {
          this.$message.error('请选择每日执行时间');
          return;
        }
        
        if (this.taskForm.scheduleType === 'weekly') {
          if (!this.taskForm.schedule.weekly.time) {
            this.$message.error('请选择每周执行时间');
            return;
          }
          
          if (this.taskForm.schedule.weekly.days.length === 0) {
            this.$message.error('请选择至少一个执行日');
            return;
          }
        }
        
        if (this.taskForm.scheduleType === 'custom' && !this.taskForm.schedule.custom.expression) {
          this.$message.error('请输入Cron表达式');
          return;
        }
        
        this.loading = true;
        
        // 准备提交的数据
        const formData = {
          id: this.isEdit ? this.taskId : Date.now(), // 模拟ID
          name: this.taskForm.name,
          type: this.getTypeLabel(this.taskForm.type),
          description: this.taskForm.description,
          schedule: this.formatSchedule(),
          target: this.formatTargets(),
          status: '正常',
          priority: this.taskForm.priority,
          action: {
            type: this.taskForm.action.type,
            params: this.taskForm.action.params
          }
        };
        
        // 模拟API调用
        setTimeout(() => {
          // 成功处理
          this.$message.success(this.isEdit ? '任务更新成功' : '任务创建成功');
          this.loading = false;
          this.goBack();
        }, 800);
      });
    },
    
    // 获取类型显示标签
    getTypeLabel(typeValue) {
      const type = this.taskTypes.find(t => t.value === typeValue);
      return type ? type.label : typeValue;
    },
    
    // 格式化调度信息
    formatSchedule() {
      if (this.taskForm.scheduleType === 'once') {
        return this.taskForm.schedule.once.dateTime;
      } else if (this.taskForm.scheduleType === 'daily') {
        return `每天 ${this.taskForm.schedule.daily.time}${this.taskForm.schedule.daily.repeatDays > 1 ? `，每${this.taskForm.schedule.daily.repeatDays}天` : ''}`;
      } else if (this.taskForm.scheduleType === 'weekly') {
        const dayMap = {
          0: '日',
          1: '一',
          2: '二',
          3: '三',
          4: '四',
          5: '五',
          6: '六'
        };
        
        const days = this.taskForm.schedule.weekly.days.map(d => `周${dayMap[d]}`).join('、');
        return `${days} ${this.taskForm.schedule.weekly.time}`;
      } else {
        return this.taskForm.schedule.custom.expression;
      }
    },
    
    // 格式化目标服务器
    formatTargets() {
      if (this.taskForm.targets.length === this.serverList.length) {
        return '全部服务器';
      } else if (this.taskForm.targets.length === 1) {
        const serverId = this.taskForm.targets[0];
        const server = this.serverList.find(s => s.id === serverId);
        return server ? server.name : '未知服务器';
      } else {
        return `${this.taskForm.targets.length}个服务器`;
      }
    },
    
    fetchTaskData() {
      if (!this.taskId) return;
      
      this.loading = true;
      
      // 模拟API请求
      setTimeout(() => {
        // 获取示例任务数据
        const demoTasks = this.getDemoTasks();
        const taskData = demoTasks.find(task => task.id === this.taskId);
        
        if (taskData) {
          // 填充表单数据
          this.taskForm = {
            name: taskData.name,
            type: this.mapTypeToValue(taskData.type),
            description: taskData.description || '',
            targets: this.parseTargets(taskData.target),
            priority: taskData.priority || 'normal',
            scheduleType: this.parseScheduleType(taskData.schedule),
            schedule: this.parseSchedule(taskData.schedule),
            action: {
              type: 'server_restart',
              params: {
                restartMode: 'graceful',
                notifyPlayers: true,
                notifyTime: '5'
              }
            }
          };
        } else {
          this.$message.error('未找到任务数据');
          this.goBack();
        }
        
        this.loading = false;
      }, 500);
    },
    
    // 映射任务类型文本到值
    mapTypeToValue(typeText) {
      const typeMap = {
        '服务器维护': 'server_maintenance',
        '游戏活动': 'game_event',
        '数据备份': 'data_backup',
        '系统维护': 'system_maintenance',
        '公告通知': 'announcement',
        '模组管理': 'mod_management',
        '数据分析': 'data_analysis'
      };
      
      return typeMap[typeText] || '';
    },
    
    // 解析目标服务器
    parseTargets(targetText) {
      if (targetText === '全部服务器') {
        return this.serverList.map(server => server.id);
      }
      
      const server = this.serverList.find(s => s.name === targetText);
      return server ? [server.id] : [];
    },
    
    // 解析调度类型
    parseScheduleType(scheduleText) {
      if (scheduleText.includes('每天')) {
        return 'daily';
      } else if (scheduleText.includes('每周')) {
        return 'weekly';
      } else if (scheduleText.includes('每')) {
        return 'custom';
      } else {
        return 'once';
      }
    },
    
    // 解析调度详情
    parseSchedule(scheduleText) {
      // 默认值
      const schedule = {
        once: {
          dateTime: null
        },
        daily: {
          time: null,
          repeatDays: 1
        },
        weekly: {
          time: null,
          days: []
        },
        custom: {
          expression: ''
        }
      };
      
      // 根据文本解析
      if (scheduleText.includes('每天')) {
        const timeMatch = scheduleText.match(/(\d{1,2}:\d{2})/);
        if (timeMatch) {
          schedule.daily.time = timeMatch[1];
        }
      } else if (scheduleText.includes('每周')) {
        const dayMatch = scheduleText.match(/(一|二|三|四|五|六|日)/);
        const timeMatch = scheduleText.match(/(\d{1,2}:\d{2})/);
        
        if (dayMatch) {
          const dayMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0 };
          schedule.weekly.days = [dayMap[dayMatch[1]]];
        }
        
        if (timeMatch) {
          schedule.weekly.time = timeMatch[1];
        }
      } else if (!scheduleText.includes('每')) {
        // 尝试解析为单次任务日期
        try {
          schedule.once.dateTime = scheduleText;
        } catch (e) {
          console.error('无法解析日期:', scheduleText);
        }
      } else {
        // 自定义调度表达式
        schedule.custom.expression = scheduleText;
      }
      
      return schedule;
    },
    
    // 获取示例任务数据
    getDemoTasks() {
      return [
        {
          id: 1,
          name: '每日服务器重启',
          type: '服务器维护',
          description: '每天凌晨自动重启服务器，清理内存并刷新游戏状态',
          schedule: '每天 04:00',
          target: '主世界服务器',
          lastRun: '2023-05-10 04:00',
          nextRun: '2023-05-11 04:00',
          status: '正常',
          priority: 'high'
        },
        {
          id: 2,
          name: '周末活动开启',
          type: '游戏活动',
          description: '自动开启周末特别活动，增加掉落率和特殊游戏规则',
          schedule: '每周五 18:00',
          target: '全部服务器',
          lastRun: '2023-05-05 18:00',
          nextRun: '2023-05-12 18:00',
          status: '正常',
          priority: 'normal'
        },
        {
          id: 3,
          name: '玩家数据备份',
          type: '数据备份',
          description: '定期备份玩家数据，防止数据丢失',
          schedule: '每6小时',
          target: '全部服务器',
          lastRun: '2023-05-10 18:00',
          nextRun: '2023-05-11 00:00',
          status: '正常',
          priority: 'high'
        },
        {
          id: 4,
          name: '服务器资源清理',
          type: '系统维护',
          description: '清理服务器上的临时文件和日志，释放磁盘空间',
          schedule: '每周一 03:00',
          target: '全部服务器',
          lastRun: '2023-05-08 03:00',
          nextRun: '2023-05-15 03:00',
          status: '正常',
          priority: 'normal'
        }
      ];
    }
  }
};
</script>

<style scoped>
.create-task-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}

.task-form-card {
  margin-bottom: 20px;
}

.el-divider {
  margin: 20px 0;
}

.el-divider__text {
  font-weight: bold;
  color: #409EFF;
}

.form-item-hint {
  margin-left: 10px;
  color: #909399;
  font-size: 13px;
}

.el-checkbox-group {
  display: flex;
  flex-wrap: wrap;
}

.el-checkbox {
  margin-right: 20px;
  margin-bottom: 10px;
}

::v-deep .cron-help {
  text-align: left;
}

::v-deep .cron-help h3 {
  margin-top: 16px;
  margin-bottom: 8px;
  font-size: 16px;
  color: #303133;
}

::v-deep .cron-help p {
  margin: 8px 0;
}

::v-deep .cron-help ul {
  padding-left: 20px;
  margin: 8px 0;
}

::v-deep .cron-help li {
  margin-bottom: 4px;
}

::v-deep .cron-help code {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 2px 6px;
  color: #409EFF;
  font-family: Consolas, Monaco, monospace;
}
</style> 