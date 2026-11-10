<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { writeWorkbenchPreferences, feedbackModes } from '@/lib/workbenchPreferences.mjs'
import { expansionLabel } from '@/lib/workbenchExpansion.mjs'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
const props=defineProps({modelValue:{type:Object,required:true}}),emit=defineEmits(['update:modelValue'])
const {t,locale}=useI18n()
const isEn=computed(()=>locale.value.startsWith('en'))
const prefs=computed({get:()=>props.modelValue,set:value=>emit('update:modelValue',writeWorkbenchPreferences(value))})
function update(key,value){prefs.value={...prefs.value,[key]:value}}
const switchKeys=['showCode','grid','autoFavoriteEquipment','showModNames','moreCategories','highlightSelection','quickFavorites','printCommands']
const shortcutKeys=['batch','cycle','materials','unlock','map','announce']
</script>
<template>
 <FieldGroup class="mt-3">
  <Field><FieldLabel>{{t('workbench.preferences.quantityLabel')}}</FieldLabel><Input type="number" :model-value="prefs.quantity" min="1" max="40" @update:model-value="v=>update('quantity',Number(v))" /></Field>
  <Field><FieldLabel>{{t('workbench.preferences.radiusLabel')}}</FieldLabel><Input type="number" :model-value="prefs.radius" min="1" max="64" @update:model-value="v=>update('radius',Number(v))" /></Field>
  <Field><FieldLabel>{{t('workbench.preferences.middleClickLabel')}}</FieldLabel><Select :model-value="prefs.middleAction" @update:model-value="v=>update('middleAction',v)"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="id in shortcutKeys" :key="id" :value="id">{{t(`workbench.preferences.shortcuts.${id}`)}}</SelectItem></SelectGroup></SelectContent></Select><FieldDescription>{{t('workbench.preferences.middleClickHint')}}</FieldDescription></Field>
  <Field><FieldLabel>{{t('workbench.preferences.feedbackLabel')}}</FieldLabel><Select :model-value="prefs.feedback" @update:model-value="v=>update('feedback',v)"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="id in feedbackModes" :key="id" :value="id">{{expansionLabel(id,isEn)}}</SelectItem></SelectGroup></SelectContent></Select><FieldDescription>{{t('workbench.preferences.feedbackHint')}}</FieldDescription></Field>
  <Field v-for="key in switchKeys" :key="key" orientation="horizontal"><FieldLabel :for="`workbench-setting-${key}`">{{t(`workbench.preferences.switches.${key}`)}}</FieldLabel><Switch :id="`workbench-setting-${key}`" :model-value="prefs[key]" @update:model-value="v=>update(key,v)" /></Field>
  <Alert><AlertDescription>{{t('workbench.preferences.browserOnlyNotice')}}</AlertDescription></Alert>
 </FieldGroup>
</template>
