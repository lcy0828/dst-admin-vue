<template>
  <div ref="rootElement" class="dst-map-root">
    <div ref="mapElement" class="dst-map-target" />
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Feature from 'ol/Feature.js'
import ImageLayer from 'ol/layer/Image.js'
import VectorLayer from 'ol/layer/Vector.js'
import OlMap from 'ol/Map.js'
import Point from 'ol/geom/Point.js'
import Projection from 'ol/proj/Projection.js'
import ImageStatic from 'ol/source/ImageStatic.js'
import VectorSource from 'ol/source/Vector.js'
import View from 'ol/View.js'
import { Circle as CircleStyle, Fill, Icon as IconStyle, Stroke, Style } from 'ol/style.js'
import {
  DST_DEFAULT_MAP_ROTATION,
  DST_MAP_ROTATION_STEP,
  mapIconPresentation,
  normalizeMapRotation
} from '@/lib/worldMaps.mjs'
import 'ol/ol.css'

const props = defineProps({
  terrainUrl: { type: String, default: '' },
  iconsUrl: { type: String, default: '' },
  manifest: { type: Object, default: null },
  features: { type: Array, default: () => [] },
  visibleCategories: { type: Array, default: () => [] },
  selectedFeatureId: { type: String, default: '' }
})

const emit = defineEmits(['feature-selected', 'image-loaded', 'image-error'])

const categoryColors = Object.freeze({
  spawnPoint: '#f59e0b',
  player: '#dc2626',
  walrusCamp: '#7c3aed',
  landmark: '#0f766e',
  resource: '#16a34a',
  other: '#71717a'
})

const rootElement = ref(null)
const mapElement = ref(null)
let map = null
let resizeObserver = null
let fitFrame = null
let imageLayer = null
let featureLayers = new Map()
let featuresById = new Map()

const normalStyleCache = new Map()
const selectedStyleCache = new Map()
const selectionStyle = new Style({
  image: new CircleStyle({
    radius: 18,
    fill: new Fill({ color: 'rgba(255,255,255,0.18)' }),
    stroke: new Stroke({ color: '#ffffff', width: 2 })
  })
})

function normalizedCategory(category) {
  return Object.hasOwn(categoryColors, category) ? category : 'other'
}

function fallbackMarkerStyle(category, selected = false) {
  const cache = selected ? selectedStyleCache : normalStyleCache
  const key = `fallback:${category}`
  if (cache.has(key)) return cache.get(key)
  const style = new Style({
    image: new CircleStyle({
      radius: selected ? 6 : 3,
      fill: new Fill({ color: categoryColors[category] }),
      stroke: new Stroke({ color: selected ? '#ffffff' : 'rgba(255,255,255,0.82)', width: selected ? 3 : 1 })
    })
  })
  cache.set(key, style)
  return style
}

