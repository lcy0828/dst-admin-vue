import request from './request';
import config from './config';
import apiConfig from './config';
import axios from 'axios';
import commandManager, { commandApi, COMMAND_TYPES } from './commandManager';

// 服务器相关API
export const serverApi = {
  // 获取服务器列表
  getServerList(params) {
    return request.get(`/servers`, { params });
  },
  // 获取服务器详情
  getServerDetail(id) {
    return request.get(`/servers/${id}`);
  },
  // 创建服务器
  createServer(data) {
    return request.post(`/servers`, data);
  },
  // 启动服务器
  startServer(id) {
    return request.post(`/servers/${id}/start`);
  },
  // 停止服务器
  stopServer(id) {
    return request.post(`/servers/${id}/stop`);
  },
  // 重启服务器
  restartServer(id) {
    return request.post(`/servers/${id}/restart`);
  },
  // 获取服务器配置
  getServerConfig(savename) {
    return request.get(`/servers/${savename}/config`);
  },
  // 更新服务器配置
  updateServerConfig(id, data) {
    return request.put(`/servers/${id}/config`, data);
  },
  // 获取服务器日志
  getServerLogs(id, params) {
    return request.get(`/servers/${id}/logs`, params);
  },
  // 获取服务器日志流URL (用于EventSource)
  getServerLogStreamUrl(archive, world, lines = 300) {
    return `${config.BASE_URL}/server/log/stream?archive=${archive}&world=${world}&lines=${lines}`;
  },
  // 获取服务器日志流 (兼容旧方法)
  getServerLogStream(archive, world, lines = 300) {
    // 使用axios直接请求而不是通过request模块，避免添加_t参数
    const url = `${config.BASE_URL}/server/log/stream?archive=${archive}&world=${world}&lines=${lines}`;
    return axios.get(url, {
      transformResponse: [data => data], // 不要自动解析JSON，保留原始响应
      headers: {
        'Accept': 'text/plain, application/json, */*' // 接受多种格式
      }
    });
  },
  // 删除服务器
  deleteServer(id) {
    return request.delete(`/servers/${id}`);
  },
  // 获取管理员列表
  getAdminList(savename) {
    return request.get('/dstserver/adminlist', { params: { savename } });
  },
  // 获取黑名单
  getBlockList(savename) {
    return request.get('/dstserver/blocklist', { params: { savename } });
  },
  // 获取白名单
  getWhiteList(savename) {
    return request.get('/dstserver/whitelist', { params: { savename } });
  },
  // 获取服务器令牌
  getServerToken(savename) {
    return request.get('/dstserver/token', { savename });
  },
  // 更新管理员列表
  updateAdminList(savename, list) {
    return request.post('/dstserver/adminlist', { savename, list });
  },
  // 更新黑名单
  updateBlockList(savename, list) {
    return request.post('/dstserver/blocklist', { savename, list });
  },
  // 更新白名单
  updateWhiteList(savename, list) {
    return request.post('/dstserver/whitelist', { savename, list });
  },
  // 更新服务器令牌
  updateServerToken(savename, token) {
    return request.post('/dstserver/token', { savename, token });
  }
};

