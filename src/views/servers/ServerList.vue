<template>
  <div class="server-list-page">
    <!-- 标题及操作按钮 -->
    <div class="page-header">
      <div class="title-container">
        <i class="el-icon-monitor"></i>
        <span>服务器状态监控</span>
      </div>
      <div class="action-buttons">
        <el-button size="small" type="primary" icon="el-icon-plus" @click="navigateToRoomCreation">创建房间</el-button>
        <el-button size="small" icon="el-icon-refresh" @click="refreshData">刷新</el-button>
        <el-button v-if="!isProduction" size="small" type="info" @click="testApiConnection">测试API</el-button>
      </div>
      </div>
      
    <!-- 调试信息 -->
    <el-alert
      v-if="!isProduction"
      title="调试信息"
      type="info"
      :closable="false"
      style="margin-bottom: 15px;">
      <p>API基础URL: {{ apiBaseUrl }}</p>
      <p>TMUX接口: {{ apiBaseUrl }}/tmux/list (GET)</p>
      <p>服务器数量: {{ filteredServerList.length }}</p>
      <p>请求状态: {{ requestStatus }}</p>
      <div v-if="errorMessage" style="color: red; margin-top: 10px;">
        <p><strong>错误信息:</strong></p>
        <pre style="white-space: pre-wrap; word-break: break-all;">{{ errorMessage }}</pre>
      </div>
    </el-alert>

    <!-- 服务器分组及筛选区域 -->
    <div class="filter-container">
      <el-tabs v-model="activeTab" @tab-click="handleTabChange">
        <el-tab-pane label="全部服务器" name="all"></el-tab-pane>
        <el-tab-pane label="本机服务器" name="local"></el-tab-pane>
        <el-tab-pane label="Docker服务器" name="docker"></el-tab-pane>
        <el-tab-pane label="远程服务器" name="remote"></el-tab-pane>
        <el-tab-pane label="K8s服务器" name="k8s"></el-tab-pane>
      </el-tabs>
      
      <div class="filter-options">
        <el-select v-model="roomFilter" placeholder="按存档筛选" size="small" clearable @change="filterServers">
          <el-option
            v-for="room in roomList"
            :key="room.id"
            :label="room.name"
            :value="room.id">
          </el-option>
        </el-select>
        
        <el-select v-model="typeFilter" placeholder="按类型筛选" size="small" clearable @change="filterServers">
          <el-option label="森林服务器" value="forest"></el-option>
          <el-option label="洞穴服务器" value="cave"></el-option>
        </el-select>
        
        <el-select v-model="statusFilter" placeholder="按状态筛选" size="small" clearable @change="filterServers">
          <el-option label="在线" value="online"></el-option>
          <el-option label="离线" value="offline"></el-option>
          <el-option label="重启中" value="restarting"></el-option>
        </el-select>

        <el-select v-model="closedTimeFilter" placeholder="按关闭时间筛选" size="small" clearable @change="filterServers">
          <el-option label="显示所有" value="all"></el-option>
          <el-option label="1小时内关闭" value="1"></el-option>
          <el-option label="6小时内关闭" value="6"></el-option>
          <el-option label="12小时内关闭" value="12"></el-option>
          <el-option label="24小时内关闭" value="24"></el-option>
          <el-option label="3天内关闭" value="72"></el-option>
          <el-option label="7天内关闭" value="168"></el-option>
        </el-select>
      </div>
    </div>

    <!-- 服务器列表主体内容 -->
    <div v-loading="loading" class="server-table-container">
        <el-table
        :data="filteredServerList"
          style="width: 100%"
          border
          stripe>
        
          <el-table-column
          label="服务器名称"
          prop="name"
          min-width="180">
          <template slot-scope="scope">
            <div class="server-name-container">
              <div :class="['server-status', scope.row.status === '在线' ? 'online' : (scope.row.status === '重启中' ? 'restarting' : 'offline')]"></div>
              <span class="server-name">{{ formatServerName(scope.row.name) }}</span>
              <el-tag size="mini" :type="scope.row.type === 'forest' ? 'success' : 'warning'" class="server-type-tag">
                {{ scope.row.type === 'forest' ? '森林' : '洞穴' }}
              </el-tag>
            </div>
            <div class="server-room">
              <i class="el-icon-folder"></i> {{ scope.row.roomName }}
            </div>
          </template>
          </el-table-column>
          
          <el-table-column
          label="玩家"
          width="100">
            <template slot-scope="scope">
            {{ scope.row.players }}
            </template>
          </el-table-column>
          
          <el-table-column
          label="天数"
          width="70">
          <template slot-scope="scope">
            {{ scope.row.days }}
          </template>
          </el-table-column>
          
          <el-table-column
          label="季节"
          width="100">
            <template slot-scope="scope">
            <el-tag :type="getSeasonType(scope.row.season)" size="medium">
              {{ scope.row.season }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column
          label="服务器模式"
          width="100">
            <template slot-scope="scope">
            <el-tag type="info" size="medium" v-if="scope.row.serverMode">
              {{ scope.row.serverMode === '32' ? '32位' : scope.row.serverMode === '64' ? '64位' : scope.row.serverMode }}
            </el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          
          <el-table-column
          label="运行时间/启动时间"
          min-width="140">
            <template slot-scope="scope">
            <span :class="{ 'server-offline': scope.row.status === '离线' }">
              {{ scope.row.uptime }}
            </span>
          </template>
        </el-table-column>
        
        <el-table-column
          label="部署方式"
          width="100">
          <template slot-scope="scope">
            <el-tag size="medium" :type="getDeploymentType(scope.row.deployment)">
              {{ scope.row.deployment }}
            </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column
            label="操作"
          min-width="200">
            <template slot-scope="scope">
            <div class="operation-buttons">
              <el-button
                size="mini"
                :type="scope.row.status === '在线' ? 'danger' : 'success'"
                @click="scope.row.status === '在线' ? handleStop(scope.row) : handleStart(scope.row)">
                {{ scope.row.status === '在线' ? '停止' : '启动' }}
              </el-button>
              <el-button
                size="mini"
                type="primary"
                @click="handleRestart(scope.row)">
                重启
              </el-button>
              <el-dropdown trigger="click" @command="handleCommand($event, scope.row)" class="operation-dropdown">
                <el-button size="mini" type="info">
                  更多<i class="el-icon-arrow-down el-icon--right"></i>
                </el-button>
                <el-dropdown-menu slot="dropdown">
                  <el-dropdown-item command="config">配置</el-dropdown-item>
                  <el-dropdown-item command="room">房间管理</el-dropdown-item>
                  <el-dropdown-item command="logs" divided>查看日志</el-dropdown-item>
                </el-dropdown-menu>
              </el-dropdown>
            </div>
            </template>
          </el-table-column>
        </el-table>
        
      <!-- 空数据提示 -->
      <div class="empty-block" v-if="filteredServerList.length === 0 && !loading">
        <el-empty description="暂无服务器数据" :image-size="100">
          <div class="empty-description">
            <p>没有发现任何运行中的服务器</p>
            <p>您可以先创建一个房间，然后启动它</p>
        </div>
          <div class="empty-actions">
            <el-button type="primary" @click="navigateToRoomCreation">创建新房间</el-button>
            <el-button type="success" @click="showStartRoomDialog">启动现有房间</el-button>
      </div>
        </el-empty>
      </div>
    </div>

    <!-- 启动房间对话框 -->
    <el-dialog
      title="选择并启动房间"
      :visible.sync="startRoomDialogVisible"
      width="500px">
      <div>
        <el-form label-width="120px">
          <el-form-item label="选择房间">
            <el-select v-model="startRoomForm.roomId" placeholder="请选择房间" style="width: 100%">
              <el-option
                v-for="room in roomList"
                :key="room.id"
                :label="room.name"
                :value="room.id">
              </el-option>
            </el-select>
          </el-form-item>
          
          <el-form-item label="启动模式">
            <el-radio-group v-model="startRoomForm.worldType">
              <el-radio label="both">完整房间（主世界+洞穴）</el-radio>
              <el-radio label="forest">仅主世界</el-radio>
              <el-radio label="cave">仅洞穴</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item label="服务器模式">
            <el-select v-model="startRoomForm.serverMode" placeholder="选择服务器模式">
              <el-option label="普通模式 (32位)" value="32"></el-option>
              <el-option label="专家模式 (64位)" value="64"></el-option>
            </el-select>
            <div class="mode-description" v-if="startRoomForm.serverMode === '64'">
              <i class="el-icon-warning-outline"></i> 专家模式使用64位引擎，可能会更耗内存但性能更好
            </div>
            <div class="mode-description" v-else>
              <i class="el-icon-info"></i> 普通模式使用32位引擎，适合大多数服务器
            </div>
          </el-form-item>
        </el-form>
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button @click="startRoomDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleStartRoomFromDialog" :loading="startRoomLoading">启动</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { systemApi, roomApi } from '@/api/index';
import axios from 'axios';

export default {
  name: 'ServerList',
  data() {
    return {
      loading: false,
      activeTab: 'all',
      roomFilter: '',
      typeFilter: '',
      statusFilter: '',
      closedTimeFilter: 'all',
      serverList: [],
      roomList: [],
      apiBaseUrl: '',
      isProduction: true,
      requestStatus: '',
      errorMessage: '',
      startRoomDialogVisible: false,
      startRoomForm: {
        roomId: '',
        worldType: 'both',
        serverMode: '32'
      },
      startRoomLoading: false
    };
  },
  computed: {
    filteredServerList() {
      let result = this.serverList;
      
      // 根据标签页筛选
      if (this.activeTab !== 'all') {
        const deploymentMap = {
          'local': '本地',
          'docker': 'Docker',
          'remote': '远程',
          'k8s': 'K8s'
        };
        result = result.filter(server => server.deployment === deploymentMap[this.activeTab]);
      }
      
      // 根据房间筛选
      if (this.roomFilter) {
        result = result.filter(server => server.roomId === this.roomFilter);
      }
      
      // 根据服务器类型筛选
      if (this.typeFilter) {
        result = result.filter(server => server.type === this.typeFilter);
      }
      
      // 根据状态筛选
      if (this.statusFilter) {
        const statusMap = {
          'online': '在线',
          'offline': '离线',
          'restarting': '重启中'
        };
        result = result.filter(server => server.status === statusMap[this.statusFilter]);
      }
      
      // 根据关闭时间筛选
      if (this.closedTimeFilter && this.closedTimeFilter !== 'all') {
        const hours = parseInt(this.closedTimeFilter);
        if (!isNaN(hours)) {
          const now = new Date();
          const cutoffTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
          
          result = result.filter(server => {
            // 只对离线的服务器进行筛选
            if (server.status !== '离线') {
              return true;
            }
            
            // 提取服务器关闭时间
            const startTime = server.raw && server.raw.start_time;
            if (!startTime) {
              return true; // 如果没有开始时间，默认显示
            }
            
            try {
              const serverCloseTime = new Date(startTime);
              // 如果服务器关闭时间在截止时间之后，则显示
              return serverCloseTime >= cutoffTime;
            } catch (e) {
              console.error('解析服务器关闭时间出错:', e);
              return true; // 解析出错时默认显示
            }
          });
        }
      }
      
      return result;
    }
  },
  created() {
    console.log('服务器列表组件初始化');
    // 从配置中获取API基础URL
    import('@/api/config').then(config => {
      this.apiBaseUrl = config.default.BASE_URL;
    });
    // 设置为开发环境
    this.isProduction = process.env.NODE_ENV === 'production';
    this.fetchData();
    this.fetchRooms();
  },
  methods: {
    fetchData() {
      console.log('开始获取服务器数据');
      this.loading = true;
      this.serverList = []; // 清空现有数据
      this.requestStatus = '正在获取服务器数据...';
      this.errorMessage = '';
      
      // 按顺序获取各类服务器数据
      this.fetchLocalServers()
        .then(() => {
          this.requestStatus = '本地服务器数据获取完成';
          console.log('本地服务器数据获取完成，当前列表:', this.serverList);
          return this.fetchDockerServers();
        })
        .then(() => {
          this.requestStatus = '所有服务器数据获取完成';
          console.log('Docker服务器数据获取完成，当前列表:', this.serverList);
          return this.fetchRemoteServers();
        })
        .then(() => {
          console.log('远程服务器数据获取完成');
          return this.fetchK8sServers();
        })
        .then(() => {
          console.log('所有服务器数据获取完成，总数:', this.serverList.length);
        })
        .catch(error => {
          this.requestStatus = '获取服务器列表失败';
          this.errorMessage = error ? (error.message || JSON.stringify(error)) : '未知错误';
          console.error('获取服务器列表失败:', error);
          this.$message.error('获取服务器列表失败: ' + (error.message || '未知错误'));
        })
        .finally(() => {
          this.loading = false;
          console.log('数据加载完成，loading状态设为false');
        });
    },
    fetchLocalServers() {
      // 获取本地服务器列表
      console.log('开始获取本地服务器数据');
      return systemApi.getTmuxServers()
        .then(response => {
          console.log('TMUX服务器响应:', response);
          
          // 检查响应格式，处理不同的响应结构
          let serverData = [];
          
          if (response && response.status === 200 && Array.isArray(response.data)) {
            // 标准格式：{ status: 200, data: [...] }
            serverData = response.data;
            console.log('从标准格式中提取服务器数据', serverData);
          } else if (response && Array.isArray(response)) {
            // 直接返回数组的情况
            serverData = response;
            console.log('直接使用数组形式的服务器数据', serverData);
          } else if (response && response.data && Array.isArray(response.data.data)) {
            // 新API返回格式：{ data: [...], meta: {...}, msg: "...", status: 200 }
            serverData = response.data.data;
            console.log('从新API响应中提取服务器数据', serverData);
          } else if (response && response.data && Array.isArray(response.data)) {
            // axios直接返回格式：response.data即为数组
            serverData = response.data;
            console.log('从axios响应中提取服务器数据', serverData);
          }
          
          console.log('处理后的服务器数据:', serverData);
          
          if (serverData && serverData.length > 0) {
            // 构建服务器列表
            const localServers = [];
            
            // 遍历服务器数据
            serverData.forEach(item => {
              console.log('处理服务器项:', item);
              
              // 检查是新的API格式还是旧的格式
              if (item.session_name) {
                // 新API格式
                const worldType = item.world_name && item.world_name.includes('Forest') ? 'forest' : 'cave';
                
                localServers.push({
                  id: item.session_name || '',
                  name: `${item.archive_name || '未知'} - ${item.world_name || '未知'}`,
                  roomId: item.archive_name || '',
                  roomName: item.archive_name || '未知存档',
                  type: worldType,
                  status: item.status === 'running' ? '在线' : (item.status === 'stopped' ? '离线' : '重启中'),
                  players: '0/0', // 需要从其他API获取玩家数量
                  days: '0', // 需要从其他API获取天数
                  season: '秋季', // 需要从其他API获取季节
                  uptime: item.running_time ? this.formatUptime(item.running_time) : this.formatStartTime(item.start_time),
                  deployment: '本地',
                  raw: item, // 保存原始数据以便后续操作
                  serverMode: item.server_mode ? item.server_mode : '32'
                });
          } else {
                // 旧API格式
                // 按存档名称分组服务器，以便正确关联房间和世界
                // 判断是森林还是洞穴服务器
                const worldType = item.WorldName && item.WorldName.includes('Forest') ? 'forest' : 'cave';
                
                localServers.push({
                  id: item.SessionName || '',
                  name: `${item.ArchiveName || '未知'} - ${item.WorldName || '未知'}`,
                  roomId: item.ArchiveName || '',
                  roomName: item.ArchiveName || '未知存档',
                  type: worldType,
                  status: '在线', // 通过tmux列表获取的都是在线的服务器
                  players: '0/0', // 需要从其他API获取玩家数量
                  days: '0', // 需要从其他API获取天数
                  season: '秋季', // 需要从其他API获取季节
                  uptime: this.formatUptime(item.Created || '0'),
                  deployment: '本地',
                  raw: item, // 保存原始数据以便后续操作
                  serverMode: '32'
                });
              }
            });
            
            console.log('转换后的本地服务器列表:', localServers);
            
            // 将本地服务器数据添加到服务器列表
            this.serverList = [...this.serverList, ...localServers];
          } else {
            console.log('没有找到本地服务器数据');
          }
          
          return response;
        })
        .catch(error => {
          console.error('获取TMUX服务器列表失败:', error);
          return Promise.resolve(); // 失败时继续执行后续步骤
        });
    },
    fetchDockerServers() {
      // 获取Docker容器服务器列表
      return systemApi.getDockerContainers()
        .then(response => {
          if (response && response.status === 200 && Array.isArray(response.data)) {
            // 转换数据格式，使其与其他服务器数据保持一致
            const dockerServers = response.data.map(item => {
              // 从容器名称中尝试提取信息
              let roomName = '';
              let serverType = 'forest'; // 默认为森林服务器
              
              // 尝试解析容器名称，格式可能是 dst_roomName_Forest/Cave
              if (item.names && item.names.includes('dst_')) {
                const nameParts = item.names.split('_');
                if (nameParts.length > 1) {
                  roomName = nameParts[1];
                }
                
                if (item.names.toLowerCase().includes('cave')) {
                  serverType = 'cave';
                }
              }
              
        return {
                id: item.container_id,
                name: item.names || `Docker容器 - ${item.container_id.substring(0, 8)}`,
                roomId: roomName,
                roomName: roomName || '未知存档',
                type: serverType,
                status: item.running ? '在线' : '离线',
                players: '0/0', // 需要从其他API获取玩家数量
                days: '0', // 需要从其他API获取天数
                season: '秋季', // 需要从其他API获取季节
                uptime: this.formatCreatedTime(item.created),
                deployment: 'Docker',
                raw: item, // 保存原始数据以便后续操作
                serverMode: '32'
              };
            });
            
            // 将Docker服务器数据添加到服务器列表
            this.serverList = [...this.serverList, ...dockerServers];
          }
          return response;
      });
    },
    fetchRemoteServers() {
      // 获取远程服务器列表
      return Promise.resolve();
    },
    fetchK8sServers() {
      // 获取K8s服务器列表
      return Promise.resolve();
    },
    fetchRooms() {
      roomApi.getRoomList()
        .then(response => {
          if (response && Array.isArray(response)) {
            this.roomList = response;
          } else {
            console.error('获取房间列表失败，格式不正确:', response);
            this.$message.error('获取房间列表失败');
          }
        })
        .catch(error => {
          console.error('获取房间列表失败:', error);
          this.$message.error('获取房间列表失败: ' + (error.message || '未知错误'));
        });
    },
    refreshData() {
      this.fetchData();
    },
    handleTabChange() {
      // 切换标签页时调整筛选
    },
    filterServers() {
      // 根据筛选条件过滤服务器列表
    },
    navigateToRoomCreation() {
      // 跳转到房间创建页面
      this.$router.push('/servers/room/create');
    },
    navigateToRoom(row) {
      // 跳转到对应房间的管理页面
      this.$router.push(`/servers/room/${row.roomId}`);
    },
    handleStart(row) {
      // 判断是否为本地服务器
      if (row.deployment === '本地') {
        // 准备对话框内容，包含服务器模式选择
        const h = this.$createElement;
        
        this.$confirm('', {
          title: `确定要启动服务器 ${row.name} 吗?`,
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
          message: h('div', null, [
            h('p', null, `确定要启动服务器 "${row.name}" 吗?`),
            h('div', { style: 'margin-top: 15px;' }, [
              h('label', null, '服务器模式：'),
              h('div', { 
                style: 'margin-top: 8px;',
                class: 'server-mode-selector'
              }, [
                h('label', { 
                  style: 'margin-right: 15px; cursor: pointer;',
                  class: 'el-radio'
                }, [
                  h('input', {
                    attrs: {
                      type: 'radio',
                      name: 'serverMode',
                      value: '32',
                      checked: row.serverMode === '32' || !row.serverMode
                    },
                    style: 'margin-right: 5px;'
                  }),
                  '普通模式 (32位)'
                ]),
                h('label', { 
                  style: 'cursor: pointer;',
                  class: 'el-radio'
                }, [
                  h('input', {
                    attrs: {
                      type: 'radio',
                      name: 'serverMode',
                      value: '64',
                      checked: row.serverMode === '64'
                    },
                    style: 'margin-right: 5px;'
                  }),
                  '专家模式 (64位)'
                ])
              ])
            ])
          ])
        }).then(() => {
          this.loading = true;
          
          // 从服务器ID(SessionName)中提取存档名和世界名
          // 格式为: dstserver_存档名_世界名
          let archiveName = '';
          let worldName = '';
          
          if (row.id && row.id.includes('_')) {
            const parts = row.id.split('_');
            if (parts.length >= 3) {
              archiveName = parts[1];
              worldName = parts[2];
            }
          } else {
            // 如果ID格式不正确，尝试使用raw数据
            if (row.raw) {
              archiveName = row.raw.archive_name || row.raw.ArchiveName || '';
              worldName = row.raw.world_name || row.raw.WorldName || '';
            }
          }
          
          // 如果没有获取到存档名或世界名，使用roomId和type推断
          if (!archiveName && row.roomId) {
            archiveName = row.roomId;
          }
          
          if (!worldName && row.type) {
            // 根据类型推断世界名
            worldName = row.type === 'forest' ? 'Forest1' : 'Caves1';
          }
          
          console.log('启动服务器参数准备:', { archiveName, worldName });
          
          if (!archiveName || !worldName) {
            this.$message.error('无法获取存档名或世界名，无法启动服务器');
            this.loading = false;
            return;
          }
          
          // 获取选择的服务器模式
          const serverMode = document.querySelector('input[name="serverMode"]:checked').value;
          
          // 准备启动参数
          const startParams = {
            archive_name: archiveName,
            world_name: worldName,
            server_mode: serverMode
          };
          
          console.log('启动TMUX服务器，参数:', startParams);
          
          systemApi.startTmuxServer(startParams)
            .then(response => {
              console.log('启动服务器响应:', response);
              if (response && (response.status === 200 || (response.data && response.data.status === 200))) {
                this.$message.success('服务器启动成功!');
                this.fetchData();
              } else {
                this.$message.error(response && response.msg ? response.msg : '启动服务器失败');
              }
            })
            .catch(error => {
              console.error('启动服务器失败:', error);
              this.$message.error('启动服务器失败: ' + (error.message || '未知错误'));
            })
            .finally(() => {
              this.loading = false;
            });
        });
      } else {
        this.$confirm(`确定要启动服务器 ${row.name} 吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
          systemApi.startServer(row.id)
          .then(response => {
            if (response.status === 200) {
                this.$message.success('服务器启动成功!');
                this.fetchData();
            } else {
                this.$message.error(response.msg || '启动服务器失败');
            }
          })
          .catch(error => {
              this.$message.error('启动服务器失败: ' + (error.message || '未知错误'));
          })
          .finally(() => {
            this.loading = false;
          });
        });
      }
    },
    handleStop(row) {
      // 判断是否为本地服务器
      if (row.deployment === '本地') {
        this.$confirm(`确定要停止服务器 ${row.name} 吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
          
          // 新API格式使用session_name，旧格式使用SessionName
          const sessionName = row.raw && (row.raw.session_name || row.raw.SessionName) || row.id;
          const params = { session_name: sessionName };
          
          console.log('停止TMUX服务器，参数:', params);
          
          systemApi.stopTmuxServer(params)
            .then(response => {
              console.log('停止TMUX服务器响应:', response);
              if (response && (response.status === 200 || (response.data && response.data.status === 200))) {
                this.$message.success('服务器停止成功!');
                this.fetchData();
              } else {
                this.$message.error(response && response.msg ? response.msg : '停止服务器失败');
              }
            })
            .catch(error => {
              console.error('停止服务器失败:', error);
              this.$message.error('停止服务器失败: ' + (error.message || '未知错误'));
            })
            .finally(() => {
              this.loading = false;
            });
        });
      } else {
        // Docker服务器停止逻辑保持不变
        this.$confirm(`确定要停止服务器 ${row.name} 吗?`, '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          this.loading = true;
          systemApi.stopServer(row.id)
          .then(response => {
            if (response.status === 200) {
                this.$message.success('服务器停止成功!');
                this.fetchData();
              } else {
                this.$message.error(response.msg || '停止服务器失败');
              }
            })
            .catch(error => {
              this.$message.error('停止服务器失败: ' + (error.message || '未知错误'));
            })
            .finally(() => {
              this.loading = false;
            });
        });
      }
    },
    handleRestart(row) {
      // 判断是否为本地服务器
      if (row.deployment === '本地') {
        // 准备对话框内容，包含服务器模式选择
        const h = this.$createElement;
        
        this.$confirm('', {
          title: `确定要重启服务器 ${row.name} 吗?`,
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
          message: h('div', null, [
            h('p', null, `确定要重启服务器 "${row.name}" 吗?`),
            h('div', { style: 'margin-top: 15px;' }, [
              h('label', null, '服务器模式：'),
              h('div', { 
                style: 'margin-top: 8px;',
                class: 'server-mode-selector'
              }, [
                h('label', { 
                  style: 'margin-right: 15px; cursor: pointer;',
                  class: 'el-radio'
                }, [
                  h('input', {
                    attrs: {
                      type: 'radio',
                      name: 'restartServerMode',
                      value: '32',
                      checked: row.serverMode === '32' || !row.serverMode
                    },
                    style: 'margin-right: 5px;'
                  }),
                  '普通模式 (32位)'
                ]),
                h('label', { 
                  style: 'cursor: pointer;',
                  class: 'el-radio'
                }, [
                  h('input', {
                    attrs: {
                      type: 'radio',
                      name: 'restartServerMode',
                      value: '64',
                      checked: row.serverMode === '64'
                    },
                    style: 'margin-right: 5px;'
                  }),
                  '专家模式 (64位)'
                ])
              ])
            ])
          ])
        }).then(() => {
          this.loading = true;
          
          // 新API格式使用session_name，旧格式使用SessionName
          const sessionName = row.raw && (row.raw.session_name || row.raw.SessionName) || row.id;
          // 新API格式使用archive_name和world_name，旧格式使用ArchiveName和WorldName
          const archiveName = row.raw && (row.raw.archive_name || row.raw.ArchiveName) || row.roomId;
          const worldName = row.raw && (row.raw.world_name || row.raw.WorldName) || (row.type === 'forest' ? 'Forest1' : 'Caves1');
          // 获取选择的服务器模式
          const serverMode = document.querySelector('input[name="restartServerMode"]:checked').value;
          
          console.log('重启TMUX服务器，会话名:', sessionName, '存档名:', archiveName, '世界名:', worldName, '模式:', serverMode);
          
          // 先停止服务器
          const stopParams = { session_name: sessionName };
          systemApi.stopTmuxServer(stopParams)
            .then(response => {
              console.log('停止服务器响应:', response);
              
              // 然后启动服务器
              setTimeout(() => {
                const startParams = {
                  archive_name: archiveName,
                  world_name: worldName,
                  server_mode: serverMode // 使用选择的服务器模式
                };
                
                console.log('启动服务器参数:', startParams);
                
                systemApi.startTmuxServer(startParams)
                  .then(startResponse => {
                    console.log('启动服务器响应:', startResponse);
                    if (startResponse && (startResponse.status === 200 || (startResponse.data && startResponse.data.status === 200))) {
                      this.$message.success('服务器重启成功!');
                      this.fetchData();
            } else {
                      this.$message.error(startResponse && startResponse.msg ? startResponse.msg : '启动服务器失败');
            }
          })
          .catch(error => {
                    console.error('启动服务器失败:', error);
                    this.$message.error('启动服务器失败: ' + (error.message || '未知错误'));
          })
          .finally(() => {
            this.loading = false;
                  });
              }, 2000); // 等待2秒后重启
            })
            .catch(error => {
              console.error('停止服务器失败:', error);
              this.$message.error('重启服务器失败: ' + (error.message || '未知错误'));
              this.loading = false;
        });
      });
      } else {
        // Docker服务器重启逻辑保持不变
        this.$confirm(`确定要重启服务器 ${row.name} 吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
          type: 'warning'
      }).then(() => {
        this.loading = true;
          systemApi.restartServer(row.id)
          .then(response => {
            if (response.status === 200) {
                this.$message.success('服务器重启成功!');
                this.fetchData();
            } else {
                this.$message.error(response.msg || '重启服务器失败');
            }
          })
          .catch(error => {
              this.$message.error('重启服务器失败: ' + (error.message || '未知错误'));
          })
          .finally(() => {
            this.loading = false;
            });
        });
      }
    },
    handleConfig(row) {
      // 跳转到服务器配置页面
      this.$router.push(`/servers/config/${row.id}`);
    },
    getSeasonType(season) {
      const seasonMap = {
        '秋季': '',
        '冬季': 'info',
        '春季': 'success',
        '夏季': 'warning'
      };
      return seasonMap[season] || '';
    },
    getDeploymentType(deployment) {
      const deploymentMap = {
        '本地': '',
        'Docker': 'success',
        '远程': 'warning',
        'K8s': 'info'
      };
      return deploymentMap[deployment] || '';
    },
    // 格式化运行时间
    formatUptime(uptime) {
      if (!uptime || uptime === '') return '未在运行';
      
      // 首先检查是否是带有时间单位的字符串格式 (例如"2562047h47m16.854775807s")
      if (typeof uptime === 'string' && (uptime.includes('h') || uptime.includes('m') || uptime.includes('s'))) {
        try {
          // 提取小时、分钟和秒
          let hours = 0;
          let minutes = 0;
          let seconds = 0;
          
          // 提取小时
          const hourMatch = uptime.match(/(\d+)h/);
          if (hourMatch && hourMatch[1]) {
            hours = parseInt(hourMatch[1], 10);
          }
          
          // 提取分钟
          const minuteMatch = uptime.match(/(\d+)m/);
          if (minuteMatch && minuteMatch[1]) {
            minutes = parseInt(minuteMatch[1], 10);
          }
          
          // 提取秒
          const secondMatch = uptime.match(/(\d+(?:\.\d+)?)s/);
          if (secondMatch && secondMatch[1]) {
            seconds = parseFloat(secondMatch[1]);
          }
          
          // 计算总时间
          if (hours > 24) {
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;
            return `${days}天${remainingHours}小时`;
          } else if (hours > 0) {
            return `${hours}小时${minutes}分钟`;
          } else if (minutes > 0) {
            return `${minutes}分钟${Math.floor(seconds)}秒`;
          } else {
            return `${Math.floor(seconds)}秒`;
          }
        } catch (e) {
          console.error('格式化运行时间出错:', e);
          return uptime; // 如果解析失败，返回原始字符串
        }
      }
      
      // 处理旧格式 (Unix时间戳)
      try {
        const timestamp = parseInt(uptime, 10);
        if (isNaN(timestamp)) return '未知';
        
        const now = Date.now();
        const diff = now - timestamp * 1000; // 毫秒差
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
          return `${days}天${hours % 24}小时`;
        } else if (hours > 0) {
          return `${hours}小时${minutes % 60}分钟`;
        } else if (minutes > 0) {
          return `${minutes}分钟${seconds % 60}秒`;
        } else {
          return `${seconds}秒`;
        }
      } catch (e) {
        console.error('格式化运行时间出错:', e);
        return '未知';
      }
    },
    // 格式化Docker容器创建时间为运行时间
    formatCreatedTime(createdTimestamp) {
      if (!createdTimestamp) return '未知';
      
      const now = Math.floor(Date.now() / 1000);
      const created = parseInt(createdTimestamp);
      const diffSeconds = now - created;
      
      if (diffSeconds < 0) return '未知';
      
      const days = Math.floor(diffSeconds / 86400);
      const hours = Math.floor((diffSeconds % 86400) / 3600);
      const minutes = Math.floor((diffSeconds % 3600) / 60);
      
      let result = '';
      if (days > 0) result += `${days}天`;
      if (hours > 0 || days > 0) result += `${hours}小时`;
      result += `${minutes}分钟`;
      
      return result;
    },
    // 测试API连接
    testApiConnection() {
      this.requestStatus = '正在测试API连接...';
      this.errorMessage = '';
      
      // 使用axios直接请求TMUX列表API
      const url = `${this.apiBaseUrl}/tmux/list`;
      console.log(`正在测试API连接: ${url}`);
      
      axios.get(url)
        .then(response => {
          console.log('API测试响应:', response);
          this.requestStatus = 'API连接测试成功';
          this.$message.success('API连接测试成功');
        })
        .catch(error => {
          console.error('API连接测试失败:', error);
          this.requestStatus = 'API连接测试失败';
          this.errorMessage = error ? (error.message || JSON.stringify(error)) : '未知错误';
          this.$message.error('API连接测试失败: ' + (error.message || '未知错误'));
        });
    },
    // 格式化服务器名称，隐藏路径信息
    formatServerName(name) {
      if (!name) return '未知服务器';
      
      // 如果名称包含存档名和世界名 (格式: 存档名 - 世界名)
      if (name.includes(' - ')) {
        const parts = name.split(' - ');
        if (parts.length >= 2) {
          // 只保留存档名和世界名，不显示路径
          const archiveName = parts[0].trim();
          const worldName = parts[1].trim();
          return `${archiveName} - ${worldName.replace(/\.json$/, '')}`;
        }
      }
      
      // 提取会话名 (格式: dstserver_存档名_世界名)
      if (name.startsWith('dstserver_')) {
        const parts = name.split('_');
        if (parts.length >= 3) {
          return `${parts[1]} - ${parts[2]}`;
        }
      }
      
      // 如果是路径格式，提取最后一个斜杠后的内容
      if (name.includes('/')) {
        const parts = name.split('/');
        const filename = parts[parts.length - 1];
        
        // 如果文件名还包含存档名和世界名信息，继续提取
        if (filename.includes('_')) {
          const nameParts = filename.split('_');
          if (nameParts.length >= 2) {
            // 尝试提取存档名和世界名
            return `${nameParts[0]} - ${nameParts[1].replace(/\.json$/, '')}`;
          }
        }
        
        return filename;
      }
      
      return name;
    },
    handleCommand(command, row) {
      console.log('执行命令:', command, '服务器:', row);
      switch (command) {
        case 'config':
          this.handleConfig(row);
          break;
        case 'room':
          this.navigateToRoom(row);
          break;
        case 'logs':
          this.viewLogs(row);
          break;
      }
    },
    
    viewLogs(row) {
      // 查看服务器日志
      this.$message.info('正在开发日志查看功能...');
      // 实际实现可以跳转到日志页面
      // this.$router.push(`/servers/logs/${row.id}`);
    },
    // 显示启动房间对话框
    showStartRoomDialog() {
      this.startRoomDialogVisible = true;
      // 如果房间列表为空，先获取房间列表
      if (this.roomList.length === 0) {
        this.fetchRooms();
      }
    },
    
    // 从对话框启动房间
    handleStartRoomFromDialog() {
      if (!this.startRoomForm.roomId) {
        this.$message.error('请选择一个房间');
        return;
      }
      
      this.startRoomLoading = true;
      const archiveName = this.startRoomForm.roomId.toString();
      const { worldType, serverMode } = this.startRoomForm;
      
      console.log('启动房间:', { archiveName, worldType, serverMode });
      
      if (worldType === 'both') {
        // 启动完整房间（所有世界）
        roomApi.startRoom(archiveName, serverMode)
          .then(response => {
            console.log('启动房间响应:', response);
            if (response && response.status === 200) {
              this.$message.success('房间启动成功');
              this.fetchData(); // 刷新服务器列表
            } else {
              this.$message.error(response && response.msg ? response.msg : '启动房间失败');
            }
          })
          .catch(error => {
            console.error('启动房间失败:', error);
            this.$message.error('启动房间失败: ' + (error.message || '未知错误'));
          })
          .finally(() => {
            this.startRoomDialogVisible = false;
            this.startRoomLoading = false;
          });
      } else {
        // 获取房间的世界列表
        roomApi.getRoomWorlds(archiveName)
          .then(worlds => {
            // 根据选择的世界类型过滤
            const filteredWorlds = worlds.filter(world => world.type === worldType);
            
            if (filteredWorlds.length === 0) {
              // 如果没有找到匹配的世界，使用默认世界名
              const defaultWorldName = worldType === 'forest' ? 'Forest1' : 'Caves1';
              console.log(`未找到${worldType}类型的世界，使用默认世界名:`, defaultWorldName);
              
              return systemApi.startTmuxServer({
                archive_name: archiveName,
                world_name: defaultWorldName,
                server_mode: serverMode
              });
            } else {
              // 启动第一个找到的匹配世界
              const worldToStart = filteredWorlds[0];
              console.log('启动世界:', worldToStart);
              
              return systemApi.startTmuxServer({
                archive_name: archiveName,
                world_name: worldToStart.worldName,
                server_mode: serverMode
              });
            }
          })
          .then(response => {
            console.log('启动单个世界响应:', response);
            if (response && (response.status === 200 || (response.data && response.data.status === 200))) {
              this.$message.success(`${worldType === 'forest' ? '主世界' : '洞穴世界'}启动成功`);
              this.fetchData(); // 刷新服务器列表
            } else {
              this.$message.error(response && response.msg ? response.msg : '启动世界失败');
            }
          })
          .catch(error => {
            console.error('启动世界失败:', error);
            this.$message.error('启动世界失败: ' + (error.message || '未知错误'));
          })
          .finally(() => {
            this.startRoomDialogVisible = false;
            this.startRoomLoading = false;
          });
      }
    },
    // 格式化服务器启动时间
    formatStartTime(startTime) {
      if (!startTime) return '未启动';
      
      // 尝试解析开始时间
      try {
        const date = new Date(startTime);
        
        // 检查日期是否有效
        if (isNaN(date.getTime())) {
          return startTime; // 如果无效就返回原始字符串
        }
        
        const now = new Date();
        const diffMs = now - date;
        
        // 如果是未来时间，直接显示时间
        if (diffMs < 0) {
          return startTime;
        }
        
        // 计算时间差
        const diffSec = diffMs / 1000;
        const diffMin = diffSec / 60;
        const diffHour = diffMin / 60;
        const diffDay = diffHour / 24;
        
        // 显示时间差
        if (diffDay >= 1) {
          return `${Math.floor(diffDay)}天前启动`;
        } else if (diffHour >= 1) {
          return `${Math.floor(diffHour)}小时前启动`;
        } else if (diffMin >= 1) {
          return `${Math.floor(diffMin)}分钟前启动`;
        } else {
          return '刚刚启动';
        }
      } catch (e) {
        console.error('格式化启动时间出错:', e);
        return startTime;
      }
    }
  }
};
</script>

<style scoped>
.server-list-page {
  padding: 15px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.title-container {
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: bold;
}

.title-container i {
  margin-right: 8px;
  font-size: 22px;
}

.filter-container {
  margin-bottom: 15px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  padding: 12px;
}

.filter-options {
  display: flex;
  margin-top: 12px;
  flex-wrap: wrap;
}

.filter-options .el-select {
  margin-right: 12px;
  margin-bottom: 8px;
  width: 140px;
}

.server-table-container {
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  padding: 12px;
}

.server-name-container {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.server-status {
  min-width: 8px;
  min-height: 8px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  flex-shrink: 0;
}

.server-status.online {
  background-color: #67C23A;
}

.server-status.offline {
  background-color: #F56C6C;
}

.server-status.restarting {
  background-color: #E6A23C;
}

.server-name {
  font-weight: bold;
  margin-right: 6px;
  word-break: break-all;
}

.server-type-tag {
  margin-left: 4px;
  margin-bottom: 2px;
}

.server-room {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  width: 100%;
}

.server-room i {
  margin-right: 4px;
}

.operation-buttons {
  display: flex;
  justify-content: flex-start;
  flex-wrap: wrap;
}

.operation-buttons .el-button {
  margin-right: 5px;
  margin-bottom: 5px;
}

.operation-dropdown {
  margin-right: 0;
}

.empty-block {
  padding: 30px 0;
}

.empty-description {
  margin-bottom: 15px;
  color: #909399;
}

.empty-description p {
  margin: 5px 0;
}

.empty-actions {
  margin-top: 15px;
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .operation-buttons {
  flex-direction: column;
    align-items: flex-start;
  }
  
  .operation-buttons .el-button {
    margin-bottom: 5px;
  }
}

@media (max-width: 768px) {
  .filter-options {
    flex-direction: column;
  }
  
  .filter-options .el-select {
    width: 100%;
    margin-right: 0;
  }
}

.server-offline {
  color: #909399;
  font-style: italic;
}

.mode-description {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
  line-height: 1.4;
}
</style> 