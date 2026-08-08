<template>
  <div class="page-container">
    <Card>
      <CardHeader>
        <CardTitle>物品管理</CardTitle>
        <CardDescription>管理物品目录、属性和导入导出。</CardDescription>
        <CardAction>
          <UiButton variant="outline" size="sm" disabled @click="refreshData">
            <RefreshCw data-icon="inline-start" />
            刷新
          </UiButton>
        </CardAction>
      </CardHeader>
      <CardContent class="content-stack">
        <Alert>
          <CircleAlert />
          <AlertTitle>物品目录接口尚未实现</AlertTitle>
          <AlertDescription>当前后端没有提供物品目录的查询和写入接口，因此本页不会展示或生成模拟数据。</AlertDescription>
        </Alert>

        <FieldGroup class="filter-grid">
          <Field>
            <FieldLabel for="item-name-filter">物品名称</FieldLabel>
            <UiInput id="item-name-filter" v-model="searchForm.name" placeholder="请输入物品名称" disabled />
          </Field>
          <Field>
            <FieldLabel>物品类型</FieldLabel>
            <UiSelect v-model="searchForm.type" disabled>
              <SelectTrigger><SelectValue placeholder="请选择物品类型" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem v-for="option in itemTypeOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </UiSelect>
          </Field>
          <Field>
            <FieldLabel>稀有度</FieldLabel>
            <UiSelect v-model="searchForm.rarity" disabled>
              <SelectTrigger><SelectValue placeholder="请选择稀有度" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem v-for="option in rarityOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </UiSelect>
          </Field>
          <div class="filter-actions">
            <UiButton disabled @click="handleSearch"><Search data-icon="inline-start" />搜索</UiButton>
            <UiButton variant="outline" disabled @click="resetSearch"><RotateCcw data-icon="inline-start" />重置</UiButton>
          </div>
        </FieldGroup>

        <div class="tool-bar">
          <UiButton disabled title="真实物品目录接口尚未实现" @click="handleAdd">
            <Plus data-icon="inline-start" />添加物品
          </UiButton>
          <UiButton variant="destructive" :disabled="!hasSelection" @click="handleBatchDelete">
            <Trash2 data-icon="inline-start" />批量删除
          </UiButton>
          <UiButton variant="outline" disabled @click="exportItems">
            <Download data-icon="inline-start" />导出列表
          </UiButton>
          <UiButton variant="outline" disabled @click="importDialogVisible = true">
            <Upload data-icon="inline-start" />导入物品
          </UiButton>
        </div>

        <div v-if="loading" class="loading-table" aria-busy="true">
          <Skeleton v-for="row in 5" :key="row" class="h-11 w-full" />
        </div>
        <div v-else-if="itemsList.length" class="table-wrap">
          <ShadcnTable>
            <TableHeader>
              <TableRow>
                <TableHead class="selection-cell">选择</TableHead>
                <TableHead>物品 ID</TableHead>
                <TableHead>物品名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>稀有度</TableHead>
                <TableHead>堆叠上限</TableHead>
                <TableHead>价值</TableHead>
                <TableHead>重量</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="item in itemsList" :key="item.id || item.itemId">
                <TableCell>
                  <Checkbox
                    :model-value="isItemSelected(item)"
                    :aria-label="`选择 ${item.name}`"
                    @update:model-value="toggleItemSelection(item, $event)"
                  />
                </TableCell>
                <TableCell>{{ item.itemId }}</TableCell>
                <TableCell>
                  <div class="item-info">
                    <img v-if="item.iconUrl" :src="item.iconUrl" :alt="item.name" class="item-icon" />
                    <div class="item-detail">
                      <strong>{{ item.name }}</strong>
                      <span v-if="item.description">{{ item.description }}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline">{{ getItemTypeName(item.type) }}</Badge></TableCell>
                <TableCell><Badge variant="secondary">{{ getItemRarityName(item.rarity) }}</Badge></TableCell>
                <TableCell>{{ item.stackSize }}</TableCell>
                <TableCell>{{ item.value }} 金币</TableCell>
                <TableCell>{{ item.weight }} 单位</TableCell>
                <TableCell>
                  <div class="row-actions">
                    <UiButton size="icon-sm" variant="ghost" disabled title="编辑物品" @click="handleEdit(item)"><Pencil /></UiButton>
                    <UiButton size="icon-sm" variant="ghost" title="预览物品" @click="handlePreview(item)"><Eye /></UiButton>
                    <UiButton size="icon-sm" variant="destructive" disabled title="删除物品" @click="handleDelete(item)"><Trash2 /></UiButton>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </ShadcnTable>
        </div>
        <Empty v-else>
          <EmptyHeader>
            <EmptyMedia variant="icon"><PackageOpen /></EmptyMedia>
            <EmptyTitle>暂无真实物品数据</EmptyTitle>
            <EmptyDescription>后端物品目录接口接入后，数据会显示在这里。</EmptyDescription>
          </EmptyHeader>
        </Empty>

        <div v-if="pagination.total > 0" class="pagination-row">
          <div class="page-size-control">
            <span>每页</span>
            <UiSelect :model-value="String(pagination.pageSize)" @update:model-value="handleSizeChange(Number($event))">
              <SelectTrigger class="page-size-trigger"><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem v-for="size in [10, 20, 50, 100]" :key="size" :value="String(size)">{{ size }}</SelectItem></SelectGroup></SelectContent>
            </UiSelect>
            <span>共 {{ pagination.total }} 条</span>
          </div>
          <Pagination v-model:page="pagination.currentPage" :total="pagination.total" :items-per-page="pagination.pageSize" show-edges @update:page="handleCurrentChange">
            <PaginationContent v-slot="{ items }">
              <PaginationPrevious />
              <template v-for="(item, index) in items" :key="index">
                <PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === pagination.currentPage">{{ item.value }}</PaginationItem>
                <PaginationEllipsis v-else :index="index" />
              </template>
              <PaginationNext />
            </PaginationContent>
          </Pagination>
        </div>
      </CardContent>
    </Card>

    <UiDialog v-model:open="dialogVisible">
      <DialogContent class="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{{ dialogType === 'add' ? '添加物品' : '编辑物品' }}</DialogTitle>
          <DialogDescription>后端写入接口接入后可提交以下物品属性。</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field><FieldLabel for="item-name">物品名称</FieldLabel><UiInput id="item-name" v-model="itemForm.name" placeholder="请输入物品名称" /></Field>
          <Field><FieldLabel for="item-description">物品描述</FieldLabel><UiTextarea id="item-description" v-model="itemForm.description" rows="3" placeholder="请输入物品描述" /></Field>
          <div class="form-grid two-columns">
            <Field><FieldLabel>物品类型</FieldLabel><UiSelect v-model="itemForm.type"><SelectTrigger><SelectValue placeholder="请选择物品类型" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="option in itemTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
            <Field><FieldLabel>稀有度</FieldLabel><UiSelect v-model="itemForm.rarity"><SelectTrigger><SelectValue placeholder="请选择稀有度" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="option in rarityOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
          </div>
          <div class="form-grid three-columns">
            <Field><FieldLabel for="item-stack-size">堆叠上限</FieldLabel><UiInput id="item-stack-size" v-model.number="itemForm.stackSize" type="number" min="1" max="9999" /></Field>
            <Field><FieldLabel for="item-value">价值</FieldLabel><UiInput id="item-value" v-model.number="itemForm.value" type="number" min="0" max="99999" /></Field>
            <Field><FieldLabel for="item-weight">重量</FieldLabel><UiInput id="item-weight" v-model.number="itemForm.weight" type="number" min="0" step="0.1" /></Field>
          </div>

          <FieldSet v-if="itemForm.type === 'weapon'">
            <FieldLegend>武器属性</FieldLegend>
            <FieldGroup>
              <div class="form-grid two-columns">
                <Field><FieldLabel for="item-attack">攻击力</FieldLabel><UiInput id="item-attack" v-model.number="itemForm.attackPower" type="number" min="1" max="9999" /></Field>
                <Field><FieldLabel for="item-speed">攻击速度</FieldLabel><UiInput id="item-speed" v-model.number="itemForm.attackSpeed" type="number" min="0.1" max="10" step="0.1" /></Field>
              </div>
              <Field><FieldLabel for="item-weapon-effect">特殊效果</FieldLabel><UiInput id="item-weapon-effect" v-model="itemForm.weaponEffect" placeholder="例如：燃烧、冰冻、麻痹等" /></Field>
            </FieldGroup>
          </FieldSet>

          <FieldSet v-if="itemForm.type === 'food'">
            <FieldLegend>食物属性</FieldLegend>
            <FieldGroup>
              <div class="form-grid two-columns">
                <Field><FieldLabel for="item-hunger">饥饿回复</FieldLabel><UiInput id="item-hunger" v-model.number="itemForm.hungerRestore" type="number" min="0" max="100" /></Field>
                <Field><FieldLabel for="item-health">健康回复</FieldLabel><UiInput id="item-health" v-model.number="itemForm.healthRestore" type="number" min="0" max="100" /></Field>
              </div>
              <Field><FieldLabel for="item-food-effect">食用效果</FieldLabel><UiInput id="item-food-effect" v-model="itemForm.foodEffect" placeholder="例如：体力恢复、防冻等" /></Field>
            </FieldGroup>
          </FieldSet>

          <FieldSet v-if="itemForm.type === 'equipment'">
            <FieldLegend>装备属性</FieldLegend>
            <FieldGroup>
              <div class="form-grid two-columns">
                <Field><FieldLabel for="item-defense">防御力</FieldLabel><UiInput id="item-defense" v-model.number="itemForm.defense" type="number" min="0" max="9999" /></Field>
                <Field><FieldLabel for="item-durability">耐久度</FieldLabel><UiInput id="item-durability" v-model.number="itemForm.durability" type="number" min="1" max="9999" /></Field>
              </div>
              <Field><FieldLabel>装备位置</FieldLabel><UiSelect v-model="itemForm.equipmentSlot"><SelectTrigger><SelectValue placeholder="请选择装备位置" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="option in equipmentSlotOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
            </FieldGroup>
          </FieldSet>

          <Field data-disabled>
            <FieldLabel for="item-icon">图标</FieldLabel>
            <UiInput id="item-icon" type="file" accept="image/*" disabled />
            <FieldDescription>物品图标接口尚未实现，建议尺寸 128 x 128 像素。</FieldDescription>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <UiButton variant="outline" @click="dialogVisible = false">取消</UiButton>
          <UiButton disabled @click="submitItemForm">确定</UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="previewVisible">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader><DialogTitle>物品预览</DialogTitle><DialogDescription>查看物品目录中的完整属性。</DialogDescription></DialogHeader>
        <div v-if="previewItem" class="item-preview">
          <div class="preview-header">
            <img v-if="previewItem.iconUrl" :src="previewItem.iconUrl" :alt="previewItem.name" class="preview-icon" />
            <div><h2>{{ previewItem.name }}</h2><div class="preview-tags"><Badge variant="outline">{{ getItemTypeName(previewItem.type) }}</Badge><Badge variant="secondary">{{ getItemRarityName(previewItem.rarity) }}</Badge></div></div>
          </div>
          <p>{{ previewItem.description }}</p>
          <Separator />
          <dl class="preview-stats">
            <div><dt>堆叠上限</dt><dd>{{ previewItem.stackSize }}</dd></div>
            <div><dt>价值</dt><dd>{{ previewItem.value }} 金币</dd></div>
            <div><dt>重量</dt><dd>{{ previewItem.weight }} 单位</dd></div>
            <template v-if="previewItem.type === 'weapon'"><div><dt>攻击力</dt><dd>{{ previewItem.attackPower }}</dd></div><div><dt>攻击速度</dt><dd>{{ previewItem.attackSpeed }}</dd></div><div v-if="previewItem.weaponEffect"><dt>特殊效果</dt><dd>{{ previewItem.weaponEffect }}</dd></div></template>
            <template v-if="previewItem.type === 'food'"><div><dt>饥饿回复</dt><dd>{{ previewItem.hungerRestore }}</dd></div><div><dt>健康回复</dt><dd>{{ previewItem.healthRestore }}</dd></div><div v-if="previewItem.foodEffect"><dt>食用效果</dt><dd>{{ previewItem.foodEffect }}</dd></div></template>
            <template v-if="previewItem.type === 'equipment'"><div><dt>防御力</dt><dd>{{ previewItem.defense }}</dd></div><div><dt>耐久度</dt><dd>{{ previewItem.durability }}</dd></div><div><dt>装备位置</dt><dd>{{ getEquipmentSlotName(previewItem.equipmentSlot) }}</dd></div></template>
          </dl>
        </div>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="importDialogVisible">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader><DialogTitle>导入物品</DialogTitle><DialogDescription>物品导入接口接入后，可上传 JSON 格式的物品数据。</DialogDescription></DialogHeader>
        <Field data-disabled><FieldLabel for="item-import">物品数据文件</FieldLabel><UiInput id="item-import" type="file" accept=".json" disabled /><FieldDescription>当前后端尚未提供导入接口。</FieldDescription></Field>
        <DialogFooter><UiButton variant="outline" @click="importDialogVisible = false">取消</UiButton><UiButton disabled @click="confirmImport">确定导入</UiButton></DialogFooter>
      </DialogContent>
    </UiDialog>
  </div>
