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
        <el-table-column prop="pattern" label="匹配模式" show-overflow-tooltip></el-table-column>
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
    >
      <el-form :model="ruleForm" :rules="ruleFormRules" ref="ruleForm" label-width="120px">
        <el-form-item label="规则名称" prop="name">
          <el-input v-model="ruleForm.name"></el-input>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="ruleForm.description" type="textarea"></el-input>
        </el-form-item>
        <el-form-item label="日志类型" prop="log_type">
          <el-select v-model="ruleForm.log_type" placeholder="选择日志类型">
            <el-option label="系统" value="system"></el-option>
            <el-option label="聊天" value="chat"></el-option>
            <el-option label="玩家" value="player"></el-option>
            <el-option label="错误" value="error"></el-option>
            <el-option label="警告" value="warning"></el-option>
            <el-option label="版本" value="version"></el-option>
            <el-option label="远程执行" value="remoteexcute"></el-option>
            <el-option label="连接" value="connection"></el-option>
          </el-select>
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
        <el-form-item label="优先级" prop="priority">
          <el-slider v-model="ruleForm.priority" :min="1" :max="100" :step="1" show-stops></el-slider>
          <div class="tip">优先级范围为1-100，数值越大优先级越高</div>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible.parser = false">取消</el-button>
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
        priority: 50
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
        priority: [
          { required: true, message: '请设置优先级', trigger: 'change' },
          { min: 1, max: 100, message: '优先级范围应在1-100之间', trigger: 'change' }
        ]
      },
      // 解析规则列表
      parserRulesList: []
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
        if (response && response.status === 200) {
          this.parserRulesList = response.data || [];
        } else if (response && response.data && response.data.status === 200) {
          this.parserRulesList = response.data.data || [];
        } else {
          this.parserRulesList = [];
        }
      } catch (error) {
        console.error('获取解析规则列表失败:', error);
        this.$message.error('获取解析规则列表失败');
        this.parserRulesList = [];
      } finally {
        this.loading.parser = false;
      }
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
        priority: 50
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
        is_regex: rule.is_regex,
        is_enabled: rule.is_enabled,
        priority: rule.priority
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
          if (this.ruleForm.id) {
            // 编辑解析规则
            const response = await ruleManagementApi.updateRule(this.ruleForm.id, this.ruleForm);
            console.log('更新规则响应:', response);
            this.$message.success('编辑解析规则成功');
          } else {
            // 添加解析规则
            const response = await ruleManagementApi.addRule(this.ruleForm);
            console.log('添加规则响应:', response);
            this.$message.success('添加解析规则成功');
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
</style> 