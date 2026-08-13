<template>
  <div class="room-settings-page">
    <header class="page-header">
      <div class="title-section">
        <div class="title-row">
          <h1>{{ $t(isEdit ? 'rooms.settings.editTitle' : 'rooms.settings.createTitle') }}</h1>
          <span class="change-state" :data-dirty="unsavedChanges">
            <span class="change-state-dot" aria-hidden="true"></span>
            {{ changeStateLabel }}
          </span>
        </div>
        <p>{{ $t(isEdit ? 'rooms.settings.editSubtitle' : 'rooms.settings.createSubtitle') }}</p>
        <code v-if="isEdit && roomId" class="room-reference">{{ roomId }}</code>
      </div>
      <div class="header-actions">
        <UiButton variant="outline" @click="goBack"><ArrowLeft data-icon="inline-start" />{{ $t('rooms.settings.back') }}</UiButton>
        <UiButton @click="saveSettings" :disabled="saveDisabled">
          <Spinner v-if="saving" data-icon="inline-start" />
          <Save v-else data-icon="inline-start" />
          {{ saveButtonLabel }}
        </UiButton>
      </div>
    </header>

    <div v-if="loading && !saving" class="loading-state">
      <Spinner />
      <span>{{ $t('rooms.settings.loading') }}</span>
    </div>

    <Alert v-if="loadError" variant="destructive" class="error-alert">
      <TriangleAlert />
      <AlertTitle>{{ $t('rooms.settings.loadFailed') }}</AlertTitle>
      <AlertDescription class="load-error-description">
        <span>{{ loadError }}</span>
        <UiButton variant="outline" size="sm" @click="loadRoomSettings(roomId)">
          <RefreshCw data-icon="inline-start" />
          {{ $t('rooms.settings.reload') }}
        </UiButton>
      </AlertDescription>
    </Alert>

    <Alert v-if="formErrors.length > 0" ref="validationAlert" variant="destructive" class="error-alert" tabindex="-1">
      <TriangleAlert />
      <AlertTitle>{{ $t('rooms.settings.validationFailed') }}</AlertTitle>
      <AlertDescription>
        <ul class="error-list">
          <li v-for="(error, index) in formErrors" :key="index">{{ error }}</li>
        </ul>
      </AlertDescription>
    </Alert>

    <Card v-if="!isEdit" size="sm" class="save-name-card">
      <CardHeader>
        <CardTitle class="section-title"><FolderKey />{{ $t('rooms.settings.identity') }}</CardTitle>
        <CardDescription>{{ $t('rooms.settings.identityDescription') }}</CardDescription>
        <CardAction><Badge variant="outline">{{ $t('rooms.settings.lockedAfterCreate') }}</Badge></CardAction>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field :data-invalid="Boolean(saveNameError)">
            <FieldLabel for="room-savename">{{ $t('rooms.settings.archiveName') }}</FieldLabel>
            <UiInput
              id="room-savename"
              v-model.trim="saveNameForm.savename"
              :placeholder="$t('rooms.settings.archiveNamePlaceholder')"
              :aria-invalid="Boolean(saveNameError)"
              autocomplete="off"
              :maxlength="archiveNameMaxLength"
              @input="clearSaveNameError"
            />
            <FieldDescription>{{ $t('rooms.settings.archiveNameDescription') }}</FieldDescription>
            <FieldError v-if="saveNameError">{{ saveNameError }}</FieldError>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>

    <Tabs v-if="!loadError" v-model="activeTab" orientation="horizontal" class="settings-tabs">
      <div class="settings-tabs-nav">
        <TabsList variant="line" class="settings-tab-list" :aria-label="$t('rooms.settings.categoriesAria')">
          <TabsTrigger v-for="section in settingsSections" :key="section.key" :value="section.key" class="settings-tab-trigger">
            <component :is="section.icon" />
            {{ section.tabLabel }}
          </TabsTrigger>
          <TabsTrigger value="special-lists" class="settings-tab-trigger"><ListChecks />{{ $t('rooms.settings.specialLists') }}</TabsTrigger>
          <TabsTrigger value="token" class="settings-tab-trigger"><KeyRound />{{ $t('rooms.settings.serverToken') }}</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent v-for="section in settingsSections" :key="section.key" :value="section.key" class="settings-tab-content">
        <Card size="sm" class="settings-section-card">
          <CardHeader>
            <CardTitle class="section-title">
              <component :is="section.icon" />
              {{ section.title }}
            </CardTitle>
            <CardDescription>{{ section.description }}</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup class="settings-grid">
              <Field
                v-for="field in section.fields"
                :key="field.key"
                :orientation="field.type === 'switch' ? 'horizontal' : 'vertical'"
                :data-invalid="isFieldInvalid(field.key)"
                :data-disabled="isFieldDisabled(field) || undefined"
                :class="[
                  'setting-field',
                  {
                    'setting-field--switch': field.type === 'switch',
                    'setting-field--wide': field.type === 'textarea' || field.wide
                  }
                ]"
              >
                <FieldContent>
                  <FieldLabel :for="`room-setting-${field.key}`">
                    {{ field.label }}<span v-if="field.required" class="required-indicator" aria-hidden="true">*</span>
                  </FieldLabel>
                  <FieldDescription>{{ field.description }}</FieldDescription>
                  <div v-if="field.constraint" class="field-constraint">
                    <Badge variant="outline">{{ $t('rooms.settings.constraintLabel') }}</Badge>
                    <span>{{ field.constraint }}</span>
                  </div>
                  <FieldError v-if="isFieldInvalid(field.key)">{{ getFieldError(field.key) }}</FieldError>
                </FieldContent>

                <UiSelect v-if="field.type === 'select'" v-model="form[field.key]" :disabled="isFieldDisabled(field)" @update:model-value="clearFieldError(field.key)">
                  <SelectTrigger :id="`room-setting-${field.key}`" :aria-invalid="isFieldInvalid(field.key)">
                    <SelectValue :placeholder="field.placeholder || $t('rooms.settings.selectPlaceholder')" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem v-for="option in field.options" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </UiSelect>

                <UiTextarea
                  v-else-if="field.type === 'textarea'"
                  :id="`room-setting-${field.key}`"
                  v-model="form[field.key]"
                  :rows="field.rows || 3"
                  :maxlength="field.maxLength"
                  :aria-invalid="isFieldInvalid(field.key)"
                  :disabled="isFieldDisabled(field)"
                  @input="clearFieldError(field.key)"
                  @blur="validateField(field)"
                />

                <UiSwitch
                  v-else-if="field.type === 'switch'"
                  :id="`room-setting-${field.key}`"
                  v-model="form[field.key]"
                  :aria-invalid="isFieldInvalid(field.key)"
                  :disabled="isFieldDisabled(field)"
                  @update:model-value="clearFieldError(field.key)"
                />

                <InputGroup v-else-if="field.sensitive">
                  <InputGroupInput
                    :id="`room-setting-${field.key}`"
                    v-model="form[field.key]"
                    :type="revealedFields[field.key] ? 'text' : 'password'"
                    :placeholder="field.placeholder"
                    :autocomplete="field.autocomplete || 'off'"
                    :maxlength="field.maxLength"
                    :aria-invalid="isFieldInvalid(field.key)"
                    :required="field.required"
                    :disabled="isFieldDisabled(field)"
                    @input="clearFieldError(field.key)"
                    @blur="validateField(field)"
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      :aria-label="$t(revealedFields[field.key] ? 'rooms.settings.hideField' : 'rooms.settings.showField', { field: field.label })"
                      :title="$t(revealedFields[field.key] ? 'rooms.settings.hideField' : 'rooms.settings.showField', { field: field.label })"
                      @click="toggleSensitiveField(field.key)"
                    >
                      <EyeOff v-if="revealedFields[field.key]" />
                      <Eye v-else />
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>

                <UiInput
                  v-else
                  :id="`room-setting-${field.key}`"
                  v-model="form[field.key]"
                  :type="field.type === 'number' ? 'number' : 'text'"
                  :min="field.min"
                  :max="field.max"
                  :step="field.type === 'number' ? 1 : undefined"
                  :maxlength="field.type === 'number' ? undefined : field.maxLength"
                  :placeholder="field.placeholder"
                  :aria-invalid="isFieldInvalid(field.key)"
                  :required="field.required"
                  :autocomplete="field.autocomplete || 'off'"
                  :disabled="isFieldDisabled(field)"
                  @input="clearFieldError(field.key)"
                  @blur="validateField(field)"
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="special-lists" class="settings-tab-content">
        <SpecialLists :savename="roomId" :room-name="form.cluster_name" :pending-mode="!isEdit" @add-user="handleAddUser" />
      </TabsContent>

      <TabsContent value="token" class="settings-tab-content">
        <ServerToken :savename="roomId" :pending-mode="!isEdit" @input-token="handleInputToken" />
      </TabsContent>
    </Tabs>
  </div>
