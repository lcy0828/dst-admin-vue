<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Activity,
  Box,
  Cable,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Cpu,
  Globe2,
  Languages,
  Moon,
  Network,
  PanelLeft,
  Play,
  RefreshCw,
  RotateCw,
  Server,
  Settings2,
  SlidersHorizontal,
  Square,
  Sun,
  TimerReset,
  UsersRound
} from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Field, FieldLabel } from '@/components/ui/field'
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { evaluateFleetDisclosure } from '@/lib/fleetDisclosure.mjs'
import { navigationForFeatures } from '@/v2/navigation.js'

const { t, locale } = useI18n()

const scenario = ref('s1')
const roomRunning = ref('running')
const collapsedSidebar = ref(false)
const dark = ref(false)
const activeBottomTab = ref('console')
const systemRefreshInterval = ref('15000')
const roomRefreshInterval = ref('5000')
const selectedScopeTarget = ref('agent:tokyo')
const worldExpanded = ref({ master: false, caves: false })

watch(dark, value => {
  document.documentElement.classList.toggle('dark', value)
})

const scenarioFixtures = computed(() => ({
  s1: {
    targets: [
      { id: 'local', name: t('shellPreview.mock.localHost'), kind: 'local', configured: true, online: true, status: 'ready' }
    ],
    capabilities: { deployment: { role: 'all_in_one', localExecutorEnabled: true }, features: {} },
    scopeTargetId: 'local',
    scopeLabel: t('shellPreview.mock.localHost'),
    resourceText: t('shellPreview.mock.cpuMem2c4g'),
    showScopeNotice: false,
    placementSummary: t('shellPreview.mock.localHost'),
    placementLocations: [
      { id: 'local', label: t('shellPreview.mock.localHost'), install: t('shellPreview.mock.defaultInstall') }
    ],
    worlds: [
      { id: 'master', name: 'Master', role: t('shellPreview.mock.masterRole'), machine: t('shellPreview.mock.localHost'), install: t('shellPreview.mock.defaultInstall') },
      { id: 'caves', name: 'Caves', role: t('shellPreview.mock.cavesRole'), machine: t('shellPreview.mock.localHost'), install: t('shellPreview.mock.defaultInstall') }
    ]
  },
  s2: {
    targets: [
      { id: 'local', name: t('shellPreview.mock.localHost'), kind: 'local', configured: true, online: true, status: 'ready' },
      { id: 'agent:aio-hk', name: t('shellPreview.mock.workerHost'), kind: 'agent', agentId: 'aio-hk', configured: true, online: true, status: 'ready' }
    ],
    capabilities: { deployment: { role: 'controller', localExecutorEnabled: true }, features: {} },
    scopeTargetId: 'all',
    scopeLabel: t('app.remote.allTargets'),
    resourceText: t('shellPreview.mock.cpuMemAll'),
    showScopeNotice: false,
    placementSummary: t('shellPreview.mock.workerHost'),
    placementLocations: [
      { id: 'local', label: t('shellPreview.mock.localHost'), install: t('shellPreview.mock.defaultInstall') },
      { id: 'agent:aio-hk', label: t('shellPreview.mock.workerHost'), install: t('shellPreview.mock.defaultInstall') }
    ],
    worlds: [
      { id: 'master', name: 'Master', role: t('shellPreview.mock.masterRole'), machine: t('shellPreview.mock.workerHost'), install: t('shellPreview.mock.defaultInstall') },
      { id: 'caves', name: 'Caves', role: t('shellPreview.mock.cavesRole'), machine: t('shellPreview.mock.workerHost'), install: t('shellPreview.mock.defaultInstall') }
    ]
  },
  s3: {
    targets: [
      { id: 'local', name: t('shellPreview.mock.localHost'), kind: 'local', configured: true, online: true, status: 'ready' },
      { id: 'agent:tokyo', name: t('shellPreview.mock.agentHost'), kind: 'agent', agentId: 'tokyo', configured: true, online: true, status: 'ready' }
    ],
    capabilities: { deployment: { role: 'controller', localExecutorEnabled: true }, features: {} },
    scopeTargetId: 'agent:tokyo',
    scopeLabel: t('shellPreview.mock.agentHost'),
    resourceText: t('shellPreview.mock.cpuMemAgent'),
    showScopeNotice: true,
    placementSummary: t('shellPreview.mock.agentHost'),
    placementLocations: [
      { id: 'agent:tokyo', label: t('shellPreview.mock.agentHost'), install: t('shellPreview.mock.nativeInstall') }
    ],
    worlds: [
      { id: 'master', name: 'Master', role: t('shellPreview.mock.masterRole'), machine: t('shellPreview.mock.agentHost'), install: t('shellPreview.mock.nativeInstall') },
      { id: 'caves', name: 'Caves', role: t('shellPreview.mock.cavesRole'), machine: t('shellPreview.mock.agentHost'), install: t('shellPreview.mock.nativeInstall') }
    ]
  },
  s4: {
    targets: [
      { id: 'local', name: t('shellPreview.mock.localHost'), kind: 'local', configured: true, online: true, status: 'ready' },
      { id: 'agent:worker-2', name: t('shellPreview.mock.worker2Host'), kind: 'agent', agentId: 'worker-2', configured: true, online: true, status: 'ready' }
    ],
    capabilities: { deployment: { role: 'controller', localExecutorEnabled: true }, features: {} },
    scopeTargetId: 'all',
    scopeLabel: t('app.remote.allTargets'),
    resourceText: t('shellPreview.mock.cpuMemAll'),
    showScopeNotice: true,
    placementSummary: t('topology.roomPlacement.summary.distributed', { count: 2 }),
    placementLocations: [
      { id: 'local', label: t('shellPreview.mock.localHost'), install: t('shellPreview.mock.defaultInstall') },
      { id: 'agent:worker-2', label: t('shellPreview.mock.worker2Host'), install: t('shellPreview.mock.nativeInstall') }
    ],
    worlds: [
      { id: 'master', name: 'Master', role: t('shellPreview.mock.masterRole'), machine: t('shellPreview.mock.localHost'), install: t('shellPreview.mock.defaultInstall') },
      { id: 'caves', name: 'Caves', role: t('shellPreview.mock.cavesRole'), machine: t('shellPreview.mock.worker2Host'), install: t('shellPreview.mock.nativeInstall') }
    ]
  }
}))

