import request from './request';

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
  },

  // 获取世界状态信息
  getWorldState(params) {
    return request.post('/world/state', params);
  }
}

export default worldApi;
