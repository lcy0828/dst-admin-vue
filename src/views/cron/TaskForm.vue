<template>
  <div class="app-container">
    <el-card class="box-card">
      <template v-slot:header>
<div  class="clearfix">
        <span>{{ isEdit ? '编辑任务' : '添加任务' }}</span>
        <el-button-group style="float: right">
          <el-button type="primary" icon="el-icon-back" @click="$router.push('/cron/tasks')">返回列表</el-button>
        </el-button-group>
        <automation-room-select @ready="handleAutomationRoom" @change="handleAutomationRoom" />
      </div>
</template>
      <el-form :model="taskForm" :rules="rules" ref="taskForm" label-width="120px">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="基本信息" name="basic">
            <el-form-item label="任务名称" prop="name">
              <el-input v-model="taskForm.name" placeholder="请输入任务名称"></el-input>
            </el-form-item>

            <el-form-item label="任务描述" prop="description">
              <el-input type="textarea" :rows="2" v-model="taskForm.description" placeholder="请输入任务描述"></el-input>
            </el-form-item>

            <el-form-item label="所属任务组" prop="group_id">
              <el-select v-model="taskForm.group_id" placeholder="请选择任务组" filterable style="width: 100%;">
                <el-option label="无分组" :value="0"></el-option>
                <el-option
                  v-for="group in groupList"
                  :key="group.id"
                  :label="group.name"
                  :value="group.id">
                </el-option>
              </el-select>
            </el-form-item>

            <el-form-item label="Cron表达式" prop="spec">
              <el-input v-model="taskForm.spec" placeholder="请输入Cron表达式，例如：0 0 * * * *"></el-input>
              <div class="cron-help">
                <p>Cron表达式格式：秒 分 时 日 月 星期 [年]</p>
                <p>示例：</p>
                <ul>
                  <li>每小时执行一次：0 0 * * * *</li>
                  <li>每5分钟执行一次：0 */5 * * * *</li>
                  <li>每天凌晨2点执行：0 0 2 * * *</li>
                  <li>每周日凌晨1点执行：0 0 1 * * 0</li>
                </ul>
              </div>
            </el-form-item>

            <el-form-item label="任务类型" prop="type">
              <el-radio-group v-model="taskForm.type">
                <el-radio label="function">函数</el-radio>
                <el-radio label="shell">Shell命令</el-radio>
                <el-radio label="tmux_command">TMUX命令</el-radio>
                <el-radio label="tmux_raw_command">TMUX原始命令</el-radio>
              </el-radio-group>
              <el-alert
                v-if="taskForm.type === 'shell' || taskForm.type === 'tmux_raw_command'"
                title="当前 v2 后端禁止定时执行任意命令，请改用受控函数或内建 TMUX 命令"
                type="warning"
                :closable="false"
                show-icon
                style="margin-top: 10px;"
              />
            </el-form-item>

            <el-form-item v-if="taskForm.type === 'function'" label="选择函数" prop="target">
              <el-select
                v-model="taskForm.target"
                placeholder="请选择函数"
                filterable
                style="width: 100%;">
                <el-option
                  v-for="func in functionList"
                  :key="func.name"
                  :label="func.name + ' - ' + func.description"
                  :value="func.name">
                </el-option>
              </el-select>
            </el-form-item>

            <el-form-item v-else-if="taskForm.type === 'shell'" label="Shell命令" prop="target">
              <el-input type="textarea" :rows="3" v-model="taskForm.target" placeholder="请输入Shell命令"></el-input>
            </el-form-item>

            <el-form-item v-else-if="taskForm.type === 'tmux_command'" label="TMUX命令" prop="target">
              <el-form-item label="选择服务器" prop="tmux_session">
                <el-select v-model="tmuxSession" placeholder="请选择服务器" filterable style="width: 100%;" @change="updateTmuxTarget">
                  <el-option
                    v-for="session in tmuxSessions"
                    :key="session.session_name"
                    :label="session.archive_name + ' - ' + session.world_name"
                    :value="session.session_name">
                  </el-option>
                </el-select>
              </el-form-item>

              <el-form-item label="选择命令" prop="tmux_command_id">
                <el-select v-model="tmuxCommandId" placeholder="请选择命令" filterable style="width: 100%;" @change="updateTmuxTarget">
                  <el-option-group
                    v-for="group in tmuxCommandGroups"
                    :key="group.type"
                    :label="group.type">
                    <el-option
                      v-for="command in group.commands"
                      :key="command.id"
                      :label="command.name + (command.risk === 'high' || command.risk === 'critical' ? '（不可用于定时任务）' : '')"
                      :value="command.id"
                      :disabled="command.risk === 'high' || command.risk === 'critical'">
                    </el-option>
                  </el-option-group>
                </el-select>
              </el-form-item>

              <el-form-item label="命令内容" v-if="currentTmuxCommand">
                <el-input type="textarea" :rows="2" :value="currentTmuxCommand.script || currentTmuxCommand.command" readonly></el-input>
              </el-form-item>

              <el-form-item label="命令参数" v-if="currentTmuxCommand && currentTmuxCommand.needs_params">
                <div v-for="(param, index) in tmuxParams" :key="index" class="arg-item">
                  <el-input v-model="tmuxParams[index]" :placeholder="currentTmuxCommand.param_desc || '参数值'">
                    <template v-slot:prepend>参数 {{index + 1}}</template>
                    <template v-slot:append>
