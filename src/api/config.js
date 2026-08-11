// API配置文件
const API_CONFIG = {
  // 基础URL
  BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',

  // 超时时间
  TIMEOUT: 20000,

  // 模组下载专用超时时间 (5分钟)
  DOWNLOAD_TIMEOUT: 300000,

  // 大型存档上传及服务端校验允许最长 2 小时
  UPLOAD_TIMEOUT: 7200000,

  // 请求头
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

export default API_CONFIG;
