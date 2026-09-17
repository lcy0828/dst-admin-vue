import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { modThumbnailUrl } from '../src/lib/modImages.mjs'

const original = 'https://images.steamusercontent.com/ugc/14855107614775107410/85FEB8EE96C6051AC7056CEC6A465CB4DF381CB0/'

test('Steam Mod thumbnails use the CDN at the requested pixel size', () => {
  for (const size of [68, 80, 88, 96, 184]) {
    const thumbnail = new URL(modThumbnailUrl(original, size))
    assert.equal(thumbnail.origin + thumbnail.pathname, original)
    assert.deepEqual(Object.fromEntries(thumbnail.searchParams), {
      imw: String(size), imh: String(size), ima: 'fit', impolicy: 'Letterbox', imcolor: '#000000', letterbox: 'true'
    })
  }
})

test('legacy Steam UGC hosts also use CDN thumbnails', () => {
  const source = original.replace('images.steamusercontent.com', 'steamuserimages-a.akamaihd.net')
  const thumbnail = new URL(modThumbnailUrl(source, 96))
  assert.equal(thumbnail.hostname, 'steamuserimages-a.akamaihd.net')
  assert.equal(thumbnail.searchParams.get('imw'), '96')
})

test('thumbnail sizing preserves unrelated URL parameters without duplicating size hints', () => {
  const source = `${original}?imw=512&imw=256&imh=512&ima=crop&impolicy=other&imcolor=white&letterbox=false&token=a%2Bb#preview`
  const thumbnail = new URL(modThumbnailUrl(source, 80))
  assert.deepEqual(thumbnail.searchParams.getAll('imw'), ['80'])
  assert.equal(thumbnail.searchParams.get('imh'), '80')
  assert.equal(thumbnail.searchParams.get('ima'), 'fit')
  assert.equal(thumbnail.searchParams.get('impolicy'), 'Letterbox')
  assert.equal(thumbnail.searchParams.get('imcolor'), '#000000')
  assert.equal(thumbnail.searchParams.get('letterbox'), 'true')
  assert.equal(thumbnail.searchParams.get('token'), 'a+b')
  assert.equal(thumbnail.hash, '#preview')
  assert.equal(modThumbnailUrl(thumbnail.href, 80), thumbnail.href)
})

test('non-Steam, local, malformed, and non-UGC image URLs are left unchanged', () => {
  for (const source of [
    '/static/mods/default.webp', './default.png', 'not a URL',
    'data:image/png;base64,AA==', 'blob:http://localhost/image',
    'https://example.com/ugc/123/abc/?imw=512',
    'https://images.steamusercontent.com.example.org/ugc/123/abc/',
    'https://images.steamusercontent.com@other.example/ugc/123/abc/',
    'https://images.steamusercontent.com/not-ugc/image.png',
    'ftp://images.steamusercontent.com/ugc/123/abc/'
  ]) assert.equal(modThumbnailUrl(source, 68), source)
  assert.equal(modThumbnailUrl('', 68), '')
  assert.equal(modThumbnailUrl(null, 68), '')
  assert.equal(modThumbnailUrl(undefined, 68), '')
})

test('invalid thumbnail sizes do not add unusable CDN parameters', () => {
  for (const size of [undefined, null, 0, -1, 1.5, NaN, Infinity, '68']) {
    assert.equal(modThumbnailUrl(original, size), original)
  }
})

test('all Mod list images use size-appropriate thumbnails and retain their fallbacks', async () => {
  const views = [
    ['src/components/mods/RoomModOverview.vue', [68, 80]],
    ['src/views/mods/ModList.vue', [96]],
    ['src/views/mods/ModSearch.vue', [184]],
    ['src/views/mods/ModLibrary.vue', [88]],
    ['src/views/mods/RuntimeModInventory.vue', [80]]
  ]
  for (const [path, sizes] of views) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8')
    assert.match(source, /import \{ modThumbnailUrl \} from '@\/lib\/modImages.mjs'/)
    const images = [...source.matchAll(/<img\b[^>]*>/g)].map(match => match[0])
    assert.equal(images.length, sizes.length, path)
    for (const [index, image] of images.entries()) {
      assert.match(image, new RegExp(`:src="modThumbnailUrl\\([^"\\n]+, ${sizes[index]}\\)"`), path)
      assert.match(image, /loading="lazy"/, path)
      assert.match(image, /@error=/, path)
    }
    if (source.includes('<script>')) assert.match(source, /methods:\s*\{\s*modThumbnailUrl,/)
  }
})

test('Mod details and API metadata keep the original image URL', async () => {
  const details = await readFile(new URL('../src/views/mods/ModDetailsDialog.vue', import.meta.url), 'utf8')
  const adapter = await readFile(new URL('../src/api/modApi.js', import.meta.url), 'utf8')
  assert.match(details, /:src="mod.image"/)
  assert.doesNotMatch(details, /modThumbnailUrl/)
  assert.match(adapter, /image: mod.previewUrl \|\| ''/)
  assert.doesNotMatch(adapter, /modThumbnailUrl/)
})