export const roomApi = {
  getRoomList(params) {
    return request.get('/dstserver/list', { params })
  },
  getRoomDetail(id) {
    return request.get(`/rooms/${id}`);
  },
  createRoom(data) {
    return request.post(`/rooms`, data);
  },
  updateRoom(id, data) {
    return request.put(`/rooms/${id}`, data);
  },
  deleteRoom(id) {
    return request.delete(`/rooms/${id}`);
  },
  getRoomWorlds(archiveName) {
    return request.get("/dstserver/list")
      .then(response => {
        let worlds = [];
        if (response && response.data && response.data.status === 200 && Array.isArray(response.data.data)) {
          const room = response.data.data.find(room => room.name === archiveName);
          if (room && room.worlds && Array.isArray(room.worlds)) {
            worlds = room.worlds.map(world => ({
              worldName: world.name,
              sessionName: `${archiveName}_${world.name}`,
              // 根据type确定世界类型，如果没有明确type或type为unknown，则通过名称判断
              type: world.type === 'forest' ? 'forest' :
                   world.type === 'cave' ? 'cave' :
                   world.name.includes('Forest') ? 'forest' : 'cave'
            }));
            return worlds;
          }
        }

        // 如果新API没有返回数据，尝试旧的API
        return axios.get(`${config.BASE_URL}/tmux/list`)
          .then(oldResponse => {
            if (oldResponse && oldResponse.data && oldResponse.data.status === 200 && Array.isArray(oldResponse.data.data)) {
              // 筛选指定存档的世界
              worlds = oldResponse.data.data
                .filter(item => item.ArchiveName === archiveName)
                .map(item => ({
                  worldName: item.WorldName,
                  sessionName: item.SessionName,
                  type: item.WorldName.includes('Forest') ? 'forest' : 'cave'
                }));
            } else if (oldResponse && oldResponse.data && Array.isArray(oldResponse.data)) {
              // 备用数据格式
              worlds = oldResponse.data
                .filter(item => item.ArchiveName === archiveName)
                .map(item => ({
                  worldName: item.WorldName,
                  sessionName: item.SessionName,
                  type: item.WorldName.includes('Forest') ? 'forest' : 'cave'
                }));
            }

            return worlds;
          })
          .catch(error => {
            console.error('获取旧API世界列表失败:', error);
            return []; // 失败时返回空数组
          });
      })
      .catch(error => {
        console.error('获取新API世界列表失败, 尝试旧API:', error);

        // 尝试旧API
        return axios.get(`${config.BASE_URL}/tmux/list`)
          .then(oldResponse => {
            console.log('旧API服务器列表响应:', oldResponse);
            let worlds = [];

            if (oldResponse && oldResponse.data && oldResponse.data.status === 200 && Array.isArray(oldResponse.data.data)) {
              // 筛选指定存档的世界
              worlds = oldResponse.data.data
                .filter(item => item.ArchiveName === archiveName)
                .map(item => ({
                  worldName: item.WorldName,
                  sessionName: item.SessionName,
                  type: item.WorldName.includes('Forest') ? 'forest' : 'cave'
                }));
            } else if (oldResponse && oldResponse.data && Array.isArray(oldResponse.data)) {
              // 备用数据格式
              worlds = oldResponse.data
                .filter(item => item.ArchiveName === archiveName)
                .map(item => ({
                  worldName: item.WorldName,
                  sessionName: item.SessionName,
                  type: item.WorldName.includes('Forest') ? 'forest' : 'cave'
                }));
            }

            console.log('存档的世界列表:', worlds);
            return worlds;
          })
          .catch(error => {
            console.error('获取房间世界列表失败:', error);
            return []; // 失败时返回空数组
          });
      });
  },
  startRoom(params) {
    return request.post(`/tmux/start`, params);
  },
  stopRoom(id) {
    return request.post(`/rooms/${id}/stop`);
  },
  backupRoom(id) {
    return request.post(`/rooms/${id}/backup`);
  },
  saveWorldSettings(worldType, settings) {
    return request.post(`/world/settings/${worldType}`, settings);
  }
};

// 玩家相关API
export const playerApi = {
  // 获取玩家列表
  getPlayerList(params) {
    return request.get(`/players`, { params });
  },
  // 获取玩家详情
  getPlayerDetail(id) {
    return request.get(`/players/${id}`);
  },
  // 获取在线玩家
  getOnlinePlayers() {
    return request.get(`/players/online`);
  },
  // 踢出玩家
  kickPlayer(id) {
    return request.post(`/players/${id}/kick`);
  },
  // 封禁玩家
  banPlayer(id, data) {
    return request.post(`/players/${id}/ban`, data);
  },
  // 解除封禁
  unbanPlayer(id) {
    return request.post(`/players/${id}/unban`);
  },
  // 发送消息给玩家
  sendMessage(id, data) {
    return request.post(`/players/${id}/message`, data);
  },
  // 获取玩家历史记录
  getPlayerHistory(id, params) {
    return request.get(`/players/${id}/history`, params);
  },
  // 获取封禁列表
  getBanList() {
    return request.get(`/players/banlist`);
  },
  // 更新玩家信息
  updatePlayer(id, data) {
    return request.put(`/players/${id}`, data);
  }
};

