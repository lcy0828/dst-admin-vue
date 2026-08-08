<template>
  <div class="app-container">
    <el-card class="box-card">
      <template v-slot:header>
<div  class="clearfix">
        <span>{{ isEdit ? '编辑任务组' : '添加任务组' }}</span>
        <el-button-group style="float: right">
          <el-button type="primary" icon="el-icon-back" @click="$router.push('/cron/groups')">返回列表</el-button>
        </el-button-group>
        <automation-room-select @ready="handleAutomationRoom" @change="handleAutomationRoom" />
      </div>
</template>
      <el-form :model="groupForm" :rules="rules" ref="groupForm" label-width="120px">
        <el-form-item label="组名称" prop="name">
          <el-input v-model="groupForm.name" placeholder="请输入任务组名称"></el-input>
        </el-form-item>
        
        <el-form-item label="组描述" prop="description">
          <el-input type="textarea" :rows="2" v-model="groupForm.description" placeholder="请输入任务组描述"></el-input>
        </el-form-item>
        
        <el-form-item label="组类型" prop="type">
          <el-radio-group v-model="groupForm.type">
            <el-radio label="system">系统</el-radio>
            <el-radio label="world">世界</el-radio>
            <el-radio label="custom">自定义</el-radio>
          </el-radio-group>
          <div class="form-help-text">
            <p>系统：用于系统维护相关任务</p>
            <p>世界：用于游戏世界相关任务</p>
            <p>自定义：用户自定义任务</p>
          </div>
        </el-form-item>
        
        <el-form-item label="组状态" prop="status">
          <el-switch
            v-model="groupForm.status"
            :active-value="1"
            :inactive-value="0"
            active-text="启用"
            inactive-text="禁用">
          </el-switch>
          <span class="form-help-text">禁用任务组会同时禁用组内所有任务</span>
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
  name: 'TaskGroupForm',
  components: { AutomationRoomSelect },
  data() {
    return {
      isEdit: false,
      groupId: null,
      submitting: false,
      groupForm: {
        name: '',
        description: '',
        type: 'custom',
        status: 1
      },
      rules: {
        name: [
          { required: true, message: '请输入任务组名称', trigger: 'blur' },
          { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
        ],
        description: [
          { max: 200, message: '描述不能超过200个字符', trigger: 'blur' }
        ],
        type: [
          { required: true, message: '请选择任务组类型', trigger: 'change' }
        ]
      }
    };
  },
  created() {
    // 判断是否是编辑模式
    const { id } = this.$route.params;
    if (id) {
      this.isEdit = true;
      this.groupId = id;
    }
  },
  methods: {
    handleAutomationRoom() {
      if (this.isEdit && this.groupId) this.getGroupDetail(this.groupId);
    },
    getGroupDetail(id) {
      cronTaskApi.getGroupDetail(id)
        .then(response => {
          if (response.data && response.data.status === 200) {
            const group = response.data.data;
            if (group) {
              this.groupForm = {
                name: group.name,
                description: group.description,
                type: group.type,
                status: group.status
              };
            }
          } else {
            this.$message.error(response.data.message || '获取任务组详情失败');
          }
        })
        .catch(error => {
          console.error('获取任务组详情失败:', error);
          this.$message.error('获取任务组详情失败');
        });
    },
    submitForm() {
      this.$refs.groupForm.validate(valid => {
        if (valid) {
          this.submitting = true;
          
          const apiMethod = this.isEdit
            ? cronTaskApi.updateGroup(this.groupId, this.groupForm)
            : cronTaskApi.addGroup(this.groupForm);
          
          apiMethod
            .then(response => {
              if (response.data && response.data.status === 200) {
                this.$message.success(this.isEdit ? '更新成功' : '添加成功');
                this.$router.push('/cron/groups');
              } else {
                this.$message.error(response.data.message || (this.isEdit ? '更新失败' : '添加失败'));
              }
            })
            .catch(error => {
              console.error(this.isEdit ? '更新任务组失败:' : '添加任务组失败:', error);
              this.$message.error(error.message || (this.isEdit ? '更新任务组失败' : '添加任务组失败'));
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
      this.$router.push('/cron/groups');
    }
  }
};
</script>

<style scoped>
.box-card {
  margin-bottom: 20px;
}
.form-help-text {
  font-size: 12px;
  color: #666;
  margin-left: 10px;
}
.form-help-text p {
  margin: 3px 0;
}
</style>
