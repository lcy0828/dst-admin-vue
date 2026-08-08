<template>
  <div class="room-settings-page">
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h2>{{ isEdit ? '编辑房间' : '创建房间' }}</h2>
          <div class="subtitle">{{ isEdit ? '修改现有房间配置' : '创建全新的游戏房间' }}</div>
        </div>
        <div class="header-actions">
          <el-button @click="goBack" icon="el-icon-back">返回</el-button>
          <el-button type="success" @click="saveSettings" :loading="loading" icon="el-icon-check">保存</el-button>
        </div>
      </div>
      <div class="tech-decoration">
        <div class="tech-line"></div>
        <div class="tech-dots"></div>
      </div>
    </div>

    <!-- 隐藏的文件输入框 -->
    <input
      ref="fileInput"
      type="file"
      accept=".ini"
      style="display: none"
      @change="handleFileChange"
    />

    <!-- 全局加载状态 -->
    <div v-loading="loading" class="page-content">
      <!-- 表单验证提示 -->
      <el-alert
        v-if="formErrors.length > 0"
        title="表单验证失败"
        type="error"
        :closable="false"
        show-icon
        class="error-alert">
        <ul class="error-list">
          <li v-for="(error, index) in formErrors" :key="index">{{ error }}</li>
        </ul>
      </el-alert>

      <!-- 房间名称输入 -->
      <el-card class="save-name-card" v-if="!isEdit">
        <div class="form-grid single-column">
          <el-form ref="saveNameForm" :model="saveNameForm" :rules="saveNameRules" label-width="180px">
            <el-form-item label="房间存档名称" prop="savename" required>
              <el-input v-model="saveNameForm.savename" placeholder="请输入房间存档名称,如:room1"></el-input>
              <div class="form-item-desc">
                这是您房间的唯一标识,用于存档管理,创建后不可修改
              </div>
            </el-form-item>
          </el-form>
        </div>
      </el-card>

      <el-tabs v-model="activeTab" type="border-card" class="settings-tabs">
        <!-- 游戏模式配置 -->
        <el-tab-pane label="游戏模式" name="gameplay">
          <div class="tab-content">
            <div class="tab-header">
              <component is="el-icon-game" class="legacy-icon" />
              <span>游戏模式配置</span>
            </div>
            <el-form ref="form" :model="form" :rules="rules" label-width="180px">
              <el-card class="form-section">
                <div class="form-grid">
                  <el-form-item label="游戏模式" prop="game_mode">
                    <el-select v-model="form.game_mode" placeholder="请选择游戏模式">
                      <el-option label="生存模式" value="survival"></el-option>
                      <el-option label="无尽模式" value="endless"></el-option>
                      <el-option label="荒野模式" value="wilderness"></el-option>
                    </el-select>
                    <div class="form-item-desc">选择游戏模式，影响游戏难度和玩法</div>
                  </el-form-item>
                  <el-form-item label="最大玩家数" prop="max_players">
                    <el-input-number v-model="form.max_players" :min="1" :max="64"></el-input-number>
                    <div class="form-item-desc">服务器最大容纳玩家数量，上限64人</div>
                  </el-form-item>
                  <el-form-item label="开启玩家对战" prop="pvp">
                    <el-switch v-model="form.pvp"></el-switch>
                    <div class="form-item-desc">是否允许玩家之间互相攻击</div>
                  </el-form-item>
                  <el-form-item label="无人时暂停" prop="pause_when_empty">
                    <el-switch v-model="form.pause_when_empty"></el-switch>
                    <div class="form-item-desc">当服务器没有玩家时自动暂停游戏</div>
                  </el-form-item>
                  <el-form-item label="投票重启" prop="vote_enabled">
                    <el-switch v-model="form.vote_enabled"></el-switch>
                    <div class="form-item-desc">是否允许玩家投票重启世界</div>
                  </el-form-item>
                  <el-form-item label="投票踢人" prop="vote_kick_enabled">
                    <el-switch v-model="form.vote_kick_enabled"></el-switch>
                    <div class="form-item-desc">是否允许玩家投票踢出其他玩家</div>
                  </el-form-item>
                </div>
              </el-card>
            </el-form>
          </div>
        </el-tab-pane>

        <!-- 网络配置 -->
        <el-tab-pane label="网络设置" name="network">
          <div class="tab-content">
            <div class="tab-header">
              <component is="el-icon-network" class="legacy-icon" />
              <span>网络配置</span>
            </div>
            <el-form ref="form" :model="form" :rules="rules" label-width="180px">
              <el-card class="form-section">
                <div class="form-grid">
                  <el-form-item label="局域网游戏" prop="lan_only_cluster">
                    <el-switch v-model="form.lan_only_cluster"></el-switch>
                    <div class="form-item-desc">仅允许局域网内的玩家加入</div>
                  </el-form-item>
                  <el-form-item label="游戏偏好" prop="cluster_intention">
                    <el-select v-model="form.cluster_intention" placeholder="请选择游戏偏好">
                      <el-option label="合作" value="cooperative"></el-option>
                      <el-option label="竞争" value="competitive"></el-option>
                      <el-option label="社交" value="social"></el-option>
                      <el-option label="疯狂" value="madness"></el-option>
                    </el-select>
                    <div class="form-item-desc">设置服务器的游戏风格和氛围</div>
                  </el-form-item>
                  <el-form-item label="服务器密码" prop="cluster_password">
                    <el-input v-model="form.cluster_password" placeholder="可为空"></el-input>
                    <div class="form-item-desc">设置加入服务器需要的密码</div>
                  </el-form-item>
                  <el-form-item label="服务器描述" prop="cluster_description">
                    <el-input type="textarea" v-model="form.cluster_description" rows="3"></el-input>
                    <div class="form-item-desc">服务器的描述信息，会显示在服务器列表中</div>
                  </el-form-item>
                  <el-form-item label="服务器名称" prop="cluster_name">
                    <el-input v-model="form.cluster_name"></el-input>
                    <div class="form-item-desc">服务器的名称，会显示在服务器列表中</div>
                  </el-form-item>
                  <el-form-item label="离线服务器" prop="offline_cluster">
                    <el-switch v-model="form.offline_cluster"></el-switch>
                    <div class="form-item-desc">离线模式，不依赖Steam功能</div>
                  </el-form-item>
                  <el-form-item label="服务器语言" prop="cluster_language">
                    <el-select v-model="form.cluster_language">
                      <el-option label="中文" value="zh"></el-option>
                      <el-option label="英文" value="en"></el-option>
                    </el-select>
                    <div class="form-item-desc">设置服务器的语言</div>
                  </el-form-item>
                  <el-form-item label="预留位" prop="whitelist_slots">
                    <el-input-number v-model="form.whitelist_slots" :min="0"></el-input-number>
                    <div class="form-item-desc">为白名单玩家预留的服务器位置数量</div>
                  </el-form-item>
                  <el-form-item label="通信频率" prop="tick_rate">
                    <el-input-number v-model="form.tick_rate" :min="15" :max="60"></el-input-number>
                    <div class="form-item-desc">服务器每秒通信次数，越高体验越好，但会增加服务器负担</div>
                  </el-form-item>
                  <el-form-item label="自动保存" prop="autosaver_enabled">
                    <el-switch v-model="form.autosaver_enabled"></el-switch>
                    <div class="form-item-desc">是否启用自动保存功能</div>
                  </el-form-item>
                  <el-form-item label="挂机超时时间" prop="idle_timeout">
                    <el-input-number v-model="form.idle_timeout" :min="0"></el-input-number>
                    <div class="form-item-desc">玩家挂机超过此时间后自动踢出，0表示不启用</div>
                  </el-form-item>
                </div>
              </el-card>
            </el-form>
          </div>
        </el-tab-pane>

        <!-- 系统配置 -->
        <el-tab-pane label="系统设置" name="system">
          <div class="tab-content">
            <div class="tab-header">
              <component is="el-icon-system" class="legacy-icon" />
              <span>系统设置</span>
            </div>
            <el-form ref="form" :model="form" :rules="rules" label-width="180px">
              <el-card class="form-section">
                <div class="form-grid">
                  <el-form-item label="开启控制台" prop="console_enabled">
                    <el-switch v-model="form.console_enabled"></el-switch>
                    <div class="form-item-desc">是否允许使用控制台命令</div>
                  </el-form-item>
                  <el-form-item label="最大快照数" prop="max_snapshots">
                    <el-input-number v-model="form.max_snapshots" :min="1"></el-input-number>
                    <div class="form-item-desc">保存的最大存档快照数量</div>
                  </el-form-item>
                </div>
              </el-card>
            </el-form>
          </div>
        </el-tab-pane>

        <!-- 分片配置 -->
        <el-tab-pane label="分片设置" name="shard">
          <div class="tab-content">
            <div class="tab-header">
              <component is="el-icon-shard" class="legacy-icon" />
              <span>分片设置</span>
            </div>
            <el-form ref="form" :model="form" :rules="rules" label-width="180px">
              <el-card class="form-section">
                <div class="form-grid">
                  <el-form-item label="开启服务器共享" prop="shard_enabled">
                    <el-switch v-model="form.shard_enabled"></el-switch>
                    <div class="form-item-desc">是否启用服务器分片功能，开启洞穴必须启用此选项</div>
                  </el-form-item>
                  <el-form-item label="监听地址" prop="bind_ip">
                    <el-input v-model="form.bind_ip"></el-input>
                    <div class="form-item-desc">服务器监听的IP地址，同一机器上运行可填写127.0.0.1</div>
                  </el-form-item>
                  <el-form-item label="主服务器IP" prop="master_ip">
                    <el-input v-model="form.master_ip"></el-input>
                    <div class="form-item-desc">主服务器的IP地址，同一机器上运行可填写127.0.0.1</div>
                  </el-form-item>
                  <el-form-item label="主服务器端口" prop="master_port">
                    <el-input-number v-model="form.master_port" :min="1" :max="65535"></el-input-number>
                    <div class="form-item-desc">主服务器的UDP端口，所有连接主服务器的非主服务器必须相同</div>
                  </el-form-item>
                  <el-form-item label="连接密码" prop="cluster_key">
                    <el-input v-model="form.cluster_key"></el-input>
                    <div class="form-item-desc">服务器之间的连接密码，所有服务器必须相同</div>
                  </el-form-item>
                </div>
              </el-card>
            </el-form>
          </div>
        </el-tab-pane>

        <!-- Steam配置 -->
        <el-tab-pane label="Steam设置" name="steam">
          <div class="tab-content">
            <div class="tab-header">
              <component is="el-icon-steam" class="legacy-icon" />
              <span>Steam设置</span>
            </div>
            <el-form ref="form" :model="form" :rules="rules" label-width="180px">
              <el-card class="form-section">
                <div class="form-grid">
                  <el-form-item label="仅Steam组" prop="steam_group_only">
                    <el-switch v-model="form.steam_group_only"></el-switch>
                    <div class="form-item-desc">是否只允许Steam组内成员加入</div>
                  </el-form-item>
                  <el-form-item label="Steam组ID" prop="steam_group_id">
                    <el-input-number v-model="form.steam_group_id" :min="0"></el-input-number>
                    <div class="form-item-desc">指定Steam组的ID，仅当启用仅Steam组时有效</div>
                  </el-form-item>
                  <el-form-item label="组管理员权限" prop="steam_group_admins">
                    <el-switch v-model="form.steam_group_admins"></el-switch>
                    <div class="form-item-desc">是否给予Steam组管理员服务器管理权限</div>
                  </el-form-item>
                </div>
              </el-card>
            </el-form>
          </div>
        </el-tab-pane>

        <!-- 特殊名单 -->
        <el-tab-pane label="特殊名单" name="special-lists">
          <SpecialLists :savename="roomId" @add-user="handleAddUser"></SpecialLists>
        </el-tab-pane>

        <!-- 服务器令牌 -->
        <el-tab-pane label="服务器令牌" name="token">
          <ServerToken :savename="roomId" @input-token="handleInputToken"></ServerToken>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script>
