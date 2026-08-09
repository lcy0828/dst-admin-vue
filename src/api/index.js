import commandManager, { commandApi, COMMAND_TYPES } from './commandManager';
import { playerApi as realPlayerApi } from './playerApi';
import { realModApi } from './modApi';
import { realLogApi, realRuleManagementApi } from './logApi';
import { realCronTaskApi } from './cronApi';
import { realAgentApi } from './agentApi';
import { authAPI as authV2API } from './v2';
import { legacyBackupApi, legacyRoomApi, legacySystemApi, legacyWorldApi } from './v2LegacyAdapters';
import { legacyAccessApi, legacyRoomConfigApi, legacyWorldConfigurationApi } from './v2ConfigurationAdapters';

// 服务器相关API
export const serverApi = {
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
  async session() {
    return authV2API.session();
  },
  async setup(data = {}) {
    return authV2API.setup(data.username, data.password);
  },
  async login(data = {}) {
    return authV2API.login(data.username, data.password);
  },
  async logout() {
    return authV2API.logout();
  },
  async getCurrentUser() {
    const session = await authV2API.session();
    return session.user || null;
  },
  async changePassword(data = {}) {
    const currentPassword = data.currentPassword || data.current_password || data.oldPassword || data.old_password;
    const newPassword = data.newPassword || data.new_password;
    return authV2API.changePassword(currentPassword, newPassword);
  }
};

export const agentApi = realAgentApi;

// 房间配置相关API（保留旧页面调用形状，实际只访问 /api/v2）
export const roomConfigApi = legacyRoomConfigApi;

const worldApi = { ...legacyWorldApi, ...legacyWorldConfigurationApi };

// 导出命令相关模块
export { commandManager, commandApi, COMMAND_TYPES };

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
