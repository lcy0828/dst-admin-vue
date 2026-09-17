import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { parse, babelParse } from '@vue/compiler-sfc'
const code = parse(readFileSync(new URL('../src/views/rooms/RoomSettings.vue', import.meta.url), 'utf8')).descriptor.script.content
const options = babelParse(code, { sourceType: 'module' }).program.body.find(n => n.type === 'ExportDefaultDeclaration').declaration
const methods = options.properties.find(n => n.key.name === 'methods').value.properties
const names = ['saveSettings', 'captureBaseline', 'getFormFingerprint', 'confirmLeaveRoomSettings']
const nodes = [...methods.filter(n => names.includes(n.key.name)), ...options.properties.filter(n => ['beforeRouteLeave', 'beforeRouteUpdate'].includes(n.key.name))]
function editor() {
  let confirmations = 0, navigations = 0
  const bound = runInNewContext(`({${nodes.map(n => code.slice(n.start,n.end)).join(',')}})`, {
    roomConfigApi: { createRoom: async () => ({ data: { id: 'created-id', name: 'test-room' } }) },
    serverApi: {}, toast: { error: assert.fail, success() {}, warning() {} },
    confirmAction: async () => { confirmations++; throw new Error('stay') }, console
  })
  const state = { ...bound, form: new Proxy({ offline_cluster:true, adminList:[], blockList:[], whiteList:[] }, { get:(obj,key)=>obj[key]??'' }),
    saveNameForm:{savename:'test-room'}, isEdit:false, unsavedChanges:true,
    validateSettings:()=>true, $t:k=>k, $route:{ path:'/rooms/settings',query:{} },
    loadRoomSettings:async()=>{}, handleError:assert.fail }
  state.$router = { replace: async to => { assert.equal(await state.beforeRouteUpdate(to,state.$route),true); navigations++ } }
  return {state, counts:()=>({confirmations,navigations})}
}
test('successful first save changes room URL after accepting the saved baseline', async()=>{
  const {state,counts}=editor()
  await state.saveSettings()
  assert.deepEqual(counts(),{confirmations:0,navigations:1})
  assert.equal(state.roomId,'created-id'); assert.equal(state.unsavedChanges,false)
})
test('genuine unsaved navigation still asks and can be canceled', async()=>{
  const {state,counts}=editor()
  assert.equal(await state.beforeRouteLeave(),false)
  assert.equal(await state.beforeRouteUpdate({query:{id:'another'}},state.$route),false)
  assert.equal(counts().confirmations,2)
})
