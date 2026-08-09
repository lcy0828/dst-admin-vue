<template>
  <div class="special-lists-page">
    <header v-if="!savename && !pendingMode" class="page-header">
      <h1>特殊名单</h1>
      <p>维护房间管理员、黑名单和白名单。</p>
    </header>

    <Card v-if="!savename && !pendingMode">
      <CardHeader><CardTitle>选择房间</CardTitle><CardDescription>名单会直接读写所选房间的真实配置。</CardDescription></CardHeader>
      <CardContent>
        <FieldGroup><Field><FieldLabel for="special-list-room">房间</FieldLabel><UiSelect v-model="selectedRoomId" :disabled="loadingRooms"><SelectTrigger id="special-list-room"><SelectValue placeholder="请选择已接管房间" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="room in roomOptions" :key="room.id" :value="room.id">{{ room.name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field></FieldGroup>
      </CardContent>
    </Card>

    <Alert v-if="roomLoadError" variant="destructive"><CircleAlert /><AlertTitle>房间列表加载失败</AlertTitle><AlertDescription>{{ roomLoadError }}</AlertDescription></Alert>

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
            <CardDescription>维护 {{ list.tabLabel }} 中的玩家 KU ID。</CardDescription>
            <CardAction><UiButton size="sm" @click="addUser(list.type)">
              <UserPlus data-icon="inline-start" />
              添加{{ list.actionLabel }}
            </UiButton></CardAction>
          </CardHeader>
          <CardContent>
            <div v-if="loading[list.type]" class="list-skeleton" aria-busy="true" aria-label="正在加载名单">
              <Skeleton v-for="row in 4" :key="row" class="h-11 w-full" />
            </div>
            <Alert v-else-if="errors[list.type]" variant="destructive">
              <CircleAlert />
              <AlertTitle>{{ list.title }}加载失败</AlertTitle>
              <AlertDescription class="error-description">
                <span>{{ errors[list.type] }}</span>
                <UiButton variant="outline" size="sm" @click="fetchList(list.type)">
                  <RefreshCw data-icon="inline-start" />
                  重新加载
                </UiButton>
              </AlertDescription>
            </Alert>
            <div v-else-if="getList(list.type).length > 0" class="table-wrap">
              <UiTable>
                <TableHeader>
                  <TableRow>
                    <TableHead>玩家名称</TableHead>
                    <TableHead>KU ID</TableHead>
                    <TableHead class="action-column">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="(user, index) in getList(list.type)" :key="`${user.id}-${index}`">
                    <TableCell>{{ user.name || '--' }}</TableCell>
                    <TableCell class="id-cell">{{ user.id || '--' }}</TableCell>
                    <TableCell class="action-column">
                      <UiButton variant="destructive" size="sm" @click="removeUser(list.type, index, user)">
                        <Trash2 data-icon="inline-start" />
                        移除
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
                <EmptyDescription>添加 KU ID 后会显示在这里。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <Empty v-else-if="!loadingRooms && !roomLoadError">
      <EmptyHeader><EmptyMedia variant="icon"><Users /></EmptyMedia><EmptyTitle>没有可管理的房间</EmptyTitle><EmptyDescription>先创建或接管一个房间，再维护特殊名单。</EmptyDescription></EmptyHeader>
    </Empty>
    
    <!-- 添加用户对话框 -->
    <UiDialog v-model:open="dialogVisible" @update:open="handleDialogOpenChange">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ dialogTitle }}</DialogTitle>
          <DialogDescription>输入玩家的 KU ID，例如 KU_XXXXX。</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field :data-invalid="Boolean(userFormError)">
            <FieldLabel for="special-list-ku-id">KU ID</FieldLabel>
            <UiInput
              id="special-list-ku-id"
              v-model.trim="userForm.id"
              placeholder="格式: KU_XXXXX"
              :aria-invalid="Boolean(userFormError)"
              @keyup.enter="submitUserForm"
            />
            <FieldError v-if="userFormError">{{ userFormError }}</FieldError>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <UiButton variant="outline" @click="dialogVisible = false">取消</UiButton>
          <UiButton @click="submitUserForm" :disabled="submitting">
            <Spinner v-if="submitting" data-icon="inline-start" />
            确定
          </UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>
  </div>
</template>

<script>
import { CircleAlert, RefreshCw, Trash2, UserPlus, Users } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { roomApi, serverApi } from '@/api/index';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { confirmAction, promptText } from '@/lib/feedback';

