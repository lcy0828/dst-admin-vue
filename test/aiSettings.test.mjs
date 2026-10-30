import test from 'node:test'
import assert from 'node:assert/strict'
import { aiSettingsForm, aiLimitValue, aiLimitsInput, DEFAULT_AI_LIMITS } from '../src/lib/aiSettings.mjs'

test('old configurations show current defaults while explicit zero and custom limits are retained',()=>{
 assert.deepEqual(aiSettingsForm().limits,DEFAULT_AI_LIMITS)
 assert.deepEqual(aiSettingsForm({limits:null}).limits,DEFAULT_AI_LIMITS)
 assert.deepEqual(aiSettingsForm({limits:{maxRounds:0,maxToolCalls:100,timeoutSeconds:0}}).limits,{maxRounds:0,maxToolCalls:100,timeoutSeconds:0})
 const config={limits:{maxRounds:20,maxToolCalls:80,timeoutSeconds:900},keyConfigured:true}
 const form=aiSettingsForm(config);form.limits.maxRounds=50
 assert.equal(config.limits.maxRounds,20)
 assert.equal(form.apiKey,'');assert.equal(form.clearKey,false)
})

test('number fields serialize as integer settings without converting empty fields to unlimited',()=>{
 assert.deepEqual(aiLimitsInput({maxRounds:'24',maxToolCalls:'100',timeoutSeconds:'0'}),{maxRounds:24,maxToolCalls:100,timeoutSeconds:0})
 for(const value of ['',null,undefined,-1,0.1,'1.5',Infinity,NaN,true,Number.MAX_SAFE_INTEGER+1]) assert.equal(aiLimitValue('maxRounds',value),null,String(value))
 assert.equal(aiLimitValue('timeoutSeconds',9223372036),9223372036)
 assert.equal(aiLimitValue('timeoutSeconds',9223372037),null)
 assert.equal(aiLimitsInput({maxRounds:'',maxToolCalls:12,timeoutSeconds:150}),null)
})

// Credential scope is independent of model configuration and chat room context.
test('game credentials require explicit rooms while panel scope can cover all rooms', async () => {
  const { aiTokenInput } = await import('../src/lib/aiSettings.mjs')
  const input = { name: 'Robot', days: '30', profile: 'game-read', roomIds: [] }
  assert.equal(aiTokenInput(input), null)
  assert.deepEqual(aiTokenInput({ ...input, roomIds: ['example', 'example'] }), { name: 'Robot', days: 30, profile: 'game-read', roomIds: ['example'] })
  assert.deepEqual(aiTokenInput({ ...input, profile: 'panel-manage' }).roomIds, [])
  assert.equal(aiTokenInput({ ...input, profile: 'invented-role', roomIds: ['example'] }), null)
  assert.equal(aiTokenInput({ ...input, roomIds: ['bad\nroom'] }), null)
})
