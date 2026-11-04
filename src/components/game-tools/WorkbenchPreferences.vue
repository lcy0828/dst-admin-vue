<script setup>
import { computed } from 'vue'
import { writeWorkbenchPreferences, feedbackModes } from '@/lib/workbenchPreferences.mjs'
import { expansionOptions } from '@/lib/workbenchExpansion.mjs'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
const props=defineProps({modelValue:{type:Object,required:true}}),emit=defineEmits(['update:modelValue'])
const prefs=computed({get:()=>props.modelValue,set:value=>emit('update:modelValue',writeWorkbenchPreferences(value))})
function update(key,value){prefs.value={...prefs.value,[key]:value}}
const switches={showCode:'显示物品代码',grid:'地图选点对齐地块',autoFavoriteEquipment:'快捷操作装备后自动收藏',showModNames:'显示模组来源',moreCategories:'显示建筑、Boss 等更多分类',highlightSelection:'突出显示当前选择',quickFavorites:'显示收藏快捷条',printCommands:'显示将发送的固定指令'}
const shortcuts={batch:'批量生成',cycle:'轮流传送',materials:'获取材料',unlock:'解锁配方',map:'地图生成',announce:'公告数量'}
</script>
<template>
 <FieldGroup class="mt-3">
  <Field><FieldLabel>默认批量数量（1–40）</FieldLabel><Input type="number" :model-value="prefs.quantity" min="1" max="40" @update:model-value="v=>update('quantity',Number(v))" /></Field>
  <Field><FieldLabel>附近操作范围（1–64）</FieldLabel><Input type="number" :model-value="prefs.radius" min="1" max="64" @update:model-value="v=>update('radius',Number(v))" /></Field>
  <Field><FieldLabel>鼠标中键</FieldLabel><Select :model-value="prefs.middleAction" @update:model-value="v=>update('middleAction',v)"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="(name,id) in shortcuts" :key="id" :value="id">{{name}}</SelectItem></SelectGroup></SelectContent></Select><FieldDescription>中键打开对应操作并带入物品，仍须确认。触屏用户可使用每个物品的更多操作菜单。</FieldDescription></Field>
  <Field><FieldLabel>操作完成后的额外提示</FieldLabel><Select :model-value="prefs.feedback" @update:model-value="v=>update('feedback',v)"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="id in feedbackModes" :key="id" :value="id">{{expansionOptions[id]}}</SelectItem></SelectGroup></SelectContent></Select><FieldDescription>游戏内提示只用于主动管理操作；读取查询不会发送公告。关闭提示仍保留执行结果和审计。</FieldDescription></Field>
  <Field v-for="(label,key) in switches" :key="key" orientation="horizontal"><FieldLabel :for="`workbench-setting-${key}`">{{label}}</FieldLabel><Switch :id="`workbench-setting-${key}`" :model-value="prefs[key]" @update:model-value="v=>update(key,v)" /></Field>
  <Alert><AlertDescription>偏好和收藏仅保存在此浏览器，不影响授权和执行限制。模式记忆是另一项明确开启的游戏操作。所有写操作均保留确认，不能用设置关闭。</AlertDescription></Alert>
 </FieldGroup>
</template>