</template>

<script>
import { ArrowLeft, Eye, EyeOff, FolderKey, Gamepad2, GitBranch, KeyRound, ListChecks, Network, RefreshCw, Save, Settings2, TriangleAlert } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { roomConfigApi, serverApi } from '../../api/index';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch as UiSwitch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea as UiTextarea } from '@/components/ui/textarea';
import { confirmAction } from '@/lib/feedback';
import { clusterTokenError } from '@/lib/clusterToken.mjs';
import {
  ROOM_ARCHIVE_RULE,
  frontendRoomFieldKey,
  roomFieldRule,
  validateRoomField,
  validateRoomSettings
} from '@/lib/roomSettingsValidation.mjs';
import SpecialLists from './SpecialLists.vue';
import ServerToken from './ServerToken.vue';

const SETTINGS_SECTIONS = [
  {
    key: 'gameplay',
    icon: Gamepad2,
    fields: [
      { key: 'game_mode', type: 'select', options: ['survival', 'endless', 'wilderness'] },
      { key: 'max_players', type: 'number', min: 1, max: 64 },
      { key: 'pvp', type: 'switch' },
      { key: 'pause_when_empty', type: 'switch' },
      { key: 'vote_enabled', type: 'switch' },
      { key: 'vote_kick_enabled', type: 'switch' }
    ]
  },
  {
    key: 'network',
    icon: Network,
    fields: [
      { key: 'cluster_name', type: 'text', required: true },
      { key: 'cluster_description', type: 'text', wide: true },
      { key: 'cluster_password', type: 'text', sensitive: true, autocomplete: 'new-password' },
      { key: 'cluster_intention', type: 'select', options: ['cooperative', 'competitive', 'social', 'madness'] },
      { key: 'cluster_language', type: 'select', options: ['zh', 'en'] },
      { key: 'whitelist_slots', type: 'number', min: 0 },
      { key: 'tick_rate', type: 'number', min: 15, max: 60 },
      { key: 'idle_timeout', type: 'number', min: 0 },
      { key: 'lan_only_cluster', type: 'switch' },
      { key: 'offline_cluster', type: 'switch' },
      { key: 'autosaver_enabled', type: 'switch' }
    ]
  },
  {
    key: 'system',
    icon: Settings2,
    fields: [
      { key: 'console_enabled', type: 'switch' },
      { key: 'max_snapshots', type: 'number', min: 1 }
    ]
  },
  {
    key: 'shard',
    icon: GitBranch,
    fields: [
      { key: 'shard_enabled', type: 'switch' },
      { key: 'bind_ip', type: 'text', disabledWhen: 'shard_enabled' },
      { key: 'master_ip', type: 'text', disabledWhen: 'shard_enabled' },
      { key: 'master_port', type: 'number', min: 1, max: 65535, required: true, disabledWhen: 'shard_enabled' },
      { key: 'cluster_key', type: 'text', required: true, sensitive: true, autocomplete: 'new-password', disabledWhen: 'shard_enabled' }
    ]
  },
  {
    key: 'steam',
    icon: Settings2,
    fields: [
      { key: 'steam_group_only', type: 'switch' },
      { key: 'steam_group_id', type: 'number', min: 0, disabledWhen: 'steam_group_only' },
      { key: 'steam_group_admins', type: 'switch', disabledWhen: 'steam_group_only' }
    ]
  }
];

