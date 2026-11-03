import { test } from 'node:test'
import assert from 'node:assert/strict'
import { batchPreview, workbenchInteraction } from '../src/lib/workbenchInteraction.mjs'
const flow={kind:'preview-confirm-v1',resultVersion:2,effectVersion:'1'}
const command={id:'act_nearby_entities',actions:[{parameters:{action:'pick'},interaction:flow}]}
const run={status:'succeeded',executionOutcome:'confirmed',batch:{version:2,state:'preview',previewId:'00000000-0000-4000-8000-000000000001',matched:2,observedAt:100,expiresAt:130}}
test('server action metadata drives new nearby operations and single player settings',()=>{
 assert.equal(workbenchInteraction(command,{action:'pick'}),flow)
 assert.equal(workbenchInteraction({id:'set_player_hunger_rate',interaction:flow},{}),flow)
 assert.equal(workbenchInteraction(command,{action:'unknown'}),null)
 assert.equal(workbenchInteraction({interaction:{...flow,resultVersion:3}},{}).unsupported,true)
})
test('preview expiry uses server interval, with incompatible and empty results refused',()=>{
 assert.deepEqual(batchPreview(run,1000,flow),{id:run.batch.previewId,until:31000})
 for(const change of [{status:'sent'},{executionOutcome:'unknown'},{batch:{...run.batch,version:3}},{batch:{...run.batch,matched:0}},{batch:{...run.batch,expiresAt:160}},{batch:{...run.batch,previewId:'forged'}},{batch:{...run.batch,matched:-1}},{batch:{...run.batch,matched:undefined}},{batch:{...run.batch,previewId:'------------------------------------'}}]) assert.equal(batchPreview({...run,...change},1000,flow),null)
})
test('released V1 servers keep the original 30 second protocol',()=>{
 const legacy=workbenchInteraction({id:'act_nearby_entities'},{action:'freeze'})
 assert.equal(legacy.resultVersion,1)
 assert.ok(batchPreview({...run,batch:{...run.batch,version:1,expiresIn:30}},0,legacy))
 assert.equal(batchPreview(run,0,legacy),null)
})
