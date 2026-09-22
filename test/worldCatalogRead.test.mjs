import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorldCatalogRead, retryableCatalogError, waitForCatalogRetry } from '../src/lib/worldCatalogRead.mjs'
const flush = () => new Promise(resolve => setImmediate(resolve))
function harness(request, options={}) {
 const states=[],results=[],errors=[]
 const reader=createWorldCatalogRead({request,onState:s=>states.push(s),onResult:r=>results.push(r),onError:e=>errors.push(e),wait:async()=>{},...options})
 return {reader,states,results,errors}
}
test('Transient first-open failures automatically recover without showing a terminal error',async()=>{
 let attempts=0
 const h=harness(async()=>{if(++attempts<3)throw {code:'RUNTIME_BUSY',details:{retryable:true}};return {items:['mod']}})
 await h.reader.start({roomId:'r',worldId:'w'})
 assert.equal(attempts,3);assert.deepEqual(h.errors,[]);assert.deepEqual(h.results,[{items:['mod']}])
 assert.deepEqual(h.states.map(s=>s.phase),['loading','retrying','loading','retrying','loading','ready'])
})
test('Persistent failures stop after two retries; auth/installation failures do not retry',async()=>{
 for(const [error,expected] of [[{code:'RUNTIME_CATALOG_UNAVAILABLE'},3],[{code:'RUNTIME_NOT_INSTALLED',details:{retryable:false}},1],[{status:401},1],[{status:403},1]]){
  let attempts=0;const h=harness(async()=>{attempts++;throw error})
  await h.reader.start({worldId:'w'});await flush()
  assert.equal(attempts,expected);assert.equal(h.errors.length,1);assert.equal(h.states.at(-1).phase,'failed')
 }
})
test('Changing world during a retry discards the old result and never retries the previous target',async()=>{
 let resume;const calls=[]
 const h=harness(async input=>{calls.push(input.worldId);if(input.worldId==='old')throw {code:'ERR_NETWORK'};return input.worldId},{wait:()=>new Promise(resolve=>{resume=resolve})})
 const old=h.reader.start({worldId:'old'});await flush()
 await h.reader.start({worldId:'new'});resume();await old
 assert.deepEqual(calls,['old','new']);assert.deepEqual(h.results,['new']);assert.deepEqual(h.errors,[])
})
test('Closing cancels pending reads and real retry timers without additional requests',async()=>{
 let attempts=0;const h=harness(async()=>{attempts++;throw {status:503}},{wait:waitForCatalogRetry,retryDelays:[10000,10000]})
 const done=h.reader.start({worldId:'w'});await flush();h.reader.dispose();await done
 assert.equal(attempts,1);assert.deepEqual(h.errors,[]);assert.deepEqual(h.results,[])
})
test('Old responses cannot replace a newly selected world even when a transport ignores abort',async()=>{
 let finishOld;const h=harness(input=>input.worldId==='old'?new Promise(resolve=>{finishOld=resolve}):Promise.resolve('new'))
 const old=h.reader.start({worldId:'old'});await h.reader.start({worldId:'new'});finishOld('old');await old
 assert.deepEqual(h.results,['new'])
 assert.equal(retryableCatalogError({code:'RUNTIME_CATALOG_UNAVAILABLE',details:{retryable:false}}),false)
})
