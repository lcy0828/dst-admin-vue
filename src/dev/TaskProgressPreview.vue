<script setup>
import { computed, ref, watch } from 'vue'
import { Box, ChevronRight, Globe2, Layers, LayoutDashboard, Moon, Package, PanelLeft, Server, Sun } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import TaskProgressDock from '@/components/layout/TaskProgressDock.vue'
import { taskProgress } from '@/lib/taskProgress.mjs'

const scenario = ref('world-start')
const minimized = ref(false)
const expanded = ref(false)
const closed = ref(false)
const selectedTask = ref('preview-mod-update')
const collapsedSidebar = ref(false)
const dark = ref(false)
const currentLargeItem = ref(8)
const restartStep = ref(0)
const restartScenarios = new Set(['restart', 'success', 'failed', 'unconfirmed', 'restart-disconnected', 'restart-legacy'])
watch(dark, value => document.documentElement.classList.toggle('dark', value))
watch(scenario, () => { expanded.value = false; closed.value = false; selectedTask.value = 'preview-mod-update'; currentLargeItem.value = 8; restartStep.value = 0 })
const startedAt = new Date(Date.now() - 28_000).toISOString()
const modMetadata = {
  '1392778117': { name: '[DST] Legion-棱镜', previewUrl: 'https://images.steamusercontent.com/ugc/1021698814063197415/5348EF5526A2526D1A59E45AFA3A3C6299ABD826/' },
  '3750536829': { name: '冰冰羊的模组运行库', previewUrl: 'https://images.steamusercontent.com/ugc/9407260850432358291/3DF7C86B84AC97A42DF22FDA35CC77FF7801680A/' },
  '2823458540': { name: '富贵险中求', previewUrl: 'https://images.steamusercontent.com/ugc/1879704721801788462/C13EE1A0D80F47E17804B0501384E830C59AF154/' },
  '2189004162': { name: 'Insight', previewUrl: 'https://images.steamusercontent.com/ugc/1479948484468384018/FD83481D00C2D0CDB02F6D53D6A957A976CE95ED/' },
  '3609964985': { name: '[DST] 丰耘秘境 Harvest Mysterious Realm' },
  '378160973': { name: 'Global Positions' },
  '3759757365': { name: '简易血条（重构版）' },
  '3756859423': { name: '显示攻击范围 [Display Attack Range]' },
  '3687959533': { name: '保鲜永鲜不腐烂' },
  '2941527805': { name: 'Chinese++ Pro' },
  '1595631294': { name: 'Smart Minisign' },
  '3783735406': { name: 'Info Card' }
}
const itemOrder = ['1392778117', '3750536829', '2823458540', '2189004162']
const largeItemOrder = [...itemOrder, ...Object.keys(modMetadata).filter(id => !itemOrder.includes(id))]
function demoItems(count = 4) {
  return itemOrder.slice(0, count).map((workshopId, index) => ({
    workshopId, targetId: 'agent:debian12', installationId: 'native',
    status: restartScenarios.has(scenario.value) ? 'succeeded' : scenario.value === 'connecting' ? 'queued' : index === 0 ? 'succeeded' : index === 1 ? scenario.value === 'download-failed' ? 'failed' : 'downloading' : 'queued',
    currentBytes: index === 0 ? 18_000_000 : index === 1 ? 6_500_000 : 0,
    totalBytes: index === 0 ? 18_000_000 : index === 1 ? 10_000_000 : 0,
    bytesPerSecond: index === 1 && !restartScenarios.has(scenario.value) && scenario.value !== 'download-failed' ? 2_300_000 : 0,
    message: index === 1 && scenario.value === 'download-failed' ? 'SteamCMD I/O Operation Failed' : ''
  }))
}
const primaryJob = computed(() => {
  const base = { id: 'preview-mod-update', kind: 'mod.update.activate', roomId: 'YWxs', createdAt: startedAt, startedAt, status: 'running', progress: 42, targets: [], progressDetail: { stage: 'mod.cache', workshopId: '3750536829', currentItem: 2, totalItems: 4, items: demoItems() } }
  if (scenario.value.startsWith('world-')) {
    const restarting = scenario.value === 'world-restart'
    const batch = scenario.value === 'world-batch'
    const single = scenario.value === 'world-single'
    const stage = [{ stage: 'loading_mods', percent: 55 }, { stage: 'loading_world', percent: 80 }, { stage: 'ready', percent: 100 }][restartStep.value]
    let worlds = [
      { worldId: 'master', name: 'Master', isMaster: true, stage: restarting || restartStep.value > 0 ? 'ready' : 'loading_world', percent: restarting || restartStep.value > 0 ? 100 : 80 },
      { worldId: 'caves', name: 'Caves', ...stage }
    ]
    if (single) worlds = worlds.slice(1)
    if (batch) worlds = [
      ...worlds.map(world => ({ ...world, worldId: `a:${world.worldId}`, name: `666777 / ${world.name}` })),
      ...worlds.map(world => ({ ...world, worldId: `b:${world.worldId}`, name: `测试房间 / ${world.name}`, stage: 'queued', percent: 0 }))
    ]
    return { ...base, id: `preview-${scenario.value}`, kind: `${batch ? 'rooms' : 'room'}.${restarting ? 'restart' : 'start'}`, roomId: batch ? '' : 'YWxs', worldId: single ? 'caves' : '',
      status: restartStep.value === 2 && !batch ? 'succeeded' : 'running',
      progressDetail: { stage: restarting ? 'world.restart' : 'world.start', worlds }, message: '正在等待游戏日志确认世界就绪' }
  }
  if (['large', 'large-failed'].includes(scenario.value)) return {
    ...base, id: `preview-${scenario.value}`, kind: 'mod.installation.update-all', status: scenario.value === 'large-failed' ? 'failed' : 'running',
    progressDetail: { stage: 'mod.cache', totalItems: 12, items: largeItemOrder.map((workshopId, index) => ({
      workshopId, targetId: 'agent:debian12', installationId: 'native',
      status: index < currentLargeItem.value ? 'succeeded' : index === currentLargeItem.value ? scenario.value === 'large-failed' ? 'failed' : 'downloading' : 'queued',
      currentBytes: index < currentLargeItem.value ? 10_000_000 : index === currentLargeItem.value ? 6_500_000 : 0,
      totalBytes: index <= currentLargeItem.value ? 10_000_000 : 0,
      bytesPerSecond: index === currentLargeItem.value && scenario.value === 'large' ? 2_300_000 : 0,
      message: index === currentLargeItem.value && scenario.value === 'large-failed' ? 'SteamCMD I/O Operation Failed' : ''
    })) }
  }
  if (scenario.value === 'split') return { ...base, id: 'preview-split', progressDetail: { ...base.progressDetail, items: [
    ...demoItems(), ...demoItems().map(item => ({ ...item, targetId: 'local', installationId: 'default', status: item.workshopId === '3750536829' ? 'succeeded' : item.status, currentBytes: item.workshopId === '3750536829' ? 10_000_000 : item.currentBytes }))
  ] } }
  if (scenario.value === 'unknown-size') return { ...base, progressDetail: { ...base.progressDetail, items: demoItems().map(item => item.status === 'downloading' ? { ...item, totalBytes: 0 } : item) } }
  if (restartScenarios.has(scenario.value)) {
    const terminal = ['success', 'failed', 'unconfirmed'].includes(scenario.value)
    const caves = scenario.value === 'success' ? { stage: 'ready', percent: 100 }
      : scenario.value === 'failed' ? { stage: 'failed', percent: 80, message: '服务器进程退出，请查看 Caves 世界日志。' }
        : scenario.value === 'unconfirmed' ? { stage: 'unconfirmed', percent: 80, message: '进程已启动，尚未确认世界就绪；可查看世界状态和日志。' }
          : [{ stage: 'loading_world', percent: 80 }, { stage: 'connecting', percent: 95 }, { stage: 'ready', percent: 100 }][restartStep.value]
    return { ...base, id: `preview-${scenario.value}`, progress: terminal ? 100 : 90,
      status: scenario.value === 'failed' ? 'failed' : terminal ? 'succeeded' : 'running',
      finishedAt: terminal ? new Date(Date.parse(startedAt) + 143_000).toISOString() : undefined,
      message: '世界重启进度：已就绪 1/2 个世界',
      error: scenario.value === 'failed' ? { message: 'Caves 启动失败：服务器进程退出。Master 已正常启动。' } : null,
      progressDetail: { ...base.progressDetail, stage: 'world.restart', worlds: scenario.value === 'restart-legacy' ? [] : [
        { worldId: 'caves', name: 'Caves', ...caves },
        { worldId: 'master', name: 'Master', isMaster: true, stage: 'ready', percent: 100 }
      ] }
    }
  }
  if (scenario.value === 'connecting') return { ...base, progress: 10, message: '正在连接 Steam Workshop' }
  if (scenario.value === 'download-failed') return { ...base, status: 'failed', finishedAt: new Date().toISOString(), error: { message: 'agent:compat-native-agent-42/native: Workshop 3750536829 下载失败：SteamCMD I/O Operation Failed' } }
  if (['batch', 'multiple'].includes(scenario.value)) return { ...base, kind: 'mod.installation.update-all', roomId: '', message: '模组 2/3 · Workshop 3750536829 · 正在下载文件', progressDetail: { stage: 'mod.cache', workshopId: '3750536829', currentItem: 2, totalItems: 3, targetId: 'agent:debian12', installationId: 'native', items: demoItems(3) }, transfer: { currentBytes: 6500000, totalBytes: 10000000, bytesPerSecond: 2300000 } }
  return { ...base, message: '正在下载：冰冰羊的模组运行库', transfer: { currentBytes: 6_500_000, totalBytes: 10_000_000, bytesPerSecond: 2_300_000 } }
})
const demoTasks = computed(() => [primaryJob.value, ...(scenario.value === 'multiple' ? [
  { ...primaryJob.value, id: 'preview-local-download', kind: 'mod.installation.download', message: '正在连接 Steam Workshop', progress: 10, transfer: null, progressDetail: null },
  { ...primaryJob.value, id: 'preview-failed-download', kind: 'mod.installation.update', status: 'failed', message: 'SteamCMD I/O Operation Failed', error: { message: 'Insight 下载失败：SteamCMD I/O Operation Failed' } }
] : [])])
const job = computed(() => demoTasks.value.find(item => item.id === selectedTask.value) || primaryJob.value)
const taskOptions = computed(() => demoTasks.value.map((item, index) => ({ id: item.id, label: ['批量更新 · debian12', '下载 Global Positions · 本机', '更新 Insight · debian12'][index], status: taskProgress(item).status })))
const mods = ['冰冰羊的模组运行库', '富贵险中求', '[DST] Legion-棱镜', '[DST] 丰耘秘境', 'Insight', 'Global Positions', '简易血条', '显示攻击范围', '保鲜永鲜不腐烂', 'Chinese++ Pro', 'Smart Minisign', 'Info Card']
</script>

