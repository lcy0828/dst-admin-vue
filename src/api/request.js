import axios from 'axios';
import apiConfig from './config';
import { Message, Loading } from 'element-ui';
import router from '@/router';
import qs from 'qs';

let loadingInstance;
const instance = axios.create({
  baseURL: apiConfig.BASE_URL,
  timeout: apiConfig.TIMEOUT,
  headers: apiConfig.HEADERS,
  paramsSerializer: params => {
    // 使用qs库序列化参数，不使用方括号和点表示法
    return qs.stringify(params, { arrayFormat: 'repeat', indices: false });
  }
});

let isRefreshing = false;
let retryRequests = [];
instance.interceptors.request.use(
  config => {
    // 添加请求日志
    console.log(`请求: ${config.method.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data
    });
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    if (loadingInstance) {
      loadingInstance.close();
    }
    return Promise.reject(error);
  }
);

// 响应拦截器
instance.interceptors.response.use(
  response => {
    // 添加响应日志
    console.log(`响应: ${response.config.method.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      data: response.data
    });
    
    // 关闭加载中
    if (loadingInstance) {
      loadingInstance.close();
    }
    
    const res = response.data;
    if (res.code !== undefined) {
      if (res.code !== 0 && res.code !== 200) {
        if (res.code === 401) {
          router.push('/login');
        }
        
        return Promise.reject(res);
      }
      return res;
    }
    
    // 检查房间列表格式
    if (res.status !== undefined) {
      if (res.status !== 200) {
        return Promise.reject(res);
      }
      return res;
    }
    return res;
  },
  error => {
    if (loadingInstance) {
      loadingInstance.close();
    }
    
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          break;
        case 401:
          if (!isRefreshing) {
            isRefreshing = true;
            localStorage.removeItem('token');
            localStorage.removeItem('isLoggedIn');
            Message.error('登录已过期，请重新登录');
            router.push('/login');
            
            setTimeout(() => {
              isRefreshing = false;
              retryRequests = [];
            }, 1000);
          }
          return new Promise((resolve) => {
            retryRequests.push((token) => {
              error.config.headers['Authorization'] = `Bearer ${token}`;
              resolve(instance(error.config));
            });
          });
        case 403:
          break;
        case 404:
          break;
        case 500:
          break;
        default:
          break;
      }
    } else if (error.request) {
      Message.error('服务器无响应，请稍后重试');
    } else {
      Message.error(`请求错误：${error.message || '未知错误'}`);
    }
    
    return Promise.reject(error);
  }
);

// 封装请求方法
const request = {
  get(url, params, config = {}) {
    // 如果params是params对象嵌套的情况
    if (params && typeof params === 'object' && params.params && typeof params.params === 'object') {
      return instance.get(url, {
        ...config,
        params: params.params
      });
    }
    
    // 普通参数情况
    return instance.get(url, {
      ...config,
      params
    });
  },
  post(url, data, config = {}) {
    return instance.post(url, data, config);
  },
  put(url, data, config = {}) {
    return instance.put(url, data, config);
  },
  delete(url, params, config = {}) {
    // 如果params是params对象嵌套的情况
    if (params && typeof params === 'object' && params.params && typeof params.params === 'object') {
      return instance.delete(url, {
        ...config,
        params: params.params
      });
    }
    
    // 普通参数情况
    return instance.delete(url, {
      ...config,
      params
    });
  },
  // 上传文件
  upload(url, file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);
    
    return instance.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: onProgress ? e => {
        const progress = Math.round((e.loaded * 100) / e.total);
        onProgress(progress);
      } : null
    });
  },
  // 下载文件
  download(url, params, filename) {
    // 如果params是params对象嵌套的情况
    if (params && typeof params === 'object' && params.params && typeof params.params === 'object') {
      return instance.get(url, {
        params: params.params,
        responseType: 'blob',
        showLoading: true
      }).then(response => {
        const blob = new Blob([response]);
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = filename || '下载文件';
        link.click();
        window.URL.revokeObjectURL(link.href);
        return response;
      });
    }
    
    return instance.get(url, {
      params,
      responseType: 'blob',
      showLoading: true
    }).then(response => {
      const blob = new Blob([response]);
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename || '下载文件';
      link.click();
      window.URL.revokeObjectURL(link.href);
      return response;
    });
  }
};

export default request; 