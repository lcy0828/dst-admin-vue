import axios from 'axios';
import apiConfig from './config';
import { Message, Loading } from 'element-ui';
import router from '@/router';

// 加载中实例
let loadingInstance;

// 创建axios实例
const instance = axios.create({
  baseURL: apiConfig.BASE_URL,
  timeout: apiConfig.TIMEOUT,
  headers: apiConfig.HEADERS
});

// 是否正在刷新token
let isRefreshing = false;
// 重试队列
let retryRequests = [];

// 请求拦截器
instance.interceptors.request.use(
  config => {
    // 添加token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // 注释掉添加时间戳的代码，因为它可能导致某些API请求失败
    // if (config.method === 'get') {
    //   config.params = {
    //     ...config.params,
    //     _t: Date.now()
    //   };
    // }
    
    return config;
  },
  error => {
    // 关闭加载中
    if (loadingInstance) {
      loadingInstance.close();
    }
    // 请求错误处理
    Message.error('请求发送失败，请检查网络连接');
    return Promise.reject(error);
  }
);

// 响应拦截器
instance.interceptors.response.use(
  response => {
    // 关闭加载中
    if (loadingInstance) {
      loadingInstance.close();
    }
    
    const res = response.data;
    console.log('API响应数据:', res);
    console.log('响应URL:', response.config.url);
    console.log('响应完整数据:', JSON.stringify(res));
    
    // 适配多种响应格式
    // 1. { code: 0/200, data: {}, message: '' } 标准格式
    // 2. { status: 200, data: [] } 房间列表格式
    // 3. 直接返回数据数组或对象
    
    // 检查是否有标准的响应码
    if (res.code !== undefined) {
      if (res.code !== 0 && res.code !== 200) {
        // 统一错误处理
        Message.error(res.message || res.msg || '操作失败');
        
        // 特定错误码处理
        if (res.code === 401) {
          // token失效，重新登录
          router.push('/login');
        }
        
        return Promise.reject(res);
      }
      
      // 标准格式的成功响应，保留完整结构
      console.log('返回标准响应结构:', res);
      return res;
    }
    
    // 检查房间列表格式
    if (res.status !== undefined) {
      if (res.status !== 200) {
        Message.error(res.message || '操作失败');
        return Promise.reject(res);
      }
      
      return res; // 返回完整响应，包含status和data
    }
    
    // 如果没有标准格式，直接返回响应数据
    return res;
  },
  error => {
    // 关闭加载中
    if (loadingInstance) {
      loadingInstance.close();
    }
    
    console.error('请求错误:', error);
    
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          Message.error(data.message || '请求参数错误');
          break;
        case 401:
          // token过期处理
          if (!isRefreshing) {
            isRefreshing = true;
            
            // 临时方案：直接跳转登录页
            localStorage.removeItem('token');
            localStorage.removeItem('isLoggedIn');
            Message.error('登录已过期，请重新登录');
            router.push('/login');
            
            // 重置状态
            setTimeout(() => {
              isRefreshing = false;
              retryRequests = [];
            }, 1000);
          }
          
          // 将请求加入重试队列
          return new Promise((resolve) => {
            retryRequests.push((token) => {
              error.config.headers['Authorization'] = `Bearer ${token}`;
              resolve(instance(error.config));
            });
          });
        case 403:
          Message.error('没有权限进行此操作');
          break;
        case 404:
          Message.error('请求的资源不存在');
          break;
        case 500:
          Message.error('服务器错误，请联系管理员');
          break;
        default:
          Message.error(`请求失败：${error.message || '未知错误'}`);
      }
    } else if (error.request) {
      // 请求发出但未收到响应
      Message.error('服务器无响应，请稍后重试');
    } else {
      // 请求配置出错
      Message.error(`请求错误：${error.message || '未知错误'}`);
    }
    
    return Promise.reject(error);
  }
);

// 封装请求方法
const request = {
  get(url, params, config = {}) {
    // 如果第二个参数是对象但不是config对象，则视为params
    if (params && typeof params === 'object' && !params.headers && !params.timeout) {
      return instance.get(url, { params, ...config });
    }
    // 如果第二个参数是config对象或未提供，直接传递
    return instance.get(url, params ? { ...params } : config);
  },
  post(url, data, config = {}) {
    return instance.post(url, data, config);
  },
  put(url, data, config = {}) {
    return instance.put(url, data, config);
  },
  delete(url, params, config = {}) {
    return instance.delete(url, { params, ...config });
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
    return instance.get(url, {
      params,
      responseType: 'blob',
      showLoading: true
    }).then(response => {
      // 创建blob链接并下载
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