<template>
  <div class="preview-shell">
    <aside class="preview-sidebar" :data-collapsed="collapsedSidebar || undefined">
      <div class="preview-brand"><Box class="size-6" /><strong v-if="!collapsedSidebar">DST Admin</strong></div>
      <div class="preview-nav-item is-selected"><LayoutDashboard class="size-4" /><span v-if="!collapsedSidebar">服务总览</span></div>
      <div class="preview-nav-item"><Globe2 class="size-4" /><span v-if="!collapsedSidebar">房间管理</span></div>
      <div class="preview-nav-item"><Package class="size-4" /><span v-if="!collapsedSidebar">模组管理</span></div>
      <div class="preview-nav-item"><Server class="size-4" /><span v-if="!collapsedSidebar">运行机器</span></div>
      <div class="preview-nav-item"><Layers class="size-4" /><span v-if="!collapsedSidebar">存档备份</span></div>
    </aside>
    <div class="preview-main">
      <header class="preview-header">
        <Button variant="ghost" size="icon-sm" aria-label="切换侧栏" @click="collapsedSidebar = !collapsedSidebar"><PanelLeft /></Button>
        <span class="hidden sm:inline">服务总览</span>
        <div class="ml-auto flex items-center gap-3">
          <Badge variant="outline">debian12</Badge>
          <Button variant="ghost" size="sm" @click="minimized = false; closed = false">任务 · {{ demoTasks.length }}</Button>
          <Button variant="ghost" size="icon-sm" aria-label="切换主题" @click="dark = !dark"><Sun v-if="dark" /><Moon v-else /></Button>
        </div>
      </header>
      <main class="preview-scroll">
        <div class="preview-content">
          <div class="preview-intro">
            <Badge variant="outline">交互预览</Badge>
            <h1>任务进度 · 悬浮卡片</h1>
            <p>右下角查看每个世界和模组的进度，点击减号收成圆圈，再点击圆圈展开。此页面使用演示数据，不会下载模组或重启世界。</p>
            <ToggleGroup v-model="scenario" type="single" variant="outline" class="flex-wrap justify-start">
              <ToggleGroupItem value="download">下载中</ToggleGroupItem>
              <ToggleGroupItem value="world-start">普通启动</ToggleGroupItem>
              <ToggleGroupItem value="world-single">单世界启动</ToggleGroupItem>
              <ToggleGroupItem value="world-restart">普通重启</ToggleGroupItem>
              <ToggleGroupItem value="world-batch">批量启动房间</ToggleGroupItem>
              <ToggleGroupItem value="connecting">连接 Steam</ToggleGroupItem>
              <ToggleGroupItem value="restart">重启中</ToggleGroupItem>
              <ToggleGroupItem value="restart-disconnected">重启连接中断</ToggleGroupItem>
              <ToggleGroupItem value="unconfirmed">启动待确认</ToggleGroupItem>
              <ToggleGroupItem value="restart-legacy">旧版重启任务</ToggleGroupItem>
              <ToggleGroupItem value="failed">部分失败</ToggleGroupItem>
              <ToggleGroupItem value="download-failed">模组下载失败</ToggleGroupItem>
              <ToggleGroupItem value="success">已完成</ToggleGroupItem>
              <ToggleGroupItem value="disconnected">连接中断</ToggleGroupItem>
              <ToggleGroupItem value="batch">批量 3 个模组</ToggleGroupItem>
              <ToggleGroupItem value="multiple">多个任务</ToggleGroupItem>
              <ToggleGroupItem value="large">12 个模组</ToggleGroupItem>
              <ToggleGroupItem value="large-failed">长列表失败</ToggleGroupItem>
              <ToggleGroupItem value="split">两台机器</ToggleGroupItem>
              <ToggleGroupItem value="unknown-size">未知文件大小</ToggleGroupItem>
            </ToggleGroup>
            <Button v-if="scenario === 'large'" variant="outline" size="sm" :disabled="currentLargeItem >= 11" @click="currentLargeItem++">模拟当前模组下载完成</Button>
            <Button v-if="scenario === 'restart' || scenario.startsWith('world-')" variant="outline" size="sm" :disabled="restartStep >= 2" @click="restartStep++">模拟下一条启动日志</Button>
          </div>
          <div class="preview-room-heading"><div><h2>666777</h2><p>生存 · 2 个世界 · debian12</p></div><Badge variant="success">运行中</Badge></div>
          <div class="preview-worlds">
            <Card v-for="world in ['Master', 'Caves']" :key="world" size="sm">
              <CardHeader><CardTitle>{{ world }}</CardTitle><CardDescription>{{ world === 'Master' ? '森林世界 · 主分片' : '洞穴世界 · 从分片' }}</CardDescription></CardHeader>
              <CardContent class="flex items-center justify-between"><span class="text-sm text-muted-foreground">0 人在线</span><Badge variant="success">运行中</Badge></CardContent>
            </Card>
          </div>
          <Card size="sm">
            <CardHeader><CardTitle>模组 <Badge variant="outline">12 个</Badge></CardTitle><CardDescription>模组更新任务正在后台执行，你可以继续浏览页面。</CardDescription></CardHeader>
            <CardContent>
              <div v-for="(mod, index) in mods" :key="mod" class="preview-mod-row">
                <div class="preview-mod-icon"><Package class="size-5" /></div>
                <div class="min-w-0 flex-1"><strong class="block truncate text-sm">{{ mod }}</strong><span class="text-xs text-muted-foreground">{{ index < 2 ? '有可用更新' : '2/2 个世界启用' }}</span></div>
                <Badge :variant="index < 2 ? 'warning' : 'success'">{{ index < 2 ? '更新中' : '已启用' }}</Badge>
                <ChevronRight class="size-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <p class="preview-end">已到列表底部 · 最后一项仍完整可见</p>
        </div>
      </main>
      <TaskProgressDock v-if="!closed" v-model:minimized="minimized" v-model:expanded="expanded" :job="job" :task-options="taskOptions" :mod-metadata="modMetadata" :target-labels="{ 'agent:debian12': 'debian12', local: '本机' }" room-name="666777" :target-names="[selectedTask === 'preview-local-download' ? '本机' : 'debian12']" :connected="!['disconnected', 'restart-disconnected'].includes(scenario)" @select="selectedTask = $event" @close="closed = true" />
    </div>
  </div>
