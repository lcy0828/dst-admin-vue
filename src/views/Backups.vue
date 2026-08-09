<template>
  <div class="backups-page">
    <header class="page-header">
      <div>
        <h1>备份管理</h1>
        <p>创建、下载、恢复和删除房间存档备份。</p>
      </div>
      <div class="header-actions">
        <UiButton @click="showCreateBackupDialog"><PlusIcon data-icon="inline-start" />创建备份</UiButton>
        <UiButton variant="outline" :disabled="loading" @click="refreshBackups"><Spinner v-if="loading" data-icon="inline-start" /><RefreshCwIcon v-else data-icon="inline-start" />刷新</UiButton>
      </div>
    </header>
    <Alert v-if="loadError" variant="destructive" class="load-error-alert">
      <TriangleAlertIcon />
      <AlertTitle>备份列表加载失败</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
      <AlertAction><UiButton variant="outline" size="sm" @click="refreshBackups">
        <RefreshCwIcon data-icon="inline-start" />重新加载
      </UiButton></AlertAction>
    </Alert>
    <Card v-if="!loadError || backupsList.length" class="backups-card">
      <CardHeader><CardTitle>备份列表</CardTitle><CardDescription>下载、恢复或删除现有世界存档备份。</CardDescription>
        <CardAction><UiSelect v-model="selectedFilter"><SelectTrigger class="archive-filter"><SelectValue placeholder="选择存档" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="__all__">全部</SelectItem><SelectItem v-for="archive in archiveOptions" :key="archive" :value="archive">{{ archive }}</SelectItem></SelectGroup></SelectContent></UiSelect></CardAction>
      </CardHeader>
      <CardContent><div class="table-wrap"><ShadcnTable><TableHeader><TableRow><TableHead>备份名称</TableHead><TableHead>存档名称</TableHead><TableHead>大小</TableHead><TableHead>创建时间</TableHead><TableHead class="actions-column">操作</TableHead></TableRow></TableHeader><TableBody>
        <TableRow v-for="backup in filteredBackups" :key="`${backup.archive_name}-${backup.name}`"><TableCell><div class="backup-name"><FileArchiveIcon />{{ backup.name }}</div></TableCell><TableCell>{{ backup.archive_name }}</TableCell><TableCell>{{ backup.size_formatted }}</TableCell><TableCell>{{ backup.create_time }}</TableCell><TableCell><div class="row-actions"><UiButton variant="outline" size="sm" @click="downloadBackup(backup)"><DownloadIcon data-icon="inline-start" />下载</UiButton><UiButton size="sm" @click="showRestoreDialog(backup)">恢复</UiButton><UiButton variant="destructive" size="sm" @click="confirmDeleteBackup(backup)">删除</UiButton></div></TableCell></TableRow>
        <TableEmpty v-if="loading" :colspan="5"><div class="table-skeleton" aria-label="正在加载备份"><Skeleton v-for="row in 4" :key="row" class="h-10 w-full" /></div></TableEmpty>
        <TableEmpty v-else-if="!loadError && filteredBackups.length === 0" :colspan="5"><Empty><EmptyHeader><EmptyTitle>暂无备份</EmptyTitle><EmptyDescription>当前存档还没有可用备份。</EmptyDescription></EmptyHeader></Empty></TableEmpty>
      </TableBody></ShadcnTable></div></CardContent>
    </Card>

    <UiDialog v-model:open="createDialogVisible"><DialogContent><DialogHeader><DialogTitle>创建存档备份</DialogTitle><DialogDescription>选择需要立即备份的房间存档。</DialogDescription></DialogHeader><FieldGroup><Field><FieldLabel>存档</FieldLabel><UiSelect v-model="selectedArchive"><SelectTrigger><SelectValue placeholder="请选择存档" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="archive in archivesList" :key="archive" :value="archive">{{ archive }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field></FieldGroup><DialogFooter><UiButton variant="outline" @click="createDialogVisible = false">取消</UiButton><UiButton :disabled="createLoading" @click="createBackup"><Spinner v-if="createLoading" data-icon="inline-start" />创建</UiButton></DialogFooter></DialogContent></UiDialog>

    <UiDialog v-model:open="restoreDialogVisible"><DialogScrollContent class="sm:max-w-xl"><DialogHeader><DialogTitle>恢复存档备份</DialogTitle><DialogDescription>将备份内容覆盖到原房间存档。</DialogDescription></DialogHeader>
      <div class="restore-dialog-content">
        <div class="info-row">
          <span class="label">备份文件：</span>
          <span class="value">{{ currentBackup ? currentBackup.name : '' }}</span>
        </div>
        <div class="info-row">
          <span class="label">源存档：</span>
          <span class="value">{{ currentBackup ? currentBackup.archive_name : '' }}</span>
        </div>
        <Separator />
        <Alert variant="destructive"><TriangleAlertIcon /><AlertTitle>将覆盖原存档</AlertTitle><AlertDescription>此操作无法撤销，请确保已备份重要数据。<span v-if="!backupCapabilities.restoreToNewRoom">当前后端暂不支持恢复为新房间，因此这里只提供原房间恢复。</span></AlertDescription></Alert>
      </div>
      <DialogFooter><UiButton variant="outline" @click="restoreDialogVisible = false">取消</UiButton><UiButton :disabled="restoreLoading" @click="restoreBackup"><Spinner v-if="restoreLoading" data-icon="inline-start" />恢复</UiButton></DialogFooter></DialogScrollContent></UiDialog>
  </div>
</template>

<script>
import { DownloadIcon, FileArchiveIcon, PlusIcon, RefreshCwIcon, TriangleAlertIcon } from '@lucide/vue'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { Table as ShadcnTable, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { confirmAction } from '@/lib/feedback'
import { BACKEND_CAPABILITIES, buildBackupCatalog, roomNamesFromResponse } from '@/lib/legacySupport.mjs'
import { toast } from 'vue-sonner'

export default {
  name: 'BackupsView',
  components: {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogScrollContent,
    DialogTitle,
    DownloadIcon,
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
    Field,
    FieldGroup,
    FieldLabel,
    FileArchiveIcon,
    PlusIcon,
    RefreshCwIcon,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Separator,
    ShadcnTable,
    Skeleton,
    Spinner,
    TableBody,
    TableCell,
    TableEmpty,
    TableHead,
    TableHeader,
    TableRow,
    TriangleAlertIcon,
    UiButton,
    UiDialog,
    UiSelect
  },
  data() {
    return {
      loading: false,
      loadError: '',
      createLoading: false,
      restoreLoading: false,
      createDialogVisible: false,
      restoreDialogVisible: false,
      selectedArchive: '',
      selectedFilter: '',
      backupsList: [],
      archivesList: [],
      currentBackup: null,
      backupCapabilities: BACKEND_CAPABILITIES.backups
    }
  },
  computed: {
    archiveOptions() {
      // 从备份列表中提取所有唯一的存档名称
      const archives = this.backupsList.map(backup => backup.archive_name);
      return [...new Set(archives)];
    },
    filteredBackups() {
      if (!this.selectedFilter || this.selectedFilter === '__all__') {
        return this.backupsList;
      }
      return this.backupsList.filter(backup => backup.archive_name === this.selectedFilter);
    }
  },
  methods: {
    refreshBackups() {
      this.loading = true;
      this.loadError = '';
      return this.$api.backupApi.getBackupList()
        .then(res => {
          if (res.status === 200) {
            const catalog = buildBackupCatalog(res);
            this.archivesList = catalog.archives;
            this.backupsList = catalog.backups;
            if (this.selectedFilter !== '__all__' && !catalog.archives.includes(this.selectedFilter)) {
              this.selectedFilter = '__all__';
            }
          } else {
            this.loadError = res.msg || '服务未返回可用的备份列表';
            toast.error('获取备份列表失败：' + this.loadError);
          }
        })
        .catch(err => {
          this.loadError = err.message || '无法连接备份服务';
          toast.error('获取备份列表失败：' + this.loadError);
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
          this.archivesList = roomNamesFromResponse(res);
          if (!this.archivesList.includes(this.selectedArchive)) this.selectedArchive = '';
          
          if (this.archivesList.length === 0) {
            toast.warning('没有可用的存档');
          }
        })
        .catch(err => {
          this.archivesList = [];
          this.selectedArchive = '';
          toast.error('获取存档列表失败：' + (err.message || '未知错误'));
        });
    },
    createBackup() {
      if (!this.selectedArchive) {
        toast.warning('请选择要备份的存档');
        return;
      }
      
      this.createLoading = true;
      this.$api.backupApi.createBackup(this.selectedArchive)
        .then(res => {
          if (res.status === 200) {
            toast.success(res.msg || '创建备份成功');
            this.createDialogVisible = false;
            return this.refreshBackups();
          } else {
            toast.error('创建备份失败：' + res.msg);
          }
        })
        .catch(err => {
          toast.error('创建备份失败：' + err.message);
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
          toast.success(`正在下载备份：${name}`);
        })
        .catch(error => toast.error(`下载备份失败：${error.message}`));
    },
    
    // 显示恢复备份对话框
    showRestoreDialog(backup) {
      this.currentBackup = backup;
      this.restoreDialogVisible = true;
    },
    
    // 恢复备份
    async restoreBackup() {
      if (!this.currentBackup) {
        toast.warning('未选择备份文件');
        return;
      }
      
      try {
        await confirmAction('您确定要恢复此备份到原存档吗？此操作将覆盖原存档所有内容且无法撤销！', '恢复备份', {
          confirmButtonText: '确认恢复',
          cancelButtonText: '取消',
          type: 'warning'
        })
        await this.executeRestore(this.currentBackup.archive_name, this.currentBackup.name);
      } catch {
        toast.info('已取消恢复操作')
      }
    },
    
    // 执行恢复操作
    executeRestore(archive, backup) {
      this.restoreLoading = true;
      return this.$api.backupApi.restoreBackup(archive, backup)
        .then(res => {
          if (res.status === 200) {
            toast.success(res.msg || '备份恢复成功');
            this.restoreDialogVisible = false;
            return this.refreshBackups();
          } else {
            toast.error('恢复备份失败：' + res.msg);
          }
        })
        .catch(err => {
          toast.error('恢复备份失败：' + err.message);
        })
        .finally(() => {
          this.restoreLoading = false;
        });
    },
    
    // 确认删除备份
    async confirmDeleteBackup(backup) {
      const { archive_name, name } = backup;
      try {
        await confirmAction(`确定要删除备份文件“${name}”吗？此操作不可逆！`, '删除备份', {
          confirmButtonText: '确认删除',
          cancelButtonText: '取消',
          type: 'warning'
        })
        this.deleteBackup(archive_name, name);
      } catch {
        toast.info('已取消删除')
      }
    },
    
    // 删除备份
    deleteBackup(archive, backup) {
      this.loading = true;
      this.$api.backupApi.deleteBackup(archive, backup)
        .then(res => {
          if (res.status === 200) {
            toast.success(res.msg || '备份删除成功');
            return this.refreshBackups();
          } else {
            toast.error('删除备份失败：' + res.msg);
          }
        })
        .catch(err => {
          toast.error('删除备份失败：' + err.message);
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
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  min-width: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.page-header p {
  margin: 4px 0 0;
  color: var(--muted-foreground);
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.backup-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.archive-filter {
  width: 180px;
}

.actions-column {
  width: 270px;
  text-align: right;
}

.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
}

.table-skeleton {
  display: flex;
  min-width: 520px;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}

.restore-dialog-content {
  padding: 0;
}

.info-row {
  margin-bottom: 10px;
  display: flex;
}

.info-row .label {
  font-weight: 500;
  width: 100px;
}

@media (max-width: 640px) {
  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .archive-filter {
    width: 100%;
  }

  .row-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
