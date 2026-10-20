import test from 'node:test'
import assert from 'node:assert/strict'
import { createAIHistoryStorage } from '../src/lib/aiHistoryStorage.mjs'
import { createAISession } from '../src/lib/aiSession.mjs'

const memory = () => { const data = new Map(); return { data, getItem: key => data.get(key), setItem: (key,value) => data.set(key,value) } }
const store = (storage, username = 'admin') => createAIHistoryStorage({ storage, getUser: async () => ({ id: 1, username }) })
function session(history, chat = async () => ({ content: '回答' })) {
  return createAISession({history,t: key => key,locale: () => 'zh-CN',api: { status: async () => ({config:{enabled:true,endpoint:'example',model:'model'}}),history: async () => ({items:[]}),chat },roomsAPI:{controlPlaneList:async()=>({items:[{id:'room-a',name:'A'},{id:'room-b',name:'B'}]})}})
}

test('reload restores account-specific conversation, selected room, draft and real receipt IDs', async () => {
 const storage = memory(), history = store(storage)
 const original = session(history, async (_input,{onEvent}) => {
  onEvent({type:'result',tool:'room_control',call:{callId:'real-call',status:'succeeded',data:{id:'real-job'}}})
  return {content:'任务已提交'}
 })
 await original.load({roomId:'room-a'})
 original.draft.value='保存';await original.send();original.draft.value='继续检查';original.persist()
 const restored = session(store(storage))
 await restored.load({roomId:'room-b'})
 assert.equal(restored.selectedRoom.value,'room-a')
 assert.equal(restored.draft.value,'继续检查')
 assert.equal(restored.messages.value.at(-1).content,'任务已提交')
 assert.equal(restored.messages.value.at(-1).calls[0].callId,'real-call')
 const otherAccount = session(store(storage,'other-admin'))
 await otherAccount.load()
 assert.deepEqual(otherAccount.messages.value,[])
 assert.equal(otherAccount.draft.value,'')
 original.reset()
 assert.deepEqual(original.messages.value,[])
 const afterLogin = session(store(storage));await afterLogin.load()
 assert.equal(afterLogin.messages.value.at(-1).content,'任务已提交')
})

test('reload during a request retains evidence, reports interruption and never repeats an operation', async () => {
 const storage=memory()
 let resolve,executions=0
 const original=session(store(storage),async (_input,{onEvent})=>{
  executions++;onEvent({type:'result',tool:'room_control',call:{callId:'actual-receipt',status:'succeeded',data:{id:'submitted'}}})
  return new Promise(done=>{resolve=done})
 })
 await original.load({roomId:'room-a'});original.draft.value='保存';const sending=original.send();original.persist()
 const restored=session(store(storage),async()=>{executions++;return {content:'should not happen'}})
 await restored.load()
 assert.equal(restored.busy.value,false)
 assert.equal(executions,1)
 assert.equal(restored.messages.value.at(-1).content,'ai.interrupted')
 assert.equal(restored.messages.value.at(-1).calls[0].callId,'actual-receipt')
 resolve({content:'实际完成'});await sending
})

test('explicit clear persists across reload while unavailable storage is reported without blocking chat',async()=>{
 const storage=memory(), original=session(store(storage))
 await original.load({roomId:'room-a'});original.draft.value='问题';await original.send();original.clear();original.persist()
 const restored=session(store(storage));await restored.load();assert.deepEqual(restored.messages.value,[])
 const unavailable=session(store({getItem(){throw Error('disabled')},setItem(){throw Error('disabled')}}))
 await unavailable.load();assert.equal(unavailable.persistenceError.value,true);assert.ok(unavailable.chatReady.value)
 unavailable.draft.value='问题';await unavailable.send();assert.equal(unavailable.messages.value.at(-1).content,'回答')
 unavailable.persist();assert.equal(unavailable.persistenceError.value,true)
})

test('stored transcript remains bounded and excludes provider/session credentials',async()=>{
 const storage=memory(),history=store(storage);await history.load()
 history.save({ selectedRoom:'room-a',draft:'草稿',busy:false,config:{apiKey:'SECRET_SHOULD_NOT_SAVE'},messages:Array.from({length:32},()=>({role:'assistant',content:'字'.repeat(32000),calls:Array.from({length:12},()=>({callId:'call-1',tool:'world_logs',status:'succeeded',data:{lines:'文'.repeat(90000)}}))})) })
 const [raw]=storage.data.values();assert.ok(new TextEncoder().encode(raw).length<=512*1024)
 assert.equal(raw.includes('SECRET_SHOULD_NOT_SAVE'),false)
 const data=await history.load();assert.ok(data.messages.length>=2);assert.equal(data.messages.at(-1).calls[0].callId,'call-1')
})
