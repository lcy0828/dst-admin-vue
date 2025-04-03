import request from './request';
import config from './config';
import axios from 'axios';

// 添加一个通用的请求处理函数
function apiRequest(method, url, data = null) {
  console.log(`API请求: ${method.toUpperCase()} ${url}`, data ? data : '');
  
  let requestPromise;
  
  switch(method.toLowerCase()) {
    case 'get':
      requestPromise = request.get(url, { params: data });
      break;
    case 'post':
      requestPromise = request.post(url, data);
      break;
    case 'put':
      requestPromise = request.put(url, data);
      break;
    case 'delete':
      requestPromise = request.delete(url, { params: data });
      break;
    default:
      return Promise.reject(new Error(`不支持的请求方法: ${method}`));
  }
  
  return requestPromise.then(response => {
    console.log(`API响应: ${method.toUpperCase()} ${url}`, response);
    return response;
  }).catch(error => {
    console.error(`API错误: ${method.toUpperCase()} ${url}`, error);
    return Promise.reject(error);
  });
}

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
    return request.get(`/server/log/stream?archive=${archive}&world=${world}&lines=${lines}`);
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

// 房间相关API
export const roomApi = {
  // 获取房间列表
  getRoomList(params) {
    console.log("调用getRoomList API");
    try {
      return request.get('/dstserver/list', { params })
        .then(response => {
          // 检查是否有标准的状态+数据格式
          if (response && response.data) {
            if (response.status === 200 || response.data.status === 200) {
              // 直接返回数据数组或包装在data中的数据数组
              return Array.isArray(response.data) ? response.data : 
                   (Array.isArray(response.data.data) ? response.data.data : []);
            }
          }
          return response; // 如果没有特殊处理，返回原始响应
        });
    } catch (error) {
      console.error("getRoomList API错误:", error);
      throw error;
    }
  },
  // 获取房间详情
  getRoomDetail(id) {
    return request.get(`/rooms/${id}`);
  },
  // 创建房间
  createRoom(data) {
    return request.post(`/rooms`, data);
  },
  // 更新房间
  updateRoom(id, data) {
    return request.put(`/rooms/${id}`, data);
  },
  // 删除房间
  deleteRoom(id) {
    return request.delete(`/rooms/${id}`);
  },
  // 获取房间的世界列表
  getRoomWorlds(archiveName) {
    console.log('获取房间世界列表:', archiveName);
    return axios.get(`${config.BASE_URL}/tmux/list`)
      .then(response => {
        console.log('原始服务器列表响应:', response);
        let worlds = [];
        
        if (response && response.data && response.data.status === 200 && Array.isArray(response.data.data)) {
          // 筛选指定存档的世界
          worlds = response.data.data
            .filter(item => item.ArchiveName === archiveName)
            .map(item => ({
              worldName: item.WorldName,
              sessionName: item.SessionName,
              type: item.WorldName.includes('Forest') ? 'forest' : 'cave'
            }));
        } else if (response && response.data && Array.isArray(response.data)) {
          // 备用数据格式
          worlds = response.data
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
  },
  // 启动房间的所有服务器
  startRoom(archiveName, serverMode = "32") {
    console.log('调用startRoom API:', archiveName);
    
    // 先获取房间的世界列表
    return this.getRoomWorlds(archiveName)
      .then(worlds => {
        if (!worlds || worlds.length === 0) {
          // 如果没有找到世界，使用默认的Forest1和Caves1
          console.log('未找到世界列表，使用默认世界名');
          return Promise.all([
            axios.post(`${config.BASE_URL}/tmux/start`, {
              archive_name: archiveName,
              world_name: "Forest1",
              server_mode: serverMode
            }),
            axios.post(`${config.BASE_URL}/tmux/start`, {
              archive_name: archiveName,
              world_name: "Caves1",
              server_mode: serverMode
            })
          ]);
        } else {
          // 启动找到的所有世界
          console.log('使用存档中的实际世界列表:', worlds);
          const startPromises = worlds.map(world => 
            axios.post(`${config.BASE_URL}/tmux/start`, {
              archive_name: archiveName,
              world_name: world.worldName,
              server_mode: serverMode
            })
          );
          
          if (startPromises.length === 0) {
            return Promise.reject(new Error('没有可启动的世界'));
          }
          
          return Promise.all(startPromises);
        }
      })
      .then(responses => {
        console.log('启动房间响应:', responses);
        // 返回统一的成功响应
        return {
          status: 200,
          msg: '房间启动成功',
          data: {
            archive_name: archiveName,
            worlds: responses.map(response => response.data.data || {})
          }
        };
      })
      .catch(error => {
        console.error('启动房间失败:', error);
        throw error;
      });
  },
  // 停止房间
  stopRoom(id) {
    return request.post(`/rooms/${id}/stop`);
  },
  // 获取房间日志
  getRoomLogs(id, params) {
    return request.get(`/rooms/${id}/logs`, params);
  },
  // 备份房间
  backupRoom(id) {
    return request.post(`/rooms/${id}/backup`);
  },
  // 复制房间
  duplicateRoom(id, data) {
    return request.post(`/rooms/${id}/duplicate`, data);
  },
  // 获取房间玩家列表
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

  // 获取已安装模组列表
  getModList(params) {
    return request.get(`/mods`, params);
  },
  // 获取模组详情
  getModDetail(id) {
    return request.get(`/mods/${id}`);
  },
  // 安装模组
  installMod(data) {
    return request.post(`/mods/install`, data);
  },
  // 卸载模组
  uninstallMod(id) {
    return request.post(`/mods/${id}/uninstall`);
  },
  // 更新模组
  updateMod(id) {
    return request.post(`/mods/${id}/update`);
  },
  // 搜索工坊模组
  searchWorkshopMods(params) {
    return request.get(`/mods/workshop/search`, params);
  },
  // 获取模组配置
  getModConfig(id, data = null) {
    if (data) {
      return request.post(`/mod/download`, data);
    }
    return request.get(`/mods/${id}/config`);
  },
  // 更新模组配置
  updateModConfig(id, data) {
    if (data && data.modid) {
      return request.post(`/mod/save`, data);
    }
    return request.put(`/mods/${id}/config`, data);
  },
  // 获取热门模组
  getPopularMods() {
    return request.get(`/mods/workshop/popular`);
  },
  // 获取最新模组
  getLatestMods() {
    return request.get(`/mods/workshop/latest`);
  },
  // 启用模组
  enableMod(id, data) {
    return request.post(`/mods/${id}/enable`, data);
  },
  // 禁用模组
  disableMod(id, data) {
    return request.post(`/mods/${id}/disable`, data);
  }
};

// 系统相关API
export const systemApi = {
  // 获取系统信息
  getSystemInfo() {
    return request.get(`/system/info`);
  },
  // 获取仪表盘状态
  getDashboardStatus() {
    return request.get(`/dashboard/status`);
  },
  // 获取系统日志
  getSystemLogs(params) {
    return request.get(`/system/logs`, { params });
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
  // 获取系统配置
  getSystemConfig() {
    return request.get(`/system/config`);
  },
  // 重启系统
  restartSystem() {
    return request.post(`/system/restart`);
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
    // 直接获取原始响应，不进行数据转换
    return axios.get(`${config.BASE_URL}/dashboard/docker/containers`)
      .then(response => {
        console.log('Docker容器原始响应:', response);
        return response.data;
      });
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
    console.log('调用getTmuxServers API');
    return axios.get(`${config.BASE_URL}/tmux/list`)
      .then(response => {
        console.log('TMUX服务器原始响应:', response);
        return response.data;
      })
      .catch(error => {
        console.error('获取TMUX服务器列表失败:', error);
        throw error;
      });
  },
  
  // 启动TMUX服务器
  startTmuxServer(data) {
    console.log('调用startTmuxServer API:', data);
    return axios.post(`${config.BASE_URL}/tmux/start`, data)
      .then(response => {
        console.log('启动TMUX服务器响应:', response);
        return response.data;
      })
      .catch(error => {
        console.error('启动TMUX服务器失败:', error);
        throw error;
      });
  },
  
  // 停止TMUX服务器
  stopTmuxServer(data) {
    console.log('调用stopTmuxServer API:', data);
    return axios.post(`${config.BASE_URL}/tmux/stop`, data)
      .then(response => {
        console.log('停止TMUX服务器响应:', response);
        return response.data;
      })
      .catch(error => {
        console.error('停止TMUX服务器失败:', error);
        throw error;
      });
  },
  
  // 重启TMUX服务器
  restartTmuxServer(data) {
    console.log('调用restartTmuxServer API:', data);
    return axios.post(`${config.BASE_URL}/tmux/restart`, data)
      .then(response => {
        console.log('重启TMUX服务器响应:', response);
        return response.data;
      })
      .catch(error => {
        console.error('重启TMUX服务器失败:', error);
        throw error;
      });
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