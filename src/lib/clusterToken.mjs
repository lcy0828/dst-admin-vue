export const MIN_CLUSTER_TOKEN_LENGTH = 16

export function clusterTokenError(value, { required = true } = {}) {
  const token = String(value || '').trim()
  if (!token) return required ? '请输入服务器令牌' : ''
  if (token.length < MIN_CLUSTER_TOKEN_LENGTH) return '令牌内容不完整，请填写完整的 Klei 集群令牌'
  if (token.length > 4096) return '长度不能超过 4096 个字符'
  if (/\s/.test(String(value))) return '令牌不能包含空格或换行'
  return ''
}
