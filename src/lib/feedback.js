import { toast } from 'vue-sonner'

let feedbackHandler = null
const pendingRequests = []

function dispatch(request) {
  if (feedbackHandler) {
    feedbackHandler(request)
    return
  }
  pendingRequests.push(request)
}

function requestFeedback(kind, message, title, options = {}) {
  return new Promise((resolve, reject) => {
    dispatch({
      kind,
      message: String(message ?? ''),
      title: String(title || (kind === 'prompt' ? '请输入' : '确认操作')),
      options,
      resolve,
      reject,
    })
  })
}

export function registerFeedbackHost(handler) {
  feedbackHandler = handler
  pendingRequests.splice(0).forEach(handler)

  return () => {
    if (feedbackHandler === handler) feedbackHandler = null
  }
}

export function confirmAction(message, title = '确认操作', options = {}) {
  return requestFeedback('confirm', message, title, options)
}

export function promptText(message, title = '请输入', options = {}) {
  return requestFeedback('prompt', message, title, options)
}

export { toast }
