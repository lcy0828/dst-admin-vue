<template>
  <div class="special-lists-page">
    <header v-if="!savename && !pendingMode" class="page-header">
      <h1>{{ $t('rooms.specialLists.title') }}</h1>
      <p>{{ $t('rooms.specialLists.subtitle') }}</p>
    </header>

    <RoomScopeSelect v-if="!savename && !pendingMode" v-model="selectedRoomId" :rooms="roomOptions" :loading="loadingRooms" />

    <Alert v-if="roomLoadError" variant="destructive"><CircleAlert /><AlertTitle>{{ $t('rooms.selector.loadFailed') }}</AlertTitle><AlertDescription>{{ roomLoadError }}</AlertDescription></Alert>

    <Tabs v-if="pendingMode || roomValue" v-model="activeTab" orientation="horizontal" class="lists-tabs">
      <TabsList>
        <TabsTrigger v-for="list in listDefinitions" :key="list.type" :value="list.type">
          {{ list.tabLabel }}
        </TabsTrigger>
      </TabsList>
      <TabsContent v-for="list in listDefinitions" :key="list.type" :value="list.type">
        <Card>
          <CardHeader>
            <CardTitle>{{ list.title }}</CardTitle>
            <CardDescription>{{ $t('rooms.specialLists.listDescription', { list: list.tabLabel }) }}</CardDescription>
            <CardAction>
              <div class="list-actions">
                <UiButton v-if="availableSourceRooms.length > 0" size="sm" variant="outline" @click="openCopyDialog">
                  <Copy data-icon="inline-start" />
                  {{ $t('rooms.copy.action') }}
                </UiButton>
                <UiButton size="sm" @click="addUser(list.type)">
                  <UserPlus data-icon="inline-start" />
                  {{ $t('rooms.specialLists.add', { member: list.actionLabel }) }}
                </UiButton>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div v-if="loading[list.type]" class="list-skeleton" aria-busy="true" :aria-label="$t('rooms.specialLists.loadingAria')">
              <Skeleton v-for="row in 4" :key="row" class="h-11 w-full" />
            </div>
            <Alert v-else-if="errors[list.type]" variant="destructive">
              <CircleAlert />
              <AlertTitle>{{ $t('rooms.specialLists.listLoadFailed', { list: list.title }) }}</AlertTitle>
              <AlertDescription class="error-description">
                <span>{{ errors[list.type] }}</span>
                <UiButton variant="outline" size="sm" @click="fetchList(list.type)">
                  <RefreshCw data-icon="inline-start" />
                  {{ $t('common.actions.retry') }}
                </UiButton>
              </AlertDescription>
            </Alert>
            <div v-else-if="getList(list.type).length > 0" class="table-wrap">
              <UiTable>
                <TableHeader>
                  <TableRow>
                    <TableHead>{{ $t('rooms.specialLists.columns.playerName') }}</TableHead>
                    <TableHead>KU ID</TableHead>
                    <TableHead class="action-column">{{ $t('common.fields.actions') }}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="(user, index) in getList(list.type)" :key="`${user.id}-${index}`">
                    <TableCell>{{ user.name || '--' }}</TableCell>
                    <TableCell class="id-cell">{{ user.id || '--' }}</TableCell>
                    <TableCell class="action-column">
                      <UiButton variant="destructive" size="sm" @click="removeUser(list.type, index, user)">
                        <Trash2 data-icon="inline-start" />
                        {{ $t('rooms.specialLists.remove') }}
                      </UiButton>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </UiTable>
            </div>
            <Empty v-else>
              <EmptyHeader>
                <EmptyMedia variant="icon"><Users /></EmptyMedia>
                <EmptyTitle>{{ list.emptyText }}</EmptyTitle>
                <EmptyDescription>{{ $t('rooms.specialLists.emptyDescription') }}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <Empty v-else-if="!loadingRooms && !roomLoadError">
      <EmptyHeader><EmptyMedia variant="icon"><Users /></EmptyMedia><EmptyTitle>{{ $t('rooms.specialLists.noRooms') }}</EmptyTitle><EmptyDescription>{{ $t('rooms.specialLists.noRoomsDescription') }}</EmptyDescription></EmptyHeader>
    </Empty>
    
    <!-- 添加用户对话框 -->
    <UiDialog v-model:open="dialogVisible" @update:open="handleDialogOpenChange">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ dialogTitle }}</DialogTitle>
          <DialogDescription>{{ $t('rooms.specialLists.dialogDescription') }}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field :data-invalid="Boolean(userFormError)">
            <FieldLabel for="special-list-ku-id">KU ID</FieldLabel>
            <UiInput
              id="special-list-ku-id"
              v-model.trim="userForm.id"
              :placeholder="$t('rooms.specialLists.kuIdPlaceholder')"
              :aria-invalid="Boolean(userFormError)"
              @keyup.enter="submitUserForm"
            />
            <FieldError v-if="userFormError">{{ userFormError }}</FieldError>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <UiButton variant="outline" @click="dialogVisible = false">{{ $t('common.actions.cancel') }}</UiButton>
          <UiButton @click="submitUserForm" :disabled="submitting">
            <Spinner v-if="submitting" data-icon="inline-start" />
            {{ $t('common.actions.confirm') }}
          </UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="copyDialogVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ $t('rooms.specialLists.copy.title') }}</DialogTitle>
          <DialogDescription>{{ $t('rooms.specialLists.copy.description') }}</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel for="special-list-copy-source">{{ $t('rooms.copy.sourceRoom') }}</FieldLabel>
            <UiSelect v-model="copySourceRoomId" :disabled="copyLoading || copying" @update:model-value="loadCopySource">
              <SelectTrigger id="special-list-copy-source"><SelectValue :placeholder="$t('rooms.copy.sourcePlaceholder')" /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem v-for="room in availableSourceRooms" :key="room.id" :value="room.id">{{ room.name }}</SelectItem></SelectGroup></SelectContent>
            </UiSelect>
          </Field>

          <FieldSet>
            <FieldLegend>{{ $t('rooms.specialLists.copy.lists') }}</FieldLegend>
            <FieldDescription>{{ $t('rooms.specialLists.copy.listsDescription') }}</FieldDescription>
            <FieldGroup>
              <Field v-for="list in listDefinitions" :key="`copy-${list.type}`" orientation="horizontal">
                <UiCheckbox :id="`copy-special-list-${list.type}`" :model-value="copyListTypes.includes(list.type)" @update:model-value="value => toggleCopyList(list.type, value)" />
                <FieldContent>
                  <FieldLabel :for="`copy-special-list-${list.type}`">{{ list.tabLabel }}</FieldLabel>
                  <FieldDescription v-if="copySourceLoaded">{{ copySummaryLabel(list.type) }}</FieldDescription>
                </FieldContent>
              </Field>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>{{ $t('rooms.specialLists.copy.mode') }}</FieldLegend>
            <RadioGroup v-model="copyMode" class="grid gap-3 sm:grid-cols-2">
              <Field orientation="horizontal">
                <RadioGroupItem id="special-list-copy-merge" value="merge" />
                <FieldContent><FieldLabel for="special-list-copy-merge">{{ $t('rooms.specialLists.copy.merge') }}</FieldLabel><FieldDescription>{{ $t('rooms.specialLists.copy.mergeDescription') }}</FieldDescription></FieldContent>
              </Field>
              <Field orientation="horizontal">
                <RadioGroupItem id="special-list-copy-replace" value="replace" />
                <FieldContent><FieldLabel for="special-list-copy-replace">{{ $t('rooms.specialLists.copy.replace') }}</FieldLabel><FieldDescription>{{ $t('rooms.specialLists.copy.replaceDescription') }}</FieldDescription></FieldContent>
              </Field>
            </RadioGroup>
          </FieldSet>

          <Alert v-if="copyMode === 'replace'" variant="destructive">
            <CircleAlert />
            <AlertTitle>{{ $t('rooms.specialLists.copy.replaceWarning') }}</AlertTitle>
            <AlertDescription>{{ $t('rooms.specialLists.copy.replaceWarningDescription') }}</AlertDescription>
          </Alert>
        </FieldGroup>

        <DialogFooter>
          <UiButton variant="outline" @click="copyDialogVisible = false">{{ $t('common.actions.cancel') }}</UiButton>
          <UiButton :disabled="copying || copyLoading || !copySourceLoaded || copyListTypes.length === 0 || copyChangeCount === 0" @click="copyListsFromRoom">
            <Spinner v-if="copying" data-icon="inline-start" />
            <Copy v-else data-icon="inline-start" />
            {{ $t('rooms.copy.confirm') }}
          </UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>
  </div>
