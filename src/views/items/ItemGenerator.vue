<template>
  <div class="page-container">
    <header class="page-header">
      <div>
        <h1>物品生成器</h1>
        <p>配置生成规则并预览后端返回的真实物品结果。</p>
      </div>
      <UiButton variant="outline" size="sm" @click="resetGenerator">
        <RotateCcw data-icon="inline-start" />
        重置
      </UiButton>
    </header>

    <Alert>
      <CircleAlert />
      <AlertTitle>物品生成接口尚未实现</AlertTitle>
      <AlertDescription>参数编辑器已保留，但不会在浏览器中伪造物品；后端接口接入后再启用生成、保存和导出。</AlertDescription>
    </Alert>

    <div class="generator-layout">
      <Card class="generator-card">
        <CardHeader>
          <CardTitle>生成参数</CardTitle>
          <CardDescription>设置类型、数量、稀有度和类型专属属性。</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>物品类型</FieldLabel>
              <UiSelect v-model="generatorForm.type" @update:model-value="handleTypeChange">
                <SelectTrigger><SelectValue placeholder="请选择物品类型" /></SelectTrigger>
                <SelectContent><SelectGroup><SelectItem v-for="option in itemTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectGroup></SelectContent>
              </UiSelect>
            </Field>

            <Field>
              <div class="field-heading"><FieldLabel>生成数量</FieldLabel><Badge variant="outline">{{ generatorForm.count }}</Badge></div>
              <UiSlider v-model="countSliderValue" :min="1" :max="50" :step="1" />
            </Field>

            <FieldSet :data-invalid="!isDistributionValid">
              <FieldLegend>稀有度分布</FieldLegend>
              <FieldDescription>四项合计必须为 100%。</FieldDescription>
              <FieldGroup class="slider-stack">
                <Field v-for="option in rarityOptions" :key="option.value">
                  <div class="field-heading"><FieldLabel>{{ option.label }}</FieldLabel><span>{{ generatorForm.rarityDistribution[option.value] }}%</span></div>
                  <UiSlider
                    :model-value="[generatorForm.rarityDistribution[option.value]]"
                    :min="0"
                    :max="100"
                    :step="5"
                    @update:model-value="updateRarityValue(option.value, $event)"
                  />
                </Field>
              </FieldGroup>
              <FieldDescription :class="{ 'distribution-error': !isDistributionValid }">
                总计 {{ distributionTotal }}%{{ isDistributionValid ? '' : '，需要调整为 100%' }}
              </FieldDescription>
            </FieldSet>

            <FieldSet>
              <FieldLegend>属性范围</FieldLegend>
              <div class="range-grid">
                <Field><FieldLabel for="generator-value-min">最小值</FieldLabel><UiInput id="generator-value-min" v-model.number="generatorForm.valueRange.min" type="number" min="0" :max="generatorForm.valueRange.max" /></Field>
                <Field><FieldLabel for="generator-value-max">最大值</FieldLabel><UiInput id="generator-value-max" v-model.number="generatorForm.valueRange.max" type="number" :min="generatorForm.valueRange.min" max="99999" /></Field>
              </div>
            </FieldSet>

            <FieldSet v-if="generatorForm.type === 'weapon'">
              <FieldLegend>武器设置</FieldLegend>
              <FieldGroup>
                <Field><FieldLabel>武器类别</FieldLabel><UiSelect v-model="generatorForm.weaponType"><SelectTrigger><SelectValue placeholder="请选择武器类别" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="option in weaponTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
                <div class="range-grid">
                  <Field><FieldLabel for="generator-damage-min">最低伤害</FieldLabel><UiInput id="generator-damage-min" v-model.number="generatorForm.damageRange.min" type="number" min="1" :max="generatorForm.damageRange.max" /></Field>
                  <Field><FieldLabel for="generator-damage-max">最高伤害</FieldLabel><UiInput id="generator-damage-max" v-model.number="generatorForm.damageRange.max" type="number" :min="generatorForm.damageRange.min" max="9999" /></Field>
                </div>
                <Field><div class="field-heading"><FieldLabel>特效几率</FieldLabel><span>{{ generatorForm.effectChance }}%</span></div><UiSlider v-model="effectChanceValue" :min="0" :max="100" :step="5" /></Field>
              </FieldGroup>
            </FieldSet>

            <FieldSet v-if="generatorForm.type === 'equipment'">
              <FieldLegend>装备设置</FieldLegend>
              <FieldGroup>
                <Field><FieldLabel>装备位置</FieldLabel><UiSelect v-model="generatorForm.equipmentSlot"><SelectTrigger><SelectValue placeholder="请选择装备位置" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="option in equipmentSlotOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
                <div class="range-grid">
                  <Field><FieldLabel for="generator-defense-min">最低防御</FieldLabel><UiInput id="generator-defense-min" v-model.number="generatorForm.defenseRange.min" type="number" min="0" :max="generatorForm.defenseRange.max" /></Field>
                  <Field><FieldLabel for="generator-defense-max">最高防御</FieldLabel><UiInput id="generator-defense-max" v-model.number="generatorForm.defenseRange.max" type="number" :min="generatorForm.defenseRange.min" max="9999" /></Field>
                </div>
                <Field><FieldLabel for="generator-attribute-count">特殊属性数</FieldLabel><UiInput id="generator-attribute-count" v-model.number="generatorForm.attributeCount" type="number" min="0" max="5" /></Field>
              </FieldGroup>
            </FieldSet>

            <FieldSet v-if="generatorForm.type === 'food'">
              <FieldLegend>食物设置</FieldLegend>
              <FieldGroup>
                <div class="range-grid">
                  <Field><FieldLabel for="generator-restore-min">最低恢复</FieldLabel><UiInput id="generator-restore-min" v-model.number="generatorForm.restoreRange.min" type="number" min="1" :max="generatorForm.restoreRange.max" /></Field>
                  <Field><FieldLabel for="generator-restore-max">最高恢复</FieldLabel><UiInput id="generator-restore-max" v-model.number="generatorForm.restoreRange.max" type="number" :min="generatorForm.restoreRange.min" max="100" /></Field>
                </div>
                <Field><FieldLabel for="generator-duration">持续时间（秒）</FieldLabel><UiInput id="generator-duration" v-model.number="generatorForm.duration" type="number" min="0" max="3600" step="30" /></Field>
              </FieldGroup>
            </FieldSet>

            <Accordion type="single" collapsible>
              <AccordionItem value="advanced">
                <AccordionTrigger>高级选项</AccordionTrigger>
                <AccordionContent>
                  <FieldGroup>
                    <Field><div class="field-heading"><FieldLabel>前缀几率</FieldLabel><span>{{ generatorForm.prefixChance }}%</span></div><UiSlider v-model="prefixChanceValue" :min="0" :max="100" :step="5" /></Field>
                    <Field><div class="field-heading"><FieldLabel>后缀几率</FieldLabel><span>{{ generatorForm.suffixChance }}%</span></div><UiSlider v-model="suffixChanceValue" :min="0" :max="100" :step="5" /></Field>
                    <Field data-disabled>
                      <FieldLabel for="generator-seed">自定义种子</FieldLabel>
                      <InputGroup>
                        <InputGroupInput id="generator-seed" v-model="generatorForm.seed" placeholder="留空使用随机种子" disabled />
                        <InputGroupAddon align="inline-end"><UiButton size="icon-xs" variant="ghost" disabled title="生成随机种子" @click="generateRandomSeed"><RefreshCw /></UiButton></InputGroupAddon>
                      </InputGroup>
                    </Field>
                  </FieldGroup>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <UiButton class="generate-button" disabled title="真实物品生成接口尚未实现" @click="generateItems">
              <WandSparkles data-icon="inline-start" />
              生成物品
            </UiButton>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card class="result-card">
        <CardHeader>
          <CardTitle>生成结果</CardTitle>
          <CardDescription>{{ generatedItems.length ? `后端返回 ${generatedItems.length} 个物品` : '等待后端返回真实生成结果。' }}</CardDescription>
          <CardAction v-if="generatedItems.length" class="result-actions">
            <UiButton size="sm" variant="outline" disabled @click="exportGeneratedItems"><Download data-icon="inline-start" />导出</UiButton>
            <UiButton size="sm" disabled @click="saveToInventory"><Plus data-icon="inline-start" />保存到物品库</UiButton>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div v-if="isGenerating" class="result-loading" aria-busy="true">
            <Skeleton v-for="row in 6" :key="row" class="h-11 w-full" />
          </div>
          <div v-else-if="generatedItems.length" class="table-wrap">
            <ShadcnTable>
              <TableHeader><TableRow><TableHead>物品</TableHead><TableHead>类型</TableHead><TableHead>稀有度</TableHead><TableHead>价值</TableHead><TableHead>重量</TableHead><TableHead>堆叠</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow v-for="item in generatedItems" :key="item.id">
                  <TableCell><div class="result-item"><img v-if="item.iconUrl" :src="item.iconUrl" :alt="item.name" /><div><strong>{{ item.name }}</strong><span>{{ item.description }}</span></div></div></TableCell>
                  <TableCell><Badge variant="outline">{{ getItemTypeName(item.type) }}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{{ getItemRarityName(item.rarity) }}</Badge></TableCell>
                  <TableCell>{{ item.value }}</TableCell><TableCell>{{ item.weight }}</TableCell><TableCell>{{ item.stackSize }}</TableCell>
                  <TableCell><div class="table-actions"><UiButton size="icon-sm" variant="ghost" disabled title="编辑物品" @click="editGeneratedItem(item)"><Pencil /></UiButton><UiButton size="icon-sm" variant="ghost" disabled title="保存物品" @click="saveGeneratedItem(item)"><Save /></UiButton></div></TableCell>
                </TableRow>
              </TableBody>
            </ShadcnTable>
          </div>
          <Empty v-else>
            <EmptyHeader><EmptyMedia variant="icon"><PackageOpen /></EmptyMedia><EmptyTitle>暂无生成结果</EmptyTitle><EmptyDescription>物品生成接口接入后，真实结果会显示在这里。</EmptyDescription></EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    </div>

    <UiDialog v-model:open="editDialogVisible">
      <DialogContent class="sm:max-w-2xl">
        <DialogHeader><DialogTitle>编辑物品</DialogTitle><DialogDescription>修改后端返回的物品属性。</DialogDescription></DialogHeader>
        <FieldGroup>
          <Field><FieldLabel for="generated-item-name">物品名称</FieldLabel><UiInput id="generated-item-name" v-model="editItemForm.name" placeholder="请输入物品名称" /></Field>
          <Field><FieldLabel for="generated-item-description">物品描述</FieldLabel><UiTextarea id="generated-item-description" v-model="editItemForm.description" rows="3" placeholder="请输入物品描述" /></Field>
          <div class="range-grid">
            <Field data-disabled><FieldLabel>物品类型</FieldLabel><UiSelect v-model="editItemForm.type" disabled><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="option in itemTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
            <Field><FieldLabel>稀有度</FieldLabel><UiSelect v-model="editItemForm.rarity"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="option in rarityOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
          </div>
          <div class="edit-stat-grid">
            <Field><FieldLabel for="generated-stack">堆叠上限</FieldLabel><UiInput id="generated-stack" v-model.number="editItemForm.stackSize" type="number" min="1" max="9999" /></Field>
            <Field><FieldLabel for="generated-value">价值</FieldLabel><UiInput id="generated-value" v-model.number="editItemForm.value" type="number" min="0" max="99999" /></Field>
            <Field><FieldLabel for="generated-weight">重量</FieldLabel><UiInput id="generated-weight" v-model.number="editItemForm.weight" type="number" min="0" step="0.1" /></Field>
          </div>
          <FieldSet v-if="editItemForm.type === 'weapon'"><FieldLegend>武器属性</FieldLegend><FieldGroup><div class="range-grid"><Field><FieldLabel for="generated-attack">攻击力</FieldLabel><UiInput id="generated-attack" v-model.number="editItemForm.attackPower" type="number" min="1" max="9999" /></Field><Field><FieldLabel for="generated-speed">攻击速度</FieldLabel><UiInput id="generated-speed" v-model.number="editItemForm.attackSpeed" type="number" min="0.1" max="10" step="0.1" /></Field></div><Field><FieldLabel for="generated-weapon-effect">特殊效果</FieldLabel><UiInput id="generated-weapon-effect" v-model="editItemForm.weaponEffect" /></Field></FieldGroup></FieldSet>
          <FieldSet v-if="editItemForm.type === 'equipment'"><FieldLegend>装备属性</FieldLegend><FieldGroup><div class="range-grid"><Field><FieldLabel for="generated-defense">防御力</FieldLabel><UiInput id="generated-defense" v-model.number="editItemForm.defense" type="number" min="0" max="9999" /></Field><Field><FieldLabel for="generated-durability">耐久度</FieldLabel><UiInput id="generated-durability" v-model.number="editItemForm.durability" type="number" min="1" max="9999" /></Field></div><Field><FieldLabel>装备位置</FieldLabel><UiSelect v-model="editItemForm.equipmentSlot"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="option in equipmentSlotOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field></FieldGroup></FieldSet>
          <FieldSet v-if="editItemForm.type === 'food'"><FieldLegend>食物属性</FieldLegend><FieldGroup><div class="range-grid"><Field><FieldLabel for="generated-hunger">饥饿回复</FieldLabel><UiInput id="generated-hunger" v-model.number="editItemForm.hungerRestore" type="number" min="0" max="100" /></Field><Field><FieldLabel for="generated-health">健康回复</FieldLabel><UiInput id="generated-health" v-model.number="editItemForm.healthRestore" type="number" min="0" max="100" /></Field></div><Field><FieldLabel for="generated-food-effect">食用效果</FieldLabel><UiInput id="generated-food-effect" v-model="editItemForm.foodEffect" /></Field></FieldGroup></FieldSet>
        </FieldGroup>
        <DialogFooter><UiButton variant="outline" @click="editDialogVisible = false">取消</UiButton><UiButton disabled @click="submitEditForm">确定</UiButton></DialogFooter>
      </DialogContent>
    </UiDialog>
  </div>
