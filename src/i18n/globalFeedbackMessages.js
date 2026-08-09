export const globalFeedbackMessages = Object.freeze({
  'zh-CN': {
    globalFeedback: {
      request: {
        sessionExpired: '登录已过期，请重新登录',
        serverUnavailable: '服务器无响应，请稍后重试',
        serverUnavailableWithDetail: '服务器无响应，请稍后重试：{detail}',
        failed: '请求失败',
        failedWithDetail: '请求失败：{detail}',
        defaultDownloadFilename: '下载文件',
      },
      theme: {
        switchToDark: '切换到深色模式',
        switchToLight: '切换到浅色模式',
      },
    },
  },
  'en-US': {
    globalFeedback: {
      request: {
        sessionExpired: 'Your session has expired. Sign in again.',
        serverUnavailable: 'The server is not responding. Try again later.',
        serverUnavailableWithDetail: 'The server is not responding. Try again later: {detail}',
        failed: 'Request failed',
        failedWithDetail: 'Request failed: {detail}',
        defaultDownloadFilename: 'download',
      },
      theme: {
        switchToDark: 'Switch to dark mode',
        switchToLight: 'Switch to light mode',
      },
    },
  },
})

export function localizedRequestError(translate, key, error) {
  const detail = typeof error?.message === 'string' ? error.message : ''
  return detail
    ? translate(`${key}WithDetail`, { detail })
    : translate(key)
}
