<template>
  <div class="special-lists-page">
    <header class="page-header" v-if="!savename">
      <h1>特殊名单</h1>
      <p>维护房间管理员、黑名单和白名单。</p>
    </header>
    
    <Tabs v-model="activeTab">
      <TabsList>
        <TabsTrigger v-for="list in listDefinitions" :key="list.type" :value="list.type">
          {{ list.tabLabel }}
        </TabsTrigger>
      </TabsList>
      <TabsContent v-for="list in listDefinitions" :key="list.type" :value="list.type">
        <Card>
          <CardHeader class="list-header">
            <div>
              <CardTitle>{{ list.title }}</CardTitle>
              <CardDescription>维护 {{ list.tabLabel }} 中的玩家 KU ID。</CardDescription>
            </div>
            <UiButton size="sm" @click="addUser(list.type)">
              <UserPlus data-icon="inline-start" />
              添加{{ list.actionLabel }}
            </UiButton>
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
import { serverApi } from '@/api/index';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { confirmAction } from '@/lib/feedback';

export default {
  name: 'SpecialLists',
  components: {
    Alert,
    AlertDescription,
    AlertTitle,
    UiButton,
    Card,
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
      submitting: false
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
      if (!this.savename) return;
      
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
      
      serverApi.getAdminList(this.savename)
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
      serverApi.getBlockList(this.savename)
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
      serverApi.getWhiteList(this.savename)
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
        await confirmAction(`确定要从${type === 'admin' ? '管理员列表' : type === 'block' ? '黑名单' : '白名单'}中移除 ${idToRemove} 吗?`, '移除名单用户', { destructive: true });
        if (!this.savename) {
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
        this.loading[type] = true;
        let listData;
        // 发送API请求
        let apiPromise;
        
        switch(type) {
          case 'admin':
            listData = this.adminList
              .filter((item, idx) => idx !== index)
              .map(item => item.id || item);
            apiPromise = serverApi.updateAdminList(this.savename, listData, true);
            break;
          case 'block':
            listData = this.blockList
              .filter((item, idx) => idx !== index)
              .map(item => item.id || item);
            apiPromise = serverApi.updateBlockList(this.savename, listData, true);
            break;
          case 'white':
            listData = this.whiteList
              .filter((item, idx) => idx !== index)
              .map(item => item.id || item);
            apiPromise = serverApi.updateWhiteList(this.savename, listData, true);
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
      this.userFormError = '';
        this.submitting = true;
        // 准备要添加的用户
        const newUser = this.userForm.id;
        if (!this.savename) {
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
              apiPromise = serverApi.updateAdminList(this.savename, listData);
            break;
          case 'block':
            listData = [...this.blockList.map(item => item.id || item), newUser];
            apiPromise = serverApi.updateBlockList(this.savename, listData);
            break;
          case 'white':
            listData = [...this.whiteList.map(item => item.id || item), newUser];
            apiPromise = serverApi.updateWhiteList(this.savename, listData);
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
    }
  },
  watch: {
    savename: {
      immediate: true,
      handler(value) {
        if (value) {
          this.$nextTick(() => this.fetchAllLists());
        }
      }
    }
  }
}
</script>

<style scoped>
.special-lists-page {
  width: 100%;
  min-width: 0;
}

.page-header {
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
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

.save-selector {
  margin-bottom: 20px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.list-header > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

@media (max-width: 640px) {
  .list-header,
  .error-description {
    align-items: flex-start;
    flex-direction: column;
  }

  .list-header > button {
    width: 100%;
  }
}
</style>
