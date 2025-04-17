<template>
  <div class="rule-management-container">
    <h1>规则管理</h1>

    <div class="rule-section">
      <div class="rule-header">
        <h3>日志解析规则</h3>
        <el-button type="primary" size="small" @click="addParserRule">添加解析规则</el-button>
      </div>

      <el-table
        v-loading="loading.parser"
        :data="parserRulesList"
        style="width: 100%"
        border
      >
        <el-table-column prop="id" label="ID" width="60"></el-table-column>
        <el-table-column prop="name" label="规则名称"></el-table-column>
        <el-table-column prop="description" label="描述" show-overflow-tooltip></el-table-column>
        <el-table-column prop="log_type" label="日志类型" width="100">
          <template slot-scope="scope">
            <el-tag :type="getLogTypeTag(scope.row.log_type)">{{ scope.row.log_type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="pattern" label="匹配模式" show-overflow-tooltip>
          <template slot-scope="scope">
            <div class="pattern-container">
              <span class="pattern-text">{{ scope.row.pattern }}</span>
              <el-button
                type="text"
                icon="el-icon-document-copy"
                class="copy-btn"
                @click.stop="copyPattern(scope.row.pattern)"
                title="复制匹配模式">
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="match_mode" label="匹配模式" width="100">
          <template slot-scope="scope">
            <el-tag :type="getMatchModeTag(scope.row.match_mode)" size="small">
              {{ getMatchModeText(scope.row.match_mode) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="80" sortable></el-table-column>
        <el-table-column prop="is_enabled" label="状态" width="80">
          <template slot-scope="scope">
            <el-switch
              v-model="scope.row.is_enabled"
              @change="toggleRuleStatus(scope.row)"
            ></el-switch>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160">
          <template slot-scope="scope">
            <el-button
              type="primary"
              size="mini"
              @click="editParserRule(scope.row)"
            >编辑</el-button>
            <el-button
              type="danger"
              size="mini"
              @click="removeParserRule(scope.$index, scope.row)"
            >删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 添加/编辑解析规则对话框 -->
    <el-dialog
      :title="ruleForm.id ? '编辑解析规则' : '添加解析规则'"
      :visible.sync="dialogVisible.parser"
      width="50%"
      :close-on-click-modal="false"
      :before-close="handleDialogClose"
    >
      <el-form :model="ruleForm" :rules="ruleFormRules" ref="ruleForm" label-width="120px">
        <el-form-item label="规则名称" prop="name">
          <el-input v-model="ruleForm.name"></el-input>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="ruleForm.description" type="textarea"></el-input>
        </el-form-item>
        <el-form-item label="日志类型" prop="log_type">
          <el-select
            v-model="ruleForm.log_type"
            placeholder="选择或输入日志类型"
            allow-create
            filterable
            @change="handleLogTypeChange"
            @visible-change="handleSelectVisibleChange"
            @keyup.enter.native="handleEnterKey"
            @blur="handleSelectBlur">
            <el-option
              v-for="type in uniqueLogTypes"
              :key="type"
              :label="type"
              :value="type">
            </el-option>
          </el-select>
          <div class="tip">可以选择已有类型或输入自定义类型</div>
        </el-form-item>
        <el-form-item label="匹配模式" prop="pattern">
          <el-input v-model="ruleForm.pattern" type="textarea" rows="3"></el-input>
          <div class="tip">使用正则表达式，如: \[\d{2}:\d{2}:\d{2}\]: Player .* joined the game</div>
        </el-form-item>
        <el-form-item label="是否使用正则" prop="is_regex">
          <el-switch v-model="ruleForm.is_regex"></el-switch>
        </el-form-item>
        <el-form-item label="是否启用" prop="is_enabled">
          <el-switch v-model="ruleForm.is_enabled"></el-switch>
        </el-form-item>
        <el-form-item label="匹配模式类型" prop="match_mode">
          <el-select v-model="ruleForm.match_mode" placeholder="选择匹配模式类型" @change="handleMatchModeChange">
            <el-option label="单行匹配" value="single"></el-option>
            <el-option label="多行匹配" value="multi_line"></el-option>
            <el-option label="首尾行匹配" value="head_tail"></el-option>
          </el-select>
          <div class="tip">
            <span v-if="ruleForm.match_mode === 'single'">单行匹配：每行日志单独匹配和处理</span>
            <span v-else-if="ruleForm.match_mode === 'multi_line'">多行匹配：匹配到一条日志后，继续向下匹配相同类型的日志</span>
            <span v-else-if="ruleForm.match_mode === 'head_tail'">首尾行匹配：需要提供首行和尾行的匹配规则</span>
          </div>
        </el-form-item>

        <el-form-item label="尾行匹配模式" prop="tail_pattern" v-if="ruleForm.match_mode === 'head_tail'">
          <el-input v-model="ruleForm.tail_pattern" type="textarea" rows="3"></el-input>
          <div class="tip">尾行匹配模式，仅当匹配模式为首尾行匹配时有效</div>
        </el-form-item>

        <el-form-item label="优先级" prop="priority">
          <el-input-number v-model="ruleForm.priority" :min="1" controls-position="right"></el-input-number>
          <div class="tip">数值越大优先级越高</div>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="handleCancelClick">取消</el-button>
        <el-button type="primary" @click="confirmRuleAction">确认</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { ruleManagementApi } from '@/api';

export default {
  name: 'RuleManagementView',
  data() {
    return {
      // 加载状态
      loading: {
        parser: false
      },
      // 对话框显示状态
      dialogVisible: {
        parser: false
      },
      // 解析规则表单数据
      ruleForm: {
        id: '',
        name: '',
        description: '',
        log_type: '',
        pattern: '',
        is_regex: false,
        is_enabled: true,
        priority: 50,
        match_mode: 'single',  // 默认单行匹配模式
        tail_pattern: ''       // 尾行匹配模式
      },
      // 解析规则表单验证规则
      ruleFormRules: {
        name: [
          { required: true, message: '请输入规则名称', trigger: 'blur' },
          { min: 2, max: 50, message: '规则名称长度应在2-50个字符之间', trigger: 'blur' }
        ],
        description: [
          { required: true, message: '请输入规则描述', trigger: 'blur' },
          { min: 2, max: 200, message: '规则描述长度应在2-200个字符之间', trigger: 'blur' }
        ],
        log_type: [
          { required: true, message: '请选择日志类型', trigger: 'change' }
        ],
        pattern: [
          { required: true, message: '请输入匹配模式', trigger: 'blur' },
          { min: 2, max: 200, message: '匹配模式长度应在2-200个字符之间', trigger: 'blur' }
        ],
        match_mode: [
          { required: true, message: '请选择匹配模式类型', trigger: 'change' }
        ],
        tail_pattern: [
          { required: false, message: '首尾行匹配模式下需要提供尾行匹配模式', trigger: 'blur' },
          { validator: (rule, value, callback) => {
            if (this.ruleForm.match_mode === 'head_tail' && (!value || value.trim() === '')) {
              callback(new Error('首尾行匹配模式下需要提供尾行匹配模式'));
            } else {
              callback();
            }
          }, trigger: 'blur' }
        ],
        priority: [
          { required: true, message: '请设置优先级', trigger: 'change' },
          { type: 'number', min: 1, message: '优先级应大于等于1', trigger: 'change' }
        ]
      },
      // 解析规则列表
      parserRulesList: [],
      // 唯一的日志类型列表
      uniqueLogTypes: []
    };
  },
  mounted() {
    this.getParserRulesList(); // 获取解析规则列表
  },
  methods: {
    // 获取解析规则列表
    async getParserRulesList() {
      this.loading.parser = true;
      try {
        const response = await ruleManagementApi.getRulesList();
        console.log('获取解析规则列表响应:', response);
        let rulesList = [];

        if (response && response.status === 200) {
          rulesList = response.data || [];
        } else if (response && response.data && response.data.status === 200) {
          rulesList = response.data.data || [];
        }

        this.parserRulesList = rulesList;

        // 提取唯一的log_type值
        this.extractUniqueLogTypes();
      } catch (error) {
        console.error('获取解析规则列表失败:', error);
        this.$message.error('获取解析规则列表失败');
        this.parserRulesList = [];
        this.uniqueLogTypes = [];
      } finally {
        this.loading.parser = false;
      }
    },

    // 从规则列表中提取唯一的log_type值
    extractUniqueLogTypes() {
      // 使用Set来自动去重
      const logTypesSet = new Set();

      // 遍历所有规则，收集log_type值
      this.parserRulesList.forEach(rule => {
        if (rule.log_type) {
          logTypesSet.add(rule.log_type);
        }
      });

      // 转换为数组
      this.uniqueLogTypes = Array.from(logTypesSet);
      console.log('提取的唯一日志类型:', this.uniqueLogTypes);
    },

    // 添加解析规则对话框
    addParserRule() {
      this.ruleForm = {
        id: '',
        name: '',
        description: '',
        log_type: '',
        pattern: '',
        is_regex: false,
        is_enabled: true,
        priority: 50,
        match_mode: 'single',
        tail_pattern: ''
      };
      this.dialogVisible.parser = true;
    },

    // 编辑解析规则对话框
    editParserRule(rule) {
      this.ruleForm = {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        log_type: rule.log_type,
        pattern: rule.pattern,
        is_regex: rule.is_regex !== undefined ? rule.is_regex : false,
        is_enabled: rule.is_enabled !== undefined ? rule.is_enabled : true,
        priority: rule.priority || 50,
        match_mode: rule.match_mode || 'single',
        tail_pattern: rule.tail_pattern || ''
      };
      this.dialogVisible.parser = true;
    },

    // 确认解析规则操作
    async confirmRuleAction() {
      this.$refs.ruleForm.validate(async (valid) => {
        if (!valid) {
          return;
        }

        try {
          // 创建一个新的数据对象
          const formData = { ...this.ruleForm };
          // 确保优先级是数字类型
          formData.priority = parseInt(formData.priority, 10);

          console.log('提交的数据:', formData);

          if (this.ruleForm.id) {
            // 编辑解析规则
            const response = await ruleManagementApi.updateRule(this.ruleForm.id, formData);
            console.log('更新规则响应:', response);
            this.$message.success('编辑解析规则成功');
          } else {
            // 添加解析规则
            const response = await ruleManagementApi.addRule(formData);
            console.log('添加规则响应:', response);
            this.$message.success('添加解析规则成功');

            // 如果是新的日志类型，直接添加到唯一日志类型列表中
            if (this.ruleForm.log_type && !this.uniqueLogTypes.includes(this.ruleForm.log_type)) {
              this.uniqueLogTypes.push(this.ruleForm.log_type);
            }
          }
          this.dialogVisible.parser = false;
          this.getParserRulesList(); // 刷新列表
        } catch (error) {
          console.error('解析规则操作失败:', error);
          this.$message.error('解析规则操作失败: ' + (error.message || '未知错误'));
        }
      });
    },

    // 移除解析规则
    async removeParserRule(index, row) {
      try {
        this.$confirm('确定要删除该解析规则吗?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(async () => {
          const response = await ruleManagementApi.deleteRule(row.id);
          console.log('删除规则响应:', response);
          this.$message.success('删除解析规则成功');
          this.getParserRulesList(); // 刷新列表
        }).catch(() => {
          this.$message.info('已取消删除');
        });
      } catch (error) {
        console.error('删除解析规则失败:', error);
        this.$message.error('删除解析规则失败: ' + (error.message || '未知错误'));
      }
    },

    // 切换解析规则状态
    async toggleRuleStatus(rule) {
      try {
        // 创建一个新的规则对象，避免修改原始数据
        const updatedRule = { ...rule };
        const response = await ruleManagementApi.updateRule(rule.id, updatedRule);
        console.log('更新规则状态响应:', response);
        this.$message.success('规则状态更新成功');
        this.getParserRulesList(); // 刷新列表
      } catch (error) {
        console.error('规则状态更新失败:', error);
        rule.is_enabled = !rule.is_enabled; // 恢复原状态
        this.$message.error('规则状态更新失败: ' + (error.message || '未知错误'));
      }
    },

    // 获取日志类型标签
    getLogTypeTag(log_type) {
      const logTypeMap = {
        system: 'info',
        chat: 'success',
        player: 'warning',
        error: 'danger',
        warning: 'warning',
        version: 'info',
        remoteexcute: 'info',
        connection: 'info'
      };
      return logTypeMap[log_type] || 'info';
    },

    // 获取匹配模式标签类型
    getMatchModeTag(match_mode) {
      const matchModeMap = {
        single: 'info',
        multi_line: 'success',
        head_tail: 'warning'
      };
      return matchModeMap[match_mode] || 'info';
    },

    // 获取匹配模式显示文本
    getMatchModeText(match_mode) {
      const matchModeTextMap = {
        single: '单行',
        multi_line: '多行',
        head_tail: '首尾行'
      };
      return matchModeTextMap[match_mode] || match_mode;
    },

    // 处理匹配模式变更
    handleMatchModeChange(value) {
      console.log('匹配模式变更:', value);
      // 如果不是首尾行匹配模式，清空尾行匹配模式
      if (value !== 'head_tail') {
        this.ruleForm.tail_pattern = '';
      }

      // 如果是首尾行匹配模式，确保使用正则表达式
      if (value === 'head_tail') {
        this.ruleForm.is_regex = true;
      }
    },

    // 处理日志类型变更
    handleLogTypeChange(value) {
      console.log('日志类型变更:', value);
      // 确保值被正确设置
      this.ruleForm.log_type = value;

      // 如果是新的日志类型，添加到列表中
      if (value && !this.uniqueLogTypes.includes(value)) {
        this.uniqueLogTypes.push(value);
      }
    },

    // 处理选择框显示状态变化
    handleSelectVisibleChange(visible) {
      // 当选择框关闭时，确保自定义输入的值被保存
      if (!visible && this.ruleForm.log_type && this.ruleForm.log_type.trim() !== '') {
        // 如果是新的日志类型，添加到列表中
        if (!this.uniqueLogTypes.includes(this.ruleForm.log_type)) {
          this.uniqueLogTypes.push(this.ruleForm.log_type);
        }
      }
    },

    // 处理Enter键按下事件
    handleEnterKey(event) {
      console.log('Enter键按下事件:', event);
      // 获取当前输入框中的值
      const inputValue = event.target.value;

      if (inputValue && inputValue.trim() !== '') {
        // 设置到表单中
        this.ruleForm.log_type = inputValue;

        // 如果是新的日志类型，添加到列表中
        if (!this.uniqueLogTypes.includes(inputValue)) {
          this.uniqueLogTypes.push(inputValue);
        }

        // 阻止事件继续传播，防止被默认选项覆盖
        event.preventDefault();
        event.stopPropagation();
      }
    },

    // 处理选择框失去焦点事件
    handleSelectBlur(event) {
      console.log('选择框失去焦点:', event);

      // 确保当前输入的值被保存
      if (this.ruleForm.log_type && this.ruleForm.log_type.trim() !== '') {
        // 如果是新的日志类型，添加到列表中
        const currentValue = this.ruleForm.log_type;
        if (!this.uniqueLogTypes.includes(currentValue)) {
          this.uniqueLogTypes.push(currentValue);

          // 强制更新数据，确保值不会被覆盖
          this.$nextTick(() => {
            this.ruleForm.log_type = currentValue;
          });
        }
      }
    },

    // 复制匹配模式
    copyPattern(pattern) {
      if (!pattern) {
        this.$message.warning('匹配模式为空，无法复制');
        return;
      }

      // 使用浏览器的剪贴板 API 复制文本
      navigator.clipboard.writeText(pattern)
        .then(() => {
          this.$message.success('匹配模式已复制到剪贴板');
        })
        .catch(err => {
          console.error('复制失败:', err);
          this.$message.error('复制失败，请手动复制');

          // 备用方案：创建一个临时文本区域并复制
          this.fallbackCopy(pattern);
        });
    },

    // 备用复制方案
    fallbackCopy(text) {
      // 创建一个临时文本区域
      const textArea = document.createElement('textarea');
      textArea.value = text;

      // 将文本区域添加到文档中并选中文本
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        // 尝试使用文档的复制命令
        const successful = document.execCommand('copy');
        if (successful) {
          this.$message.success('匹配模式已复制到剪贴板');
        } else {
          this.$message.warning('复制失败，请手动复制');
        }
      } catch (err) {
        console.error('复制失败:', err);
        this.$message.error('复制失败，请手动复制');
      }

      // 移除临时文本区域
      document.body.removeChild(textArea);
    },

    // 处理对话框关闭
    handleDialogClose(done) {
      // 检查表单是否有修改
      const hasChanges = this.ruleForm.name ||
                        this.ruleForm.description ||
                        this.ruleForm.log_type ||
                        this.ruleForm.pattern ||
                        this.ruleForm.priority !== 50 ||
                        this.ruleForm.is_regex !== false ||
                        this.ruleForm.is_enabled !== true ||
                        this.ruleForm.match_mode !== 'single' ||
                        this.ruleForm.tail_pattern;

      if (hasChanges) {
        // 如果有修改，弹出确认对话框
        this.$confirm('关闭将丢失未保存的内容，是否确认关闭？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          // 用户确认关闭
          done();
        }).catch(() => {
          // 用户取消关闭
          // 不做任何操作，对话框保持打开状态
        });
      } else {
        // 如果没有修改，直接关闭
        done();
      }
    },

    // 处理取消按钮点击
    handleCancelClick() {
      // 使用相同的关闭逻辑
      this.handleDialogClose(() => {
        this.dialogVisible.parser = false;
      });
    }
  }
};
</script>

<style scoped>
.rule-management-container {
  padding: 20px;
}

.rule-section {
  background: #fff;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.rule-header h3 {
  margin: 0;
}

.tip {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}

/* 匹配模式列样式 */
.pattern-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  position: relative;
}

.pattern-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 5px;
}

.copy-btn {
  padding: 2px;
  margin-left: 5px;
  opacity: 0;
  transition: opacity 0.3s;
}

.pattern-container:hover .copy-btn {
  opacity: 1;
}

/* 确保复制按钮不会被截断 */
.el-table .cell {
  overflow: visible !important;
}
</style>