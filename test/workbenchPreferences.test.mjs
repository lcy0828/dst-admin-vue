import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeWorkbenchPreferences, readWorkbenchPreferences, writeWorkbenchPreferences, snapWorkbenchPoint } from '../src/lib/workbenchPreferences.mjs'
import { mergeResourceDirectory, queryResources } from '../src/lib/resourceLibrary.mjs'
test('preferences never grant permissions or preserve executable values', () => {
 const v = sanitizeWorkbenchPreferences({ quantity: 999, radius: -1, grid: 'yes', feedback: 'eval', middleAction: 'lua', favorites: ['axe', 'axe', "x');kill()"], skins: { axe: 'axe_skin', ['bad/']: 'no' }, readOnly: false })
 assert.equal(v.quantity, 10); assert.equal(v.radius, 10); assert.equal(v.grid, false); assert.deepEqual(v.favorites, ['axe']); assert.deepEqual(v.skins, { axe: 'axe_skin' }); assert.equal(v.readOnly, undefined)
})
test('private browsing and malformed settings remain usable', () => {
 const storage={getItem(){throw Error('denied')},setItem(){throw Error('denied')}}
 assert.equal(readWorkbenchPreferences(storage).quantity,10); assert.equal(writeWorkbenchPreferences({quantity:3},storage).quantity,3)
 assert.deepEqual(snapWorkbenchPoint({x:1,z:7},true),{x:2,z:6}); assert.equal(snapWorkbenchPoint({x:Infinity,z:0}),null)
})
test('Chinese, pinyin, initials, favorites and turf searches use the same bounded directory',()=>{
 const items=mergeResourceDirectory([{id:'meatballs',nameZhCN:'肉丸',category:'food'},{id:'turf_forest',nameZhCN:'森林地皮',category:'item'}])
 for(const query of ['肉丸','rouwan','rw','meatballs'])assert.equal(queryResources(items,{query}).items[0]?.id,'meatballs')
 assert.equal(queryResources(items,{category:'favorites',favorites:['meatballs']}).items.length,1)
 assert.equal(queryResources(items,{category:'turf'}).items[0]?.id,'turf_forest')
})