</template>

<script>
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Input as UiInput } from '@/components/ui/input';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider as UiSlider } from '@/components/ui/slider';
import { Table as ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea as UiTextarea } from '@/components/ui/textarea';
import { CircleAlert, Download, PackageOpen, Pencil, Plus, RefreshCw, RotateCcw, Save, WandSparkles } from '@lucide/vue';
import { toast } from 'vue-sonner';

const ITEM_TYPES = [
  { label: '武器', value: 'weapon' }, { label: '工具', value: 'tool' },
  { label: '食物', value: 'food' }, { label: '材料', value: 'material' },
  { label: '装备', value: 'equipment' }
];
const RARITIES = [
  { label: '普通', value: 'common' }, { label: '稀有', value: 'rare' },
  { label: '史诗', value: 'epic' }, { label: '传说', value: 'legendary' }
];
const WEAPON_TYPES = [
  { label: '剑', value: 'sword' }, { label: '斧', value: 'axe' }, { label: '弓', value: 'bow' },
  { label: '法杖', value: 'staff' }, { label: '匕首', value: 'dagger' }
];
const EQUIPMENT_SLOTS = [
  { label: '头部', value: 'head' }, { label: '身体', value: 'body' },
  { label: '腿部', value: 'legs' }, { label: '脚部', value: 'feet' },
  { label: '饰品', value: 'accessory' }
];

