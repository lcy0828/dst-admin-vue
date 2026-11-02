import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createRenderer, h, nextTick, reactive, ssrContextKey } from 'vue'
import { createI18n } from 'vue-i18n'
import { workbenchMessages } from '../src/i18n/workbenchMessages.js'

let server, Component, api, commands
before(async()=>{
 server=await createServer({server:{middlewareMode:true,watch:null},appType:'custom'})
 Component=(await server.ssrLoadModule('/src/components/game-tools/WorkbenchCommands.vue')).default
 api=(await server.ssrLoadModule('/src/api/v2.js')).consoleV2API
 commands=(await server.ssrLoadModule('/src/api/commandManager.js')).commandApi
 api.definitions=async()=>({items:[]});api.runs=async()=>({items:[]})
})
after(async()=>{await server?.close()})
const settle=async()=>{for(let i=0;i<4;i++){await nextTick();await Promise.resolve()}}
const definition={id:'act_nearby_entities',isBuiltin:true,parameters:[
 {name:'player_id',type:'string',required:true},{name:'action',type:'enum',options:['freeze','delete'],required:true,default:'freeze'},
 {name:'radius',type:'integer',required:true,default:10},{name:'phase',type:'enum',options:['preview','execute','cancel']},{name:'preview_id',type:'string'}]}
const preview={id:'run-a',status:'succeeded',executionOutcome:'confirmed',batch:{state:'preview',previewId:'token-a'}}
function mount(){
 const props=reactive({roomId:'room',worldId:'Master',playerId:'KU_EXAMPLE',running:true,roomName:'example'});let state
 const renderer=createRenderer({createElement:()=>({}),createText:()=>({}),createComment:()=>({}),insert(){},remove(){},patchProp(){},setElementText(){},setText(){},parentNode:()=>null,nextSibling:()=>null})
 const component={...Component,setup(p,c){state=Component.setup(p,c);return state},render:()=>null}
 const app=renderer.createApp({render:()=>h(component,props)})
 app.provide(ssrContextKey,{modules:new Set()});app.use(createI18n({legacy:false,locale:'zh-CN',messages:workbenchMessages}));app.mount({})
 state.choose(definition)
 return {state,props,close:()=>app.unmount()}
}
test('late previews cannot arm a different player, world or changed arguments',async()=>{
 for(const change of ['player','world','arguments']){
  const view=mount();await settle();let resolve
  commands.executeCommand=()=>new Promise(done=>{resolve=done})
  const pending=view.state.execute();await settle()
  if(change==='player')view.props.playerId='KU_OTHER'
  else if(change==='world')view.props.worldId='Caves'
  else view.state.values.value.radius=20
  await settle();resolve(preview);await pending
  assert.equal(view.state.nearbyPreview.value,null);assert.equal(view.state.lastRun.value,null)
  view.close()
 }
})
test('preview confirmation freezes the token and uncertain execution requires manual review',async()=>{
 const view=mount();await settle();const calls=[]
 commands.executeCommand=async(...args)=>{calls.push(args);return calls.length===1?preview:{id:'run-b',status:'uncertain',mayHaveExecuted:true}}
 await view.state.execute();assert.equal(calls[0][2].phase,'preview')
 assert.ok(view.state.nearbyPreview.value)
 await view.state.execute();assert.equal(calls[1][2].phase,'execute');assert.equal(calls[1][2].preview_id,'token-a')
 assert.equal(view.state.nearbyUncertain.value,true);assert.equal(view.state.canRun.value,false)
 await view.state.execute();assert.equal(calls.length,2)
 view.close()
})
test('cancel consumes the original preview without executing and expired previews do not submit',async()=>{
 const view=mount();await settle();const calls=[]
 commands.executeCommand=async(...args)=>{calls.push(args);return preview}
 await view.state.execute();view.state.nearbyPreview.value.until=0
 await view.state.execute();assert.equal(calls.length,1);assert.equal(view.state.nearbyPreview.value,null)
 await view.state.execute();await view.state.cancelNearby()
 assert.equal(calls.at(-1)[2].phase,'cancel');assert.equal(calls.at(-1)[2].preview_id,'token-a')
 assert.equal(view.state.nearbyPreview.value,null)
 view.close()
})