// 物品相关API
export const itemApi = {
  // 获取物品列表
  getItemList(params) {
    return request.get(`/items`, { params });
  },
  // 获取物品详情
  getItemDetail(id) {
    return request.get(`/items/${id}`);
  },
  // 生成物品到房间
  generateItem(data) {
    return request.post(`/items/generate`, data);
  },
  // 获取物品分类
  getItemCategories() {
    return request.get(`/items/categories`);
  },
  // 搜索物品
  searchItems(params) {
    return request.get(`/mod/search`, params);
  },

  saveModConfig(params) {
    return request.get(`/items/search`, params);
  }
};

// 模组相关API
export const modApi = {
  getServerList() {
    return request.get('/mod/server/list');
  },
  // 获取模组配置
  getModConfig(params) {
    return request.get("/mod/config", params);
  },
  // 获取用户自定义模组配置
  getModCustomConfig(params) {
    return request.get("/mod/custom-config", params);
  },
  // 保存用户自定义模组配置
  saveModCustomConfig(data) {
    return request.post("/mod/custom-config", data);
  },
  // 获取所有已开启模组配置文件
  getAllModConfigFile() {
    return request.get("/mod/config-file");
  },
  // 更新模组配置（已废弃，请使用saveModCustomConfig）
  updateModConfig(id, data) {
    console.warn('updateModConfig方法已废弃，请使用saveModCustomConfig方法');
    if (data && data.modid) {
      // 兼容以前的调用方式，转换为新格式
      return this.saveModCustomConfig({
        modid: data.modid,
        configuration_options: data.config || {},
        enabled: true
      });
    }
    // 保留后向兼容性，但实际不会被调用
    return request.put(`/mods/${id}/config`, data);
  },
  // 下载模组到服务器（替换原收藏模组功能）
  downloadMod(data) {
    return request.post("/mod/server/add", data, { timeout: apiConfig.DOWNLOAD_TIMEOUT });
  },
  // 卸载模组
  deleteMod(modid) {
    return request.post("/mod/server/delete", { modid });
  },
  // 切换模组启用/禁用状态
  toggleMod(data) {
    return request.post("/mod/toggle", data);
  }
};

// 系统相关API
export const systemApi = {
  // 获取仪表盘状态
  getDashboardStatus() {
    return request.get(`/dashboard/status`);
  },
  // 创建系统备份
  createBackup(data) {
    return request.post(`/system/backup`, data);
  },
  // 获取备份列表
  getBackupList() {
    return request.get(`/system/backups`);
  },
  // 从备份恢复
  restoreFromBackup(id) {
    return request.post(`/system/backup/${id}/restore`);
  },
  // 删除备份
  deleteBackup(id) {
    return request.delete(`/system/backup/${id}`);
  },
  // 获取系统状态
  getSystemStatus() {
    return request.get(`/system/status`);
  },
  // 更新系统配置
  updateSystemConfig(data) {
    return request.put(`/system/config`, data);
  },
  // 获取公告列表
  getAnnouncements() {
    return request.get(`/system/announcements`);
  },
  // 创建公告
  createAnnouncement(data) {
    return request.post(`/system/announcements`, data);
  },
  // 更新公告
  updateAnnouncement(id, data) {
    return request.put(`/system/announcements/${id}`, data);
  },
  // 删除公告
  deleteAnnouncement(id) {
    return request.delete(`/system/announcements/${id}`);
  },
  // 获取公告详情
  getAnnouncementDetail(id) {
    return request.get(`/system/announcements/${id}`);
  },
  // 获取Docker容器列表
  getDockerContainers() {
    return request.get("/dashboard/docker/containers");
  },
  // 启动Docker容器
  startDockerContainer(containerId) {
    return request.post(`/dashboard/docker/containers/${containerId}/start`);
  },
  // 停止Docker容器
  stopDockerContainer(containerId) {
    return request.post(`/dashboard/docker/containers/${containerId}/stop`);
  },
  // 删除Docker容器
  deleteDockerContainer(containerId) {
    return request.delete(`/dashboard/docker/containers/${containerId}`);
  },
  // 获取TMUX服务器列表
  getTmuxServers() {
    return request.get('/tmux/list');
  },

  // 停止TMUX服务器
  stopTmuxServer(data) {
    return request.post("/tmux/stop", data);
  },

  // 重启TMUX服务器
  restartTmuxServer(data) {
    return request.post("/tmux/restart", data);
  },

  // 获取本地版本信息
  getLocalVersion() {
    return request.get('/dstserver/localversion');
  },

  // 获取最新版本信息
  getLatestVersion() {
    return request.get('/dstserver/version');
  },

  // 更新饥荒服务器
  updateDstServer(data) {
    return request.post('/dstserver/update', data);
  },

  // 获取饥荒服务器更新状态
  getDstUpdateStatus(session_name) {
    return request.get('/dstserver/update/status', { params: { session_name } });
  }
};

