<template>
  <div class="server-token-page">
    <header v-if="!savename && !pendingMode" class="page-header">
      <h1>{{ $t('rooms.token.title') }}</h1>
      <p>{{ $t('rooms.token.subtitle') }}</p>
    </header>

    <Card v-if="!savename && !pendingMode">
      <CardHeader><CardTitle>{{ $t('rooms.token.selectRoom') }}</CardTitle><CardDescription>{{ $t('rooms.token.selectRoomDescription') }}</CardDescription></CardHeader>
      <CardContent><FieldGroup><Field><FieldLabel for="token-room">{{ $t('rooms.selector.room') }}</FieldLabel><UiSelect v-model="selectedRoomId" :disabled="loadingRooms"><SelectTrigger id="token-room"><SelectValue :placeholder="$t('rooms.selector.managedPlaceholder')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="room in roomOptions" :key="room.id" :value="room.id">{{ room.name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field></FieldGroup></CardContent>
    </Card>

    <Alert v-if="roomLoadError" variant="destructive"><CircleAlert /><AlertTitle>{{ $t('rooms.selector.loadFailed') }}</AlertTitle><AlertDescription>{{ roomLoadError }}</AlertDescription></Alert>

    <Card v-if="pendingMode || roomValue">
      <CardHeader>
        <CardTitle>{{ $t('rooms.token.title') }}</CardTitle>
        <CardDescription>{{ $t('rooms.token.cardDescription') }}</CardDescription>
        <CardAction v-if="roomValue || serverToken" class="token-actions max-sm:col-span-full max-sm:row-auto max-sm:justify-self-stretch">
          <UiButton
            v-if="tokenConfigured && !tokenRevealed"
            size="sm"
            variant="outline"
            @click="revealToken">
            <Eye data-icon="inline-start" />
            {{ $t('rooms.token.reveal') }}
          </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            @click="showTokenDialog" >
            <Pencil data-icon="inline-start" />
            {{ $t('rooms.token.edit') }}
          </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            :disabled="loading"
            @click="fetchServerToken">
            <RefreshCw data-icon="inline-start" />
            {{ $t('common.actions.refresh') }}
          </UiButton>
        </CardAction>
      </CardHeader>

      <CardContent>
        <div v-if="loading" class="token-skeleton" aria-busy="true" :aria-label="$t('rooms.token.loadingAria')">
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-20 w-full" />
        </div>
        <Alert v-else-if="loadError" variant="destructive">
          <CircleAlert />
          <AlertTitle>{{ $t('rooms.token.loadFailed') }}</AlertTitle>
          <AlertDescription class="error-description">
            <span>{{ loadError }}</span>
            <UiButton variant="outline" size="sm" @click="fetchServerToken">
              <RefreshCw data-icon="inline-start" />
              {{ $t('common.actions.retry') }}
            </UiButton>
          </AlertDescription>
        </Alert>
        <div v-else-if="roomValue || serverToken" class="token-info">
          <InputGroup>
            <InputGroupInput :model-value="serverToken || '--'" readonly />
            <InputGroupAddon align="inline-end">
              <InputGroupButton :disabled="!tokenRevealed" @click="copyToken">
                <Copy data-icon="inline-start" />
                {{ $t('common.actions.copy') }}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>

          <Alert class="token-help">
            <Info />
            <AlertTitle>{{ $t('rooms.token.helpTitle') }}</AlertTitle>
            <AlertDescription>{{ $t('rooms.token.helpDescription') }}</AlertDescription>
          </Alert>
        </div>

        <div v-else>
          <FieldGroup>
            <Field :data-invalid="Boolean(ruleFormError)">
              <FieldLabel for="server-token">{{ $t('rooms.token.title') }}</FieldLabel>
              <UiInput
                id="server-token"
                v-model="ruleForm.token"
                :placeholder="$t('rooms.token.placeholder')"
                :minlength="16"
                autocomplete="off"
                :spellcheck="false"
                :aria-invalid="Boolean(ruleFormError)"
                @input="handleInput"
              />
              <FieldDescription>{{ $t('rooms.token.fieldDescription') }}</FieldDescription>
              <FieldError v-if="ruleFormError">{{ ruleFormError }}</FieldError>
            </Field>
          </FieldGroup>

          <Alert class="token-help">
            <Info />
            <AlertTitle>{{ $t('rooms.token.helpTitle') }}</AlertTitle>
            <AlertDescription>{{ $t('rooms.token.pendingHelpDescription') }}</AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>

    <Empty v-else-if="!loadingRooms && !roomLoadError">
      <EmptyHeader><EmptyMedia variant="icon"><Info /></EmptyMedia><EmptyTitle>{{ $t('rooms.token.noRooms') }}</EmptyTitle><EmptyDescription>{{ $t('rooms.token.noRoomsDescription') }}</EmptyDescription></EmptyHeader>
    </Empty>

    <!-- 修改令牌对话框 -->
    <UiDialog v-model:open="dialogVisible" @update:open="handleDialogOpenChange">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ $t('rooms.token.dialogTitle') }}</DialogTitle>
          <DialogDescription>{{ $t('rooms.token.dialogDescription') }}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field :data-invalid="Boolean(tokenErrors.token)">
            <FieldLabel for="new-server-token">{{ $t('rooms.token.newToken') }}</FieldLabel>
            <UiInput id="new-server-token" v-model="tokenForm.token" :placeholder="$t('rooms.token.newTokenPlaceholder')" :minlength="16" autocomplete="off" :spellcheck="false" :aria-invalid="Boolean(tokenErrors.token)" />
            <FieldDescription>{{ $t('rooms.token.newTokenDescription') }}</FieldDescription>
            <FieldError v-if="tokenErrors.token">{{ tokenErrors.token }}</FieldError>
          </Field>
          <Field :data-invalid="Boolean(tokenErrors.confirmation)">
            <FieldLabel for="token-confirmation">{{ $t('rooms.token.confirmation') }}</FieldLabel>
            <UiInput
              id="token-confirmation"
              v-model="tokenForm.confirmation"
              :placeholder="roomName ? $t('rooms.token.confirmationPlaceholder', { room: roomName }) : $t('rooms.token.confirmationPlaceholderGeneric')"
              :aria-invalid="Boolean(tokenErrors.confirmation)"
            />
            <FieldError v-if="tokenErrors.confirmation">{{ tokenErrors.confirmation }}</FieldError>
          </Field>
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>{{ $t('rooms.token.warning') }}</AlertTitle>
            <AlertDescription>{{ $t('rooms.token.warningDescription') }}</AlertDescription>
          </Alert>
        </FieldGroup>
        <DialogFooter>
          <UiButton variant="outline" @click="dialogVisible = false">{{ $t('common.actions.cancel') }}</UiButton>
          <UiButton @click="submitTokenForm" :disabled="submitting">
            <Spinner v-if="submitting" data-icon="inline-start" />
            {{ $t('common.actions.confirm') }}
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
      return clusterTokenError(token, { translator: this.$t });
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
          this.loadError = err.message || this.$t('rooms.token.feedback.readFailed');
          toast.error(this.$t('rooms.token.feedback.fetchFailed', { error: this.loadError }));
        })
        .finally(() => {
          this.loading = false;
        });
    },

    // 复制令牌到剪贴板
    async copyToken() {
      if (!this.tokenRevealed) {
        toast.warning(this.$t('rooms.token.feedback.revealFirst'));
        return;
      }
      try {
        await navigator.clipboard.writeText(this.serverToken);
        toast.success(this.$t('rooms.token.feedback.copied'));
      } catch (error) {
        toast.error(this.$t('rooms.token.feedback.copyFailed', {
          error: error.message || this.$t('rooms.token.feedback.copyPermission')
        }));
      }
    },

    async revealToken() {
      try {
        const result = await promptText(
          this.$t('rooms.token.feedback.revealPrompt', { room: this.roomName }),
          this.$t('rooms.token.feedback.revealTitle'),
          {
            confirmButtonText: this.$t('rooms.token.reveal'),
            cancelButtonText: this.$t('common.actions.cancel'),
            inputPlaceholder: this.roomName,
            inputValidator: value => value === this.roomName || this.$t('rooms.token.feedback.roomNameMismatch')
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
          toast.error(this.$t('rooms.token.feedback.revealFailed', {
            error: error.message || this.$t('rooms.token.feedback.revealConfirmationFailed')
          }));
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
        confirmation: this.tokenForm.confirmation === this.roomName ? '' : this.$t('rooms.token.feedback.confirmationRequired')
      };
      if (this.tokenErrors.token || this.tokenErrors.confirmation) return;
      this.submitting = true;
      const saveToUse = this.roomValue || this.currentSave;
      const newToken = this.tokenForm.token;
      serverApi.updateServerToken(saveToUse, newToken, this.tokenForm.confirmation)
        .then(() => {
          this.dialogVisible = false;
          toast.success(this.$t('rooms.token.feedback.updated'));
          this.fetchServerToken();
        })
        .catch(err => {
          toast.error(this.$t('rooms.token.feedback.updateFailed', {
            error: err.message || this.$t('common.errors.unknown')
          }));
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
        this.roomLoadError = error.message || this.$t('rooms.selector.readFailed');
      } finally {
        this.loadingRooms = false;
      }
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
