<template>
  <div class="backups-page">
    <header class="page-header">
      <div>
        <h1>{{ $t('backups.title') }}</h1>
        <p>{{ $t('backups.subtitle') }}</p>
      </div>
      <div class="header-actions">
        <UiButton @click="showCreateBackupDialog"><PlusIcon data-icon="inline-start" />{{ $t('backups.actions.create') }}</UiButton>
        <UiButton variant="outline" :disabled="loading" @click="refreshBackups"><Spinner v-if="loading" data-icon="inline-start" /><RefreshCwIcon v-else data-icon="inline-start" />{{ $t('backups.actions.refresh') }}</UiButton>
      </div>
    </header>
    <Alert v-if="loadError" variant="destructive" class="load-error-alert">
      <TriangleAlertIcon />
      <AlertTitle>{{ $t('backups.list.loadFailed') }}</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
      <AlertAction><UiButton variant="outline" size="sm" @click="refreshBackups">
        <RefreshCwIcon data-icon="inline-start" />{{ $t('backups.actions.reload') }}
      </UiButton></AlertAction>
    </Alert>
    <Card v-if="!loadError || backupsList.length" class="backups-card">
      <CardHeader><CardTitle>{{ $t('backups.list.title') }}</CardTitle><CardDescription>{{ $t('backups.list.description') }}</CardDescription>
        <CardAction><UiSelect v-model="selectedFilter"><SelectTrigger class="archive-filter"><SelectValue :placeholder="$t('backups.list.archivePlaceholder')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="__all__">{{ $t('backups.list.allArchives') }}</SelectItem><SelectItem v-for="archive in archiveOptions" :key="archive" :value="archive">{{ archive }}</SelectItem></SelectGroup></SelectContent></UiSelect></CardAction>
      </CardHeader>
      <CardContent><div class="table-wrap"><ShadcnTable><TableHeader><TableRow><TableHead>{{ $t('backups.list.columns.name') }}</TableHead><TableHead>{{ $t('backups.list.columns.archive') }}</TableHead><TableHead>{{ $t('backups.list.columns.size') }}</TableHead><TableHead>{{ $t('backups.list.columns.createdAt') }}</TableHead><TableHead class="actions-column">{{ $t('backups.list.columns.actions') }}</TableHead></TableRow></TableHeader><TableBody>
        <TableRow v-for="backup in filteredBackups" :key="`${backup.archive_name}-${backup.name}`"><TableCell><div class="backup-name"><FileArchiveIcon />{{ backup.name }}</div></TableCell><TableCell>{{ backup.archive_name }}</TableCell><TableCell>{{ backup.size_formatted }}</TableCell><TableCell>{{ formatDate(backup.createdAt || backup.create_time) }}</TableCell><TableCell><div class="row-actions"><UiButton variant="outline" size="sm" @click="downloadBackup(backup)"><DownloadIcon data-icon="inline-start" />{{ $t('backups.actions.download') }}</UiButton><UiButton size="sm" @click="showRestoreDialog(backup)">{{ $t('backups.actions.restore') }}</UiButton><UiButton variant="destructive" size="sm" @click="confirmDeleteBackup(backup)">{{ $t('backups.actions.delete') }}</UiButton></div></TableCell></TableRow>
        <TableEmpty v-if="loading" :colspan="5"><div class="table-skeleton" :aria-label="$t('backups.list.loading')"><Skeleton v-for="row in 4" :key="row" class="h-10 w-full" /></div></TableEmpty>
        <TableEmpty v-else-if="!loadError && filteredBackups.length === 0" :colspan="5"><Empty><EmptyHeader><EmptyTitle>{{ $t('backups.list.empty') }}</EmptyTitle><EmptyDescription>{{ $t('backups.list.emptyDescription') }}</EmptyDescription></EmptyHeader></Empty></TableEmpty>
      </TableBody></ShadcnTable></div></CardContent>
    </Card>

    <UiDialog v-model:open="createDialogVisible"><DialogContent><DialogHeader><DialogTitle>{{ $t('backups.createDialog.title') }}</DialogTitle><DialogDescription>{{ $t('backups.createDialog.description') }}</DialogDescription></DialogHeader><FieldGroup><Field><FieldLabel>{{ $t('backups.createDialog.archive') }}</FieldLabel><UiSelect v-model="selectedArchive"><SelectTrigger><SelectValue :placeholder="$t('backups.createDialog.archivePlaceholder')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="archive in archivesList" :key="archive" :value="archive">{{ archive }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field></FieldGroup><DialogFooter><UiButton variant="outline" @click="createDialogVisible = false">{{ $t('common.actions.cancel') }}</UiButton><UiButton :disabled="createLoading" @click="createBackup"><Spinner v-if="createLoading" data-icon="inline-start" />{{ $t('backups.actions.confirmCreate') }}</UiButton></DialogFooter></DialogContent></UiDialog>

    <UiDialog v-model:open="restoreDialogVisible"><DialogScrollContent class="sm:max-w-xl"><DialogHeader><DialogTitle>{{ $t('backups.restoreDialog.title') }}</DialogTitle><DialogDescription>{{ $t('backups.restoreDialog.description') }}</DialogDescription></DialogHeader>
      <div class="restore-dialog-content">
        <div class="info-row">
          <span class="label">{{ $t('backups.restoreDialog.backupFile') }}</span>
          <span class="value">{{ currentBackup ? currentBackup.name : '' }}</span>
        </div>
        <div class="info-row">
          <span class="label">{{ $t('backups.restoreDialog.sourceArchive') }}</span>
          <span class="value">{{ currentBackup ? currentBackup.archive_name : '' }}</span>
        </div>
        <Separator />
        <Alert variant="destructive"><TriangleAlertIcon /><AlertTitle>{{ $t('backups.restoreDialog.overwriteTitle') }}</AlertTitle><AlertDescription>{{ $t('backups.restoreDialog.overwriteDescription') }}<span v-if="!backupCapabilities.restoreToNewRoom"> {{ $t('backups.restoreDialog.originalOnly') }}</span></AlertDescription></Alert>
      </div>
      <DialogFooter><UiButton variant="outline" @click="restoreDialogVisible = false">{{ $t('common.actions.cancel') }}</UiButton><UiButton :disabled="restoreLoading" @click="restoreBackup"><Spinner v-if="restoreLoading" data-icon="inline-start" />{{ $t('backups.actions.restore') }}</UiButton></DialogFooter></DialogScrollContent></UiDialog>
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
      loadFailure: null,
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
    loadError() {
      if (!this.loadFailure) return ''
      const message = this.$t(this.loadFailure.key)
      return this.loadFailure.detail
        ? this.$t('backups.feedback.withDetail', { message, detail: this.loadFailure.detail })
        : message
    },
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
      this.loadFailure = null;
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
            this.loadFailure = {
              key: 'backups.feedback.listUnavailable',
              detail: String(res?.msg || '').trim()
            };
            toast.error(this.$t('backups.feedback.listFailed', { error: this.loadError }));
          }
        })
        .catch(err => {
          this.loadFailure = {
            key: 'backups.feedback.serviceUnavailable',
            detail: String(err?.message || '').trim()
          };
          toast.error(this.$t('backups.feedback.listFailed', { error: this.loadError }));
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
            toast.warning(this.$t('backups.feedback.noArchives'));
          }
        })
        .catch(err => {
          this.archivesList = [];
          this.selectedArchive = '';
          toast.error(this.$t('backups.feedback.archiveListFailed', {
            error: err?.message || this.$t('common.errors.unknown')
          }));
        });
    },
    createBackup() {
      if (!this.selectedArchive) {
        toast.warning(this.$t('backups.feedback.selectArchive'));
        return;
      }
      
      this.createLoading = true;
      this.$api.backupApi.createBackup(this.selectedArchive)
        .then(res => {
          if (res.status === 200) {
            toast.success(this.$t('backups.feedback.created'));
            this.createDialogVisible = false;
            return this.refreshBackups();
          } else {
            toast.error(this.$t('backups.feedback.createFailed', {
              error: res?.msg || this.$t('common.errors.unknown')
            }));
          }
        })
        .catch(err => {
          toast.error(this.$t('backups.feedback.createFailed', {
            error: err?.message || this.$t('common.errors.unknown')
          }));
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
          toast.success(this.$t('backups.feedback.downloading', { name }));
        })
        .catch(error => toast.error(this.$t('backups.feedback.downloadFailed', {
          error: error?.message || this.$t('common.errors.unknown')
        })));
    },
    
    // 显示恢复备份对话框
    showRestoreDialog(backup) {
      this.currentBackup = backup;
      this.restoreDialogVisible = true;
    },
    
    // 恢复备份
    async restoreBackup() {
      if (!this.currentBackup) {
        toast.warning(this.$t('backups.feedback.noBackupSelected'));
        return;
      }
      
      try {
        await confirmAction(this.$t('backups.feedback.restoreConfirm'), this.$t('backups.feedback.restoreTitle'), {
          confirmButtonText: this.$t('backups.feedback.restoreButton'),
          cancelButtonText: this.$t('common.actions.cancel'),
          type: 'warning'
        })
        await this.executeRestore(this.currentBackup.archive_name, this.currentBackup.name);
      } catch {
        toast.info(this.$t('backups.feedback.restoreCanceled'))
      }
    },
    
    // 执行恢复操作
    executeRestore(archive, backup) {
      this.restoreLoading = true;
      return this.$api.backupApi.restoreBackup(archive, backup)
        .then(res => {
          if (res.status === 200) {
            toast.success(this.$t('backups.feedback.restored'));
            this.restoreDialogVisible = false;
            return this.refreshBackups();
          } else {
            toast.error(this.$t('backups.feedback.restoreFailed', {
              error: res?.msg || this.$t('common.errors.unknown')
            }));
          }
        })
        .catch(err => {
          toast.error(this.$t('backups.feedback.restoreFailed', {
            error: err?.message || this.$t('common.errors.unknown')
          }));
        })
        .finally(() => {
          this.restoreLoading = false;
        });
    },
    
    // 确认删除备份
    async confirmDeleteBackup(backup) {
      const { archive_name, name } = backup;
      try {
        await confirmAction(this.$t('backups.feedback.deleteConfirm', { name }), this.$t('backups.feedback.deleteTitle'), {
          confirmButtonText: this.$t('backups.feedback.deleteButton'),
          cancelButtonText: this.$t('common.actions.cancel'),
          type: 'warning'
        })
        this.deleteBackup(archive_name, name);
      } catch {
        toast.info(this.$t('backups.feedback.deleteCanceled'))
      }
    },
    
    // 删除备份
    deleteBackup(archive, backup) {
      this.loading = true;
      this.$api.backupApi.deleteBackup(archive, backup)
        .then(res => {
          if (res.status === 200) {
            toast.success(this.$t('backups.feedback.deleted'));
            return this.refreshBackups();
          } else {
            toast.error(this.$t('backups.feedback.deleteFailed', {
              error: res?.msg || this.$t('common.errors.unknown')
            }));
          }
        })
        .catch(err => {
          toast.error(this.$t('backups.feedback.deleteFailed', {
            error: err?.message || this.$t('common.errors.unknown')
          }));
        })
        .finally(() => {
          this.loading = false;
        });
    },
    formatDate(value) {
      if (!value) return '--'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return String(value)
      const localeState = this.$i18n?.locale
      const locale = typeof localeState === 'string' ? localeState : (localeState?.value || 'zh-CN')
      return date.toLocaleString(locale, { hour12: false })
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
