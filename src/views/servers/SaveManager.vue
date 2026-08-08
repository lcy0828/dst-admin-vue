<template>
  <div class="page-container">
    <el-card class="main-card">
      <template v-slot:header>
<div  class="clearfix">
        <span>存档管理</span>
        <el-button style="float: right; padding: 3px 0" type="text" @click="refreshData">刷新</el-button>
      </div>
</template>

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
          <component :is="'el-icon-folder'" class="legacy-icon" />
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
              <template v-slot="scope">
                <div class="save-name">
                  <component :is="'el-icon-document'" class="legacy-icon" />
                  <span>{{ scope.row.name }}</span>
                  <el-tag size="mini" type="success" v-if="scope.row.isCurrent">当前存档</el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="size" label="大小" width="100"></el-table-column>
            <el-table-column prop="days" label="游戏天数" width="100" align="center"></el-table-column>
            <el-table-column prop="season" label="季节" width="100" align="center">
              <template v-slot="scope">
                <el-tag size="medium" :type="getSeasonType(scope.row.season)">{{ scope.row.season }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="players" label="玩家数" width="100" align="center"></el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="180" align="center"></el-table-column>
            <el-table-column label="操作" width="280" align="center">
              <template v-slot="scope">
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
            <component :is="'el-icon-upload'" class="legacy-icon" />
            <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
            <template v-slot:tip>
<div class="el-upload__tip" >只能上传zip文件，且不超过100MB</div>
</template>
          </el-upload>
        </el-form-item>
        <el-form-item label="直接激活">
          <el-switch v-model="uploadForm.activate"></el-switch>
        </el-form-item>
      </el-form>
      <template v-slot:footer>
<span  class="dialog-footer">
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitUpload" :disabled="!uploadForm.fileList.length">确定</el-button>
      </span>
</template>
    </el-dialog>

    <!-- 重命名对话框 -->
    <el-dialog title="重命名存档" v-model="renameDialogVisible" width="400px">
      <el-form :model="renameForm" ref="renameForm" label-width="100px">
        <el-form-item label="新名称" prop="newName">
          <el-input v-model="renameForm.newName" placeholder="请输入新的存档名称"></el-input>
        </el-form-item>
      </el-form>
      <template v-slot:footer>
<span  class="dialog-footer">
        <el-button @click="renameDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRename">确定</el-button>
      </span>
</template>
    </el-dialog>
  </div>
</template>

<script>
import { backupsV2API, jobsV2API, roomsV2API } from '@/api/v2';

const TERMINAL_JOB_STATES = new Set(['succeeded', 'failed', 'canceled']);

export default {
  name: 'SaveManager',
  data() {
    return {
      loading: false,
      selectedServer: null,
      serverList: [],
      savesList: [],
      selectedSaves: [],
      uploadDialogVisible: false,
      uploadForm: { name: '', fileList: [], activate: false },
      uploadFile: null,
      renameDialogVisible: false,
      renameForm: { id: null, newName: '' },
      currentSaveForRename: null
    };
  },
  computed: {
    hasSelection() {
      return this.selectedSaves.length > 0;
    },
    selectedRoom() {
      return this.serverList.find(room => room.id === this.selectedServer) || null;
    }
  },
  mounted() {
    this.loadRooms();
  },
  methods: {
    async loadRooms() {
      this.loading = true;
      try {
        const response = await roomsV2API.list();
        const rooms = (response.items || []).filter(room => room.managed);
        this.serverList = await Promise.all(rooms.map(async room => {
          const worlds = (await roomsV2API.worlds(room.id)).items || [];
          return {
            ...room,
            status: worlds.some(world => world.status === 'running') ? 'online' :
              worlds.every(world => world.status === 'stopped') ? 'offline' : 'unknown'
          };
        }));
        if (this.selectedServer && !this.selectedRoom) {
          this.selectedServer = null;
          this.savesList = [];
        }
      } catch (error) {
        this.serverList = [];
        this.$message.error(error.message || '读取房间列表失败');
      } finally {
        this.loading = false;
      }
    },
    getStatusType(status) {
      return { online: 'success', offline: 'info', restarting: 'warning' }[status] || 'warning';
    },
    getStatusText(status) {
      return { online: '在线', offline: '离线', restarting: '重启中', unknown: '未知' }[status] || status;
    },
    getSeasonType(season) {
      return { '春': 'success', '夏': 'warning', '秋': 'primary', '冬': 'info' }[season] || 'info';
    },
    refreshData() {
      if (!this.selectedServer) {
        this.$message.warning('请先选择一个服务器');
        return;
      }
      this.loadServerSaves(this.selectedServer);
    },
    async loadServerSaves(serverId) {
      this.loading = true;
      try {
        const response = await backupsV2API.list(serverId);
        this.savesList = (response.items || []).map(backup => ({
          id: backup.id,
          name: backup.name,
          size: this.formatBytes(backup.size),
          days: '--',
          season: '--',
          players: '--',
          createdAt: this.formatDate(backup.createdAt),
          isCurrent: false,
          raw: backup
        }));
        this.selectedSaves = [];
      } catch (error) {
        this.savesList = [];
        this.$message.error(error.message || '读取备份列表失败');
      } finally {
        this.loading = false;
      }
    },
    handleSelectionChange(value) {
      this.selectedSaves = value;
    },
    async waitForJob(job) {
      let current = job;
      for (let attempt = 0; attempt < 120; attempt += 1) {
        current = await jobsV2API.get(current.id);
        if (TERMINAL_JOB_STATES.has(current.status)) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (!TERMINAL_JOB_STATES.has(current.status)) throw new Error('任务仍在执行，请稍后刷新');
      if (current.status !== 'succeeded') {
        const failed = (current.targets || []).find(target => target.status === 'failed');
        throw new Error(failed?.error?.message || current.error?.message || '备份任务失败');
      }
      return current;
    },
    async handleActivate(save) {
      try {
        await this.$confirm(`确定要加载存档 "${save.name}" 吗? 当前存档将被替换。`, '提示', {
          confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
        });
        this.loading = true;
        const job = await backupsV2API.restore(save.id, this.selectedRoom.name);
        await this.waitForJob(job);
        this.$message.success(`存档 ${save.name} 已恢复`);
        await this.loadServerSaves(this.selectedServer);
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') this.$message.error(error.message || '恢复备份失败');
      } finally {
        this.loading = false;
      }
    },
    handleRename(save) {
      this.currentSaveForRename = save;
      this.renameForm = { id: save.id, newName: save.name };
      this.renameDialogVisible = true;
    },
    async submitRename() {
      const name = this.renameForm.newName.trim();
      if (!name) {
        this.$message.warning('请输入新的存档名称');
        return;
      }
      this.loading = true;
      try {
        await backupsV2API.rename(this.renameForm.id, name);
        this.renameDialogVisible = false;
        await this.loadServerSaves(this.selectedServer);
        this.$message.success('存档已重命名');
      } catch (error) {
        this.$message.error(error.message || '重命名失败');
      } finally {
        this.loading = false;
      }
    },
    handleDownload(save) {
      const link = document.createElement('a');
      link.href = backupsV2API.downloadURL(save.id);
      link.download = `${save.name}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    },
    async downloadSelected() {
      if (!this.selectedSaves.length) return;
      try {
        await this.$confirm(`确定要下载选中的 ${this.selectedSaves.length} 个存档吗?`, '提示', {
          confirmButtonText: '确定', cancelButtonText: '取消', type: 'info'
        });
        this.selectedSaves.forEach(save => this.handleDownload(save));
      } catch {
        // 用户取消下载。
      }
    },
    async handleDelete(save) {
      try {
        await this.$confirm(`确定要删除存档 "${save.name}" 吗? 此操作不可恢复!`, '提示', {
          confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
        });
        this.loading = true;
        await backupsV2API.delete(save.id, save.name);
        await this.loadServerSaves(this.selectedServer);
        this.$message.success(`存档 ${save.name} 已删除`);
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') this.$message.error(error.message || '删除备份失败');
      } finally {
        this.loading = false;
      }
    },
    async deleteSelected() {
      if (!this.selectedSaves.length) return;
      try {
        await this.$confirm(`确定要删除选中的 ${this.selectedSaves.length} 个存档吗? 此操作不可恢复!`, '提示', {
          confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
        });
        this.loading = true;
        await Promise.all(this.selectedSaves.map(save => backupsV2API.delete(save.id, save.name)));
        await this.loadServerSaves(this.selectedServer);
        this.$message.success('所选存档已删除');
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') this.$message.error(error.message || '批量删除失败');
      } finally {
        this.loading = false;
      }
    },
    async createBackup() {
      try {
        await this.$confirm('确定要为当前房间创建一个新的备份吗?', '提示', {
          confirmButtonText: '确定', cancelButtonText: '取消', type: 'info'
        });
        this.loading = true;
        const job = await backupsV2API.create(this.selectedServer);
        await this.waitForJob(job);
        await this.loadServerSaves(this.selectedServer);
        this.$message.success('备份创建成功');
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') this.$message.error(error.message || '创建备份失败');
      } finally {
        this.loading = false;
      }
    },
    customUpload(options) {
      this.uploadFile = options.file;
      this.uploadForm.fileList = [{ name: options.file.name, size: options.file.size }];
    },
    handleExceed() {
      this.$message.warning('只能上传一个存档文件');
    },
    async submitUpload() {
      const name = this.uploadForm.name.trim();
      if (!name || !this.uploadFile) {
        this.$message.warning(!name ? '请输入存档名称' : '请选择存档文件');
        return;
      }
      const activate = this.uploadForm.activate;
      this.loading = true;
      try {
        const uploaded = await backupsV2API.upload(this.selectedServer, this.uploadFile, name);
        if (activate) {
          const job = await backupsV2API.restore(uploaded.id, this.selectedRoom.name);
          await this.waitForJob(job);
        }
        this.uploadForm = { name: '', fileList: [], activate: false };
        this.uploadFile = null;
        this.uploadDialogVisible = false;
        await this.loadServerSaves(this.selectedServer);
        this.$message.success(activate ? '存档上传并恢复成功' : '存档上传成功');
      } catch (error) {
        this.$message.error(error.message || '上传存档失败');
      } finally {
        this.loading = false;
      }
    },
    formatBytes(bytes) {
      if (!Number.isFinite(Number(bytes))) return '--';
      const units = ['B', 'KB', 'MB', 'GB'];
      let value = Number(bytes);
      let unit = 0;
      while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
      }
      return `${value.toFixed(unit === 0 ? 0 : 1)}${units[unit]}`;
    },
    formatDate(value) {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? '--' : date.toLocaleString('zh-CN', { hour12: false });
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
