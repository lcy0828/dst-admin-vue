<template>
  <div class="announcements-page">
    <div class="page-header">
      <h2>公告管理</h2>
      <div class="header-actions">
        <UiButton @click="createAnnouncement"><PlusIcon data-icon="inline-start" />发布公告</UiButton>
        <UiButton variant="outline" :disabled="loading" @click="refreshAnnouncements">
          <Spinner v-if="loading" data-icon="inline-start" />
          <RefreshCwIcon v-else data-icon="inline-start" />
          刷新
        </UiButton>
      </div>
    </div>
    <Card class="announcements-card">
      <CardHeader class="card-header">
        <div>
          <CardTitle>公告列表</CardTitle>
          <CardDescription>管理面向玩家和管理员的系统公告。</CardDescription>
        </div>
        <UiSelect v-model="statusFilter">
          <SelectTrigger class="status-filter"><SelectValue placeholder="状态筛选" /></SelectTrigger>
          <SelectContent><SelectGroup>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="active">有效</SelectItem>
            <SelectItem value="expired">已过期</SelectItem>
          </SelectGroup></SelectContent>
        </UiSelect>
      </CardHeader>
      <CardContent>
        <ShadcnTable>
          <TableHeader><TableRow>
            <TableHead>标题</TableHead><TableHead>发布时间</TableHead><TableHead>过期时间</TableHead><TableHead>状态</TableHead><TableHead class="actions-column">操作</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            <TableRow v-for="announcement in filteredAnnouncements" :key="announcement.id">
              <TableCell><div class="announcement-title"><Badge v-if="announcement.important" variant="destructive">重要</Badge>{{ announcement.title }}</div></TableCell>
              <TableCell>{{ announcement.publishTime }}</TableCell>
              <TableCell>{{ announcement.expireTime }}</TableCell>
              <TableCell><Badge :variant="announcement.status === 'active' ? 'default' : 'secondary'">{{ announcement.status === 'active' ? '有效' : '已过期' }}</Badge></TableCell>
              <TableCell><div class="row-actions">
                <UiButton variant="ghost" size="sm" @click="viewAnnouncement(announcement)">查看</UiButton>
                <UiButton variant="outline" size="sm" @click="editAnnouncement(announcement)">编辑</UiButton>
                <UiButton variant="destructive" size="sm" @click="deleteAnnouncement(announcement)">删除</UiButton>
              </div></TableCell>
            </TableRow>
            <TableEmpty v-if="!loading && filteredAnnouncements.length === 0" :colspan="5">
              <Empty><EmptyHeader><EmptyTitle>暂无公告</EmptyTitle><EmptyDescription>当前筛选条件下没有公告记录。</EmptyDescription></EmptyHeader></Empty>
            </TableEmpty>
            <TableEmpty v-if="loading" :colspan="5"><Spinner />正在加载公告</TableEmpty>
          </TableBody>
        </ShadcnTable>
      </CardContent>
    </Card>

    <UiDialog v-model:open="dialogVisible">
      <DialogContent class="sm:max-w-2xl">
        <DialogHeader><DialogTitle>{{ dialogTitle }}</DialogTitle><DialogDescription>查看公告内容和生效时间。</DialogDescription></DialogHeader>
        <template v-if="currentAnnouncement">
        <div class="announcement-detail">
          <div class="announcement-header">
            <h3>{{ currentAnnouncement.title }}</h3>
            <div class="announcement-meta">
              <span>发布时间: {{ currentAnnouncement.publishTime }}</span>
              <span>过期时间: {{ currentAnnouncement.expireTime }}</span>
              <Badge v-if="currentAnnouncement.important" variant="destructive">重要</Badge>
            </div>
          </div>
          <div class="announcement-content" v-html="currentAnnouncement.content"></div>
        </div>
        </template>
        <DialogFooter>
        <UiButton variant="outline" @click="dialogVisible = false">关闭</UiButton>
        <template v-if="dialogMode === 'view'">
          <UiButton @click="editCurrentAnnouncement">编辑</UiButton>
        </template>
        <template v-else>
          <UiButton @click="saveAnnouncement">保存</UiButton>
        </template>
        </DialogFooter>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="formVisible">
      <DialogContent class="sm:max-w-3xl">
        <DialogHeader><DialogTitle>{{ formTitle }}</DialogTitle><DialogDescription>设置公告内容、接收对象和过期时间。</DialogDescription></DialogHeader>
        <FieldGroup>
          <Field :data-invalid="Boolean(formErrors.title)"><FieldLabel for="announcement-title">标题</FieldLabel><UiInput id="announcement-title" v-model="announcementForm.title" :aria-invalid="Boolean(formErrors.title)" placeholder="请输入公告标题" /><FieldError v-if="formErrors.title">{{ formErrors.title }}</FieldError></Field>
          <Field :data-invalid="Boolean(formErrors.content)"><FieldLabel for="announcement-content">内容</FieldLabel><UiTextarea id="announcement-content" v-model="announcementForm.content" :aria-invalid="Boolean(formErrors.content)" rows="8" placeholder="请输入公告内容" /><FieldError v-if="formErrors.content">{{ formErrors.content }}</FieldError></Field>
          <Field :data-invalid="Boolean(formErrors.expireTime)"><FieldLabel for="announcement-expire">过期时间</FieldLabel><UiInput id="announcement-expire" type="datetime-local" :model-value="toDateTimeLocal(announcementForm.expireTime)" :aria-invalid="Boolean(formErrors.expireTime)" @update:model-value="setExpireTime" /><FieldError v-if="formErrors.expireTime">{{ formErrors.expireTime }}</FieldError></Field>
          <FieldSet><FieldLegend variant="label">发送对象</FieldLegend><RadioGroup v-model="announcementForm.target"><Field v-for="target in targetOptions" :key="target.value" orientation="horizontal"><RadioGroupItem :id="`target-${target.value}`" :value="target.value" /><FieldLabel :for="`target-${target.value}`">{{ target.label }}</FieldLabel></Field></RadioGroup></FieldSet>
          <Field orientation="horizontal"><div><FieldLabel for="announcement-important">重要公告</FieldLabel><FieldDescription>重要公告将在列表中突出显示。</FieldDescription></div><UiSwitch id="announcement-important" v-model="announcementForm.important" /></Field>
        </FieldGroup>
        <DialogFooter><UiButton variant="outline" @click="formVisible = false">取消</UiButton><UiButton :disabled="loading" @click="submitAnnouncementForm"><Spinner v-if="loading" data-icon="inline-start" />确定</UiButton></DialogFooter>
      </DialogContent>
    </UiDialog>
  </div>
