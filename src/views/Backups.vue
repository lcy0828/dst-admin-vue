<template>
  <div class="backups-page">
    <div class="page-header">
      <h2>备份管理</h2>
      <div class="header-actions">
        <el-button type="primary" icon="el-icon-plus" @click="createBackup">创建备份</el-button>
        <el-button icon="el-icon-refresh" @click="refreshBackups">刷新</el-button>
      </div>
    </div>
    
    <el-card shadow="hover" class="backups-card">
      <div slot="header" class="card-header">
        <span>备份列表</span>
        <el-select v-model="filterType" placeholder="筛选类型" size="small">
          <el-option label="全部" value="all"></el-option>
          <el-option label="系统备份" value="system"></el-option>
          <el-option label="房间备份" value="room"></el-option>
        </el-select>
      </div>
      
      <el-table
        :data="filteredBackups"
        style="width: 100%"
        v-loading="loading">
        <el-table-column prop="name" label="备份名称">
          <template slot-scope="scope">
            <div class="backup-name">
              <i class="el-icon-document" :class="{ 'system-icon': scope.row.type === 'system', 'room-icon': scope.row.type === 'room' }"></i>
              {{ scope.row.name }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="120">
          <template slot-scope="scope">
            <el-tag :type="scope.row.type === 'system' ? 'primary' : 'success'">
              {{ scope.row.type === 'system' ? '系统备份' : '房间备份' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="size" label="大小" width="120"></el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180"></el-table-column>
        <el-table-column label="操作" width="200">
          <template slot-scope="scope">
            <el-button 
              type="primary" 
              size="mini" 
              @click="restoreBackup(scope.row)">恢复</el-button>
            <el-button 
              type="success" 
              size="mini" 
              @click="downloadBackup(scope.row)">下载</el-button>
            <el-button 
              type="danger" 
              size="mini" 
              @click="deleteBackup(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'Backups',
  data() {
    return {
      loading: false,
      filterType: 'all',
      backups: []
    }
  },
  computed: {
    filteredBackups() {
      if (this.filterType === 'all') {
        return this.backups;
      } else {
        return this.backups.filter(backup => backup.type === this.filterType);
      }
    }
  },
  methods: {
    refreshBackups() {
      this.loading = true;
      this.$api.systemApi.getBackupList()
        .then(res => {
          this.backups = res.map(backup => ({
            ...backup,
            createTime: this.formatDate(backup.createTime)
          }));
        })
        .catch(err => {
          this.$message.error('获取备份列表失败：' + err.message);
        })
        .finally(() => {
          this.loading = false;
        });
    },
    createBackup() {
      this.$prompt('请输入备份名称', '创建备份', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^.{1,50}$/,
        inputErrorMessage: '备份名称不能为空且不超过50个字符'
      }).then(({ value }) => {
        this.loading = true;
        this.$api.systemApi.createBackup({ name: value })
          .then(() => {
            this.$message({
              type: 'success',
              message: '创建备份成功'
            });
            this.refreshBackups();
          })
          .catch(err => {
            this.$message.error('创建备份失败：' + err.message);
          })
          .finally(() => {
            this.loading = false;
          });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消创建'
        });
      });
    },
    restoreBackup(backup) {
      this.$confirm(`确定要从备份"${backup.name}"恢复系统吗？此操作可能需要一段时间，并且会重启服务。`, '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
        this.$api.systemApi.restoreFromBackup(backup.id)
          .then(() => {
            this.$message({
              type: 'success',
              message: '系统正在从备份恢复，请稍候...'
            });
          })
          .catch(err => {
            this.$message.error('恢复备份失败：' + err.message);
          })
          .finally(() => {
            this.loading = false;
          });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消恢复'
        });
      });
    },
    downloadBackup(backup) {
      this.$message({
        message: `正在准备下载备份：${backup.name}`,
        type: 'success'
      });
      // 实际下载逻辑需要后端支持，可能需要生成临时下载链接
      window.open(`${this.$api.config.BASE_URL}/system/backup/${backup.id}/download`, '_blank');
    },
    deleteBackup(backup) {
      this.$confirm(`确定要删除备份"${backup.name}"吗？此操作不可恢复！`, '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
        this.$api.systemApi.deleteBackup(backup.id)
          .then(() => {
            this.backups = this.backups.filter(item => item.id !== backup.id);
            this.$message({
              type: 'success',
              message: '删除备份成功'
            });
          })
          .catch(err => {
            this.$message.error('删除备份失败：' + err.message);
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
    }
  },
  mounted() {
    this.refreshBackups();
  }
}
</script>

<style scoped>
.backups-page {
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

.backups-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.backup-name {
  display: flex;
  align-items: center;
}

.backup-name i {
  margin-right: 10px;
  font-size: 18px;
}

.system-icon {
  color: #409EFF;
}

.room-icon {
  color: #67C23A;
}

.el-table >>> .el-table__row {
  cursor: pointer;
}
</style> 