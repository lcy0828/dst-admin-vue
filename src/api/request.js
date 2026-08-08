import axios from 'axios';
import apiConfig from './config';
import { ElMessage as Message } from 'element-plus';
import router from '@/router';
import qs from 'qs';

const instance = axios.create({
  baseURL: apiConfig.BASE_URL,
  timeout: apiConfig.TIMEOUT,
  headers: apiConfig.HEADERS,
  paramsSerializer: params => {
    // 使用qs库序列化参数，不使用方括号和点表示法
    return qs.stringify(params, { arrayFormat: 'repeat', indices: false });
  }
});

// 响应拦截器
instance.interceptors.response.use(
  response => {
    const res = response.data;

    // 处理带code字段的响应
    if (res.code !== undefined) {
      // 成功状态码
      if (res.code === 0 || res.code === 200) {
        // 如果是单个对象的响应，不进行特殊处理，直接返回
        return res;
      } else {
        // 处理错误状态码
        if (res.code === 401) {
          router.push('/login');
        }
        return Promise.reject(res);
      }
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
    if (error.response) {
      const { status } = error.response;

      switch (status) {
        case 400:
          break;
        case 401:
          if (router.currentRoute.value.path !== '/login') {
            Message.error('登录已过期，请重新登录');
            void router.push('/login');
          }
          break;
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