</template>

<script>
import { PlusIcon, RefreshCwIcon } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input as UiInput } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Switch as UiSwitch } from '@/components/ui/switch'
import { Table as ShadcnTable, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea as UiTextarea } from '@/components/ui/textarea'
import { confirmAction } from '@/lib/feedback'
import { toast } from 'vue-sonner'

export default {
  name: 'AnnouncementsView',
  components: {
    Badge,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
    PlusIcon,
    RadioGroup,
    RadioGroupItem,
    RefreshCwIcon,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    ShadcnTable,
    Spinner,
    TableBody,
    TableCell,
    TableEmpty,
    TableHead,
    TableHeader,
    TableRow,
    UiButton,
    UiDialog,
    UiInput,
    UiSelect,
    UiSwitch,
    UiTextarea
  },
  data() {
    return {
      loading: false,
      statusFilter: 'all',
      announcements: [],
      dialogVisible: false,
      dialogTitle: '公告详情',
      dialogMode: 'view', // view或edit
      currentAnnouncement: null,
      formVisible: false,
      formTitle: '创建公告',
      announcementForm: {
        title: '',
        content: '',
        expireTime: '',
        target: 'all',
        important: false
      },
      formErrors: { title: '', content: '', expireTime: '' },
      targetOptions: [
        { label: '所有玩家', value: 'all' },
        { label: '在线玩家', value: 'online' },
        { label: '管理员', value: 'admins' }
      ]
    }
  },
  computed: {
    filteredAnnouncements() {
      if (this.statusFilter === 'all') {
        return this.announcements;
      } else {
        return this.announcements.filter(item => item.status === this.statusFilter);
      }
    }
  },
  methods: {
    refreshAnnouncements() {
      this.loading = true;
      return this.$api.systemApi.getAnnouncements()
        .then(res => {
          this.announcements = res.map(announcement => ({
            ...announcement,
            publishTime: this.formatDate(announcement.publishTime),
            expireTime: this.formatDate(announcement.expireTime)
          }));
        })
        .catch(err => {
          toast.error('获取公告列表失败：' + err.message);
        })
        .finally(() => {
          this.loading = false;
        });
    },
    viewAnnouncement(announcement) {
      this.currentAnnouncement = { ...announcement };
      this.dialogTitle = '公告详情';
      this.dialogMode = 'view';
      this.dialogVisible = true;
    },
    editCurrentAnnouncement() {
      this.dialogVisible = false;
      this.editAnnouncement(this.currentAnnouncement);
    },
    createAnnouncement() {
      this.formTitle = '创建公告';
      this.announcementForm = {
        title: '',
        content: '',
        expireTime: this.getDefaultExpireTime(),
        target: 'all',
        important: false
      };
      this.formErrors = { title: '', content: '', expireTime: '' }
      this.formVisible = true;
    },
    editAnnouncement(announcement) {
      this.formTitle = '编辑公告';
      this.announcementForm = {
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        expireTime: announcement.expireTime,
        target: announcement.target || 'all',
        important: announcement.important
      };
      this.formErrors = { title: '', content: '', expireTime: '' }
      this.formVisible = true;
    },
    validateAnnouncementForm() {
      const titleLength = this.announcementForm.title.trim().length
      this.formErrors.title = titleLength === 0
        ? '请输入公告标题'
        : (titleLength < 2 || titleLength > 50 ? '长度在 2 到 50 个字符' : '')
      this.formErrors.content = this.announcementForm.content.trim() ? '' : '请输入公告内容'
      this.formErrors.expireTime = this.announcementForm.expireTime ? '' : '请选择过期时间'
      return !Object.values(this.formErrors).some(Boolean)
    },
    async submitAnnouncementForm() {
      if (!this.validateAnnouncementForm()) return

      this.loading = true
      const isEdit = Boolean(this.announcementForm.id)
      try {
        if (isEdit) {
          await this.$api.systemApi.updateAnnouncement(this.announcementForm.id, this.announcementForm)
        } else {
          await this.$api.systemApi.createAnnouncement(this.announcementForm)
        }
        toast.success(isEdit ? '更新公告成功' : '创建公告成功')
        this.formVisible = false
        await this.refreshAnnouncements()
      } catch (error) {
        toast.error((isEdit ? '更新公告失败：' : '创建公告失败：') + error.message)
      } finally {
        this.loading = false
      }
    },
    async deleteAnnouncement(announcement) {
      try {
        await confirmAction(`确定要删除公告“${announcement.title}”吗？`, '删除公告', {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning'
        })
        this.loading = true
        await this.$api.systemApi.deleteAnnouncement(announcement.id)
        this.announcements = this.announcements.filter(item => item.id !== announcement.id)
        toast.success('删除公告成功')
      } catch (error) {
        if (error === 'cancel') toast.info('已取消删除')
        else toast.error('删除公告失败：' + error.message)
      } finally {
        this.loading = false
      }
    },
    saveAnnouncement() {
      // 从查看模式切换到编辑模式时使用
      this.dialogVisible = false;
      this.editAnnouncement(this.currentAnnouncement);
    },
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    },
    getDefaultExpireTime() {
      const date = new Date();
      date.setDate(date.getDate() + 7); // 默认7天后过期
      return date.toISOString().substring(0, 19).replace('T', ' ');
    },
    toDateTimeLocal(value) {
      return value ? value.replace(' ', 'T').slice(0, 16) : ''
    },
    setExpireTime(value) {
      this.announcementForm.expireTime = value ? `${value.replace('T', ' ')}:00` : ''
    }
  },
  mounted() {
    this.refreshAnnouncements();
  }
}
</script>

<style scoped>
.announcements-page {
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

.announcements-card {
  margin-bottom: 0;
  border-radius: 4px;
  box-shadow: none;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-filter {
  width: 132px;
}

.actions-column {
  width: 220px;
  text-align: right;
}

.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.announcement-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.important-badge {
  margin-right: 0;
}

.announcement-detail {
  padding: 0;
}

.announcement-header {
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 15px;
}

.announcement-header h3 {
  margin-top: 0;
  margin-bottom: 10px;
}

.announcement-meta {
  display: flex;
  gap: 8px 16px;
  justify-content: flex-start;
  flex-wrap: wrap;
  color: var(--text-secondary);
  font-size: 14px;
}

.announcement-content {
  line-height: 1.6;
  white-space: pre-wrap;
}

@media (max-width: 640px) {
  .page-header,
  .card-header {
    align-items: stretch;
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  .status-filter {
    width: 100%;
  }

  .row-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
