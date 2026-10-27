<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { BookOpen, Code, Play, Plus, RefreshCw, Save, Search } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { commandApi } from '@/api/commandManager'
import { consoleV2API } from '@/api/v2'
import { translateBuiltinCommandField, translateBuiltinParameterField, translateBuiltinParameterOption } from '@/i18n/commandMessages'
import { commandArguments, LUA_MAX_BYTES, luaByteLength, luaPlayerContext, workbenchExample } from '@/lib/workbench.mjs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import CommandRunResult from './CommandRunResult.vue'
const props=defineProps({roomId:{type:String,default:''},roomName:{type:String,default:''},worldId:{type:String,default:''},worldName:{type:String,default:''},playerId:{type:String,default:''},running:Boolean})
const {t,te}=useI18n()
const definitions=ref([]),selected=ref(null),search=ref(''),filter=ref('custom'),script=ref(''),name=ref(''),values=ref({}),loading=ref(false),saving=ref(false),executing=ref(false),error=ref(''),listError=ref(''),lastRun=ref(null),armed=ref(false),saveEditorOpen=ref(false)
const recentRuns=ref([]),historyError=ref(''),executionContext=ref('')
const waitingOnTarget=computed(()=>executing.value&&executionContext.value===`${props.roomId}::${props.worldId}`)
let alive=true,loadSequence=0,contextSequence=0,historySequence=0
const commandName=item=>translateBuiltinCommandField(t,te,item,'name')
const commandDescription=item=>translateBuiltinCommandField(t,te,item,'description')
const items=computed(()=>definitions.value.filter(item=>(filter.value==='all'||!item.isBuiltin)&&`${commandName(item)} ${commandDescription(item)} ${item.name} ${item.id}`.toLowerCase().includes(search.value.toLowerCase())))
const template=computed(()=>Boolean(selected.value && (selected.value.isBuiltin || selected.value.scriptMode!=='literal')))
const parameters=computed(()=>template.value?selected.value?.parameters||[]:[])
const argumentsMap=computed(()=>commandArguments(parameters.value,values.value))
const bytes=computed(()=>luaByteLength(script.value.trim()))
const targetLabel=computed(()=>[props.roomName,props.worldName].filter(Boolean).join(' / '))
const canRun=computed(()=>Boolean(props.roomId&&props.worldId&&props.running&&!executing.value&&(template.value?argumentsMap.value!==null:script.value.trim()&&bytes.value<=LUA_MAX_BYTES&&!script.value.includes('\0'))))
const canSave=computed(()=>Boolean(!template.value&&!saving.value&&!executing.value&&name.value.trim()&&script.value.trim()&&bytes.value<=LUA_MAX_BYTES&&!script.value.includes('\0')))
async function load(){const sequence=++loadSequence;loading.value=true;listError.value='';try{const data=await consoleV2API.definitions();if(alive&&sequence===loadSequence)definitions.value=data.items||[]}catch(e){if(alive&&sequence===loadSequence)listError.value=e.message}finally{if(alive&&sequence===loadSequence)loading.value=false}}
async function loadHistory(){
 const sequence=++historySequence,room=props.roomId,world=props.worldId,target=targetLabel.value
 historyError.value=''
 if(!room||!world)return
 try{const data=await consoleV2API.runs(room,{worldId:world,limit:10});if(alive&&sequence===historySequence)recentRuns.value=(data.items||[]).filter(run=>run.status!=='sending').map(run=>({...run,target}))}
 catch(e){if(alive&&sequence===historySequence)historyError.value=e.message}
}
function showRun(run,target){
 lastRun.value={...run,target}
 recentRuns.value=[lastRun.value,...recentRuns.value.filter(item=>item.id!==run.id)].slice(0,10)
}
function updateRun(run){if(lastRun.value?.id===run.id&&run.roomId===props.roomId&&run.worldId===props.worldId)showRun(run,targetLabel.value)}
function runTime(run){return new Date(run.createdAt).toLocaleString()}
function choose(item){selected.value=item;script.value=item.script;name.value=item.name;lastRun.value=null;error.value='';saveEditorOpen.value=false;values.value=Object.fromEntries((item.parameters||[]).map(parameter=>[parameter.name,parameter.name==='player_id'&&props.playerId?props.playerId:parameter.default??(parameter.type==='boolean'?false:'')]))}
function fresh(){selected.value=null;script.value='';name.value='';values.value={};error.value='';lastRun.value=null;saveEditorOpen.value=false}
function example(id){const code=workbenchExample(id,props.playerId);if(!code)return;fresh();script.value=code;name.value=t(`workbench.examples.${id}`)}
function insertPlayer(){const context=luaPlayerContext(props.playerId);if(context){selected.value=null;script.value=context+script.value}}
async function save(){
 if(!canSave.value)return
 const input={name:name.value.trim(),description:selected.value?.description||'',category:selected.value?.category||'custom',script:script.value.trim(),scriptMode:'literal',parameters:[]}
 saving.value=true;error.value=''
 try{const item=selected.value?.id?await consoleV2API.updateDefinition(selected.value.id,input):await consoleV2API.createDefinition(input);if(!alive)return;selected.value=item;await load();saveEditorOpen.value=false;toast.success(t('workbench.commands.saved'))}catch(e){if(alive)error.value=e.message}finally{if(alive)saving.value=false}
}
async function execute(){
 if(!canRun.value)return
 if(!armed.value){armed.value=true;return}
 armed.value=false;executionContext.value=`${props.roomId}::${props.worldId}`;executing.value=true;error.value='';lastRun.value=null
 ++historySequence
 const sequence=contextSequence,target=targetLabel.value,room=props.roomId,world=props.worldId,confirmation=props.roomName
 try{
  const run=template.value?await commandApi.executeCommand(`${room}::${world}`,selected.value.id,argumentsMap.value,confirmation):await commandApi.executeRawCommand(`${room}::${world}`,script.value.trim(),confirmation)
  if(alive&&sequence===contextSequence)showRun(run,target)
 }catch(e){if(alive&&sequence===contextSequence){if(e.run)showRun(e.run,target);else error.value=e.detail||e.message}}
 finally{if(alive)executing.value=false}
}
watch([script,name,values,selected,()=>props.roomId,()=>props.worldId,()=>props.playerId],()=>{armed.value=false},{deep:true})
watch(()=>[props.roomId,props.worldId],()=>{++contextSequence;lastRun.value=null;recentRuns.value=[];error.value='';void loadHistory();if(parameters.value.some(p=>p.name==='player_id'))values.value.player_id=props.playerId||''})
watch(()=>props.playerId,value=>{if(parameters.value.some(p=>p.name==='player_id'))values.value.player_id=value||''})
onMounted(()=>{void load();void loadHistory()})
onBeforeUnmount(()=>{alive=false;++loadSequence;++contextSequence;++historySequence})
</script>
<template>
 <div class="command-workbench grid min-w-0 gap-4 rounded-md border p-3 lg:grid-cols-[14rem_minmax(0,1fr)] lg:p-4">
  <aside class="flex min-w-0 flex-col gap-3">
   <div class="flex items-center justify-between gap-2"><h3 class="text-sm font-medium">{{t('workbench.commands.library')}}</h3><Button size="icon-sm" variant="ghost" :disabled="loading" :aria-label="t('workbench.commands.refresh')" @click="load"><RefreshCw /></Button></div>
   <InputGroup><InputGroupAddon><Search /></InputGroupAddon><InputGroupInput v-model="search" :aria-label="t('workbench.commands.search')" :placeholder="t('workbench.commands.search')" /></InputGroup>
   <ToggleGroup :model-value="filter" @update:model-value="value => { if (value) filter = value }" type="single" variant="outline" class="w-full"><ToggleGroupItem value="custom" class="flex-1">{{t('workbench.commands.custom')}}</ToggleGroupItem><ToggleGroupItem value="all" class="flex-1">{{t('workbench.commands.all')}}</ToggleGroupItem></ToggleGroup>
   <Alert v-if="listError" variant="destructive"><AlertDescription>{{listError}}</AlertDescription></Alert>
   <Spinner v-if="loading" />
   <div v-else-if="items.length" class="flex max-h-48 flex-col gap-1 overflow-y-auto lg:max-h-80">
    <Button v-for="item in items" :key="item.id" :data-command-id="item.id" :variant="selected?.id===item.id?'secondary':'ghost'" class="justify-start" :disabled="executing||saving" :title="commandDescription(item)" @click="choose(item)"><BookOpen data-icon="inline-start" /><span class="truncate">{{commandName(item)}}</span></Button>
   </div>
   <Empty v-else class="p-3"><EmptyHeader><EmptyTitle>{{t('workbench.commands.empty')}}</EmptyTitle></EmptyHeader></Empty>
   <Button variant="outline" :disabled="executing||saving" @click="fresh"><Plus data-icon="inline-start" />{{t('workbench.commands.new')}}</Button>
  </aside>
  <section class="flex min-w-0 flex-col gap-3">
   <div class="flex flex-wrap items-center justify-between gap-2"><h3 class="flex items-center gap-2 text-sm font-medium"><Code class="size-4" />{{template?commandName(selected):t('workbench.commands.editor')}}</h3><Badge variant="outline">{{targetLabel||t('workbench.commands.noTarget')}}</Badge></div>
   <p v-if="template&&selected.description" class="text-sm text-muted-foreground">{{commandDescription(selected)}}</p>
   <template v-if="!template">
    <div class="flex flex-wrap gap-1"><Button v-for="id in ['world','mods','player','give']" :key="id" size="sm" variant="ghost" :disabled="executing||saving||(['player','give'].includes(id)&&!luaPlayerContext(playerId))" @click="example(id)">{{t(`workbench.examples.${id}`)}}</Button></div>
    <FieldGroup>
     <Field :data-invalid="bytes>LUA_MAX_BYTES"><FieldLabel for="workbench-lua">Lua</FieldLabel><Textarea id="workbench-lua" v-model="script" class="min-h-52 max-h-96 font-mono" spellcheck="false" :disabled="executing||saving" :aria-invalid="bytes>LUA_MAX_BYTES" :placeholder="t('workbench.commands.placeholder')" /><FieldDescription class="flex flex-wrap justify-between gap-2"><span>{{t('workbench.commands.serverLua')}}</span><span>{{bytes}} / {{LUA_MAX_BYTES}} B</span></FieldDescription></Field>
    </FieldGroup>
    <div class="flex flex-wrap gap-2"><Button size="sm" variant="outline" :disabled="!luaPlayerContext(playerId)||executing||saving" @click="insertPlayer">{{t('workbench.commands.insertPlayer')}}</Button><Button size="sm" variant="outline" :disabled="executing||saving||!script.trim()" @click="saveEditorOpen=!saveEditorOpen"><Save data-icon="inline-start" />{{t(selected?.id?'workbench.commands.update':'workbench.commands.save')}}</Button></div>
    <FieldGroup v-if="saveEditorOpen" class="rounded-md border p-3"><Field><FieldLabel for="workbench-command-name">{{t('workbench.commands.name')}}</FieldLabel><Input id="workbench-command-name" v-model="name" maxlength="80" :disabled="executing||saving" :placeholder="t('workbench.commands.nameHint')" /><FieldDescription>{{t('workbench.commands.shared')}}</FieldDescription></Field><Button size="sm" class="self-start" :disabled="!canSave" @click="save"><Spinner v-if="saving" data-icon="inline-start" /><Save v-else data-icon="inline-start" />{{t(selected?.id?'workbench.commands.update':'workbench.commands.save')}}</Button></FieldGroup>
   </template>
   <FieldGroup v-else-if="parameters.length" class="grid gap-3 sm:grid-cols-2">
    <Field v-for="parameter in parameters" :key="parameter.name"><FieldLabel :for="`workbench-param-${parameter.name}`">{{translateBuiltinParameterField(t,te,selected,parameter,'label')||parameter.name}}{{parameter.required?' *':''}}</FieldLabel>
     <Select v-if="parameter.type==='enum'" v-model="values[parameter.name]" :disabled="executing"><SelectTrigger :id="`workbench-param-${parameter.name}`" class="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="option in parameter.options" :key="option" :value="option">{{translateBuiltinParameterOption(t,te,selected,parameter,option)}}</SelectItem></SelectGroup></SelectContent></Select>
     <Switch v-else-if="parameter.type==='boolean'" :id="`workbench-param-${parameter.name}`" v-model="values[parameter.name]" :disabled="executing" />
     <Input v-else :id="`workbench-param-${parameter.name}`" v-model="values[parameter.name]" :type="['integer','number'].includes(parameter.type)?'number':'text'" :min="parameter.minimum" :max="parameter.maximum" :step="parameter.type==='integer'?1:'any'" :disabled="executing" />
     <FieldDescription v-if="parameter.description">{{translateBuiltinParameterField(t,te,selected,parameter,'description')}}</FieldDescription>
    </Field>
   </FieldGroup>
   <details v-if="template"><summary class="cursor-pointer text-sm text-muted-foreground">{{t('workbench.commands.viewCode')}}</summary><pre class="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">{{script}}</pre></details>
   <div class="command-action-bar flex flex-wrap items-center justify-between gap-3"><p class="text-xs text-muted-foreground">{{!running?t('workbench.commands.stopped'):armed?t('workbench.commands.confirm',{target:targetLabel}):t('workbench.commands.output')}}</p><div class="flex gap-2"><Button v-if="armed" variant="ghost" @click="armed=false">{{t('workbench.commands.cancel')}}</Button><Button :disabled="!canRun||saving" @click="execute"><Spinner v-if="executing" data-icon="inline-start" /><Play v-else data-icon="inline-start" />{{t(executing?'workbench.commands.executing':armed?'workbench.commands.confirmRun':'workbench.commands.run')}}</Button></div></div>
   <Alert v-if="error" variant="destructive"><AlertTitle>{{t('workbench.commands.failed')}}</AlertTitle><AlertDescription class="break-all">{{error}}</AlertDescription></Alert>
   <CommandRunResult v-if="waitingOnTarget || lastRun" :run="lastRun" :pending="waitingOnTarget" :target="lastRun?.target || targetLabel" @updated="updateRun" />
   <details v-if="recentRuns.length" data-command-history><summary class="cursor-pointer text-sm text-muted-foreground">{{t('workbench.commands.recentRuns')}}</summary><div class="mt-2 flex max-h-52 flex-col gap-1 overflow-y-auto"><Button v-for="run in recentRuns" :key="run.id" :variant="lastRun?.id===run.id?'secondary':'ghost'" class="h-auto justify-between gap-2 py-2 text-left" @click="lastRun=run"><span class="min-w-0 truncate">{{run.name}} · {{runTime(run)}}</span><span class="shrink-0 text-xs">{{t(`workbench.commands.${run.status==='succeeded'?'succeeded':run.status==='failed'?'runFailed':'uncertain'}`)}}</span></Button></div></details>
   <Alert v-if="historyError"><AlertDescription>{{t('workbench.commands.historyFailed')}}<Button variant="ghost" size="sm" @click="loadHistory">{{t('workbench.commands.retryHistory')}}</Button></AlertDescription></Alert>
  </section>
 </div>
</template>

<style scoped>
.command-workbench :deep([data-slot='empty']) { flex: none; min-height: 6rem; }
.command-action-bar { position: sticky; bottom: 0; z-index: 1; border-top: 1px solid var(--border); background: var(--card); padding-block: .5rem; }
</style>
