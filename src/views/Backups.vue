<template>
  <div class="backups-page">
    <div class="page-header">
      <h2>备份管理</h2>
      <div class="header-actions">
        <UiButton @click="showCreateBackupDialog"><PlusIcon data-icon="inline-start" />创建备份</UiButton>
        <UiButton variant="outline" :disabled="loading" @click="refreshBackups"><Spinner v-if="loading" data-icon="inline-start" /><RefreshCwIcon v-else data-icon="inline-start" />刷新</UiButton>
      </div>
    </div>
    <Alert v-if="loadError" variant="destructive" class="load-error-alert">
      <TriangleAlertIcon />
      <AlertTitle>备份列表加载失败</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
      <AlertAction><UiButton variant="outline" size="sm" @click="refreshBackups">
        <RefreshCwIcon data-icon="inline-start" />重新加载
      </UiButton></AlertAction>
    </Alert>
    <Card v-if="!loadError || backupsList.length" class="backups-card">
      <CardHeader class="card-header"><div><CardTitle>备份列表</CardTitle><CardDescription>下载、恢复或删除现有世界存档备份。</CardDescription></div>
        <UiSelect v-model="selectedFilter"><SelectTrigger class="archive-filter"><SelectValue placeholder="选择存档" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="__all__">全部</SelectItem><SelectItem v-for="archive in archiveOptions" :key="archive" :value="archive">{{ archive }}</SelectItem></SelectGroup></SelectContent></UiSelect>
      </CardHeader>
      <CardContent><div class="table-wrap"><ShadcnTable><TableHeader><TableRow><TableHead>备份名称</TableHead><TableHead>存档名称</TableHead><TableHead>大小</TableHead><TableHead>创建时间</TableHead><TableHead class="actions-column">操作</TableHead></TableRow></TableHeader><TableBody>
        <TableRow v-for="backup in filteredBackups" :key="`${backup.archive_name}-${backup.name}`"><TableCell><div class="backup-name"><FileArchiveIcon />{{ backup.name }}</div></TableCell><TableCell>{{ backup.archive_name }}</TableCell><TableCell>{{ backup.size_formatted }}</TableCell><TableCell>{{ backup.create_time }}</TableCell><TableCell><div class="row-actions"><UiButton variant="outline" size="sm" @click="downloadBackup(backup)"><DownloadIcon data-icon="inline-start" />下载</UiButton><UiButton size="sm" @click="showRestoreDialog(backup)">恢复</UiButton><UiButton variant="destructive" size="sm" @click="confirmDeleteBackup(backup)">删除</UiButton></div></TableCell></TableRow>
        <TableEmpty v-if="loading" :colspan="5"><Spinner />正在加载备份</TableEmpty>
        <TableEmpty v-else-if="!loadError && filteredBackups.length === 0" :colspan="5"><Empty><EmptyHeader><EmptyTitle>暂无备份</EmptyTitle><EmptyDescription>当前存档还没有可用备份。</EmptyDescription></EmptyHeader></Empty></TableEmpty>
      </TableBody></ShadcnTable></div></CardContent>
    </Card>

    <UiDialog v-model:open="createDialogVisible"><DialogContent><DialogHeader><DialogTitle>创建存档备份</DialogTitle><DialogDescription>选择需要立即备份的房间存档。</DialogDescription></DialogHeader><Field><FieldLabel>存档</FieldLabel><UiSelect v-model="selectedArchive"><SelectTrigger><SelectValue placeholder="请选择存档" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="archive in archivesList" :key="archive" :value="archive">{{ archive }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field><DialogFooter><UiButton variant="outline" @click="createDialogVisible = false">取消</UiButton><UiButton :disabled="createLoading" @click="createBackup"><Spinner v-if="createLoading" data-icon="inline-start" />创建</UiButton></DialogFooter></DialogContent></UiDialog>

    <UiDialog v-model:open="restoreDialogVisible"><DialogContent class="sm:max-w-xl"><DialogHeader><DialogTitle>恢复存档备份</DialogTitle><DialogDescription>选择覆盖原存档或恢复为新存档。</DialogDescription></DialogHeader>
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
        <div class="restore-options">
          <div class="option-title">恢复选项</div>
          <RadioGroup v-model="restoreOption" class="restore-radio-group"><Field orientation="horizontal"><RadioGroupItem id="restore-original" value="original" /><FieldLabel for="restore-original">恢复到原存档</FieldLabel></Field><Field orientation="horizontal"><RadioGroupItem id="restore-new" value="new" /><FieldLabel for="restore-new">恢复到新存档</FieldLabel></Field></RadioGroup>

          <div v-if="restoreOption === 'original'" class="original-archive-option">
            <Alert variant="destructive"><TriangleAlertIcon /><AlertTitle>将覆盖原存档</AlertTitle><AlertDescription>此操作无法撤销，请确保已备份重要数据。</AlertDescription></Alert>
          </div>

          <div v-if="restoreOption === 'new'" class="new-archive-option">
            <Field><FieldLabel for="new-archive-name">新存档名称</FieldLabel><UiInput id="new-archive-name" v-model="newArchiveName" placeholder="请输入新存档名称" /></Field>
            <Field orientation="horizontal"><Checkbox id="overwrite-existing" v-model="overwriteExisting" /><FieldLabel for="overwrite-existing">如果存档已存在则覆盖</FieldLabel></Field>
          </div>
        </div>
      </div>
      <DialogFooter><UiButton variant="outline" @click="restoreDialogVisible = false">取消</UiButton><UiButton :disabled="restoreLoading" @click="restoreBackup"><Spinner v-if="restoreLoading" data-icon="inline-start" />恢复</UiButton></DialogFooter></DialogContent></UiDialog>
  </div>
</template>

<script>
import { DownloadIcon, FileArchiveIcon, PlusIcon, RefreshCwIcon, TriangleAlertIcon } from '@lucide/vue'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input as UiInput } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Table as ShadcnTable, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { confirmAction } from '@/lib/feedback'
import { toast } from 'vue-sonner'

