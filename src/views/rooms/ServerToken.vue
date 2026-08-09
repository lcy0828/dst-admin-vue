<template>
  <div class="server-token-page">
    <header v-if="!savename && !pendingMode" class="page-header">
      <h1>服务器令牌</h1>
      <p>查看或更新房间使用的 Klei 集群令牌。</p>
    </header>

    <Card v-if="!savename && !pendingMode">
      <CardHeader><CardTitle>选择房间</CardTitle><CardDescription>读取并管理所选房间的真实 Klei 集群令牌。</CardDescription></CardHeader>
      <CardContent><FieldGroup><Field><FieldLabel for="token-room">房间</FieldLabel><UiSelect v-model="selectedRoomId" :disabled="loadingRooms"><SelectTrigger id="token-room"><SelectValue placeholder="请选择已接管房间" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="room in roomOptions" :key="room.id" :value="room.id">{{ room.name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field></FieldGroup></CardContent>
    </Card>

    <Alert v-if="roomLoadError" variant="destructive"><CircleAlert /><AlertTitle>房间列表加载失败</AlertTitle><AlertDescription>{{ roomLoadError }}</AlertDescription></Alert>

    <Card v-if="pendingMode || roomValue">
      <CardHeader>
        <CardTitle>服务器令牌</CardTitle>
        <CardDescription>安全地查看或更新当前房间的集群令牌。</CardDescription>
        <CardAction v-if="roomValue || serverToken" class="token-actions max-sm:col-span-full max-sm:row-auto max-sm:justify-self-stretch">
          <UiButton
            v-if="tokenConfigured && !tokenRevealed"
            size="sm"
            variant="outline"
            @click="revealToken">
            <Eye data-icon="inline-start" />
            显示令牌
          </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            @click="showTokenDialog" >
            <Pencil data-icon="inline-start" />
            修改令牌
          </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            :disabled="loading"
            @click="fetchServerToken">
            <RefreshCw data-icon="inline-start" />
            刷新
          </UiButton>
        </CardAction>
      </CardHeader>

      <CardContent>
        <div v-if="loading" class="token-skeleton" aria-busy="true" aria-label="正在加载令牌状态">
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-20 w-full" />
        </div>
        <Alert v-else-if="loadError" variant="destructive">
          <CircleAlert />
          <AlertTitle>服务器令牌加载失败</AlertTitle>
          <AlertDescription class="error-description">
            <span>{{ loadError }}</span>
            <UiButton variant="outline" size="sm" @click="fetchServerToken">
              <RefreshCw data-icon="inline-start" />
              重新加载
            </UiButton>
          </AlertDescription>
        </Alert>
        <div v-else-if="roomValue || serverToken" class="token-info">
          <InputGroup>
            <InputGroupInput :model-value="serverToken || '--'" readonly />
            <InputGroupAddon align="inline-end">
              <InputGroupButton :disabled="!tokenRevealed" @click="copyToken">
                <Copy data-icon="inline-start" />
                复制
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>

          <Alert class="token-help">
            <Info />
            <AlertTitle>令牌用法说明</AlertTitle>
            <AlertDescription>服务器令牌用于在您的服务器中标识饥荒服务器。更改令牌将导致您的服务器在玩家列表中显示为新服务器。若无特殊需求，建议保持默认令牌。</AlertDescription>
          </Alert>
        </div>

        <div v-else>
          <FieldGroup>
            <Field :data-invalid="Boolean(ruleFormError)">
              <FieldLabel for="server-token">服务器令牌</FieldLabel>
              <UiInput
                id="server-token"
                v-model="ruleForm.token"
                placeholder="请输入服务器令牌"
                :minlength="16"
                autocomplete="off"
                :spellcheck="false"
                :aria-invalid="Boolean(ruleFormError)"
                @input="handleInput"
              />
              <FieldDescription>填写 Klei 生成的完整集群令牌，内容不会出现在日志中。</FieldDescription>
              <FieldError v-if="ruleFormError">{{ ruleFormError }}</FieldError>
            </Field>
          </FieldGroup>

          <Alert class="token-help">
            <Info />
            <AlertTitle>令牌用法说明</AlertTitle>
            <AlertDescription>服务器令牌用于在您的服务器中标识饥荒服务器。示例: pds-g^KU_HQpffVs^dasdadadawqwqfrdgth5435gf=</AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>

    <Empty v-else-if="!loadingRooms && !roomLoadError">
      <EmptyHeader><EmptyMedia variant="icon"><Info /></EmptyMedia><EmptyTitle>没有可管理的房间</EmptyTitle><EmptyDescription>先创建或接管一个房间，再管理服务器令牌。</EmptyDescription></EmptyHeader>
    </Empty>

    <!-- 修改令牌对话框 -->
    <UiDialog v-model:open="dialogVisible" @update:open="handleDialogOpenChange">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>修改服务器令牌</DialogTitle>
          <DialogDescription>更新令牌前需要输入完整房间名进行确认。</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field :data-invalid="Boolean(tokenErrors.token)">
            <FieldLabel for="new-server-token">新令牌</FieldLabel>
            <UiInput id="new-server-token" v-model="tokenForm.token" placeholder="请输入新令牌" :minlength="16" autocomplete="off" :spellcheck="false" :aria-invalid="Boolean(tokenErrors.token)" />
            <FieldDescription>至少 16 个字符，不能包含空格或换行。</FieldDescription>
            <FieldError v-if="tokenErrors.token">{{ tokenErrors.token }}</FieldError>
          </Field>
          <Field :data-invalid="Boolean(tokenErrors.confirmation)">
            <FieldLabel for="token-confirmation">确认房间名</FieldLabel>
            <UiInput
              id="token-confirmation"
              v-model="tokenForm.confirmation"
              :placeholder="roomName ? `请输入 ${roomName}` : '请输入完整房间名'"
              :aria-invalid="Boolean(tokenErrors.confirmation)"
            />
            <FieldError v-if="tokenErrors.confirmation">{{ tokenErrors.confirmation }}</FieldError>
          </Field>
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>警告</AlertTitle>
            <AlertDescription>修改服务器令牌会导致您的服务器在玩家列表中显示为新服务器。确定要继续吗？</AlertDescription>
          </Alert>
        </FieldGroup>
        <DialogFooter>
          <UiButton variant="outline" @click="dialogVisible = false">取消</UiButton>
          <UiButton @click="submitTokenForm" :disabled="submitting">
            <Spinner v-if="submitting" data-icon="inline-start" />
            确定
          </UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>
  </div>
</template>

<script>
import { CircleAlert, Copy, Eye, Info, Pencil, RefreshCw, TriangleAlert } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { roomApi, serverApi } from '@/api/index';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { promptText } from '@/lib/feedback';
import { clusterTokenError } from '@/lib/clusterToken.mjs';

export default {
  name: 'ServerToken',
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
    Copy,
    UiDialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Eye,
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    Info,
    UiInput,
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
    Pencil,
    RefreshCw,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Skeleton,
    Spinner,
    TriangleAlert,
    UiSelect
  },
  props: {
    savename: {
      type: String,
      default: ''
    },
    pendingMode: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      currentSave: '',
      serverToken: '',
      tokenConfigured: false,
      tokenRevealed: false,
      roomName: '',
      loading: false,
      loadError: '',

      // 对话框相关
      dialogVisible: false,
      tokenForm: {
        token: '',
        confirmation: ''
      },
      submitting: false,

      // 表单相关
      ruleForm: {
        token: ''
      },
      ruleFormError: '',
      tokenErrors: { token: '', confirmation: '' },
      loadingRooms: false,
      roomLoadError: '',
      roomOptions: [],
      selectedRoomId: ''

    };
  },
  computed: {
    roomValue() {
      return this.savename || this.selectedRoomId;
    }
  },
  watch: {
    roomValue: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          this.currentSave = newVal;
          this.$nextTick(() => this.fetchServerToken());
        }
      }
    }
  },
  methods: {
    handleInput() {
      this.ruleFormError = this.validateToken(this.ruleForm.token);
      this.$emit('input-token', this.ruleForm.token);
    },

    validateToken(token) {
      return clusterTokenError(token);
    },

    // 获取服务器令牌
    fetchServerToken() {
      const saveToUse = this.roomValue || this.currentSave;
      if (!saveToUse) return;

      this.loading = true;
      this.loadError = '';
      return serverApi.getServerTokenStatus(saveToUse)
        .then(res => {
          this.serverToken = res.data.maskedValue || '';
          this.tokenConfigured = Boolean(res.data.configured);
          this.tokenRevealed = false;
          this.roomName = res.data.roomName || '';
        })
        .catch(err => {
          this.loadError = err.message || '无法读取服务器令牌状态';
          toast.error('获取服务器令牌失败: ' + this.loadError);
        })
        .finally(() => {
          this.loading = false;
        });
    },

    // 复制令牌到剪贴板
    async copyToken() {
      if (!this.tokenRevealed) {
        toast.warning('请先显示真实令牌，脱敏值不能复制');
        return;
      }
      try {
        await navigator.clipboard.writeText(this.serverToken);
        toast.success('令牌已复制到剪贴板');
      } catch (error) {
        toast.error('复制失败: ' + (error.message || '请检查浏览器权限'));
      }
    },

    async revealToken() {
      try {
        const result = await promptText(
          `请输入完整房间名“${this.roomName}”以显示真实令牌`,
          '显示服务器令牌',
          {
            confirmButtonText: '显示',
            cancelButtonText: '取消',
            inputPlaceholder: this.roomName,
            inputValidator: value => value === this.roomName || '房间名不匹配'
          }
        );
        this.loading = true;
        const response = await serverApi.revealServerToken(
          this.roomValue || this.currentSave,
          result.value
        );
        this.serverToken = response.data;
        this.tokenRevealed = true;
      } catch (error) {
        if (error !== 'cancel' && error !== 'close' && error?.action !== 'cancel' && error?.action !== 'close') {
          toast.error('显示令牌失败: ' + (error.message || '确认房间名不正确'));
        }
      } finally {
        this.loading = false;
      }
    },

    // 显示修改令牌对话框
    showTokenDialog() {
      this.tokenForm = {
        token: '',
        confirmation: ''
      };
      this.dialogVisible = true;
    },

    // 重置表单
    resetForm() {
      this.tokenForm = {
        token: '',
        confirmation: ''
      };
      this.tokenErrors = { token: '', confirmation: '' };
    },

    handleDialogOpenChange(open) {
      if (!open) this.resetForm();
    },

    // 提交表单
    submitTokenForm() {
      this.tokenErrors = {
        token: this.validateToken(this.tokenForm.token),
        confirmation: this.tokenForm.confirmation === this.roomName ? '' : '请输入完整房间名确认修改'
      };
      if (this.tokenErrors.token || this.tokenErrors.confirmation) return;
      this.submitting = true;
      const saveToUse = this.roomValue || this.currentSave;
      const newToken = this.tokenForm.token;
      serverApi.updateServerToken(saveToUse, newToken, this.tokenForm.confirmation)
        .then(() => {
          this.dialogVisible = false;
          toast.success('服务器令牌已更新');
          this.fetchServerToken();
        })
        .catch(err => {
          toast.error('更新令牌失败: ' + (err.message || '未知错误'));
        })
        .finally(() => {
          this.submitting = false;
        });
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
    },

    // 格式化时间
    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
  },
  created() {
    if (!this.savename && !this.pendingMode) this.fetchRoomOptions();
  }
}
</script>

<style scoped>
.server-token-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
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

.token-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.error-description {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.token-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.token-help {
  margin-top: 10px;
}

.token-note {
  margin-top: 15px;
  color: var(--muted-foreground);
  display: flex;
  align-items: center;
  font-size: 14px;
}

.token-note i {
  margin-right: 5px;
}

.empty-token {
  text-align: center;
  padding: 30px 0;
  color: var(--muted-foreground);
}

.token-skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (max-width: 640px) {
  .token-actions {
    width: 100%;
  }

  .token-actions > *,
  .error-description > button {
    flex: 1;
  }

  .error-description {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
