import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { parse as parseJS } from '@babel/parser'
import { parse as parseSFC } from '@vue/compiler-sfc'
import { baseParse } from '@vue/compiler-dom'
import { createRenderer, h, nextTick, ref } from 'vue'
import { createMemoryHistory, createRouter, RouterView, useRoute } from 'vue-router'
import { preferredRoomId } from '../src/lib/pageScope.mjs'
import { applyWorldSettingsLabels, worldSettingsCatalogPath } from '../src/lib/worldSettingsLocale.mjs'
import { compareWorldRoles } from '../src/lib/worldRuntimeStatus.mjs'

const source = path => readFile(new URL(`../src/${path}`, import.meta.url), 'utf8')

const deferred = () => {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

const settle = async () => {
  for (let i = 0; i < 6; i += 1) {
    await new Promise(resolve => setImmediate(resolve))
    await nextTick()
  }
}

function renderer() {
  return createRenderer({
    createElement: tag => ({ tag, children: [] }),
    createText: text => ({ text }),
    createComment: text => ({ text }),
    setText: (node, text) => { node.text = text },
    setElementText: (node, text) => { node.text = text },
    patchProp() {},
    parentNode: node => node.parent,
    nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] || null,
    insert(node, parent, anchor = null) {
      if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
      const index = parent.children.indexOf(anchor)
      parent.children.splice(index < 0 ? parent.children.length : index, 0, node)
      node.parent = parent
    },
    remove(node) {
      if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
    }
  })
}

function catalogFixture() {
  return {
    forest: {
      WORLDGEN_GROUP: {
        misc: {
          text: 'Misc',
          order: 1,
          desc: { default: 'Default', never: 'Never', always: 'Always' },
          items: {
            wildfires: { value: 'default', text: 'Wildfires' }
          }
        }
      },
      WORLDSETTINGS_GROUP: {}
    },
    cave: {
      WORLDGEN_GROUP: {
        misc: {
          text: 'Cave Misc',
          order: 1,
          desc: { default: 'Default', never: 'Never', always: 'Always' },
          items: {
            earthquakes: { value: 'default', text: 'Earthquakes' }
          }
        }
      },
      WORLDSETTINGS_GROUP: {}
    }
  }
}

async function layoutRouteKey() {
  const layout = parseSFC(await source('layouts/MainLayoutV2.vue')).descriptor.template.content
  function findRouterView(node) {
    if (node.tag === 'RouterView') return node
    return node.children?.map(findRouterView).find(Boolean)
  }
  const keyExpression = findRouterView(baseParse(layout)).props.find(prop => prop.arg?.content === 'key').exp.content
  return new Function('route', 'managementScopeRevision', `return ${keyExpression}`)
}

async function worldSettingsOptions(dependencies) {
  const script = parseSFC(await source('views/worlds/WorldSettings.vue')).descriptor.script.content
  const declaration = parseJS(script, { sourceType: 'module' }).program.body
    .find(node => node.type === 'ExportDefaultDeclaration').declaration
  const properties = declaration.properties
    .filter(node => node.key.name !== 'components')
    .map(node => script.slice(node.start, node.end))
  const windowStub = {
    innerWidth: 1440,
    innerHeight: 900,
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame(fn) { fn() }
  }
  const documentStub = {
    addEventListener() {},
    removeEventListener() {},
    querySelector: () => null,
    querySelectorAll: () => []
  }
  const scope = {
    preferredRoomId,
    applyWorldSettingsLabels,
    worldSettingsCatalogPath,
    compareWorldRoles,
    confirmAction: async () => true,
    toast: { success() {}, info() {}, warning() {}, error() {} },
    window: windowStub,
    document: documentStub,
    ...dependencies
  }
  return new Function(...Object.keys(scope), `return ({${properties.join(',')}})`)(...Object.values(scope))
}