function officialIconStyle(payload, targetSize, selected = false) {
  const icon = payload?.icon
  if (!props.iconsUrl || !icon) return null
  const x = Number(icon.x)
  const y = Number(icon.y)
  const width = Number(icon.width)
  const height = Number(icon.height)
  if (![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0) return null
  const cache = selected ? selectedStyleCache : normalStyleCache
  const key = `icon:${props.iconsUrl}:${x}:${y}:${width}:${height}:${targetSize}`
  if (cache.has(key)) return cache.get(key)
  const baseScale = Math.min(0.58, targetSize / Math.max(width, height))
  const style = new Style({
    image: new IconStyle({
      src: props.iconsUrl,
      offset: [x, y],
      offsetOrigin: 'top-left',
      size: [width, height],
      anchor: [0.5, 0.5],
      rotateWithView: true,
      scale: baseScale
    })
  })
  cache.set(key, style)
  return style
}

function markerStyle(feature, category) {
  const selected = feature.getId() === props.selectedFeatureId
  const zoom = map?.getView()?.getZoom() ?? 0
  const payload = feature.get('payload')
  const presentation = mapIconPresentation(category, zoom, selected)
  if (!presentation.visible) return null
  const icon = officialIconStyle(payload, presentation.size, selected)
  if (icon) return selected ? [selectionStyle, icon] : icon
  if (selected || zoom >= 5) return fallbackMarkerStyle(category, selected)
  return null
}

function clearLayers() {
  if (!map) return
  if (imageLayer) map.removeLayer(imageLayer)
  featureLayers.forEach(layer => map.removeLayer(layer))
  imageLayer = null
  featureLayers = new Map()
  featuresById = new Map()
}

function mapDimensions() {
  const width = Number(props.manifest?.map?.imageWidth)
  const height = Number(props.manifest?.map?.imageHeight)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
  return { width, height, extent: [0, 0, width, height] }
}

function applyCategoryVisibility() {
  const visible = new Set(props.visibleCategories)
  featureLayers.forEach((layer, category) => layer.setVisible(visible.has(category)))
}

function refreshSelection() {
  featureLayers.forEach(layer => layer.changed())
}

function buildLayers() {
  if (!map) return
  clearLayers()
  const dimensions = mapDimensions()
  if (!dimensions || !props.terrainUrl) return

  const projection = new Projection({
    code: `DST-MAP-${dimensions.width}x${dimensions.height}`,
    units: 'pixels',
    extent: dimensions.extent
  })
  const imageSource = new ImageStatic({
    url: props.terrainUrl,
    projection,
    imageExtent: dimensions.extent
  })
  imageSource.on('imageloadend', () => {
    emit('image-loaded')
    scheduleFit(0)
  })
  imageSource.on('imageloaderror', () => emit('image-error'))
  imageLayer = new ImageLayer({ source: imageSource })
  imageLayer.setZIndex(0)
  map.addLayer(imageLayer)

  const grouped = new Map()
  for (const payload of props.features) {
    const pixelX = Number(payload?.pixelX)
    const pixelY = Number(payload?.pixelY)
    if (!payload?.id || !Number.isFinite(pixelX) || !Number.isFinite(pixelY)) continue
    const category = normalizedCategory(payload.category)
    const marker = new Feature({
      geometry: new Point([pixelX, dimensions.height - pixelY]),
      payload,
      category
    })
    marker.setId(payload.id)
    featuresById.set(payload.id, marker)
    if (!grouped.has(category)) grouped.set(category, [])
    grouped.get(category).push(marker)
  }

  Object.keys(categoryColors).forEach((category, index) => {
    const layer = new VectorLayer({
      source: new VectorSource({ features: grouped.get(category) || [], wrapX: false }),
      renderBuffer: 32,
      updateWhileAnimating: false,
      updateWhileInteracting: false,
      style: feature => markerStyle(feature, category)
    })
    layer.setZIndex(index + 1)
    featureLayers.set(category, layer)
    map.addLayer(layer)
  })

  map.setView(new View({
    projection,
    center: [dimensions.width / 2, dimensions.height / 2],
    extent: dimensions.extent,
    showFullExtent: true,
    rotation: DST_DEFAULT_MAP_ROTATION,
    constrainRotation: false,
    maxZoom: 10,
    minZoom: -2
  }))
  applyCategoryVisibility()
  scheduleFit(0)
}

function fit(duration = 180) {
  const dimensions = mapDimensions()
  if (!map || !dimensions) return
  map.updateSize()
  map.getView().fit(dimensions.extent, { padding: [24, 24, 24, 24], duration, maxZoom: 2 })
}

function scheduleFit(duration = 0) {
  nextTick(() => {
    if (!map) return
    if (fitFrame !== null) cancelAnimationFrame(fitFrame)
    fitFrame = requestAnimationFrame(() => {
      fitFrame = null
      fit(duration)
    })
  })
}

function zoomIn() {
  map?.getView().animate({ zoom: (map.getView().getZoom() || 0) + 1, duration: 140 })
}

function zoomOut() {
  map?.getView().animate({ zoom: (map.getView().getZoom() || 0) - 1, duration: 140 })
}

function rotateClockwise() {
  const view = map?.getView()
  if (!view) return
  view.animate({ rotation: normalizeMapRotation(view.getRotation() + DST_MAP_ROTATION_STEP), duration: 180 })
}

function resetOrientation() {
  const view = map?.getView()
  if (!view) return
  view.setRotation(DST_DEFAULT_MAP_ROTATION)
  fit()
}

function focusFeature(featureId) {
  const marker = featuresById.get(featureId)
  if (!map || !marker) return false
  const coordinates = marker.getGeometry().getCoordinates()
  map.getView().animate({ center: coordinates, zoom: Math.max(map.getView().getZoom() || 0, 5), duration: 220 })
  return true
}

function handleMapClick(event) {
  const marker = map.forEachFeatureAtPixel(event.pixel, feature => feature, { hitTolerance: 5 })
  emit('feature-selected', marker?.get('payload') || null)
}

onMounted(() => {
  map = new OlMap({ target: mapElement.value, controls: [], interactions: undefined })
  map.on('singleclick', handleMapClick)
  resizeObserver = new ResizeObserver(() => scheduleFit(0))
  resizeObserver.observe(rootElement.value)
  buildLayers()
})

watch(() => [props.terrainUrl, props.iconsUrl, props.manifest, props.features], buildLayers)
watch(() => props.visibleCategories, applyCategoryVisibility, { deep: true })
watch(() => props.selectedFeatureId, refreshSelection)

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (fitFrame !== null) cancelAnimationFrame(fitFrame)
  if (map) {
    map.un('singleclick', handleMapClick)
    clearLayers()
    map.setTarget(undefined)
  }
  map = null
})

defineExpose({ fit, focusFeature, resetOrientation, rotateClockwise, zoomIn, zoomOut })
</script>

<style scoped>
.dst-map-root,
.dst-map-target {
  width: 100%;
  height: 100%;
  min-height: inherit;
}

.dst-map-root {
  position: relative;
  overflow: hidden;
  background: rgb(27 29 26);
}

.dst-map-target :deep(.ol-viewport) {
  cursor: grab;
}

.dst-map-target :deep(.ol-viewport:active) {
  cursor: grabbing;
}
</style>
