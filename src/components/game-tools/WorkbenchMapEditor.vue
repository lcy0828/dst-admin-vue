<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { worldMapsV2API } from '@/api/v2'
import { mapClickWorldPoint } from '@/lib/worldMaps.mjs'
import { snapWorkbenchPoint } from '@/lib/workbenchPreferences.mjs'
import DstMapCanvas from '@/components/worlds/DstMapCanvas.vue'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
const props=defineProps({roomId:String,worldId:String,grid:Boolean})
const emit=defineEmits(['point'])
const {t}=useI18n()
const map=ref(null),manifest=ref(null),terrain=ref(''),icons=ref(''),loading=ref(false),error=ref(''),point=ref(null)
let epoch=0,alive=true
function clear(){for(const url of [terrain.value,icons.value])if(url)URL.revokeObjectURL(url);terrain.value='';icons.value='';manifest.value=null;map.value=null;point.value=null}
async function load(){const seq=++epoch;clear();error.value='';if(!props.roomId||!props.worldId)return;loading.value=true
 try{const data=await worldMapsV2API.list(props.roomId);if(!alive||seq!==epoch)return
 const selected=(data.items||[]).filter(m=>m.worldId===props.worldId&&m.status==='succeeded').sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt))[0]
 if(!selected)throw Error(t('workbench.mapEditor.noMap'))
 const [image,sprite,m]=await Promise.all([worldMapsV2API.imageBlob(selected.id,'terrain'),worldMapsV2API.imageBlob(selected.id,'icons'),worldMapsV2API.manifest(selected.id)])
 if(!alive||seq!==epoch)return
 if(m.protocolVersion!=='1'||!selected.sessionId||selected.sourceSha256&&m.sourceSha256!==selected.sourceSha256||!mapClickWorldPoint(m,[0,0]))throw Error(t('workbench.mapEditor.incompleteMap'))
 map.value=selected;manifest.value=m;terrain.value=URL.createObjectURL(image);icons.value=URL.createObjectURL(sprite)
 }catch(e){if(alive&&seq===epoch)error.value=e.message}finally{if(alive&&seq===epoch)loading.value=false}}
const selectedText=computed(()=>point.value?`X ${point.value.x} / Z ${point.value.z}`:t('workbench.mapEditor.pickPoint'))
function select(coordinate){const p=snapWorkbenchPoint(mapClickWorldPoint(manifest.value,coordinate),props.grid);if(!p)return;point.value=p;emit('point',{...p,expected_session:map.value.sessionId})}
watch(()=>[props.roomId,props.worldId],()=>{++epoch;clear();error.value='';loading.value=false})
onBeforeUnmount(()=>{alive=false;++epoch;clear()})
</script>
<template>
 <div class="flex min-w-0 flex-col gap-3 rounded-md border p-3">
  <div class="flex flex-wrap items-center justify-between gap-2"><p class="text-sm">{{selectedText}}</p><Button variant="outline" size="sm" :disabled="loading||!roomId||!worldId" @click="load"><Spinner v-if="loading" data-icon="inline-start" />{{t(manifest?'workbench.mapEditor.reloadMap':'workbench.mapEditor.loadMap')}}</Button></div>
  <Alert v-if="error"><AlertDescription>{{error}}</AlertDescription></Alert>
  <DstMapCanvas v-if="manifest" class="h-96 min-h-80" :manifest="manifest" :terrain-url="terrain" :icons-url="icons" @point-selected="select" />
  <p class="text-xs text-muted-foreground">{{t('workbench.mapEditor.mapHint')}}</p>
 </div>
</template>
