<template>
  <div class="app-container">
    <el-card class="box-card" shadow="never">
      <template v-slot:header>
<div  class="clearfix">
        <span>定时任务管理</span>
        <el-button-group style="float: right">
          <el-button type="primary" icon="el-icon-plus" @click="handleAddTask">添加任务</el-button>
          <el-button type="warning" icon="el-icon-document" @click="$router.push('/cron/logs')">执行日志</el-button>
          <!-- 统计图表按钮已隐藏 -->
          <!-- 导入导出按钮已隐藏 -->
        </el-button-group>
        <automation-room-select @ready="handleAutomationRoom" @change="handleAutomationRoom" />
      </div>
</template>



      <div class="filter-container">
        <el-form :inline="true" :model="listQuery" class="filter-form">

          <el-form-item label="任务类型">
            <el-select v-model="listQuery.type" placeholder="选择类型" clearable style="width: 150px">
              <el-option label="全部" value=""></el-option>
              <el-option label="函数" value="function"></el-option>
              <el-option label="Shell命令" value="shell"></el-option>
              <el-option label="TMUX命令" value="tmux_command"></el-option>
              <el-option label="TMUX原始命令" value="tmux_raw_command"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="listQuery.status" placeholder="选择状态" clearable style="width: 120px">
              <el-option label="全部" value=""></el-option>
              <el-option label="启用" :value="1"></el-option>
              <el-option label="禁用" :value="0"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="关键词">
            <el-input v-model="listQuery.keyword" placeholder="搜索任务名称或描述" style="width: 220px"></el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="el-icon-search" @click="fetchData">搜索</el-button>
            <el-button type="info" icon="el-icon-refresh" @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table
        v-loading="loading"
        :data="taskList"
        style="width: 100%;"
        border
        stripe
        highlight-current-row
        :row-class-name="tableRowClassName"
        class="task-table">
        <el-table-column prop="id" label="ID" width="60" align="center"></el-table-column>
        <el-table-column prop="name" label="任务名称" min-width="150">
          <template v-slot="scope">
            <div class="task-name-cell">
              <div class="task-name">
                <span class="task-name-text">{{ scope.row.name }}</span>
                <el-tag v-if="isNewTask(scope.row)" size="mini" type="danger" class="task-tag">NEW</el-tag>
              </div>
              <div v-if="scope.row.description" class="task-description">{{ scope.row.description }}</div>
            </div>
          </template>
        </el-table-column>
        <!-- 所属任务组列已隐藏 -->
        <el-table-column prop="spec" label="Cron表达式" min-width="120"></el-table-column>
        <el-table-column prop="type" label="类型" width="120">
          <template v-slot="scope">
            <el-tag :type="getTaskTypeTag(scope.row.type)">
              {{ getTaskTypeName(scope.row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="target" label="目标" min-width="150">
          <template v-slot="scope">
            <div class="target-cell">
              <el-tooltip :content="getFormattedTarget(scope.row)" placement="top" effect="light">
                <div class="target-content">
                  <component :is="getTargetIcon(scope.row.type)" class="legacy-icon target-icon" />
                  <span>{{ truncate(getFormattedTarget(scope.row), 40) }}</span>
                </div>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="dependencies" label="依赖任务" min-width="120">
          <template v-slot="scope">
            <div class="dependencies-cell">
              <span v-if="!scope.row.dependencies || scope.row.dependencies.length === 0" class="no-deps">无依赖</span>
              <div v-else class="deps-list">
                <el-tag
                  v-for="dep in scope.row.dependencies"
                  :key="dep.id"
                  size="small"
                  type="info"
                  effect="plain"
                  class="dep-tag">
                  {{ dep.name || dep.id || dep }}
                </el-tag>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="超时/重试" width="120" align="center">
          <template v-slot="scope">
            <div class="timeout-retry-cell">
              <el-tooltip content="任务超时时间(秒)" placement="top" effect="light">
                <div class="timeout-value">
                  <component :is="'el-icon-time'" class="legacy-icon" />
                  <span>{{ scope.row.timeout || '无限' }}</span>
                </div>
              </el-tooltip>
              <el-tooltip content="重试次数" placement="top" effect="light">
                <div class="retry-value">
                  <component :is="'el-icon-refresh'" class="legacy-icon" />
                  <span>{{ scope.row.retry_times || '0' }}</span>
                </div>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="last_run_time" label="上次执行" min-width="160">
          <template v-slot="scope">
            <div class="last-run-cell">
              <div class="last-run-time">
                <component :is="'el-icon-date'" class="legacy-icon" />
                <span v-if="scope.row.last_run_time && scope.row.last_run_time !== '0001-01-01T00:00:00Z'" class="time-text">{{ formatDateTime(scope.row.last_run_time) }}</span>
                <span v-else class="no-run">未执行</span>
              </div>
              <div v-if="scope.row.last_run_time && scope.row.last_run_time !== '0001-01-01T00:00:00Z'" class="last-status">
                <el-tag size="mini" :type="scope.row.last_status === 1 ? 'success' : 'danger'">
                  {{ scope.row.last_status === 1 ? '成功' : '失败' }}
                </el-tag>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="任务状态" width="80">
          <template v-slot="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'info'">
              {{ scope.row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center">
          <template v-slot="scope">
            <div class="action-buttons">
              <!-- 主要操作按钮组 -->
              <el-tooltip content="立即执行" placement="top">
                <el-button
                  size="mini"
                  type="success"
                  circle
                  @click="handleRunNow(scope.row)"
                  icon="el-icon-video-play">
                </el-button>
              </el-tooltip>

              <el-tooltip :content="scope.row.status === 1 ? '禁用任务' : '启用任务'" placement="top">
                <el-button
                  size="mini"
                  :type="scope.row.status === 1 ? 'warning' : 'success'"
                  circle
                  @click="handleToggleStatus(scope.row)"
                  :icon="scope.row.status === 1 ? 'el-icon-close' : 'el-icon-check'">
                </el-button>
              </el-tooltip>

              <el-tooltip content="编辑任务" placement="top">
                <el-button
                  size="mini"
                  type="primary"
                  circle
                  @click="handleEdit(scope.row)"
                  icon="el-icon-edit">
                </el-button>
              </el-tooltip>

              <!-- 更多操作下拉菜单 -->
              <el-dropdown trigger="click" @command="handleCommand($event, scope.row)" size="mini">
                <el-button size="mini" type="info" circle icon="el-icon-more"></el-button>
                <template v-slot:dropdown>
<el-dropdown-menu >
                  <el-dropdown-item command="viewLogs" icon="el-icon-document">查看日志</el-dropdown-item>
                  <el-dropdown-item command="viewStats" icon="el-icon-data-line">查看统计</el-dropdown-item>
                  <el-dropdown-item divided command="delete" icon="el-icon-delete" class="danger-item">删除任务</el-dropdown-item>
                </el-dropdown-menu>
</template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        :current-page="listQuery.page"
        :page-sizes="[10, 20, 50, 100]"
        :page-size="listQuery.limit"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        style="margin-top: 15px; text-align: right;">
      </el-pagination>
    </el-card>

    <el-dialog title="执行结果" v-model="dialogVisible" width="60%">
      <div v-if="taskResult" class="task-result">
        <div v-if="taskResult.success !== undefined">
          <p><strong>执行状态：</strong> <el-tag :type="taskResult.success ? 'success' : 'danger'">{{ taskResult.success ? '成功' : '失败' }}</el-tag></p>
          <p v-if="taskResult.timestamp"><strong>执行时间：</strong> {{ taskResult.timestamp }}</p>
          <p v-if="taskResult.duration != null"><strong>执行耗时：</strong> {{ formatDuration(taskResult.duration) }}</p>
        </div>

        <div v-if="taskResult.message" class="result-message">
          <strong>消息：</strong>
          <p>{{ taskResult.message }}</p>
        </div>

        <div v-if="taskResult.output" class="result-output">
          <strong>输出结果：</strong>
          <pre>{{ taskResult.output }}</pre>
        </div>

        <div v-if="!taskResult.success && !taskResult.output && !taskResult.message" class="result-empty">
          <el-alert
            title="任务已开始异步执行"
            type="info"
            description="任务正在后台执行，请查看任务日志获取执行结果。"
            show-icon>
          </el-alert>
        </div>
      </div>
      <div v-else class="task-result-empty">
        <el-alert
          title="任务已开始异步执行"
          type="success"
          description="任务正在后台执行，请查看任务日志获取执行结果。"
          show-icon>
        </el-alert>
      </div>
      <template v-slot:footer>
<div  class="dialog-footer">
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="viewTaskLogs(currentTaskId)">查看任务日志</el-button>
      </div>
</template>
    </el-dialog>

    <el-dialog title="任务统计" v-model="statsDialogVisible" width="70%">
      <div v-loading="statsLoading" class="task-stats">
        <div v-if="taskStats" class="stats-overview">
          <div class="stats-card success-rate">
            <div class="stats-title">成功率</div>
            <div class="stats-value">{{ taskStats.success_rate }}%</div>
          </div>
          <div class="stats-card avg-duration">
            <div class="stats-title">平均耗时</div>
            <div class="stats-value">
              {{ taskStats.avg_duration }} {{ taskStats.duration_unit === 's' ? '秒' : '毫秒' }}
              <span v-if="taskStats.duration_unit === 'ms'" class="unit-note">(约 {{ (taskStats.avg_duration / 1000).toFixed(2) }} 秒)</span>
            </div>
          </div>
          <div class="stats-card total-runs">
            <div class="stats-title">总执行次数</div>
            <div class="stats-value">{{ taskStats.total_runs }}</div>
          </div>
          <div class="stats-card last-run">
            <div class="stats-title">最近执行</div>
            <div class="stats-value">{{ taskStats.last_run || '无' }}</div>
          </div>
        </div>
        <div v-if="taskStats && (taskStats.success_count > 0 || taskStats.fail_count > 0)" class="stats-detail">
          <el-row :gutter="20">
            <el-col :span="12">
              <div class="detail-item">
                <span class="detail-label">成功次数:</span>
                <span class="detail-value success">{{ taskStats.success_count }}</span>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="detail-item">
                <span class="detail-label">失败次数:</span>
                <span class="detail-value fail">{{ taskStats.fail_count }}</span>
              </div>
            </el-col>
          </el-row>
          <el-row :gutter="20" v-if="taskStats.last_status !== undefined">
            <el-col :span="24">
              <div class="detail-item">
                <span class="detail-label">最近状态:</span>
                <el-tag :type="taskStats.last_status === 1 ? 'success' : 'danger'">
                  {{ taskStats.last_status === 1 ? '成功' : '失败' }}
                </el-tag>
              </div>
            </el-col>
          </el-row>
        </div>
        <div class="stats-charts">
          <div id="executionChart" style="width: 100%; height: 300px;"></div>
          <div id="durationChart" style="width: 100%; height: 300px;"></div>
        </div>
      </div>
      <template v-slot:footer>
<div  class="dialog-footer">
        <el-button @click="statsDialogVisible = false">关闭</el-button>
        <!-- 查看更多图表按钮已隐藏 -->
      </div>
</template>
    </el-dialog>
  </div>
</template>

<script>
import { cronTaskApi } from '@/api/index';
import * as echarts from 'echarts';
import AutomationRoomSelect from '@/components/AutomationRoomSelect.vue';

export default {
  name: 'TaskList',
  components: { AutomationRoomSelect },
  data() {
    return {
      loading: false,
      statsLoading: false,
      taskList: [],
      groupList: [],
      tmuxCommands: [], // 存储TMUX命令列表
      total: 0,
      listQuery: {
        page: 1,
        limit: 20,
        group_id: '',
        type: '',
        status: '',
        keyword: ''
      },
      dialogVisible: false,
      taskResult: null,
      currentTaskId: null,
      statsDialogVisible: false,
      taskStats: null,
      executionChart: null,
      durationChart: null,
      fetchError: false
    };
  },
  methods: {
    truncate(value, length) {
      if (!value) return '';
      if (value.length <= length) return value;
      return value.substring(0, length) + '...';
    },
    handleAutomationRoom() {
      this.taskList = [];
      this.groupList = [];
      this.total = 0;
      Promise.all([this.fetchGroups(), this.fetchTmuxCommands()])
        .finally(() => this.fetchData());
    },
    // 表格行样式
    tableRowClassName({row}) {
      if (row.status === 0) {
        return 'disabled-row';
      }

      // 只对执行失败的任务设置警告样式
      if (row.last_status === 0 && row.last_run_time && row.last_run_time !== '0001-01-01T00:00:00Z') {
        return 'warning-row';
      }

      // 成功执行的任务不再显示特殊背景色
      return '';
    },

    // 判断是否是新任务（创建时间在3天内且用户未查看过）
    isNewTask(task) {
      if (!task.created_at || !task.id) return false;

      // 从本地存储中获取已查看过的新任务ID
      const viewedNewTasks = JSON.parse(sessionStorage.getItem('viewedNewTasks') || '[]');

      // 如果用户已经查看过这个任务，则不显示新标签
      if (viewedNewTasks.includes(task.id)) {
        return false;
      }

      const createdDate = new Date(task.created_at);
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));

      // 如果是新任务，将其ID添加到已查看列表中
      if (createdDate > threeDaysAgo) {
        // 将任务ID添加到已查看列表中，下次就不会显示新标签了
        // 注意：这里我们延迟添动作，确保用户能看到标签
        setTimeout(() => {
          const updatedViewedTasks = JSON.parse(sessionStorage.getItem('viewedNewTasks') || '[]');
          if (!updatedViewedTasks.includes(task.id)) {
            updatedViewedTasks.push(task.id);
            sessionStorage.setItem('viewedNewTasks', JSON.stringify(updatedViewedTasks));
          }
        }, 2000); // 2秒后添加到已查看列表

        return true;
      }

      return false;
    },

    // 获取任务类型标签颜色
    getTaskTypeTag(type) {
      const typeMap = {
        'function': 'primary',
        'shell': 'success',
        'tmux_command': 'warning',
        'tmux_raw_command': 'danger'
      };
      return typeMap[type] || 'info';
    },

    // 获取任务类型名称
    getTaskTypeName(type) {
      const typeMap = {
        'function': '函数',
        'shell': 'Shell命令',
        'tmux_command': 'TMUX命令',
        'tmux_raw_command': 'TMUX原始命令'
      };
      return typeMap[type] || type;
    },

    // 获取目标图标
    getTargetIcon(type) {
      const iconMap = {
        'function': 'el-icon-s-operation',
        'shell': 'el-icon-s-platform',
        'tmux_command': 'el-icon-s-promotion',
        'tmux_raw_command': 'el-icon-s-opportunity'
      };
      return iconMap[type] || 'el-icon-s-tools';
    },

    // 格式化执行耗时
    formatDuration(duration) {
      if (duration === undefined || duration === null) return '-';

      // 判断是否为毫秒值
      const isMilliseconds = duration > 1000 || duration < 0.01;

      if (isMilliseconds) {
        // 如果是毫秒值
        if (duration >= 1000) {
          // 转换为秒
          return `${(duration / 1000).toFixed(2)} 秒`;
        } else {
          // 保持毫秒
          return `${Math.round(duration)} 毫秒`;
        }
      } else {
        // 已经是秒值
        return `${parseFloat(duration).toFixed(2)} 秒`;
      }
    },

    // 格式化日期时间
    formatDateTime(dateTimeStr) {
      if (!dateTimeStr || dateTimeStr === '0001-01-01T00:00:00Z') {
        return '未计划';
      }

      try {
        const date = new Date(dateTimeStr);
        return date.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
      } catch (e) {
        console.warn('日期格式化失败:', e);
        return dateTimeStr;
      }
    },

    // 获取TMUX命令列表
    fetchTmuxCommands() {
      return cronTaskApi.getTmuxCommands()
        .then(response => {
          if (response.data && response.data.code === 200) {
            this.tmuxCommands = response.data.data || [];
            console.log('获取TMUX命令列表成功:', this.tmuxCommands);
          } else {
            console.warn('获取TMUX命令列表失败:', response.data?.msg);
          }
        })
        .catch(error => {
          console.error('获取TMUX命令列表失败:', error);
          this.tmuxCommands = [];
        });
    },

    // 根据命令ID获取命令名称
    getCommandNameById(commandId) {
      const command = this.tmuxCommands.find(cmd => cmd.id === commandId);
      return command ? command.name : commandId;
    },

    // 根据命令ID获取命令内容
    getCommandContentById(commandId) {
      const command = this.tmuxCommands.find(cmd => cmd.id === commandId);
      return command ? (command.script || command.command || '') : '';
    },

    // 格式化显示目标
    getFormattedTarget(task) {
      if (task.type === 'tmux_command') {
        // 优先使用新的直接字段
        if (task.session_name && task.command_id) {
          const commandName = this.getCommandNameById(task.command_id);
          const commandContent = this.getCommandContentById(task.command_id);
          const params = task.command_params && task.command_params.length > 0
            ? ', 参数: ' + task.command_params.join(', ')
            : '';
          return `服务器: ${task.session_name}, 命令: ${commandName}, 内容: ${commandContent}${params}`;
        }
        // 其次使用tmux_task字段
        else if (task.tmux_task && task.tmux_task.session_name && task.tmux_task.command_id) {
          const commandName = this.getCommandNameById(task.tmux_task.command_id);
          const commandContent = this.getCommandContentById(task.tmux_task.command_id);
          const params = task.tmux_task.command_params && task.tmux_task.command_params.length > 0
            ? ', 参数: ' + task.tmux_task.command_params.join(', ')
            : '';
          return `服务器: ${task.tmux_task.session_name}, 命令: ${commandName}, 内容: ${commandContent}${params}`;
        }
        // 兼容旧的target字段
        else if (task.target) {
          try {
            const targetArray = JSON.parse(task.target);
            if (Array.isArray(targetArray) && targetArray.length >= 2) {
              const commandName = this.getCommandNameById(targetArray[1]);
              const commandContent = this.getCommandContentById(targetArray[1]);
              return `服务器: ${targetArray[0]}, 命令: ${commandName}, 内容: ${commandContent}${targetArray.length > 2 ? ', 参数: ' + targetArray.slice(2).join(', ') : ''}`;
            }
          } catch (e) {
            console.warn('解析目标失败:', e);
          }
        }
      } else if (task.type === 'tmux_raw_command') {
        // 优先使用新的直接字段
        if (task.session_name && task.raw_command) {
          return `服务器: ${task.session_name}, 命令: ${task.raw_command}`;
        }
        // 其次使用tmux_task字段
        else if (task.tmux_task && task.tmux_task.session_name && task.tmux_task.raw_command) {
          return `服务器: ${task.tmux_task.session_name}, 命令: ${task.tmux_task.raw_command}`;
        }
        // 兼容旧的target字段
        else if (task.target) {
          try {
            const targetArray = JSON.parse(task.target);
            if (Array.isArray(targetArray) && targetArray.length >= 2) {
              return `服务器: ${targetArray[0]}, 命令: ${targetArray[1]}`;
            }
          } catch (e) {
            console.warn('解析目标失败:', e);
          }
        }
      }
      return task.target;
    },

    fetchData() {
      this.loading = true;
      console.log('开始获取任务列表, 查询参数:', this.listQuery);
      cronTaskApi.getTasks(this.listQuery)
        .then(response => {
          console.log('获取任务列表响应:', response);

          // 处理各种可能的响应格式
          let tasksData = [];
          let success = false;

          // 直接处理原始响应
          if (response && response.code === 200) {
            // 处理直接返回的数据 {code: 200, data: ...}
            if (Array.isArray(response.data)) {
              // 如果数据是数组
              tasksData = response.data;
              success = true;
            } else if (response.data && typeof response.data === 'object') {
              // 如果数据是对象数组
              if (Array.isArray(response.data.items)) {
                tasksData = response.data.items;
                this.total = response.data.total || tasksData.length;
                success = true;
              } else {
                // 如果是单个对象，将其包装为数组
                tasksData = [response.data];
                this.total = 1;
                success = true;
              }
            }
          } else if (response && response.data) {
            // 处理嵌套响应
            // 处理标准格式 {data: {code: 200, data: [...], msg: "success"}}
            if (response.data.code === 200) {
              if (Array.isArray(response.data.data)) {
                tasksData = response.data.data;
                success = true;
              } else if (response.data.data && typeof response.data.data === 'object') {
                if (Array.isArray(response.data.data.items)) {
                  // 处理嵌套格式 {data: {code: 200, data: {items: [...], total: 10}}}
                  tasksData = response.data.data.items;
                  this.total = response.data.data.total || tasksData.length;
                  success = true;
                } else {
                  // 如果是单个对象，将其包装为数组
                  tasksData = [response.data.data];
                  this.total = 1;
                  success = true;
                }
              }
            }
            // 处理旧API格式 {data: {status: 200, data: [...]}}
            else if (response.data.status === 200) {
              if (Array.isArray(response.data.data)) {
                tasksData = response.data.data;
                success = true;
              } else if (response.data.data && typeof response.data.data === 'object') {
                if (Array.isArray(response.data.data.items)) {
                  tasksData = response.data.data.items;
                  this.total = response.data.data.total || tasksData.length;
                  success = true;
                } else {
                  // 如果是单个对象，将其包装为数组
                  tasksData = [response.data.data];
                  this.total = 1;
                  success = true;
                }
              }
            }
            // 直接返回数组的情况
            else if (Array.isArray(response.data)) {
              tasksData = response.data;
              success = true;
            }
          }

          if (success) {
            console.log('原始任务数据:', tasksData);

            // 遍历任务列表，处理数据
            tasksData.forEach(task => {
              // 处理dependencies
              try {
                if (typeof task.dependencies === 'string') {
                  if (task.dependencies) {
                    try {
                      const parsedDeps = JSON.parse(task.dependencies);
                      task.dependencies = Array.isArray(parsedDeps) ? parsedDeps : [];
                    } catch (e) {
                      console.warn(`解析任务 ${task.id} 的dependencies失败:`, e);
                      task.dependencies = [];
                    }
                  } else {
                    task.dependencies = [];
                  }
                } else if (!task.dependencies) {
                  task.dependencies = [];
                }
              } catch (e) {
                console.error('处理dependencies时发生错误:', e);
                task.dependencies = [];
              }

              // 给任务添加group_name属性
              task.group_name = task.group_id === 0 ? '未分组' :
                this.groupList.find(g => g.id === task.group_id)?.name || '未知';

              // 如果下次执行时间是无效值或不存在，设置为空
              if (!task.next_run_time || task.next_run_time === '0001-01-01T00:00:00Z') {
                task.next_run = '';
              } else {
                task.next_run = task.next_run_time;
              }
            });

            console.log('处理后的任务数据:', tasksData);
            this.taskList = tasksData;
            this.total = this.total || tasksData.length;
          } else {
            console.error('无法识别的响应格式:', response);
            this.$message.error('获取任务列表失败: 无法识别的响应格式');
            this.taskList = [];
            this.total = 0;
            this.fetchError = true;
          }
        })
        .catch(error => {
          console.error('获取任务列表失败:', error);
          this.$message.error('获取任务列表失败: ' + (error.message || '未知错误'));
          this.taskList = [];
          this.total = 0;
          this.fetchError = true;
        })
        .finally(() => {
          this.loading = false;
        });
    },
    fetchGroups() {
      console.log('开始获取任务组列表');
      cronTaskApi.getGroups()
        .then(response => {
          console.log('获取任务组列表响应:', response);

          // 处理各种可能的响应格式
          let groupsData = [];
          let success = false;

          if (response && response.data) {
            // 处理标准格式 {code: 200, data: [...], msg: "success"}
            if (response.data.code === 200 && Array.isArray(response.data.data)) {
              groupsData = response.data.data;
              success = true;
            }
            // 处理嵌套格式 {code: 200, data: {items: [...], total: 10}}
            else if (response.data.code === 200 && response.data.data && Array.isArray(response.data.data.items)) {
              groupsData = response.data.data.items;
              success = true;
            }
            // 处理旧API格式 {status: 200, data: [...]}
            else if (response.data.status === 200 && Array.isArray(response.data.data)) {
              groupsData = response.data.data;
              success = true;
            }
            // 直接返回数组的情况
            else if (Array.isArray(response.data)) {
              groupsData = response.data;
              success = true;
            }
          }

          if (success) {
            console.log('原始任务组数据:', groupsData);

            // 遍历任务组并处理数据
            groupsData.forEach(group => {
              // 确保task_count属性存在
              if (group.task_count === undefined && group.tasks !== undefined) {
                group.task_count = Array.isArray(group.tasks) ? group.tasks.length : 0;
              } else if (group.task_count === undefined) {
                group.task_count = 0;
              }
            });

            console.log('处理后的任务组数据:', groupsData);
            this.groupList = groupsData;
          } else {
            console.error('无法识别的响应格式:', response);
            this.$message.error(response.data?.msg || response.data?.message || '获取任务组列表失败: 无法识别的响应格式');
            this.groupList = [];
          }
        })
        .catch(error => {
          console.error('获取任务组列表失败:', error);
          this.$message.error('获取任务组列表失败: ' + (error.message || '未知错误'));
          this.groupList = [];
          this.fetchError = true;
        });
    },
    handleSizeChange(val) {
      this.listQuery.limit = val;
      this.fetchData();
    },
    handleCurrentChange(val) {
      this.listQuery.page = val;
      this.fetchData();
    },
    resetQuery() {
      this.listQuery = {
        page: 1,
        limit: 20,
        group_id: '',
        type: '',
        status: '',
        keyword: ''
      };
      this.fetchData();
    },
    handleAddTask() {
      this.$router.push('/cron/add');
    },
    handleEdit(row) {
      this.$router.push(`/cron/edit/${row.id}`);
    },
    handleDelete(row) {
      this.$confirm('确定要删除此任务吗？删除后不可恢复', '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        cronTaskApi.deleteTask(row.id)
          .then(response => {
            console.log('删除任务响应:', response);
            // 处理多种可能的响应格式
            if (
              (response.code === 200) || // 直接返回 {code: 200, data: {...}}
              (response.data && response.data.code === 200) || // 嵌套格式 {data: {code: 200, ...}}
              (response.status === 200) || // 旧格式 {status: 200, ...}
              (response.data && response.data.status === 200) // 嵌套旧格式
            ) {
              this.$message.success('删除成功');
              this.fetchData();
            } else {
              const errorMsg =
                response.msg ||
                response.message ||
                (response.data && (response.data.msg || response.data.message)) ||
                '删除失败';
              this.$message.error(errorMsg);
            }
          })
          .catch(error => {
            console.error('删除任务失败:', error);
            this.$message.error('删除任务失败');
          });
      }).catch(() => {
        this.$message.info('已取消删除');
      });
    },
    handleToggleStatus(row) {
      const action = row.status === 1 ? '禁用' : '启用';
      const actionApi = row.status === 1 ? cronTaskApi.disableTask : cronTaskApi.enableTask;

      this.$confirm(`确定要${action}此任务吗？`, `确认${action}`, {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        actionApi(row.id)
          .then(response => {
            console.log(`${action}任务响应:`, response);
            // 处理多种可能的响应格式
            if (
              (response.code === 200) || // 直接返回 {code: 200, data: {...}}
              (response.data && response.data.code === 200) || // 嵌套格式 {data: {code: 200, ...}}
              (response.status === 200) || // 旧格式 {status: 200, ...}
              (response.data && response.data.status === 200) // 嵌套旧格式
            ) {
              this.$message.success(`${action}成功`);
              this.fetchData();
            } else {
              const errorMsg =
                response.msg ||
                response.message ||
                (response.data && (response.data.msg || response.data.message)) ||
                `${action}失败`;
              this.$message.error(errorMsg);
            }
          })
          .catch(error => {
            console.error(`${action}任务失败:`, error);
            this.$message.error(`${action}任务失败`);
          });
      }).catch(() => {
        this.$message.info(`已取消${action}`);
      });
    },
    handleRunNow(row) {
      this.$confirm('确定要立即执行此任务吗？', '确认执行', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        this.loading = true;
        this.currentTaskId = row.id;
        cronTaskApi.runTask(row.id)
          .then(response => {
            console.log('立即执行任务响应:', response);
            // 处理多种可能的响应格式
            if (
              (response.code === 200) || // 直接返回 {code: 200, data: {...}}
              (response.data && response.data.code === 200) || // 嵌套格式 {data: {code: 200, ...}}
              (response.status === 200) || // 旧格式 {status: 200, ...}
              (response.data && response.data.status === 200) // 嵌套旧格式
            ) {
              // 获取成功消息
              const successMsg =
                response.msg ||
                (response.data && response.data.msg) ||
                '任务已开始运行';

              this.$message.success(successMsg);

              // 检查是否有日志ID
              let logId = null;

              // 尝试从不同格式的响应中获取日志ID
              if (response.data && response.data.log_id) {
                // 新格式: {code: 200, data: {log_id: 123}, msg: "success"}
                logId = response.data.log_id;
              } else if (response.data && response.data.data && response.data.data.log_id) {
                // 嵌套格式: {data: {code: 200, data: {log_id: 123}, msg: "success"}}
                logId = response.data.data.log_id;
              }

              if (logId) {
                // 如果有日志ID，跳转到任务执行结果页面
                this.$router.push({
                  path: `/cron/execution/${logId}`,
                  query: { from: 'tasks' }
                });
              } else {
                // 如果没有日志ID，使用旧的处理方式
                // 处理不同格式的响应数据
                if (response.data && response.data.data) {
                  // 如果有详细的执行结果数据，显示结果对话框
                  this.taskResult = response.data.data;
                  this.dialogVisible = true;
                } else if (response.data && typeof response.data !== 'object') {
                  // 如果 data 不是对象，可能是简单的文本结果
                  this.taskResult = { output: response.data };
                  this.dialogVisible = true;
                } else if (response.code === 200 && response.data === null) {
                  // 如果是异步任务，不显示结果对话框，只显示成功消息
                  // 已经在上面显示了成功消息，这里不需要额外操作

                  // 可选：将任务添加到待查看列表，并提示用户查看日志
                  this.$confirm('任务已开始异步执行，是否查看任务日志？', '任务执行中', {
                    confirmButtonText: '查看日志',
                    cancelButtonText: '稍后再看',
                    type: 'success',
                    center: true
                  }).then(() => {
                    this.viewTaskLogs(row.id);
                  }).catch(() => {});
                } else {
                  // 其他情况，尝试显示结果
                  this.taskResult = response.data || { message: successMsg };
                  this.dialogVisible = true;
                }
              }
            } else {
              const errorMsg =
                response.msg ||
                response.message ||
                (response.data && (response.data.msg || response.data.message)) ||
                '任务执行失败';
              this.$message.error(errorMsg);
            }
          })
          .catch(error => {
            console.error('执行任务失败:', error);
            this.$message.error('执行任务失败');
          })
          .finally(() => {
            this.loading = false;
          });
      }).catch(() => {
        this.$message.info('已取消执行');
      });
    },
    viewTaskLogs(taskId) {
      this.$router.push({
        path: '/cron/logs',
        query: { task_id: taskId }
      });
    },
    viewTaskStats(taskId) {
      this.statsDialogVisible = true;
      this.statsLoading = true;
      this.currentTaskId = taskId;

      // 获取任务统计数据
      cronTaskApi.getTaskStats(taskId)
        .then(response => {
          console.log('获取任务统计数据响应:', response);

          // 处理多种可能的响应格式
          if (
            (response.code === 200) || // 直接返回 {code: 200, data: {...}}
            (response.data && response.data.code === 200) || // 嵌套格式 {data: {code: 200, ...}}
            (response.status === 200) || // 旧格式 {status: 200, ...}
            (response.data && response.data.status === 200) // 嵌套旧格式
          ) {
            // 处理不同格式的响应数据
            if (response.data && response.code === 200) {
              // 直接返回 {code: 200, data: {...}}
              this.taskStats = this.formatTaskStats(response.data);
            } else if (response.data && response.data.code === 200) {
              // 嵌套格式 {data: {code: 200, data: {...}}}
              this.taskStats = this.formatTaskStats(response.data.data);
            } else if (response.data) {
              // 其他格式
              this.taskStats = this.formatTaskStats(response.data);
            }

            console.log('处理后的任务统计数据:', this.taskStats);

            // 获取执行状态图表数据
            cronTaskApi.getTaskChart(taskId, { days: 30 })
              .then(chartResponse => {
                console.log('获取任务图表数据响应:', chartResponse);
                // 处理多种可能的响应格式
                if (
                  (chartResponse.code === 200) || // 直接返回 {code: 200, data: {...}}
                  (chartResponse.data && chartResponse.data.code === 200) // 嵌套格式 {data: {code: 200, ...}}
                ) {
                  let chartData;
                  if (chartResponse.code === 200) {
                    chartData = chartResponse.data;
                  } else {
                    chartData = chartResponse.data.data;
                  }

                  this.$nextTick(() => {
                    this.initExecutionChart(chartData);
                  });
                }
              });

            // 获取执行时长图表数据
            cronTaskApi.getTaskDurationChart(taskId, { days: 30 })
              .then(durationResponse => {
                console.log('获取任务时长图表数据响应:', durationResponse);
                // 处理多种可能的响应格式
                if (
                  (durationResponse.code === 200) || // 直接返回 {code: 200, data: {...}}
                  (durationResponse.data && durationResponse.data.code === 200) // 嵌套格式 {data: {code: 200, ...}}
                ) {
                  let chartData;
                  if (durationResponse.code === 200) {
                    chartData = durationResponse.data;
                  } else {
                    chartData = durationResponse.data.data;
                  }

                  this.$nextTick(() => {
                    this.initDurationChart(chartData);
                  });
                }
              });
          } else {
            const errorMsg =
              response.msg ||
              response.message ||
              (response.data && (response.data.msg || response.data.message)) ||
              '获取任务统计失败';
            this.$message.error(errorMsg);
          }
        })
        .catch(error => {
          console.error('获取任务统计失败:', error);
          this.$message.error('获取任务统计失败');
        })
        .finally(() => {
          this.statsLoading = false;
        });
    },

    // 格式化任务统计数据，使其符合模板期望的格式
    formatTaskStats(data) {
      if (!data) return {};

      // 计算成功率
      let successRate = 0;
      if (data.total_count && data.total_count > 0) {
        successRate = Math.round((data.success_count / data.total_count) * 100);
      }

      // 格式化最近执行时间
      let lastRun = data.last_run_time || data.last_run || '';
      if (lastRun && lastRun.includes('T')) {
        // 将ISO格式转换为更友好的格式
        try {
          const date = new Date(lastRun);
          lastRun = date.toLocaleString();
        } catch (e) {
          console.warn('日期格式化失败:', e);
        }
      }

      // 处理平均耗时，将毫秒转换为更易读的格式
      let formattedDuration = 0;
      let durationUnit = 'ms'; // 默认单位为毫秒

      if (data.avg_duration) {
        const durationMs = parseFloat(data.avg_duration);

        if (durationMs >= 1000) {
          // 如果超过1秒，转换为秒
          formattedDuration = (durationMs / 1000).toFixed(2);
          durationUnit = 's';
        } else {
          // 保持毫秒单位，但四舍五入为整数
          formattedDuration = Math.round(durationMs);
          durationUnit = 'ms';
        }
      }

      return {
        success_rate: successRate,
        avg_duration: formattedDuration,
        duration_unit: durationUnit,
        total_runs: data.total_count || data.total_runs || 0,
        last_run: lastRun,
        success_count: data.success_count || 0,
        fail_count: data.fail_count || 0,
        last_status: data.last_status
      };
    },
    initExecutionChart(data) {
      const chartDom = document.getElementById('executionChart');
      if (!chartDom) return;

      this.executionChart = echarts.init(chartDom);

      const option = {
        title: {
          text: '任务执行成功/失败统计（近30天）',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        legend: {
          data: ['成功', '失败'],
          bottom: 10
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: data.dates || []
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: '成功',
            type: 'bar',
            stack: 'total',
            itemStyle: {
              color: '#4f8a5b'
            },
            data: data.success || []
          },
          {
            name: '失败',
            type: 'bar',
            stack: 'total',
            itemStyle: {
              color: '#c94f4f'
            },
            data: data.failed || []
          }
        ]
      };

      this.executionChart.setOption(option);
    },
    initDurationChart(data) {
      const chartDom = document.getElementById('durationChart');
      if (!chartDom) return;

      this.durationChart = echarts.init(chartDom);

      const option = {
        title: {
          text: '任务执行时长统计（近30天）',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis'
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '10%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: data.dates || []
        },
        yAxis: {
          type: 'value',
          name: '执行时长(秒)'
        },
        series: [
          {
            data: data.durations || [],
            type: 'line',
            name: '执行时长',
            smooth: true,
            areaStyle: {},
            itemStyle: {
              color: '#3f7656'
            }
          }
        ]
      };

      this.durationChart.setOption(option);
    },
    retryFetch() {
      this.fetchError = false;
      this.fetchGroups();

      // 先获取任务组，然后获取任务列表
      setTimeout(() => {
        this.fetchData();
      }, 200);
    },

    // 处理下拉菜单命令
    handleCommand(command, row) {
      switch (command) {
        case 'viewLogs':
          this.viewTaskLogs(row.id);
          break;
        case 'viewStats':
          this.viewTaskStats(row.id);
          break;
        case 'delete':
          this.handleDelete(row);
          break;
        default:
          break;
      }
    }
  },
  beforeUnmount() {
    if (this.executionChart) {
      this.executionChart.dispose();
    }
    if (this.durationChart) {
      this.durationChart.dispose();
    }
  }
};
</script>

<style scoped>
.filter-container {
  margin-bottom: 20px;
}
.filter-form {
  margin-top: 15px;
}

/* 表格样式 */
.task-table {
  margin-bottom: 20px;
  border-radius: 4px;
  overflow: hidden;
}

/* 表格行样式 */
.task-table :deep(.disabled-row) {
  background-color: #f9f9f9;
  color: var(--text-secondary);
}

.task-table :deep(.success-row) {
  background-color: #f0f9eb;
}

.task-table :deep(.warning-row) {
  background-color: #fdf6ec;
}

/* 任务名称单元格 */
.task-name-cell {
  display: flex;
  flex-direction: column;
}

.task-name {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.task-name-text {
  font-weight: bold;
  margin-right: 5px;
}

.task-tag {
  margin-left: 5px;
}

.task-description {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

/* 目标单元格 */
.target-cell {
  display: flex;
  align-items: center;
}

.target-content {
  display: flex;
  align-items: center;
}

.target-icon {
  margin-right: 5px;
  font-size: 16px;
  color: var(--primary-color);
}

/* 依赖任务单元格 */
.dependencies-cell {
  display: flex;
  flex-direction: column;
}

.no-deps {
  color: var(--text-secondary);
  font-size: 12px;
  font-style: italic;
}

.deps-list {
  display: flex;
  flex-wrap: wrap;
}

.dep-tag {
  margin-right: 5px;
  margin-bottom: 5px;
}

/* 超时/重试单元格 */
.timeout-retry-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.timeout-value, .retry-value {
  display: flex;
  align-items: center;
  margin: 2px 0;
}

.timeout-value i, .retry-value i {
  margin-right: 5px;
  color: var(--text-secondary);
}

/* 下次执行单元格 */
.next-run-cell {
  display: flex;
  align-items: center;
}

.next-run-cell i {
  margin-right: 5px;
  color: var(--primary-color);
}

.next-run-time {
  color: var(--text-primary);
}

.no-schedule {
  color: var(--text-secondary);
  font-style: italic;
}

/* 上次执行单元格 */
.last-run-cell {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.last-run-time {
  display: flex;
  align-items: center;
}

.last-run-time i {
  margin-right: 5px;
  color: var(--primary-color);
}

.time-text {
  color: var(--text-primary);
}

.no-run {
  color: var(--text-secondary);
  font-style: italic;
}

.last-status {
  margin-top: 3px;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: nowrap;
}

.action-buttons .el-button {
  margin: 0 3px;
}

.action-buttons .el-dropdown {
  margin: 0 3px;
}

:deep(.danger-item) {
  color: #c94f4f;
}

/* 统计对话框样式 */
.task-result {
  padding: 10px;
}
.task-result p {
  margin: 10px 0;
  line-height: 1.5;
}
.task-result-empty {
  padding: 20px 0;
}
.result-message {
  margin: 15px 0;
  padding: 10px;
  background-color: #f8f8f8;
  border-radius: 4px;
}
.result-message p {
  margin: 5px 0;
  color: var(--text-regular);
}
.result-output {
  margin-top: 15px;
}
.result-output pre {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: Consolas, Monaco, 'Andale Mono', monospace;
  font-size: 13px;
  color: #333;
}
.result-empty {
  margin: 15px 0;
}
.stats-overview {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.stats-card {
  flex: 1;
  min-width: 180px;
  margin: 0 10px 10px 0;
  padding: 15px;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  text-align: center;
}
.stats-title {
  font-size: 14px;
  color: var(--text-regular);
  margin-bottom: 10px;
}
.stats-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--text-primary);
}

.unit-note {
  font-size: 12px;
  font-weight: normal;
  color: var(--text-secondary);
  display: block;
  margin-top: 5px;
}
.success-rate {
  border-left: 4px solid #4f8a5b;
}
.avg-duration {
  border-left: 4px solid var(--primary-color);
}
.total-runs {
  border-left: 4px solid #d99b32;
}
.last-run {
  border-left: 4px solid var(--text-secondary);
}
.stats-detail {
  margin: 20px 0;
  padding: 15px;
  background-color: #f8f8f8;
  border-radius: 4px;
}
.detail-item {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
}
.detail-label {
  font-size: 14px;
  color: var(--text-regular);
  margin-right: 10px;
  min-width: 80px;
}
.detail-value {
  font-size: 16px;
  font-weight: bold;
}
.detail-value.success {
  color: #4f8a5b;
}
.detail-value.fail {
  color: #c94f4f;
}
.stats-charts {
  margin-top: 20px;
}
</style>
