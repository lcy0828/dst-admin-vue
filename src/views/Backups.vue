<template>
  <div class="backups-page">
    <div class="page-header">
      <h2>备份管理</h2>
      <div class="header-actions">
        <el-button type="primary" icon="el-icon-plus" @click="showCreateBackupDialog">创建备份</el-button>
        <el-button icon="el-icon-refresh" @click="refreshBackups">刷新</el-button>
      </div>
    </div>
    
    <el-card shadow="hover" class="backups-card">
      <template v-slot:header>
<div  class="card-header">
        <span>备份列表</span>
        <el-select v-model="selectedFilter" placeholder="选择存档" clearable style="width: 180px">
          <el-option label="全部" value=""></el-option>
          <el-option 
            v-for="archive in archiveOptions" 
            :key="archive" 
            :label="archive" 
            :value="archive">
          </el-option>
        </el-select>
      </div>
</template>
      
      <el-table
        :data="filteredBackups"
        style="width: 100%"
        v-loading="loading">
        <el-table-column prop="name" label="备份名称">
          <template v-slot="scope">
            <div class="backup-name">
              <component :is="'el-icon-document'" class="legacy-icon" />
              {{ scope.row.name }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="archive_name" label="存档名称" width="120"></el-table-column>
        <el-table-column prop="size_formatted" label="大小" width="120"></el-table-column>
        <el-table-column prop="create_time" label="创建时间" width="180"></el-table-column>
        <el-table-column label="操作" width="280">
          <template v-slot="scope">
            <el-button 
              type="success" 
              size="mini" 
              @click="downloadBackup(scope.row)">下载</el-button>
            <el-button 
              type="primary" 
              size="mini" 
              @click="showRestoreDialog(scope.row)">恢复</el-button>
            <el-button 
              type="danger" 
              size="mini" 
              @click="confirmDeleteBackup(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建备份对话框 -->
    <el-dialog
      title="创建存档备份"
      v-model="createDialogVisible"
      width="30%">
      <span>选择要备份的存档：</span>
      <el-select v-model="selectedArchive" placeholder="请选择存档" style="width: 100%; margin-top: 15px;">
        <el-option
          v-for="archive in archivesList"
          :key="archive"
          :label="archive"
          :value="archive">
        </el-option>
      </el-select>
      <template v-slot:footer>
<span  class="dialog-footer">
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="createBackup" :loading="createLoading">创建</el-button>
      </span>
</template>
    </el-dialog>

    <!-- 恢复备份对话框 -->
    <el-dialog
      title="恢复存档备份"
      v-model="restoreDialogVisible"
      width="40%">
      <div class="restore-dialog-content">
        <div class="info-row">
          <span class="label">备份文件：</span>
          <span class="value">{{ currentBackup ? currentBackup.name : '' }}</span>
        </div>
        <div class="info-row">
          <span class="label">源存档：</span>
          <span class="value">{{ currentBackup ? currentBackup.archive_name : '' }}</span>
        </div>
        <el-divider></el-divider>
        <div class="restore-options">
          <div class="option-title">恢复选项</div>
          <el-radio-group v-model="restoreOption" class="restore-radio-group">
            <el-radio :label="'original'">恢复到原存档</el-radio>
            <el-radio :label="'new'">恢复到新存档</el-radio>
          </el-radio-group>

          <div v-if="restoreOption === 'original'" class="original-archive-option">
            <div class="warning-message">
              <component :is="'el-icon-warning'" class="legacy-icon" />
              <span>警告：此操作将覆盖原存档的所有内容，且无法撤销，请确保已备份重要数据！</span>
            </div>
          </div>

          <div v-if="restoreOption === 'new'" class="new-archive-option">
            <div class="form-item">
              <span class="label">新存档名称：</span>
              <el-input v-model="newArchiveName" placeholder="请输入新存档名称"></el-input>
            </div>
            <div class="form-item">
              <el-checkbox v-model="overwriteExisting">如果存档已存在则覆盖</el-checkbox>
            </div>
          </div>
        </div>
      </div>
      <template v-slot:footer>
<span  class="dialog-footer">
        <el-button @click="restoreDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="restoreBackup" :loading="restoreLoading">恢复</el-button>
      </span>
</template>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'BackupsView',
  data() {
    return {
      loading: false,
      createLoading: false,
      restoreLoading: false,
      createDialogVisible: false,
      restoreDialogVisible: false,
      selectedArchive: '',
      selectedFilter: '',
      backupsList: [],
      archivesList: [],
      currentBackup: null,
      restoreOption: 'original',
      newArchiveName: '',
      overwriteExisting: false
    }
  },
  computed: {
    archiveOptions() {
      // 从备份列表中提取所有唯一的存档名称
      const archives = this.backupsList.map(backup => backup.archive_name);
      return [...new Set(archives)];
    },
    filteredBackups() {
      if (!this.selectedFilter) {
        return this.backupsList;
      }
      return this.backupsList.filter(backup => backup.archive_name === this.selectedFilter);
    }
  },
  methods: {
    refreshBackups() {
      this.loading = true;
      this.$api.backupApi.getBackupList()
        .then(res => {
          if (res.status === 200) {
            // 处理返回的数据结构
            let allBackups = [];
            // 将各个存档的备份整合到一个列表中
            for (const archive in res.data) {
              if (Object.hasOwnProperty.call(res.data, archive)) {
                if (!this.archivesList.includes(archive)) {
                  this.archivesList.push(archive);
                }
                
                const backups = res.data[archive];
                allBackups = [...allBackups, ...backups];
              }
            }
            this.backupsList = allBackups;
          } else {
            this.$message.error('获取备份列表失败：' + res.msg);
          }
        })
        .catch(err => {
          this.$message.error('获取备份列表失败：' + err.message);
        })
        .finally(() => {
          this.loading = false;
        });
    },
    showCreateBackupDialog() {
      this.createDialogVisible = true;
      
      // 使用房间管理接口获取存档列表
      this.$api.roomApi.getRoomList()
        .then(res => {
          if (Array.isArray(res)) {
            // 提取房间名称作为存档列表
            this.archivesList = res.map(room => room.savename || room.name);
          } else if (res.data && Array.isArray(res.data)) {
            this.archivesList = res.data.map(room => room.savename || room.name);
          }
          
          if (this.archivesList.length === 0) {
            this.$message.warning('没有可用的存档');
          }
        })
        .catch(err => {
          this.$message.error('获取存档列表失败：' + (err.message || '未知错误'));
        });
    },
    createBackup() {
      if (!this.selectedArchive) {
        this.$message.warning('请选择要备份的存档');
        return;
      }
      
      this.createLoading = true;
      this.$api.backupApi.createBackup(this.selectedArchive)
        .then(res => {
          if (res.status === 200) {
            this.$message({
              type: 'success',
              message: res.msg || '创建备份成功'
            });
            this.createDialogVisible = false;
            this.refreshBackups();
          } else {
            this.$message.error('创建备份失败：' + res.msg);
          }
        })
        .catch(err => {
          this.$message.error('创建备份失败：' + err.message);
        })
        .finally(() => {
          this.createLoading = false;
        });
    },
    downloadBackup(backup) {
      const { archive_name, name } = backup;

      this.$api.backupApi.downloadBackup(archive_name, name)
        .then(url => {
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', name);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          this.$message.success(`正在下载备份：${name}`);
        })
        .catch(error => this.$message.error(`下载备份失败：${error.message}`));
    },
    
    // 显示恢复备份对话框
    showRestoreDialog(backup) {
      this.currentBackup = backup;
      this.restoreOption = 'original';
      this.newArchiveName = `${backup.archive_name}_restored`;
      this.overwriteExisting = false;
      this.restoreDialogVisible = true;
    },
    
    // 恢复备份
    restoreBackup() {
      if (!this.currentBackup) {
        this.$message.warning('未选择备份文件');
        return;
      }
      
      let targetName = null;
      let overwriteTarget = true; // 始终设置为 true
      
      if (this.restoreOption === 'original') {
        // 恢复到原存档时再次确认
        this.$confirm('您确定要恢复此备份到原存档吗？此操作将覆盖原存档所有内容且无法撤销！', '警告', {
          confirmButtonText: '确认恢复',
          cancelButtonText: '取消',
          type: 'warning',
          distinguishCancelAndClose: true
        }).then(() => {
          this.executeRestore(this.currentBackup.archive_name, this.currentBackup.name, null, true);
        }).catch(() => {
          // 用户取消操作
          this.$message({
            type: 'info',
            message: '已取消恢复操作'
          });
        });
        return;
      } else if (this.restoreOption === 'new') {
        if (!this.newArchiveName) {
          this.$message.warning('请输入新存档名称');
          return;
        }
        targetName = this.newArchiveName;
        overwriteTarget = this.overwriteExisting;
        
        this.executeRestore(this.currentBackup.archive_name, this.currentBackup.name, targetName, overwriteTarget);
      }
    },
    
    // 执行恢复操作
    executeRestore(archive, backup, targetName, overwriteTarget) {
      this.restoreLoading = true;
      this.$api.backupApi.restoreBackup(
        archive,
        backup,
        targetName,
        overwriteTarget
      )
        .then(res => {
          if (res.status === 200) {
            this.$message({
              type: 'success',
              message: res.msg || '备份恢复成功'
            });
            this.restoreDialogVisible = false;
            this.refreshBackups();
          } else {
            this.$message.error('恢复备份失败：' + res.msg);
          }
        })
        .catch(err => {
          this.$message.error('恢复备份失败：' + err.message);
        })
        .finally(() => {
          this.restoreLoading = false;
        });
    },
    
    // 确认删除备份
    confirmDeleteBackup(backup) {
      const { archive_name, name } = backup;
      this.$confirm(`确定要删除备份文件 "${name}" 吗？此操作不可逆！`, '警告', {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
        distinguishCancelAndClose: true
      }).then(() => {
        this.deleteBackup(archive_name, name);
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消删除'
        });
      });
    },
    
    // 删除备份
    deleteBackup(archive, backup) {
      this.loading = true;
      this.$api.backupApi.deleteBackup(archive, backup)
        .then(res => {
          if (res.status === 200) {
            this.$message({
              type: 'success',
              message: res.msg || '备份删除成功'
            });
            this.refreshBackups();
          } else {
            this.$message.error('删除备份失败：' + res.msg);
          }
        })
        .catch(err => {
          this.$message.error('删除备份失败：' + err.message);
        })
        .finally(() => {
          this.loading = false;
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
  color: #d97932;
}

.el-table :deep(.el-table__row) {
  cursor: pointer;
}

/* 恢复对话框样式 */
.restore-dialog-content {
  padding: 10px;
}

.info-row {
  margin-bottom: 10px;
  display: flex;
}

.info-row .label {
  font-weight: bold;
  width: 100px;
}

.restore-options {
  margin-top: 15px;
}

.option-title {
  font-weight: bold;
  margin-bottom: 10px;
}

.restore-radio-group {
  display: flex;
  flex-direction: column;
}

.restore-radio-group .el-radio {
  margin-bottom: 10px;
  margin-left: 0;
}

.original-archive-option {
  margin-top: 15px;
  padding: 15px;
  background-color: #ffebeb;
  border-radius: 4px;
  border: 1px solid #ffb3b3;
}

.warning-message {
  display: flex;
  align-items: flex-start;
  color: #c94f4f;
}

.warning-message i {
  font-size: 18px;
  margin-right: 8px;
  margin-top: 2px;
}

.warning-message span {
  line-height: 1.5;
}

.form-item {
  margin-bottom: 15px;
}

.form-item .label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.new-archive-option {
  margin-top: 15px;
  padding: 15px;
  background-color: #f1f4ed;
  border-radius: 4px;
}
</style>
