<template>
  <div class="workspace-page">
    <header class="workspace-header">
      <div class="workspace-heading">
        <span class="workspace-kicker">当前管理目标</span>
        <div class="workspace-title-row">
          <h1>服务器工作台</h1>
          <span v-if="selectedRoom" class="room-state" :class="{ running: runningWorlds.length > 0 }">
            <span class="state-dot"></span>
            {{ runningWorlds.length > 0 ? '运行中' : '已停止' }}
          </span>
        </div>
        <p>{{ selectedRoom ? `${selectedRoom.name} · ${worlds.length} 个世界` : '尚未选择房间' }}</p>
      </div>

      <div class="workspace-toolbar">
        <el-select
          v-model="selectedRoomId"
          aria-label="选择房间"
          placeholder="选择房间"
          filterable
          :loading="loading"
          @change="handleRoomChange"
        >
          <el-option
            v-for="room in rooms"
            :key="room.id"
            :label="room.name"
            :value="room.id"
          />
        </el-select>
        <el-tooltip content="刷新工作台" placement="bottom">
          <el-button
            icon="el-icon-refresh"
            circle
            aria-label="刷新工作台"
            :loading="loading"
            @click="refreshWorkspace"
          />
        </el-tooltip>
        <el-button
          type="primary"
          icon="el-icon-document-add"
          :loading="backupCreating"
          :disabled="!selectedRoom"
          @click="createBackup"
        >
          创建备份
        </el-button>
      </div>
    </header>

    <el-alert
      v-if="loadError"
      class="workspace-alert"
      type="error"
      :closable="false"
      show-icon
      :title="loadError"
    >
      <template #default>
        <el-button size="small" @click="refreshWorkspace">重新加载</el-button>
      </template>
    </el-alert>

    <el-empty v-else-if="!loading && rooms.length === 0" description="当前目标没有已接管的房间">
      <el-button type="primary" @click="$router.push('/rooms/list')">前往房间管理</el-button>
    </el-empty>

    <template v-else-if="selectedRoom">
      <section class="status-strip" aria-label="服务器概况">
        <div class="status-item">
          <span class="status-label">世界状态</span>
          <strong>{{ runningWorlds.length }} / {{ worlds.length }}</strong>
          <span class="status-meta">运行中</span>
        </div>
        <div class="status-item">
          <span class="status-label">在线玩家</span>
          <strong>{{ playerStats ? playerStats.online_count : '--' }}</strong>
          <span class="status-meta">
            {{ contextErrors.players ? '读取失败' : `共 ${playerStats ? playerStats.total_count : '--'} 人` }}
          </span>
        </div>
        <div class="status-item">
          <span class="status-label">磁盘使用</span>
          <strong>{{ formatPercent(systemStatus.disk_usage) }}</strong>
          <span class="status-meta">剩余 {{ formatDisk(systemStatus.free_disk) }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">最近备份</span>
          <strong class="status-time">{{ latestBackup ? formatCompactTime(latestBackup.createdAt || latestBackup.create_time) : '--' }}</strong>
          <span class="status-meta">{{ contextErrors.backups ? '读取失败' : (latestBackup?.size_formatted || '暂无记录') }}</span>
        </div>
      </section>

      <section class="world-section">
        <div class="section-heading">
          <div>
            <h2>世界与分片</h2>
            <span>{{ selectedRoom.directoryName || selectedRoom.savepath || '' }}</span>
          </div>
          <el-button text icon="el-icon-setting" @click="openRoomSettings">房间设置</el-button>
        </div>

        <div v-if="worlds.length" class="world-grid">
          <article
            v-for="world in worlds"
            :key="world.id"
            class="world-item"
            :class="{
              selected: world.id === selectedWorldId,
              running: world.status === 'running'
            }"
            tabindex="0"
            @click="selectWorld(world)"
            @keyup.enter="selectWorld(world)"
          >
            <div class="world-main">
              <div class="world-symbol" :class="worldTone(world)">
                <component :is="worldIcon(world)" />
              </div>
              <div class="world-identity">
                <div class="world-name-row">
                  <strong>{{ world.name }}</strong>
                  <el-tag size="small" effect="plain" :type="world.status === 'running' ? 'success' : 'info'">
                    {{ worldStatusLabel(world.status) }}
                  </el-tag>
                </div>
                <span>{{ worldRoleLabel(world) }} · {{ world.directoryName || '未设置目录' }}</span>
              </div>
            </div>

            <dl class="world-facts">
              <div>
                <dt>天数</dt>
                <dd>{{ metricValue(world.day) }}</dd>
              </div>
              <div>
                <dt>季节</dt>
                <dd>{{ seasonLabel(world.season) }}</dd>
              </div>
              <div>
                <dt>控制</dt>
                <dd>{{ world.controlAvailable === false ? '不可用' : '可用' }}</dd>
              </div>
            </dl>

            <div class="world-actions" @click.stop>
              <el-tooltip :content="world.status === 'running' ? '停止世界' : '启动世界'" placement="top">
                <el-button
                  circle
                  size="small"
                  :type="world.status === 'running' ? 'danger' : 'success'"
                  :icon="world.status === 'running' ? 'el-icon-video-pause' : 'el-icon-video-play'"
                  :aria-label="world.status === 'running' ? '停止世界' : '启动世界'"
                  :loading="worldActionId === world.id"
                  :disabled="world.controlAvailable === false"
                  @click="handleWorldAction(world, world.status === 'running' ? 'stop' : 'start')"
                />
              </el-tooltip>
              <el-tooltip content="重启世界" placement="top">
                <el-button
                  circle
                  size="small"
                  icon="el-icon-refresh-right"
                  aria-label="重启世界"
                  :disabled="world.status !== 'running' || world.controlAvailable === false"
                  @click="handleWorldAction(world, 'restart')"
                />
              </el-tooltip>
              <el-tooltip content="世界配置" placement="top">
                <el-button
                  circle
                  size="small"
                  icon="el-icon-setting"
                  aria-label="世界配置"
                  @click="openWorldSettings(world)"
                />
              </el-tooltip>
            </div>
          </article>
        </div>
        <el-empty v-else description="当前房间没有世界" :image-size="72" />
      </section>

      <div class="workspace-grid">
        <section class="operation-panel">
          <el-tabs v-model="activeOperation" class="operation-tabs">
            <el-tab-pane name="logs">
              <template #label>
                <span class="tab-label"><component :is="'el-icon-document'" />实时日志</span>
              </template>
              <world-log
                v-if="selectedWorld"
                :key="`${selectedRoomId}:${selectedWorldId}`"
                :room-id="selectedRoomId"
                :world-id="selectedWorldId"
                :archive-name="selectedRoom.name"
                :world-name="selectedWorld.name"
                title="分片日志"
                class="workspace-log"
              />
              <el-empty v-else description="请选择世界" :image-size="72" />
            </el-tab-pane>

            <el-tab-pane name="console">
              <template #label>
                <span class="tab-label"><component :is="'el-icon-monitor'" />控制台</span>
              </template>
              <div v-loading="contextLoading" class="console-panel">
                <div class="console-toolbar">
                  <el-select v-model="consoleServer" placeholder="选择目标世界" aria-label="选择控制台目标世界">
                    <el-option
                      v-for="server in roomConsoleServers"
                      :key="server.session_name"
                      :label="server.name"
                      :value="server.session_name"
                    />
                  </el-select>
                  <el-dropdown trigger="click" @command="applyCommonCommand">
                    <el-button>常用命令<component :is="'el-icon-arrow-down'" class="button-tail-icon" /></el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item v-for="item in commonCommands" :key="item.command" :command="item.command">
                          {{ item.name }}
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                  <el-button text icon="el-icon-setting" @click="$router.push('/servers/commands')">命令管理</el-button>
                </div>
                <el-alert
                  v-if="contextErrors.console"
                  class="context-error"
                  type="error"
                  :closable="false"
                  show-icon
                  :title="contextErrors.console"
                />
                <el-input
                  v-model="rawCommand"
                  type="textarea"
                  :rows="7"
                  resize="vertical"
                  placeholder="输入 Lua 控制台命令"
                  aria-label="Lua 控制台命令"
                />
                <div class="console-footer">
                  <span>目标：{{ selectedConsoleServer?.name || '未选择' }}</span>
                  <el-button
                    type="primary"
                    icon="el-icon-position"
                    :loading="commandExecuting"
                    :disabled="!consoleServer || !rawCommand.trim()"
                    @click="executeRawCommand"
                  >
                    执行
                  </el-button>
                </div>
                <div v-if="commandResult" class="command-result" :class="{ failed: !commandResult.success }" role="status">
                  <div>
                    <strong>{{ commandResult.success ? '命令已发送' : '命令执行失败' }}</strong>
                    <span v-if="commandResult.runId">运行记录 {{ commandResult.runId }}</span>
                  </div>
                  <p>{{ commandResult.message }}</p>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </section>

        <aside v-loading="contextLoading" class="context-rail" :aria-busy="contextLoading">
          <section class="rail-section">
            <div class="rail-heading">
              <div>
                <h2>玩家</h2>
                <span>{{ contextErrors.players ? '数据读取失败' : (playerStats ? `${playerStats.online_count} 人在线` : '状态不可用') }}</span>
              </div>
              <el-button text icon="el-icon-arrow-right" @click="openPlayers">全部</el-button>
            </div>
            <div v-if="recentPlayers.length" class="player-list">
              <button
                v-for="player in recentPlayers"
                :key="`${player.room_id}:${player.user_id}`"
                type="button"
                class="player-row"
                @click="openPlayers"
              >
                <span class="player-avatar"><component :is="'el-icon-user'" /></span>
                <span class="player-copy">
                  <strong>{{ player.player_name || player.user_id }}</strong>
                  <span>{{ characterLabel(player.prefab) }} · {{ player.world_name || '未知世界' }}</span>
                </span>
                <span class="player-status" :class="{ online: player.status === 'online' }">
                  {{ player.status === 'online' ? '在线' : '离线' }}
                </span>
              </button>
            </div>
            <div v-else class="rail-empty">{{ contextErrors.players ? '玩家数据读取失败' : '暂无玩家记录' }}</div>
          </section>

          <section class="rail-section">
            <div class="rail-heading">
              <div>
                <h2>最近备份</h2>
                <span>{{ contextErrors.backups ? '列表读取失败' : `${backups.length} 个记录` }}</span>
              </div>
              <el-button text icon="el-icon-arrow-right" @click="$router.push('/backups')">全部</el-button>
            </div>
            <div v-if="backups.length" class="backup-list">
              <div v-for="backup in backups.slice(0, 3)" :key="backup.id || backup.name" class="backup-row">
                <component :is="'el-icon-document-checked'" />
                <span>
                  <strong>{{ backup.name }}</strong>
                  <small>{{ backup.create_time || formatCompactTime(backup.createdAt) }} · {{ backup.size_formatted || '--' }}</small>
                </span>
              </div>
            </div>
            <div v-else class="rail-empty">{{ contextErrors.backups ? '备份列表读取失败' : '暂无备份记录' }}</div>
          </section>

          <nav class="quick-nav" aria-label="服务器快捷入口">
            <button type="button" @click="openPlayers">
              <component :is="'el-icon-user'" />
              <span>玩家管理</span>
            </button>
            <button type="button" @click="openMods">
              <component :is="'el-icon-s-operation'" />
              <span>模组管理</span>
            </button>
            <button type="button" @click="openWorldState">
              <component :is="'el-icon-data-analysis'" />
              <span>世界状态</span>
            </button>
            <button type="button" @click="$router.push('/logs/query')">
              <component :is="'el-icon-search'" />
              <span>日志查询</span>
            </button>
          </nav>
        </aside>
      </div>
    </template>
  </div>
