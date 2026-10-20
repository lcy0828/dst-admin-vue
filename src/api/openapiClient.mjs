// HTTP locations come from the generated OpenAPI map. The existing client
// supplies session/CSRF/idempotency handling and normal platform errors.
export function createOpenAPIClient(client, manifest) {
  const operations = new Map(manifest.operations.map(operation => [operation.operationId, operation]))
  return (operationId, { path = {}, query, body, headers } = {}, options = {}) => {
    const operation = operations.get(operationId)
    if (!operation) throw new Error(`Unknown management operation: ${operationId}`)
    const url = operation.path.replace(/\{([^}]+)\}/g, (_match, name) => {
      const value = path[name]
      const text = String(value ?? '')
      if (!text || text.includes('/') || text.includes('\\') || [...text].some(character => character.charCodeAt(0) < 32) || ['.', '..'].includes(text)) throw new Error(`Invalid path parameter: ${name}`)
      return encodeURIComponent(String(value))
    })
    let data = body
    if (operation.contentType === 'multipart/form-data' && body && !(body instanceof FormData)) {
      data = new FormData()
      for (const [name, value] of Object.entries(body)) if (value != null) data.set(name, value)
    }
    return client.request({ ...options, method: operation.method, url, params: query, data, headers: { ...(operation.contentType === 'multipart/form-data' ? { 'Content-Type': 'multipart/form-data' } : {}), ...options.headers, ...headers }, runtimeTarget: false,
      ...(operation.transport === 'download' ? { responseType: 'blob' } : {}) })
  }
}
