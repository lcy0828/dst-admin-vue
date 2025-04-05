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
    return request.get('/dstserver/adminlist', { savename });
  },
  // 获取黑名单
  getBlockList(savename) {
    return request.get('/dstserver/blocklist', { savename });
  },
  // 获取白名单
  getWhiteList(savename) {
    return request.get('/dstserver/whitelist', { savename });
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
  getRoomLogs(id, params) {
    return request.get(`/rooms/${id}/logs`, params);
  },
  backupRoom(id) {
    return request.post(`/rooms/${id}/backup`);
  },
  duplicateRoom(id, data) {
    return request.post(`/rooms/${id}/duplicate`, data);
  },
  getRoomPlayers(id) {
    return request.get(`/rooms/${id}/players`);
  },
  getWorlds() {
    return request.get('/worlds');
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

// 获取API基础URL
export function getBaseUrl() {
  return config.BASE_URL;
}

// 导出命令相关模块
export { commandManager, commandApi, COMMAND_TYPES };

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
  roomConfigApi
};