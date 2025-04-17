<template>
  <div class="app-container">
    <el-card class="box-card" shadow="never">
      <div slot="header" class="clearfix">
        <span>定时任务管理</span>
        <el-button-group style="float: right">
          <el-button type="primary" icon="el-icon-plus" @click="handleAddTask">添加任务</el-button>
          <el-button type="success" icon="el-icon-folder-add" @click="$router.push('/cron/group/add')">添加任务组</el-button>
          <el-button type="info" icon="el-icon-folder" @click="$router.push('/cron/groups')">任务组管理</el-button>
          <el-button type="warning" icon="el-icon-document" @click="$router.push('/cron/logs')">执行日志</el-button>
          <el-button type="danger" icon="el-icon-pie-chart" @click="$router.push('/cron/charts')">统计图表</el-button>
          <el-button type="primary" icon="el-icon-upload2" @click="$router.push('/cron/import-export')">导入导出</el-button>
        </el-button-group>
      </div>

      <el-alert
        v-if="fetchError"
        title="获取任务组列表失败"
        type="error"
        description="无法加载任务组数据，这可能会影响任务显示。"
        show-icon
        :closable="true"
        @close="fetchError = false"
        style="margin-bottom: 15px;">
        <el-button type="primary" size="small" @click="retryFetch" style="margin-left: 15px;">重试</el-button>
      </el-alert>

      <div class="filter-container">
        <el-form :inline="true" :model="listQuery" class="filter-form">
          <el-form-item label="任务组">
            <el-select v-model="listQuery.group_id" placeholder="选择任务组" clearable style="width: 200px">
              <el-option label="全部" value=""></el-option>
              <el-option
                v-for="group in groupList"
                :key="group.id"
                :label="group.name"
                :value="group.id">
              </el-option>
            </el-select>
          </el-form-item>
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

      <el-table v-loading="loading" :data="taskList" style="width: 100%;" border>
        <el-table-column prop="id" label="ID" width="60" align="center"></el-table-column>
        <el-table-column prop="name" label="任务名称" min-width="120">
          <template slot-scope="scope">
            <el-tooltip v-if="scope.row.description" :content="scope.row.description" placement="top" effect="light">
              <span>{{ scope.row.name }}</span>
            </el-tooltip>
            <span v-else>{{ scope.row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="group_name" label="所属任务组" min-width="120">
          <template slot-scope="scope">
            <el-tag size="medium" @click="$router.push(`/cron/group/${scope.row.group_id}`)" style="cursor: pointer">
              {{ scope.row.group_name || '未分组' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="spec" label="Cron表达式" min-width="120"></el-table-column>
        <el-table-column prop="type" label="类型" width="120">
          <template slot-scope="scope">
            <el-tag :type="getTaskTypeTag(scope.row.type)">
              {{ getTaskTypeName(scope.row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="target" label="目标" min-width="150">
          <template slot-scope="scope">
            <el-tooltip :content="getFormattedTarget(scope.row)" placement="top" effect="light">
              <span>{{ getFormattedTarget(scope.row) | truncate(30) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="dependencies" label="依赖任务" min-width="120">
          <template slot-scope="scope">
            <span v-if="!scope.row.dependencies || scope.row.dependencies.length === 0">无</span>
            <div v-else>
              <p style="margin: 0; color: #999; font-size: 10px;">(原始值: {{ JSON.stringify(scope.row.dependencies) }})</p>
              <el-tag
                v-for="dep in scope.row.dependencies"
                :key="dep.id"
                size="small"
                type="info"
                style="margin-right: 5px; margin-bottom: 3px;">
                {{ dep.name || dep.id || dep }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="超时/重试" width="100" align="center">
          <template slot-scope="scope">
            <el-tooltip content="任务超时时间(秒)/重试次数" placement="top" effect="light">
              <span>{{ scope.row.timeout || '-' }} / {{ scope.row.retry_times || '0' }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="next_run" label="下次执行" min-width="120">
          <template slot-scope="scope">
            <span>{{ scope.row.next_run || '未计划' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'info'">
              {{ scope.row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" align="center">
          <template slot-scope="scope">
            <el-button-group>
              <el-button
                size="mini"
                type="success"
                @click="handleRunNow(scope.row)"
                icon="el-icon-video-play">
                执行
              </el-button>
              <el-button
                size="mini"
                :type="scope.row.status === 1 ? 'warning' : 'success'"
                @click="handleToggleStatus(scope.row)"
                :icon="scope.row.status === 1 ? 'el-icon-close' : 'el-icon-check'">
                {{ scope.row.status === 1 ? '禁用' : '启用' }}
              </el-button>
              <el-button
                size="mini"
                type="primary"
                @click="handleEdit(scope.row)"
                icon="el-icon-edit">
                编辑
              </el-button>
              <el-button
                size="mini"
                type="danger"
                @click="handleDelete(scope.row)"
                icon="el-icon-delete">
                删除
              </el-button>
            </el-button-group>
            <div style="margin-top: 5px;">
              <el-button
                size="mini"
                type="info"
                @click="viewTaskLogs(scope.row.id)"
                icon="el-icon-document">
                日志
              </el-button>
              <el-button
                size="mini"
                type="warning"
                @click="viewTaskStats(scope.row.id)"
                icon="el-icon-data-line">
                统计
              </el-button>
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

    <el-dialog title="执行结果" :visible.sync="dialogVisible" width="60%">
      <div v-if="taskResult" class="task-result">
        <p><strong>执行状态：</strong> {{ taskResult.success ? '成功' : '失败' }}</p>
        <p><strong>执行时间：</strong> {{ taskResult.timestamp }}</p>
        <p v-if="taskResult.duration != null"><strong>执行耗时：</strong> {{ taskResult.duration }} 秒</p>
        <div class="result-output">
          <strong>输出结果：</strong>
          <pre>{{ taskResult.output }}</pre>
        </div>
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="viewTaskLogs(currentTaskId)">查看完整日志</el-button>
      </div>
    </el-dialog>

    <el-dialog title="任务统计" :visible.sync="statsDialogVisible" width="70%">
      <div v-loading="statsLoading" class="task-stats">
        <div v-if="taskStats" class="stats-overview">
          <div class="stats-card success-rate">
            <div class="stats-title">成功率</div>
            <div class="stats-value">{{ taskStats.success_rate }}%</div>
          </div>
          <div class="stats-card avg-duration">
            <div class="stats-title">平均耗时</div>
            <div class="stats-value">{{ taskStats.avg_duration }}秒</div>
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
      <div slot="footer" class="dialog-footer">
        <el-button @click="statsDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="$router.push('/cron/charts')">查看更多图表</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { cronTaskApi } from '@/api/index';
import echarts from 'echarts';
import axios from 'axios';
import config from '@/api/config';

export default {
  name: 'TaskList',
  filters: {
    truncate(value, length) {
      if (!value) return '';
      if (value.length <= length) return value;
      return value.substring(0, length) + '...';
    }
  },
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
  created() {
    // 先获取任务组，然后再获取任务列表
    this.fetchGroups();

    // 获取TMUX命令列表
    this.fetchTmuxCommands();

    // 延迟一点点时间再获取任务列表，确保已经获取到了任务组数据
    setTimeout(() => {
      this.fetchData();
    }, 100);
  },
  methods: {
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

    // 获取TMUX命令列表
    fetchTmuxCommands() {
      // 调用API获取TMUX命令列表
      axios.get(`${config.BASE_URL}/cron/tmux/commands`)
        .then(response => {
          if (response.data.code === 200) {
            this.tmuxCommands = response.data.data || [];
            console.log('获取TMUX命令列表成功:', this.tmuxCommands);
          } else {
            console.warn('获取TMUX命令列表失败:', response.data.msg);
          }
        })
        .catch(error => {
          console.error('获取TMUX命令列表失败:', error);
          // 尝试使用备用API
          axios.get(`${config.BASE_URL}/tmux/commands`)
            .then(fallbackResponse => {
              if (fallbackResponse.data.status === 200) {
                this.tmuxCommands = fallbackResponse.data.data || [];
                console.log('使用备用API获取TMUX命令列表成功:', this.tmuxCommands);
              }
            })
            .catch(fallbackError => {
              console.error('备用API获取TMUX命令列表失败:', fallbackError);
            });
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
              this.$message.success('任务执行成功');
              // 处理不同格式的响应数据
              if (response.data) {
                this.taskResult = response.data.data || response.data;
              } else {
                this.taskResult = response.data;
              }
              this.dialogVisible = true;
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

      return {
        success_rate: successRate,
        avg_duration: data.avg_duration ? parseFloat(data.avg_duration).toFixed(2) : 0,
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
              color: '#67C23A'
            },
            data: data.success || []
          },
          {
            name: '失败',
            type: 'bar',
            stack: 'total',
            itemStyle: {
              color: '#F56C6C'
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
              color: '#409EFF'
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
    }
  },
  beforeDestroy() {
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
.task-result {
  padding: 10px;
}
.result-output {
  margin-top: 10px;
}
.result-output pre {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
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
  color: #606266;
  margin-bottom: 10px;
}
.stats-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}
.success-rate {
  border-left: 4px solid #67C23A;
}
.avg-duration {
  border-left: 4px solid #409EFF;
}
.total-runs {
  border-left: 4px solid #E6A23C;
}
.last-run {
  border-left: 4px solid #909399;
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
  color: #606266;
  margin-right: 10px;
  min-width: 80px;
}
.detail-value {
  font-size: 16px;
  font-weight: bold;
}
.detail-value.success {
  color: #67C23A;
}
.detail-value.fail {
  color: #F56C6C;
}
.stats-charts {
  margin-top: 20px;
}
</style>