// 备份管理相关API
export const backupApi = {
  // 获取备份列表
  getBackupList() {
    return request.get(`/backup/list`);
  },
  // 下载备份
  downloadBackup(archive, backup) {
    return request.get(`/backup/download`, { params: { archive, backup } });
  },
  // 创建备份
  createBackup(archive) {
    return request.post(`/backup/create`, { archive });
  },
  // 恢复备份
  restoreBackup(archive, backup, target_name = null, overwrite_target = false) {
    return request.post(`/backup/restore`, {
      archive,
      backup,
      target_name,
      overwrite_target
    });
  },
  // 删除备份
  deleteBackup(archive, backup) {
    return request.post(`/backup/delete`, { archive, backup });
  }
};

// 认证相关API
export const authApi = {
  // 登录
  login(data) {
    return request.post(`/auth/login`, data);
  },
  // 注销
  logout() {
    return request.post(`/auth/logout`);
  },
  // 获取当前用户信息
  getCurrentUser() {
    return request.get(`/auth/user`);
  },
  // 修改密码
  changePassword(data) {
    return request.post(`/auth/change-password`, data);
  }
};

// 添加Agent相关API
export const agentApi = {
  // 获取Agent列表
  getAgentList() {
    console.log('调用getAgentList API');
    return axios.get(`${config.BASE_URL}/agent/list`)
      .then(response => {
        console.log('原始Agent列表响应:', response);
        // 返回标准化的响应格式
        return response.data;
      })
      .catch(error => {
        console.error('获取Agent列表出错:', error);
        throw error;
      });
  },
  // 获取安全密钥
  getSecurityKey() {
    return request.get('/agent/security/key');
  },
  // 生成新的安全密钥
  generateNewKey() {
    return request.post('/agent/security/key/generate');
  },
  // 执行远程命令
  executeCommand(data) {
    return request.post('/agent/command', data);
  },
  // 获取命令执行结果
  getCommandResult(commandId) {
    return request.get(`/agent/command/${commandId}`);
  },
  // 获取命令历史记录
  getCommandHistory() {
    // 不传任何参数，获取所有命令历史
    console.log('获取所有命令历史');
    return request.get('/agent/command');
  },
  // 根据agent_id获取命令历史
  getCommandHistoryByAgentId(agentId) {
    console.log('根据Agent ID获取命令历史:', agentId);
    // 直接拼接URL参数
    return request.get(`/agent/command?agent_id=${encodeURIComponent(agentId)}`);
  }
};

