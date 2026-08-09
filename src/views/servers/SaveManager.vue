<template>
  <div class="page-container">
    <header class="page-header">
      <div>
        <h1>存档管理</h1>
        <p>创建、恢复、下载和上传房间备份。</p>
      </div>
      <UiButton size="sm" variant="outline" :disabled="loading || !selectedServer" @click="refreshData">
        <Spinner v-if="loading" data-icon="inline-start" />
        <RefreshCw v-else data-icon="inline-start" />
        刷新
      </UiButton>
    </header>

    <Card class="main-card">
      <CardHeader class="card-header">
        <div>
          <CardTitle>房间备份</CardTitle>
          <CardDescription>先选择房间，再管理后端返回的真实备份文件。</CardDescription>
        </div>
      </CardHeader>
      <CardContent class="content-stack">
        <Field class="server-select-wrapper">
          <FieldLabel>服务器</FieldLabel>
          <UiSelect v-model="selectedServer" @update:model-value="loadServerSaves">
            <SelectTrigger class="server-select"><SelectValue placeholder="请选择服务器" /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem v-for="server in serverList" :key="server.id" :value="server.id">
                {{ server.name }} · {{ getStatusText(server.status) }}
              </SelectItem>
            </SelectGroup></SelectContent>
          </UiSelect>
        </Field>

        <Alert v-if="loadError" variant="destructive">
          <CircleAlert />
          <AlertTitle>存档数据读取失败</AlertTitle>
          <AlertDescription>{{ loadError }}</AlertDescription>
          <AlertAction><UiButton size="sm" variant="outline" @click="retryLoad">重新加载</UiButton></AlertAction>
        </Alert>

        <div v-if="loading" class="save-skeleton" aria-busy="true" aria-label="正在更新存档数据">
          <Skeleton v-for="row in 5" :key="row" class="h-12 w-full" />
        </div>
        <Empty v-else-if="!selectedServer && !loadError">
          <EmptyHeader>
            <EmptyMedia variant="icon"><FolderOpen /></EmptyMedia>
            <EmptyTitle>请选择一个服务器</EmptyTitle>
            <EmptyDescription>选择服务器后即可管理对应房间的存档。</EmptyDescription>
          </EmptyHeader>
        </Empty>
        <template v-else-if="!loadError">
          <div class="tool-bar">
            <UiButton @click="uploadDialogVisible = true"><Upload data-icon="inline-start" />上传存档</UiButton>
            <UiButton variant="outline" @click="createBackup"><ArchiveRestore data-icon="inline-start" />创建备份</UiButton>
            <UiButton variant="outline" :disabled="!hasSelection" @click="downloadSelected"><Download data-icon="inline-start" />下载所选</UiButton>
            <UiButton variant="destructive" :disabled="!hasSelection" @click="deleteSelected"><Trash2 data-icon="inline-start" />删除所选</UiButton>
          </div>
          <div v-if="savesList.length" class="table-wrap">
          <ShadcnTable>
            <TableHeader><TableRow>
              <TableHead class="selection-cell"><span class="sr-only">选择</span></TableHead>
              <TableHead>存档名称</TableHead><TableHead>大小</TableHead><TableHead>创建时间</TableHead><TableHead>操作</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              <TableRow v-for="save in savesList" :key="save.id">
                <TableCell class="selection-cell">
                  <UiCheckbox :model-value="isSaveSelected(save)" :aria-label="`选择 ${save.name}`" @update:model-value="toggleSaveSelection(save, $event)" />
                </TableCell>
                <TableCell><div class="save-name"><FileArchive /><span>{{ save.name }}</span><Badge v-if="save.isCurrent">当前存档</Badge></div></TableCell>
                <TableCell>{{ save.size }}</TableCell><TableCell>{{ save.createdAt }}</TableCell>
                <TableCell><div class="table-actions">
                  <UiButton size="xs" variant="ghost" :disabled="save.isCurrent" @click="handleActivate(save)">加载</UiButton>
                  <UiButton size="xs" variant="ghost" @click="handleRename(save)">重命名</UiButton>
                  <UiButton size="xs" variant="ghost" @click="handleDownload(save)">下载</UiButton>
                  <UiButton size="xs" variant="destructive" :disabled="save.isCurrent" @click="handleDelete(save)">删除</UiButton>
                </div></TableCell>
              </TableRow>
            </TableBody>
          </ShadcnTable>
          </div>
          <Empty v-if="savesList.length === 0">
            <EmptyHeader>
              <EmptyMedia variant="icon"><FolderOpen /></EmptyMedia>
              <EmptyTitle>当前房间还没有备份</EmptyTitle>
              <EmptyDescription>创建首个备份，或上传已有的 ZIP 存档。</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </template>
      </CardContent>
    </Card>

    <UiDialog v-model:open="uploadDialogVisible">
      <DialogContent>
        <DialogHeader><DialogTitle>上传存档</DialogTitle><DialogDescription>上传不超过 100MB 的 ZIP 存档文件。</DialogDescription></DialogHeader>
        <FieldGroup>
          <Field><FieldLabel for="save-name">存档名称</FieldLabel><UiInput id="save-name" v-model="uploadForm.name" placeholder="请输入存档名称" /></Field>
          <Field>
            <FieldLabel for="save-file">存档文件</FieldLabel>
            <label class="file-drop" for="save-file">
              <Upload /><span>{{ uploadFile ? uploadFile.name : '选择 ZIP 存档文件' }}</span>
              <input id="save-file" class="sr-only" type="file" accept=".zip,application/zip" @change="handleFileChange">
            </label>
            <FieldDescription>只能上传一个 ZIP 文件，且不超过 100MB。</FieldDescription>
          </Field>
          <Field orientation="horizontal"><UiSwitch id="activate-upload" v-model="uploadForm.activate" /><FieldLabel for="activate-upload">上传后直接激活</FieldLabel></Field>
        </FieldGroup>
        <DialogFooter>
          <UiButton variant="outline" @click="uploadDialogVisible = false">取消</UiButton>
          <UiButton :disabled="!uploadFile || loading" @click="submitUpload"><Spinner v-if="loading" data-icon="inline-start" />确定</UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="renameDialogVisible">
      <DialogContent>
        <DialogHeader><DialogTitle>重命名存档</DialogTitle><DialogDescription>输入便于识别的新存档名称。</DialogDescription></DialogHeader>
        <Field><FieldLabel for="new-save-name">新名称</FieldLabel><UiInput id="new-save-name" v-model="renameForm.newName" placeholder="请输入新的存档名称" /></Field>
        <DialogFooter>
          <UiButton variant="outline" @click="renameDialogVisible = false">取消</UiButton>
          <UiButton :disabled="loading" @click="submitRename"><Spinner v-if="loading" data-icon="inline-start" />确定</UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>
  </div>
