import request from './request';
import config from './config';
import axios from 'axios';
import commandManager, { commandApi, COMMAND_TYPES } from './commandManager';
import { playerApi as realPlayerApi } from './playerApi';
import { realModApi } from './modApi';
import { realLogApi, realRuleManagementApi } from './logApi';
import { realCronTaskApi } from './cronApi';
import { realAgentApi } from './agentApi';
import { legacyBackupApi, legacyRoomApi, legacySystemApi, legacyWorldApi } from './v2LegacyAdapters';
import { legacyAccessApi, legacyRoomConfigApi, legacyWorldConfigurationApi } from './v2ConfigurationAdapters';

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
    return legacyAccessApi.getAdminList(savename);
  },
  // 获取黑名单
  getBlockList(savename) {
    return legacyAccessApi.getBlockList(savename);
  },
  // 获取白名单
  getWhiteList(savename) {
    return legacyAccessApi.getWhiteList(savename);
  },
  // 获取服务器令牌
  getServerToken(savename) {
    return legacyAccessApi.getServerToken(savename);
  },
  getServerTokenStatus(savename) {
    return legacyAccessApi.getServerTokenStatus(savename);
  },
  revealServerToken(savename, confirmation) {
    return legacyAccessApi.revealServerToken(savename, confirmation);
  },
  // 更新管理员列表
  updateAdminList(savename, list, confirmed = false) {
    return legacyAccessApi.updateAdminList(savename, list, confirmed);
  },
  // 更新黑名单
  updateBlockList(savename, list, confirmed = false) {
    return legacyAccessApi.updateBlockList(savename, list, confirmed);
  },
  // 更新白名单
  updateWhiteList(savename, list, confirmed = false) {
    return legacyAccessApi.updateWhiteList(savename, list, confirmed);
  },
  // 更新服务器令牌
  updateServerToken(savename, token, confirmation) {
    return legacyAccessApi.updateServerToken(savename, token, confirmation);
  }
};

export const roomApi = legacyRoomApi;

export const playerApi = realPlayerApi;

const unavailableItemAPI = () => Promise.reject(new Error('当前真实后端未提供物品目录与生成接口'));

// 物品相关API
export const itemApi = {
  getItemList: unavailableItemAPI,
  getItemDetail: unavailableItemAPI,
  generateItem: unavailableItemAPI,
  getItemCategories: unavailableItemAPI,
  searchItems: unavailableItemAPI,
  saveModConfig: unavailableItemAPI
};

// 模组相关API
export const modApi = realModApi;

// 系统相关API
export const systemApi = legacySystemApi;

// 备份管理相关API
export const backupApi = legacyBackupApi;

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

export const agentApi = realAgentApi;

// 房间配置相关API（保留旧页面调用形状，实际只访问 /api/v2）
export const roomConfigApi = legacyRoomConfigApi;

const worldApi = { ...legacyWorldApi, ...legacyWorldConfigurationApi };

// 导出命令相关模块
export { commandManager, commandApi, COMMAND_TYPES };

// 日志管理API
const legacyLogApi = {
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
const legacyRuleManagementApi = {
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

void legacyLogApi;
void legacyRuleManagementApi;
export const logApi = realLogApi;
export const ruleManagementApi = realRuleManagementApi;

export const cronTaskApi = realCronTaskApi;

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
