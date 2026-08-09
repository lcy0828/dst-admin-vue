<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0"><h1 class="text-2xl font-semibold tracking-normal">任务配置迁移</h1><p class="mt-1 text-sm text-muted-foreground">在当前房间导入、导出和管理自动化任务配置。</p></div>
      <automation-room-select @ready="getExportFiles" @change="getExportFiles" />
    </header>
    <div class="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>导出任务配置</CardTitle><CardDescription>将当前房间的任务配置保存为 JSON 文件</CardDescription></CardHeader>
        <CardContent>
          <FieldGroup>
            <Field><FieldLabel for="export-description">导出描述</FieldLabel><UiTextarea id="export-description" v-model="exportForm.description" rows="3" placeholder="为本次导出添加描述信息" /></Field>
            <Field><FieldLabel for="export-filename">文件名</FieldLabel><UiInput id="export-filename" v-model="exportForm.filename" placeholder="导出文件名（不含扩展名）" /><FieldDescription>文件将以 .json 格式保存</FieldDescription></Field>
            <FieldDescription>导出内容包含当前房间的全部任务、任务组和依赖关系。</FieldDescription>
          </FieldGroup>
        </CardContent>
        <CardFooter class="justify-end"><UiButton :disabled="exporting" @click="handleExport"><Spinner v-if="exporting" data-icon="inline-start" /><Download v-else data-icon="inline-start" />导出配置</UiButton></CardFooter>
      </Card>

      <Card>
        <CardHeader><CardTitle>导入任务配置</CardTitle><CardDescription>从 JSON 文件合并或覆盖当前配置</CardDescription></CardHeader>
        <CardContent>
          <FieldGroup>
            <Field><FieldLabel for="import-file">选择文件</FieldLabel><UiInput id="import-file" ref="importFileInput" type="file" accept="application/json,.json" @change="handleFileChange" /><FieldDescription>{{ importForm.file ? importForm.file.name : '只能选择 .json 文件' }}</FieldDescription></Field>
            <FieldSet><FieldLegend variant="label">导入模式</FieldLegend><RadioGroup v-model="importForm.mode" class="grid gap-3 sm:grid-cols-2">
              <Field orientation="horizontal"><RadioGroupItem id="import-merge" value="merge" /><FieldContent><FieldLabel for="import-merge">合并</FieldLabel><FieldDescription>仅添加不存在的任务和任务组</FieldDescription></FieldContent></Field>
              <Field orientation="horizontal"><RadioGroupItem id="import-override" value="override" /><FieldContent><FieldLabel for="import-override">覆盖</FieldLabel><FieldDescription>按照文件内容更新现有配置</FieldDescription></FieldContent></Field>
            </RadioGroup></FieldSet>
            <Alert v-if="importForm.mode === 'override'" variant="destructive"><TriangleAlert /><AlertTitle>覆盖模式</AlertTitle><AlertDescription>现有任务配置可能被覆盖，请确认文件来源可靠。</AlertDescription></Alert>
          </FieldGroup>
        </CardContent>
        <CardFooter class="justify-end"><UiButton :disabled="importing || !importForm.file" @click="handleImport"><Spinner v-if="importing" data-icon="inline-start" /><Upload v-else data-icon="inline-start" />导入配置</UiButton></CardFooter>
      </Card>
    </div>

    <Card>
      <CardHeader><CardTitle>本次浏览器导出记录</CardTitle><CardDescription>刷新页面后记录可能被清空</CardDescription><CardAction><UiButton size="sm" variant="outline" :disabled="filesLoading" @click="getExportFiles"><Spinner v-if="filesLoading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />刷新</UiButton></CardAction></CardHeader>
      <CardContent>
        <div v-if="filesLoading" class="flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground" role="status"><Spinner /><span>正在读取导出记录</span></div>
        <Empty v-else-if="exportFiles.length === 0"><EmptyHeader><EmptyTitle>暂无导出记录</EmptyTitle><EmptyDescription>完成一次导出后，文件会显示在这里。</EmptyDescription></EmptyHeader></Empty>
        <div v-else class="overflow-x-auto"><ShadcnTable><TableHeader><TableRow><TableHead>文件名</TableHead><TableHead>描述</TableHead><TableHead>大小</TableHead><TableHead>创建时间</TableHead><TableHead class="text-right">操作</TableHead></TableRow></TableHeader><TableBody>
          <TableRow v-for="file in exportFiles" :key="file.filename"><TableCell class="font-mono text-xs">{{ file.filename }}</TableCell><TableCell>{{ file.description || '-' }}</TableCell><TableCell>{{ formatFileSize(file.size) }}</TableCell><TableCell class="whitespace-nowrap">{{ file.created_at }}</TableCell><TableCell><div class="flex justify-end gap-1"><UiButton size="sm" variant="outline" @click="downloadFile(file)"><Download data-icon="inline-start" />下载</UiButton><UiButton size="sm" variant="destructive" @click="deleteFile(file)"><Trash2 data-icon="inline-start" />删除</UiButton></div></TableCell></TableRow>
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
    getExportFiles() {
      this.filesLoading = true;
      cronTaskApi.getExportFiles()
        .then(response => {
          if (response.data && response.data.status === 200) {
            this.exportFiles = response.data.data || [];
          } else {
            toast.error(response.data.message || '获取导出文件列表失败');
          }
        })
        .catch(error => {
          console.error('获取导出文件列表失败:', error);
          toast.error('获取导出文件列表失败');
        })
        .finally(() => {
          this.filesLoading = false;
        });
    },
    handleExport() {
      if (!this.exportForm.filename) {
        toast.warning('请输入文件名');
        return;
      }
      
      this.exporting = true;
      cronTaskApi.exportTasks(this.exportForm)
        .then(response => {
          if (response.data && response.data.status === 200) {
            toast.success('导出成功');
            this.getExportFiles();
          } else {
            toast.error(response.data.message || '导出失败');
          }
        })
        .catch(error => {
          console.error('导出任务配置失败:', error);
          toast.error(error.message || '导出任务配置失败');
        })
        .finally(() => {
          this.exporting = false;
        });
    },
    handleFileChange(event) {
      const file = event.target.files?.[0];
      if (file) {
        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
          toast.error('只能选择 JSON 文件');
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
        toast.warning('请选择要导入的文件');
        return;
      }
      
      this.importing = true;
      
      const formData = new FormData();
      formData.append('file', this.importForm.file);
      formData.append('mode', this.importForm.mode);
      
      cronTaskApi.importTasks(formData)
        .then(response => {
          if (response.data && response.data.status === 200) {
            toast.success('导入成功');
            this.importForm.file = null;
            if (this.$refs.importFileInput?.$el) this.$refs.importFileInput.$el.value = '';
          } else {
            toast.error(response.data.message || '导入失败');
          }
        })
        .catch(error => {
          console.error('导入任务配置失败:', error);
          toast.error(error.message || '导入任务配置失败');
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
          toast.error('下载文件失败');
        });
    },
    deleteFile(file) {
      confirmAction('确定要移除这条浏览器导出记录吗？已下载到磁盘的文件不会被删除。', '确认移除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        cronTaskApi.deleteExportFile(file.filename)
          .then(response => {
            if (response.data && response.data.status === 200) {
              toast.success('删除成功');
              this.getExportFiles();
            } else {
              toast.error(response.data.message || '删除失败');
            }
          })
          .catch(error => {
            console.error('删除文件失败:', error);
            toast.error('删除文件失败');
          });
      }).catch(() => {
        toast.info('已取消删除');
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

<style scoped></style>