</template>

<script>
import { ArchiveRestore, CircleAlert, Download, FileArchive, FolderOpen, RefreshCw, Trash2, Upload } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { backupsV2API, jobsV2API, roomsV2API } from '@/api/v2';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox as UiCheckbox } from '@/components/ui/checkbox';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch as UiSwitch } from '@/components/ui/switch';
import { Table as ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { confirmAction } from '@/lib/feedback';

const TERMINAL_JOB_STATES = new Set(['succeeded', 'failed', 'canceled']);

export default {
  name: 'SaveManager',
  components: {
    Alert, AlertAction, AlertDescription, AlertTitle, ArchiveRestore, Badge, Card, CardContent,
    CardDescription, CardHeader, CardTitle, CircleAlert, DialogContent,
    DialogDescription, DialogFooter, DialogHeader, DialogTitle, Download, Empty, EmptyDescription,
    EmptyHeader, EmptyMedia, EmptyTitle, Field, FieldDescription, FieldGroup,
    FieldLabel, FileArchive, FolderOpen, RefreshCw, SelectContent, SelectGroup, SelectItem, SelectTrigger,
    SelectValue, ShadcnTable, Skeleton, Spinner, TableBody, TableCell, TableHead, TableHeader, TableRow, Trash2,
    UiButton, UiCheckbox, UiDialog, UiInput, UiSelect, UiSwitch, Upload
  },
  data() {
    return {
      loading: false,
      selectedServer: null,
      loadError: '',
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
      this.loadError = '';
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
        this.loadError = error.message || '读取房间列表失败';
        toast.error(error.message || '读取房间列表失败');
      } finally {
        this.loading = false;
      }
    },
    getStatusText(status) {
      return { online: '在线', offline: '离线', restarting: '重启中', unknown: '未知' }[status] || status;
    },
    refreshData() {
      if (!this.selectedServer) {
        toast.warning('请先选择一个服务器');
        return;
      }
      this.loadServerSaves(this.selectedServer);
    },
    async loadServerSaves(serverId) {
      this.loading = true;
      this.loadError = '';
      try {
        const response = await backupsV2API.list(serverId);
        this.savesList = (response.items || []).map(backup => ({
          id: backup.id,
          name: backup.name,
          size: this.formatBytes(backup.size),
          createdAt: this.formatDate(backup.createdAt),
          isCurrent: false,
          raw: backup
        }));
        this.selectedSaves = [];
      } catch (error) {
        this.savesList = [];
        this.loadError = error.message || '读取备份列表失败';
        toast.error(error.message || '读取备份列表失败');
      } finally {
        this.loading = false;
      }
    },
    retryLoad() {
      return this.selectedServer ? this.loadServerSaves(this.selectedServer) : this.loadRooms();
    },
    isSaveSelected(save) {
      return this.selectedSaves.some(item => item.id === save.id);
    },
    toggleSaveSelection(save, checked) {
      if (checked) {
        if (!this.isSaveSelected(save)) this.selectedSaves.push(save);
      } else {
        this.selectedSaves = this.selectedSaves.filter(item => item.id !== save.id);
      }
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
        await confirmAction(`确定要加载存档 "${save.name}" 吗? 当前存档将被替换。`, '恢复存档', {
          confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
        });
        this.loading = true;
        const job = await backupsV2API.restore(save.id, this.selectedRoom.name);
        await this.waitForJob(job);
        toast.success(`存档 ${save.name} 已恢复`);
        await this.loadServerSaves(this.selectedServer);
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') toast.error(error.message || '恢复备份失败');
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
        toast.warning('请输入新的存档名称');
        return;
      }
      this.loading = true;
      try {
        await backupsV2API.rename(this.renameForm.id, name);
        this.renameDialogVisible = false;
        await this.loadServerSaves(this.selectedServer);
        toast.success('存档已重命名');
      } catch (error) {
        toast.error(error.message || '重命名失败');
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
        await confirmAction(`确定要下载选中的 ${this.selectedSaves.length} 个存档吗?`, '下载存档', {
          confirmButtonText: '确定', cancelButtonText: '取消', type: 'info'
        });
        this.selectedSaves.forEach(save => this.handleDownload(save));
      } catch {
        // 用户取消下载。
      }
    },
    async handleDelete(save) {
      try {
        await confirmAction(`确定要删除存档 "${save.name}" 吗? 此操作不可恢复!`, '删除存档', {
          confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
        });
        this.loading = true;
        await backupsV2API.delete(save.id, save.name);
        await this.loadServerSaves(this.selectedServer);
        toast.success(`存档 ${save.name} 已删除`);
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') toast.error(error.message || '删除备份失败');
      } finally {
        this.loading = false;
      }
    },
    async deleteSelected() {
      if (!this.selectedSaves.length) return;
      try {
        await confirmAction(`确定要删除选中的 ${this.selectedSaves.length} 个存档吗? 此操作不可恢复!`, '批量删除存档', {
          confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
        });
        this.loading = true;
        await Promise.all(this.selectedSaves.map(save => backupsV2API.delete(save.id, save.name)));
        await this.loadServerSaves(this.selectedServer);
        toast.success('所选存档已删除');
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') toast.error(error.message || '批量删除失败');
      } finally {
        this.loading = false;
      }
    },
    async createBackup() {
      try {
        await confirmAction('确定要为当前房间创建一个新的备份吗?', '创建备份', {
          confirmButtonText: '确定', cancelButtonText: '取消', type: 'info'
        });
        this.loading = true;
        const job = await backupsV2API.create(this.selectedServer);
        await this.waitForJob(job);
        await this.loadServerSaves(this.selectedServer);
        toast.success('备份创建成功');
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') toast.error(error.message || '创建备份失败');
      } finally {
        this.loading = false;
      }
    },
    handleFileChange(event) {
      const file = event.target.files?.[0] || null;
      if (file && file.size > 100 * 1024 * 1024) {
        toast.warning('存档文件不能超过 100MB');
        event.target.value = '';
        return;
      }
      this.uploadFile = file;
      this.uploadForm.fileList = file ? [{ name: file.name, size: file.size }] : [];
    },
    async submitUpload() {
      const name = this.uploadForm.name.trim();
      if (!name || !this.uploadFile) {
        toast.warning(!name ? '请输入存档名称' : '请选择存档文件');
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
        toast.success(activate ? '存档上传并恢复成功' : '存档上传成功');
      } catch (error) {
        toast.error(error.message || '上传存档失败');
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
  width: 100%;
  min-width: 0;
}

.page-header,
.card-header,
.tool-bar,
.save-name,
.table-actions,
.file-drop {
  display: flex;
  align-items: center;
}

.page-header {
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 650;
}

.page-header p {
  margin: 4px 0 0;
  color: var(--muted-foreground);
}

.card-header {
  justify-content: space-between;
  align-items: flex-start;
  flex-direction: row;
  gap: 12px;
}

.content-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.server-select-wrapper {
  max-width: 360px;
}

.server-select {
  width: 100%;
}

.tool-bar,
.table-actions,
.save-name,
.file-drop {
  gap: 8px;
}

.tool-bar,
.table-actions {
  flex-wrap: wrap;
}

.save-name > svg {
  width: 16px;
  height: 16px;
  color: var(--muted-foreground);
}

.selection-cell {
  width: 42px;
}

.save-skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
}

.file-drop {
  justify-content: center;
  min-height: 120px;
  width: 100%;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  background: var(--muted);
  color: var(--muted-foreground);
  cursor: pointer;
}

@media (max-width: 640px) {
  .page-header,
  .card-header {
    align-items: stretch;
    flex-direction: column;
  }

  .server-select-wrapper {
    max-width: none;
  }

  .tool-bar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .tool-bar > * {
    width: 100%;
  }
}
</style>
