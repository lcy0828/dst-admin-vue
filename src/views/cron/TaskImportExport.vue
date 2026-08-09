<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0"><h1 class="text-2xl font-semibold tracking-normal">{{ $t('cronLogs.transfer.title') }}</h1><p class="mt-1 text-sm text-muted-foreground">{{ $t('cronLogs.transfer.subtitle') }}</p></div>
      <automation-room-select @ready="getExportFiles" @change="getExportFiles" />
    </header>
    <div class="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>{{ $t('cronLogs.transfer.export.title') }}</CardTitle><CardDescription>{{ $t('cronLogs.transfer.export.description') }}</CardDescription></CardHeader>
        <CardContent>
          <FieldGroup>
            <Field><FieldLabel for="export-description">{{ $t('cronLogs.transfer.export.descriptionField') }}</FieldLabel><UiTextarea id="export-description" v-model="exportForm.description" rows="3" :placeholder="$t('cronLogs.transfer.export.descriptionPlaceholder')" /></Field>
            <Field><FieldLabel for="export-filename">{{ $t('cronLogs.transfer.export.filename') }}</FieldLabel><UiInput id="export-filename" v-model="exportForm.filename" :placeholder="$t('cronLogs.transfer.export.filenamePlaceholder')" /><FieldDescription>{{ $t('cronLogs.transfer.export.formatHint') }}</FieldDescription></Field>
            <FieldDescription>{{ $t('cronLogs.transfer.export.contentHint') }}</FieldDescription>
          </FieldGroup>
        </CardContent>
        <CardFooter class="justify-end"><UiButton :disabled="exporting" @click="handleExport"><Spinner v-if="exporting" data-icon="inline-start" /><Download v-else data-icon="inline-start" />{{ $t('cronLogs.transfer.export.action') }}</UiButton></CardFooter>
      </Card>

      <Card>
        <CardHeader><CardTitle>{{ $t('cronLogs.transfer.import.title') }}</CardTitle><CardDescription>{{ $t('cronLogs.transfer.import.description') }}</CardDescription></CardHeader>
        <CardContent>
          <FieldGroup>
            <Field><FieldLabel for="import-file">{{ $t('cronLogs.transfer.import.file') }}</FieldLabel><UiInput id="import-file" ref="importFileInput" type="file" accept="application/json,.json" @change="handleFileChange" /><FieldDescription>{{ importForm.file ? importForm.file.name : $t('cronLogs.transfer.import.fileHint') }}</FieldDescription></Field>
            <FieldSet><FieldLegend variant="label">{{ $t('cronLogs.transfer.import.mode') }}</FieldLegend><RadioGroup v-model="importForm.mode" class="grid gap-3 sm:grid-cols-2">
              <Field orientation="horizontal"><RadioGroupItem id="import-merge" value="merge" /><FieldContent><FieldLabel for="import-merge">{{ $t('cronLogs.transfer.import.merge') }}</FieldLabel><FieldDescription>{{ $t('cronLogs.transfer.import.mergeDescription') }}</FieldDescription></FieldContent></Field>
              <Field orientation="horizontal"><RadioGroupItem id="import-override" value="override" /><FieldContent><FieldLabel for="import-override">{{ $t('cronLogs.transfer.import.override') }}</FieldLabel><FieldDescription>{{ $t('cronLogs.transfer.import.overrideDescription') }}</FieldDescription></FieldContent></Field>
            </RadioGroup></FieldSet>
            <Alert v-if="importForm.mode === 'override'" variant="destructive"><TriangleAlert /><AlertTitle>{{ $t('cronLogs.transfer.import.warningTitle') }}</AlertTitle><AlertDescription>{{ $t('cronLogs.transfer.import.warningDescription') }}</AlertDescription></Alert>
          </FieldGroup>
        </CardContent>
        <CardFooter class="justify-end"><UiButton :disabled="importing || !importForm.file" @click="handleImport"><Spinner v-if="importing" data-icon="inline-start" /><Upload v-else data-icon="inline-start" />{{ $t('cronLogs.transfer.import.action') }}</UiButton></CardFooter>
      </Card>
    </div>

    <Card>
      <CardHeader><CardTitle>{{ $t('cronLogs.transfer.history.title') }}</CardTitle><CardDescription>{{ $t('cronLogs.transfer.history.description') }}</CardDescription><CardAction><UiButton size="sm" variant="outline" :disabled="filesLoading" @click="getExportFiles"><Spinner v-if="filesLoading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{ $t('cronLogs.common.actions.refresh') }}</UiButton></CardAction></CardHeader>
      <CardContent>
        <div v-if="filesLoading" class="flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground" role="status"><Spinner /><span>{{ $t('cronLogs.transfer.history.loading') }}</span></div>
        <Empty v-else-if="exportFiles.length === 0"><EmptyHeader><EmptyTitle>{{ $t('cronLogs.transfer.history.empty') }}</EmptyTitle><EmptyDescription>{{ $t('cronLogs.transfer.history.emptyDescription') }}</EmptyDescription></EmptyHeader></Empty>
        <div v-else class="overflow-x-auto"><ShadcnTable><TableHeader><TableRow><TableHead>{{ $t('cronLogs.transfer.history.columns.filename') }}</TableHead><TableHead>{{ $t('cronLogs.transfer.history.columns.description') }}</TableHead><TableHead>{{ $t('cronLogs.transfer.history.columns.size') }}</TableHead><TableHead>{{ $t('cronLogs.transfer.history.columns.createdAt') }}</TableHead><TableHead class="text-right">{{ $t('cronLogs.transfer.history.columns.actions') }}</TableHead></TableRow></TableHeader><TableBody>
          <TableRow v-for="file in exportFiles" :key="file.filename"><TableCell class="font-mono text-xs">{{ file.filename }}</TableCell><TableCell>{{ file.description || $t('cronLogs.common.values.notAvailable') }}</TableCell><TableCell>{{ formatFileSize(file.size) }}</TableCell><TableCell class="whitespace-nowrap">{{ formatDate(file.created_at) }}</TableCell><TableCell><div class="flex justify-end gap-1"><UiButton size="sm" variant="outline" @click="downloadFile(file)"><Download data-icon="inline-start" />{{ $t('cronLogs.transfer.history.download') }}</UiButton><UiButton size="sm" variant="destructive" @click="deleteFile(file)"><Trash2 data-icon="inline-start" />{{ $t('cronLogs.transfer.history.delete') }}</UiButton></div></TableCell></TableRow>
        </TableBody></ShadcnTable></div>
      </CardContent>
    </Card>
  </div>
