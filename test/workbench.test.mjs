import test from 'node:test'
import assert from 'node:assert/strict'
import { commandArguments, manualEntity, luaPlayerContext, luaByteLength, workbenchExample } from '../src/lib/workbench.mjs'
import { workbenchMessages } from '../src/i18n/workbenchMessages.js'

test('Manual prefabs accept mod IDs but never Lua or wildcard patterns',()=>{
 assert.equal(manualEntity('mod_custom_sword').id,'mod_custom_sword')
 for(const id of ['','*','sword; c_regenerateworld()','../mod',"sword'",'a'.repeat(81)])assert.equal(manualEntity(id),null)
})
test('Command arguments honor backend types, ranges and optional defaults',()=>{
 const parameters=[{name:'count',type:'integer',required:true,minimum:1,maximum:40},{name:'on',type:'boolean'},{name:'mode',type:'enum',options:['a','b']},{name:'optional',type:'number',default:3}]
 assert.deepEqual(commandArguments(parameters,{count:'4',on:false,mode:'a'}),{count:4,on:false,mode:'a'})
 assert.deepEqual(commandArguments(parameters,{count:4,on:'false'}),{count:4,on:false})
 for(const values of [{count:41},{count:1.5},{count:''},{count:'NaN'},{count:2,mode:'c'}])assert.equal(commandArguments(parameters,values),null)
})
test('Player context uses an exact selected user ID and counts Lua payload bytes',()=>{
 assert.match(luaPlayerContext('KU_TEST123'),/UserToPlayer\("KU_TEST123"\)/)
 assert.equal(luaPlayerContext('KU_BAD";c_regenerateworld()'),'')
 assert.equal(workbenchExample('player',''),'')
 assert.equal(luaByteLength('中文'),6)
 assert.match(workbenchExample('give','KU_TEST123'),/inventoryitem/)
})
test('Workbench English and Chinese translation coverage matches',()=>{
 function keys(value,prefix=''){return Object.entries(value).flatMap(([k,v])=>typeof v==='object'?keys(v,`${prefix}${k}.`):prefix+k).sort()}
 assert.deepEqual(keys(workbenchMessages['zh-CN']),keys(workbenchMessages['en-US']))
})

import { createLatestWorkbenchRead } from '../src/lib/workbench.mjs'
const flush = () => new Promise(resolve => setImmediate(resolve))
function controlledReader() {
 const calls=[],results=[],errors=[];let settled=0
 const reader=createLatestWorkbenchRead({
  request:(input,signal)=>new Promise((resolve,reject)=>calls.push({input,signal,resolve,reject})),
  onResult:value=>results.push(value),onError:error=>errors.push(error),onSettled:()=>{settled++}
 })
 return {reader,calls,results,errors,get settled(){return settled}}
}
test('Slow world reads keep one request in flight and only the latest pending search',async()=>{
 const state=controlledReader(),{reader,calls,results}=state
 reader.enqueue({query:''})
 for(let i=0;i<100;i++)reader.enqueue({query:`mod_${i}`})
 assert.equal(calls.length,1)
 calls[0].resolve('stale')
 await flush()
 assert.deepEqual(results,[])
 assert.equal(calls.length,2)
 assert.equal(calls[1].input.query,'mod_99')
 calls[1].resolve('latest')
 await flush()
 assert.deepEqual(results,['latest'])
 assert.equal(state.settled,1)
})
test('Changing worlds drops pending reads and stale errors without sending another request',async()=>{
 const state=controlledReader(),{reader,calls,results,errors}=state
 reader.enqueue({world:'Master'})
 reader.enqueue({world:'Master',query:'discard'})
 reader.invalidate()
 calls[0].reject(new Error('old world unavailable'))
 await flush()
 assert.equal(calls.length,1);assert.deepEqual(errors,[]);assert.equal(state.settled,0)
 reader.enqueue({world:'Caves'})
 assert.equal(calls[1].input.world,'Caves')
 calls[1].resolve('Caves');await flush()
 assert.deepEqual(results,['Caves'])
})
test('Closing a workbench aborts its read and never dispatches its pending search',async()=>{
 const state=controlledReader(),{reader,calls}=state
 reader.enqueue({query:'a'});reader.enqueue({query:'b'})
 reader.dispose()
 assert.equal(calls[0].signal.aborted,true)
 calls[0].reject(new Error('cancelled'));await flush()
 reader.enqueue({query:'c'});await flush()
 assert.equal(calls.length,1);assert.deepEqual(state.errors,[]);assert.equal(state.settled,0)
})
test('A failed read does not block the latest pending query or future manual retries',async()=>{
 const state=controlledReader(),{reader,calls,results,errors}=state
 reader.enqueue({query:'old'});reader.enqueue({query:'new'})
 calls[0].reject(new Error('stale failure'));await flush()
 assert.equal(calls.length,2);assert.deepEqual(errors,[])
 calls[1].reject(new Error('busy'));await flush()
 assert.equal(errors[0].message,'busy')
 reader.enqueue({query:'retry'});calls[2].resolve('ok');await flush()
 assert.deepEqual(results,['ok'])
})