export default {
  name: 'RoomSettings',
  components: {
    Alert,
    AlertDescription,
    AlertTitle,
    ArrowLeft,
    Badge,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    Eye,
    EyeOff,
    FolderKey,
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
    KeyRound,
    ListChecks,
    RefreshCw,
    Save,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Spinner,
    SpecialLists,
    ServerToken,
    UiSwitch,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    TriangleAlert,
    UiButton,
    UiInput,
    UiSelect,
    UiTextarea
  },
  data() {
    return {
      activeTab: 'gameplay',
      isEdit: false,
      roomId: '',
      savename: '',
      saveNameForm: {
        savename: ''
      },
      saveNameError: '',
      archiveNameMaxLength: ROOM_ARCHIVE_RULE.maxLength,
      form: {
        // 游戏模式配置
        game_mode: 'endless',
        max_players: 12,
        pvp: false,
        pause_when_empty: true,
        vote_enabled: false,
        vote_kick_enabled: false,

        // 网络配置
        lan_only_cluster: false,
        cluster_intention: 'cooperative',
        cluster_password: '',
        cluster_description: '',
        cluster_name: '',
        offline_cluster: false,
        cluster_language: 'zh',
        whitelist_slots: 0,
        tick_rate: 15,
        autosaver_enabled: true,
        idle_timeout: 0,

        // 杂项配置
        console_enabled: true,
        max_snapshots: 10,

        // 分片配置
        shard_enabled: true,
        bind_ip: '0.0.0.0',
        master_ip: '0.0.0.0',
        master_port: 10888,
        cluster_key: 'defaultpasswd',

        // Steam配置
        steam_group_only: false,
        steam_group_id: 0,
        steam_group_admins: false,

        // 特殊名单
        adminList: [],
        blockList: [],
        whiteList: [],

        // 服务器令牌
        serverToken: ''
      },
      validationErrors: {},
      loading: false,
      loadError: '',
      formErrors: [],
      unsavedChanges: false,
      baselineFingerprint: '',
      saving: false,
      revealedFields: {},
      roomSchema: []
    }
  },
  computed: {
    settingsSections() {
      return SETTINGS_SECTIONS.map(section => ({
        ...section,
        tabLabel: this.$t(`rooms.settings.sections.${section.key}.tab`),
        title: this.$t(`rooms.settings.sections.${section.key}.title`),
        description: this.$t(`rooms.settings.sections.${section.key}.description`),
        fields: section.fields.map(field => {
          const fieldKey = `rooms.settings.fields.${field.key}`;
          const placeholderKey = `${fieldKey}.placeholder`;
          const rule = roomFieldRule(field.key, this.form, this.roomSchema);
          const constraintKey = `${fieldKey}.constraint`;
          return {
            ...field,
            ...rule,
            label: this.$t(`${fieldKey}.label`),
            description: this.$t(`${fieldKey}.description`),
            constraint: this.$te(constraintKey)
              ? this.$t(constraintKey, {
                  min: rule.min,
                  max: rule.max,
                  maxPlayers: this.form.max_players,
                  maxLength: rule.maxLength,
                  maxBytes: rule.maxBytes
                })
              : '',
            placeholder: this.$te(placeholderKey) ? this.$t(placeholderKey) : '',
            options: (field.options || []).map(value => ({
              value,
              label: this.$t(`rooms.settings.options.${value}`)
            }))
          };
        })
      }));
    },
    changeStateLabel() {
      if (this.saving) return this.$t(this.isEdit ? 'rooms.settings.state.saving' : 'rooms.settings.state.creating');
      if (!this.isEdit) return this.$t(this.unsavedChanges ? 'rooms.settings.state.unsaved' : 'rooms.settings.state.pending');
      return this.$t(this.unsavedChanges ? 'rooms.settings.state.dirty' : 'rooms.settings.state.saved');
    },
    saveButtonLabel() {
      if (this.saving) return this.$t(this.isEdit ? 'rooms.settings.state.savingButton' : 'rooms.settings.state.creatingButton');
      return this.$t(this.isEdit ? 'rooms.settings.state.save' : 'rooms.settings.state.create');
    },
    saveDisabled() {
      return this.loading || this.saving || Boolean(this.loadError) || (this.isEdit && !this.unsavedChanges);
    }
  },
  created() {
    // 检查是否是编辑模式
    const roomId = this.$route.query.id;
    if (roomId) {
      this.isEdit = true;
      this.roomId = roomId;
      this.loadRoomSettings(roomId);
    } else {
      this.$nextTick(() => this.captureBaseline());
    }
  },
  mounted() {
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  },
  beforeUnmount() {
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  },
  methods: {
    getFormFingerprint() {
      return JSON.stringify({ saveNameForm: this.saveNameForm, form: this.form });
    },
    captureBaseline() {
      this.baselineFingerprint = this.getFormFingerprint();
      this.unsavedChanges = false;
    },
    updateDirtyState() {
      if (!this.baselineFingerprint) return;
      this.unsavedChanges = this.getFormFingerprint() !== this.baselineFingerprint;
    },
    handleBeforeUnload(event) {
      if (!this.unsavedChanges || this.saving) return;
      event.preventDefault();
      event.returnValue = '';
    },
    clearFieldError(key) {
      if (!this.validationErrors[key]) return;
      const errors = { ...this.validationErrors };
      delete errors[key];
      this.validationErrors = errors;
      this.formErrors = Object.values(errors);
      if (this.saveNameError) this.formErrors.unshift(this.saveNameError);
    },
    clearSaveNameError() {
      if (!this.saveNameError) return;
      this.saveNameError = '';
      this.formErrors = Object.values(this.validationErrors);
    },
    toggleSensitiveField(key) {
      this.revealedFields = { ...this.revealedFields, [key]: !this.revealedFields[key] };
    },
    isFieldDisabled(field) {
      return Boolean(field.disabledWhen && !this.form[field.disabledWhen]);
    },
    focusFirstError() {
      let targetId = '';
      if (this.saveNameError) {
        targetId = 'room-savename';
      } else {
        const invalidKey = Object.keys(this.validationErrors)[0];
        const invalidSection = this.settingsSections.find(section => section.fields.some(field => field.key === invalidKey));
        if (invalidSection) this.activeTab = invalidSection.key;
        if (invalidKey) targetId = `room-setting-${invalidKey}`;
      }
      this.$nextTick(() => {
        const target = targetId ? document.getElementById(targetId) : this.$refs.validationAlert?.$el;
        target?.focus?.();
        target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      });
    },
    getFieldError(key) {
      return this.validationErrors[key] || '';
    },
    isFieldInvalid(key) {
      return Boolean(this.validationErrors[key]);
    },
    validationMessage(key, error) {
      if (!error) return '';
      const field = this.settingsSections.flatMap(section => section.fields).find(item => item.key === key);
      const label = field?.label || key;
      return this.$t(`rooms.settings.validation.${error.code}`, { label, ...error });
    },
    validateField(field) {
      if (this.isFieldDisabled(field)) {
        this.clearFieldError(field.key);
        return true;
      }
      const errors = { ...this.validationErrors };
      const keys = field.key === 'max_players' ? [field.key, 'whitelist_slots'] : [field.key];
      keys.forEach(key => {
        const target = this.settingsSections.flatMap(section => section.fields).find(item => item.key === key);
        if (!target || this.isFieldDisabled(target)) {
          delete errors[key];
          return;
        }
        const result = validateRoomField(key, this.form[key], this.form, this.roomSchema);
        if (result) errors[key] = this.validationMessage(key, result);
        else delete errors[key];
      });
      this.validationErrors = errors;
      this.formErrors = Object.values(errors);
      if (this.saveNameError) this.formErrors.unshift(this.saveNameError);
      return !errors[field.key];
    },
    validateSettings() {
      const results = validateRoomSettings(
        this.form,
        this.roomSchema,
        key => {
          const field = this.settingsSections.flatMap(section => section.fields).find(item => item.key === key);
          return field ? this.isFieldDisabled(field) : false;
        }
      );
      const errors = Object.fromEntries(
        Object.entries(results).map(([key, error]) => [key, this.validationMessage(key, error)])
      );
      this.validationErrors = errors;

      this.saveNameError = '';
      if (!this.isEdit) {
        if (!this.saveNameForm.savename) this.saveNameError = this.$t('rooms.settings.validation.archiveName');
        else if (!ROOM_ARCHIVE_RULE.pattern.test(this.saveNameForm.savename)) this.saveNameError = this.$t('rooms.settings.validation.archiveNameInvalid');
      }

      const validationMessages = [...Object.values(errors)];
      if (this.saveNameError) validationMessages.unshift(this.saveNameError);
      this.formErrors = validationMessages;
      return validationMessages.length === 0;
    },
    goBack() {
      this.$router.push('/rooms/list');
    },
    handleAddUser(users) {
      this.form.adminList = users.admin;
      this.form.blockList = users.block;
      this.form.whiteList = users.white;
      this.updateDirtyState();
    },
    handleInputToken(token) {
      this.form.serverToken = token;
      this.updateDirtyState();
    },
    async loadRoomSettings(roomId, { notify = true } = {}) {
      try {
        this.loading = true;
        this.loadError = '';
        this.formErrors = [];
        const response = await roomConfigApi.getRoomConfig(roomId);
        
        if (response && response.status === 200 && response.data) {
          // 适配新的嵌套数据结构
          const configData = response.data;
          this.roomSchema = Array.isArray(configData.__schema) ? configData.__schema : [];
          
          // 处理GAMEPLAY部分
          if (configData.GAMEPLAY) {
            this.form.game_mode = configData.GAMEPLAY.game_mode ?? this.form.game_mode;
            this.form.max_players = parseInt(configData.GAMEPLAY.max_players ?? this.form.max_players, 10);
            this.form.pvp = configData.GAMEPLAY.pvp === 'true';
            this.form.pause_when_empty = configData.GAMEPLAY.pause_when_empty === 'yes' || configData.GAMEPLAY.pause_when_empty === 'true';
            this.form.vote_enabled = configData.GAMEPLAY.vote_enabled === 'true';
            this.form.vote_kick_enabled = configData.GAMEPLAY.vote_kick_enabled === 'true';
          }
          
          // 处理NETWORK部分
          if (configData.NETWORK) {
            this.form.lan_only_cluster = configData.NETWORK.lan_only_cluster === 'true';
            this.form.cluster_intention = configData.NETWORK.cluster_intention ?? this.form.cluster_intention;
            this.form.cluster_password = configData.NETWORK.cluster_password ?? '';
            this.form.cluster_description = configData.NETWORK.cluster_description ?? '';
            this.form.cluster_name = configData.NETWORK.cluster_name ?? '';
            this.form.offline_cluster = configData.NETWORK.offline_cluster === 'true';
            this.form.cluster_language = configData.NETWORK.cluster_language ?? this.form.cluster_language;
            this.form.whitelist_slots = parseInt(configData.NETWORK.whitelist_slots ?? this.form.whitelist_slots, 10);
            this.form.tick_rate = parseInt(configData.NETWORK.tick_rate ?? this.form.tick_rate, 10);
            this.form.autosaver_enabled = configData.NETWORK.autosaver_enabled === 'true';
            this.form.idle_timeout = parseInt(configData.NETWORK.idle_timeout ?? this.form.idle_timeout, 10);
          }
          
          // 处理MISC部分
          if (configData.MISC) {
            this.form.console_enabled = configData.MISC.console_enabled === 'true';
            this.form.max_snapshots = parseInt(configData.MISC.max_snapshots ?? this.form.max_snapshots, 10);
          }
          
          // 处理SHARD部分
          if (configData.SHARD) {
            this.form.shard_enabled = configData.SHARD.shard_enabled === 'true';
            this.form.bind_ip = configData.SHARD.bind_ip ?? '';
            this.form.master_ip = configData.SHARD.master_ip ?? '';
            this.form.master_port = parseInt(configData.SHARD.master_port ?? this.form.master_port, 10);
            this.form.cluster_key = configData.SHARD.cluster_key ?? '';
          }
          
          // 处理STEAM部分
          if (configData.STEAM) {
            this.form.steam_group_only = configData.STEAM.steam_group_only === 'true';
            this.form.steam_group_id = parseInt(configData.STEAM.steam_group_id ?? this.form.steam_group_id, 10);
            this.form.steam_group_admins = configData.STEAM.steam_group_admins === 'true';
          }
          
          if (notify) toast.success(this.$t('rooms.settings.feedback.loaded'));
          this.captureBaseline();
        } else {
          throw new Error(this.$t('rooms.settings.feedback.loadFailed'));
        }
      } catch (error) {
        console.error('Failed to load room configuration:', error);
        this.loadError = this.handleError(error, this.$t('rooms.settings.feedback.loadingFailed'));
      } finally {
        this.loading = false;
      }
    },
    async saveSettings() {
      try {
        this.formErrors = [];
        const pendingListErrors = [];
        
        if (!this.validateSettings()) {
          toast.error(this.$t('rooms.settings.validation.completeForm'));
          this.focusFirstError();
          return;
        }
        if (!this.isEdit) this.savename = this.saveNameForm.savename;
        if (!this.isEdit && !this.form.offline_cluster) {
          const tokenError = clusterTokenError(this.form.serverToken, { translator: this.$t });
          if (tokenError) {
            toast.error(tokenError);
            this.activeTab = 'token';
            this.$nextTick(() => document.getElementById('server-token')?.focus());
            return;
          }
        }
        
        // 将表单数据转换为API所需的格式
        const convertedData = {
          GAMEPLAY: {
            game_mode: this.form.game_mode.toString(),
            max_players: this.form.max_players.toString(),
            pvp: this.form.pvp.toString(),
            pause_when_empty: this.form.pause_when_empty ? "yes" : "no",
            vote_enabled: this.form.vote_enabled.toString(),
            vote_kick_enabled: this.form.vote_kick_enabled.toString()
          },
          NETWORK: {
            lan_only_cluster: this.form.lan_only_cluster.toString(),
            cluster_intention: this.form.cluster_intention,
            cluster_password: this.form.cluster_password,
            cluster_description: this.form.cluster_description,
            cluster_name: this.form.cluster_name,
            offline_cluster: this.form.offline_cluster.toString(),
            cluster_language: this.form.cluster_language,
            whitelist_slots: this.form.whitelist_slots.toString(),
            tick_rate: this.form.tick_rate.toString(),
            autosaver_enabled: this.form.autosaver_enabled.toString(),
            idle_timeout: this.form.idle_timeout.toString()
          },
          MISC: {
            console_enabled: this.form.console_enabled.toString(),
            max_snapshots: this.form.max_snapshots.toString()
          },
          SHARD: {
            shard_enabled: this.form.shard_enabled.toString(),
            bind_ip: this.form.bind_ip,
            master_ip: this.form.master_ip,
            master_port: this.form.master_port.toString(),
            cluster_key: this.form.cluster_key
          },
          STEAM: {
            steam_group_only: this.form.steam_group_only.toString(),
            steam_group_id: this.form.steam_group_id.toString(),
            steam_group_admins: this.form.steam_group_admins.toString()
          }
        };
        
        this.saving = true;
        if (this.isEdit) {
          // 编辑模式: 使用已有的roomId
          await roomConfigApi.saveRoomConfig(this.roomId, convertedData);
          await this.loadRoomSettings(this.roomId, { notify: false });
        } else {
          // 创建模式: v2 会先真实创建房间，再应用完整 cluster.ini 配置。
          const created = await roomConfigApi.createRoom(
            this.savename,
            convertedData,
            this.form.serverToken
          );
          const createdRoom = created.data;
          const roomValue = createdRoom.id || this.savename;
          this.roomId = roomValue;
          this.savename = createdRoom.name || this.savename;
          this.isEdit = true;
          await this.$router.replace({
            path: this.$route.path,
            query: { ...this.$route.query, id: roomValue }
          });
          const { adminList, blockList, whiteList } = this.form;
          // 每次名单写入都会生成新 revision，必须按顺序应用。
          const pendingLists = [
            { label: this.$t('rooms.settings.lists.administrators'), values: adminList, update: serverApi.updateAdminList },
            { label: this.$t('rooms.settings.lists.blocklist'), values: blockList, update: serverApi.updateBlockList },
            { label: this.$t('rooms.settings.lists.allowlist'), values: whiteList, update: serverApi.updateWhiteList }
          ];
          for (const list of pendingLists) {
            if (!list.values.length) continue;
            try {
              await list.update(roomValue, list.values);
            } catch (error) {
              pendingListErrors.push(`${list.label}: ${error.message || this.$t('rooms.settings.feedback.listWriteFailed')}`);
            }
          }
          await this.loadRoomSettings(roomValue, { notify: false });
        }

        if (pendingListErrors.length) {
          toast.warning(this.$t('rooms.settings.feedback.partialLists', { errors: pendingListErrors.join('; ') }));
        } else {
          toast.success(this.$t('rooms.settings.feedback.saved'));
        }
        this.captureBaseline();
      } catch (error) {
        console.error('Failed to save room configuration:', error);
        this.handleError(error, this.$t('rooms.settings.feedback.saveFailed'));
      } finally {
        this.saving = false;
      }
    },
    handleError(error, defaultMessage) {
      let errorMessage = error.message || defaultMessage;

      if (error.details && error.details.fields) {
        const fieldErrors = Object.fromEntries(
          Object.entries(error.details.fields).map(([key, message]) => [frontendRoomFieldKey(key), message])
        );
        this.validationErrors = { ...this.validationErrors, ...fieldErrors };
        this.formErrors = Object.values(this.validationErrors);
        this.focusFirstError();
      }
      
      if (error.response) {
        // 处理HTTP错误
        switch (error.response.status) {
          case 400:
            errorMessage = this.$t('rooms.settings.feedback.badRequest');
            break;
          case 401:
            errorMessage = this.$t('rooms.settings.feedback.unauthorized');
            break;
          case 403:
            errorMessage = this.$t('rooms.settings.feedback.forbidden');
            break;
          case 404:
            errorMessage = this.$t('rooms.settings.feedback.notFound');
            break;
          case 500:
            errorMessage = this.$t('rooms.settings.feedback.serverError');
            break;
          default:
            errorMessage = this.$t('rooms.settings.feedback.requestFailed', { status: error.response.status });
        }
        
        // 如果有详细的错误信息，添加到表单错误列表
        if (error.response.data && error.response.data.errors) {
          this.formErrors = Array.isArray(error.response.data.errors) 
            ? error.response.data.errors 
            : [error.response.data.errors];
        }
      } else if (error.request) {
        errorMessage = this.$t('rooms.settings.feedback.networkFailed');
      }
      
      toast.error(errorMessage);
      return errorMessage;
    }
  },
  watch: {
    form: {
      deep: true,
      handler() {
        this.updateDirtyState();
      }
    },
    saveNameForm: {
      deep: true,
      handler() {
        this.updateDirtyState();
      }
    }
  },
  async beforeRouteLeave() {
    if (!this.unsavedChanges || this.saving) return true;
    try {
      await confirmAction(this.$t('rooms.settings.leave.description'), this.$t('rooms.settings.leave.title'), {
        confirmButtonText: this.$t('rooms.settings.leave.discard'),
        cancelButtonText: this.$t('rooms.settings.leave.continue'),
        destructive: true
      });
      return true;
    } catch {
      return false;
    }
  }
}
</script>

