<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { worldQueryV2API } from '@/api/v2'
import { toolGroups, characters, characterLabel, toolGroupLabel, expansionLabel } from '@/lib/workbenchExpansion.mjs'
import { readWorkbenchPreferences } from '@/lib/workbenchPreferences.mjs'
import WorkbenchCommands from './WorkbenchCommands.vue'
import WorkbenchMapEditor from './WorkbenchMapEditor.vue'
import WorkbenchPreferences from './WorkbenchPreferences.vue'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
const props=defineProps({roomId:String,roomName:String,worldId:String,worldName:String,playerId:String,playerPrefab:String,running:Boolean,commandId:String,initialArguments:Object})
const {t,locale}=useI18n()
const isEn=computed(()=>locale.value.startsWith('en'))
const listSeparator=computed(()=>isEn.value?', ':'、')
const group=ref('player'),selected=ref('set_player_mode'),args=ref({}),character=ref('wilson'),preferences=ref(readWorkbenchPreferences()),modeData=ref(null),modeError=ref(''),modeLoading=ref(false)
let modeEpoch=0
const allowed=computed(()=>[...(toolGroups[group.value]?.commands||[]),...(props.commandId&&!Object.values(toolGroups).some(g=>g.commands.includes(props.commandId))?[props.commandId]:[])])
function changeGroup(value){if(!value)return;group.value=value;if(value==='settings')return;selected.value=toolGroups[value].commands[0];args.value={character:character.value,feedback:preferences.value.feedback}}
function preset(){if(!props.commandId)return;selected.value=props.commandId;args.value={...props.initialArguments,feedback:preferences.value.feedback};group.value=Object.entries(toolGroups).find(([,g])=>g.commands.includes(props.commandId))?.[0]||'world'}
async function modes(){const seq=++modeEpoch;modeError.value='';modeLoading.value=true
 try{const r=await worldQueryV2API.modes(props.roomId,props.worldId);if(seq===modeEpoch){modeData.value=r.status==='succeeded'?r.data:null;if(r.status!=='succeeded')modeError.value=r.error?.message||t('workbench.extra.modesUnconfirmed')}}catch(e){if(seq===modeEpoch)modeError.value=e.message}finally{if(seq===modeEpoch)modeLoading.value=false}}
function chooseCharacter(value){character.value=value;selected.value='give_character_supplies';args.value={character:value,feedback:preferences.value.feedback}}
function point(p){args.value={...args.value,...p};if(group.value!=='terrain')group.value='terrain';if(!['edit_world_tiles','spawn_entity_at'].includes(selected.value))selected.value='spawn_entity_at'}
function formatModeMemory(state){return t(`workbench.extra.${state==='enabled'?'modeMemoryOn':state==='disabled'?'modeMemoryOff':'modeMemoryUnknown'}`)}
watch(()=>[props.commandId,props.initialArguments],preset,{immediate:true,deep:true})
watch(()=>props.playerPrefab,p=>{if(characters[p])character.value=p},{immediate:true})
watch(()=>[props.roomId,props.worldId,props.playerId],()=>{++modeEpoch;modeData.value=null;modeError.value='';modeLoading.value=false;args.value={}})
</script>
<template>
 <Tabs :model-value="group" @update:model-value="changeGroup">
  <TabsList class="flex h-auto flex-wrap"><TabsTrigger v-for="(_,id) in toolGroups" :key="id" :value="id">{{toolGroupLabel(id,isEn)}}</TabsTrigger><TabsTrigger value="settings" @click="group='settings'">{{t('workbench.extra.settingsTab')}}</TabsTrigger></TabsList>
  <div v-if="group!=='settings'" class="mt-3 flex flex-col gap-3">
   <Alert v-if="!playerId"><AlertDescription>{{t('workbench.extra.playerRequiredHint')}}</AlertDescription></Alert>
   <template v-if="group==='player'">
    <div class="flex items-center gap-2"><Button variant="outline" size="sm" :disabled="!running||modeLoading" @click="modes">{{t(modeLoading?'workbench.extra.modesLoading':'workbench.extra.modesView')}}</Button><span v-if="modeError" class="text-sm text-destructive">{{modeError}}</span></div>
    <div v-if="modeData" class="flex flex-col gap-1 rounded-md border p-3 text-sm"><template v-for="p in modeData.players||[]" :key="p.id"><p v-if="!playerId||p.id===playerId">{{p.id}} · {{p.panelModes?Object.entries(p.panelModes).filter(([,v])=>v==='enabled').map(([k])=>expansionLabel(k,isEn)).join(listSeparator)||t('workbench.extra.modesNone'):t('workbench.extra.modesUnsupported')}} · {{t('workbench.extra.modeMemoryLabel',{state:formatModeMemory(p.modeMemory)})}}</p></template></div>
   </template>
   <FieldGroup v-if="group==='character'"><Field><FieldLabel>{{t('workbench.extra.characterSuppliesLabel')}}</FieldLabel><Select :model-value="character" @update:model-value="chooseCharacter"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="(_,id) in characters" :key="id" :value="id">{{characterLabel(id,isEn)}}</SelectItem></SelectGroup></SelectContent></Select></Field></FieldGroup>
   <WorkbenchMapEditor v-if="group==='terrain'" :room-id="roomId" :world-id="worldId" :grid="preferences.grid" @point="point" />
   <WorkbenchCommands :key="group" builtin-only :allowed-commands="allowed" :room-id="roomId" :room-name="roomName" :world-id="worldId" :world-name="worldName" :player-id="playerId" :running="running" :command-id="selected" :initial-arguments="args" @select-command="id=>{selected=id;args={}}" />
   <p v-if="group==='world'" class="text-sm text-muted-foreground"><RouterLink :to="{name:'SpecialLists',query:{roomId}}" class="underline">{{t('workbench.extra.adminListLink')}}</RouterLink>{{t('workbench.extra.adminListHint')}}</p>
   <Alert v-if="selected==='repair_skill_sync'"><AlertDescription>{{t('workbench.extra.skillSyncHint')}}</AlertDescription></Alert>
  </div>
  <TabsContent value="settings"><WorkbenchPreferences v-model="preferences" /></TabsContent>
 </Tabs>
</template>