<el-button  icon="el-icon-delete" @click="removeTmuxParam(index)"></el-button>
</template>
                  </el-input>
                  <div class="param-help" v-if="currentTmuxCommand.example">
                    <span class="param-example">示例: {{ currentTmuxCommand.example }}</span>
                  </div>
                </div>
                <el-button type="primary" icon="el-icon-plus" @click="addTmuxParam" size="small" plain>添加参数</el-button>
              </el-form-item>
            </el-form-item>

            <el-form-item v-else-if="taskForm.type === 'tmux_raw_command'" label="TMUX原始命令" prop="target">
              <el-form-item label="选择服务器" prop="tmux_session">
                <el-select v-model="tmuxSession" placeholder="请选择服务器" filterable style="width: 100%;" @change="updateTmuxRawTarget">
                  <el-option
                    v-for="session in tmuxSessions"
                    :key="session.session_name"
                    :label="session.archive_name + ' - ' + session.world_name"
                    :value="session.session_name">
                  </el-option>
                </el-select>
              </el-form-item>

              <el-form-item label="原始命令" prop="tmux_raw_command">
                <el-input type="textarea" :rows="3" v-model="tmuxRawCommand" placeholder="请输入原始命令，例如：c_announce('欢迎来到服务器')" @input="updateTmuxRawTarget"></el-input>
              </el-form-item>
            </el-form-item>

            <el-form-item v-if="taskForm.type === 'function'" label="函数参数">
              <div v-for="(arg, index) in taskForm.args" :key="index" class="arg-item">
                <el-input v-model="taskForm.args[index]" placeholder="参数值">
                  <template v-slot:prepend>参数 {{index + 1}}</template>
                  <template v-slot:append>
<el-button  icon="el-icon-delete" @click="removeArg(index)"></el-button>
</template>
                </el-input>
              </div>
              <el-button type="primary" icon="el-icon-plus" @click="addArg" size="small" plain>添加参数</el-button>
            </el-form-item>
          </el-tab-pane>

          <el-tab-pane label="高级选项" name="advanced">
            <el-form-item label="超时设置(秒)" prop="timeout">
              <el-input-number v-model="taskForm.timeout" :min="0" placeholder="任务最大执行时间，0表示不限制"></el-input-number>
              <span class="form-help-text">任务最大执行时间(秒)，超时后将被强制终止，0表示不限制</span>
            </el-form-item>

            <el-form-item label="重试次数" prop="retry_times">
              <el-input-number v-model="taskForm.retry_times" :min="0" :max="10"></el-input-number>
              <span class="form-help-text">任务失败后自动重试的次数，0表示不重试</span>
            </el-form-item>

            <el-form-item label="重试间隔(秒)" prop="retry_interval" v-if="taskForm.retry_times > 0">
              <el-input-number v-model="taskForm.retry_interval" :min="1" :max="3600"></el-input-number>
              <span class="form-help-text">任务重试的间隔时间</span>
            </el-form-item>

            <el-form-item label="依赖任务" prop="dependencies">
              <el-select
                v-model="taskForm.dependencies"
                multiple
                filterable
                placeholder="选择依赖任务（可多选）"
                style="width: 100%">
                <el-option
                  v-for="task in availableTasks"
                  :key="task.id"
                  :label="task.name"
                  :value="task.id"
                  :disabled="task.id === taskId">
                </el-option>
              </el-select>
              <div class="form-help-text">
                <p>当前任务会在所选依赖任务全部执行成功后才会执行</p>
                <p style="color: #d99b32;">注意：请避免循环依赖，否则任务将无法正常执行</p>
              </div>
            </el-form-item>
          </el-tab-pane>
        </el-tabs>

        <el-divider></el-divider>

        <el-form-item label="任务状态" prop="status">
          <el-switch
            v-model="taskForm.status"
            :active-value="1"
            :inactive-value="0"
            active-text="启用"
            inactive-text="禁用">
          </el-switch>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="submitForm" :loading="submitting">保存</el-button>
          <el-button @click="cancel">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import { cronTaskApi } from '@/api/index';