export default {
  name: 'BackupsView',
  components: {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Checkbox,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DownloadIcon,
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
    Field,
    FieldLabel,
    FileArchiveIcon,
    PlusIcon,
    RadioGroup,
    RadioGroupItem,
    RefreshCwIcon,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Separator,
    ShadcnTable,
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
    UiInput,
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
          if (Array.isArray(res)) {
            // 提取房间名称作为存档列表
            this.archivesList = res.map(room => room.savename || room.name);
          } else if (res.data && Array.isArray(res.data)) {
            this.archivesList = res.data.map(room => room.savename || room.name);
          }
          
          if (this.archivesList.length === 0) {
            toast.warning('没有可用的存档');
          }
        })
        .catch(err => {
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
            this.refreshBackups();
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
      this.restoreOption = 'original';
      this.newArchiveName = `${backup.archive_name}_restored`;
      this.overwriteExisting = false;
      this.restoreDialogVisible = true;
    },
    
    // 恢复备份
    async restoreBackup() {
      if (!this.currentBackup) {
        toast.warning('未选择备份文件');
        return;
      }
      
      let targetName = null;
      let overwriteTarget = true; // 始终设置为 true
      
      if (this.restoreOption === 'original') {
        // 恢复到原存档时再次确认
        try {
          await confirmAction('您确定要恢复此备份到原存档吗？此操作将覆盖原存档所有内容且无法撤销！', '恢复备份', {
            confirmButtonText: '确认恢复',
            cancelButtonText: '取消',
            type: 'warning'
          })
          this.executeRestore(this.currentBackup.archive_name, this.currentBackup.name, null, true);
        } catch {
          toast.info('已取消恢复操作')
        }
        return;
      } else if (this.restoreOption === 'new') {
        if (!this.newArchiveName) {
          toast.warning('请输入新存档名称');
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
            toast.success(res.msg || '备份恢复成功');
            this.restoreDialogVisible = false;
            this.refreshBackups();
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
            this.refreshBackups();
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
  width: 100%;
  min-width: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-color);
}

.page-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.backups-card {
  margin-bottom: 0;
  border-radius: 4px;
  box-shadow: none;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.backup-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.backup-name .legacy-icon {
  font-size: 16px;
  color: var(--primary-color);
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

/* 恢复对话框样式 */
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

.restore-options {
  margin-top: 15px;
}

.option-title {
  font-weight: 600;
  margin-bottom: 10px;
}

.restore-radio-group {
  display: flex;
  flex-direction: column;
}

.restore-radio-group [data-slot="field"] {
  margin-bottom: 10px;
  margin-left: 0;
}

.original-archive-option {
  margin-top: 15px;
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
  background-color: var(--surface-muted);
  border-radius: 4px;
}

@media (max-width: 640px) {
  .page-header,
  .card-header {
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
