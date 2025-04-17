import request from './request';
import { commandApi } from './commandManager';

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
  },

  // 杀死玩家
  killPlayer(playerId, archiveName) {
    const data = {
      command: `local player = UserToPlayer('${playerId}') if player ~= nil then player:PushEvent("death") end`,
      session_name: archiveName
    };
    return request.post('/tmux/raw-command', data);
  },

  // 设置玩家无敌模式
  setGodMode(playerId, enabled, archiveName) {
    const godModeValue = enabled ? 'true' : 'false';
    const data = {
      command: `local player = UserToPlayer('${playerId}') if player ~= nil then player.components.health:SetInvincible(${godModeValue}) player.components.talker:Say("${enabled ? '无敌模式已开启' : '无敌模式已关闭'}") end`,
      session_name: archiveName
    };
    return request.post('/tmux/raw-command', data);
  },

  // 设置玩家制作模式
  setCreativeMode(playerId, enabled, archiveName) {
    const creativeModeValue = enabled ? 'true' : 'false';
    const data = {
      command: `local player = UserToPlayer('${playerId}') if player ~= nil then player.components.builder.freebuildmode = ${creativeModeValue} player.components.talker:Say("${enabled ? '制作模式已开启' : '制作模式已关闭'}") end`,
      session_name: archiveName
    };
    return request.post('/tmux/raw-command', data);
  },

  // 复活玩家
  resurrectPlayer(playerId, archiveName) {
    const data = {
      command: `local player = UserToPlayer('${playerId}') if player == nil then UserToPlayer("${playerId}").components.talker:Say("该玩家与你不在同一世界！命令无法生效。") end player:PushEvent("respawnfromghost") player.rezsource = "DST-ADMIN-GO控制台"`,
      session_name: archiveName
    };
    return request.post('/tmux/raw-command', data);
  },

  // 重选人物
  changeCharacter(playerId, archiveName) {
    const data = {
      command: `c_despawn(UserToPlayer('${playerId}')) c_announce("管理员已将玩家重置，该玩家可以重新选择角色")`,
      session_name: archiveName
    };
    return request.post('/tmux/raw-command', data);
  },

  // 执行自定义命令
  executeCommand(command, archiveName) {
    const data = {
      command: command,
      session_name: archiveName
    };
    return request.post('/tmux/raw-command', data);
  }
};

export default playerApi;