import AutomationRoomSelect from '@/components/AutomationRoomSelect.vue';

export default {
  name: 'TaskForm',
  components: { AutomationRoomSelect },
  data() {
    return {
      isEdit: false,
      taskId: null,
      submitting: false,
      functionList: [],
      groupList: [],
      availableTasks: [],
      activeTab: 'basic',
      // TMUX相关数据
      tmuxSessions: [],
      tmuxCommands: [],
      tmuxCommandGroups: [],
      tmuxSession: '',
      tmuxCommandId: '',
      tmuxRawCommand: '',
      tmuxParams: [],
      currentTmuxCommand: null,
      // 新的TMUX任务数据结构
      tmuxTaskData: {
        session_name: '',
        command_id: '',
        raw_command: '',
        command_params: []
      },
      taskForm: {
        name: '',
        description: '',
        group_id: 0,
        spec: '0 0 * * * *', // 默认每小时执行一次
        type: 'function',
        target: '',
        args: [],
        timeout: 0,
        retry_times: 0,
        retry_interval: 60,
        dependencies: [],
        status: 1
      },
      rules: {
        name: [
          { required: true, message: '请输入任务名称', trigger: 'blur' },
          { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
        ],
        description: [
          { max: 200, message: '描述不能超过200个字符', trigger: 'blur' }
        ],
        spec: [
          { required: true, message: '请输入Cron表达式', trigger: 'blur' }
        ],
        type: [
          { required: true, message: '请选择任务类型', trigger: 'change' }
        ],
        target: [
          { required: true, message: '请输入目标', trigger: 'blur' }
        ],
        timeout: [
          { type: 'number', min: 0, message: '超时时间不能小于0', trigger: 'blur' }
        ],
        retry_times: [
          { type: 'number', min: 0, max: 10, message: '重试次数需在0-10之间', trigger: 'blur' }
        ],
        retry_interval: [
          { type: 'number', min: 1, message: '重试间隔不能小于1秒', trigger: 'blur' }
        ]
      }
    };
  },
  created() {
    // 判断是否是编辑模式
    const { id } = this.$route.params;
    if (id) {
      this.isEdit = true;
      this.taskId = id;
    }
    if (this.$route.query.group_id) this.taskForm.group_id = this.$route.query.group_id;
  },
  methods: {
    handleAutomationRoom() {
      this.functionList = [];
      this.groupList = [];
      this.availableTasks = [];
      this.tmuxSessions = [];
      this.tmuxCommands = [];
      Promise.all([
        this.getFunctions(),
        this.getGroups(),
        this.getAvailableTasks(),
        this.getTmuxSessions(),
        this.getTmuxCommands()
      ]).then(() => {
        if (this.isEdit && this.taskId) this.getTaskDetail(this.taskId);
      });
    },
    getFunctions() {
      return cronTaskApi.getFunctions()
        .then(response => {
          console.log('函数列表响应:', response);

          // 处理函数列表数据
          if (response && response.code === 200 && response.data) {
            // 处理新的API响应格式，将对象转换为数组
            const functionsData = response.data;
            const functionsList = [];

            // 遍历函数对象，转换为数组格式
            for (const key in functionsData) {
              if (Object.prototype.hasOwnProperty.call(functionsData, key)) {
                const func = functionsData[key];
                functionsList.push({
                  name: func.name,
                  description: func.description,
                  param_types: func.param_types || []
                });
              }
            }

            console.log('处理后的函数列表:', functionsList);
            this.functionList = functionsList;
          }
          // 兼容旧的API响应格式
          else if (response.data && response.data.status === 200) {
            this.functionList = response.data.data || [];
          }
          // 其他格式处理
          else if (response.data && response.data.code === 200) {
            const functionsData = response.data.data;
            const functionsList = [];

            // 如果是对象，转换为数组
            if (functionsData && typeof functionsData === 'object' && !Array.isArray(functionsData)) {
              for (const key in functionsData) {
                if (Object.prototype.hasOwnProperty.call(functionsData, key)) {
                  const func = functionsData[key];
                  functionsList.push({
                    name: func.name,
                    description: func.description,
                    param_types: func.param_types || []
                  });
                }
              }
              this.functionList = functionsList;
            } else if (Array.isArray(functionsData)) {
              this.functionList = functionsData;
            } else {
              this.$message.error('获取函数列表失败: 响应格式不符合预期');
            }
          } else {
            console.error('响应格式不符合预期:', response);
            this.$message.error('获取函数列表失败: 响应格式不符合预期');
          }
        })
        .catch(error => {
          console.error('获取函数列表失败:', error);
          this.$message.error('获取函数列表失败: ' + (error.message || '未知错误'));
        });
    },
    getGroups() {
      return cronTaskApi.getGroups()
        .then(response => {
          console.log('获取任务组列表响应:', response);

          // 处理各种可能的响应格式
          let groupsData = [];

          if (response && response.data) {
            // 处理标准格式 {code: 200, data: [...], msg: "success"}
            if (response.data.code === 200 && Array.isArray(response.data.data)) {
              groupsData = response.data.data;
            }
            // 处理嵌套格式 {code: 200, data: {items: [...], total: 10}}
            else if (response.data.code === 200 && response.data.data && Array.isArray(response.data.data.items)) {
              groupsData = response.data.data.items;
            }
            // 处理旧API格式 {status: 200, data: [...]}
            else if (response.data.status === 200 && Array.isArray(response.data.data)) {
              groupsData = response.data.data;
            }
            // 直接返回数组的情况
            else if (Array.isArray(response.data)) {
              groupsData = response.data;
            }
          }

          console.log('处理后的任务组数据:', groupsData);
          this.groupList = groupsData;
        })
        .catch(error => {
          console.error('获取任务组列表失败:', error);
          this.$message.error('获取任务组列表失败');
        });
    },
    getAvailableTasks() {
      return cronTaskApi.getTasks()
        .then(response => {
          console.log('获取可用任务列表响应:', response);

          // 处理各种可能的响应格式
          let tasksData = [];

          if (response && response.data) {
            // 处理标准格式 {code: 200, data: [...], msg: "success"}
            if (response.data.code === 200 && Array.isArray(response.data.data)) {
              tasksData = response.data.data;
            }
            // 处理嵌套格式 {code: 200, data: {items: [...], total: 10}}
            else if (response.data.code === 200 && response.data.data && Array.isArray(response.data.data.items)) {
              tasksData = response.data.data.items;
            }
            // 处理旧API格式 {status: 200, data: [...]}
            else if (response.data.status === 200 && Array.isArray(response.data.data)) {
              tasksData = response.data.data;
            }
            // 处理旧API格式嵌套版本
            else if (response.data.status === 200 && response.data.data && Array.isArray(response.data.data.items)) {
              tasksData = response.data.data.items;
            }
            // 直接返回数组的情况
            else if (Array.isArray(response.data)) {
              tasksData = response.data;
            }
          }

          console.log('处理后的可用任务数据:', tasksData);
          this.availableTasks = tasksData.map(task => ({
            id: task.id,
            name: task.name
          }));
        })
        .catch(error => {
          console.error('获取可用任务列表失败:', error);
          this.$message.error('获取可用任务列表失败');
        });
    },
    getTaskDetail(id) {
      cronTaskApi.getTaskDetail(id)
        .then(response => {
          console.log('获取任务详情响应:', response);

          let taskData = null;

          if (response && response.data) {
            // 处理标准格式 {code: 200, data: {...}, msg: "success"}
            if (response.data.code === 200) {
              taskData = response.data.data;
            }
            // 处理旧API格式 {status: 200, data: {...}}
            else if (response.data.status === 200) {
              taskData = response.data.data;
            }
            // 直接返回对象的情况
            else if (typeof response.data === 'object' && !Array.isArray(response.data) && response.data.id) {
              taskData = response.data;
            }
          }

          if (taskData) {
            console.log('处理后的任务详情数据:', taskData);

            // 处理dependencies，确保其是数组形式
            let dependencies = [];
            if (taskData.dependencies) {
              if (typeof taskData.dependencies === 'string') {
                try {
                  dependencies = JSON.parse(taskData.dependencies);
                  if (!Array.isArray(dependencies)) {
                    dependencies = [];
                  }
                } catch (e) {
                  console.warn('解析dependencies失败:', e);
                  dependencies = [];
                }
              } else if (Array.isArray(taskData.dependencies)) {
                dependencies = taskData.dependencies;
              }
            }

            // 处理args，确保其是数组形式
            let args = [];
            if (taskData.args) {
              if (typeof taskData.args === 'string') {
                try {
                  args = JSON.parse(taskData.args);
                  if (!Array.isArray(args)) {
                    args = [taskData.args];
                  }
                } catch (e) {
                  console.warn('解析args失败:', e);
                  args = [taskData.args];
                }
              } else if (Array.isArray(taskData.args)) {
                args = taskData.args;
              }
            }

            // 处理TMUX相关数据
            if (taskData.type === 'tmux_command') {
              // 优先使用新的直接字段
              if (taskData.session_name && taskData.command_id) {
                this.tmuxSession = taskData.session_name;
                this.tmuxCommandId = taskData.command_id;
                this.tmuxParams = taskData.command_params || [];

                // 更新tmuxTaskData
                this.tmuxTaskData = {
                  session_name: this.tmuxSession,
                  command_id: this.tmuxCommandId,
                  command_params: this.tmuxParams,
                  raw_command: ''
                };

                // 查找当前命令
                setTimeout(() => {
                  if (this.tmuxCommands.length > 0) {
                    this.currentTmuxCommand = this.tmuxCommands.find(cmd => cmd.id === this.tmuxCommandId);
                  }
                }, 500);
              }
              // 其次使用tmux_task字段
              else if (taskData.tmux_task) {
                this.tmuxSession = taskData.tmux_task.session_name;
                this.tmuxCommandId = taskData.tmux_task.command_id;
                this.tmuxParams = taskData.tmux_task.command_params || [];

                // 更新tmuxTaskData
                this.tmuxTaskData = {
                  session_name: this.tmuxSession,
                  command_id: this.tmuxCommandId,
                  command_params: this.tmuxParams,
                  raw_command: ''
                };

                // 查找当前命令
                setTimeout(() => {
                  if (this.tmuxCommands.length > 0) {
                    this.currentTmuxCommand = this.tmuxCommands.find(cmd => cmd.id === this.tmuxCommandId);
                  }
                }, 500);
              }
              // 兼容旧的target字段
              else if (taskData.target) {
                try {
                  const targetArray = JSON.parse(taskData.target);
                  if (Array.isArray(targetArray) && targetArray.length >= 2) {
                    this.tmuxSession = targetArray[0];
                    this.tmuxCommandId = targetArray[1];
                    this.tmuxParams = targetArray.slice(2);

                    // 更新tmuxTaskData
                    this.tmuxTaskData = {
                      session_name: this.tmuxSession,
                      command_id: this.tmuxCommandId,
                      command_params: this.tmuxParams,
                      raw_command: ''
                    };

                    // 查找当前命令
                    setTimeout(() => {
                      if (this.tmuxCommands.length > 0) {
                        this.currentTmuxCommand = this.tmuxCommands.find(cmd => cmd.id === this.tmuxCommandId);
                      }
                    }, 500);
                  }
                } catch (e) {
                  console.warn('解析TMUX命令参数失败:', e);
                }
              }
            } else if (taskData.type === 'tmux_raw_command') {
              // 优先使用新的直接字段
              if (taskData.session_name && taskData.raw_command) {
                this.tmuxSession = taskData.session_name;
                this.tmuxRawCommand = taskData.raw_command;

                // 更新tmuxTaskData
                this.tmuxTaskData = {
                  session_name: this.tmuxSession,
                  command_id: '',
                  command_params: [],
                  raw_command: this.tmuxRawCommand
                };
              }
              // 其次使用tmux_task字段
              else if (taskData.tmux_task) {
                this.tmuxSession = taskData.tmux_task.session_name;
                this.tmuxRawCommand = taskData.tmux_task.raw_command;

                // 更新tmuxTaskData
                this.tmuxTaskData = {
                  session_name: this.tmuxSession,
                  command_id: '',
                  command_params: [],
                  raw_command: this.tmuxRawCommand
                };
              }
              // 兼容旧的target字段
              else if (taskData.target) {
                try {
                  const targetArray = JSON.parse(taskData.target);
                  if (Array.isArray(targetArray) && targetArray.length >= 2) {
                    this.tmuxSession = targetArray[0];
                    this.tmuxRawCommand = targetArray[1];

                    // 更新tmuxTaskData
                    this.tmuxTaskData = {
                      session_name: this.tmuxSession,
                      command_id: '',
                      command_params: [],
                      raw_command: this.tmuxRawCommand
                    };
                  }
                } catch (e) {
                  console.warn('解析TMUX原始命令参数失败:', e);
                }
              }
            }

            this.taskForm = {
              name: taskData.name,
              description: taskData.description,
              group_id: taskData.group_id || 0,
              spec: taskData.spec,
              type: taskData.type,
              target: taskData.target,
              args: args,
              timeout: taskData.timeout || 0,
              retry_times: taskData.retry_times || 0,
              retry_interval: taskData.retry_interval || 60,
              dependencies: dependencies.map(dep => (typeof dep === 'object' ? dep.id : dep)),
              status: taskData.status
            };
          } else {
            this.$message.error(response.data?.msg || response.data?.message || '获取任务详情失败: 无效的响应格式');
          }
        })
        .catch(error => {
          console.error('获取任务详情失败:', error);
          this.$message.error('获取任务详情失败');
        });
    },
    addArg() {
      this.taskForm.args.push('');
    },
    removeArg(index) {
      this.taskForm.args.splice(index, 1);
    },
    // TMUX相关方法
    getTmuxSessions() {
      return cronTaskApi.getTmuxSessions()
        .then(response => {
          if (response.data && response.data.code === 200) {
            this.tmuxSessions = response.data.data || [];
            console.log('获取TMUX会话列表成功:', this.tmuxSessions);
          } else {
            this.$message.warning('获取TMUX会话列表失败: ' + response.data?.msg);
          }
        })
        .catch(error => {
          console.error('获取TMUX会话列表失败:', error);
          this.$message.error('获取TMUX会话列表失败');
        });
    },

    getTmuxCommands() {
      return cronTaskApi.getTmuxCommands()
        .then(response => {
          if (response.data && response.data.code === 200) {
            this.tmuxCommands = response.data.data || [];
            this.processTmuxCommands();
            console.log('获取TMUX命令列表成功:', this.tmuxCommands);
          } else {
            this.$message.warning('获取TMUX命令列表失败: ' + response.data?.msg);
          }
        })
        .catch(error => {
          console.error('获取TMUX命令列表失败:', error);
          this.$message.error('获取TMUX命令列表失败');
        });
    },

    processTmuxCommands() {
      // 按类型分组命令，用于下拉选择
      const groups = {};

      this.tmuxCommands.forEach(cmd => {
        const type = cmd.type || cmd.category;
        if (!groups[type]) {
          groups[type] = {
            type: type,
            commands: []
          };
        }
        groups[type].commands.push(cmd);
      });

      this.tmuxCommandGroups = Object.values(groups);
    },

    updateTmuxTarget() {
      if (this.tmuxSession && this.tmuxCommandId) {
        // 查找当前选中的命令
        this.currentTmuxCommand = this.tmuxCommands.find(cmd => cmd.id === this.tmuxCommandId);

        // 如果命令需要参数但当前没有参数，自动添加一个空参数
        if (this.currentTmuxCommand && this.currentTmuxCommand.needs_params && this.tmuxParams.length === 0) {
          this.tmuxParams.push('');
        }

        // 更新TMUX任务数据
        this.tmuxTaskData.session_name = this.tmuxSession;
        this.tmuxTaskData.command_id = this.tmuxCommandId;
        this.tmuxTaskData.command_params = [...this.tmuxParams];

        // 为了兼容性，仍然保留target字段
        const targetArray = [this.tmuxSession, this.tmuxCommandId, ...this.tmuxParams];
        this.taskForm.target = JSON.stringify(targetArray);

        console.log('更新TMUX命令目标:', this.tmuxTaskData);
      }
    },

    updateTmuxRawTarget() {
      if (this.tmuxSession && this.tmuxRawCommand) {
        // 更新TMUX任务数据
        this.tmuxTaskData.session_name = this.tmuxSession;
        this.tmuxTaskData.raw_command = this.tmuxRawCommand;

        // 为了兼容性，仍然保留target字段
        const targetArray = [this.tmuxSession, this.tmuxRawCommand];
        this.taskForm.target = JSON.stringify(targetArray);

        console.log('更新TMUX原始命令目标:', this.tmuxTaskData);
      }
    },

    addTmuxParam() {
      this.tmuxParams.push('');
      this.updateTmuxTarget();
    },

    removeTmuxParam(index) {
      this.tmuxParams.splice(index, 1);
      this.updateTmuxTarget();
    },

    submitForm() {
      this.$refs.taskForm.validate(valid => {
        if (valid) {
          this.submitting = true;

          // 过滤空参数
          this.taskForm.args = this.taskForm.args.filter(arg => arg.trim() !== '');

          // 处理TMUX命令参数
          if (this.taskForm.type === 'tmux_command') {
            this.updateTmuxTarget();
            // 根据接口文档，直接在主请求中添加tmux相关字段
            this.taskForm.session_name = this.tmuxTaskData.session_name;
            this.taskForm.command_id = this.tmuxTaskData.command_id;
            this.taskForm.command_params = this.tmuxTaskData.command_params;

            // 为了兼容性，仍然保留tmux_task字段
            this.taskForm.tmux_task = {
              session_name: this.tmuxTaskData.session_name,
              command_id: this.tmuxTaskData.command_id,
              command_params: this.tmuxTaskData.command_params
            };
          } else if (this.taskForm.type === 'tmux_raw_command') {
            this.updateTmuxRawTarget();
            // 根据接口文档，直接在主请求中添加tmux相关字段
            this.taskForm.session_name = this.tmuxTaskData.session_name;
            this.taskForm.raw_command = this.tmuxTaskData.raw_command;

            // 为了兼容性，仍然保留tmux_task字段
            this.taskForm.tmux_task = {
              session_name: this.tmuxTaskData.session_name,
              raw_command: this.tmuxTaskData.raw_command
            };
          }

          const apiMethod = this.isEdit
            ? cronTaskApi.updateTask(this.taskId, this.taskForm)
            : cronTaskApi.addTask(this.taskForm);

          apiMethod
            .then(response => {
              console.log(this.isEdit ? '更新任务响应:' : '添加任务响应:', response);
              // 处理多种可能的响应格式
              if (
                (response.code === 200) || // 直接返回 {code: 200, data: {...}}
                (response.data && response.data.code === 200) || // 嵌套格式 {data: {code: 200, ...}}
                (response.status === 200) || // 旧格式 {status: 200, ...}
                (response.data && response.data.status === 200) // 嵌套旧格式
              ) {
                this.$message.success(this.isEdit ? '更新成功' : '添加成功');
                this.$router.push('/cron/tasks');
              } else {
                const errorMsg =
                  response.msg ||
                  response.message ||
                  (response.data && (response.data.msg || response.data.message)) ||
                  (this.isEdit ? '更新失败' : '添加失败');
                this.$message.error(errorMsg);
              }
            })
            .catch(error => {
              console.error(this.isEdit ? '更新任务失败:' : '添加任务失败:', error);
              this.$message.error(error.message || (this.isEdit ? '更新任务失败' : '添加任务失败'));
            })
            .finally(() => {
              this.submitting = false;
            });
        } else {
          this.$message.warning('请完善表单信息');
          return false;
        }
      });
    },
    cancel() {
      this.$router.push('/cron/tasks');
    }
  }
};
</script>

<style scoped>
.param-help {
  margin-top: 5px;
  font-size: 12px;
  color: #758078;
}

.param-example {
  font-style: italic;
}
.box-card {
  margin-bottom: 20px;
}
.cron-help {
  margin-top: 5px;
  color: #666;
  font-size: 12px;
  background-color: #f8f8f8;
  padding: 10px;
  border-radius: 4px;
}
.cron-help p {
  margin: 5px 0;
}
.cron-help ul {
  margin: 5px 0;
  padding-left: 20px;
}
.arg-item {
  margin-bottom: 10px;
}
.form-help-text {
  font-size: 12px;
  color: #666;
  margin-left: 10px;
}
</style>
