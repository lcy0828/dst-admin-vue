<template>
  <div class="room-settings-page">
    <header class="page-header">
      <div class="title-section">
        <h1>{{ isEdit ? '编辑房间' : '创建房间' }}</h1>
        <p>{{ isEdit ? '修改现有房间配置' : '创建全新的游戏房间' }}</p>
      </div>
      <div class="header-actions">
        <UiButton variant="outline" @click="goBack"><ArrowLeft data-icon="inline-start" />返回</UiButton>
        <UiButton @click="saveSettings" :disabled="loading || Boolean(loadError)">
          <Spinner v-if="loading" data-icon="inline-start" />
          <Save v-else data-icon="inline-start" />
          保存
        </UiButton>
      </div>
    </header>

    <input ref="fileInput" type="file" accept=".ini" class="sr-only" @change="handleFileChange" />

    <div v-if="loading" class="loading-state">
      <Spinner />
      <span>{{ isEdit ? '正在处理房间配置' : '正在创建房间' }}</span>
    </div>

    <Alert v-if="loadError" variant="destructive" class="error-alert">
      <TriangleAlert />
      <AlertTitle>房间配置加载失败</AlertTitle>
      <AlertDescription class="load-error-description">
        <span>{{ loadError }}</span>
        <UiButton variant="outline" size="sm" @click="loadRoomSettings(roomId)">
          <RefreshCw data-icon="inline-start" />
          重新加载
        </UiButton>
      </AlertDescription>
    </Alert>

    <Alert v-if="formErrors.length > 0" variant="destructive" class="error-alert">
      <TriangleAlert />
      <AlertTitle>表单验证失败</AlertTitle>
      <AlertDescription>
        <ul class="error-list">
          <li v-for="(error, index) in formErrors" :key="index">{{ error }}</li>
        </ul>
      </AlertDescription>
    </Alert>

    <Card v-if="!isEdit" class="save-name-card">
      <CardHeader>
        <CardTitle>房间标识</CardTitle>
        <CardDescription>房间存档名称创建后不可修改。</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field :data-invalid="Boolean(saveNameError)">
            <FieldLabel for="room-savename">房间存档名称</FieldLabel>
            <UiInput
              id="room-savename"
              v-model.trim="saveNameForm.savename"
              placeholder="请输入房间存档名称，如 room1"
              :aria-invalid="Boolean(saveNameError)"
            />
            <FieldDescription>仅支持字母、数字和下划线。</FieldDescription>
            <FieldError v-if="saveNameError">{{ saveNameError }}</FieldError>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>

    <Tabs v-if="!loadError" v-model="activeTab" class="settings-tabs">
      <TabsList class="settings-tab-list">
        <TabsTrigger v-for="section in settingsSections" :key="section.key" :value="section.key">
          {{ section.tabLabel }}
        </TabsTrigger>
        <TabsTrigger value="special-lists">特殊名单</TabsTrigger>
        <TabsTrigger value="token">服务器令牌</TabsTrigger>
      </TabsList>

      <TabsContent v-for="section in settingsSections" :key="section.key" :value="section.key">
        <Card>
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
              >
                <FieldContent>
                  <FieldLabel :for="`room-setting-${field.key}`">{{ field.label }}</FieldLabel>
                  <FieldDescription>{{ field.description }}</FieldDescription>
                  <FieldError v-if="isFieldInvalid(field.key)">{{ getFieldError(field.key) }}</FieldError>
                </FieldContent>

                <UiSelect v-if="field.type === 'select'" v-model="form[field.key]">
                  <SelectTrigger :id="`room-setting-${field.key}`" :aria-invalid="isFieldInvalid(field.key)">
                    <SelectValue :placeholder="field.placeholder || '请选择'" />
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
                  :aria-invalid="isFieldInvalid(field.key)"
                />

                <UiSwitch
                  v-else-if="field.type === 'switch'"
                  :id="`room-setting-${field.key}`"
                  v-model="form[field.key]"
                  :aria-invalid="isFieldInvalid(field.key)"
                />

                <UiInput
                  v-else
                  :id="`room-setting-${field.key}`"
                  v-model="form[field.key]"
                  :type="field.type === 'number' ? 'number' : 'text'"
                  :min="field.min"
                  :max="field.max"
                  :placeholder="field.placeholder"
                  :aria-invalid="isFieldInvalid(field.key)"
                  @change="normalizeNumberField(field)"
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="special-lists">
        <SpecialLists :savename="roomId" @add-user="handleAddUser" />
      </TabsContent>

      <TabsContent value="token">
        <ServerToken :savename="roomId" @input-token="handleInputToken" />
      </TabsContent>
    </Tabs>
  </div>