</template>

<script>
import RoomScopeSelect from '@/components/layout/RoomScopeSelect.vue'
import { preferredRoomId } from '@/lib/pageScope.mjs'
import { CircleAlert, Copy, RefreshCw, Trash2, UserPlus, Users } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { roomApi, serverApi } from '@/api/index';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox as UiCheckbox } from '@/components/ui/checkbox';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { confirmAction } from '@/lib/feedback';
import { composeAccessCopy, summarizeAccessCopy } from '@/lib/roomCopy.mjs';

export default {
  name: 'SpecialLists',
  components: {
    RoomScopeSelect,
    Alert,
    AlertDescription,
    AlertTitle,
    UiButton,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CircleAlert,
    Copy,
    UiCheckbox,
    UiDialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
    UiInput,
    UiSelect,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Skeleton,
    Spinner,
    UiTable,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    RefreshCw,
    RadioGroup,
    RadioGroupItem,
    Trash2,
    UserPlus,
    Users
  },
  props: {
    savename: {
      type: String,
      default: ''
    },
    pendingMode: {
      type: Boolean,
      default: false
    },
    roomName: {
      type: String,
      default: ''
    }
  },
  data() {
    return {      
      // 标签页
      activeTab: 'admin',
      // 数据
      adminList: [],
      blockList: [],
      whiteList: [],
      
      // 加载状态
      loading: {
        admin: false,
        block: false,
        white: false
      },
      errors: {
        admin: '',
        block: '',
        white: ''
      },
      
      // 对话框
      dialogVisible: false,
      dialogType: 'admin', // admin, block, white
      userForm: {
        id: ''
      },
      userFormError: '',
      submitting: false,
      loadingRooms: false,
      roomLoadError: '',
      roomOptions: [],
      selectedRoomId: '',
      copyDialogVisible: false,
      copySourceRoomId: '',
      copySourceLists: { admin: [], block: [], white: [] },
      copySourceLoaded: false,
      copyListTypes: ['admin', 'block', 'white'],
      copyMode: 'merge',
      copyLoading: false,
      copying: false
    }
  },
  computed: {
    listDefinitions() {
      return ['admin', 'block', 'white'].map(type => ({
        type,
        tabLabel: this.$t(`rooms.specialLists.definitions.${type}.tab`),
        title: this.$t(`rooms.specialLists.definitions.${type}.title`),
        actionLabel: this.$t(`rooms.specialLists.definitions.${type}.member`),
        emptyText: this.$t(`rooms.specialLists.definitions.${type}.empty`)
      }));
    },
    dialogTitle() {
      return this.$t('rooms.specialLists.dialogTitle', {
        member: this.$t(`rooms.specialLists.definitions.${this.dialogType}.member`)
      });
    },
    roomValue() {
      return this.savename || this.selectedRoomId;
    },
    confirmationRoomName() {
      if (this.roomName) return this.roomName;
      return this.roomOptions.find(room => room.id === this.roomValue)?.name || '';
    },
    availableSourceRooms() {
      return this.roomOptions.filter(room => room.id !== this.roomValue);
    },
    currentAccessLists() {
      return { admin: this.adminList, block: this.blockList, white: this.whiteList };
    },
    copiedAccessLists() {
      return composeAccessCopy(this.currentAccessLists, this.copySourceLists, this.copyListTypes, this.copyMode);
    },
    copiedAccessSummary() {
      return summarizeAccessCopy(this.currentAccessLists, this.copiedAccessLists);
    },
    copyChangeCount() {
      return this.copyListTypes.reduce((total, type) => {
        const summary = this.copiedAccessSummary[type];
        return total + summary.added + summary.removed;
      }, 0);
    }
  },
  methods: {
    getList(type) {
      return type === 'admin' ? this.adminList : type === 'block' ? this.blockList : this.whiteList;
    },

    openCopyDialog() {
      if (this.availableSourceRooms.length === 0) {
        toast.info(this.$t('rooms.copy.noSourceRooms'));
        return;
      }
      this.copyListTypes = ['admin', 'block', 'white'];
      this.copyMode = 'merge';
      this.copySourceRoomId = this.availableSourceRooms[0].id;
      this.copyDialogVisible = true;
      this.loadCopySource(this.copySourceRoomId);
    },

    async loadCopySource(roomId) {
      this.copySourceLoaded = false;
      this.copyLoading = true;
      try {
        const [admin, block, white] = await Promise.all([
          serverApi.getAdminList(roomId),
          serverApi.getBlockList(roomId),
          serverApi.getWhiteList(roomId)
        ]);
        this.copySourceLists = { admin: admin.data || [], block: block.data || [], white: white.data || [] };
        this.copySourceLoaded = true;
      } catch (error) {
        toast.error(this.$t('rooms.specialLists.copy.loadFailed', { error: error.message || this.$t('common.errors.unknown') }));
      } finally {
        this.copyLoading = false;
      }
    },

    toggleCopyList(type, checked) {
      this.copyListTypes = checked
        ? [...new Set([...this.copyListTypes, type])]
        : this.copyListTypes.filter(item => item !== type);
    },

    copySummaryLabel(type) {
      const summary = this.copiedAccessSummary[type];
      return this.$t('rooms.specialLists.copy.summary', summary);
    },

    async copyListsFromRoom() {
      if (this.copying || !this.copySourceLoaded || this.copyListTypes.length === 0) return;
      this.copying = true;
      try {
        const copied = this.copiedAccessLists;
        if (this.pendingMode) {
          this.adminList = copied.admin.map(id => ({ id, name: id }));
          this.blockList = copied.block.map(id => ({ id, name: id }));
          this.whiteList = copied.white.map(id => ({ id, name: id }));
          this.emitPendingLists();
        } else {
          await serverApi.updateSpecialLists(this.roomValue, copied, true);
          await Promise.all([this.fetchAdminList(), this.fetchBlockList(), this.fetchWhiteList()]);
        }
        this.copyDialogVisible = false;
        toast.success(this.$t('rooms.specialLists.copy.success', {
          room: this.availableSourceRooms.find(room => room.id === this.copySourceRoomId)?.name || ''
        }));
      } catch (error) {
        toast.error(this.$t('rooms.specialLists.copy.failed', { error: error.message || this.$t('common.errors.unknown') }));
      } finally {
        this.copying = false;
      }
    },

    handleDialogOpenChange(open) {
      if (!open) this.userFormError = '';
    },
    // 关闭对话框
    close() {
      this.$emit('close');
    },
    
    // 获取所有列表数据
    fetchAllLists() {
      if (!this.roomValue) return;
      
      this.fetchAdminList();
      this.fetchBlockList();
      this.fetchWhiteList();
    },

    fetchList(type) {
      if (type === 'admin') return this.fetchAdminList();
      if (type === 'block') return this.fetchBlockList();
      return this.fetchWhiteList();
    },
    
    // 获取管理员列表
    fetchAdminList() {
      this.loading.admin = true;
      this.errors.admin = '';
      
      return serverApi.getAdminList(this.roomValue)
        .then(res => {
          this.adminList = res.data;
          this.adminList = this.adminList.map(item => {
            return this.normalizeUserData(item);
          });
        })
        .catch(err => {
          const list = this.$t('rooms.specialLists.definitions.admin.tab');
          this.errors.admin = err.message || this.$t('rooms.specialLists.feedback.readFailed', { list });
          toast.error(this.$t('rooms.specialLists.feedback.fetchFailed', { list, error: this.errors.admin }));
        })
        .finally(() => {
          this.loading.admin = false;
        });
    },
    
    // 获取黑名单
    fetchBlockList() {
      this.loading.block = true;
      this.errors.block = '';
      return serverApi.getBlockList(this.roomValue)
        .then(res => {
          this.blockList = res.data;
          this.blockList = this.blockList.map(item => {
            return this.normalizeUserData(item);
          });
        })
        .catch(err => {
          const list = this.$t('rooms.specialLists.definitions.block.tab');
          this.errors.block = err.message || this.$t('rooms.specialLists.feedback.readFailed', { list });
          toast.error(this.$t('rooms.specialLists.feedback.fetchFailed', { list, error: this.errors.block }));
        })
        .finally(() => {
          this.loading.block = false;
        });
    },
    
    // 获取白名单
    fetchWhiteList() {
      this.loading.white = true;
      this.errors.white = '';
      return serverApi.getWhiteList(this.roomValue)
        .then(res => {
          this.whiteList = res.data;
          this.whiteList = this.whiteList.map(item => {
            return this.normalizeUserData(item);
          });
        })
        .catch(err => {
          const list = this.$t('rooms.specialLists.definitions.white.tab');
          this.errors.white = err.message || this.$t('rooms.specialLists.feedback.readFailed', { list });
          toast.error(this.$t('rooms.specialLists.feedback.fetchFailed', { list, error: this.errors.white }));
        })
        .finally(() => {
          this.loading.white = false;
        });
    },
    
    // 标准化用户数据格式
    normalizeUserData(item) {
      if (typeof item === 'string') {
        // KU开头可能是ID
        if (item.startsWith('KU_') || item.match(/^\d+$/)) {
          return { name: item, id: item };
        } else {
          return { name: item, id: '' };
        }
      }
      
      // 如果是对象，确保有name和id属性
      const result = { ...item };
      
      // 检查各种可能的属性名
      if (!result.name) {
        result.name = result.username || result.user_name || result.playerName || 
                      result.player_name || result.nickname || result.nick || '';
      }
      
      if (!result.id) {
        result.id = result.userId || result.user_id || result.playerId || 
                     result.player_id || result.kuId || result.ku_id || '';
      }
      
      return result;
    },
    
    // 打开添加用户对话框
    addUser(type) {
      this.dialogType = type;
      this.userForm = {
        id: ''
      };
      this.userFormError = '';
      this.dialogVisible = true;
    },
    
    // 移除用户
    async removeUser(type, index, row) {
      const idToRemove = row.id || row;
      try {
        if (this.pendingMode) {
          await confirmAction(this.$t('rooms.specialLists.feedback.pendingRemoveConfirm', {
            list: this.$t(`rooms.specialLists.definitions.${type}.title`),
            id: idToRemove
          }), this.$t('rooms.specialLists.feedback.removeTitle'), { destructive: true });
          switch(type) {
            case 'admin':
              this.adminList.splice(index, 1);
              break;
            case 'block':
              this.blockList.splice(index, 1);
              break;
            case 'white':
              this.whiteList.splice(index, 1);
              break;
          }
          this.emitPendingLists();
          toast.info(this.$t('rooms.specialLists.feedback.removedPending'));
          return;
        }
        const roomName = this.confirmationRoomName;
        if (!roomName) {
          toast.error(this.$t('rooms.specialLists.feedback.missingRoom'));
          return;
        }
        await confirmAction(
          this.$t('rooms.specialLists.feedback.removePrompt', { room: roomName }),
          this.$t('rooms.specialLists.feedback.removeTitle'),
          {
            confirmButtonText: this.$t('rooms.specialLists.feedback.confirmRemove'),
            cancelButtonText: this.$t('common.actions.cancel'),
            type: 'warning'
          }
        );
        this.loading[type] = true;
        let listData;
        // 发送API请求
        let apiPromise;
        
        switch(type) {
          case 'admin':
            listData = this.adminList
              .filter((item, idx) => idx !== index)
              .map(item => item.id || item);
            apiPromise = serverApi.updateAdminList(this.roomValue, listData, true);
            break;
          case 'block':
            listData = this.blockList
              .filter((item, idx) => idx !== index)
              .map(item => item.id || item);
            apiPromise = serverApi.updateBlockList(this.roomValue, listData, true);
            break;
          case 'white':
            listData = this.whiteList
              .filter((item, idx) => idx !== index)
              .map(item => item.id || item);
            apiPromise = serverApi.updateWhiteList(this.roomValue, listData, true);
            break;
        }
        await apiPromise
          .then(() => {
            toast.success(this.$t('rooms.specialLists.feedback.removed'));
            this.fetchAllLists();
          })
          .catch(err => {
            console.error('Failed to remove list member:', err);
            toast.error(this.$t('rooms.specialLists.feedback.removeFailed', {
              error: err.message || this.$t('common.errors.unknown')
            }));
          })
          .finally(() => {
            this.loading[type] = false;
          });
      } catch {
        // 用户取消移除。
      }
    },
    
    // 提交表单
    submitUserForm() {
      if (!this.userForm.id) {
        this.userFormError = this.$t('rooms.specialLists.validation.requiredKuId');
        return;
      }
      if (!/^KU_[A-Za-z0-9]+$/.test(this.userForm.id)) {
        this.userFormError = this.$t('rooms.specialLists.validation.invalidKuId');
        return;
      }
      if (this.getList(this.dialogType).some(item => (item.id || item) === this.userForm.id)) {
        this.userFormError = this.$t('rooms.specialLists.validation.duplicateKuId');
        return;
      }
      this.userFormError = '';
        this.submitting = true;
        // 准备要添加的用户
        const newUser = this.userForm.id;
        if (this.pendingMode) {
          switch(this.dialogType) {
            case 'admin':
              this.adminList.push({ id: newUser, name: newUser });
              break;
            case 'block':
              this.blockList.push({ id: newUser, name: newUser });
              break;
            case 'white':
              this.whiteList.push({ id: newUser, name: newUser });
              break;
          }
          this.submitting = false;
          this.dialogVisible = false;
          this.emitPendingLists();
          toast.info(this.$t('rooms.specialLists.feedback.addedPending'));
          return;
        }
        let listData;
        let apiPromise;
        switch(this.dialogType) {
          case 'admin':
              listData = [...this.adminList.map(item => item.id || item), newUser];
              apiPromise = serverApi.updateAdminList(this.roomValue, listData);
            break;
          case 'block':
            listData = [...this.blockList.map(item => item.id || item), newUser];
            apiPromise = serverApi.updateBlockList(this.roomValue, listData);
            break;
          case 'white':
            listData = [...this.whiteList.map(item => item.id || item), newUser];
            apiPromise = serverApi.updateWhiteList(this.roomValue, listData);
            break;
        }        
        // 处理响应
        apiPromise
          .then(() => {
            this.submitting = false;
            this.dialogVisible = false;
            toast.success(this.$t('rooms.specialLists.feedback.added'));
            
            // 重新获取列表数据
            this.fetchAllLists();
          })
          .catch(err => {
            toast.error(this.$t('rooms.specialLists.feedback.addFailed', {
              error: err.message || this.$t('common.errors.unknown')
            }));
            this.submitting = false;
          });
    },
    emitPendingLists() {
      const admin = this.adminList.map(item => item.id);
      const block = this.blockList.map(item => item.id);
      const white = this.whiteList.map(item => item.id);
      this.$emit('add-user', { admin, block, white });
    },
    async fetchRoomOptions() {
      this.loadingRooms = true;
      this.roomLoadError = '';
      try {
        const response = await roomApi.getRoomList();
        this.roomOptions = response.data || [];
        if (!this.savename && !this.pendingMode && !this.selectedRoomId && this.roomOptions.length > 0) {
this.selectedRoomId = preferredRoomId(this.roomOptions, this.$route.query.roomId);
        }
      } catch (error) {
        this.roomOptions = [];
        this.roomLoadError = error.message || this.$t('rooms.selector.readFailed');
      } finally {
        this.loadingRooms = false;
      }
    }
  },
  watch: {
    roomValue: {
      immediate: true,
      handler(value) {
        if (value) {
          this.$nextTick(() => this.fetchAllLists());
        }
      }
    }
  },
  created() {
    this.fetchRoomOptions();
  }
}
</script>

<style scoped>
.special-lists-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  min-width: 0;
}

.lists-tabs {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.page-header {
  margin: 0;
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

.save-selector {
  margin: 0;
}

.action-column {
  width: 120px;
  text-align: right;
}

.list-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.id-cell {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  overflow-wrap: anywhere;
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
}

.error-description {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.list-skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (max-width: 640px) {
  .error-description {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
