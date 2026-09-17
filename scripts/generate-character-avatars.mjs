// Build small animated portraits from official DST assets using the companion
// asset pipeline. This is a development tool; the app only serves the WebPs.
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PLAYER_CHARACTER_IDS } from '../src/i18n/playerMessages.js'

const [pipelineDirectory, dataDirectory] = process.argv.slice(2)
if (!pipelineDirectory || !dataDirectory) {
  throw new Error('Usage: node scripts/generate-character-avatars.mjs <asset-pipeline-directory> <DST-data-directory>')
}
const pipelineRoot = resolve(pipelineDirectory)
const dataRoot = resolve(dataDirectory)
const engineURL = pathToFileURL(resolve(pipelineRoot, 'packages/assets/src/klei-animation.mjs'))
const { parseAnimations, parseBuild, renderAnimationSpriteSheet, smallHash, extractDynFiles } = await import(engineURL)
const { ZipReader } = await import(pathToFileURL(resolve(pipelineRoot, 'packages/assets/src/zip-reader.mjs')))
const sharp = createRequire(engineURL)('sharp')
const outputRoot = fileURLToPath(new URL('../public/static/characters/animated/', import.meta.url))
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const frameSize = 80

const animArchive = await ZipReader.open(resolve(dataRoot, 'anim/player_idles.zip'))
const animationBytes = await animArchive.read('anim.bin')
animArchive.close()
const idle = parseAnimations(animationBytes).find(animation => animation.name === 'idle_loop' && animation.facing === 8)
if (!idle) throw new Error('The front-facing idle_loop animation is missing')
const headSymbols = new Set(['headbase', 'hair', 'hairfront', 'hairpigtails', 'face', 'cheeks'].map(smallHash))
const frames = idle.frames.map(frame => frame.filter(element => headSymbols.has(element.imageHash)))
const manifest = { sourceAnimation: 'anim/player_idles.zip', animation: idle.name, facing: idle.facing, animationSha256: digest(animationBytes), frameSize, characters: {} }

function portraitBounds(build) {
  const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
  for (const frame of frames) for (const element of frame) {
    const image = (build.symbols.get(element.imageHash) || []).findLast(image => image.index <= element.imageIndex)
    if (!image || image.blank || element.imageIndex >= image.index + image.duration) continue
    const [a, b, c, d, tx, ty] = element.matrix
    for (const x of [image.x - image.width / 2, image.x + image.width / 2]) {
      for (const y of [image.y - image.height / 2, image.y + image.height / 2]) {
        const px = a * x + c * y + tx, py = b * x + d * y + ty
        bounds.left = Math.min(bounds.left, px)
        bounds.right = Math.max(bounds.right, px)
        bounds.top = Math.min(bounds.top, py)
        bounds.bottom = Math.max(bounds.bottom, py)
      }
    }
  }
  bounds.width = bounds.right - bounds.left
  bounds.height = bounds.bottom - bounds.top
  if (!Number.isFinite(bounds.width) || bounds.width <= 0 || bounds.height <= 0) {
    throw new Error(`No portrait symbols found in ${build.name}`)
  }
  return bounds
}

await mkdir(outputRoot, { recursive: true })
for (const character of PLAYER_CHARACTER_IDS) {
  let archive, dynamicAtlases, source = `anim/${character}.zip`, atlasSha256
  try {
    archive = await ZipReader.open(resolve(dataRoot, source))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    source = `anim/dynamic/${character}.zip`
    const bundle = await ZipReader.open(resolve(dataRoot, 'databundles/anim_dynamic.zip'))
    try { archive = await ZipReader.fromBuffer(await bundle.read(source)) } finally { bundle.close() }
    const bytes = await readFile(resolve(dataRoot, `anim/dynamic/${character}.dyn`))
    dynamicAtlases = extractDynFiles(bytes)
    atlasSha256 = digest(bytes)
  }
  let build, buildBytes, atlasBuffers
  try {
    buildBytes = await archive.read('build.bin')
    build = parseBuild(buildBytes)
    atlasBuffers = await Promise.all(build.atlases.map(name => dynamicAtlases ? dynamicAtlases.get(name) : archive.read(name)))
  } finally { archive.close() }
  const rendered = await renderAnimationSpriteSheet({
    animation: { ...idle, frames, bounds: portraitBounds(build) }, build, atlasBuffers,
    outputSize: frameSize, targetFrameRate: 10, maximumFrames: 24
  })
  const pixels = await sharp(rendered.sheet).raw().toBuffer()
  const animated = await sharp(pixels, {
    raw: { width: frameSize, height: frameSize * rendered.frameCount, channels: 4, pageHeight: frameSize }
  }).webp({ quality: 80, effort: 6, loop: 0, delay: Math.round(rendered.durationMs / rendered.frameCount) }).toBuffer()
  await writeFile(resolve(outputRoot, `${character}.webp`), animated)
  manifest.characters[character] = {
    source, build: build.name, buildSha256: digest(buildBytes),
    atlasSha256: atlasSha256 || digest(Buffer.concat(atlasBuffers)),
    frameCount: rendered.frameCount, durationMs: rendered.durationMs,
    bytes: animated.length, sha256: digest(animated)
  }
  console.log(`${character}: ${rendered.frameCount} frames, ${animated.length} bytes`)
}
await writeFile(resolve(outputRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