</template>

<script>
import { ArrowLeft, Gamepad2, GitBranch, Network, RefreshCw, Save, Settings2, TriangleAlert } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { roomConfigApi, serverApi } from '../../api/index';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch as UiSwitch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea as UiTextarea } from '@/components/ui/textarea';
import SpecialLists from './SpecialLists.vue';
import ServerToken from './ServerToken.vue';

const SETTINGS_SECTIONS = [
  {
    key: 'gameplay',
    tabLabel: '游戏模式',
    title: '游戏模式配置',
    description: '控制玩家容量、战斗规则和世界暂停策略。',
    icon: Gamepad2,
    fields: [
      { key: 'game_mode', label: '游戏模式', type: 'select', description: '影响游戏难度和玩法。', options: [
        { label: '生存模式', value: 'survival' }, { label: '无尽模式', value: 'endless' }, { label: '荒野模式', value: 'wilderness' }
      ] },
      { key: 'max_players', label: '最大玩家数', type: 'number', min: 1, max: 64, description: '服务器最大容纳玩家数量，上限 64 人。' },
      { key: 'pvp', label: '开启玩家对战', type: 'switch', description: '允许玩家之间互相攻击。' },
      { key: 'pause_when_empty', label: '无人时暂停', type: 'switch', description: '服务器无人时自动暂停游戏。' },
      { key: 'vote_enabled', label: '投票重启', type: 'switch', description: '允许玩家投票重启世界。' },
      { key: 'vote_kick_enabled', label: '投票踢人', type: 'switch', description: '允许玩家投票踢出其他玩家。' }
    ]
  },
  {
    key: 'network',
    tabLabel: '网络设置',
    title: '网络配置',
    description: '配置服务器发现、访问限制和网络通信参数。',
    icon: Network,
    fields: [
      { key: 'lan_only_cluster', label: '局域网游戏', type: 'switch', description: '仅允许局域网内的玩家加入。' },
      { key: 'cluster_intention', label: '游戏偏好', type: 'select', description: '设置服务器的游戏风格和氛围。', options: [
        { label: '合作', value: 'cooperative' }, { label: '竞争', value: 'competitive' }, { label: '社交', value: 'social' }, { label: '疯狂', value: 'madness' }
      ] },
      { key: 'cluster_password', label: '服务器密码', type: 'text', placeholder: '可为空', description: '加入服务器时使用的密码。' },
      { key: 'cluster_description', label: '服务器描述', type: 'textarea', rows: 3, description: '显示在服务器列表中的介绍。' },
      { key: 'cluster_name', label: '服务器名称', type: 'text', description: '显示在服务器列表中的名称。' },
      { key: 'offline_cluster', label: '离线服务器', type: 'switch', description: '离线模式，不依赖 Steam 功能。' },
      { key: 'cluster_language', label: '服务器语言', type: 'select', description: '设置服务器语言。', options: [
        { label: '中文', value: 'zh' }, { label: '英文', value: 'en' }
      ] },
      { key: 'whitelist_slots', label: '预留位', type: 'number', min: 0, description: '为白名单玩家预留的位置数量。' },
      { key: 'tick_rate', label: '通信频率', type: 'number', min: 15, max: 60, description: '服务器每秒通信次数。' },
      { key: 'autosaver_enabled', label: '自动保存', type: 'switch', description: '启用游戏自动保存。' },
      { key: 'idle_timeout', label: '挂机超时时间', type: 'number', min: 0, description: '超过此时间自动踢出，0 表示不启用。' }
    ]
  },
  {
    key: 'system',
    tabLabel: '系统设置',
    title: '系统设置',
    description: '配置控制台与存档快照。',
    icon: Settings2,
    fields: [
      { key: 'console_enabled', label: '开启控制台', type: 'switch', description: '允许使用控制台命令。' },
      { key: 'max_snapshots', label: '最大快照数', type: 'number', min: 1, description: '保留的最大存档快照数量。' }
    ]
  },
  {
    key: 'shard',
    tabLabel: '分片设置',
    title: '分片设置',
    description: '配置森林、洞穴等分片之间的通信。',
    icon: GitBranch,
    fields: [
      { key: 'shard_enabled', label: '开启服务器共享', type: 'switch', description: '洞穴分片需要开启此选项。' },
      { key: 'bind_ip', label: '监听地址', type: 'text', description: '服务器监听的 IP 地址。' },
      { key: 'master_ip', label: '主服务器 IP', type: 'text', description: '主服务器的 IP 地址。' },
      { key: 'master_port', label: '主服务器端口', type: 'number', min: 1, max: 65535, description: '分片连接主服务器使用的 UDP 端口。' },
      { key: 'cluster_key', label: '连接密码', type: 'text', description: '所有分片必须使用相同密码。' }
    ]
  },
  {
    key: 'steam',
    tabLabel: 'Steam 设置',
    title: 'Steam 设置',
    description: '配置 Steam 组访问和管理员权限。',
    icon: Settings2,
    fields: [
      { key: 'steam_group_only', label: '仅 Steam 组', type: 'switch', description: '只允许 Steam 组内成员加入。' },
      { key: 'steam_group_id', label: 'Steam 组 ID', type: 'number', min: 0, description: '启用组限制时使用的 Steam 组 ID。' },
      { key: 'steam_group_admins', label: '组管理员权限', type: 'switch', description: '授予 Steam 组管理员服务器管理权限。' }
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
    Card,
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
      settingsSections: SETTINGS_SECTIONS,
      isEdit: false,
      roomId: '',
      savename: '',
      saveNameForm: {
        savename: ''
      },
      saveNameError: '',
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
      unsavedChanges: false
    }
  },
  created() {
    // 检查是否是编辑模式
    const roomId = this.$route.query.id;
    if (roomId) {
      this.isEdit = true;
      this.roomId = roomId;
      this.loadRoomSettings(roomId);
    }
  },
  methods: {
    getFieldError(key) {
      return this.validationErrors[key] || '';
    },
    isFieldInvalid(key) {
      return Boolean(this.validationErrors[key]);
    },
    normalizeNumberField(field) {
      if (field.type !== 'number') return;
      const value = Number(this.form[field.key]);
      if (Number.isNaN(value)) return;
      const min = field.min ?? Number.NEGATIVE_INFINITY;
      const max = field.max ?? Number.POSITIVE_INFINITY;
      this.form[field.key] = Math.min(max, Math.max(min, value));
    },
    validateSettings() {
      const errors = {};
      const requiredFields = {
        cluster_name: '请输入服务器名称',
        cluster_description: '请输入服务器描述',
        cluster_password: '请输入服务器密码',
        master_port: '请输入主服务器端口',
        cluster_key: '请输入连接密码'
      };
      Object.entries(requiredFields).forEach(([key, message]) => {
        if (this.form[key] === '' || this.form[key] === null || this.form[key] === undefined) errors[key] = message;
      });
      this.validationErrors = errors;

      this.saveNameError = '';
      if (!this.isEdit) {
        if (!this.saveNameForm.savename) this.saveNameError = '请输入房间存档名称';
        else if (!/^[a-zA-Z0-9_]+$/.test(this.saveNameForm.savename)) this.saveNameError = '存档名称只能包含字母、数字和下划线';
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
    },
    handleInputToken(token) {
      this.form.serverToken = token;
    },
    async loadRoomSettings(roomId) {
      try {
        this.loading = true;
        this.loadError = '';
        this.formErrors = [];
        const response = await roomConfigApi.getRoomConfig(roomId);
        
        if (response && response.status === 200 && response.data) {
          // 适配新的嵌套数据结构
          const configData = response.data;
          
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
          
          toast.success('配置加载成功');
          this.unsavedChanges = false;
        } else {
          throw new Error('获取房间配置失败');
        }
      } catch (error) {
        console.error('加载配置失败:', error);
        this.loadError = this.handleError(error, '加载配置失败');
      } finally {
        this.loading = false;
      }
    },
    async saveSettings() {
      try {
        this.formErrors = [];
        
        if (!this.validateSettings()) {
          toast.error('请完善表单信息');
          return;
        }
        if (!this.isEdit) this.savename = this.saveNameForm.savename;
        if (!this.isEdit && !this.form.serverToken) {
          toast.error('请输入服务器令牌');
          this.activeTab = 'token';
          return;
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
        
        this.loading = true;
        if (this.isEdit) {
          // 编辑模式: 使用已有的roomId
          await roomConfigApi.saveRoomConfig(this.roomId, convertedData);
        } else {
          // 创建模式: v2 会先真实创建房间，再应用完整 cluster.ini 配置。
          const created = await roomConfigApi.createRoom(
            this.savename,
            convertedData,
            this.form.serverToken
          );
          const createdRoom = created.data;
          const roomValue = createdRoom.id || this.savename;
          const listTasks = [];
          const { adminList, blockList, whiteList } = this.form;
          if (adminList.length) listTasks.push(serverApi.updateAdminList(roomValue, adminList));
          if (blockList.length) listTasks.push(serverApi.updateBlockList(roomValue, blockList));
          if (whiteList.length) listTasks.push(serverApi.updateWhiteList(roomValue, whiteList));
          await Promise.all(listTasks);
          this.roomId = roomValue;
          this.isEdit = true;
        }
        
        toast.success('保存成功');
        this.unsavedChanges = false;
      } catch (error) {
        console.error('保存配置失败:', error);
        this.handleError(error, '保存配置失败');
      } finally {
        this.loading = false;
      }
    },
    async handleFileChange(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      try {
        this.loading = true;
        this.formErrors = [];
        await roomConfigApi.importRoomConfig(this.roomId, file);
        
        toast.success('配置导入成功');
        
        await this.loadRoomSettings(this.roomId);
      } catch (error) {
        console.error('导入配置失败:', error);
        this.handleError(error, '导入配置失败');
      } finally {
        this.loading = false;
        event.target.value = '';
      }
    },
    handleError(error, defaultMessage) {
      let errorMessage = error.message || defaultMessage;

      if (error.details && error.details.fields) {
        this.formErrors = Object.values(error.details.fields);
      }
      
      if (error.response) {
        // 处理HTTP错误
        switch (error.response.status) {
          case 400:
            errorMessage = '请求参数错误';
            break;
          case 401:
            errorMessage = '未授权访问';
            break;
          case 403:
            errorMessage = '访问被拒绝';
            break;
          case 404:
            errorMessage = '资源不存在';
            break;
          case 500:
            errorMessage = '服务器内部错误';
            break;
          default:
            errorMessage = `请求失败 (${error.response.status})`;
        }
        
        // 如果有详细的错误信息，添加到表单错误列表
        if (error.response.data && error.response.data.errors) {
          this.formErrors = Array.isArray(error.response.data.errors) 
            ? error.response.data.errors 
            : [error.response.data.errors];
        }
      } else if (error.request) {
        errorMessage = '网络请求失败，请检查网络连接';
      }
      
      toast.error(errorMessage);
      return errorMessage;
    }
  },
  watch: {
    form: {
      deep: true,
      handler() {
        this.unsavedChanges = true;
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.room-settings-page {
  width: 100%;
  min-width: 0;
}

.page-header,
.header-actions,
.section-title,
.loading-state {
  display: flex;
  align-items: center;
}

.page-header {
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}

.title-section {
  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 650;
  }

  p {
    margin: 4px 0 0;
    color: var(--muted-foreground);
    font-size: 13px;
  }
}

.header-actions {
  gap: 8px;
}

.loading-state {
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  margin-bottom: 16px;
  color: var(--muted-foreground);
}

.error-alert,
.save-name-card {
  margin-bottom: 16px;
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
  min-width: 0;
}

.settings-tab-list {
  max-width: 100%;
  justify-content: flex-start;
  overflow-x: auto;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px 24px;
}

.section-title {
  gap: 8px;

  svg {
    width: 18px;
    height: 18px;
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

  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
