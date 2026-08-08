// API配置文件
const API_CONFIG = {
  // 基础URL
  BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',

  // 超时时间
  TIMEOUT: 20000,

  // 模组下载专用超时时间 (5分钟)
  DOWNLOAD_TIMEOUT: 300000,

  // 请求头
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

export default API_CONFIG;