</template>

<script>
import WorldLog from '@/components/WorldLog.vue'
import { backupApi, commandApi, playerApi, roomApi, systemApi } from '@/api'

const CHARACTER_NAMES = {
  wilson: '威尔逊',
  willow: '薇洛',
  wolfgang: '沃尔夫冈',
  wendy: '温蒂',
  wx78: 'WX-78',
  wickerbottom: '薇克巴顿',
  woodie: '伍迪',
  wes: '韦斯',
  waxwell: '麦斯威尔',
  wathgrithr: '薇格弗德',
  webber: '韦伯',
  winona: '薇诺娜',
  wortox: '沃拓克斯',
  wormwood: '沃姆伍德',
  warly: '沃利',
  wurt: '沃特',
  walter: '沃尔特',
  wanda: '旺达'
}

export default {
  name: 'ServerWorkspace',
  components: { WorldLog },
  data() {
    return {
      loading: false,
      contextLoading: false,
      loadError: '',
      rooms: [],
      selectedRoomId: this.$route.query.roomId || '',
      selectedWorldId: this.$route.query.worldId || '',
      systemStatus: {},
      playerStats: null,
      backups: [],
      consoleServers: [],
      contextErrors: {
        players: '',
        backups: '',
        console: ''
      },
      worldActionId: '',
      backupCreating: false,
      activeOperation: 'logs',
      consoleServer: '',
      rawCommand: '',
      commandExecuting: false,
      commandResult: null,
      refreshTimer: null,
      commonCommands: [
        { name: '保存世界', command: 'c_save()' },
        { name: '查看在线玩家', command: 'c_listallplayers()' },
        { name: '查看世界天数', command: "print('当前天数: ' .. TheWorld.state.cycles + 1)" },
        { name: '查看当前季节', command: "print('当前季节: ' .. TheWorld.state.season)" },
        { name: '发送公告', command: "c_announce('请输入公告内容')" }
      ]
    }
  },
  computed: {
    selectedRoom() {
      return this.rooms.find(room => room.id === this.selectedRoomId) || null
    },
    worlds() {
      return this.selectedRoom?.worlds || []
    },
    selectedWorld() {
      return this.worlds.find(world => world.id === this.selectedWorldId) || null
    },
    runningWorlds() {
      return this.worlds.filter(world => world.status === 'running')
    },
    recentPlayers() {
      return this.playerStats?.recent_players?.slice(0, 5) || []
    },
    latestBackup() {
      return this.backups[0] || null
    },
    roomConsoleServers() {
      return this.consoleServers.filter(server => server.room_id === this.selectedRoomId)
    },
    selectedConsoleServer() {
      return this.roomConsoleServers.find(server => server.session_name === this.consoleServer) || null
    }
  },
  async created() {
    await this.refreshWorkspace()
    this.refreshTimer = window.setInterval(() => this.refreshWorkspace(true), 30000)
  },
  beforeUnmount() {
    if (this.refreshTimer) window.clearInterval(this.refreshTimer)
  },
  methods: {
    unwrapList(response) {
      if (Array.isArray(response)) return response
      return Array.isArray(response?.data) ? response.data : []
    },
    async refreshWorkspace(silent = false) {
      if (!silent) this.loading = true
      this.loadError = ''
      const previousRoomId = this.selectedRoomId
      const [roomsResult, systemResult] = await Promise.allSettled([
        roomApi.getRoomList(),
        systemApi.getDashboardStatus()
      ])

      if (roomsResult.status === 'rejected') {
        this.rooms = []
        this.loadError = roomsResult.reason?.message || '无法读取房间和世界状态'
      } else {
        this.rooms = this.unwrapList(roomsResult.value)
        this.resolveSelection()
      }

      this.systemStatus = systemResult.status === 'fulfilled'
        ? (systemResult.value?.data || {})
        : {}

      if (this.selectedRoom) {
        if (silent && previousRoomId === this.selectedRoomId) await this.refreshPlayerStats()
        else await this.refreshRoomContext()
      }
      if (!silent) this.loading = false
    },
    resolveSelection() {
      let room = this.rooms.find(item => item.id === this.selectedRoomId)
      if (!room) room = this.rooms.find(item => item.managed) || this.rooms[0]
      this.selectedRoomId = room?.id || ''

      const worlds = room?.worlds || []
      let world = worlds.find(item => item.id === this.selectedWorldId)
      if (!world) world = worlds.find(item => item.status === 'running') || worlds[0]
      this.selectedWorldId = world?.id || ''
      this.syncConsoleTarget()
      this.syncRouteContext()
    },
    async handleRoomChange() {
      this.selectedWorldId = (this.worlds.find(world => world.status === 'running') || this.worlds[0])?.id || ''
      this.syncConsoleTarget()
      this.syncRouteContext()
      await this.refreshRoomContext()
    },
    async refreshRoomContext() {
      if (!this.selectedRoom) return
      const roomId = this.selectedRoomId
      const roomName = this.selectedRoom.name
      this.contextLoading = true
      this.playerStats = null
      this.backups = []
      this.consoleServers = []
      this.consoleServer = ''
      this.contextErrors = { players: '', backups: '', console: '' }
      const [playersResult, backupsResult, consoleResult] = await Promise.allSettled([
        playerApi.getPlayerStats(roomName),
        backupApi.getBackupList(),
        commandApi.getServers()
      ])

      if (this.selectedRoomId !== roomId) return
      this.playerStats = playersResult.status === 'fulfilled'
        ? playersResult.value?.data || null
        : null
      this.contextErrors.players = playersResult.status === 'rejected'
        ? (playersResult.reason?.message || '玩家数据读取失败')
        : ''
      this.backups = backupsResult.status === 'fulfilled'
        ? [...(backupsResult.value?.data?.[roomName] || [])].sort((left, right) => {
          const leftTime = new Date(left.createdAt || left.create_time || 0).getTime()
          const rightTime = new Date(right.createdAt || right.create_time || 0).getTime()
          return rightTime - leftTime
        })
        : []
      this.contextErrors.backups = backupsResult.status === 'rejected'
        ? (backupsResult.reason?.message || '备份列表读取失败')
        : ''
      this.consoleServers = consoleResult.status === 'fulfilled' ? consoleResult.value : []
      this.contextErrors.console = consoleResult.status === 'rejected'
        ? (consoleResult.reason?.message || '控制台目标读取失败')
        : ''
      this.syncConsoleTarget()
      this.contextLoading = false
    },
    async refreshPlayerStats() {
      if (!this.selectedRoom) return
      const roomId = this.selectedRoomId
      this.contextErrors.players = ''
      try {
        const response = await playerApi.getPlayerStats(this.selectedRoom.name)
        if (this.selectedRoomId === roomId) this.playerStats = response?.data || null
      } catch (error) {
        if (this.selectedRoomId === roomId) {
          this.playerStats = null
          this.contextErrors.players = error.message || '玩家数据读取失败'
        }
      }
    },
    selectWorld(world) {
      this.selectedWorldId = world.id
      this.syncConsoleTarget()
      this.syncRouteContext()
    },
    syncConsoleTarget() {
      const matching = this.consoleServers.find(server =>
        server.room_id === this.selectedRoomId && server.world_id === this.selectedWorldId
      )
      const currentValid = this.consoleServers.some(server => server.session_name === this.consoleServer)
      if (matching) this.consoleServer = matching.session_name
      else if (!currentValid) this.consoleServer = this.roomConsoleServers[0]?.session_name || ''
    },
    syncRouteContext() {
      const roomId = this.selectedRoomId || undefined
      const worldId = this.selectedWorldId || undefined
      if (this.$route.query.roomId === roomId && this.$route.query.worldId === worldId) return
      this.$router.replace({
        path: this.$route.path,
        query: { ...this.$route.query, roomId, worldId }
      }).catch(() => {})
    },
    async handleWorldAction(world, action) {
      const label = { start: '启动', stop: '停止', restart: '重启' }[action]
      try {
        await this.$confirm(`确定要${label}“${this.selectedRoom.name} / ${world.name}”吗？`, `${label}世界`, {
          confirmButtonText: `确认${label}`,
          cancelButtonText: '取消',
          type: action === 'start' ? 'info' : 'warning'
        })
      } catch {
        return
      }

      this.worldActionId = world.id
      try {
        let response
        const target = { room_id: this.selectedRoom.id, world_id: world.id }
        if (action === 'start') response = await roomApi.startRoom(target)
        if (action === 'stop') response = await roomApi.stopRoom(target)
        if (action === 'restart') response = await systemApi.restartTmuxServer({
          ...target,
          archive_name: this.selectedRoom.name,
          world_name: world.name
        })
        this.$message.success(response?.msg || `${label}任务已提交`)
        window.setTimeout(() => this.refreshWorkspace(true), 1500)
      } catch (error) {
        this.$message.error(`${label}失败：${error.message || '未知错误'}`)
      } finally {
        this.worldActionId = ''
      }
    },
    async createBackup() {
      if (!this.selectedRoom) return
      this.backupCreating = true
      try {
        const response = await backupApi.createBackup(this.selectedRoom.name)
        this.$message.success(response?.msg || '备份任务已提交')
        window.setTimeout(() => this.refreshRoomContext(), 1500)
      } catch (error) {
        this.$message.error(`创建备份失败：${error.message || '未知错误'}`)
      } finally {
        this.backupCreating = false
      }
    },
    applyCommonCommand(command) {
      this.rawCommand = command
    },
    async executeRawCommand() {
      const server = this.selectedConsoleServer
      if (!server || !this.rawCommand.trim()) return

      let confirmation
      try {
        const response = await this.$prompt(
          `该操作会向分片发送 Lua 命令，请输入房间名“${server.room_name}”确认`,
          '执行确认',
          {
            confirmButtonText: '确认执行',
            cancelButtonText: '取消',
            inputValidator: value => value === server.room_name || '房间名不匹配'
          }
        )
        confirmation = response.value
      } catch {
        return
      }

      this.commandExecuting = true
      this.commandResult = null
      try {
        const run = await commandApi.executeRawCommand(server.session_name, this.rawCommand.trim(), confirmation)
        const success = run.status === 'sent'
        this.commandResult = {
          success,
          runId: run.id,
          message: run.message || run.errorMessage || (success ? '命令已发送到分片控制台' : '命令发送失败')
        }
        if (success) this.$message.success('命令已发送')
        else this.$message.error(this.commandResult.message)
      } catch (error) {
        this.commandResult = { success: false, message: error.message || '命令发送失败' }
        this.$message.error(this.commandResult.message)
      } finally {
        this.commandExecuting = false
      }
    },
    openRoomSettings() {
      this.$router.push({ path: '/rooms/settings', query: { id: this.selectedRoomId } })
    },
    openWorldSettings(world) {
      this.$router.push({
        path: '/worlds/settings',
        query: {
          roomId: this.selectedRoomId,
          roomName: this.selectedRoom.name,
          worldId: world.id,
          worldName: world.name,
          worldType: world.type
        }
      })
    },
    openWorldState() {
      this.$router.push({
        path: '/worlds/state',
        query: {
          roomId: this.selectedRoomId,
          roomName: this.selectedRoom?.name,
          worldId: this.selectedWorldId,
          worldName: this.selectedWorld?.name
        }
      })
    },
    openPlayers() {
      this.$router.push({ path: '/players/list', query: { archive: this.selectedRoom?.name } })
    },
    openMods() {
      this.$router.push({
        path: '/mods/list',
        query: { roomId: this.selectedRoomId, worldId: this.selectedWorldId || undefined }
      })
    },
    worldIcon(world) {
      return ['cave', 'caves'].includes(world.type || world.role) ? 'el-icon-moon-night' : 'el-icon-sunny'
    },
    worldTone(world) {
      return ['cave', 'caves'].includes(world.type || world.role) ? 'cave' : 'forest'
    },
    worldRoleLabel(world) {
      const role = world.type || world.role
      if (['forest', 'master'].includes(role)) return '森林世界'
      if (['cave', 'caves'].includes(role)) return '洞穴世界'
      return '自定义世界'
    },
    worldStatusLabel(status) {
      return { running: '运行中', stopped: '已停止', starting: '启动中', stopping: '停止中' }[status] || '未知'
    },
    seasonLabel(season) {
      return { autumn: '秋季', winter: '冬季', spring: '春季', summer: '夏季' }[season] || season || '--'
    },
    characterLabel(prefab) {
      return CHARACTER_NAMES[prefab] || prefab || '未知角色'
    },
    metricValue(value) {
      return value === null || value === undefined || value === '' ? '--' : value
    },
    formatPercent(value) {
      return Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}%` : '--'
    },
    formatDisk(value) {
      return Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)} GB` : '--'
    },
    formatCompactTime(value) {
      if (!value) return '--'
      const date = new Date(value)
      if (!Number.isFinite(date.getTime())) return String(value)
      const now = new Date()
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      }
      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
    }
  }
}
</script>

