<template>
  <div class="server-token-page">
    <header v-if="!savename && !pendingMode" class="page-header">
      <h1>{{ $t('rooms.token.title') }}</h1>
      <p>{{ $t('rooms.token.subtitle') }}</p>
    </header>

    <RoomScopeSelect v-if="!savename && !pendingMode" v-model="selectedRoomId" :rooms="roomOptions" :loading="loadingRooms" />

    <Alert v-if="roomLoadError" variant="destructive"><CircleAlert /><AlertTitle>{{ $t('rooms.selector.loadFailed') }}</AlertTitle><AlertDescription>{{ roomLoadError }}</AlertDescription></Alert>

    <Card v-if="pendingMode || roomValue">
      <CardHeader>
        <CardTitle>{{ $t('rooms.token.title') }}</CardTitle>
        <CardDescription>{{ $t('rooms.token.cardDescription') }}</CardDescription>
        <CardAction v-if="roomValue || serverToken || availableSourceRooms.length > 0" class="token-actions max-sm:col-span-full max-sm:row-auto max-sm:justify-self-stretch">
          <UiButton
            v-if="availableSourceRooms.length > 0"
            size="sm"
            variant="outline"
            @click="openCopyDialog">
            <Copy data-icon="inline-start" />
            {{ $t('rooms.copy.action') }}
          </UiButton>
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

    <UiDialog v-model:open="copyDialogVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ $t('rooms.token.copyFromRoom.title') }}</DialogTitle>
          <DialogDescription>{{ $t('rooms.token.copyFromRoom.description') }}</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel for="token-copy-source-room">{{ $t('rooms.copy.sourceRoom') }}</FieldLabel>
            <UiSelect v-model="copySourceRoomId" :disabled="copySourceLoading || copyingToken" @update:model-value="loadCopyTokenStatus">
              <SelectTrigger id="token-copy-source-room"><SelectValue :placeholder="$t('rooms.copy.sourcePlaceholder')" /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem v-for="room in availableSourceRooms" :key="room.id" :value="room.id">{{ room.name }}</SelectItem></SelectGroup></SelectContent>
            </UiSelect>
            <FieldDescription v-if="copySourceLoading">{{ $t('rooms.token.copyFromRoom.checking') }}</FieldDescription>
            <FieldDescription v-else-if="copySourceRoomId">{{ $t(copySourceConfigured ? 'rooms.token.copyFromRoom.configured' : 'rooms.token.copyFromRoom.notConfigured') }}</FieldDescription>
          </Field>

          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>{{ $t('rooms.token.copyFromRoom.warning') }}</AlertTitle>
            <AlertDescription>{{ $t('rooms.token.copyFromRoom.warningDescription') }}</AlertDescription>
          </Alert>
        </FieldGroup>

        <DialogFooter>
          <UiButton variant="outline" @click="copyDialogVisible = false">{{ $t('common.actions.cancel') }}</UiButton>
          <UiButton :disabled="copyingToken || copySourceLoading || !copySourceConfigured" @click="copyTokenFromRoom">
            <Spinner v-if="copyingToken" data-icon="inline-start" />
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
import { confirmAction } from '@/lib/feedback';
import { clusterTokenError } from '@/lib/clusterToken.mjs';

export default {
  name: 'ServerToken',
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
    },
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
        token: ''
      },
      submitting: false,

      // 表单相关
      ruleForm: {
        token: ''
      },
      ruleFormError: '',
      tokenErrors: { token: '' },
      loadingRooms: false,
      roomLoadError: '',
      roomOptions: [],
      selectedRoomId: '',
      copyDialogVisible: false,
      copySourceRoomId: '',
      copySourceConfigured: false,
      copySourceLoading: false,
      copyingToken: false

    };
  },
  computed: {
    roomValue() {
      return this.savename || this.selectedRoomId;
    },
    availableSourceRooms() {
      return this.roomOptions.filter(room => room.id !== this.roomValue);
    },
    copySourceRoom() {
      return this.availableSourceRooms.find(room => room.id === this.copySourceRoomId) || null;
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

    openCopyDialog() {
      if (this.availableSourceRooms.length === 0) {
        toast.info(this.$t('rooms.copy.noSourceRooms'));
        return;
      }
      this.copySourceRoomId = this.availableSourceRooms[0].id;
      this.copyDialogVisible = true;
      this.loadCopyTokenStatus(this.copySourceRoomId);
    },

    async loadCopyTokenStatus(roomId) {
      this.copySourceConfigured = false;
      this.copySourceLoading = true;
      try {
        const response = await serverApi.getServerTokenStatus(roomId);
        this.copySourceConfigured = Boolean(response.data?.configured);
      } catch (error) {
        toast.error(this.$t('rooms.token.copyFromRoom.loadFailed', { error: error.message || this.$t('common.errors.unknown') }));
      } finally {
        this.copySourceLoading = false;
      }
    },

    async copyTokenFromRoom() {
      if (this.copyingToken || !this.copySourceRoom || !this.copySourceConfigured) return;
      this.copyingToken = true;
      try {
		const response = await serverApi.revealServerToken(this.copySourceRoom.id);
        const token = response.data || '';
        const tokenError = this.validateToken(token);
        if (tokenError) throw new Error(tokenError);

        if (this.pendingMode) {
          this.ruleForm.token = token;
          this.handleInput();
        } else {
          await serverApi.updateServerToken(this.roomValue, token);
          await this.fetchServerToken();
        }
        this.copyDialogVisible = false;
        toast.success(this.$t('rooms.token.copyFromRoom.success', { room: this.copySourceRoom.name }));
      } catch (error) {
        if (error?.code === 'NO_CONFIGURATION_CHANGES') {
          this.copyDialogVisible = false;
          toast.info(this.$t('rooms.token.copyFromRoom.alreadySame'));
          return;
        }
        toast.error(this.$t('rooms.token.copyFromRoom.failed', { error: error.message || this.$t('common.errors.unknown') }));
      } finally {
        this.copyingToken = false;
      }
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
        await confirmAction(
          this.$t('rooms.token.feedback.revealPrompt', { room: this.roomName }),
          this.$t('rooms.token.feedback.revealTitle'),
          {
            confirmButtonText: this.$t('rooms.token.reveal'),
            cancelButtonText: this.$t('common.actions.cancel'),
            type: 'warning'
          }
        );
        this.loading = true;
		const response = await serverApi.revealServerToken(this.roomValue || this.currentSave);
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
        token: ''
      };
      this.dialogVisible = true;
    },

    // 重置表单
    resetForm() {
      this.tokenForm = {
        token: ''
      };
      this.tokenErrors = { token: '' };
    },

    handleDialogOpenChange(open) {
      if (!open) this.resetForm();
    },

    // 提交表单
    submitTokenForm() {
      this.tokenErrors = {
        token: this.validateToken(this.tokenForm.token)
      };
      if (this.tokenErrors.token) return;
      this.submitting = true;
      const saveToUse = this.roomValue || this.currentSave;
      const newToken = this.tokenForm.token;
      serverApi.updateServerToken(saveToUse, newToken)
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
  created() {
    this.fetchRoomOptions();
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
