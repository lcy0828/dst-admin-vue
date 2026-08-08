<template>
  <div class="page-container">
    <el-card class="main-card">
      <div slot="header" class="clearfix">
        <span>存档管理</span>
        <el-button style="float: right; padding: 3px 0" type="text" @click="refreshData">刷新</el-button>
      </div>

      <!-- 服务器选择 -->
      <div class="server-select-wrapper">
        <el-select v-model="selectedServer" placeholder="请选择服务器" @change="loadServerSaves" style="width: 300px;">
          <el-option
            v-for="server in serverList"
            :key="server.id"
            :label="server.name"
            :value="server.id">
            <template>
              <el-tag size="mini" :type="getStatusType(server.status)" class="status-tag">
                {{ getStatusText(server.status) }}
              </el-tag>
              <span style="margin-left: 8px">{{ server.name }}</span>
            </template>
          </el-option>
        </el-select>
      </div>

      <!-- 存档管理内容 -->
      <div v-loading="loading">
        <div v-if="!selectedServer" class="empty-saves">
          <component is="el-icon-folder" class="legacy-icon" />
          <p>请选择一个服务器来管理存档</p>
        </div>
        <div v-else>
          <!-- 工具栏 -->
          <div class="tool-bar">
            <el-button type="primary" icon="el-icon-upload" @click="uploadDialogVisible = true">上传存档</el-button>
            <el-button type="success" icon="el-icon-refresh" @click="createBackup">创建备份</el-button>
            <el-button type="warning" icon="el-icon-download" :disabled="!hasSelection" @click="downloadSelected">下载所选</el-button>
            <el-button type="danger" icon="el-icon-delete" :disabled="!hasSelection" @click="deleteSelected">删除所选</el-button>
          </div>

          <!-- 存档列表 -->
          <el-table
            :data="savesList"
            border
            @selection-change="handleSelectionChange"
            style="width: 100%">
            <el-table-column type="selection" width="55"></el-table-column>
            <el-table-column prop="name" label="存档名称" min-width="180">
              <template slot-scope="scope">
                <div class="save-name">
                  <component is="el-icon-document" class="legacy-icon" />
                  <span>{{ scope.row.name }}</span>
                  <el-tag size="mini" type="success" v-if="scope.row.isCurrent">当前存档</el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="size" label="大小" width="100"></el-table-column>
            <el-table-column prop="days" label="游戏天数" width="100" align="center"></el-table-column>
            <el-table-column prop="season" label="季节" width="100" align="center">
              <template slot-scope="scope">
                <el-tag size="medium" :type="getSeasonType(scope.row.season)">{{ scope.row.season }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="players" label="玩家数" width="100" align="center"></el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="180" align="center"></el-table-column>
            <el-table-column label="操作" width="280" align="center">
              <template slot-scope="scope">
                <el-button 
                  size="mini" 
                  type="success" 
                  icon="el-icon-check" 
                  @click="handleActivate(scope.row)" 
                  :disabled="scope.row.isCurrent">
                  加载
                </el-button>
                <el-button 
                  size="mini" 
                  type="primary" 
                  icon="el-icon-edit" 
                  @click="handleRename(scope.row)">
                  重命名
                </el-button>
                <el-button 
                  size="mini" 
                  type="warning" 
                  icon="el-icon-download" 
                  @click="handleDownload(scope.row)">
                  下载
                </el-button>
                <el-button 
                  size="mini" 
                  type="danger" 
                  icon="el-icon-delete" 
                  @click="handleDelete(scope.row)"
                  :disabled="scope.row.isCurrent">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-card>

    <!-- 上传存档对话框 -->
    <el-dialog title="上传存档" v-model="uploadDialogVisible" width="500px">
      <el-form :model="uploadForm" ref="uploadForm" label-width="100px">
        <el-form-item label="存档名称" prop="name">
          <el-input v-model="uploadForm.name" placeholder="请输入存档名称"></el-input>
        </el-form-item>
        <el-form-item label="存档文件" prop="file">
          <el-upload
            class="upload-demo"
            drag
            action="#"
            :http-request="customUpload"
            :limit="1"
            :on-exceed="handleExceed"
            :file-list="uploadForm.fileList">
            <component is="el-icon-upload" class="legacy-icon" />
            <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
            <div class="el-upload__tip" slot="tip">只能上传zip文件，且不超过100MB</div>
          </el-upload>
        </el-form-item>
        <el-form-item label="直接激活">
          <el-switch v-model="uploadForm.activate"></el-switch>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitUpload" :disabled="!uploadForm.fileList.length">确定</el-button>
      </span>
    </el-dialog>

    <!-- 重命名对话框 -->
    <el-dialog title="重命名存档" v-model="renameDialogVisible" width="400px">
      <el-form :model="renameForm" ref="renameForm" label-width="100px">
        <el-form-item label="新名称" prop="newName">
          <el-input v-model="renameForm.newName" placeholder="请输入新的存档名称"></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="renameDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRename">确定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'SaveManager',
  data() {
    return {
      loading: false,
      selectedServer: null,
      serverList: [
        {
          id: 1,
          name: '主世界服务器',
          status: 'online'
        },
        {
          id: 2,
          name: '洞穴服务器',
          status: 'online'
        },
        {
          id: 3,
          name: '模组服务器',
          status: 'restarting'
        },
        {
          id: 4,
          name: 'PVP服务器',
          status: 'offline'
        }
      ],
      // 存档列表
      savesList: [],
      selectedSaves: [],
      
      // 上传表单
      uploadDialogVisible: false,
      uploadForm: {
        name: '',
        fileList: [],
        activate: false
      },
      
      // 重命名表单
      renameDialogVisible: false,
      renameForm: {
        id: null,
        newName: ''
      },
      currentSaveForRename: null
    };
  },
  computed: {
    hasSelection() {
      return this.selectedSaves.length > 0;
    }
  },
  methods: {
    getStatusType(status) {
      const statusMap = {
        'online': 'success',
        'offline': 'info',
        'restarting': 'warning'
      };
      return statusMap[status] || 'info';
    },
    getStatusText(status) {
      const statusMap = {
        'online': '在线',
        'offline': '离线',
        'restarting': '重启中'
      };
      return statusMap[status] || status;
    },
    getSeasonType(season) {
      const seasonMap = {
        '春': 'success',
        '夏': 'warning',
        '秋': 'primary',
        '冬': 'info'
      };
      return seasonMap[season] || '';
    },
    refreshData() {
      if (this.selectedServer) {
        this.loadServerSaves(this.selectedServer);
      } else {
        this.$message({
          message: '请先选择一个服务器',
          type: 'warning'
        });
      }
    },
    loadServerSaves(serverId) {
      this.loading = true;
      
      // 模拟加载服务器存档数据
      setTimeout(() => {
        // 根据服务器ID生成不同的模拟数据
        this.savesList = this.generateMockSavesForServer(serverId);
        this.loading = false;
      }, 800);
    },
    generateMockSavesForServer(serverId) {
      // 根据服务器ID生成不同的模拟存档数据
      const baseSaves = [
        {
          id: 1,
          name: '自动备份_20230321',
          size: '15.4MB',
          days: 124,
          season: '夏',
          players: 3,
          createdAt: '2023-03-21 10:00:00',
          isCurrent: true
        },
        {
          id: 2,
          name: '手动备份_重要节点',
          size: '14.8MB',
          days: 120,
          season: '夏',
          players: 3,
          createdAt: '2023-03-20 15:30:45',
          isCurrent: false
        },
        {
          id: 3,
          name: '自动备份_20230319',
          size: '14.2MB',
          days: 115,
          season: '春',
          players: 2,
          createdAt: '2023-03-19 10:00:00',
          isCurrent: false
        },
        {
          id: 4,
          name: '更新前备份',
          size: '13.5MB',
          days: 110,
          season: '春',
          players: 4,
          createdAt: '2023-03-15 08:45:12',
          isCurrent: false
        },
        {
          id: 5,
          name: '自动备份_20230312',
          size: '12.7MB',
          days: 100,
          season: '冬',
          players: 3,
          createdAt: '2023-03-12 10:00:00',
          isCurrent: false
        }
      ];
      
      if (serverId === 1) { // 主世界服务器
        return [...baseSaves];
      } else if (serverId === 2) { // 洞穴服务器
        return baseSaves.map(save => ({
          ...save,
          name: save.name.replace('备份', '洞穴备份'),
          size: (parseFloat(save.size) * 0.8).toFixed(1) + 'MB',
          days: Math.floor(save.days * 0.9),
          season: save.season === '夏' ? '秋' : (save.season === '春' ? '夏' : (save.season === '冬' ? '春' : '冬'))
        }));
      } else if (serverId === 3) { // 模组服务器
        return baseSaves.map(save => ({
          ...save,
          name: save.name.replace('备份', '模组备份'),
          size: (parseFloat(save.size) * 1.3).toFixed(1) + 'MB',
          days: Math.floor(save.days * 0.7),
          players: save.players + 1
        }));
      } else { // PVP服务器
        return baseSaves.map(save => ({
          ...save,
          name: save.name.replace('备份', 'PVP备份'),
          days: Math.floor(save.days * 0.5),
          season: '冬',
          players: save.players + 2
        }));
      }
    },
    handleSelectionChange(val) {
      this.selectedSaves = val;
    },
    handleActivate(save) {
      this.$confirm(`确定要加载存档 "${save.name}" 吗? 当前存档将被替换。`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
        
        // 模拟激活存档
        setTimeout(() => {
          // 更新当前存档状态
          this.savesList.forEach(s => {
            s.isCurrent = s.id === save.id;
          });
          
          this.loading = false;
          this.$message({
            type: 'success',
            message: `存档 ${save.name} 已加载！服务器需要重启才能生效。`
          });
          
          // 询问是否重启服务器
          this.$confirm('是否立即重启服务器使存档加载生效?', '提示', {
            confirmButtonText: '立即重启',
            cancelButtonText: '稍后重启',
            type: 'info'
          }).then(() => {
            this.$message({
              type: 'info',
              message: '服务器重启中...'
            });
          }).catch(() => {
            this.$message({
              type: 'info',
              message: '请稍后手动重启服务器使存档生效'
            });
          });
        }, 1000);
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消加载'
        });
      });
    },
    handleRename(save) {
      this.currentSaveForRename = save;
      this.renameForm.id = save.id;
      this.renameForm.newName = save.name;
      this.renameDialogVisible = true;
    },
    submitRename() {
      if (!this.renameForm.newName) {
        this.$message.warning('请输入新的存档名称');
        return;
      }
      
      this.loading = true;
      
      // 模拟重命名操作
      setTimeout(() => {
        const index = this.savesList.findIndex(s => s.id === this.renameForm.id);
        if (index !== -1) {
          this.savesList[index].name = this.renameForm.newName;
        }
        
        this.renameDialogVisible = false;
        this.loading = false;
        
        this.$message({
          type: 'success',
          message: '存档已重命名'
        });
      }, 500);
    },
    handleDownload(save) {
      this.$message({
        type: 'success',
        message: `正在下载存档: ${save.name}`
      });
    },
    downloadSelected() {
      if (this.selectedSaves.length === 0) return;
      
      const saveNames = this.selectedSaves.map(s => s.name).join('、');
      this.$confirm(`确定要下载选中的 ${this.selectedSaves.length} 个存档吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        this.$message({
          type: 'success',
          message: `正在下载选中的 ${this.selectedSaves.length} 个存档`
        });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消下载'
        });
      });
    },
    handleDelete(save) {
      this.$confirm(`确定要删除存档 "${save.name}" 吗? 此操作不可恢复!`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
        
        // 模拟删除操作
        setTimeout(() => {
          this.savesList = this.savesList.filter(s => s.id !== save.id);
          this.loading = false;
          
          this.$message({
            type: 'success',
            message: `存档 ${save.name} 已删除！`
          });
        }, 600);
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消删除'
        });
      });
    },
    deleteSelected() {
      if (this.selectedSaves.length === 0) return;
      
      // 检查是否要删除当前使用的存档
      const hasCurrentSave = this.selectedSaves.some(s => s.isCurrent);
      if (hasCurrentSave) {
        this.$message.warning('不能删除当前正在使用的存档');
        return;
      }
      
      this.$confirm(`确定要删除选中的 ${this.selectedSaves.length} 个存档吗? 此操作不可恢复!`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
        
        // 模拟批量删除操作
        setTimeout(() => {
          const selectedIds = this.selectedSaves.map(s => s.id);
          this.savesList = this.savesList.filter(s => !selectedIds.includes(s.id));
          
          this.loading = false;
          this.$message({
            type: 'success',
            message: `已删除 ${selectedIds.length} 个存档！`
          });
        }, 800);
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消删除'
        });
      });
    },
    createBackup() {
      this.$confirm('确定要为当前存档创建一个新的备份吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        this.loading = true;
        
        // 模拟创建备份
        setTimeout(() => {
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          const seconds = String(now.getSeconds()).padStart(2, '0');
          const timeStr = `${year}${month}${day}_${hours}${minutes}${seconds}`;
          
          // 获取当前存档信息
          const currentSave = this.savesList.find(s => s.isCurrent);
          if (!currentSave) {
            this.$message.warning('没有找到当前存档');
            this.loading = false;
            return;
          }
          
          // 创建新的备份记录
          const newSave = {
            id: this.savesList.length + 1,
            name: `手动备份_${timeStr}`,
            size: currentSave.size,
            days: currentSave.days,
            season: currentSave.season,
            players: currentSave.players,
            createdAt: `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`,
            isCurrent: false
          };
          
          // 添加到列表
          this.savesList.unshift(newSave);
          
          this.loading = false;
          this.$message({
            type: 'success',
            message: '备份创建成功！'
          });
        }, 1200);
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消创建备份'
        });
      });
    },
    customUpload(options) {
      // 模拟上传过程
      this.uploadForm.fileList = [{
        name: options.file.name,
        size: options.file.size
      }];
    },
    handleExceed() {
      this.$message.warning('只能上传一个存档文件');
    },
    submitUpload() {
      if (!this.uploadForm.name) {
        this.$message.warning('请输入存档名称');
        return;
      }
      
      this.loading = true;
      
      // 模拟上传处理
      setTimeout(() => {
        const newSave = {
          id: this.savesList.length + 1,
          name: this.uploadForm.name,
          size: '16.5MB',
          days: 130,
          season: '春',
          players: 0,
          createdAt: this.formatDate(new Date()),
          isCurrent: this.uploadForm.activate
        };
        
        // 如果直接激活，需要更新其他存档的状态
        if (this.uploadForm.activate) {
          this.savesList.forEach(s => {
            s.isCurrent = false;
          });
        }
        
        // 添加到列表
        this.savesList.unshift(newSave);
        
        // 重置表单
        this.uploadForm = {
          name: '',
          fileList: [],
          activate: false
        };
        
        this.uploadDialogVisible = false;
        this.loading = false;
        
        this.$message({
          type: 'success',
          message: '存档上传成功！' + (this.uploadForm.activate ? '已设为当前存档，请重启服务器。' : '')
        });
      }, 1500);
    },
    formatDate(date) {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
  }
};
</script>

<style scoped>
.page-container {
  padding: 20px;
}

.main-card {
  margin-bottom: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.server-select-wrapper {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e8ece5;
}

.tool-bar {
  margin-bottom: 20px;
}

.empty-saves {
  text-align: center;
  padding: 50px 0;
  color: #758078;
}

.empty-saves i {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-saves p {
  font-size: 16px;
}

.save-name {
  display: flex;
  align-items: center;
}

.save-name i {
  color: #d97932;
  margin-right: 8px;
  font-size: 18px;
}

.save-name span {
  margin-right: 10px;
}

.save-name .el-tag {
  margin-left: auto;
}

.status-tag {
  padding: 2px 6px;
  border-radius: 3px;
}

.el-button + .el-button {
  margin-left: 5px;
}

.upload-demo {
  width: 100%;
}

.el-upload-dragger {
  width: 100%;
}

.el-upload__tip {
  color: #758078;
  font-size: 12px;
  margin-top: 5px;
}

/* 表格行效果 */
:deep(.el-table .el-table__row:hover) {
  background-color: #f1f4ed;
}

:deep(.el-table .current-row) {
  background-color: #f0f9eb;
}

/* 上传样式 */
:deep(.el-upload-dragger) {
  border: 2px dashed #d97932;
}

:deep(.el-upload-dragger:hover) {
  border-color: #e59252;
}

:deep(.el-upload-dragger .el-icon-upload) {
  font-size: 48px;
  color: #d97932;
  margin-bottom: 10px;
}

:deep(.el-upload__text) {
  font-size: 14px;
  color: #536159;
}

:deep(.el-upload__text em) {
  color: #d97932;
  font-style: normal;
}
</style>
