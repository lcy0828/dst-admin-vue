<template>
  <div class="announcements-page">
    <header class="page-header">
      <div>
        <h1>{{ $t('announcements.title') }}</h1>
        <p>{{ $t('announcements.subtitle') }}</p>
      </div>
      <div class="header-actions">
        <UiButton @click="createAnnouncement"><PlusIcon data-icon="inline-start" />{{ $t('announcements.actions.publish') }}</UiButton>
        <UiButton variant="outline" :disabled="loading" @click="refreshAnnouncements">
          <Spinner v-if="loading" data-icon="inline-start" />
          <RefreshCwIcon v-else data-icon="inline-start" />
          {{ $t('announcements.actions.refresh') }}
        </UiButton>
      </div>
    </header>
    <Alert v-if="loadError" variant="destructive">
      <CircleAlertIcon />
      <AlertTitle>{{ $t('announcements.list.loadFailed') }}</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
      <AlertAction><UiButton variant="outline" size="sm" @click="refreshAnnouncements">
        <RefreshCwIcon data-icon="inline-start" />{{ $t('announcements.actions.reload') }}
      </UiButton></AlertAction>
    </Alert>
    <Card v-if="!loadError || announcements.length" class="announcements-card">
      <CardHeader>
        <CardTitle>{{ $t('announcements.list.title') }}</CardTitle>
        <CardDescription>{{ $t('announcements.list.description') }}</CardDescription>
        <CardAction><UiSelect v-model="statusFilter">
          <SelectTrigger class="status-filter"><SelectValue :placeholder="$t('announcements.list.filterPlaceholder')" /></SelectTrigger>
          <SelectContent><SelectGroup>
            <SelectItem value="all">{{ $t('announcements.statuses.all') }}</SelectItem>
            <SelectItem value="active">{{ $t('announcements.statuses.active') }}</SelectItem>
            <SelectItem value="expired">{{ $t('announcements.statuses.expired') }}</SelectItem>
          </SelectGroup></SelectContent>
        </UiSelect></CardAction>
      </CardHeader>
      <CardContent>
        <div class="table-wrap"><ShadcnTable>
          <TableHeader><TableRow>
            <TableHead>{{ $t('announcements.list.columns.title') }}</TableHead><TableHead>{{ $t('announcements.list.columns.publishedAt') }}</TableHead><TableHead>{{ $t('announcements.list.columns.expiresAt') }}</TableHead><TableHead>{{ $t('announcements.list.columns.status') }}</TableHead><TableHead class="actions-column">{{ $t('announcements.list.columns.actions') }}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            <TableRow v-for="announcement in filteredAnnouncements" :key="announcement.id">
              <TableCell><div class="announcement-title"><Badge v-if="announcement.important" variant="destructive">{{ $t('announcements.important') }}</Badge>{{ announcement.title }}</div></TableCell>
              <TableCell>{{ formatDate(announcement.publishTime) }}</TableCell>
              <TableCell>{{ formatDate(announcement.expireTime) }}</TableCell>
              <TableCell><Badge :variant="announcementStatusVariant(announcement.status)">{{ announcementStatusLabel(announcement.status) }}</Badge></TableCell>
              <TableCell><div class="row-actions">
                <UiButton variant="ghost" size="sm" @click="viewAnnouncement(announcement)">{{ $t('announcements.actions.view') }}</UiButton>
                <UiButton variant="outline" size="sm" @click="editAnnouncement(announcement)">{{ $t('announcements.actions.edit') }}</UiButton>
                <UiButton variant="destructive" size="sm" @click="deleteAnnouncement(announcement)">{{ $t('announcements.actions.delete') }}</UiButton>
              </div></TableCell>
            </TableRow>
            <TableEmpty v-if="!loading && !loadError && filteredAnnouncements.length === 0" :colspan="5">
              <Empty><EmptyHeader><EmptyTitle>{{ $t('announcements.list.empty') }}</EmptyTitle><EmptyDescription>{{ $t('announcements.list.emptyDescription') }}</EmptyDescription></EmptyHeader></Empty>
            </TableEmpty>
            <TableEmpty v-if="loading" :colspan="5"><div class="table-skeleton" :aria-label="$t('announcements.list.loading')"><Skeleton v-for="row in 4" :key="row" class="h-10 w-full" /></div></TableEmpty>
          </TableBody>
        </ShadcnTable></div>
      </CardContent>
    </Card>

    <UiDialog v-model:open="dialogVisible">
      <DialogScrollContent class="sm:max-w-2xl">
        <DialogHeader><DialogTitle>{{ $t('announcements.detail.title') }}</DialogTitle><DialogDescription>{{ $t('announcements.detail.description') }}</DialogDescription></DialogHeader>
        <template v-if="currentAnnouncement">
        <div class="announcement-detail">
          <div class="announcement-header">
            <h3>{{ currentAnnouncement.title }}</h3>
            <div class="announcement-meta">
              <span>{{ $t('announcements.detail.publishedAt', { time: formatDate(currentAnnouncement.publishTime) }) }}</span>
              <span>{{ $t('announcements.detail.expiresAt', { time: formatDate(currentAnnouncement.expireTime) }) }}</span>
              <Badge v-if="currentAnnouncement.important" variant="destructive">{{ $t('announcements.important') }}</Badge>
            </div>
          </div>
          <div class="announcement-content" v-text="currentAnnouncement.content"></div>
        </div>
        </template>
        <DialogFooter>
        <UiButton variant="outline" @click="dialogVisible = false">{{ $t('announcements.actions.close') }}</UiButton>
        <template v-if="dialogMode === 'view'">
          <UiButton @click="editCurrentAnnouncement">{{ $t('announcements.actions.edit') }}</UiButton>
        </template>
        <template v-else>
          <UiButton @click="saveAnnouncement">{{ $t('announcements.actions.save') }}</UiButton>
        </template>
        </DialogFooter>
      </DialogScrollContent>
    </UiDialog>

    <UiDialog v-model:open="formVisible">
      <DialogScrollContent class="sm:max-w-3xl">
        <DialogHeader><DialogTitle>{{ formTitle }}</DialogTitle><DialogDescription>{{ $t('announcements.form.description') }}</DialogDescription></DialogHeader>
        <FieldGroup>
          <Field :data-invalid="Boolean(formErrors.title)"><FieldLabel for="announcement-title">{{ $t('announcements.form.title') }}</FieldLabel><UiInput id="announcement-title" v-model="announcementForm.title" :aria-invalid="Boolean(formErrors.title)" maxlength="50" :placeholder="$t('announcements.form.titlePlaceholder')" /><FieldError v-if="formErrors.title">{{ formError('title') }}</FieldError></Field>
          <Field :data-invalid="Boolean(formErrors.content)"><FieldLabel for="announcement-content">{{ $t('announcements.form.content') }}</FieldLabel><UiTextarea id="announcement-content" v-model="announcementForm.content" :aria-invalid="Boolean(formErrors.content)" maxlength="10000" rows="8" :placeholder="$t('announcements.form.contentPlaceholder')" /><FieldError v-if="formErrors.content">{{ formError('content') }}</FieldError></Field>
          <Field :data-invalid="Boolean(formErrors.expireTime)"><FieldLabel for="announcement-expire">{{ $t('announcements.form.expiresAt') }}</FieldLabel><UiInput id="announcement-expire" type="datetime-local" :model-value="toDateTimeLocal(announcementForm.expireTime)" :aria-invalid="Boolean(formErrors.expireTime)" @update:model-value="setExpireTime" /><FieldError v-if="formErrors.expireTime">{{ formError('expireTime') }}</FieldError></Field>
          <FieldSet><FieldLegend variant="label">{{ $t('announcements.form.target') }}</FieldLegend><RadioGroup v-model="announcementForm.target"><Field v-for="target in targetOptions" :key="target.value" orientation="horizontal"><RadioGroupItem :id="`target-${target.value}`" :value="target.value" /><FieldLabel :for="`target-${target.value}`">{{ target.label }}</FieldLabel></Field></RadioGroup></FieldSet>
          <Field orientation="horizontal"><FieldContent><FieldLabel for="announcement-important">{{ $t('announcements.form.important') }}</FieldLabel><FieldDescription>{{ $t('announcements.form.importantDescription') }}</FieldDescription></FieldContent><UiSwitch id="announcement-important" v-model="announcementForm.important" /></Field>
        </FieldGroup>
        <DialogFooter><UiButton variant="outline" @click="formVisible = false">{{ $t('common.actions.cancel') }}</UiButton><UiButton :disabled="loading" @click="submitAnnouncementForm"><Spinner v-if="loading" data-icon="inline-start" />{{ $t('announcements.actions.submit') }}</UiButton></DialogFooter>
      </DialogScrollContent>
    </UiDialog>
  </div>