function createGeneratorForm() {
  return {
    type: 'weapon', count: 10,
    rarityDistribution: { common: 70, rare: 20, epic: 8, legendary: 2 },
    valueRange: { min: 10, max: 1000 }, weaponType: 'sword',
    damageRange: { min: 10, max: 100 }, effectChance: 30,
    equipmentSlot: 'body', defenseRange: { min: 5, max: 50 }, attributeCount: 2,
    restoreRange: { min: 10, max: 50 }, duration: 60,
    prefixChance: 50, suffixChance: 30, seed: ''
  };
}

export default {
  name: 'ItemGenerator',
  components: {
    Accordion, AccordionContent, AccordionItem, AccordionTrigger, Alert, AlertDescription, AlertTitle,
    Badge, Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle, CircleAlert,
    DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Download, Empty,
    EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle, Field, FieldDescription, FieldGroup,
    FieldLabel, FieldLegend, FieldSet, InputGroup, InputGroupAddon, InputGroupInput, PackageOpen,
    Pencil, Plus, RefreshCw, RotateCcw, Save, SelectContent, SelectGroup, SelectItem, SelectTrigger,
    SelectValue, ShadcnTable, Skeleton, TableBody, TableCell, TableHead, TableHeader, TableRow,
    UiButton, UiDialog, UiInput, UiSelect, UiSlider, UiTextarea, WandSparkles
  },
  data() {
    return {
      itemTypeOptions: ITEM_TYPES,
      rarityOptions: RARITIES,
      weaponTypeOptions: WEAPON_TYPES,
      equipmentSlotOptions: EQUIPMENT_SLOTS,
      generatorForm: createGeneratorForm(),
      isGenerating: false,
      generatedItems: [],
      editDialogVisible: false,
      editItemForm: {},
      editItemIndex: -1
    };
  },
  computed: {
    distributionTotal() {
      const { common, rare, epic, legendary } = this.generatorForm.rarityDistribution;
      return common + rare + epic + legendary;
    },
    isDistributionValid() { return this.distributionTotal === 100; },
    countSliderValue: {
      get() { return [this.generatorForm.count]; },
      set(value) { this.generatorForm.count = Number(value?.[0] ?? 1); }
    },
    effectChanceValue: {
      get() { return [this.generatorForm.effectChance]; },
      set(value) { this.generatorForm.effectChance = Number(value?.[0] ?? 0); }
    },
    prefixChanceValue: {
      get() { return [this.generatorForm.prefixChance]; },
      set(value) { this.generatorForm.prefixChance = Number(value?.[0] ?? 0); }
    },
    suffixChanceValue: {
      get() { return [this.generatorForm.suffixChance]; },
      set(value) { this.generatorForm.suffixChance = Number(value?.[0] ?? 0); }
    }
  },
  methods: {
    resetGenerator() {
      this.generatorForm = createGeneratorForm();
      this.isGenerating = false;
      this.generatedItems = [];
    },
    handleTypeChange() {},
    updateRarityValue(key, value) {
      this.generatorForm.rarityDistribution[key] = Number(value?.[0] ?? 0);
      this.updateRarityDistribution();
    },
    updateRarityDistribution() {
      if (this.distributionTotal <= 100) return;
      const values = this.generatorForm.rarityDistribution;
      const total = this.distributionTotal;
      const normalized = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Math.round((value / total) * 100)]));
      normalized.common += 100 - Object.values(normalized).reduce((sum, value) => sum + value, 0);
      this.generatorForm.rarityDistribution = normalized;
    },
    generateRandomSeed() { toast.error('真实后端尚未提供物品生成接口'); },
    generateItems() { this.generatedItems = []; toast.error('真实后端尚未提供物品生成接口'); },
    exportGeneratedItems() { toast.error('没有真实物品数据可导出'); },
    saveToInventory() { toast.error('真实后端尚未提供物品库接口'); },
    editGeneratedItem(item) {
      this.editItemIndex = this.generatedItems.indexOf(item);
      this.editItemForm = { ...item };
      this.editDialogVisible = true;
    },
    submitEditForm() { toast.error('真实后端尚未提供物品编辑接口'); },
    saveGeneratedItem() { toast.error('真实后端尚未提供物品库接口'); },
    getItemTypeName(type) { return ITEM_TYPES.find(option => option.value === type)?.label || '其他'; },
    getItemRarityName(rarity) { return RARITIES.find(option => option.value === rarity)?.label || '未知'; }
  }
};
</script>

