<template>
  <div class="announcements-page">
    <div class="page-header">
      <h2>公告管理</h2>
      <div class="header-actions">
        <el-button type="primary" icon="el-icon-plus" @click="createAnnouncement">发布公告</el-button>
        <el-button icon="el-icon-refresh" @click="refreshAnnouncements">刷新</el-button>
      </div>
    </div>
    
    <el-card shadow="hover" class="announcements-card">
      <div slot="header" class="card-header">
        <span>公告列表</span>
        <el-select v-model="statusFilter" placeholder="状态筛选" size="small">
          <el-option label="全部" value="all"></el-option>
          <el-option label="有效" value="active"></el-option>
          <el-option label="已过期" value="expired"></el-option>
        </el-select>
      </div>
      
      <el-table
        :data="filteredAnnouncements"
        style="width: 100%"
        v-loading="loading">
        <el-table-column prop="title" label="标题">
          <template slot-scope="scope">
            <div class="announcement-title">
              <el-badge v-if="scope.row.important" value="重要" class="important-badge" />
              {{ scope.row.title }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="publishTime" label="发布时间" width="180"></el-table-column>
        <el-table-column prop="expireTime" label="过期时间" width="180"></el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === 'active' ? 'success' : 'info'" size="mini">
              {{ scope.row.status === 'active' ? '有效' : '已过期' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template slot-scope="scope">
            <el-button 
              type="primary" 
              size="mini" 
              @click="viewAnnouncement(scope.row)">查看</el-button>
            <el-button 
              type="warning" 
              size="mini" 
              @click="editAnnouncement(scope.row)">编辑</el-button>
            <el-button 
              type="danger" 
              size="mini" 
              @click="deleteAnnouncement(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 公告详情对话框 -->
    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="50%">
      <template v-if="currentAnnouncement">
        <div class="announcement-detail">
          <div class="announcement-header">
            <h3>{{ currentAnnouncement.title }}</h3>
            <div class="announcement-meta">
              <span>发布时间: {{ currentAnnouncement.publishTime }}</span>
              <span>过期时间: {{ currentAnnouncement.expireTime }}</span>
              <el-tag v-if="currentAnnouncement.important" type="danger" size="mini">重要</el-tag>
            </div>
          </div>
          <div class="announcement-content" v-html="currentAnnouncement.content"></div>
        </div>
      </template>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">关闭</el-button>
        <template v-if="dialogMode === 'view'">
          <el-button type="primary" @click="editCurrentAnnouncement">编辑</el-button>
        </template>
        <template v-else>
          <el-button type="success" @click="saveAnnouncement">保存</el-button>
        </template>
      </div>
    </el-dialog>
    
    <!-- 编辑/创建公告表单 -->
    <el-dialog :title="formTitle" v-model="formVisible" width="70%">
      <el-form :model="announcementForm" :rules="rules" ref="announcementForm" label-width="100px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="announcementForm.title" placeholder="请输入公告标题"></el-input>
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input type="textarea" v-model="announcementForm.content" placeholder="请输入公告内容" :rows="8"></el-input>
        </el-form-item>
        <el-form-item label="过期时间" prop="expireTime">
          <el-date-picker
            v-model="announcementForm.expireTime"
            type="datetime"
            placeholder="选择过期时间"
            format="yyyy-MM-dd HH:mm:ss"
            value-format="yyyy-MM-dd HH:mm:ss">
          </el-date-picker>
        </el-form-item>
        <el-form-item label="发送对象" prop="target">
          <el-radio-group v-model="announcementForm.target">
            <el-radio label="all">所有玩家</el-radio>
            <el-radio label="online">在线玩家</el-radio>
            <el-radio label="admins">管理员</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="重要公告">
          <el-switch v-model="announcementForm.important"></el-switch>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAnnouncementForm">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'Announcements',
  data() {
    return {
      loading: false,
      statusFilter: 'all',
      announcements: [],
      dialogVisible: false,
      dialogTitle: '公告详情',
      dialogMode: 'view', // view或edit
      currentAnnouncement: null,
      formVisible: false,
      formTitle: '创建公告',
      announcementForm: {
        title: '',
        content: '',
        expireTime: '',
        target: 'all',
        important: false
      },
      rules: {
        title: [
          { required: true, message: '请输入公告标题', trigger: 'blur' },
          { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
        ],
        content: [
          { required: true, message: '请输入公告内容', trigger: 'blur' }
        ],
        expireTime: [
          { required: true, message: '请选择过期时间', trigger: 'change' }
        ]
      }
    }
  },
  computed: {
    filteredAnnouncements() {
      if (this.statusFilter === 'all') {
        return this.announcements;
      } else {
        return this.announcements.filter(item => item.status === this.statusFilter);
      }
    }
  },
  methods: {
    refreshAnnouncements() {
      this.loading = true;
      this.$api.systemApi.getAnnouncements()
        .then(res => {
          this.announcements = res.map(announcement => ({
            ...announcement,
            publishTime: this.formatDate(announcement.publishTime),
            expireTime: this.formatDate(announcement.expireTime)
          }));
        })
        .catch(err => {
          this.$message.error('获取公告列表失败：' + err.message);
        })
        .finally(() => {
          this.loading = false;
        });
    },
    viewAnnouncement(announcement) {
      this.currentAnnouncement = { ...announcement };
      this.dialogTitle = '公告详情';
      this.dialogMode = 'view';
      this.dialogVisible = true;
    },
    editCurrentAnnouncement() {
      this.dialogVisible = false;
      this.editAnnouncement(this.currentAnnouncement);
    },
    createAnnouncement() {
      this.formTitle = '创建公告';
      this.announcementForm = {
        title: '',
        content: '',
        expireTime: this.getDefaultExpireTime(),
        target: 'all',
        important: false
      };
      this.formVisible = true;
    },
    editAnnouncement(announcement) {
      this.formTitle = '编辑公告';
      this.announcementForm = {
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        expireTime: announcement.expireTime,
        target: announcement.target || 'all',
        important: announcement.important
      };
      this.formVisible = true;
    },
    submitAnnouncementForm() {
      this.$refs.announcementForm.validate(valid => {
        if (valid) {
          this.loading = true;
          const isEdit = !!this.announcementForm.id;
          const apiRequest = isEdit 
            ? this.$api.systemApi.updateAnnouncement(this.announcementForm.id, this.announcementForm)
            : this.$api.systemApi.createAnnouncement(this.announcementForm);
          
          apiRequest
            .then(() => {
              this.$message({
                type: 'success',
                message: isEdit ? '更新公告成功' : '创建公告成功'
              });
              this.formVisible = false;
              this.refreshAnnouncements();
            })
            .catch(err => {
              this.$message.error((isEdit ? '更新公告失败：' : '创建公告失败：') + err.message);
            })
            .finally(() => {
              this.loading = false;
            });
        }
      });
    },
    deleteAnnouncement(announcement) {
      this.$confirm(`确定要删除公告"${announcement.title}"吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
        this.$api.systemApi.deleteAnnouncement(announcement.id)
          .then(() => {
            this.announcements = this.announcements.filter(item => item.id !== announcement.id);
            this.$message({
              type: 'success',
              message: '删除公告成功'
            });
          })
          .catch(err => {
            this.$message.error('删除公告失败：' + err.message);
          })
          .finally(() => {
            this.loading = false;
          });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消删除'
        });
      });
    },
    saveAnnouncement() {
      // 从查看模式切换到编辑模式时使用
      this.dialogVisible = false;
      this.editAnnouncement(this.currentAnnouncement);
    },
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    },
    getDefaultExpireTime() {
      const date = new Date();
      date.setDate(date.getDate() + 7); // 默认7天后过期
      return date.toISOString().substring(0, 19).replace('T', ' ');
    }
  },
  mounted() {
    this.refreshAnnouncements();
  }
}
</script>

<style scoped>
.announcements-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.announcements-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.announcement-title {
  display: flex;
  align-items: center;
}

.important-badge {
  margin-right: 10px;
}

.announcement-detail {
  padding: 0 20px;
}

.announcement-header {
  margin-bottom: 20px;
  border-bottom: 1px solid #e8ece5;
  padding-bottom: 15px;
}

.announcement-header h3 {
  margin-top: 0;
  margin-bottom: 10px;
}

.announcement-meta {
  display: flex;
  justify-content: space-between;
  color: #758078;
  font-size: 14px;
}

.announcement-content {
  line-height: 1.6;
  white-space: pre-wrap;
}
</style> 