</template>

<script>
import { Download, RefreshCw, Trash2, TriangleAlert, Upload } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { cronTaskApi } from '@/api/index';
import AutomationRoomSelect from '@/components/AutomationRoomSelect.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Spinner } from '@/components/ui/spinner';
import { Table as ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea as UiTextarea } from '@/components/ui/textarea';
import { createCronLogFailure, formatCronLogDate, formatCronLogFailure } from '@/i18n/cronLogMessages';
import { confirmAction } from '@/lib/feedback';

export default {
  name: 'TaskImportExport',
  components: {
    Alert, AlertDescription, AlertTitle, AutomationRoomSelect, Card, CardAction, CardContent,
    CardDescription, CardFooter, CardHeader, CardTitle, Download, Empty, EmptyDescription,
    EmptyHeader, EmptyTitle, Field, FieldContent, FieldDescription, FieldGroup, FieldLabel,
    FieldLegend, FieldSet, RadioGroup, RadioGroupItem, RefreshCw, ShadcnTable, Spinner,
    TableBody, TableCell, TableHead, TableHeader, TableRow, Trash2, TriangleAlert, UiButton,
    UiInput, UiTextarea, Upload
  },
  data() {
    return {
      exporting: false,
      importing: false,
      filesLoading: false,
      exportForm: {
        description: '',
        filename: 'task_config_' + new Date().toISOString().slice(0, 10)
      },
      importForm: {
        file: null,
        mode: 'merge'
      },
      exportFiles: []
    };
  },
  methods: {
    errorText(key, error) {
      return formatCronLogFailure(createCronLogFailure(key, error), this.$t);
    },
    getExportFiles() {
      this.filesLoading = true;
      cronTaskApi.getExportFiles()
        .then(response => {
          if (response.data && response.data.status === 200) {
            this.exportFiles = response.data.data || [];
          } else {
            toast.error(this.errorText('cronLogs.transfer.feedback.fileListFailed', response.data?.message));
          }
        })
        .catch(error => {
          console.error('获取导出文件列表失败:', error);
          toast.error(this.errorText('cronLogs.transfer.feedback.fileListFailed', error));
        })
        .finally(() => {
          this.filesLoading = false;
        });
    },
    handleExport() {
      if (!this.exportForm.filename) {
        toast.warning(this.$t('cronLogs.transfer.feedback.filenameRequired'));
        return;
      }
      
      this.exporting = true;
      cronTaskApi.exportTasks(this.exportForm)
        .then(response => {
          if (response.data && response.data.status === 200) {
            toast.success(this.$t('cronLogs.transfer.feedback.exported'));
            this.getExportFiles();
          } else {
            toast.error(this.errorText('cronLogs.transfer.feedback.exportFailed', response.data?.message));
          }
        })
        .catch(error => {
          console.error('导出任务配置失败:', error);
          toast.error(this.errorText('cronLogs.transfer.feedback.exportFailed', error));
        })
        .finally(() => {
          this.exporting = false;
        });
    },
    handleFileChange(event) {
      const file = event.target.files?.[0];
      if (file) {
        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
          toast.error(this.$t('cronLogs.transfer.feedback.jsonOnly'));
          event.target.value = '';
          this.importForm.file = null;
          return;
        }
        this.importForm.file = file;
      } else {
        this.importForm.file = null;
      }
    },
    handleImport() {
      if (!this.importForm.file) {
        toast.warning(this.$t('cronLogs.transfer.feedback.fileRequired'));
        return;
      }
      
      this.importing = true;
      
      const formData = new FormData();
      formData.append('file', this.importForm.file);
      formData.append('mode', this.importForm.mode);
      
      cronTaskApi.importTasks(formData)
        .then(response => {
          if (response.data && response.data.status === 200) {
            toast.success(this.$t('cronLogs.transfer.feedback.imported'));
            this.importForm.file = null;
            if (this.$refs.importFileInput?.$el) this.$refs.importFileInput.$el.value = '';
          } else {
            toast.error(this.errorText('cronLogs.transfer.feedback.importFailed', response.data?.message));
          }
        })
        .catch(error => {
          console.error('导入任务配置失败:', error);
          toast.error(this.errorText('cronLogs.transfer.feedback.importFailed', error));
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
          toast.error(this.errorText('cronLogs.transfer.feedback.downloadFailed', error));
        });
    },
    deleteFile(file) {
      confirmAction(this.$t('cronLogs.transfer.feedback.deleteConfirm'), this.$t('cronLogs.transfer.feedback.deleteTitle'), {
        confirmButtonText: this.$t('common.actions.confirm'),
        cancelButtonText: this.$t('common.actions.cancel'),
        type: 'warning'
      }).then(() => {
        cronTaskApi.deleteExportFile(file.filename)
          .then(response => {
            if (response.data && response.data.status === 200) {
              toast.success(this.$t('cronLogs.transfer.feedback.deleted'));
              this.getExportFiles();
            } else {
              toast.error(this.errorText('cronLogs.transfer.feedback.deleteFailed', response.data?.message));
            }
          })
          .catch(error => {
            console.error('删除文件失败:', error);
            toast.error(this.errorText('cronLogs.transfer.feedback.deleteFailed', error));
          });
      }).catch(() => {
        toast.info(this.$t('cronLogs.transfer.feedback.deleteCanceled'));
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
    },
    formatDate(value) {
      return formatCronLogDate(value, this.$i18n.locale);
    }
  }
};
</script>

<style scoped></style>
