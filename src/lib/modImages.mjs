const steamImageHosts = new Set(['images.steamusercontent.com', 'steamuserimages-a.akamaihd.net'])

export function modThumbnailUrl(source, size) {
  if (!source) return ''
  if (!Number.isInteger(size) || size <= 0) return source

  let url
  try {
    url = new URL(source)
  } catch {
    return source
  }
  if (!['https:', 'http:'].includes(url.protocol) || !steamImageHosts.has(url.hostname) || !url.pathname.startsWith('/ugc/')) {
    return source
  }

  url.searchParams.set('imw', String(size))
  url.searchParams.set('imh', String(size))
  url.searchParams.set('ima', 'fit')
  url.searchParams.set('impolicy', 'Letterbox')
  url.searchParams.set('imcolor', '#000000')
  url.searchParams.set('letterbox', 'true')
  return url.href
}
