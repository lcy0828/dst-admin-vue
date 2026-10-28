<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { performanceSeries } from '@/lib/performanceReport.mjs'
const props = defineProps({ points: { type: Array, default: () => [] }, metric: { type: String, required: true }, events: { type: Array, default: () => [] }, resolution: { type: Number, default: 30 } })
const root = ref(null), { t, locale } = useI18n()
let chart, observer, alive = true, sequence = 0
async function draw() {
  const current = ++sequence
  const [{ echarts }, { LineChart }, { MarkLineComponent }] = await Promise.all([import('@/lib/echarts.mjs'), import('echarts/charts'), import('echarts/components')])
  await nextTick()
  if (!alive || current !== sequence || !root.value) return
  echarts.use([LineChart, MarkLineComponent])
  chart ||= echarts.init(root.value)
  const css = getComputedStyle(document.documentElement)
  const color = variable => css.getPropertyValue(variable).trim()
  const series = performanceSeries(props.points, props.metric, props.resolution)
  const palette = [color('--primary'), color('--success'), color('--warning')]
  const worlds = [...new Set(series.map(item => item.worldId))]
  chart.setOption({
    animation: false, color: palette,
    textStyle: { color: color('--foreground') },
    tooltip: { trigger: 'axis', confine: true, renderMode: 'richText' },
    legend: { top: 0, left: 'center', data: [...new Set(series.map(item => item.name))], textStyle: { color: color('--muted-foreground') } },
    grid: { left: 50, right: 18, top: 36, bottom: 35 },
    xAxis: { type: 'time', axisLabel: { color: color('--muted-foreground') } },
    yAxis: { type: 'value', min: 0, ...(props.metric === 'score' ? { max: 100 } : {}), name: t(`performance.units.${props.metric}`), axisLabel: { color: color('--muted-foreground') }, splitLine: { lineStyle: { color: color('--border') } } },
    series: series.map((item, index) => ({ ...item, itemStyle: { color: palette[worlds.indexOf(item.worldId) % palette.length] }, ...(index === 0 ? { markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { type: 'dashed', opacity: 0.4 }, data: props.events.slice(-20).map(event => ({ xAxis: Date.parse(event.at), name: t(`performance.events.${event.type}`) })) } } : {}), type: 'line', showSymbol: false, connectNulls: false, lineStyle: { width: 2 } }))
  }, true)
}
onMounted(() => { observer = new ResizeObserver(() => chart?.resize()); observer.observe(root.value); void draw() })
watch(() => [props.points, props.metric, props.resolution, props.events, locale.value], draw)
onBeforeUnmount(() => { alive = false; sequence++; observer?.disconnect(); chart?.dispose() })
</script>
<template><div ref="root" class="h-64 min-w-0 w-full" role="img" :aria-label="t(`performance.metrics.${metric}`)" /></template>
