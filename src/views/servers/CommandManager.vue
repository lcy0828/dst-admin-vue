<template>
  <div>
    <el-card class="box-card command-execute-card">
      <template #header>
        <div class="clearfix">
        <span>执行命令</span>
        <el-radio-group v-model="commandMode" size="small" style="float: right;">
          <el-radio-button label="structured">结构化命令</el-radio-button>
          <el-radio-button label="raw">原始命令</el-radio-button>
        </el-radio-group>
        </div>
      </template>

      <!-- 结构化命令模式 -->
      <el-form v-if="commandMode === 'structured'" :model="executeForm" label-width="120px">
        <el-form-item label="选择服务器">
          <el-select v-model="executeForm.server" placeholder="请选择服务器" style="width: 100%">
            <el-option
              v-for="server in servers"
              :key="server.id"
              :label="server.name"
              :value="server.session_name">
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="选择命令">
          <el-select
            v-model="executeForm.commandId"
            placeholder="请选择要执行的命令"
            style="width: 100%"
            @change="handleCommandChange">
            <el-option-group
              v-for="group in commandGroups"
              :key="group.type"
              :label="group.type">
              <el-option
                v-for="command in group.commands"
                :key="command.id"
                :label="command.name"
                :value="command.id">
              </el-option>
            </el-option-group>
          </el-select>
        </el-form-item>

        <template v-if="currentCommand && (currentCommand.parameterized || currentCommand.needs_params)">
          <el-divider content-position="left">命令参数</el-divider>

          <el-form-item
            v-for="param in currentCommand.parameters"
            :key="param.name"
            :label="param.label || param.name"
            :prop="'params.' + param.name"
            :rules="param.required ? [{ required: true, message: '参数不能为空', trigger: 'blur' }] : []">

            <!-- 根据参数类型显示不同的输入控件 -->
            <el-input
              v-if="param.type === 'string' || !param.type"
              v-model="executeForm.params[param.name]"
              :placeholder="currentCommand.example ? '示例: ' + currentCommand.example : '请输入' + (param.label || param.name)">
              <template v-if="currentCommand.example" #append>
                <el-button
                  size="mini"
                  type="primary"
                  @click="applyExample(param.name)">
                  使用示例
                </el-button>
              </template>
            </el-input>

            <el-input-number
              v-else-if="param.type === 'number' || param.type === 'integer'"
              v-model="executeForm.params[param.name]"
              :min="param.minimum"
              :max="param.maximum"
              :placeholder="currentCommand.example ? '示例: ' + currentCommand.example : '请输入' + (param.label || param.name)">
            </el-input-number>

            <el-switch
              v-else-if="param.type === 'boolean'"
              v-model="executeForm.params[param.name]">
            </el-switch>

            <el-select
              v-else-if="param.type === 'enum'"
              v-model="executeForm.params[param.name]"
              :placeholder="'请选择' + (param.label || param.name)"
              style="width: 100%">
              <el-option v-for="option in param.options" :key="option" :label="option" :value="option" />
            </el-select>

            <!-- 显示参数描述和示例 -->
            <div class="param-help" v-if="param.description || currentCommand.example">
              <div v-if="param.description" class="param-description">{{ param.description }}</div>
              <div v-if="currentCommand.example" class="param-example">示例: {{ currentCommand.example }}</div>
            </div>
          </el-form-item>
        </template>

        <el-form-item v-if="!currentCommand || (!currentCommand.parameterized && !currentCommand.needs_params)">
          <div class="command-preview" v-if="currentCommand">
            <strong>命令预览：</strong>
            <pre>{{ currentCommand.command || currentCommand.script }}</pre>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="executeCommand" :loading="executing">执行命令</el-button>
        </el-form-item>
      </el-form>

      <!-- 原始命令模式 -->
      <el-form v-else :model="rawCommandForm" label-width="120px">
        <el-form-item label="选择服务器">
          <el-select v-model="rawCommandForm.server" placeholder="请选择服务器" style="width: 100%">
            <el-option
              v-for="server in servers"
              :key="server.id"
              :label="server.name"
              :value="server.session_name">
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="命令内容">
          <el-input
            v-model="rawCommandForm.command"
            type="textarea"
            :rows="4"
            placeholder="请输入原始命令，例如：c_announce('欢迎来到服务器')"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="executeRawCommand" :loading="executing">执行命令</el-button>
          <el-popover
            placement="right"
            width="400"
            trigger="click">
            <div>
              <h3 style="margin-top: 0;">常用命令</h3>
              <el-input
                placeholder="搜索命令"
                v-model="commandSearch"
                clearable
                prefix-icon="el-icon-search"
                style="margin-bottom: 10px">
              </el-input>
              <el-table
                :data="filteredCommonCommands"
                style="width: 100%"
                size="mini"
                max-height="300">
                <el-table-column prop="name" label="名称" width="100" />
                <el-table-column prop="description" label="描述" show-overflow-tooltip />
                <el-table-column label="操作" width="80" align="center">
                  <template #default="scope">
                    <el-button
                      type="text"
                      size="mini"
                      @click="applyCommonCommand(scope.row.command)">
                      使用
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
            <template #reference>
              <el-button type="primary" plain size="small">常用命令</el-button>
            </template>
          </el-popover>
          <el-button type="warning" plain size="small" @click="showBatchCommandDialog">批量命令</el-button>
        </el-form-item>
      </el-form>

      <!-- 执行结果 -->
      <div v-if="executionResult" class="execution-result">
        <el-divider content-position="left">执行结果</el-divider>
        <div class="result-header">
          <span class="status" :class="{'success': executionResult.status === 200}">
            状态：{{ executionResult.status === 200 ? '成功' : '失败' }}
          </span>
          <span class="time">耗时：{{ executionResult.data.elapsed_time || 'N/A' }}</span>
        </div>
        <div class="result-message">
          <pre>{{ executionResult.msg }}</pre>
        </div>
      </div>

      <!-- 命令历史记录 -->
      <div class="command-history" v-if="commandHistory.length > 0">
        <el-divider content-position="left">命令历史记录</el-divider>
        <el-table
          :data="commandHistory"
          style="width: 100%"
          size="small"
          :max-height="250"
        >
          <el-table-column prop="time" label="执行时间" width="180" />
          <el-table-column prop="serverName" label="服务器" width="150" />
          <el-table-column label="命令" show-overflow-tooltip>
            <template #default="scope">
              <span v-if="scope.row.mode === 'structured'">{{ scope.row.commandName }}</span>
              <code v-else>{{ scope.row.command }}</code>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="80" align="center">
            <template #default="scope">
              <el-tag type="success" size="mini" v-if="scope.row.status === 200">成功</el-tag>
              <el-tag type="danger" size="mini" v-else>失败</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" align="center">
            <template #default="scope">
              <el-button type="text" size="mini" @click="rerunCommand(scope.row)">重新执行</el-button>
              <el-button type="text" size="mini" @click="copyCommand(scope.row)">复制命令</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="history-actions">
          <el-button type="text" size="small" @click="clearHistory">清空历史记录</el-button>
          <el-button type="text" size="small" @click="saveHistoryToFile">保存到文件</el-button>
        </div>
      </div>
    </el-card>

    <el-card class="box-card" style="margin-top: 20px;">
      <template #header>
        <div class="clearfix">
        <span>服务器命令管理</span>
        <el-button
          style="float: right; margin-left: 10px"
          type="primary"
          size="small"
          @click="showAddCommandDialog"
        >
          添加命令
        </el-button>
        <el-button
          style="float: right"
          type="success"
          size="small"
          @click="importCommands"
        >
          导入命令
        </el-button>
        <el-button
          style="float: right; margin-right: 10px"
          type="info"
          size="small"
          @click="exportCommands"
        >
          导出命令
        </el-button>
        </div>
      </template>

      <!-- 命令类型过滤 -->
      <el-row :gutter="20" style="margin-bottom: 20px">
        <el-col :span="24">
          <el-radio-group v-model="currentType" @change="filterCommandsByType">
            <el-radio-button label="">全部命令</el-radio-button>
            <el-radio-button v-for="type in commandTypes" :key="type" :label="type">
              {{ type }}
            </el-radio-button>
          </el-radio-group>
        </el-col>
      </el-row>

      <!-- 命令列表 -->
      <el-table
        :data="displayCommands"
        style="width: 100%"
        v-loading="loading"
      >
        <el-table-column
          prop="name"
          label="命令名称"
          width="200"
        />
        <el-table-column
          prop="type"
          label="命令类型"
          width="150"
        />
        <el-table-column
          prop="description"
          label="命令描述"
        />
        <el-table-column
          label="内置命令"
          width="100"
          align="center"
        >
          <template #default="scope">
            <el-tag v-if="scope.row.isBuiltin || scope.row.is_builtin" type="success">是</el-tag>
            <el-tag v-else type="info">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="200"
          align="center"
        >
          <template #default="scope">
            <el-button
              size="mini"
              type="primary"
              icon="el-icon-edit"
              @click="editCommand(scope.row)"
              :disabled="scope.row.isBuiltin || scope.row.is_builtin"
            >
              编辑
            </el-button>
            <el-button
              size="mini"
              type="danger"
              icon="el-icon-delete"
              @click="handleDelete(scope.row)"
              :disabled="scope.row.isBuiltin || scope.row.is_builtin"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑命令对话框 -->
    <el-dialog
      :title="dialogType === 'add' ? '添加命令' : '编辑命令'"
      v-model="dialogVisible"
      width="50%"
    >
      <el-form
        :model="commandForm"
        :rules="formRules"
        label-width="120px"
        ref="commandForm"
      >
        <el-form-item label="命令名称" prop="name">
          <el-input v-model="commandForm.name" placeholder="请输入命令名称" />
        </el-form-item>

        <el-form-item label="命令类型" prop="type">
          <el-select v-model="commandForm.type" placeholder="请选择命令类型" style="width: 100%">
            <el-option
              v-for="type in commandTypes"
              :key="type"
              :label="type"
              :value="type"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="命令描述" prop="description">
          <el-input
            v-model="commandForm.description"
            type="textarea"
            :rows="2"
            placeholder="请输入命令描述"
          />
        </el-form-item>

        <el-form-item label="命令脚本" prop="command">
          <el-input
            v-model="commandForm.command"
            type="textarea"
            :rows="5"
            placeholder="请输入Lua命令脚本，例如: c_announce('Hello World')"
          />
        </el-form-item>

        <el-form-item label="包含参数">
          <el-switch v-model="commandForm.parameterized" @change="handleParamSwitch" />
        </el-form-item>

        <template v-if="commandForm.parameterized">
          <el-divider content-position="left">参数设置</el-divider>

          <div v-for="(param, index) in commandForm.parameters" :key="index" style="margin-bottom: 15px; border: 1px dashed #ccc; padding: 15px; border-radius: 4px;">
            <el-row :gutter="10">
              <el-col :span="8">
                <el-form-item :label="'参数名'" :prop="'parameters.' + index + '.name'" :rules="[{ required: true, message: '参数名不能为空', trigger: 'blur' }]">
                  <el-input v-model="param.name" placeholder="参数名，如：message" />
                </el-form-item>
              </el-col>

              <el-col :span="8">
                <el-form-item :label="'标签'" :prop="'parameters.' + index + '.label'">
                  <el-input v-model="param.label" placeholder="用户友好的名称，如：消息内容" />
                </el-form-item>
              </el-col>

              <el-col :span="8">
                <el-form-item :label="'类型'" :prop="'parameters.' + index + '.type'">
                  <el-select v-model="param.type" placeholder="参数类型" style="width: 100%">
                    <el-option label="字符串" value="string" />
                    <el-option label="数字" value="number" />
                    <el-option label="布尔值" value="boolean" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="10">
              <el-col :span="12">
                <el-form-item :label="'默认值'" :prop="'parameters.' + index + '.default'">
                  <el-input v-model="param.default" placeholder="默认值" />
                </el-form-item>
              </el-col>

              <el-col :span="8">
                <el-form-item :label="'必填'" :prop="'parameters.' + index + '.required'">
                  <el-switch v-model="param.required" />
                </el-form-item>
              </el-col>

              <el-col :span="4" style="display: flex; align-items: center; justify-content: center;">
                <el-button type="danger" icon="el-icon-delete" circle @click="removeParam(index)" />
              </el-col>
            </el-row>
          </div>

          <el-button type="primary" plain icon="el-icon-plus" @click="addParameter">添加参数</el-button>
        </template>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 导入命令对话框(隐藏) -->
    <input
      ref="importInput"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleImportFile"
    />

    <!-- 批量命令对话框 -->
    <el-dialog
      title="批量执行命令"
      v-model="batchCommandDialogVisible"
      width="60%"
    >
      <p class="batch-instructions">每行输入一条命令，按顺序执行。可使用#开头添加注释。</p>

      <el-form :model="batchCommandForm" label-width="120px">
        <el-form-item label="选择服务器">
          <el-select v-model="batchCommandForm.server" placeholder="请选择服务器" style="width: 100%">
            <el-option
              v-for="server in servers"
              :key="server.id"
              :label="server.name"
              :value="server.session_name">
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="命令列表">
          <el-input
            v-model="batchCommandForm.commands"
            type="textarea"
            :rows="10"
            placeholder="# 在这里输入多行命令，每行一条
