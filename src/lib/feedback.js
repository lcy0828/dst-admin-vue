import { toast } from 'vue-sonner'
import { sharedUiText } from '../i18n/sharedUiMessages.js'

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
      title: String(title || sharedUiText(kind === 'prompt' ? 'feedback.promptTitle' : 'feedback.confirmTitle')),
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

export function confirmAction(message, title = '', options = {}) {
  return requestFeedback('confirm', message, title, options)
}

export function confirmCapacityRisk(preview) {
  return requestFeedback('capacity-risk', '', '', { preview })
}

export function promptText(message, title = '', options = {}) {
  return requestFeedback('prompt', message, title, options)
}

export { toast }