<style scoped>
.workspace-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.workspace-header,
.workspace-title-row,
.workspace-toolbar,
.section-heading,
.rail-heading,
.world-main,
.world-name-row,
.console-toolbar,
.console-footer,
.backup-row {
  display: flex;
  align-items: center;
}

.workspace-header {
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-color);
}

.workspace-heading {
  min-width: 0;
}

.workspace-kicker {
  display: block;
  margin-bottom: 3px;
  color: var(--text-secondary);
  font-size: 12px;
}

.workspace-title-row {
  gap: 10px;
}

.workspace-title-row h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: 22px;
  line-height: 30px;
  letter-spacing: 0;
}

.workspace-heading p {
  margin: 3px 0 0;
  color: var(--text-secondary);
  line-height: 20px;
}

.room-state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 12px;
}

.room-state .state-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--info-color);
}

.room-state.running .state-dot {
  background: var(--success-color);
}

.workspace-toolbar {
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.workspace-toolbar :deep(.el-select) {
  width: 220px;
}

.workspace-alert {
  margin: 0;
}

.status-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.status-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 2px 10px;
  min-width: 0;
  padding: 13px 16px;
  border-right: 1px solid var(--border-color);
}

.status-item:last-child {
  border-right: 0;
}

.status-label,
.status-meta {
  color: var(--text-secondary);
  font-size: 12px;
}