</template>

<style scoped>
.preview-shell { display: flex; height: 100svh; overflow: hidden; background: var(--background); }
.preview-sidebar { width: 224px; flex-shrink: 0; padding: 20px 12px; border-right: 1px solid var(--border); background: var(--sidebar); }
.preview-sidebar[data-collapsed] { width: 64px; }
.preview-brand { display: flex; align-items: center; gap: 10px; padding: 2px 10px 32px; }
.preview-nav-item { display: flex; align-items: center; gap: 10px; padding: 11px 12px; margin-bottom: 4px; font-size: 13px; color: var(--muted-foreground); border-radius: var(--radius); }
.preview-nav-item.is-selected { color: var(--foreground); background: var(--accent); font-weight: 600; }
.preview-main { display: flex; flex: 1; flex-direction: column; min-width: 0; }
.preview-header { height: 64px; flex-shrink: 0; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--border); padding: 0 24px; font-size: 13px; }
.preview-scroll { min-height: 0; flex: 1; overflow: auto; background: var(--muted); }
.preview-content { max-width: 1200px; margin: auto; padding: 28px 32px; display: flex; flex-direction: column; gap: 24px; }
.preview-intro { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; padding-bottom: 8px; }
.preview-intro h1 { font-size: 24px; font-weight: 650; letter-spacing: -.6px; }
.preview-intro p, .preview-room-heading p { font-size: 13px; line-height: 1.7; color: var(--muted-foreground); }
.preview-room-heading { display: flex; justify-content: space-between; align-items: center; }
.preview-room-heading h2 { font-size: 20px; font-weight: 650; }
.preview-worlds { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.preview-mod-row { display: flex; align-items: center; gap: 12px; min-height: 68px; border-top: 1px solid var(--border); }
.preview-mod-icon { width: 38px; height: 38px; display: grid; place-items: center; background: var(--muted); border-radius: var(--radius); color: var(--muted-foreground); }
.preview-end { font-size: 12px; text-align: center; color: var(--muted-foreground); }
@media (max-width: 767px) {
  .preview-sidebar { display: none; }
  .preview-content { padding: 20px 16px; gap: 18px; }
  .preview-header { padding-inline: 12px; }
  .preview-intro h1 { font-size: 20px; }
  .preview-worlds { gap: 10px; }
}
</style>