</template>

<script>
import { CircleAlertIcon, PlusIcon, RefreshCwIcon } from '@lucide/vue'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog as UiDialog, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input as UiInput } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch as UiSwitch } from '@/components/ui/switch'
import { Table as ShadcnTable, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea as UiTextarea } from '@/components/ui/textarea'
import { confirmAction } from '@/lib/feedback'
import { toast } from 'vue-sonner'

export default {
  name: 'AnnouncementsView',
  components: {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
    Badge,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CircleAlertIcon,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogScrollContent,
    DialogTitle,
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
    Field,
    FieldContent,
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
    Skeleton,
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
      loadFailure: null,
      statusFilter: 'all',
      announcements: [],
      dialogVisible: false,
      dialogMode: 'view',
      currentAnnouncement: null,
      formVisible: false,
      announcementForm: {
        title: '',
        content: '',
        expireTime: '',
        target: 'all',
        important: false
      },
      formErrors: { title: '', content: '', expireTime: '' }
    }
  },
  computed: {
    loadError() {
      if (!this.loadFailure) return ''
      const message = this.$t(this.loadFailure.key)
      return this.loadFailure.detail
        ? this.$t('announcements.feedback.withDetail', { message, detail: this.loadFailure.detail })
        : message
    },
    formTitle() {
      return this.$t(this.announcementForm.id ? 'announcements.form.editTitle' : 'announcements.form.createTitle')
    },
    targetOptions() {
      return ['all', 'online', 'admins'].map(value => ({
        value,
        label: this.$t(`announcements.form.targets.${value}`)
      }))
    },
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
      this.loadFailure = null;
      return this.$api.systemApi.getAnnouncements()
        .then(res => {
          this.announcements = Array.isArray(res) ? res : [];
        })
        .catch(err => {
          this.loadFailure = {
            key: 'announcements.feedback.unavailable',
            detail: String(err?.message || '').trim()
          };
          toast.error(this.$t('announcements.feedback.listFailed', { error: this.loadError }));
        })
        .finally(() => {
          this.loading = false;
        });
    },
    viewAnnouncement(announcement) {
      this.currentAnnouncement = { ...announcement };
      this.dialogMode = 'view';
      this.dialogVisible = true;
    },
    editCurrentAnnouncement() {
      this.dialogVisible = false;
      this.editAnnouncement(this.currentAnnouncement);
    },
    createAnnouncement() {
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
        ? 'announcements.validation.titleRequired'
        : (titleLength < 2 || titleLength > 50 ? 'announcements.validation.titleLength' : '')
      this.formErrors.content = this.announcementForm.content.trim()
        ? ''
        : 'announcements.validation.contentRequired'
      const expiresAt = new Date(this.announcementForm.expireTime)
      this.formErrors.expireTime = !this.announcementForm.expireTime || Number.isNaN(expiresAt.getTime())
        ? 'announcements.validation.expiresAtInvalid'
        : (expiresAt <= new Date() ? 'announcements.validation.expiresAtFuture' : '')
      return !Object.values(this.formErrors).some(Boolean)
    },
    formError(field) {
      const key = this.formErrors[field]
      return key ? this.$t(key) : ''
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
        toast.success(this.$t(isEdit ? 'announcements.feedback.updated' : 'announcements.feedback.created'))
        this.formVisible = false
        await this.refreshAnnouncements()
      } catch (error) {
        toast.error(this.$t(isEdit ? 'announcements.feedback.updateFailed' : 'announcements.feedback.createFailed', {
          error: error?.message || this.$t('common.errors.unknown')
        }))
      } finally {
        this.loading = false
      }
    },
    async deleteAnnouncement(announcement) {
      try {
        await confirmAction(
          this.$t('announcements.feedback.deleteConfirm', { title: announcement.title }),
          this.$t('announcements.feedback.deleteTitle'), {
          confirmButtonText: this.$t('announcements.feedback.deleteButton'),
          cancelButtonText: this.$t('common.actions.cancel'),
          type: 'warning'
        })
        this.loading = true
        await this.$api.systemApi.deleteAnnouncement(announcement.id)
        this.announcements = this.announcements.filter(item => item.id !== announcement.id)
        toast.success(this.$t('announcements.feedback.deleted'))
      } catch (error) {
        if (error === 'cancel') toast.info(this.$t('announcements.feedback.deleteCanceled'))
        else toast.error(this.$t('announcements.feedback.deleteFailed', {
          error: error?.message || this.$t('common.errors.unknown')
        }))
      } finally {
        this.loading = false
      }
    },
    saveAnnouncement() {
      this.dialogVisible = false;
      this.editAnnouncement(this.currentAnnouncement);
    },
    announcementStatusLabel(status) {
      if (status === 'active' || status === 'expired') return this.$t(`announcements.statuses.${status}`)
      return status || this.$t('common.states.unknown')
    },
    announcementStatusVariant(status) {
      if (status === 'active') return 'default'
      if (status === 'expired') return 'secondary'
      return 'outline'
    },
    formatDate(dateString) {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return '-';
      const localeState = this.$i18n?.locale
      const locale = typeof localeState === 'string' ? localeState : (localeState?.value || 'zh-CN')
      return date.toLocaleString(locale, {
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
      date.setDate(date.getDate() + 7);
      return date.toISOString();
    },
    toDateTimeLocal(value) {
      const date = new Date(value)
      if (!value || Number.isNaN(date.getTime())) return ''
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    },
    setExpireTime(value) {
      const date = new Date(value)
      this.announcementForm.expireTime = value && !Number.isNaN(date.getTime()) ? date.toISOString() : ''
    }
  },
  mounted() {
    this.refreshAnnouncements();
  }
}
</script>

<style scoped>
.announcements-page {
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
  border-bottom: 1px solid var(--border);
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
  color: var(--muted-foreground);
  font-size: 14px;
}

.announcement-content {
  line-height: 1.6;
  white-space: pre-wrap;
}

@media (max-width: 640px) {
  .page-header {
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
