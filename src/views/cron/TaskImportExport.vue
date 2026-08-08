<template>
  <div class="app-container">
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card class="box-card">
          <template v-slot:header>
<div  class="clearfix">
            <span>导出任务配置</span>
            <automation-room-select @ready="getExportFiles" @change="getExportFiles" />
          </div>
</template>
          <el-form ref="exportForm" :model="exportForm" label-width="100px">
            <el-form-item label="导出描述" prop="description">
              <el-input 
                v-model="exportForm.description" 
                placeholder="为本次导出添加描述信息"
                type="textarea" 
                :rows="2"
              ></el-input>
            </el-form-item>
            
            <el-form-item label="文件名" prop="filename">
              <el-input 
                v-model="exportForm.filename" 
                placeholder="导出文件名（不含扩展名）"
              ></el-input>
              <span class="form-help-text">文件将以 .json 格式保存</span>
            </el-form-item>
            
            <el-form-item label="导出选项">
              <el-checkbox-group v-model="exportForm.options">
                <el-checkbox label="tasks">包含任务数据</el-checkbox>
                <el-checkbox label="groups">包含任务组数据</el-checkbox>
                <el-checkbox label="dependencies">包含任务依赖关系</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="handleExport" :loading="exporting">
                导出配置
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card class="box-card">
          <template v-slot:header>
<div  class="clearfix">
            <span>导入任务配置</span>
          </div>
</template>
          <el-form ref="importForm" :model="importForm" label-width="100px">
            <el-form-item label="选择文件" prop="file">
              <el-upload
                class="upload-demo"
                action="#"
                :auto-upload="false"
                :on-change="handleFileChange"
                :limit="1"
                ref="upload">
                <template v-slot:trigger>
<el-button  size="small" type="primary">选择文件</el-button>
</template>
                <template v-slot:tip>
<div  class="el-upload__tip">只能上传 .json 文件</div>
</template>
              </el-upload>
            </el-form-item>
            
            <el-form-item label="导入模式">
              <el-radio-group v-model="importForm.mode">
                <el-radio label="merge">合并</el-radio>
                <el-radio label="override">覆盖</el-radio>
              </el-radio-group>
              <div class="form-help-text">
                <p>合并: 添加文件中不存在的任务和任务组，已存在的不会修改</p>
                <p>覆盖: 完全按照文件内容更新，可能会覆盖现有配置</p>
              </div>
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="handleImport" :loading="importing" :disabled="!importForm.file">
                导入配置
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>
    
    <el-card class="box-card" style="margin-top: 20px;">
      <template v-slot:header>
<div  class="clearfix">
        <span>本次浏览器导出记录</span>
        <el-button style="float: right" type="success" icon="el-icon-refresh" size="small" @click="getExportFiles">刷新</el-button>
      </div>
</template>
      <el-table :data="exportFiles" border style="width: 100%">
        <el-table-column prop="filename" label="文件名" width="200"></el-table-column>
        <el-table-column prop="description" label="描述" min-width="200"></el-table-column>
        <el-table-column prop="size" label="大小" width="100">
          <template v-slot="scope">
            {{ formatFileSize(scope.row.size) }}
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180"></el-table-column>
        <el-table-column label="操作" width="200" align="center">
          <template v-slot="scope">
            <el-button 
              size="mini" 
              type="primary" 
              @click="downloadFile(scope.row)" 
              icon="el-icon-download">
              下载
            </el-button>
            <el-button 
              size="mini" 
              type="danger" 
              @click="deleteFile(scope.row)" 
              icon="el-icon-delete">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { cronTaskApi } from '@/api/index';
import AutomationRoomSelect from '@/components/AutomationRoomSelect.vue';