</template>

<script>
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table as ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea as UiTextarea } from '@/components/ui/textarea';
import { CircleAlert, Download, Eye, PackageOpen, Pencil, Plus, RefreshCw, RotateCcw, Search, Trash2, Upload } from '@lucide/vue';
import { toast } from 'vue-sonner';

const ITEM_TYPES = [
  { label: '武器', value: 'weapon' }, { label: '工具', value: 'tool' },
  { label: '食物', value: 'food' }, { label: '材料', value: 'material' },
  { label: '装备', value: 'equipment' }, { label: '其他', value: 'other' }
];
const RARITIES = [
  { label: '普通', value: 'common' }, { label: '稀有', value: 'rare' },
  { label: '史诗', value: 'epic' }, { label: '传说', value: 'legendary' }
];
const EQUIPMENT_SLOTS = [
  { label: '头部', value: 'head' }, { label: '身体', value: 'body' },
  { label: '腿部', value: 'legs' }, { label: '脚部', value: 'feet' },
  { label: '饰品', value: 'accessory' }
];

function createItemForm() {
  return {
    id: null, itemId: '', name: '', description: '', type: '', rarity: 'common',
    stackSize: 99, value: 0, weight: 0, iconUrl: '', attackPower: 0,
    attackSpeed: 1, weaponEffect: '', hungerRestore: 0, healthRestore: 0,
    foodEffect: '', defense: 0, durability: 100, equipmentSlot: ''
  };
}

