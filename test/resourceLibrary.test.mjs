import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeResourceDirectory, queryResources, updateResourceHistory, sanitizeResourceHistory, readResourceHistory, rememberResource, resourceIdentity } from '../src/lib/resourceLibrary.mjs'
const now = Date.UTC(2026, 8, 22)
const base = [
 { id:'log', nameZhCN:'木头', nameEn:'Log', category:'item', common:true, artworkUrl:'/log.webp' },
 { id:'log_old', nameZhCN:'古老木头', nameEn:'Old Log', category:'item' },
 { id:'spear', nameZhCN:'长矛', nameEn:'Spear', category:'equipment' },
 { id:'deerclops', nameZhCN:'独眼巨鹿', nameEn:'Deerclops', category:'boss' }
]
test('Merge keeps mod overrides distinct, retains vanilla translations, and covers unknown new entities',()=>{
 const items=mergeResourceDirectory(base,[{id:'log',modId:'workshop-1',modName:'新模组',nameZhCN:'模组木头',nameEn:'Mod Log',source:'runtime'},{id:'spear',nameZhCN:'Spear',nameEn:'Spear'}, {id:'new_prefab',nameZhCN:'新实体'}])
 assert.equal(items.length,5)
 const log=items.find(x=>x.id==='log')
 assert.equal(log.category,'other');assert.equal(log.artworkUrl,'');assert.equal(log.common,false);assert.equal(log.nameEn,'Mod Log');assert.equal(log.registered,true)
 assert.equal(items.find(x=>x.id==='spear').nameZhCN,'长矛')
 assert.equal(items.find(x=>x.id==='new_prefab').category,'other')
 assert.deepEqual(queryResources(items,{query:'新模组'}).items.map(x=>x.id),['log'])
 assert.equal(queryResources(items,{source:'vanilla'}).items.some(x=>x.id==='log'),false)
 assert.equal(resourceIdentity(log),'workshop-1:log')
})
test('Search relevance outranks usage, while an empty query learns successful actions and effective searches',()=>{
 const items=mergeResourceDirectory(base)
 let history={}
 for(let i=0;i<10;i++)history=updateResourceHistory(history,base[1],'use',now+i)
 assert.equal(queryResources(items,{history,now:now+100}).items[0].id,'log_old')
 assert.equal(queryResources(items,{query:'log',history,now:now+100}).items[0].id,'log')
 assert.equal(queryResources(items,{query:'木头',history,now:now+100}).items[0].id,'log')
 assert.equal(queryResources(items,{query:'Old Log',history,now:now+100}).items[0].id,'log_old')
 history=updateResourceHistory({},base[2],'search',now)
 assert.equal(queryResources(items,{history,now}).items[0].id,'spear')
 assert.deepEqual(updateResourceHistory(history,base[2],'failed',now),history)
 assert.deepEqual(updateResourceHistory(history,base[2],'cancelled',now),history)
 assert.deepEqual(updateResourceHistory(history,base[2],'search',now+100),history,'repeated clicks do not inflate searches')
})
test('Ranks the complete collection before paging, and category counts follow search/source rather than selected category',()=>{
 const entities=Array.from({length:1000},(_,i)=>({id:`item_${String(i).padStart(4,'0')}`,category:i%2?'item':'food'}))
 const items=mergeResourceDirectory(entities),history=updateResourceHistory({},entities[999],'use',now)
 const result=queryResources(items,{history,now,category:'item'})
 assert.equal(result.items[0].id,'item_0999');assert.equal(result.items.length,500)
 assert.equal(result.counts.all,1000);assert.equal(result.counts.food,500)
 assert.equal(result.items.slice(0,60).length,60)
 assert.deepEqual(queryResources(mergeResourceDirectory(base)).items.map(x=>x.id),queryResources(mergeResourceDirectory(base)).items.map(x=>x.id))
})
test('History is bounded, expires, rejects corruption, decays and tolerates disabled storage',()=>{
 const data=Object.fromEntries(Array.from({length:300},(_,i)=>[`vanilla:p${i}`,{at:now-i,uses:1,finds:0,usedAt:now-i}]))
 assert.equal(Object.keys(sanitizeResourceHistory(data,now)).length,200)
 assert.deepEqual(sanitizeResourceHistory(data,now+91*86400000),{})
 assert.deepEqual(sanitizeResourceHistory({'vanilla:log':{at:now+1,uses:1,finds:1}},now),{})
 assert.deepEqual(readResourceHistory({getItem(){throw Error('disabled')}}),{})
 assert.doesNotThrow(()=>rememberResource(base[0],'use',{getItem(){throw Error('disabled')},setItem(){throw Error('disabled')}}))
 const once=updateResourceHistory({},base[0],'use',now)
 const later=updateResourceHistory(once,base[0],'use',now+30*86400000)
 assert.equal(later['vanilla:log'].uses,1.5)
})
test('Successful use of a mod override never promotes the vanilla entity',()=>{
 const history=updateResourceHistory({}, {...base[0],modId:'workshop-1'},'use',now)
 const vanilla=mergeResourceDirectory(base)
 assert.equal(queryResources(vanilla,{history,now}).items[0].id,'log')
 assert.equal(history['vanilla:log'],undefined)
 assert.ok(history['workshop-1:log'])
})