const currentFixture = computed(() => scenarioFixtures.value[scenario.value] || scenarioFixtures.value.s1)

const disclosure = computed(() => evaluateFleetDisclosure({
  targets: currentFixture.value.targets,
  targetsLoaded: true,
  capabilities: currentFixture.value.capabilities,
  route: { path: '/servers/list', query: {} },
  storedMode: 'single'
}))

const fleetMode = computed(() => disclosure.value.showFleetControls)
const navigationSections = computed(() => navigationForFeatures({}, { fleetMode: fleetMode.value }))
const compactSingleHost = computed(() => !fleetMode.value && scenario.value === 's1')
const isRunning = computed(() => roomRunning.value === 'running')

function toggleLocale() {
  locale.value = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN'
}

function toggleWorldDetail(worldId, next) {
  worldExpanded.value = {
    ...worldExpanded.value,
    [worldId]: next
  }
}
</script>

<template>
  <TooltipProvider>
    <div class="bg-background text-foreground flex h-svh overflow-hidden">
      <aside
        class="bg-sidebar border-sidebar-border flex shrink-0 flex-col border-r transition-[width] duration-200"
        :class="collapsedSidebar ? 'w-16 px-2 py-4' : 'w-60 px-3 py-4'"
      >
        <div class="mb-4 flex items-center gap-2.5 px-2">
          <div class="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
            <Box class="size-4" />
          </div>
          <div v-if="!collapsedSidebar" class="min-w-0">
            <p class="truncate text-sm font-semibold">{{ t('app.defaultName') }}</p>
            <p class="text-muted-foreground truncate text-xs">{{ t('app.consoleName') }}</p>
          </div>
        </div>

        <nav class="flex-1 space-y-4 overflow-y-auto">
          <section v-for="section in navigationSections" :key="section.labelKey" class="space-y-1">
            <p v-if="!collapsedSidebar" class="text-muted-foreground px-2 text-xs font-medium">
              {{ t(section.labelKey) }}
            </p>
            <div v-for="item in section.items" :key="item.labelKey" class="space-y-0.5">
              <div
                class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                :class="item.to === '/rooms/list' ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground'"
              >
                <component :is="item.icon" class="size-4 shrink-0" />
                <span v-if="!collapsedSidebar" class="min-w-0 flex-1 truncate">{{ t(item.labelKey) }}</span>
                <ChevronRight
                  v-if="!collapsedSidebar && item.children"
                  class="size-3.5 shrink-0 opacity-60"
                  :class="item.labelKey === 'navigation.agents' ? 'rotate-90 text-primary opacity-100' : ''"
                />
              </div>
              <div
                v-if="!collapsedSidebar && item.children && (item.labelKey === 'navigation.agents' || item.labelKey === 'navigation.fleetDeployment')"
                class="ml-5 space-y-0.5 border-l pl-2.5"
              >
                <div
                  v-for="child in item.children"
                  :key="child.to"
                  class="text-muted-foreground truncate py-1 text-xs"
                >
                  {{ t(child.labelKey) }}
                </div>
              </div>
            </div>
          </section>
        </nav>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <header class="bg-background/95 flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            :aria-label="t('shellPreview.toggleSidebar')"
            @click="collapsedSidebar = !collapsedSidebar"
          >
            <PanelLeft />
          </Button>

          <div class="hidden items-center gap-1.5 text-sm md:flex">
            <span class="text-muted-foreground">{{ t('navigation.dashboard') }}</span>
            <ChevronRight class="text-muted-foreground size-3.5" />
            <span class="font-medium">{{ t('navigation.serverWorkspace') }}</span>
          </div>

          <div class="flex min-w-0 items-center gap-2">
            <Button type="button" variant="outline" size="sm" class="max-w-52 justify-between gap-2">
              <span class="truncate">{{ t('shellPreview.mock.roomName') }}</span>
              <ChevronDown class="size-3.5 shrink-0 opacity-60" />
            </Button>

            <Popover v-if="fleetMode">
              <PopoverTrigger as-child>
                <Button type="button" variant="outline" size="sm" class="max-w-52 justify-between gap-2">
                  <Server v-if="currentFixture.scopeTargetId !== 'all'" class="size-3.5 shrink-0" />
                  <Network v-else class="size-3.5 shrink-0" />
                  <span class="truncate">{{ currentFixture.scopeLabel }}</span>
                  <Badge v-if="currentFixture.scopeTargetId !== 'all'" variant="success">{{ t('app.remote.states.online') }}</Badge>
                  <ChevronDown class="size-3.5 shrink-0 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" class="w-72 p-3">
                <PopoverHeader>
                  <PopoverTitle>{{ t('app.remote.scopeTitle') }}</PopoverTitle>
                  <PopoverDescription>{{ t('app.remote.scopeDescription') }}</PopoverDescription>
                </PopoverHeader>
                <div class="mt-3 flex flex-col gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    :variant="selectedScopeTarget === 'all' ? 'secondary' : 'ghost'"
                    class="justify-start"
                    @click="selectedScopeTarget = 'all'"
                  >
                    <Network data-icon="inline-start" />
                    {{ t('app.remote.allTargets') }}
                  </Button>
                  <Button
                    v-for="target in currentFixture.targets"
                    :key="target.id"
                    type="button"
                    size="sm"
                    :variant="selectedScopeTarget === target.id ? 'secondary' : 'ghost'"
                    class="justify-between"
                    @click="selectedScopeTarget = target.id"
                  >
                    <span class="truncate">{{ target.name }}</span>
                    <Badge variant="success">{{ t('app.remote.states.online') }}</Badge>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div class="ml-auto flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" class="hidden gap-1.5 sm:inline-flex">
              <Cpu class="size-3.5 text-muted-foreground" />
              {{ currentFixture.resourceText }}
            </Badge>
            <Badge variant="secondary" class="hidden xl:inline-flex">
              {{ t('shellPreview.mock.gameVersion') }}
            </Badge>

            <Popover>
              <PopoverTrigger as-child>
                <Button type="button" variant="ghost" size="icon-sm" :aria-label="t('dashboard.resources.refreshSettings.title')">
                  <TimerReset />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" class="w-72">
                <PopoverHeader>
                  <PopoverTitle>{{ t('dashboard.resources.refreshSettings.title') }}</PopoverTitle>
                  <PopoverDescription>{{ t('dashboard.resources.refreshSettings.description') }}</PopoverDescription>
                </PopoverHeader>
                <div class="mt-3 flex flex-col gap-3">
                  <Field>
                    <FieldLabel for="preview-refresh-system">
                      <Activity class="size-3.5 text-muted-foreground" />
                      {{ t('dashboard.resources.refreshSettings.systemLabel') }}
                    </FieldLabel>
                    <Select v-model="systemRefreshInterval">
                      <SelectTrigger id="preview-refresh-system" class="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="5000">5s</SelectItem>
                          <SelectItem value="15000">15s</SelectItem>
                          <SelectItem value="30000">30s</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel for="preview-refresh-room">
                      <TimerReset class="size-3.5 text-muted-foreground" />
                      {{ t('dashboard.resources.refreshSettings.roomLabel') }}
                    </FieldLabel>
                    <Select v-model="roomRefreshInterval">
                      <SelectTrigger id="preview-refresh-room" class="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="5000">5s</SelectItem>
                          <SelectItem value="10000">10s</SelectItem>
                          <SelectItem value="30000">30s</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </PopoverContent>
            </Popover>

            <Button type="button" variant="ghost" size="sm" @click="toggleLocale">
              <Languages data-icon="inline-start" />
              {{ t('shellPreview.toggleLocale') }}
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" :aria-label="t('shellPreview.toggleTheme')" @click="dark = !dark">
              <Sun v-if="dark" />
              <Moon v-else />
            </Button>
          </div>
        </header>

        <div v-if="fleetMode && currentFixture.showScopeNotice" class="bg-muted/20 border-b px-4">
          <div class="mx-auto flex h-9 max-w-[1440px] items-center gap-2 text-xs text-muted-foreground">
            <Network class="size-3.5 shrink-0" />
            <span class="min-w-0 flex-1 truncate">
              {{ currentFixture.scopeTargetId === 'all' ? t('app.remote.roomScopeAll') : t('app.remote.roomScopeTarget', { name: currentFixture.scopeLabel }) }}
            </span>
          </div>
        </div>

        <main class="bg-muted/30 min-h-0 flex-1 overflow-auto p-4 md:p-6">
          <div class="mx-auto flex max-w-[1440px] flex-col gap-5">
            <Card size="sm">
              <CardHeader>
                <div class="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{{ t('shellPreview.badge') }}</Badge>
                  <CardTitle class="text-lg">{{ t('shellPreview.title') }}</CardTitle>
                </div>
                <CardDescription>{{ t('shellPreview.subtitle') }}</CardDescription>
              </CardHeader>
              <CardContent class="flex flex-col gap-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <ToggleGroup v-model="scenario" type="single" variant="outline" class="flex-wrap justify-start">
                    <ToggleGroupItem value="s1">{{ t('shellPreview.scenarios.s1') }}</ToggleGroupItem>
                    <ToggleGroupItem value="s2">{{ t('shellPreview.scenarios.s2') }}</ToggleGroupItem>
                    <ToggleGroupItem value="s3">{{ t('shellPreview.scenarios.s3') }}</ToggleGroupItem>
                    <ToggleGroupItem value="s4">{{ t('shellPreview.scenarios.s4') }}</ToggleGroupItem>
                  </ToggleGroup>

                  <div class="flex items-center gap-2">
                    <span class="text-muted-foreground text-xs">{{ t('shellPreview.roomStateLabel') }}</span>
                    <ToggleGroup v-model="roomRunning" type="single" variant="outline" size="sm">
                      <ToggleGroupItem value="running">{{ t('shellPreview.roomRunning') }}</ToggleGroupItem>
                      <ToggleGroupItem value="stopped">{{ t('shellPreview.roomStopped') }}</ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </div>

                <p class="text-muted-foreground text-sm">{{ t(`shellPreview.scenarioMeta.${scenario}`) }}</p>

                <div class="bg-muted/40 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-xs">
                  <Badge :variant="fleetMode ? 'default' : 'secondary'">
                    {{ fleetMode ? t('shellPreview.disclosureSummary.fleet') : t('shellPreview.disclosureSummary.single') }}
                  </Badge>
                  <span>{{ t('shellPreview.disclosureSummary.targets', { count: currentFixture.targets.length }) }}</span>
                  <Separator orientation="vertical" class="h-3.5" />
                  <span>{{ fleetMode ? t('shellPreview.disclosureSummary.shownScope') : t('shellPreview.disclosureSummary.hiddenScope') }}</span>
                  <Separator orientation="vertical" class="h-3.5" />
                  <span>{{ fleetMode ? t('shellPreview.disclosureSummary.sidebarExpanded') : t('shellPreview.disclosureSummary.sidebarCompact') }}</span>
                </div>
              </CardContent>
            </Card>

            <div
              v-if="compactSingleHost"
              class="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-sm"
            >
              <div class="flex min-w-0 flex-wrap items-center gap-2">
                <Network class="size-4 shrink-0 text-muted-foreground" />
                <span class="font-medium">{{ t('topology.roomPlacement.title') }}</span>
                <span class="text-muted-foreground truncate">{{ currentFixture.placementSummary }}</span>
                <Badge variant="success">{{ t('topology.roomPlacement.summary.ready') }}</Badge>
              </div>
              <Button type="button" size="sm" variant="ghost">
                <Settings2 data-icon="inline-start" />
                {{ t('topology.roomPlacement.actions.viewOrAdjust') }}
              </Button>
            </div>

            <Card v-else size="sm">
              <CardHeader>
                <CardTitle class="flex items-center gap-2"><Network class="size-4" />{{ t('topology.roomPlacement.title') }}</CardTitle>
                <CardDescription>{{ t('topology.roomPlacement.description') }}</CardDescription>
                <CardAction class="flex items-center gap-1.5">
                  <Button type="button" size="icon-sm" variant="ghost" :aria-label="t('common.actions.refresh')"><RefreshCw /></Button>
                  <Button type="button" size="sm" variant="outline">
                    <Settings2 data-icon="inline-start" />
                    {{ t('topology.roomPlacement.actions.change') }}
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent class="flex flex-col gap-3">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-medium">{{ currentFixture.placementSummary }}</span>
                    <Badge variant="success">{{ t('topology.roomPlacement.summary.ready') }}</Badge>
                  </div>
                  <div class="flex flex-wrap gap-1.5">
                    <Badge v-for="loc in currentFixture.placementLocations" :key="loc.id" variant="outline">
                      {{ loc.label }} · {{ loc.install }}
                    </Badge>
                  </div>
                </div>
                <div v-if="scenario === 's4'" class="bg-muted/30 flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs">
                  <span class="flex items-center gap-1.5 font-medium">
                    <CircleCheck class="size-3.5 text-emerald-600" />
                    {{ t('shellPreview.mock.shardLinkLabel') }}
                  </span>
                  <span class="text-muted-foreground">{{ t('shellPreview.mock.shardLinkRoute') }}</span>
                </div>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <div class="flex flex-wrap items-center gap-2">
                  <CardTitle>{{ t('servers.workspace.worlds.title') }}</CardTitle>
                  <Badge :variant="isRunning ? 'success' : 'secondary'">
                    {{ isRunning ? t('shellPreview.roomRunning') : t('shellPreview.roomStopped') }}
                  </Badge>
                  <span class="text-muted-foreground text-xs">{{ t('shellPreview.mock.roomMeta') }}</span>
                </div>
                <CardAction class="flex flex-wrap items-center gap-2">
                  <Button v-if="!isRunning" type="button" size="sm">
                    <Play data-icon="inline-start" />
                    {{ t('servers.workspace.worlds.startAll') }}
                  </Button>
                  <template v-else>
                    <Button type="button" size="sm" variant="outline">
                      <RotateCw data-icon="inline-start" />
                      {{ t('servers.workspace.worlds.restartAll') }}
                    </Button>
                    <Button type="button" size="sm" variant="destructive">
                      <Square data-icon="inline-start" />
                      {{ t('servers.workspace.worlds.stopAll') }}
                    </Button>
                  </template>
                  <Button type="button" size="sm" variant="outline">
                    <Cable data-icon="inline-start" />
                    {{ t('servers.workspace.worlds.connection.trigger') }}
                    <span class="text-muted-foreground hidden sm:inline">{{ t('shellPreview.mock.connectionValue') }}</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button type="button" size="sm" variant="outline">
                        {{ t('rooms.list.more') }}
                        <ChevronDown data-icon="inline-end" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuItem>{{ t('runtimeMode.chooseStart') }}</DropdownMenuItem>
                        <DropdownMenuItem>{{ t('servers.workspace.worlds.roomSettings') }}</DropdownMenuItem>
                      </DropdownMenuGroup>
                      <template v-if="fleetMode">
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>{{ t('servers.workspace.worlds.placement') }}</DropdownMenuItem>
                      </template>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardAction>
              </CardHeader>
              <CardContent class="grid gap-3 md:grid-cols-2">
                <Collapsible
                  v-for="world in currentFixture.worlds"
                  :key="world.id"
                  :open="Boolean(worldExpanded[world.id])"
                  class="rounded-lg border p-3"
                  @update:open="next => toggleWorldDetail(world.id, next)"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex min-w-0 items-center gap-2.5">
                      <div class="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md">
                        <Globe2 class="size-4" />
                      </div>
                      <div class="min-w-0">
                        <div class="flex flex-wrap items-center gap-1.5">
                          <strong class="text-sm">{{ world.name }}</strong>
                          <Badge :variant="isRunning ? 'success' : 'secondary'">
                            {{ isRunning ? t('shellPreview.roomRunning') : t('shellPreview.roomStopped') }}
                          </Badge>
                        </div>
                        <p class="text-muted-foreground text-xs">{{ world.role }}</p>
                        <p v-if="fleetMode" class="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                          <Server class="size-3" />
                          {{ world.machine }} · {{ world.install }}
                        </p>
                      </div>
                    </div>
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <CollapsibleTrigger as-child>
                          <Button type="button" variant="ghost" size="icon-xs" :aria-label="t(worldExpanded[world.id] ? 'servers.workspace.worlds.detailsHide' : 'servers.workspace.worlds.detailsShow')">
                            <ChevronDown class="size-4 transition-transform" :class="worldExpanded[world.id] ? 'rotate-180' : ''" />
                          </Button>
                        </CollapsibleTrigger>
                      </TooltipTrigger>
                      <TooltipContent>{{ t(worldExpanded[world.id] ? 'servers.workspace.worlds.detailsHide' : 'servers.workspace.worlds.detailsShow') }}</TooltipContent>
                    </Tooltip>
                  </div>

                  <dl class="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt class="text-muted-foreground">{{ t('servers.workspace.worlds.players') }}</dt>
                      <dd class="font-medium">{{ isRunning ? t('shellPreview.mock.playersValue') : t('shellPreview.mock.playersIdle') }}</dd>
                    </div>
                    <div>
                      <dt class="text-muted-foreground">{{ t('servers.workspace.worlds.day') }}</dt>
                      <dd class="font-medium">{{ t('shellPreview.mock.dayValue') }}</dd>
                    </div>
                    <div>
                      <dt class="text-muted-foreground">{{ t('servers.workspace.worlds.season') }}</dt>
                      <dd class="font-medium">{{ t('shellPreview.mock.seasonValue') }}</dd>
                    </div>
                  </dl>

                  <CollapsibleContent class="mt-3 border-t pt-3">
                    <dl class="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      <div>
                        <dt class="text-muted-foreground">{{ t('servers.workspace.worlds.phase') }}</dt>
                        <dd class="font-medium">{{ t('shellPreview.mock.phaseValue') }}</dd>
                      </div>
                      <div>
                        <dt class="text-muted-foreground">{{ t('servers.workspace.worlds.weather') }}</dt>
                        <dd class="font-medium">{{ t('shellPreview.mock.weatherValue') }}</dd>
                      </div>
                      <div>
                        <dt class="text-muted-foreground">{{ t('servers.workspace.worlds.dataTime') }}</dt>
                        <dd class="font-medium">{{ t('shellPreview.mock.cycleValue') }}</dd>
                      </div>
                      <div>
                        <dt class="text-muted-foreground">{{ t('shellPreview.mock.freshnessLive') }}</dt>
                        <dd class="font-medium">Live</dd>
                      </div>
                    </dl>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>

            <div class="grid gap-4 lg:grid-cols-3">
              <Card size="sm" class="lg:col-span-2">
                <CardContent class="pt-3">
                  <Tabs v-model="activeBottomTab">
                    <TabsList>
                      <TabsTrigger value="console">{{ t('shellPreview.mock.bottomTabs.console') }}</TabsTrigger>
                      <TabsTrigger value="players">
                        <UsersRound class="size-3.5" />
                        {{ t('shellPreview.mock.bottomTabs.players') }}
                      </TabsTrigger>
                      <TabsTrigger value="logs">{{ t('shellPreview.mock.bottomTabs.logs') }}</TabsTrigger>
                      <TabsTrigger value="backups">{{ t('shellPreview.mock.bottomTabs.backups') }}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="console" class="pt-3 text-xs font-mono">{{ t('shellPreview.mock.consoleSample') }}</TabsContent>
                    <TabsContent value="players" class="pt-3 text-sm">{{ t('shellPreview.mock.playersSample') }}</TabsContent>
                    <TabsContent value="logs" class="pt-3 text-xs font-mono">{{ t('shellPreview.mock.logsSample') }}</TabsContent>
                    <TabsContent value="backups" class="pt-3 text-sm">{{ t('shellPreview.mock.backupsSample') }}</TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <div class="flex flex-wrap items-center gap-2">
                    <SlidersHorizontal class="size-4 text-muted-foreground" />
                    <CardTitle class="text-sm">{{ t('navigation.systemSettings') }}</CardTitle>
                    <Badge variant="outline">{{ t('systemSettings.controllerScope') }}</Badge>
                  </div>
                  <CardDescription>{{ t('shellPreview.mock.controllerCardDesc') }}</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  </TooltipProvider>
</template>