export default {
  name: 'ItemList',
  components: {
    Alert, AlertDescription, AlertTitle, Badge, Card, CardAction, CardContent, CardDescription,
    CardHeader, CardTitle, Checkbox, CircleAlert, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, Download, Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle,
    Eye, Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet, PackageOpen,
    Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationNext, PaginationPrevious,
    Pencil, Plus, RefreshCw, RotateCcw, Search, SelectContent, SelectGroup, SelectItem, SelectTrigger,
    SelectValue, Separator, ShadcnTable, Skeleton, TableBody, TableCell, TableHead, TableHeader, TableRow,
    Trash2, UiButton, UiDialog, UiInput, UiSelect, UiTextarea, Upload
  },
  data() {
    return {
      loading: false,
      itemTypeOptions: ITEM_TYPES,
      rarityOptions: RARITIES,
      equipmentSlotOptions: EQUIPMENT_SLOTS,
      searchForm: { name: '', type: '', rarity: '' },
      itemsList: [],
      selectedItems: [],
      pagination: { currentPage: 1, pageSize: 10, total: 0 },
      dialogVisible: false,
      dialogType: 'add',
      itemForm: createItemForm(),
      previewVisible: false,
      previewItem: null,
      importDialogVisible: false
    };
  },
  computed: {
    hasSelection() { return this.selectedItems.length > 0; }
  },
  created() { this.fetchItemsList(); },
  methods: {
    fetchItemsList() {
      this.itemsList = [];
      this.pagination.total = 0;
      this.loading = false;
    },
    refreshData() { this.resetSearch(); },
    handleSearch() { toast.error('真实后端尚未提供物品目录接口'); },
    resetSearch() {
      this.searchForm = { name: '', type: '', rarity: '' };
      this.pagination.currentPage = 1;
      this.fetchItemsList();
    },
    handleAdd() { toast.error('真实后端尚未提供物品创建接口'); },
    handleEdit() { toast.error('真实后端尚未提供物品编辑接口'); },
    handlePreview(item) { this.previewItem = item; this.previewVisible = true; },
    handleDelete() { toast.error('真实后端尚未提供物品删除接口'); },
    handleBatchDelete() { toast.error('真实后端尚未提供物品删除接口'); },
    isItemSelected(item) { return this.selectedItems.includes(item); },
    toggleItemSelection(item, selected) {
      if (selected === true && !this.isItemSelected(item)) this.selectedItems.push(item);
      if (selected !== true) this.selectedItems = this.selectedItems.filter(current => current !== item);
    },
    handleSizeChange(size) { this.pagination.pageSize = size; this.fetchItemsList(); },
    handleCurrentChange(page) { this.pagination.currentPage = page; this.fetchItemsList(); },
    exportItems() { toast.error('没有真实物品数据可导出'); },
    confirmImport() { toast.error('真实后端尚未提供物品导入接口'); },
    submitItemForm() { toast.error('真实后端尚未提供物品写入接口'); },
    getItemTypeName(type) { return ITEM_TYPES.find(option => option.value === type)?.label || '未知'; },
    getItemRarityName(rarity) { return RARITIES.find(option => option.value === rarity)?.label || '未知'; },
    getEquipmentSlotName(slot) { return EQUIPMENT_SLOTS.find(option => option.value === slot)?.label || '未知'; }
  }
};
</script>

