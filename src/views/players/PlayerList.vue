<template>
  <div class="player-list-page">
    <!-- 页面标题和操作区域 -->
    <div class="page-header">
      <div class="title-container">
        <i class="el-icon-user"></i>
        <span>玩家列表</span>
      </div>
      <div class="action-buttons">
        <el-button size="small" icon="el-icon-refresh" @click="refreshData">刷新</el-button>
        <el-button size="small" type="primary" icon="el-icon-upload2" @click="showUpdateDialog">手动更新玩家列表</el-button>
        <el-button size="small" type="success" icon="el-icon-s-operation" @click="showSessionSelect">选择游戏世界</el-button>
        <el-button size="small" type="warning" icon="el-icon-alarm-clock" @click="showScheduleDialog">添加定时更新任务</el-button>
        <el-tag v-if="activeSessionName" type="success" effect="dark">当前世界: {{ activeSessionName }}</el-tag>
      </div>
    </div>

    <!-- 筛选区域 -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filterForm" class="filter-form" size="small">
        <el-form-item label="存档名称">
          <el-select v-model="filterForm.archive_name" placeholder="选择存档" clearable @change="handleFilter">
            <el-option label="全部存档" value=""></el-option>
            <el-option
              v-for="archive in archiveOptions"
              :key="archive.value"
              :label="archive.label"
              :value="archive.value">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="玩家状态">
          <el-select v-model="filterForm.status" placeholder="选择状态" clearable @change="handleFilter">
            <el-option label="全部状态" value=""></el-option>
            <el-option label="在线" value="online"></el-option>
            <el-option label="离线" value="offline"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="filterForm.prefab" placeholder="选择角色" clearable @change="handleFilter">
            <el-option label="全部角色" value=""></el-option>
            <el-option
              v-for="character in characterOptions"
              :key="character.value"
              :label="character.label"
              :value="character.value">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="filterForm.keyword"
            placeholder="搜索玩家名称/ID"
            prefix-icon="el-icon-search"
            clearable
            @keyup.enter.native="handleFilter"
            @clear="handleFilter">
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleFilter">搜索</el-button>
          <el-button icon="el-icon-refresh" @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card class="table-card" shadow="hover" v-loading="loading">
      <div class="table-operations" slot="header">
        <span>玩家列表</span>
        <div class="table-actions">
          <el-button size="mini" type="primary" icon="el-icon-download" @click="exportPlayerData">导出数据</el-button>
        </div>
      </div>

      <el-table
        :data="playerList"
        style="width: 100%"
        border
        stripe
        :default-sort="{prop: 'last_seen', order: 'descending'}"
        @sort-change="handleSortChange">
        <el-table-column prop="id" label="ID" width="80" sortable></el-table-column>
        <el-table-column prop="archive_name" label="存档名称" width="120" sortable></el-table-column>
        <el-table-column prop="player_name" label="玩家名称" min-width="120">
          <template slot-scope="scope">
            <div class="player-name-cell">
              <span>{{ scope.row.player_name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="user_id" label="KU ID" width="150"></el-table-column>
        <el-table-column prop="prefab" label="角色" width="100">
          <template slot-scope="scope">
            <el-tag size="mini" type="info">{{ getCharacterName(scope.row.prefab) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="player_age" label="天数" width="80" sortable></el-table-column>
        <el-table-column prop="status" label="状态" width="100" sortable>
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === 'online' ? 'success' : 'info'" size="mini">
              {{ scope.row.status === 'online' ? '在线' : '离线' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="first_seen" label="首次登录" width="170" sortable>
          <template slot-scope="scope">
            {{ formatDate(scope.row.first_seen) }}
          </template>
        </el-table-column>
        <el-table-column prop="last_seen" label="最后登录" width="170" sortable>
          <template slot-scope="scope">
            {{ formatDate(scope.row.last_seen) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="320" fixed="right">
          <template slot-scope="scope">
            <div class="operation-buttons">
              <!-- 基本操作按钮 -->
              <el-tooltip content="查看详情" placement="top" effect="light">
                <el-button size="mini" type="primary" icon="el-icon-view" circle @click="viewPlayerDetail(scope.row)"></el-button>
              </el-tooltip>

              <el-tooltip v-if="scope.row.status === 'online'" content="踢出玩家" placement="top" effect="light">
                <el-button
                  size="mini"
                  type="danger"
                  icon="el-icon-close"
                  circle
                  @click="kickPlayer(scope.row)">
                </el-button>
              </el-tooltip>

              <el-tooltip v-else content="封禁玩家" placement="top" effect="light">
                <el-button
                  size="mini"
                  type="info"
                  icon="el-icon-lock"
                  circle
                  @click="banPlayer(scope.row)">
                </el-button>
              </el-tooltip>

              <!-- 在线玩家的额外操作按钮 -->
              <el-tooltip v-if="scope.row.status === 'online'" content="杀死玩家" placement="top" effect="light">
                <el-button
                  size="mini"
                  type="warning"
                  icon="el-icon-delete"
                  circle
                  @click="killPlayer(scope.row)">
                </el-button>
              </el-tooltip>

              <el-tooltip v-if="scope.row.status === 'online'" content="无敌模式" placement="top" effect="light">
                <el-button
                  size="mini"
                  type="success"
                  icon="el-icon-magic-stick"
                  circle
                  @click="toggleGodMode(scope.row)">
                </el-button>
              </el-tooltip>

              <el-tooltip v-if="scope.row.status === 'online'" content="制作模式" placement="top" effect="light">
                <el-button
                  size="mini"
                  type="success"
                  icon="el-icon-s-tools"
                  circle
                  @click="toggleCreativeMode(scope.row)">
                </el-button>
              </el-tooltip>

              <el-tooltip v-if="scope.row.status === 'online'" content="复活玩家" placement="top" effect="light">
                <el-button
                  size="mini"
                  type="success"
                  icon="el-icon-refresh"
                  circle
                  @click="resurrectPlayer(scope.row)">
                </el-button>
              </el-tooltip>

              <el-tooltip v-if="scope.row.status === 'online'" content="重选人物" placement="top" effect="light">
                <el-button
                  size="mini"
                  type="primary"
                  icon="el-icon-user"
                  circle
                  @click="changeCharacter(scope.row)">
                </el-button>
              </el-tooltip>


            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :current-page="pagination.page"
          :page-sizes="[10, 20, 50, 100]"
          :page-size="pagination.page_size"
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total">
        </el-pagination>
      </div>
    </el-card>

    <!-- 玩家详情对话框 -->
    <el-dialog title="玩家详情" :visible.sync="playerDetailVisible" width="50%">
      <div v-if="currentPlayer" class="player-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="玩家ID">{{ currentPlayer.id }}</el-descriptions-item>
          <el-descriptions-item label="KU ID">{{ currentPlayer.user_id }}</el-descriptions-item>
          <el-descriptions-item label="玩家名称">{{ currentPlayer.player_name }}</el-descriptions-item>
          <el-descriptions-item label="存档名称">{{ currentPlayer.archive_name }}</el-descriptions-item>
          <el-descriptions-item label="角色">{{ getCharacterName(currentPlayer.prefab) }}</el-descriptions-item>
          <el-descriptions-item label="天数">{{ currentPlayer.player_age }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentPlayer.status === 'online' ? 'success' : 'info'">
              {{ currentPlayer.status === 'online' ? '在线' : '离线' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态变更时间">{{ formatDate(currentPlayer.status_change) }}</el-descriptions-item>
          <el-descriptions-item label="首次登录">{{ formatDate(currentPlayer.first_seen) }}</el-descriptions-item>
          <el-descriptions-item label="最后登录">{{ formatDate(currentPlayer.last_seen) }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(currentPlayer.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDate(currentPlayer.updated_at) }}</el-descriptions-item>
        </el-descriptions>

        <div class="detail-actions">
          <el-button-group v-if="currentPlayer.status === 'online'">
            <el-button type="danger" size="small" icon="el-icon-close" @click="kickPlayer(currentPlayer)">踢出</el-button>
            <el-button type="warning" size="small" icon="el-icon-delete" @click="killPlayer(currentPlayer)">杀死</el-button>
          </el-button-group>
          <el-button-group v-else>
            <el-button type="info" size="small" icon="el-icon-lock" @click="banPlayer(currentPlayer)">封禁</el-button>
          </el-button-group>

          <el-button-group v-if="currentPlayer.status === 'online'">
            <el-button type="success" size="small" icon="el-icon-magic-stick" @click="toggleGodMode(currentPlayer)">无敌模式</el-button>
            <el-button type="success" size="small" icon="el-icon-s-tools" @click="toggleCreativeMode(currentPlayer)">制作模式</el-button>
            <el-button type="success" size="small" icon="el-icon-refresh" @click="resurrectPlayer(currentPlayer)">复活</el-button>
            <el-button type="primary" size="small" icon="el-icon-user" @click="changeCharacter(currentPlayer)">重选人物</el-button>
          </el-button-group>
        </div>
      </div>
    </el-dialog>



    <!-- 封禁对话框 -->
    <el-dialog title="封禁玩家" :visible.sync="banDialogVisible" width="30%">
      <el-form :model="banForm" label-width="80px">
        <el-form-item label="封禁原因" required>
          <el-input
            type="textarea"
            v-model="banForm.reason"
            :rows="3"
            placeholder="请输入封禁原因">
          </el-input>
        </el-form-item>
        <el-form-item label="封禁时长">
          <el-select v-model="banForm.duration" placeholder="选择封禁时长">
            <el-option label="1小时" value="1h"></el-option>
            <el-option label="6小时" value="6h"></el-option>
            <el-option label="12小时" value="12h"></el-option>
            <el-option label="1天" value="1d"></el-option>
            <el-option label="3天" value="3d"></el-option>
            <el-option label="7天" value="7d"></el-option>
            <el-option label="30天" value="30d"></el-option>
            <el-option label="永久" value="permanent"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="banDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmBanPlayer" :loading="banning">确认封禁</el-button>
      </span>
    </el-dialog>

    <!-- 无敌模式对话框 -->
    <el-dialog title="设置无敌模式" :visible.sync="godModeDialogVisible" width="30%">
      <div v-if="currentPlayer">
        <p>您将为玩家 <strong>{{ currentPlayer.player_name }}</strong> 设置无敌模式。</p>
        <el-form :model="godModeForm" label-width="80px">
          <el-form-item label="状态">
            <el-switch
              v-model="godModeForm.enabled"
              active-text="开启"
              inactive-text="关闭">
            </el-switch>
          </el-form-item>
        </el-form>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="godModeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmGodMode" :loading="settingGodMode">确认</el-button>
      </span>
    </el-dialog>

    <!-- 制作模式对话框 -->
    <el-dialog title="设置制作模式" :visible.sync="creativeModeDialogVisible" width="30%">
      <div v-if="currentPlayer">
        <p>您将为玩家 <strong>{{ currentPlayer.player_name }}</strong> 设置制作模式。</p>
        <el-form :model="creativeModeForm" label-width="80px">
          <el-form-item label="状态">
            <el-switch
              v-model="creativeModeForm.enabled"
              active-text="开启"
              inactive-text="关闭">
            </el-switch>
          </el-form-item>
        </el-form>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="creativeModeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmCreativeMode" :loading="settingCreativeMode">确认</el-button>
      </span>
    </el-dialog>

    <!-- 会话选择对话框 -->
    <el-dialog title="选择游戏世界" :visible.sync="sessionSelectDialogVisible" width="30%">
      <el-form label-width="80px">
        <el-form-item label="选择世界" required>
          <el-select v-model="selectedSessionName" placeholder="选择世界" style="width: 100%">
            <el-option
              v-for="session in sessionList"
              :key="session.name"
              :label="session.name"
              :value="session.name">
              <span style="float: left">
                {{ session.name }}
              </span>
              <span style="float: right; color: #8492a6; font-size: 13px">
                {{ session.state }}
              </span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-alert
          v-if="sessionList.length === 0"
          title="没有可用的世界"
          type="warning"
          :closable="false">
        </el-alert>
        <el-alert
          type="info"
          title="提示：默认选择Forest1世界，如果需要在其他世界执行操作，请选择相应的世界"
          :closable="false"
          style="margin-top: 10px">
        </el-alert>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="sessionSelectDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSessionSelect">确认</el-button>
      </span>
    </el-dialog>

    <!-- 手动更新玩家列表对话框 -->
    <el-dialog title="手动更新玩家列表" :visible.sync="updateDialogVisible" width="30%">
      <el-form :model="updateForm" label-width="80px">
        <el-form-item label="选择会话" required>
          <el-select v-model="updateForm.session_name" placeholder="选择会话" style="width: 100%">
            <el-option
              v-for="session in sessionList"
              :key="session.name"
              :label="session.name"
              :value="session.name">
              <span style="float: left">
                {{ session.name }}
              </span>
              <span style="float: right; color: #8492a6; font-size: 13px">
                {{ session.state }}
              </span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-alert
          v-if="sessionList.length === 0"
          title="没有可用的会话"
          type="warning"
          :closable="false">
        </el-alert>
        <el-alert
          type="info"
          title="提示：手动更新将从服务器获取最新的玩家信息"
          :closable="false"
          style="margin-top: 10px">
        </el-alert>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="updateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmUpdate" :loading="updating" :disabled="sessionList.length === 0">开始更新</el-button>
      </span>
    </el-dialog>

    <!-- 重选人物对话框 -->
    <el-dialog title="重选人物" :visible.sync="characterDialogVisible" width="30%">
      <div v-if="currentPlayer">
        <p>您将让玩家 <strong>{{ currentPlayer.player_name }}</strong> 重新选择角色。</p>
        <p>当前角色：<strong>{{ getCharacterName(currentPlayer.prefab) }}</strong></p>
        <el-alert
          type="warning"
          title="注意：此操作会将玩家重置，玩家可以直接重新选择角色"
          :closable="false"
          style="margin: 10px 0">
        </el-alert>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="characterDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmChangeCharacter" :loading="changingCharacter">确认重选</el-button>
      </span>
    </el-dialog>

    <!-- 定时更新任务对话框 -->
    <el-dialog title="添加定时更新任务" :visible.sync="scheduleDialogVisible" width="40%">
      <el-form :model="scheduleForm" :rules="scheduleRules" ref="scheduleForm" label-width="100px">
        <el-form-item label="任务名称" prop="name">
          <el-input v-model="scheduleForm.name" placeholder="请输入任务名称"></el-input>
        </el-form-item>

        <el-form-item label="选择世界" prop="session_name">
          <el-select v-model="scheduleForm.session_name" placeholder="选择游戏世界" style="width: 100%">
            <el-option
              v-for="session in sessionList"
              :key="session.name"
              :label="session.name"
              :value="session.name">
              <span style="float: left">
                {{ session.name }}
              </span>
              <span style="float: right; color: #8492a6; font-size: 13px">
                {{ session.state }}
              </span>
            </el-option>
          </el-select>
          <div class="world-help">
            <p class="important-note">重要提示：使用函数类型的定时任务，将自动调用update_player_info函数更新玩家列表。</p>
          </div>
        </el-form-item>

        <el-form-item label="执行计划" prop="spec">
          <el-input v-model="scheduleForm.spec" placeholder="Cron表达式，例如：0 */3 * * * *"></el-input>
          <div class="cron-help">
            <p>常用Cron表达式示例：</p>
            <ul>
              <li><code>0 */1 * * * *</code> - 每分钟执行一次</li>
              <li><code>0 */5 * * * *</code> - 每5分钟执行一次</li>
              <li><code>0 */30 * * * *</code> - 每30分钟执行一次</li>
              <li><code>0 0 * * * *</code> - 每小时执行一次</li>
              <li><code>0 0 */2 * * *</code> - 每两小时执行一次</li>
            </ul>
            <p class="important-note">重要提示：执行频率应根据服务器性能决定，低配置服务器建议设置为每3分钟或更久。</p>
          </div>
        </el-form-item>

        <el-form-item label="任务描述" prop="description">
          <el-input type="textarea" :rows="2" v-model="scheduleForm.description" placeholder="请输入任务描述"></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="scheduleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAddSchedule" :loading="addingSchedule">确认添加</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { playerApi } from '@/api/playerApi';
import { cronTaskApi } from '@/api/index';

export default {
  name: 'PlayerList',
  data() {
    return {
      // 玩家列表数据
      playerList: [],
      loading: false,

      // 分页参数
      pagination: {
        page: 1,
        page_size: 10,
        total: 0
      },

      // 筛选表单
      filterForm: {
        archive_name: '',
        status: '',
        prefab: '',
        keyword: ''
      },

      // 存档选项
      archiveOptions: [],

      // 角色选项
      characterOptions: [
        { label: '威尔逊', value: 'wilson' },
        { label: '薇洛', value: 'willow' },
        { label: '沃尔夫冈', value: 'wolfgang' },
        { label: '温蒂', value: 'wendy' },
        { label: 'WX-78', value: 'wx78' },
        { label: '薇克巴顿', value: 'wickerbottom' },
        { label: '伍迪', value: 'woodie' },
        { label: '麦斯威尔', value: 'maxwell' },
        { label: '韦伯', value: 'webber' },
        { label: '旺达', value: 'wanda' },
        { label: '沃利', value: 'warly' },
        { label: '沃特', value: 'walter' },
        { label: '薇格弗德', value: 'wigfrid' },
        { label: '温迪', value: 'winona' }
      ],

      // 排序参数
      sortParams: {
        prop: 'last_seen',
        order: 'descending'
      },

      // 玩家详情
      playerDetailVisible: false,
      currentPlayer: null,



      // 封禁
      banDialogVisible: false,
      banForm: {
        reason: '',
        duration: '1d'
      },
      banning: false,

      // 会话列表
      sessionList: [],
      updateDialogVisible: false,
      updateForm: {
        session_name: ''
      },
      updating: false,

      // 无敌模式
      godModeDialogVisible: false,
      godModeForm: {
        enabled: true
      },
      settingGodMode: false,

      // 制作模式
      creativeModeDialogVisible: false,
      creativeModeForm: {
        enabled: true
      },
      settingCreativeMode: false,

      // 重选人物
      characterDialogVisible: false,
      changingCharacter: false,

      // 定时更新任务
      scheduleDialogVisible: false,
      addingSchedule: false,
      scheduleForm: {
        name: '',
        description: '',
        session_name: '',
        spec: '0 */3 * * * *' // 默认每3分钟执行一次
      },
      scheduleRules: {
        name: [
          { required: true, message: '请输入任务名称', trigger: 'blur' },
          { min: 2, max: 50, message: '长度在2到50个字符', trigger: 'blur' }
        ],
        session_name: [
          { required: true, message: '请选择游戏世界', trigger: 'change' }
        ],
        spec: [
          { required: true, message: '请输入Cron表达式', trigger: 'blur' }
        ]
      },

      // 会话选择
      selectedSessionName: '',
      sessionSelectDialogVisible: false
    };
  },
  created() {
    this.fetchArchives();
    this.fetchSessions();
    this.fetchPlayerList();
  },

  computed: {
    // 获取默认的会话名称（Forest1）
    defaultSessionName() {
      if (this.sessionList && this.sessionList.length > 0) {
        // 优先使用包含Forest并且序号为1的会话
        const forestSession = this.sessionList.find(session =>
          session.name.includes('Forest') && session.name.endsWith('1'));

        if (forestSession) {
          return forestSession.name;
        }

        // 如果没有找到Forest1，则使用第一个包含Forest的会话
        const anyForestSession = this.sessionList.find(session => session.name.includes('Forest'));
        if (anyForestSession) {
          return anyForestSession.name;
        }

        // 如果没有包含Forest的会话，使用第一个会话
        return this.sessionList[0].name;
      }
      return '';
    },

    // 当前选中的会话名称
    activeSessionName() {
      return this.selectedSessionName || this.defaultSessionName;
    }
  },
  methods: {
    // 获取玩家列表
    fetchPlayerList() {
      this.loading = true;

      const params = {
        page: this.pagination.page,
        page_size: this.pagination.page_size,
        ...this.filterForm
      };

      // 添加排序参数
      if (this.sortParams.prop && this.sortParams.order) {
        params.sort_by = this.sortParams.prop;
        params.sort_order = this.sortParams.order === 'ascending' ? 'asc' : 'desc';
      }

      playerApi.getAllPlayers(params)
        .then(response => {
          this.playerList = response.data || [];
          this.pagination.total = response.total || 0;
        })
        .catch(error => {
          console.error('获取玩家列表失败:', error);
          this.$message.error('获取玩家列表失败，请稍后重试');
        })
        .finally(() => {
          this.loading = false;
        });
    },

    // 刷新数据
    refreshData() {
      this.fetchPlayerList();
    },

    // 处理筛选
    handleFilter() {
      this.pagination.page = 1;
      this.fetchPlayerList();
    },

    // 重置筛选
    resetFilter() {
      this.filterForm = {
        archive_name: '',
        status: '',
        prefab: '',
        keyword: ''
      };
      this.handleFilter();
    },

    // 处理排序变化
    handleSortChange({ prop, order }) {
      this.sortParams.prop = prop;
      this.sortParams.order = order;
      this.fetchPlayerList();
    },

    // 处理页码变化
    handleCurrentChange(page) {
      this.pagination.page = page;
      this.fetchPlayerList();
    },

    // 处理每页数量变化
    handleSizeChange(size) {
      this.pagination.page_size = size;
      this.pagination.page = 1;
      this.fetchPlayerList();
    },

    // 查看玩家详情
    viewPlayerDetail(player) {
      this.currentPlayer = { ...player };
      this.playerDetailVisible = true;
    },

    // 踢出玩家
    kickPlayer(player) {
      this.$confirm(`确定要踢出玩家 ${player.player_name} 吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const loading = this.$loading({
          lock: true,
          text: '正在踢出玩家...',
          spinner: 'el-icon-loading',
          background: 'rgba(0, 0, 0, 0.7)'
        });

        playerApi.kickPlayer(player.id, this.activeSessionName)
          .then(() => {
            this.$message.success(`已踢出玩家 ${player.player_name}`);
            this.refreshData();
          })
          .catch(error => {
            console.error('踢出玩家失败:', error);
            this.$message.error(`踢出玩家失败: ${error.message || '未知错误'}`);
          })
          .finally(() => {
            loading.close();
          });
      }).catch(() => {
        // 取消操作
      });
    },

    // 封禁玩家
    banPlayer(player) {
      this.currentPlayer = player;
      this.banForm = {
        reason: '',
        duration: '1d'
      };
      this.banDialogVisible = true;
    },

    // 确认封禁玩家
    confirmBanPlayer() {
      if (!this.banForm.reason) {
        this.$message.warning('请输入封禁原因');
        return;
      }

      this.banning = true;

      const banData = {
        reason: this.banForm.reason,
        duration: this.banForm.duration,
        archive_name: this.activeSessionName
      };

      playerApi.banPlayer(this.currentPlayer.id, banData)
        .then(() => {
          this.$message.success(`已封禁玩家 ${this.currentPlayer.player_name}`);
          this.banDialogVisible = false;
          this.refreshData();
        })
        .catch(error => {
          console.error('封禁玩家失败:', error);
          this.$message.error(`封禁玩家失败: ${error.message || '未知错误'}`);
        })
        .finally(() => {
          this.banning = false;
        });
    },



    // 重选人物
    changeCharacter(player) {
      this.currentPlayer = player;
      this.characterDialogVisible = true;
    },

    // 确认重选人物
    confirmChangeCharacter() {
      this.$confirm(`确定要让玩家 ${this.currentPlayer.player_name} 重选人物吗?该操作会将玩家重置！`, '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.changingCharacter = true;

        playerApi.changeCharacter(this.currentPlayer.user_id, this.activeSessionName)
          .then(response => {
            if (response && response.status === 200) {
              this.$message.success(`已重置玩家 ${this.currentPlayer.player_name}，玩家可以重新选择角色`);
              this.characterDialogVisible = false;
              this.refreshData();
            } else {
              throw new Error(response.msg || '命令执行失败');
            }
          })
          .catch(error => {
            console.error('重选人物失败:', error);
            this.$message.error(`重选人物失败: ${error.message || '未知错误'}`);
          })
          .finally(() => {
            this.changingCharacter = false;
          });
      }).catch(() => {
        // 取消操作
      });
    },

    // 显示定时更新对话框
    showScheduleDialog() {
      // 默认选择当前世界
      const sessionName = this.activeSessionName || 'dstserver_lcytest_Forest1';
      this.scheduleForm = {
        name: `自动更新玩家列表_${sessionName}`,
        description: `定时更新${sessionName}的玩家列表`,
        session_name: sessionName,
        spec: '0 */3 * * * *' // 默认每3分钟执行一次
      };
      this.scheduleDialogVisible = true;
    },

    // 确认添加定时任务
    confirmAddSchedule() {
      this.$refs.scheduleForm.validate(valid => {
        if (valid) {
          this.addingSchedule = true;

          // 构建任务数据 - 使用函数类型
          const taskData = {
            name: this.scheduleForm.name,
            description: this.scheduleForm.description,
            spec: this.scheduleForm.spec,
            type: 'function',
            status: 1, // 启用状态
            target: 'update_player_info',
            args: [this.scheduleForm.session_name || 'dstserver_lcytest_Forest1']
          };

          cronTaskApi.addTask(taskData)
            .then(response => {
              if (response && (response.code === 200 || (response.data && response.data.code === 200))) {
                this.$message.success('定时更新任务添加成功');
                this.scheduleDialogVisible = false;
              } else {
                throw new Error(response.msg || response.message || '添加失败');
              }
            })
            .catch(error => {
              console.error('添加定时任务失败:', error);
              this.$message.error(`添加定时任务失败: ${error.message || '未知错误'}`);
            })
            .finally(() => {
              this.addingSchedule = false;
            });
        } else {
          this.$message.warning('请完善表单信息');
        }
      });
    },

    // 导出玩家数据
    exportPlayerData() {
      this.$message.info('导出功能开发中...');
    },

    // 格式化日期
    formatDate(dateString) {
      if (!dateString) return '-';
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    },

    // 获取角色名称
    getCharacterName(prefab) {
      const character = this.characterOptions.find(c => c.value === prefab);
      return character ? character.label : prefab;
    },

    // 获取存档列表
    fetchArchives() {
      playerApi.getArchives()
        .then(response => {
          if (response.data && Array.isArray(response.data)) {
            this.archiveOptions = response.data.map(archive => ({
              label: archive.name || archive.archive_name || archive,
              value: archive.name || archive.archive_name || archive
            }));
          }
        })
        .catch(error => {
          console.error('获取存档列表失败:', error);
          // 设置默认存档选项
          this.archiveOptions = [
            { label: 'MyCluster', value: 'MyCluster' },
            { label: 'TestWorld', value: 'TestWorld' }
          ];
        });
    },

    // 获取会话列表
    fetchSessions() {
      playerApi.getSessions()
        .then(response => {
          if (response.data && Array.isArray(response.data)) {
            this.sessionList = response.data;
            // 如果有运行中的会话，默认选择第一个
            if (this.sessionList.length > 0) {
              this.updateForm.session_name = this.sessionList[0].name;
              // 设置默认选中的会话
              this.selectedSessionName = this.defaultSessionName;
            }
          }
        })
        .catch(error => {
          console.error('获取会话列表失败:', error);
          this.sessionList = [];
        });
    },

    // 显示会话选择对话框
    showSessionSelect() {
      // 如果还没有选择会话，则默认选择Forest1
      if (!this.selectedSessionName && this.defaultSessionName) {
        this.selectedSessionName = this.defaultSessionName;
      }
      this.sessionSelectDialogVisible = true;
    },

    // 确认选择会话
    confirmSessionSelect() {
      if (!this.selectedSessionName) {
        this.$message.warning('请选择一个游戏世界');
        return;
      }

      this.$message.success(`已选择游戏世界: ${this.selectedSessionName}`);
      this.sessionSelectDialogVisible = false;
    },

    // 处理下拉菜单命令
    handleCommand(command, player) {
      this.currentPlayer = { ...player };
      switch (command) {
        case 'kick':
          this.kickPlayer(player);
          break;
        case 'ban':
          this.banPlayer(player);
          break;
        case 'kill':
          this.killPlayer(player);
          break;
        case 'godMode':
          this.toggleGodMode(player);
          break;
        case 'creativeMode':
          this.toggleCreativeMode(player);
          break;
        case 'resurrect':
          this.resurrectPlayer(player);
          break;
        case 'message':
          this.sendMessage();
          break;
        default:
          break;
      }
    },

    // 杀死玩家
    killPlayer(player) {
      this.$confirm(`确定要杀死玩家 ${player.player_name} 吗?该操作会导致玩家死亡！`, '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const loading = this.$loading({
          lock: true,
          text: '正在执行操作...',
          spinner: 'el-icon-loading',
          background: 'rgba(0, 0, 0, 0.7)'
        });

        // 使用KU ID杀死玩家
        playerApi.killPlayer(player.user_id, this.activeSessionName)
          .then(response => {
            if (response && response.status === 200) {
              this.$message.success(`已杀死玩家 ${player.player_name}`);
              this.refreshData();
            } else {
              throw new Error(response.msg || '命令执行失败');
            }
          })
          .catch(error => {
            console.error('杀死玩家失败:', error);
            this.$message.error(`杀死玩家失败: ${error.message || '未知错误'}`);
          })
          .finally(() => {
            loading.close();
          });
      }).catch(() => {
        // 取消操作
      });
    },

    // 切换无敌模式
    toggleGodMode(player) {
      this.currentPlayer = player;
      this.godModeForm.enabled = true; // 默认开启
      this.godModeDialogVisible = true;
    },

    // 确认设置无敌模式
    confirmGodMode() {
      this.settingGodMode = true;

      playerApi.setGodMode(
        this.currentPlayer.user_id,
        this.godModeForm.enabled,
        this.activeSessionName
      )
        .then(response => {
          if (response && response.status === 200) {
            const status = this.godModeForm.enabled ? '开启' : '关闭';
            this.$message.success(`已${status}玩家 ${this.currentPlayer.player_name} 的无敌模式`);
            this.godModeDialogVisible = false;
          } else {
            throw new Error(response.msg || '命令执行失败');
          }
        })
        .catch(error => {
          console.error('设置无敌模式失败:', error);
          this.$message.error(`设置无敌模式失败: ${error.message || '未知错误'}`);
        })
        .finally(() => {
          this.settingGodMode = false;
        });
    },

    // 切换制作模式
    toggleCreativeMode(player) {
      this.currentPlayer = player;
      this.creativeModeForm.enabled = true; // 默认开启
      this.creativeModeDialogVisible = true;
    },

    // 确认设置制作模式
    confirmCreativeMode() {
      this.settingCreativeMode = true;

      playerApi.setCreativeMode(
        this.currentPlayer.user_id,
        this.creativeModeForm.enabled,
        this.activeSessionName
      )
        .then(response => {
          if (response && response.status === 200) {
            const status = this.creativeModeForm.enabled ? '开启' : '关闭';
            this.$message.success(`已${status}玩家 ${this.currentPlayer.player_name} 的制作模式`);
            this.creativeModeDialogVisible = false;
          } else {
            throw new Error(response.msg || '命令执行失败');
          }
        })
        .catch(error => {
          console.error('设置制作模式失败:', error);
          this.$message.error(`设置制作模式失败: ${error.message || '未知错误'}`);
        })
        .finally(() => {
          this.settingCreativeMode = false;
        });
    },

    // 复活玩家
    resurrectPlayer(player) {
      this.$confirm(`确定要复活玩家 ${player.player_name} 吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        const loading = this.$loading({
          lock: true,
          text: '正在执行操作...',
          spinner: 'el-icon-loading',
          background: 'rgba(0, 0, 0, 0.7)'
        });

        playerApi.resurrectPlayer(player.user_id, this.activeSessionName)
          .then(response => {
            if (response && response.status === 200) {
              this.$message.success(`已复活玩家 ${player.player_name}`);
            } else {
              throw new Error(response.msg || '命令执行失败');
            }
          })
          .catch(error => {
            console.error('复活玩家失败:', error);
            this.$message.error(`复活玩家失败: ${error.message || '未知错误'}`);
          })
          .finally(() => {
            loading.close();
          });
      }).catch(() => {
        // 取消操作
      });
    },

    // 手动更新玩家列表
    showUpdateDialog() {
      this.updateDialogVisible = true;
    },

    // 确认更新玩家列表
    confirmUpdate() {
      if (!this.updateForm.session_name) {
        this.$message.warning('请选择会话');
        return;
      }

      this.updating = true;

      playerApi.updatePlayerInfo(this.updateForm.session_name)
        .then(() => {
          this.$message.success('玩家列表更新成功');
          this.updateDialogVisible = false;
          this.refreshData();
        })
        .catch(error => {
          console.error('更新玩家列表失败:', error);
          this.$message.error(`更新玩家列表失败: ${error.message || '未知错误'}`);
        })
        .finally(() => {
          this.updating = false;
        });
    }
  }
};
</script>

<style scoped>
.player-list-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.title-container {
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: bold;
}

.title-container i {
  margin-right: 8px;
  font-size: 20px;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
}

.table-card {
  margin-bottom: 20px;
}

.table-operations {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.player-name-cell {
  display: flex;
  align-items: center;
}

.detail-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.operation-buttons {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.el-dropdown-menu__item i {
  margin-right: 5px;
  font-size: 16px;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-buttons .el-tag {
  margin-left: 10px;
}

.cron-help {
  margin-top: 5px;
  color: #666;
  font-size: 12px;
  background-color: #f8f8f8;
  padding: 10px;
  border-radius: 4px;
}

.cron-help p {
  margin: 5px 0;
}

.cron-help ul {
  margin: 5px 0;
  padding-left: 20px;
}

.cron-help code {
  background-color: #eee;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
}

.important-note {
  color: #e6a23c;
  font-weight: bold;
  border-left: 3px solid #e6a23c;
  padding-left: 10px;
  margin: 10px 0;
}

.world-help {
  margin-top: 5px;
  color: #666;
  font-size: 12px;
  background-color: #f8f8f8;
  padding: 10px;
  border-radius: 4px;
}
</style>