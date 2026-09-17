import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { babelParse } from '@vue/compiler-sfc'
const source = readFileSync(new URL('../src/api/cronApi.js', import.meta.url),'utf8')
const names = ['taskType','taskArguments','mapTask','valueForParameter','taskInput']
const functions = babelParse(source,{sourceType:'module'}).program.body.filter(n=>n.type==='FunctionDeclaration' && names.includes(n.id.name)).map(n=>source.slice(n.start,n.end)).join('\n')
const room={id:'room',worlds:[{id:'caves'}]}
function adapter(){ return runInNewContext(`${functions}; ({mapTask,taskInput})`,{taskCache:new Map(), commandCache:[{id:'custom-template',parameters:[],risk:'critical'}], actionCache:[], ensureDefaultGroup:async()=>({id:'default'})}) }
test('custom Lua task survives API display and edit roundtrip without losing world or timezone',async()=>{
 const api=adapter()
 const task={id:'task',name:'Lua test',action:'command.execute',groupId:'group-uuid',worldIds:['caves'],parameters:{rawCommand:"print('hello')\nc_save()"},enabled:true,schedule:'0 */6 * * *',timezone:'Europe/London',timeoutSeconds:300}
 const form=api.mapTask(task,room.id)
 assert.equal(form.type,'tmux_raw_command'); assert.equal(form.raw_command,task.parameters.rawCommand)
 const input=await api.taskInput(form,room,task)
 assert.equal(input.parameters.rawCommand,task.parameters.rawCommand)
 assert.equal(input.worldIds[0],'caves'); assert.equal(input.timezone,task.timezone);assert.equal(input.groupId,'group-uuid')
 await assert.rejects(()=>api.taskInput({...form,session_name:'unknown'},room),/世界/)
})
test('custom critical templates remain selectable in scheduled commands',async()=>{
 const input=await adapter().taskInput({type:'tmux_command',session_name:'caves',command_id:'custom-template',group_id:'group',name:'template',spec:'0 * * * *'},room)
 assert.equal(input.action,'command.execute');assert.equal(input.parameters.commandId,'custom-template')
})