<style scoped>
.page-container { width: 100%; min-width: 0; }
.content-stack, .loading-table { display: flex; flex-direction: column; gap: 16px; }
.filter-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) auto; align-items: end; }
.filter-actions, .tool-bar, .row-actions, .preview-tags, .page-size-control { display: flex; align-items: center; gap: 8px; }
.tool-bar { flex-wrap: wrap; }
.table-wrap { overflow-x: auto; }
.selection-cell { width: 64px; }
.item-info { display: flex; min-width: 220px; align-items: center; gap: 10px; }
.item-icon { width: 40px; height: 40px; border: 1px solid var(--border-color); border-radius: 4px; object-fit: cover; }
.item-detail { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.item-detail span { max-width: 280px; overflow: hidden; color: var(--text-secondary); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.pagination-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.page-size-trigger { width: 90px; }
.form-grid { display: grid; gap: 16px; }
.two-columns { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.three-columns { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.item-preview { display: flex; flex-direction: column; gap: 16px; }
.preview-header { display: flex; align-items: center; gap: 14px; }
.preview-header h2 { margin: 0 0 8px; font-size: 18px; }
.preview-icon { width: 64px; height: 64px; border: 1px solid var(--border-color); border-radius: 4px; object-fit: cover; }
.preview-stats { display: flex; flex-direction: column; margin: 0; }
.preview-stats > div { display: grid; grid-template-columns: minmax(100px, 1fr) 2fr; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border-color); }
.preview-stats dt, .preview-stats dd { margin: 0; }
.preview-stats dt { color: var(--text-secondary); }
@media (max-width: 900px) { .filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) {
  .filter-grid, .two-columns, .three-columns { grid-template-columns: 1fr; }
  .filter-actions, .filter-actions > button { width: 100%; }
  .tool-bar { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
