<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, ChevronLeft, ChevronRight, RefreshCw, Search } from '@lucide/vue'
import EntityArtwork from './EntityArtwork.vue'
import { artworkPackV2API, entityCatalogV2API } from '@/api/v2'
import { artworkPackState } from '@/composables/useArtworkPack'
import { cn } from '@/lib/utils'
import { createLatestWorkbenchRead } from '@/lib/workbench.mjs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
const props = defineProps({roomId: {type:String,default:''},worldId:{type:String,default:''},running:Boolean,offline:Boolean,selectedKey:{type:String,default:''}})
const emit = defineEmits(['select'])
const { t } = useI18n()
const query=ref(''), source=ref('all'), result=ref(null), mods=ref([]), loading=ref(false), error=ref(''), started=ref(false), offset=ref(0)
let timer=0
const canRead=computed(()=>props.offline || Boolean(props.roomId && props.worldId && props.running))
const reader = createLatestWorkbenchRead({
 request: ({roomId,worldId,...input},signal) => props.offline ? artworkPackV2API.search(input,{signal}) : entityCatalogV2API.runtimeSearch(roomId,worldId,input,{signal}),
 onResult: value => {result.value=value;mods.value=value.mods||[]},
 onError: e => {result.value=null;error.value=e.message||t('workbench.catalog.failed')},
 onSettled: () => {loading.value=false}
})
function read(nextOffset=0,refresh=false) {
 if (!canRead.value) return
 clearTimeout(timer);started.value=true;offset.value=nextOffset;loading.value=true;error.value=''
 reader.enqueue({roomId:props.roomId,worldId:props.worldId,query:query.value,source:source.value,offset:nextOffset,limit:60,refresh})
}
watch([query,source],()=>{
 reader.invalidate();result.value=null;error.value='';clearTimeout(timer)
 loading.value=started.value&&canRead.value
 if(loading.value)timer=setTimeout(()=>read(),350)
})
watch(()=>[props.roomId,props.worldId,props.running,props.offline],()=>{
 reader.invalidate();clearTimeout(timer);started.value=false;result.value=null;loading.value=false;error.value='';mods.value=[];query.value='';source.value='all';emit('select',null)
 if(props.offline)read()
})
onMounted(()=>{if(props.offline)read()})
onBeforeUnmount(()=>{reader.dispose();clearTimeout(timer)})
</script>
<template>
 <div class="flex min-w-0 flex-col gap-3">
  <FieldGroup :class="cn('grid gap-3', offline ? 'sm:grid-cols-[minmax(0,1fr)_auto]' : 'sm:grid-cols-[minmax(0,1fr)_minmax(10rem,.65fr)_auto]')">
   <Field><FieldLabel class="sr-only" for="runtime-prefab-search">{{t('workbench.catalog.search')}}</FieldLabel><InputGroup><InputGroupAddon><Search /></InputGroupAddon><InputGroupInput id="runtime-prefab-search" v-model="query" :placeholder="t('workbench.catalog.search')" maxlength="100" /></InputGroup></Field>
   <Field v-if="!offline"><FieldLabel class="sr-only">{{t('workbench.catalog.source')}}</FieldLabel><Select v-model="source"><SelectTrigger class="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">{{t('workbench.catalog.all')}}</SelectItem><SelectItem value="vanilla">{{t('workbench.catalog.vanilla')}}</SelectItem><SelectItem value="mods">{{t('workbench.catalog.mods')}}</SelectItem><SelectItem v-for="mod in mods" :key="mod.id" :value="mod.id">{{mod.name}} · {{mod.count}}</SelectItem></SelectGroup></SelectContent></Select></Field>
   <Button variant="outline" :disabled="!canRead || loading" @click="read(0,true)"><Spinner v-if="loading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{t(started?'workbench.catalog.refresh':'workbench.catalog.read')}}</Button>
  </FieldGroup>
  <Alert v-if="error" variant="destructive"><AlertDescription>{{error}}</AlertDescription></Alert>
  <p class="text-xs text-muted-foreground">{{t(offline ? 'workbench.pack.catalogHint' : 'workbench.catalog.note')}}</p>
  <Empty v-if="!result && !loading"><EmptyHeader><EmptyTitle>{{t(canRead?'workbench.catalog.ready':'workbench.catalog.stopped')}}</EmptyTitle><EmptyDescription>{{t('workbench.catalog.readHint')}}</EmptyDescription></EmptyHeader></Empty>
  <div v-if="loading" class="flex items-center gap-2 py-6 text-sm text-muted-foreground" role="status"><Spinner />{{t('workbench.catalog.loading')}}</div>
  <template v-else-if="result">
   <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{{t('workbench.catalog.count',{count:result.total})}}</span><span>{{offline ? t('workbench.pack.gameVersion',{version:artworkPackState?.installed?.gameVersion}) : t('workbench.catalog.observed',{time:new Date(result.observedAt).toLocaleTimeString()})}}</span></div>
   <div v-if="result.items.length" class="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
    <button v-for="item in result.items" :key="item.key" type="button" class="flex min-w-0 cursor-pointer items-center gap-2 rounded-md border p-3 text-left hover:bg-accent focus-visible:outline-ring" :aria-pressed="selectedKey===item.key" @click="emit('select',item)">
     <span class="size-11 shrink-0 overflow-hidden rounded-md bg-muted"><EntityArtwork :entity="item" :room-id="roomId" :world-id="worldId" /></span><span class="flex min-w-0 flex-1 flex-col"><strong class="truncate text-sm">{{item.nameZhCN||item.nameEn||item.id}}</strong><code class="truncate text-xs text-muted-foreground">{{item.id}}</code><span class="truncate text-xs text-muted-foreground">{{item.modName||item.modId||t('workbench.catalog.vanilla')}}</span></span><Check v-if="selectedKey===item.key" class="size-4 shrink-0" />
    </button>
   </div>
   <Empty v-else><EmptyHeader><EmptyTitle>{{t('workbench.catalog.empty')}}</EmptyTitle></EmptyHeader></Empty>
   <div class="flex items-center justify-end gap-2"><Badge variant="outline">{{Math.floor(offset/60)+1}} / {{Math.max(1,Math.ceil(result.total/60))}}</Badge><Button size="icon-sm" variant="outline" :aria-label="t('workbench.catalog.previous')" :disabled="offset===0" @click="read(Math.max(0,offset-60))"><ChevronLeft /></Button><Button size="icon-sm" variant="outline" :aria-label="t('workbench.catalog.next')" :disabled="!result.hasMore" @click="read(offset+60)"><ChevronRight /></Button></div>
  </template>
 </div>
</template>