test('entering /worlds/settings mounts once, avoids duplicate world list reads, and never flashes empty states', async () => {
  const routeKey = await layoutRouteKey()
  const calls = []
  const renders = []
  let mountCount = 0
  let unmountCount = 0
  let current = null

  const rooms = [
    {
      id: 'room-1',
      name: 'MainCluster',
      worlds: [
        { id: 'master-1', name: 'Master', type: 'forest', isMaster: true, status: 'stopped' },
        { id: 'caves-1', name: 'Caves', type: 'cave', isMaster: false, status: 'stopped' }
      ]
    },
    {
      id: 'room-2',
      name: 'SecondCluster',
      worlds: [
        { id: 'master-2', name: 'Master', type: 'forest', isMaster: true, status: 'stopped' }
      ]
    }
  ]

  const configurations = {
    'MainCluster:Master': {
      revision: 'rev-room1-master',
      overrides: { wildfires: 'never' },
      serverIni: { network: { server_port: 10999 }, shard: { is_master: true, name: 'Master', id: 1 }, account: { encode_user_path: true }, steam: { master_server_port: 27016, authentication_port: 8766 } }
    },
    'MainCluster:Caves': {
      revision: 'rev-room1-caves',
      overrides: { earthquakes: 'never' },
      serverIni: { network: { server_port: 10998 }, shard: { is_master: false, name: 'Caves', id: 2 }, account: { encode_user_path: true }, steam: { master_server_port: 27017, authentication_port: 8767 } }
    },
    'SecondCluster:Master': {
      revision: 'rev-room2-master',
      overrides: { wildfires: 'always' },
      serverIni: { network: { server_port: 11000 }, shard: { is_master: true, name: 'Master', id: 1 }, account: { encode_user_path: true }, steam: { master_server_port: 27018, authentication_port: 8768 } }
    }
  }

  let pendingConfigBarrier = null
  const options = await worldSettingsOptions({
    fetch: async () => {
      calls.push('catalog')
      return { ok: true, json: async () => catalogFixture() }
    },
    api: {
      worldApi: {
        getWorldList: async () => {
          calls.push('worldList')
          return { status: 200, data: JSON.parse(JSON.stringify(rooms)) }
        },
        getWorldConfiguration: async (savename, worldname) => {
          calls.push(`config:${savename}:${worldname}`)
          if (pendingConfigBarrier) await pendingConfigBarrier.promise
          return { status: 200, data: JSON.parse(JSON.stringify(configurations[`${savename}:${worldname}`])) }
        }
      }
    }
  })

  const scopeRevision = ref(0)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{
      path: '/worlds/settings',
      component: {
        ...options,
        created() {
          mountCount += 1
          options.created.call(this)
        },
        beforeUnmount() {
          unmountCount += 1
          options.beforeUnmount.call(this)
        },
        render() {
          current = this
          const showPageSkeleton = this.showPageSkeleton
          const showTabs = !showPageSkeleton && Boolean(this.roomId && this.originalSettings && this.visibleWorlds.length > 0)
          const showNoWorldsEmpty = !showPageSkeleton && !showTabs && Boolean(this.roomId && this.visibleWorlds.length === 0 && !this.loadError && !this.roomOptionsError)
          const showNoRoomsEmpty = !showPageSkeleton && !showTabs && !showNoWorldsEmpty && Boolean(!this.roomId && !this.roomOptionsError && !this.loadError)
          renders.push({
            showPageSkeleton,
            showTabs,
            showNoWorldsEmpty,
            showNoRoomsEmpty,
            showFooter: this.showWorldSettingsFooter,
            activeTab: this.activeTab
          })
          return h('div')
        }
      }
    }]
  })

  await router.push('/worlds/settings')
  const app = renderer().createApp({
    setup() {
      const route = useRoute()
      return () => h(RouterView, { key: routeKey(route, scopeRevision.value) })
    }
  })
  app.config.globalProperties.$t = key => key
  app.config.globalProperties.$i18n = { locale: 'zh-CN' }
  app.use(router)
  app.mount({ children: [] })

  try {
    // Frame 0 starts in unified skeleton without premature empty states
    assert.equal(renders[0].showPageSkeleton, true)
    assert.equal(renders[0].showNoRoomsEmpty, false)
    assert.equal(renders[0].showNoWorldsEmpty, false)
    assert.equal(renders[0].showFooter, false)

    await settle()

    // Mounted exactly once even after syncing roomId + worldId query params
    assert.equal(mountCount, 1)
    assert.equal(unmountCount, 0)
    assert.deepEqual(router.currentRoute.value.query, { roomId: 'room-1', worldId: 'master-1' })

    // Deduplicated worldList call on initial entry
    assert.deepEqual(calls, ['catalog', 'worldList', 'config:MainCluster:Master'])

    // Zero empty-state flashes across every intermediate render
    assert.equal(renders.some(frame => frame.showNoRoomsEmpty), false)
    assert.equal(renders.some(frame => frame.showNoWorldsEmpty), false)
    assert.equal(renders.at(-1).showPageSkeleton, false)
    assert.equal(renders.at(-1).showTabs, true)
    assert.equal(renders.at(-1).showFooter, true)
    assert.equal(current.forestSettings.WORLDGEN_GROUP.misc.items.wildfires.value, 'never')

    // Switching world tabs keeps component mounted, keeps Tabs shell visible, and preserves cached baseline on revisit
    renders.length = 0
    await current.requestWorldTab('Caves')
    await settle()
    assert.equal(mountCount, 1)
    assert.equal(unmountCount, 0)
    assert.deepEqual(router.currentRoute.value.query, { roomId: 'room-1', worldId: 'caves-1' })
    assert.equal(renders.every(frame => frame.showTabs && !frame.showPageSkeleton), true)
    assert.equal(current.caveSettings.WORLDGEN_GROUP.misc.items.earthquakes.value, 'never')

    // Revisit Master while configuration reload is still pending: cached baseline remains immediately renderable
    pendingConfigBarrier = deferred()
    current.forestSettings.WORLDGEN_GROUP.misc.items.wildfires.value = 'always'
    await current.requestWorldTab('Master')
    await nextTick()
    assert.equal(current.loading, true)
    assert.equal(current.showPageSkeleton, false)
    assert.equal(Boolean(current.getSettingsForWorld(current.currentWorld)), true)
    assert.equal(current.forestSettings.WORLDGEN_GROUP.misc.items.wildfires.value, 'never')
    pendingConfigBarrier.resolve()
    pendingConfigBarrier = null
    await settle()

    // Switching rooms resets per-room baselines, ignores previous room's Caves worldId, and never flashes noWorlds
    await current.requestWorldTab('Caves')
    await settle()
    assert.deepEqual(router.currentRoute.value.query, { roomId: 'room-1', worldId: 'caves-1' })

    renders.length = 0
    await current.requestRoomChange('room-2')
    await settle()
    assert.equal(mountCount, 1)
    assert.equal(unmountCount, 0)
    assert.equal(renders.some(frame => frame.showNoWorldsEmpty), false)
    assert.equal(renders.some(frame => frame.showNoRoomsEmpty), false)
    assert.deepEqual(router.currentRoute.value.query, { roomId: 'room-2', worldId: 'master-2' })
    assert.equal(current.activeTab, 'Master')
    assert.equal(current.worldOriginalSettings.Caves, undefined)
    assert.equal(current.worldConfigurationMeta.Master.revision, 'rev-room2-master')
    assert.equal(current.forestSettings.WORLDGEN_GROUP.misc.items.wildfires.value, 'always')

    // Machine scope revision rotates the page instance cleanly
    scopeRevision.value += 1
    await settle()
    assert.equal(mountCount, 2)
    assert.equal(unmountCount, 1)
  } finally {
    app.unmount()
  }
})

test('MainLayoutV2 refreshes managementScopeRevision on /worlds/settings and WorldSettings removes body MutationObserver', async () => {
  const [layout, worldSettings] = await Promise.all([
    source('layouts/MainLayoutV2.vue'),
    source('views/worlds/WorldSettings.vue')
  ])

  assert.match(layout, /if \(\['\/mods', '\/worlds\/settings'\]\.includes\(route\.path\) \|\| route\.fullPath === previousPath\) managementScopeRevision\.value \+= 1/)
  assert.doesNotMatch(worldSettings, /new MutationObserver|setupDomObserver|getMenuWidth/)
})