<style scoped>
.page-container { display: flex; width: 100%; min-width: 0; flex-direction: column; gap: 16px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.page-header h1 { margin: 0; color: var(--text-primary); font-size: 22px; line-height: 30px; }
.page-header p { margin: 4px 0 0; color: var(--text-secondary); font-size: 13px; }
.generator-layout { display: grid; grid-template-columns: minmax(320px, 420px) minmax(0, 1fr); align-items: start; gap: 16px; }
.generator-card, .result-card { min-width: 0; }
.field-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.field-heading > span { color: var(--text-secondary); font-size: 12px; font-variant-numeric: tabular-nums; }
.slider-stack { gap: 18px; }
.range-grid, .edit-stat-grid { display: grid; gap: 12px; }
.range-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.edit-stat-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.distribution-error { color: var(--danger-color); }
.generate-button { width: 100%; }
.result-actions, .table-actions { display: flex; align-items: center; gap: 8px; }
.result-loading { display: flex; flex-direction: column; gap: 10px; }
.table-wrap { overflow-x: auto; }
.result-item { display: flex; min-width: 240px; align-items: center; gap: 10px; }
.result-item img { width: 40px; height: 40px; border: 1px solid var(--border-color); border-radius: 4px; object-fit: cover; }
.result-item > div { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.result-item span { max-width: 300px; overflow: hidden; color: var(--text-secondary); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 980px) { .generator-layout { grid-template-columns: 1fr; } }
@media (max-width: 640px) {
  .page-header { flex-direction: column; }
  .range-grid, .edit-stat-grid { grid-template-columns: 1fr; }
}
</style>