c_announce('批量命令开始执行')
c_give('flint', 10)
print('命令执行完成')"
          />
        </el-form-item>

        <el-form-item label="执行间隔(毫秒)">
          <el-input-number v-model="batchCommandForm.interval" :min="100" :max="5000" :step="100" />
        </el-form-item>
      </el-form>

      <div class="batch-results" v-if="batchResults.length > 0">
        <el-divider content-position="left">执行结果</el-divider>
        <el-progress :percentage="batchProgress" :status="batchStatus"></el-progress>
        <div class="batch-result-list">
          <div v-for="(result, index) in batchResults" :key="index" class="batch-result-item">
            <span class="batch-command">{{ result.command }}</span>
            <el-tag size="mini" :type="result.success ? 'success' : 'danger'">
              {{ result.success ? '成功' : '失败' }}
            </el-tag>
          </div>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="batchCommandDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="executeBatchCommands" :loading="executingBatch" :disabled="!batchCommandForm.server || !batchCommandForm.commands">
            开始执行
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { commandManager, commandApi, COMMAND_TYPES } from '@/api';

export default {
  name: 'CommandManager',
  data() {
    return {
      loading: false,
      commands: [],
      displayCommands: [],
      currentType: '',

      // 命令执行相关
      executeForm: {
        server: '',
        commandId: '',
        params: {}
      },
      servers: [],
      currentCommand: null,
      executing: false,
      executionResult: null,

      // 对话框相关
      dialogVisible: false,
      dialogType: 'add', // 'add' or 'edit'
      commandForm: {
        name: '',
        type: '',
        description: '',
        command: '',
        parameterized: false,
        parameters: []
      },

      // 表单验证规则
      formRules: {
        name: [
          { required: true, message: '请输入命令名称', trigger: 'blur' },
          { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
        ],
        type: [
          { required: true, message: '请选择命令类型', trigger: 'change' }
        ],
        description: [
          { required: true, message: '请输入命令描述', trigger: 'blur' }
        ],
        command: [
          { required: true, message: '请输入命令脚本', trigger: 'blur' }
        ]
      },

      // 当前编辑的命令ID (用于编辑操作)
      currentCommandId: null,

      // 原始命令模式相关
      rawCommandForm: {
        server: '',
        command: ''
      },

      // 命令模式
      commandMode: 'structured',

      // 常用命令
      commonCommands: [
        {
          name: '公告消息',
          command: 'c_announce(\'这里输入你的公告内容\')',
          description: '向所有玩家发送一条公告'
        },
        {
          name: '生成物品',
          command: 'c_give(\'prefab_name\')',
          description: '生成指定物品'
        },
        {
          name: '生成生物',
          command: 'c_spawn(\'prefab_name\')',
          description: '在当前位置生成生物'
        },
        {
          name: '重生世界',
          command: 'c_regenerateworld()',
          description: '重新生成世界'
        },
        {
          name: '滚回',
          command: 'c_rollback(1)',
          description: '回滚世界到x天前(参数为天数)'
        },
        {
          name: '踢出玩家',
          command: 'TheNet:Kick(UserToPlayer(\'玩家名称\'))',
          description: '踢出指定玩家'
        },
        {
          name: '禁止玩家',
          command: 'TheNet:Ban(UserToPlayer(\'玩家名称\'))',
          description: '永久禁止指定玩家'
        },
        {
          name: '显示玩家列表',
          command: 'c_listallplayers()',
          description: '显示所有在线玩家'
        },
        {
          name: '查看当前季节',
          command: 'print(\'当前季节: \' .. TheWorld.state.season)',
          description: '显示当前世界季节'
        },
        {
          name: '查看当前天数',
          command: 'print(\'当前天数: \' .. TheWorld.state.cycles + 1)',
          description: '显示当前世界天数'
        },
        {
          name: '保存世界',
          command: 'c_save()',
          description: '手动保存当前世界状态'
        }
      ],

      // 命令历史记录
      commandHistory: [],

      // 常用命令相关
      commandSearch: '',

      // 批量命令相关
      batchCommandDialogVisible: false,
      batchCommandForm: {
        server: '',
        commands: '',
        interval: 500
      },
      executingBatch: false,
      batchResults: [],
      batchProgress: 0,
      batchStatus: '', // 为进度条设置状态: success, exception
    };
  },
  computed: {
    commandTypes() {
      return [...new Set([
        ...Object.values(COMMAND_TYPES),
        ...this.commands.map(command => command.type || command.category).filter(Boolean)
      ])];
    },
    commandGroups() {
      // 按类型分组命令，用于下拉选择
      const groups = {};

      this.commands.forEach(cmd => {
        const type = cmd.type || cmd.category;
        if (!groups[type]) {
          groups[type] = {
            type: type,
            commands: []
          };
        }
        groups[type].commands.push(cmd);
      });

      return Object.values(groups);
    },

    // 过滤后的常用命令
    filteredCommonCommands() {
      if (!this.commandSearch) {
        return this.commonCommands;
      }

      const keyword = this.commandSearch.toLowerCase();
      return this.commonCommands.filter(cmd =>
        cmd.name.toLowerCase().includes(keyword) ||
        cmd.description.toLowerCase().includes(keyword) ||
        cmd.command.toLowerCase().includes(keyword)
      );
    }
  },
  watch: {
    // 监听命令模式变化
    commandMode() {
      // 当模式变化时重置执行结果
      this.executionResult = null;
    }
  },
  async created() {
    await Promise.all([this.fetchCommands(), this.fetchServers()]);
    await this.loadCommandHistory();
  },
  methods: {
    async fetchCommands() {
      this.loading = true;
      try {
        const response = await commandApi.getAllCommands();
        this.commands = response.items;
        this.localFilterCommandsByType(this.currentType);
      } catch (error) {
        this.commands = [];
        this.displayCommands = [];
        this.$message.error('获取命令列表失败: ' + error.message);
      } finally {
        this.loading = false;
      }
    },

    filterCommandsByType(type) {
      this.currentType = type;
      this.localFilterCommandsByType(type);
    },

    localFilterCommandsByType(type) {
      if (!type) {
        this.displayCommands = [...this.commands];
      } else {
        this.displayCommands = this.commands.filter(cmd =>
          cmd.type === type || cmd.category === type
        );
      }
    },

    showAddCommandDialog() {
      this.dialogType = 'add';
      this.currentCommandId = null;
      // 重置表单
      this.resetForm();
      this.dialogVisible = true;
    },

    editCommand(command) {
      this.dialogType = 'edit';
      this.currentCommandId = command.id;

      // 填充表单数据
      this.commandForm = {
        name: command.name,
        type: command.type || command.category,
        description: command.description,
        command: command.command || command.script,
        parameterized: command.parameterized || command.needs_params || false,
        parameters: command.parameters ? [...command.parameters] : []
      };

      this.dialogVisible = true;
    },

    resetForm() {
      // 重置表单数据
      this.commandForm = {
        name: '',
        type: COMMAND_TYPES.CUSTOM, // 默认为自定义命令
        description: '',
        command: '',
        parameterized: false,
        parameters: []
      };

      // 如果表单ref存在，重置表单验证
      if (this.$refs.commandForm) {
        this.$refs.commandForm.resetFields();
      }
    },

    handleParamSwitch(value) {
      if (value && this.commandForm.parameters.length === 0) {
        // 如果开启了参数但没有参数，添加一个默认参数
        this.addParameter();
      }
    },

    addParameter() {
      // 添加一个新参数
      this.commandForm.parameters.push({
        name: '',
        label: '',
        type: 'string',
        required: false,
        default: ''
      });
    },

    removeParam(index) {
      // 移除指定索引的参数
      this.commandForm.parameters.splice(index, 1);
    },

    submitForm() {
      this.$refs.commandForm.validate(async (valid) => {
        if (!valid) return;

        try {
          const requestData = {
            name: this.commandForm.name,
            type: this.commandForm.type,
            description: this.commandForm.description,
            command: this.commandForm.command,
            parameterized: this.commandForm.parameterized,
            parameters: this.commandForm.parameterized ? this.commandForm.parameters : []
          };

          if (this.dialogType === 'add') {
            await commandManager.addCommand(requestData);
            this.$message.success('添加命令成功');
          } else {
            await commandManager.updateCommand(this.currentCommandId, requestData);
            this.$message.success('更新命令成功');
          }

          await this.fetchCommands();
          this.dialogVisible = false;
        } catch (error) {
          this.$message.error(error.message || '操作失败');
        }
      });
    },

    handleDelete(command) {
      this.$confirm(`确定要删除命令"${command.name}"吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          await commandManager.deleteCommand(command.id);
          this.$message.success('删除命令成功');
          await this.fetchCommands();
        } catch (error) {
          this.$message.error(error.message || '删除命令失败');
        }
      }).catch(() => {});
    },

    importCommands() {
      // 触发隐藏的文件输入
      this.$refs.importInput.click();
    },

    handleImportFile(event) {
      const file = event.target.files[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importedCommands = await commandManager.importCommands(e.target.result);
          this.$message.success(`成功导入 ${importedCommands.length} 个命令`);
          await this.fetchCommands();
        } catch (error) {
          this.$message.error('导入命令失败: ' + error.message);
        }
      };

      reader.readAsText(file);

      // 重置文件输入，允许重复选择相同文件
      event.target.value = '';
    },

    exportCommands() {
      try {
        // 获取要导出的命令（自定义命令）
        const jsonContent = commandManager.exportCommands();

        // 创建Blob对象
        const blob = new Blob([jsonContent], { type: 'application/json' });

        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'dstadmin_commands.json';

        document.body.appendChild(link);
        link.click();

        // 清理
        URL.revokeObjectURL(url);
        document.body.removeChild(link);

        this.$message.success('命令导出成功');
      } catch (error) {
        this.$message.error('导出命令失败: ' + error.message);
      }
    },

    async fetchServers() {
      try {
        this.servers = await commandApi.getServers();
      } catch (error) {
        this.servers = [];
        this.$message.error('获取服务器列表失败: ' + error.message);
      }
    },

    async handleCommandChange(commandId) {
      this.executing = true;
      try {
        this.currentCommand = await commandApi.getCommand(commandId);
        const params = {};
        (this.currentCommand.parameters || []).forEach(param => {
          if (param.default !== undefined) params[param.name] = param.default;
          else if (param.type === 'boolean') params[param.name] = false;
          else params[param.name] = '';
        });
        this.executeForm = {
          server: this.executeForm.server,
          commandId,
          params
        };
      } catch (error) {
        this.currentCommand = null;
        this.$message.error('获取命令详情失败: ' + error.message);
      } finally {
        this.executing = false;
      }
    },

    applyExample(paramName) {
      if (this.currentCommand && this.currentCommand.example) {
        this.executeForm.params[paramName] = this.currentCommand.example;
        this.$message.success('已应用示例值');
      }
    },

    async executeCommand() {
      if (!this.executeForm.server) {
        this.$message.warning('请选择服务器');
        return;
      }

      if (!this.executeForm.commandId) {
        this.$message.warning('请选择要执行的命令');
        return;
      }

      let confirmation = '';
      if (['high', 'critical'].includes(this.currentCommand?.risk)) {
        try {
          confirmation = await this.requestRoomConfirmation(this.executeForm.server);
        } catch {
          return;
        }
      }

      this.executing = true;
      try {
        const run = await commandApi.executeCommand(
          this.executeForm.server,
          this.executeForm.commandId,
          this.executeForm.params,
          confirmation
        );
        this.showRunResult(run);
        this.$message.success('命令已发送');
        await this.loadCommandHistory();
      } catch (error) {
        this.showExecutionError(error);
      } finally {
        this.executing = false;
      }
    },

    async executeRawCommand() {
      if (!this.rawCommandForm.server) {
        this.$message.warning('请选择服务器');
        return;
      }

      if (!this.rawCommandForm.command) {
        this.$message.warning('请输入命令内容');
        return;
      }

      let confirmation;
      try {
        confirmation = await this.requestRoomConfirmation(this.rawCommandForm.server);
      } catch {
        return;
      }

      this.executing = true;
      try {
        const run = await commandApi.executeRawCommand(
          this.rawCommandForm.server,
          this.rawCommandForm.command,
          confirmation
        );
        this.showRunResult(run);
        this.$message.success('命令已发送');
        await this.loadCommandHistory();
      } catch (error) {
        this.showExecutionError(error);
      } finally {
        this.executing = false;
      }
    },

    async requestRoomConfirmation(serverKey) {
      const server = this.servers.find(item => item.session_name === serverKey);
      if (!server) throw new Error('未找到目标服务器');
      const response = await this.$prompt(
        `该操作会向游戏控制台发送 Lua 命令，请输入房间名“${server.room_name}”确认`,
        '执行确认',
        {
          confirmButtonText: '确认执行',
          cancelButtonText: '取消',
          inputValidator: value => value === server.room_name || '房间名不匹配'
        }
      );
      return response.value;
    },

    showRunResult(run) {
      const success = run.status === 'sent';
      this.executionResult = {
        status: success ? 200 : 500,
        msg: run.message || run.errorMessage || (success ? '命令已发送到分片控制台' : '命令发送失败'),
        data: { elapsed_time: 'N/A', run_id: run.id }
      };
    },

    showExecutionError(error) {
      this.executionResult = {
        status: 500,
        msg: error.message || '执行命令时发生错误',
        data: {}
      };
      this.$message.error('命令执行出错: ' + (error.message || '未知错误'));
    },

    // 根据服务器ID获取服务器名称
    getServerNameById(sessionName) {
      const server = this.servers.find(s => s.session_name === sessionName);
      return server ? server.name : sessionName;
    },

    async loadCommandHistory() {
      try {
        const runs = await commandApi.getCommandHistory();
        this.commandHistory = runs.map(run => this.mapHistoryRun(run));
      } catch (error) {
        this.commandHistory = [];
        this.$message.error('加载命令历史记录失败: ' + error.message);
      }
    },

    mapHistoryRun(run) {
      const server = this.servers.find(item => item.room_id === run.roomId && item.world_id === run.worldId);
      return {
        id: run.id,
        mode: run.mode === 'raw' ? 'raw' : 'structured',
        time: new Date(run.createdAt).toLocaleString(),
        serverName: server?.name || `${run.roomId} - ${run.worldId}`,
        server: server?.session_name || `${run.roomId}::${run.worldId}`,
        commandId: run.commandId,
        commandName: run.name,
        params: run.arguments || {},
        command: run.rawCommand || '',
        status: run.status === 'sent' ? 200 : 500
      };
    },

    // 清空历史记录
    async clearHistory() {
      try {
        await this.$confirm('确定要清空所有命令历史记录吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });
        const deleted = await commandApi.clearCommandHistory();
        await this.loadCommandHistory();
        this.$message.success(`已清空 ${deleted} 条历史记录`);
      } catch (error) {
        if (error === 'cancel' || error === 'close') return;
        this.$message.error('清空历史记录失败: ' + (error.message || '未知错误'));
      }
    },

    // 保存历史记录到文件
    saveHistoryToFile() {
      const historyData = JSON.stringify(this.commandHistory, null, 2);
      const blob = new Blob([historyData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'command_history_' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },

    // 重新执行历史命令
    async rerunCommand(historyItem) {
      if (historyItem.mode === 'structured') {
        this.commandMode = 'structured';
        this.executeForm.server = historyItem.server;
        this.executeForm.commandId = historyItem.commandId;
        await this.handleCommandChange(historyItem.commandId);

        // 如果有参数，填充参数
        if (historyItem.params) {
          this.executeForm.params = {...historyItem.params};
        }

        this.$message.info('已加载命令，点击执行按钮运行');
      } else {
        this.commandMode = 'raw';
        this.rawCommandForm.server = historyItem.server;
        this.rawCommandForm.command = historyItem.command;

        this.$message.info('已加载命令，点击执行按钮运行');
      }
    },

    // 复制命令
    copyCommand(historyItem) {
      let textToCopy = '';

      if (historyItem.mode === 'raw') {
        textToCopy = historyItem.command;
      } else if (historyItem.mode === 'structured') {
        // 对于结构化命令，获取其实际执行的脚本
        const command = this.commands.find(cmd => cmd.id === historyItem.commandId);
        textToCopy = command ? (command.command || command.script) : '';
      } else if (historyItem.mode === 'batch') {
        // 对于批量命令，不支持直接复制
        this.$message.warning('批量命令无法直接复制');
        return;
      }

      if (textToCopy) {
        // 使用Clipboard API复制文本
        navigator.clipboard.writeText(textToCopy).then(() => {
          this.$message.success('命令已复制到剪贴板');
        }).catch(err => {
          console.error('复制失败:', err);
          this.$message.error('复制命令失败');
        });
      }
    },

    // 应用常用命令
    applyCommonCommand(command) {
      this.rawCommandForm.command = command;
    },

    // 显示批量命令对话框
    showBatchCommandDialog() {
      this.batchCommandDialogVisible = true;
      this.batchCommandForm.server = this.rawCommandForm.server || '';
      this.batchResults = [];
      this.batchProgress = 0;
      this.batchStatus = '';
    },

    // 执行批量命令
    async executeBatchCommands() {
      if (!this.batchCommandForm.server) {
        this.$message.warning('请选择服务器');
        return;
      }

      if (!this.batchCommandForm.commands.trim()) {
        this.$message.warning('请输入命令列表');
        return;
      }

      this.executingBatch = true;
      this.batchResults = [];
      this.batchProgress = 0;
      this.batchStatus = '';

      try {
        const commandLines = this.batchCommandForm.commands
          .split('\n')
          .filter(line => line.trim() && !line.trim().startsWith('#'));

        if (commandLines.length === 0) {
          this.$message.warning('没有有效的命令');
          this.executingBatch = false;
          return;
        }

        const totalCommands = commandLines.length;
        let executedCount = 0;
        const confirmation = await this.requestRoomConfirmation(this.batchCommandForm.server);

        for (const command of commandLines) {
          try {
            const run = await commandApi.executeRawCommand(
              this.batchCommandForm.server,
              command.trim(),
              confirmation
            );
            this.batchResults.push({
              command: command.trim(),
              success: run.status === 'sent',
              message: run.message || run.errorMessage
            });

            executedCount++;
            this.batchProgress = Math.floor((executedCount / totalCommands) * 100);

            if (executedCount < totalCommands) {
              await new Promise(resolve => setTimeout(resolve, this.batchCommandForm.interval));
            }
          } catch (error) {
            console.error('执行批量命令出错:', error);
            this.batchResults.push({
              command: command.trim(),
              success: false,
              message: error.message || '执行出错'
            });

            executedCount++;
            this.batchProgress = Math.floor((executedCount / totalCommands) * 100);

            if (executedCount < totalCommands) {
              await new Promise(resolve => setTimeout(resolve, this.batchCommandForm.interval));
            }
          }
        }

        const successCount = this.batchResults.filter(r => r.success).length;
        this.batchStatus = successCount === totalCommands ? 'success' : 'exception';
        this.$message.success(`批量命令执行完成：共 ${totalCommands} 条命令，成功 ${successCount} 条，失败 ${totalCommands - successCount} 条`);
        await this.loadCommandHistory();
      } catch (error) {
        if (error === 'cancel' || error === 'close') return;
        this.batchStatus = 'exception';
        this.$message.error('批量命令执行失败: ' + (error.message || '未知错误'));
      } finally {
        this.executingBatch = false;
      }
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

.param-description {
  margin-bottom: 3px;
}

.param-example {
  font-style: italic;
}
.clearfix:before,
.clearfix:after {
  display: table;
  content: "";
}
.clearfix:after {
  clear: both;
}

.command-execute-card {
  margin-bottom: 20px;
}

.command-preview {
  background-color: #f9f9f9;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #eee;
}

.command-preview pre {
  margin: 8px 0 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.execution-result {
  background-color: #f1f4ed;
  padding: 15px;
  border-radius: 4px;
  margin-top: 15px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.status {
  font-weight: bold;
  color: #c94f4f;
}

.status.success {
  color: #4f8a5b;
}

.time {
  color: #758078;
}

.result-message {
  background-color: #ffffff;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #e8ece5;
}

.result-message pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.command-history {
  margin-top: 15px;
}

.history-actions {
  margin-top: 10px;
  text-align: right;
}

.command-examples {
  max-height: 300px;
  overflow-y: auto;
  padding-left: 20px;
}

.command-examples li {
  margin-bottom: 8px;
}

.command-examples a {
  color: #d97932;
  text-decoration: none;
}

.command-examples a:hover {
  text-decoration: underline;
}

.result-container {
  background-color: #f1f4ed;
  border-radius: 4px;
  padding: 10px;
  margin-top: 15px;
  border: 1px solid #e8ece5;
}

/* 可选的暗色主题支持 */
.dark-theme .command-execute-card {
  background-color: #1e1e1e;
  color: #ffffff;
}

.dark-theme .result-container {
  background-color: #2d2d2d;
  border-color: #444;
}

@media (max-width: 768px) {
  .el-form-item__label {
    width: 100% !important;
    text-align: left;
  }

  .el-form-item__content {
    margin-left: 0 !important;
  }
}

.el-form-item__content {
  margin-left: 0 !important;
}

.batch-instructions {
  background-color: #f1f4ed;
  padding: 10px 15px;
  border-radius: 4px;
  color: #666;
  font-size: 14px;
  margin-bottom: 20px;
  border-left: 3px solid #d97932;
}

.batch-result-list {
  max-height: 200px;
  overflow-y: auto;
  margin-top: 15px;
  border: 1px solid #e8ece5;
  border-radius: 4px;
}

.batch-result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 15px;
  border-bottom: 1px solid #e8ece5;
}

.batch-result-item:last-child {
  border-bottom: none;
}

.batch-command {
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 10px;
  max-width: 80%;
}
</style>