export default {
  name: 'TaskImportExport',
  components: { AutomationRoomSelect },
  data() {
    return {
      exporting: false,
      importing: false,
      exportForm: {
        description: '',
        filename: 'task_config_' + new Date().toISOString().slice(0, 10),
        options: ['tasks', 'groups', 'dependencies']
      },
      importForm: {
        file: null,
        mode: 'merge'
      },
      exportFiles: []
    };
  },
  methods: {
    getExportFiles() {
      cronTaskApi.getExportFiles()
        .then(response => {
          if (response.data && response.data.status === 200) {
            this.exportFiles = response.data.data || [];
          } else {
            this.$message.error(response.data.message || '获取导出文件列表失败');
          }
        })
        .catch(error => {
          console.error('获取导出文件列表失败:', error);
          this.$message.error('获取导出文件列表失败');
        });
    },
    handleExport() {
      if (!this.exportForm.filename) {
        this.$message.warning('请输入文件名');
        return;
      }
      
      if (this.exportForm.options.length === 0) {
        this.$message.warning('请至少选择一项导出选项');
        return;
      }
      
      this.exporting = true;
      cronTaskApi.exportTasks(this.exportForm)
        .then(response => {
          if (response.data && response.data.status === 200) {
            this.$message.success('导出成功');
            this.getExportFiles();
          } else {
            this.$message.error(response.data.message || '导出失败');
          }
        })
        .catch(error => {
          console.error('导出任务配置失败:', error);
          this.$message.error(error.message || '导出任务配置失败');
        })
        .finally(() => {
          this.exporting = false;
        });
    },
    handleFileChange(file) {
      if (file && file.raw) {
        if (file.raw.type !== 'application/json' && !file.raw.name.endsWith('.json')) {
          this.$message.error('只能上传 JSON 文件!');
          this.$refs.upload.clearFiles();
          this.importForm.file = null;
          return;
        }
        this.importForm.file = file.raw;
      } else {
        this.importForm.file = null;
      }
    },
    handleImport() {
      if (!this.importForm.file) {
        this.$message.warning('请选择要导入的文件');
        return;
      }
      
      this.importing = true;
      
      const formData = new FormData();
      formData.append('file', this.importForm.file);
      formData.append('mode', this.importForm.mode);
      
      cronTaskApi.importTasks(formData)
        .then(response => {
          if (response.data && response.data.status === 200) {
            this.$message.success('导入成功');
            this.$refs.upload.clearFiles();
            this.importForm.file = null;
          } else {
            this.$message.error(response.data.message || '导入失败');
          }
        })
        .catch(error => {
          console.error('导入任务配置失败:', error);
          this.$message.error(error.message || '导入任务配置失败');
        })
        .finally(() => {
          this.importing = false;
        });
    },
    downloadFile(file) {
      cronTaskApi.downloadExportFile(file.filename)
        .then(response => {
          const blob = new Blob([response.data], { type: 'application/json' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = file.filename;
          link.click();
          URL.revokeObjectURL(link.href);
        })
        .catch(error => {
          console.error('下载文件失败:', error);
          this.$message.error('下载文件失败');
        });
    },
    deleteFile(file) {
      this.$confirm('确定要移除这条浏览器导出记录吗？已下载到磁盘的文件不会被删除', '确认移除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        cronTaskApi.deleteExportFile(file.filename)
          .then(response => {
            if (response.data && response.data.status === 200) {
              this.$message.success('删除成功');
              this.getExportFiles();
            } else {
              this.$message.error(response.data.message || '删除失败');
            }
          })
          .catch(error => {
            console.error('删除文件失败:', error);
            this.$message.error('删除文件失败');
          });
      }).catch(() => {
        this.$message.info('已取消删除');
      });
    },
    formatFileSize(size) {
      if (size < 1024) {
        return size + ' B';
      } else if (size < 1024 * 1024) {
        return (size / 1024).toFixed(2) + ' KB';
      } else {
        return (size / (1024 * 1024)).toFixed(2) + ' MB';
      }
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
  margin-top: 5px;
}
.form-help-text p {
  margin: 3px 0;
}
.upload-demo {
  margin-bottom: 10px;
}
</style>
