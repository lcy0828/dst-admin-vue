import axios from 'axios';
import apiConfig from './config';
import { toast } from 'vue-sonner';
import router from '@/router';
import { translate } from '@/i18n';
import { localizedRequestError } from '@/i18n/globalFeedbackMessages.js';
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

instance.interceptors.request.use(config => {
  const method = (config.method || 'get').toUpperCase();
  if (method === 'GET' || method === 'HEAD') {
    config.headers['Cache-Control'] = 'no-store';
    config.headers.Pragma = 'no-cache';
  }
  return config;
});

function handleExpiredSession() {
  if (router.currentRoute.value.path === '/login') return;
  toast.error(translate('globalFeedback.request.sessionExpired'));
  void router.push('/login');
}

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
          handleExpiredSession();
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
          handleExpiredSession();
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
      toast.error(localizedRequestError(translate, 'globalFeedback.request.serverUnavailable', error));
    } else {
      toast.error(localizedRequestError(translate, 'globalFeedback.request.failed', error));
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
        link.download = filename || translate('globalFeedback.request.defaultDownloadFilename');
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
      link.download = filename || translate('globalFeedback.request.defaultDownloadFilename');
      link.click();
      window.URL.revokeObjectURL(link.href);
      return response;
    });
  }
};

export default request;