.status-item strong {
  grid-row: 1 / span 2;
  grid-column: 2;
  align-self: center;
  color: var(--text-primary);
  font-size: 22px;
  font-variant-numeric: tabular-nums;
}

.status-item .status-time {
  font-size: 17px;
}

.world-section,
.operation-panel,
.rail-section {
  min-width: 0;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.world-section {
  padding: 14px;
}

.section-heading,
.rail-heading {
  justify-content: space-between;
  gap: 12px;
}

.section-heading {
  margin-bottom: 12px;
}

.section-heading h2,
.rail-heading h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 15px;
  line-height: 22px;
  letter-spacing: 0;
}

.section-heading span,
.rail-heading span {
  display: block;
  max-width: 520px;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.world-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 10px;
}

.world-item {
  position: relative;
  min-width: 0;
  padding: 13px;
  cursor: pointer;
  background: var(--surface-muted);
  border: 1px solid transparent;
  border-radius: 4px;
  transition: border-color 180ms ease, background-color 180ms ease;
}

.world-item:hover,
.world-item:focus-visible {
  border-color: var(--el-border-color);
  outline: none;
}

.world-item.selected {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-5);
}

.world-item.running::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 3px;
  content: '';
  background: var(--success-color);
}

.world-main {
  gap: 10px;
  min-width: 0;
}