<style lang="scss" scoped>
.room-settings-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  min-width: 0;
}

.page-header,
.header-actions,
.title-row,
.section-title,
.loading-state {
  display: flex;
  align-items: center;
}

.page-header {
  justify-content: space-between;
  gap: 16px;
}

.title-section {
  min-width: 0;

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
  }

  p {
    margin: 4px 0 0;
    color: var(--muted-foreground);
    font-size: 14px;
  }
}

.title-row {
  flex-wrap: wrap;
  gap: 10px;
}

.change-state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 20px;
}

.change-state-dot {
  width: 7px;
  height: 7px;
  background: var(--chart-2);
  border-radius: 999px;
}

.change-state[data-dirty='true'] .change-state-dot {
  background: var(--chart-3);
}

.room-reference {
  display: block;
  width: fit-content;
  max-width: 100%;
  margin-top: 6px;
  overflow: hidden;
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-actions {
  flex: none;
  gap: 8px;
}

.loading-state {
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  color: var(--muted-foreground);
}

.error-alert,
.save-name-card {
  margin: 0;
}

.save-name-card :deep([data-slot='card-header']),
.settings-section-card :deep([data-slot='card-header']) {
  border-bottom: 1px solid var(--border);
}

.save-name-card :deep([data-slot='field-group']) {
  max-width: 560px;
}

.error-list {
  margin: 6px 0 0;
  padding-left: 18px;
}

.load-error-description {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.settings-tabs {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  min-width: 0;
}

.settings-tabs-nav {
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  border-bottom: 1px solid var(--border);
  scrollbar-width: thin;
}

.settings-tab-list {
  display: inline-flex;
  width: max-content;
  min-width: 100%;
  height: auto;
  padding: 0 0 8px;
  flex: none;
  align-self: flex-start;
  max-width: none;
  justify-content: flex-start;
  overflow: visible;
}

.settings-tab-trigger {
  min-height: 32px;
  flex: none;
  padding-right: 12px;
  padding-left: 12px;
}

.settings-tab-content {
  min-width: 0;
  margin: 0;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 18px 24px;
}

.setting-field {
  min-width: 0;
}

.setting-field--wide {
  grid-column: 1 / -1;
}

.setting-field--switch {
  min-height: 72px;
  padding: 12px 14px;
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.setting-field--switch[data-disabled] {
  background: transparent;
}

.setting-field[data-orientation='horizontal'] {
  justify-content: space-between;
  gap: 16px;
}

.setting-field[data-orientation='horizontal'] :deep([data-slot='field-content']) {
  min-width: 0;
}

.setting-field[data-orientation='horizontal'] :deep([data-slot='switch']) {
  flex: none;
}

.section-title {
  gap: 8px;

  svg {
    width: 18px;
    height: 18px;
  }
}

.required-indicator {
  margin-left: 2px;
  color: var(--destructive);
}

.field-constraint {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 18px;
}

.field-constraint :deep([data-slot='badge']) {
  flex: none;
}

@media (max-width: 920px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }

  .setting-field--wide {
    grid-column: auto;
  }
}

@media (max-width: 760px) {
  .load-error-description {
    align-items: flex-start;
    flex-direction: column;
  }
  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .header-actions > * {
    flex: 1;
  }

  .settings-tab-list {
    min-width: max-content;
  }

  .save-name-card :deep([data-slot='card-action']) {
    grid-row: auto;
    grid-column: 1 / -1;
    justify-self: start;
  }
}
</style>