// 房间配置相关API
export const roomConfigApi = {
  // 获取房间配置
  getRoomConfig(savename) {
    // 使用新的API路径
    return request.get(`/dstserver/clusterconfig?savename=${encodeURIComponent(savename)}`);
  },

  // 保存房间配置
  saveRoomConfig(savename, config) {
    return request.post(`/dstserver/clusterconfig`, {
      savename,
      config
    });
  },

  // 导入房间配置
  importRoomConfig(savename, configFile) {
    const formData = new FormData();
    formData.append('config', configFile);
    return request.post(`/dstserver/clusterconfig/${savename}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  // 导出房间配置
  exportRoomConfig(savename) {
    return request.get(`/dstserver/clusterconfig/${savename}/export`, {
      responseType: 'blob'
    });
  }
};

const worldApi = {
  getWorldList() {
    return request.get('/dstserver/list');
  },

  forestWorld(params) {
    return request.post('/dstserver/forestworld', params);
  },

  caveWorld(params) {
    return request.post('/dstserver/caveworld', params);
  },

  getServerIni(savename, worldname) {
    return request.get(`/dstserver/serverini?savename=${savename}&worldname=${worldname}`);
  },

  saveServerIni(params) {
    return request.post('/dstserver/serverini', params);
  },

  deleteWorld(params) {
    return request.post('/dstserver/deleteworld', params);
  }
}

// 导出命令相关模块
export { commandManager, commandApi, COMMAND_TYPES };

// 日志管理API
export const logApi = {
  // 获取解析后的日志
  getLogsData(params) {
    // 去除params[]问题，直接构建正确的参数
    const queryParams = {
      archive: params.archive || '',
      world: params.world || '',
      page: params.page || 1,
      page_size: params.page_size || 20
    };

    // 只有当类型不为空时才添加
    if (params.type) {
      queryParams.type = params.type;
    }

    console.log('日志查询参数:', queryParams);
    return request.get(`/v1/parser/logs`, { params: queryParams });
  },

  // 获取日志类型统计
  getLogTypes(params) {
    // 去除params[]问题，直接构建正确的参数
    const queryParams = {};
    if (params) {
      if (params.archive) queryParams.archive = params.archive;
      if (params.world) queryParams.world = params.world;
    }
    return request.get(`/v1/parser/log_types`, { params: queryParams });
  },

  // 获取活跃解析器列表
  getActiveLogParsers() {
    return request.get(`/v1/parser/active`);
  },

  // 获取有日志的存档和世界列表
  getArchivesWithLogs() {
    console.log('获取有日志的存档和世界列表');
    return request.get('/v1/parser/archives_with_logs');
  },

  // 获取存档列表 (用于日志查询) - 旧方法，保留兼容性
  getArchiveList() {
    console.log('警告: 使用旧的存档列表获取方法，建议使用 getArchivesWithLogs');
    return request.get('/dstserver/list');
  },

  // 根据存档名获取世界列表
  getWorldsByArchive(archiveName) {
    console.log('根据存档名获取世界列表:', archiveName);

    // 先尝试使用新接口
    return this.getArchivesWithLogs()
      .then(response => {
        if (response && response.data && Array.isArray(response.data)) {
          const archive = response.data.find(item => item.archive_name === archiveName);
          if (archive && Array.isArray(archive.worlds)) {
            // 将世界名称数组转换为对象数组，以兼容现有代码
            return archive.worlds.map(worldName => ({ name: worldName }));
          }
        } else if (response && response.status === 200 && response.data && response.data.data && Array.isArray(response.data.data)) {
          const archive = response.data.data.find(item => item.archive_name === archiveName);
          if (archive && Array.isArray(archive.worlds)) {
            return archive.worlds.map(worldName => ({ name: worldName }));
          }
        }

        // 如果新接口失败，回退到旧接口
        console.log('新接口获取世界列表失败，尝试旧接口');
        return request.get('/dstserver/list')
          .then(response => {
            if (response && response.data && response.data.status === 200 && Array.isArray(response.data.data)) {
              const archive = response.data.data.find(item => item.name === archiveName);
              if (archive && archive.worlds) {
                return archive.worlds;
              }
            }
            return [];
          });
      })
      .catch(error => {
        console.error('获取世界列表失败:', error);
        return [];
      });
  },

  // 清空日志
  cleanupLog(data) {
    console.log('清空日志参数:', data);
    return request.post('/v1/parser/cleanup_log', data);
  }
};

// 规则管理API
export const ruleManagementApi = {
  // 获取日志解析规则列表
  getRulesList() {
    return request.get('/v1/parser/rules');
  },

  // 添加日志解析规则
  addRule(ruleData) {
    console.log('调用 addRule API, 数据:', ruleData);
    try {
      // 确保优先级是数字类型
      if (ruleData.priority !== undefined) {
        ruleData.priority = parseInt(ruleData.priority, 10);
      }

      // 添加默认值
      const data = {
        match_mode: 'single',  // 默认为单行匹配模式
        is_regex: false,       // 默认不使用正则
        is_enabled: true,      // 默认启用
        priority: 50,          // 默认优先级
        ...ruleData            // 用传入的数据覆盖默认值
      };

      console.log('处理后的规则数据:', data);
      const result = request.post('/v1/parser/rules', data);
      console.log('调用 addRule API 返回结果:', result);
      return result;
    } catch (error) {
      console.error('调用 addRule API 失败:', error);
      throw error;
    }
  },

  // 更新日志解析规则
  updateRule(ruleId, ruleData) {
    console.log('调用 updateRule API, ID:', ruleId, '数据:', ruleData);
    try {
      // 确保优先级是数字类型
      if (ruleData.priority !== undefined) {
        ruleData.priority = parseInt(ruleData.priority, 10);
      }

      const result = request.put(`/v1/parser/rules/${ruleId}`, ruleData);
      console.log('调用 updateRule API 返回结果:', result);
      return result;
    } catch (error) {
      console.error('调用 updateRule API 失败:', error);
      throw error;
    }
  },

  // 删除日志解析规则
  deleteRule(ruleId) {
    return request.delete(`/v1/parser/rules/${ruleId}`);
  }
};

// 定时任务相关API
export const cronTaskApi = {
  // 获取所有任务
  getTasks(params) {
    return request.get('/cron/tasks', { params });
  },
  // 获取任务详情
  getTaskDetail(id) {
    return request.get(`/cron/tasks/${id}`);
  },
  // 添加任务
  addTask(data) {
    console.log('添加任务数据:', data);
    return request.post('/cron/tasks', data)
      .then(response => {
        console.log('添加任务原始响应:', response);
        return response;
      });
  },
  // 更新任务
  updateTask(id, data) {
    console.log('更新任务数据:', data);
    return request.put(`/cron/tasks/${id}`, data)
      .then(response => {
        console.log('更新任务原始响应:', response);
        return response;
      });
  },
  // 删除任务
  deleteTask(id) {
    return request.delete(`/cron/tasks/${id}`);
  },
  // 启用任务
  enableTask(id) {
    return request.post(`/cron/tasks/${id}/enable`);
  },
  // 禁用任务
  disableTask(id) {
    return request.post(`/cron/tasks/${id}/disable`);
  },
  // 立即运行任务
  runTask(id) {
    return request.post(`/cron/tasks/${id}/run`);
  },
  // 获取所有内置函数
  getFunctions() {
    console.log('cronTaskApi.getFunctions 获取函数列表');
    // 使用原始 axios 请求，避免中间件处理
    return axios.get(`${apiConfig.BASE_URL}/cron/functions`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    }).then(response => {
      console.log('函数列表原始响应数据:', response);
      // 直接返回响应数据，不经过中间件处理
      if (response.status === 200) {
        return response.data;
      } else {
        throw new Error(`请求失败，状态码: ${response.status}`);
      }
    }).catch(error => {
      console.error('请求函数列表失败:', error);
      throw error;
    });

    // 原来的请求方式
    // return request.get('/cron/functions');
  },

  // 任务组相关API
  getGroups() {
    return request.get('/cron/groups');
  },
  getGroupDetail(id) {
    return request.get(`/cron/groups/${id}`);
  },
  addGroup(data) {
    return request.post('/cron/groups', data);
  },
  updateGroup(id, data) {
    return request.put(`/cron/groups/${id}`, data);
  },
  deleteGroup(id) {
    return request.delete(`/cron/groups/${id}`);
  },
  enableGroup(id) {
    return request.post(`/cron/groups/${id}/enable`);
  },
  disableGroup(id) {
    return request.post(`/cron/groups/${id}/disable`);
  },
  getGroupTasks(id) {
    return request.get(`/cron/groups/${id}/tasks`);
  },
  getGroupStats(id) {
    return request.get(`/cron/groups/${id}/stats`);
  },
  getGroupChart(id, params) {
    return request.get(`/cron/groups/${id}/chart`, { params });
  },

  // 任务日志相关API
  getLogs(params) {
    console.log('cronTaskApi.getLogs 原始参数:', params);
    // 确保参数名称与API期望的一致
    const queryParams = {
      page: params.page || 1,
      page_size: params.page_size || 20
    };

    // 只有当这些参数有值时才添加
    if (params.task_id) queryParams.task_id = params.task_id;
    if (params.status) queryParams.status = params.status;
    if (params.start_date) queryParams.start_date = params.start_date;
    if (params.end_date) queryParams.end_date = params.end_date;

    console.log('cronTaskApi.getLogs 处理后的参数:', queryParams);

    // 使用原始 axios 请求，避免中间件处理
    return axios.get(`${apiConfig.BASE_URL}/cron/logs`, {
      params: queryParams,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    }).then(response => {
      console.log('原始响应数据:', response);
      // 直接返回响应数据，不经过中间件处理
      if (response.status === 200) {
        return response.data;
      } else {
        throw new Error(`请求失败，状态码: ${response.status}`);
      }
    }).catch(error => {
      console.error('请求日志列表失败:', error);
      throw error;
    });

    // 原来的请求方式
    // return request.get('/cron/logs', { params: queryParams });
  },
  getLogDetail(id) {
    console.log('cronTaskApi.getLogDetail 获取日志详情:', id);
    // 使用原始 axios 请求，避免中间件处理
    return axios.get(`${apiConfig.BASE_URL}/cron/logs/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    }).then(response => {
      console.log('日志详情原始响应数据:', response);
      // 直接返回响应数据，不经过中间件处理
      if (response.status === 200) {
        return response.data;
      } else {
        throw new Error(`请求失败，状态码: ${response.status}`);
      }
    }).catch(error => {
      console.error('请求日志详情失败:', error);
      throw error;
    });

    // 原来的请求方式
    // return request.get(`/cron/logs/${id}`);
  },
  getTaskStats(taskId) {
    console.log('cronTaskApi.getTaskStats 获取任务统计:', taskId);
    // 使用原始 axios 请求，避免中间件处理
    return axios.get(`${apiConfig.BASE_URL}/cron/logs/stats/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    }).then(response => {
      console.log('任务统计原始响应数据:', response);
      // 直接返回响应数据，不经过中间件处理
      if (response.status === 200) {
        return response.data;
      } else {
        throw new Error(`请求失败，状态码: ${response.status}`);
      }
    }).catch(error => {
      console.error('请求任务统计失败:', error);
      throw error;
    });
  },
  clearLogs(data) {
    return request.post('/cron/logs/clear', data);
  },
  getRecentLogs() {
    return request.get('/cron/logs/recent');
  },

  // 任务导入导出相关API
  exportTasks(data) {
    return request.post('/cron/export', data);
  },
  importTasks(data) {
    return request.post('/cron/export/import', data);
  },
  getExportFiles() {
    return request.get('/cron/export/files');
  },
  downloadExportFile(filename) {
    return request.get(`/cron/export/download/${filename}`, {
      responseType: 'blob'
    });
  },
  deleteExportFile(filename) {
    return request.delete(`/cron/export/files/${filename}`);
  },

  // 任务图表相关API
  getTaskChart(id, params) {
    console.log('cronTaskApi.getTaskChart 获取任务图表:', id, params);
    // 使用原始 axios 请求，避免中间件处理
    return axios.get(`${apiConfig.BASE_URL}/cron/chart/task/${id}`, {
      params,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    }).then(response => {
      console.log('任务图表原始响应数据:', response);
      // 直接返回响应数据，不经过中间件处理
      if (response.status === 200) {
        return response.data;
      } else {
        throw new Error(`请求失败，状态码: ${response.status}`);
      }
    }).catch(error => {
      console.error('请求任务图表失败:', error);
      throw error;
    });
  },
  getTaskDurationChart(id, params) {
    console.log('cronTaskApi.getTaskDurationChart 获取任务时长图表:', id, params);
    // 使用原始 axios 请求，避免中间件处理
    return axios.get(`${apiConfig.BASE_URL}/cron/chart/task/${id}/duration`, {
      params,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    }).then(response => {
      console.log('任务时长图表原始响应数据:', response);
      // 直接返回响应数据，不经过中间件处理
      if (response.status === 200) {
        return response.data;
      } else {
        throw new Error(`请求失败，状态码: ${response.status}`);
      }
    }).catch(error => {
      console.error('请求任务时长图表失败:', error);
      throw error;
    });
  },
  getGroupsChart(params) {
    return request.get('/cron/chart/groups', { params });
  },
  getGroupChart(id, params) {
    return request.get(`/cron/chart/group/${id}`, { params });
  },
  getOverviewChart(params) {
    return request.get('/cron/chart/overview', { params });
  }
};

export default {
  serverApi,
  roomApi,
  playerApi,
  itemApi,
  modApi,
  systemApi,
  authApi,
  backupApi,
  agentApi,
  roomConfigApi,
  worldApi,
  logApi,
  ruleManagementApi,
  cronTaskApi
};