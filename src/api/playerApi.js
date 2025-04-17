import request from './request';

// 玩家信息相关API
export const playerApi = {
  // 获取在线玩家列表
  getOnlinePlayers(archiveName) {
    const params = {};
    if (archiveName) {
      params.archive_name = archiveName;
    }
    return request.get('/player/online', params);
  },

  // 获取所有玩家列表（支持分页）
  getAllPlayers(params = {}) {
    return request.get('/player/all', params);
  },

  // 获取玩家统计信息
  getPlayerStats(archiveName) {
    const params = {};
    if (archiveName) {
      params.archive_name = archiveName;
    }
    return request.get('/player/stats', params);
  },

  // 获取玩家详情
  getPlayerDetail(id) {
    return request.get(`/player/detail/${id}`);
  },

  // 手动更新玩家信息
  updatePlayerInfo(sessionName) {
    return request.post('/player/update', { session_name: sessionName });
  },

  // 踢出玩家
  kickPlayer(playerId, archiveName) {
    const data = {};
    if (archiveName) {
      data.archive_name = archiveName;
    }
    return request.post(`/player/kick/${playerId}`, data);
  },

  // 封禁玩家
  banPlayer(playerId, data) {
    return request.post(`/player/ban/${playerId}`, data);
  },

  // 发送消息给玩家
  sendMessage(playerId, message, archiveName) {
    const data = {
      message
    };
    if (archiveName) {
      data.archive_name = archiveName;
    }
    return request.post(`/player/message/${playerId}`, data);
  },

  // 获取存档列表
  getArchives() {
    return request.get('/player/archives');
  },

  // 获取会话列表
  getSessions() {
    return request.get('/cron/tmux/sessions');
  }
};

export default playerApi;