.world-symbol {
  display: grid;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 4px;
}

.world-symbol.forest {
  color: #9b5a0b;
  background: #fff0d8;
}

.world-symbol.cave {
  color: #5d665f;
  background: #e5e9e6;
}

.world-identity {
  flex: 1;
  min-width: 0;
}

.world-name-row {
  justify-content: space-between;
  gap: 8px;
}

.world-name-row strong {
  overflow: hidden;
  color: var(--text-primary);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.world-identity > span {
  display: block;
  margin-top: 3px;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.world-facts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 13px 0 11px;
}

.world-facts div {
  min-width: 0;
}

.world-facts dt {
  color: var(--text-secondary);
  font-size: 11px;
}

.world-facts dd {
  margin: 2px 0 0;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.world-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 320px);
  gap: 16px;
  align-items: start;
}

.operation-panel {
  overflow: hidden;
}

.operation-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 14px;
}

.operation-tabs :deep(.el-tabs__content) {
  padding: 14px;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.workspace-log {
  height: 470px;
}

.console-panel {
  min-height: 440px;
}

.console-toolbar {
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.console-toolbar :deep(.el-select) {
  width: min(320px, 100%);
}

.context-error {
  margin-bottom: 10px;
}

.button-tail-icon {
  margin-left: 5px;
}

.console-footer {
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
}

.console-footer span {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.command-result {
  margin-top: 12px;
  padding: 12px;
  color: #245f3c;
  background: #eef8f1;
  border-left: 3px solid var(--success-color);
}

.command-result.failed {
  color: #913434;
  background: #fdf0f0;
  border-left-color: var(--danger-color);
}

.command-result > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.command-result span,
.command-result p {
  font-size: 12px;
}

.command-result p {
  margin: 6px 0 0;
}

.context-rail {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.rail-section {
  padding: 13px;
}

.rail-heading {
  margin-bottom: 10px;
}

.player-list,
.backup-list {
  border-top: 1px solid var(--border-color);
}

.player-row {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  width: 100%;
  min-height: 50px;
  padding: 7px 0;
  cursor: pointer;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--border-color);
}

.player-row:last-child {
  border-bottom: 0;
}

.player-row:hover .player-copy strong,
.player-row:focus-visible .player-copy strong {
  color: var(--primary-color);
}

.player-row:focus-visible {
  outline: 2px solid var(--el-color-primary-light-5);
  outline-offset: 2px;
}

.player-avatar {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  color: var(--text-regular);
  background: var(--surface-muted);
  border-radius: 4px;
}

.player-copy {
  min-width: 0;
}

.player-copy strong,
.player-copy span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-copy strong {
  color: var(--text-primary);
  font-size: 13px;
  transition: color 180ms ease;
}

.player-copy span,
.player-status {
  color: var(--text-secondary);
  font-size: 11px;
}

.player-status.online {
  color: var(--success-color);
}

.backup-row {
  gap: 9px;
  min-height: 49px;
  padding: 7px 0;
  border-bottom: 1px solid var(--border-color);
}

.backup-row:last-child {
  border-bottom: 0;
}

.backup-row > .legacy-icon {
  flex: 0 0 auto;
  color: var(--primary-color);
}

.backup-row span {
  min-width: 0;
}

.backup-row strong,
.backup-row small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.backup-row strong {
  color: var(--text-primary);
  font-size: 13px;
}

.backup-row small {
  margin-top: 2px;
  color: var(--text-secondary);
}

.rail-empty {
  padding: 24px 8px;
  color: var(--text-secondary);
  text-align: center;
}

.quick-nav {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  overflow: hidden;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.quick-nav button {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 48px;
  padding: 0 12px;
  cursor: pointer;
  color: var(--text-regular);
  background: transparent;
  border: 0;
  border-right: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  transition: color 180ms ease, background-color 180ms ease;
}

.quick-nav button:nth-child(2n) {
  border-right: 0;
}

.quick-nav button:nth-last-child(-n + 2) {
  border-bottom: 0;
}

.quick-nav button:hover,
.quick-nav button:focus-visible {
  color: var(--primary-color);
  background: var(--el-color-primary-light-9);
  outline: none;
}

@media (max-width: 1100px) {
  .status-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .status-item:nth-child(2) {
    border-right: 0;
  }

  .status-item:nth-child(-n + 2) {
    border-bottom: 1px solid var(--border-color);
  }

  .workspace-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .context-rail {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .quick-nav {
    grid-column: 1 / -1;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .quick-nav button,
  .quick-nav button:nth-child(2n) {
    border-right: 1px solid var(--border-color);
    border-bottom: 0;
  }

  .quick-nav button:last-child {
    border-right: 0;
  }
}

@media (max-width: 768px) {
  .workspace-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .workspace-toolbar {
    width: 100%;
    justify-content: flex-start;
  }

  .workspace-toolbar :deep(.el-select) {
    flex: 1 1 180px;
    width: auto;
  }

  .status-strip {
    grid-template-columns: minmax(0, 1fr);
  }

  .status-item,
  .status-item:nth-child(2) {
    border-right: 0;
    border-bottom: 1px solid var(--border-color);
  }

  .status-item:last-child {
    border-bottom: 0;
  }

  .world-grid,
  .context-rail {
    grid-template-columns: minmax(0, 1fr);
  }

  .workspace-log {
    height: 520px;
  }

  .console-toolbar :deep(.el-select) {
    flex: 1 1 100%;
    width: 100%;
  }

  .quick-nav {
    grid-column: auto;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .quick-nav button,
  .quick-nav button:nth-child(2n) {
    border-right: 1px solid var(--border-color);
    border-bottom: 1px solid var(--border-color);
  }

  .quick-nav button:nth-child(2n) {
    border-right: 0;
  }

  .quick-nav button:nth-last-child(-n + 2) {
    border-bottom: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .world-item,
  .player-copy strong,
  .quick-nav button {
    transition: none;
  }
}
</style>