export default {
  name: 'SpecialLists',
  components: {
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
    FieldError,
    FieldGroup,
    FieldLabel,
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
      listDefinitions: [
        { type: 'admin', tabLabel: '管理员名单', title: '管理员列表', actionLabel: '管理员', emptyText: '暂无管理员' },
        { type: 'block', tabLabel: '黑名单', title: '黑名单列表', actionLabel: '黑名单', emptyText: '暂无黑名单用户' },
        { type: 'white', tabLabel: '白名单', title: '白名单列表', actionLabel: '白名单', emptyText: '暂无白名单用户' }
      ],
      
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
      dialogTitle: '添加管理员',
      userForm: {
        id: ''
      },
      userFormError: '',
      submitting: false,
      loadingRooms: false,
      roomLoadError: '',
      roomOptions: [],
      selectedRoomId: ''
    }
  },
  computed: {
    roomValue() {
      return this.savename || this.selectedRoomId;
    },
    confirmationRoomName() {
      if (this.roomName) return this.roomName;
      return this.roomOptions.find(room => room.id === this.roomValue)?.name || '';
    }
  },
  methods: {
    getList(type) {
      return type === 'admin' ? this.adminList : type === 'block' ? this.blockList : this.whiteList;
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
      
      serverApi.getAdminList(this.roomValue)
        .then(res => {
          this.adminList = res.data;
          this.adminList = this.adminList.map(item => {
            return this.normalizeUserData(item);
          });
        })
        .catch(err => {
          this.errors.admin = err.message || '无法读取管理员名单';
          toast.error('获取管理员列表失败: ' + this.errors.admin);
        })
        .finally(() => {
          this.loading.admin = false;
        });
    },
    
    // 获取黑名单
    fetchBlockList() {
      this.loading.block = true;
      this.errors.block = '';
      serverApi.getBlockList(this.roomValue)
        .then(res => {
          this.blockList = res.data;
          this.blockList = this.blockList.map(item => {
            return this.normalizeUserData(item);
          });
        })
        .catch(err => {
          this.errors.block = err.message || '无法读取黑名单';
          toast.error('获取黑名单失败: ' + this.errors.block);
        })
        .finally(() => {
          this.loading.block = false;
        });
    },
    
    // 获取白名单
    fetchWhiteList() {
      this.loading.white = true;
      this.errors.white = '';
      serverApi.getWhiteList(this.roomValue)
        .then(res => {
          this.whiteList = res.data;
          this.whiteList = this.whiteList.map(item => {
            return this.normalizeUserData(item);
          });
        })
        .catch(err => {
          this.errors.white = err.message || '无法读取白名单';
          toast.error('获取白名单失败: ' + this.errors.white);
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
      switch(type) {
        case 'admin':
          this.dialogTitle = '添加管理员';
          break;
        case 'block':
          this.dialogTitle = '添加黑名单';
          break;
        case 'white':
          this.dialogTitle = '添加白名单';
          break;
      }
      
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
          await confirmAction(`确定要从${type === 'admin' ? '管理员列表' : type === 'block' ? '黑名单' : '白名单'}中移除 ${idToRemove} 吗?`, '移除名单用户', { destructive: true });
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
          toast.info('已从待保存名单移除，创建房间时才会写入服务器');
          return;
        }
        const roomName = this.confirmationRoomName;
        if (!roomName) {
          toast.error('无法确定房间名称，请重新选择房间');
          return;
        }
        await promptText(
          `移除名单成员会修改房间访问配置。请输入完整房间名“${roomName}”确认`,
          '移除名单用户',
          {
            confirmButtonText: '确认移除',
            cancelButtonText: '取消',
            inputValidator: value => value === roomName || '房间名不匹配'
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
            toast.success('移除成功');
            this.fetchAllLists();
          })
          .catch(err => {
            console.error('移除失败:', err);
            toast.error('移除失败: ' + (err.message || '未知错误'));
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
        this.userFormError = '请输入KU ID';
        return;
      }
      if (!/^KU_[A-Za-z0-9]+$/.test(this.userForm.id)) {
        this.userFormError = 'KU ID格式必须为KU_开头加字母或数字';
        return;
      }
      if (this.getList(this.dialogType).some(item => (item.id || item) === this.userForm.id)) {
        this.userFormError = '该 KU ID 已在当前名单中';
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
          toast.info('已加入待保存名单，创建房间时才会写入服务器');
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
            toast.success('添加成功');
            
            // 重新获取列表数据
            this.fetchAllLists();
          })
          .catch(err => {
            toast.error('添加失败: ' + (err.message || '未知错误'));
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
        this.roomOptions = (response.data || []).filter(room => room.managed !== false);
        if (!this.selectedRoomId && this.roomOptions.length > 0) {
          this.selectedRoomId = this.roomOptions[0].id;
        }
      } catch (error) {
        this.roomOptions = [];
        this.roomLoadError = error.message || '无法读取房间列表';
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
    if (!this.savename && !this.pendingMode) this.fetchRoomOptions();
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
