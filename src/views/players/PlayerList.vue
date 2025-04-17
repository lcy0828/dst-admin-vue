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
        <el-table-column label="操作" width="200" fixed="right">
          <template slot-scope="scope">
            <el-button size="mini" type="primary" icon="el-icon-view" @click="viewPlayerDetail(scope.row)">详情</el-button>
            <el-button
              size="mini"
              :type="scope.row.status === 'online' ? 'danger' : 'info'"
              :icon="scope.row.status === 'online' ? 'el-icon-close' : 'el-icon-lock'"
              @click="scope.row.status === 'online' ? kickPlayer(scope.row) : banPlayer(scope.row)">
              {{ scope.row.status === 'online' ? '踢出' : '封禁' }}
            </el-button>
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
          <el-button type="primary" size="small" icon="el-icon-message" @click="sendMessage">发送消息</el-button>
          <el-button
            :type="currentPlayer.status === 'online' ? 'danger' : 'info'"
            size="small"
            :icon="currentPlayer.status === 'online' ? 'el-icon-close' : 'el-icon-lock'"
            @click="currentPlayer.status === 'online' ? kickPlayer(currentPlayer) : banPlayer(currentPlayer)">
            {{ currentPlayer.status === 'online' ? '踢出' : '封禁' }}
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 发送消息对话框 -->
    <el-dialog title="发送消息" :visible.sync="messageDialogVisible" width="30%">
      <el-form :model="messageForm" label-width="80px">
        <el-form-item label="消息内容" required>
          <el-input
            type="textarea"
            v-model="messageForm.content"
            :rows="4"
            placeholder="请输入要发送的消息内容">
          </el-input>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="messageDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSendMessage" :loading="sendingMessage">发送</el-button>
      </span>
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
  </div>
</template>

<script>
import { playerApi } from '@/api/playerApi';

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

      // 发送消息
      messageDialogVisible: false,
      messageForm: {
        content: ''
      },
      sendingMessage: false,

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
      updating: false
    };
  },
  created() {
    this.fetchArchives();
    this.fetchSessions();
    this.fetchPlayerList();
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

        playerApi.kickPlayer(player.id, player.archive_name)
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
        archive_name: this.currentPlayer.archive_name
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

    // 发送消息
    sendMessage() {
      this.messageForm.content = '';
      this.messageDialogVisible = true;
    },

    // 确认发送消息
    confirmSendMessage() {
      if (!this.messageForm.content) {
        this.$message.warning('请输入消息内容');
        return;
      }

      this.sendingMessage = true;

      playerApi.sendMessage(
        this.currentPlayer.id,
        this.messageForm.content,
        this.currentPlayer.archive_name
      )
        .then(() => {
          this.$message.success(`已向玩家 ${this.currentPlayer.player_name} 发送消息`);
          this.messageDialogVisible = false;
        })
        .catch(error => {
          console.error('发送消息失败:', error);
          this.$message.error(`发送消息失败: ${error.message || '未知错误'}`);
        })
        .finally(() => {
          this.sendingMessage = false;
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
            }
          }
        })
        .catch(error => {
          console.error('获取会话列表失败:', error);
          this.sessionList = [];
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
}
</style>