import { roomConfigApi, serverApi } from '../../api/index';
import SpecialLists from './SpecialLists.vue';
import ServerToken from './ServerToken.vue';

export default {
  name: 'RoomSettings',
  components: {
    SpecialLists,
    ServerToken
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
      saveNameRules: {
        savename: [
          { required: true, message: '请输入房间存档名称', trigger: 'blur' },
          { pattern: /^[a-zA-Z0-9_]+$/, message: '存档名称只能包含字母、数字和下划线', trigger: 'blur' }
        ]
      },
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
      rules: {
        cluster_name: [
          { required: true, message: '请输入服务器名称', trigger: 'blur' }
        ],
        cluster_description: [
          { required: true, message: '请输入服务器描述', trigger: 'blur' }
        ],
        cluster_password: [
          { required: true, message: '请输入服务器密码', trigger: 'blur' }
        ],
        master_port: [
          { required: true, message: '请输入主服务器端口', trigger: 'blur' }
        ],
        cluster_key: [
          { required: true, message: '请输入连接密码', trigger: 'blur' }
        ]
      },
      loading: false,
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
        this.formErrors = [];
        const response = await roomConfigApi.getRoomConfig(roomId);
        
        if (response && response.status === 200 && response.data) {
          // 适配新的嵌套数据结构
          const configData = response.data;
          
          // 处理GAMEPLAY部分
          if (configData.GAMEPLAY) {
            this.form.game_mode = configData.GAMEPLAY.game_mode || this.form.game_mode;
            this.form.max_players = parseInt(configData.GAMEPLAY.max_players || this.form.max_players);
            this.form.pvp = configData.GAMEPLAY.pvp === 'true';
            this.form.pause_when_empty = configData.GAMEPLAY.pause_when_empty === 'yes' || configData.GAMEPLAY.pause_when_empty === 'true';
            this.form.vote_enabled = configData.GAMEPLAY.vote_enabled === 'true';
            this.form.vote_kick_enabled = configData.GAMEPLAY.vote_kick_enabled === 'true';
          }
          
          // 处理NETWORK部分
          if (configData.NETWORK) {
            this.form.lan_only_cluster = configData.NETWORK.lan_only_cluster === 'true';
            this.form.cluster_intention = configData.NETWORK.cluster_intention || this.form.cluster_intention;
            this.form.cluster_password = configData.NETWORK.cluster_password || '';
            this.form.cluster_description = configData.NETWORK.cluster_description || this.form.cluster_description;
            this.form.cluster_name = configData.NETWORK.cluster_name || this.form.cluster_name;
            this.form.offline_cluster = configData.NETWORK.offline_cluster === 'true';
            this.form.cluster_language = configData.NETWORK.cluster_language || this.form.cluster_language;
            this.form.whitelist_slots = parseInt(configData.NETWORK.whitelist_slots || this.form.whitelist_slots);
            this.form.tick_rate = parseInt(configData.NETWORK.tick_rate || this.form.tick_rate);
            this.form.autosaver_enabled = configData.NETWORK.autosaver_enabled === 'true';
            this.form.idle_timeout = parseInt(configData.NETWORK.idle_timeout || this.form.idle_timeout);
          }
          
          // 处理MISC部分
          if (configData.MISC) {
            this.form.console_enabled = configData.MISC.console_enabled === 'true';
            this.form.max_snapshots = parseInt(configData.MISC.max_snapshots || this.form.max_snapshots);
          }
          
          // 处理SHARD部分
          if (configData.SHARD) {
            this.form.shard_enabled = configData.SHARD.shard_enabled === 'true';
            this.form.bind_ip = configData.SHARD.bind_ip || this.form.bind_ip;
            this.form.master_ip = configData.SHARD.master_ip || this.form.master_ip;
            this.form.master_port = parseInt(configData.SHARD.master_port || this.form.master_port);
            this.form.cluster_key = configData.SHARD.cluster_key || this.form.cluster_key;
          }
          
          // 处理STEAM部分
          if (configData.STEAM) {
            this.form.steam_group_only = configData.STEAM.steam_group_only === 'true';
            this.form.steam_group_id = parseInt(configData.STEAM.steam_group_id || this.form.steam_group_id);
            this.form.steam_group_admins = configData.STEAM.steam_group_admins === 'true';
          }
          
          this.$message({
            type: 'success',
            message: '配置加载成功'
          });
          this.unsavedChanges = false;
        } else {
          throw new Error('获取房间配置失败');
        }
      } catch (error) {
        console.error('加载配置失败:', error);
        this.handleError(error, '加载配置失败');
      } finally {
        this.loading = false;
      }
    },
    async saveSettings() {
      try {
        this.formErrors = [];
        
        // 验证基础表单
        const formValid = await this.$refs.form.validate().catch(() => false);
        
        // 如果是创建模式,还需要验证存档名称
        let saveNameValid = true;
        if (!this.isEdit) {
          saveNameValid = await this.$refs.saveNameForm.validate().catch(() => false);
          
          if (saveNameValid) {
            this.savename = this.saveNameForm.savename;
          }
        }
        
        if (!formValid || (!this.isEdit && !saveNameValid)) {
          this.$message.error('请完善表单信息');
          return;
        }
        if (!this.form.serverToken) {
          this.$message.error('请输入服务器令牌');
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
          // 创建模式: 使用用户输入的savename
          await roomConfigApi.saveRoomConfig(this.savename, convertedData);
          this.roomId = this.savename;
          this.isEdit = true;
          let userlist = [];
          let {adminList, blockList, whiteList} = this.form;
          adminList.length && userlist.push(serverApi.updateAdminList(this.savename, adminList));
          blockList.length && userlist.push(serverApi.updateBlockList(this.savename, blockList));
          whiteList.length && userlist.push(serverApi.updateWhiteList(this.savename, whiteList));
          Promise.all(userlist).then(() => {
          }).catch(() => {
          });
          serverApi.updateServerToken(this.savename, this.form.serverToken);
        }
        
        this.$message({
          type: 'success',
          message: '保存成功'
        });
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
        
        this.$message({
          type: 'success',
          message: '配置导入成功'
        });
        
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
      let errorMessage = defaultMessage;
      
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
      } else {
        errorMessage = error.message || defaultMessage;
      }
      
      this.$message.error(errorMessage);
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
  padding: 20px;
  background: #f8f9fa;
  min-height: 100vh;
  position: relative;
  z-index: 0;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px),
      linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px);
    background-size: 20px 20px;
    z-index: -1;
  }

  .page-header {
    background: linear-gradient(135deg, #ffffff 0%, #f6f3ea 100%);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.8);

    &::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%);
      opacity: 0.7;
      animation: pulse 10s infinite linear;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      z-index: 1;

      .title-section {
        h2 {
          margin: 0;
          font-size: 26px;
          color: #1a1a1a;
          font-weight: 600;
          position: relative;
          display: inline-block;
          
          &::after {
            content: '';
            position: absolute;
            left: 0;
            bottom: -6px;
            width: 40px;
            height: 3px;
            background: linear-gradient(90deg, #d97932, transparent);
            border-radius: 3px;
          }
        }

        .subtitle {
          color: #666;
          margin-top: 12px;
          font-size: 14px;
        }
      }

      .header-actions {
        display: flex;
        gap: 12px;
        
        .el-button {
          transition: all 0.3s ease;
          
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
        }
      }
    }

    .tech-decoration {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;

      .tech-line {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, transparent, #d97932, transparent);
        opacity: 0.7;
      }

      .tech-dots {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-image: radial-gradient(circle at 1px 1px, #e0e0e0 1px, transparent 0);
        background-size: 20px 20px;
        opacity: 0.4;
      }
    }
  }

  .settings-tabs {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(235,238,245,0.8);
    
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px;
      background: linear-gradient(90deg, #d97932, #e59252);
    }

    .tab-content {
      padding: 30px;
      position: relative;
      
      &::before {
        content: '';
        position: absolute;
        top: 15px;
        right: 15px;
        width: 50px;
        height: 50px;
        background: 
          radial-gradient(circle at center, rgba(217, 121, 50,0.1) 0%, rgba(217, 121, 50,0) 70%);
        border-radius: 50%;
      }

      .tab-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 30px;
        color: #1a1a1a;
        font-size: 18px;
        font-weight: 500;

        i {
          font-size: 24px;
          color: #d97932;
          background: rgba(217, 121, 50, 0.1);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }
    }

    .form-section {
      background: #fff;
      border: 1px solid #e8ece5;
      border-radius: 12px;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: 
          linear-gradient(135deg, rgba(217, 121, 50,0.03) 0%, rgba(217, 121, 50,0) 50%);
        z-index: 0;
      }

      &:hover {
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 30px;
        padding: 25px;
        position: relative;
        z-index: 1;
      }
    }

    .form-item-desc {
      font-size: 12px;
      color: #758078;
      margin-top: 6px;
      line-height: 1.5;
      padding-left: 8px;
      border-left: 2px solid #d97932;
      background: rgba(217, 121, 50, 0.03);
      padding: 4px 8px;
      border-radius: 0 4px 4px 0;
      transition: all 0.3s ease;
      
      &:hover {
        background: rgba(217, 121, 50, 0.08);
      }
    }
  }

  .empty-tip {
    text-align: center;
    padding: 60px 40px;
    color: #758078;
    
    i {
      font-size: 60px;
      margin-bottom: 20px;
      color: #e0e0e0;
      animation: pulse 3s infinite ease-in-out;
    }
    
    p {
      font-size: 16px;
      color: #536159;
      max-width: 300px;
      margin: 0 auto;
    }
  }

  .save-name-card {
    margin-bottom: 24px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    position: relative;
    transition: all 0.3s ease;
    background: linear-gradient(135deg, #ffffff 0%, #f6f3ea 100%);
    
    &:hover {
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
      transform: translateY(-2px);
    }
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 3px;
      background: linear-gradient(90deg, #d97932, #e59252);
    }
    
    .single-column {
      grid-template-columns: 1fr;
      padding: 20px;
    }
  }
}

// 添加动画效果
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0% { opacity: 0.5; transform: scale(0.98); }
  50% { opacity: 1; transform: scale(1); }
  100% { opacity: 0.5; transform: scale(0.98); }
}

@keyframes glow {
  0% { box-shadow: 0 0 5px rgba(217, 121, 50, 0.3); }
  50% { box-shadow: 0 0 15px rgba(217, 121, 50, 0.6); }
  100% { box-shadow: 0 0 5px rgba(217, 121, 50, 0.3); }
}

.tab-content {
  animation: fadeIn 0.4s ease-out;
}

// 自定义Element-UI组件样式
:deep(.el-tabs__nav-wrap)::after {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(217, 121, 50, 0.2), transparent);
}

:deep(.el-tabs__item) {
  transition: all 0.3s ease;
  
  &.is-active {
    color: #d97932;
    font-weight: 600;
  }
  
  &:hover {
    color: #d97932;
    transform: translateY(-2px);
  }
}

:deep(.el-input__inner):focus {
  border-color: #d97932;
  animation: glow 2s infinite;
}

:deep(.el-switch.is-checked .el-switch__core) {
  border-color: #d97932;
  background-color: #d97932;
}
</style> 