<template>
  <div class="page-container">
    <el-card class="main-card">
      <template v-slot:header>
<div  class="clearfix">
        <span>物品生成器</span>
        <el-button style="float: right; padding: 3px 0" type="text" @click="resetGenerator">重置</el-button>
      </div>
</template>

      <el-row :gutter="20">
        <!-- 左侧生成器控制面板 -->
        <el-col :span="8">
          <div class="generator-panel">
            <h3>生成参数</h3>
            
            <!-- 基本参数设置 -->
            <el-form ref="generatorForm" :model="generatorForm" label-width="100px" size="small">
              <el-form-item label="物品类型">
                <el-select v-model="generatorForm.type" placeholder="请选择物品类型" @change="handleTypeChange">
                  <el-option label="武器" value="weapon"></el-option>
                  <el-option label="工具" value="tool"></el-option>
                  <el-option label="食物" value="food"></el-option>
                  <el-option label="材料" value="material"></el-option>
                  <el-option label="装备" value="equipment"></el-option>
                </el-select>
              </el-form-item>
              
              <el-form-item label="生成数量">
                <el-slider 
                  v-model="generatorForm.count" 
                  :min="1" 
                  :max="50" 
                  :step="1" 
                  show-stops
                  show-input>
                </el-slider>
              </el-form-item>
              
              <el-form-item label="稀有度分布">
                <el-row :gutter="10" class="rarity-sliders">
                  <el-col :span="24">
                    <div class="rarity-row">
                      <span class="rarity-label">普通:</span>
                      <el-slider 
                        v-model="generatorForm.rarityDistribution.common" 
                        :min="0" 
                        :max="100" 
                        :step="5" 
                        @change="updateRarityDistribution">
                      </el-slider>
                      <span class="rarity-value">{{ generatorForm.rarityDistribution.common }}%</span>
                    </div>
                  </el-col>
                  <el-col :span="24">
                    <div class="rarity-row">
                      <span class="rarity-label">稀有:</span>
                      <el-slider 
                        v-model="generatorForm.rarityDistribution.rare" 
                        :min="0" 
                        :max="100" 
                        :step="5" 
                        @change="updateRarityDistribution">
                      </el-slider>
                      <span class="rarity-value">{{ generatorForm.rarityDistribution.rare }}%</span>
                    </div>
                  </el-col>
                  <el-col :span="24">
                    <div class="rarity-row">
                      <span class="rarity-label">史诗:</span>
                      <el-slider 
                        v-model="generatorForm.rarityDistribution.epic" 
                        :min="0" 
                        :max="100" 
                        :step="5" 
                        @change="updateRarityDistribution">
                      </el-slider>
                      <span class="rarity-value">{{ generatorForm.rarityDistribution.epic }}%</span>
                    </div>
                  </el-col>
                  <el-col :span="24">
                    <div class="rarity-row">
                      <span class="rarity-label">传说:</span>
                      <el-slider 
                        v-model="generatorForm.rarityDistribution.legendary" 
                        :min="0" 
                        :max="100" 
                        :step="5" 
                        @change="updateRarityDistribution">
                      </el-slider>
                      <span class="rarity-value">{{ generatorForm.rarityDistribution.legendary }}%</span>
                    </div>
                  </el-col>
                </el-row>
                <div class="distribution-total" :class="{'distribution-error': !isDistributionValid}">
                  总计: {{ distributionTotal }}% {{ isDistributionValid ? '' : '(需要等于100%)' }}
                </div>
              </el-form-item>
              
              <el-form-item label="属性范围">
                <el-row :gutter="10">
                  <el-col :span="12">
                    <el-form-item label="最小值" label-width="60px">
                      <el-input-number v-model="generatorForm.valueRange.min" :min="0" :max="generatorForm.valueRange.max" size="small"></el-input-number>
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="最大值" label-width="60px">
                      <el-input-number v-model="generatorForm.valueRange.max" :min="generatorForm.valueRange.min" :max="99999" size="small"></el-input-number>
                    </el-form-item>
                  </el-col>
                </el-row>
              </el-form-item>
              
              <!-- 武器特定设置 -->
              <div v-if="generatorForm.type === 'weapon'" class="type-specific-settings">
                <el-divider content-position="left">武器设置</el-divider>
                
                <el-form-item label="武器类别">
                  <el-select v-model="generatorForm.weaponType" placeholder="请选择武器类别">
                    <el-option label="剑" value="sword"></el-option>
                    <el-option label="斧" value="axe"></el-option>
                    <el-option label="弓" value="bow"></el-option>
                    <el-option label="法杖" value="staff"></el-option>
                    <el-option label="匕首" value="dagger"></el-option>
                  </el-select>
                </el-form-item>
                
                <el-form-item label="伤害范围">
                  <el-row :gutter="10">
                    <el-col :span="12">
                      <el-form-item label="最小值" label-width="60px">
                        <el-input-number v-model="generatorForm.damageRange.min" :min="1" :max="generatorForm.damageRange.max" size="small"></el-input-number>
                      </el-form-item>
                    </el-col>
                    <el-col :span="12">
                      <el-form-item label="最大值" label-width="60px">
                        <el-input-number v-model="generatorForm.damageRange.max" :min="generatorForm.damageRange.min" :max="9999" size="small"></el-input-number>
                      </el-form-item>
                    </el-col>
                  </el-row>
                </el-form-item>
                
                <el-form-item label="特效几率">
                  <el-slider 
                    v-model="generatorForm.effectChance" 
                    :min="0" 
                    :max="100" 
                    :step="5" 
                    show-input>
                  </el-slider>
                </el-form-item>
              </div>
              
              <!-- 装备特定设置 -->
              <div v-if="generatorForm.type === 'equipment'" class="type-specific-settings">
                <el-divider content-position="left">装备设置</el-divider>
                
                <el-form-item label="装备位置">
                  <el-select v-model="generatorForm.equipmentSlot" placeholder="请选择装备位置">
                    <el-option label="头部" value="head"></el-option>
                    <el-option label="身体" value="body"></el-option>
                    <el-option label="腿部" value="legs"></el-option>
                    <el-option label="脚部" value="feet"></el-option>
                    <el-option label="饰品" value="accessory"></el-option>
                  </el-select>
                </el-form-item>
                
                <el-form-item label="防御范围">
                  <el-row :gutter="10">
                    <el-col :span="12">
                      <el-form-item label="最小值" label-width="60px">
                        <el-input-number v-model="generatorForm.defenseRange.min" :min="0" :max="generatorForm.defenseRange.max" size="small"></el-input-number>
                      </el-form-item>
                    </el-col>
                    <el-col :span="12">
                      <el-form-item label="最大值" label-width="60px">
                        <el-input-number v-model="generatorForm.defenseRange.max" :min="generatorForm.defenseRange.min" :max="9999" size="small"></el-input-number>
                      </el-form-item>
                    </el-col>
                  </el-row>
                </el-form-item>
                
                <el-form-item label="特殊属性数">
                  <el-input-number v-model="generatorForm.attributeCount" :min="0" :max="5" size="small"></el-input-number>
                </el-form-item>
              </div>
              
              <!-- 食物特定设置 -->
              <div v-if="generatorForm.type === 'food'" class="type-specific-settings">
                <el-divider content-position="left">食物设置</el-divider>
                
                <el-form-item label="恢复范围">
                  <el-row :gutter="10">
                    <el-col :span="12">
                      <el-form-item label="最小值" label-width="60px">
                        <el-input-number v-model="generatorForm.restoreRange.min" :min="1" :max="generatorForm.restoreRange.max" size="small"></el-input-number>
                      </el-form-item>
                    </el-col>
                    <el-col :span="12">
                      <el-form-item label="最大值" label-width="60px">
                        <el-input-number v-model="generatorForm.restoreRange.max" :min="generatorForm.restoreRange.min" :max="100" size="small"></el-input-number>
                      </el-form-item>
                    </el-col>
                  </el-row>
                </el-form-item>
                
                <el-form-item label="持续时间">
                  <el-input-number v-model="generatorForm.duration" :min="0" :max="3600" :step="30" size="small">
                    <template v-slot:append>秒</template>
                  </el-input-number>
                </el-form-item>
              </div>
              
              <!-- 高级选项 -->
              <el-collapse>
                <el-collapse-item title="高级选项" name="advanced">
                  <el-form-item label="前缀几率">
                    <el-slider 
                      v-model="generatorForm.prefixChance" 
                      :min="0" 
                      :max="100" 
                      :step="5" 
                      show-input>
                    </el-slider>
                  </el-form-item>
                  
                  <el-form-item label="后缀几率">
                    <el-slider 
                      v-model="generatorForm.suffixChance" 
                      :min="0" 
                      :max="100" 
                      :step="5" 
                      show-input>
                    </el-slider>
                  </el-form-item>
                  
                  <el-form-item label="自定义种子">
                    <el-input v-model="generatorForm.seed" placeholder="留空使用随机种子">
                      <template v-slot:append>
<el-button  icon="el-icon-refresh" @click="generateRandomSeed" disabled title="真实 v2 物品接口尚未实现"></el-button>
</template>
                    </el-input>
                  </el-form-item>
                </el-collapse-item>
              </el-collapse>
              
              <el-form-item>
                <el-button type="primary" @click="generateItems" disabled title="真实 v2 物品接口尚未实现" style="width: 100%">
                  <component :is="'el-icon-magic-stick'" class="legacy-icon" /> 生成物品
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-col>
        
        <!-- 右侧生成结果展示 -->
        <el-col :span="16">
          <div class="result-panel" v-loading="isGenerating">
            <div class="result-header">
              <h3>生成结果 <span v-if="generatedItems.length">（{{ generatedItems.length }}个物品）</span></h3>
              <div class="result-actions" v-if="generatedItems.length">
                <el-button size="small" type="success" icon="el-icon-download" @click="exportGeneratedItems" disabled>导出</el-button>
                <el-button size="small" type="primary" icon="el-icon-plus" @click="saveToInventory" disabled>保存到物品库</el-button>
              </div>
            </div>
            
            <div v-if="!generatedItems.length" class="empty-result">
              <component :is="'el-icon-box'" class="legacy-icon" />
              <p>请设置参数并点击"生成物品"按钮</p>
            </div>
            
            <div v-else class="items-grid">
              <el-card v-for="item in generatedItems" :key="item.id" class="item-card" :class="'rarity-' + item.rarity">
                <div class="item-card-header">
                  <el-image :src="item.iconUrl" class="item-card-icon"></el-image>
                  <div class="item-card-title">
                    <div class="item-card-name">{{ item.name }}</div>
                    <div class="item-card-tags">
                      <el-tag size="mini" :type="getItemTypeTag(item.type)">{{ getItemTypeName(item.type) }}</el-tag>
                      <el-tag size="mini" :type="getItemRarityTag(item.rarity)">{{ getItemRarityName(item.rarity) }}</el-tag>
                    </div>
                  </div>
                </div>
                
                <div class="item-card-description">{{ item.description }}</div>
                
                <div class="item-card-stats">
                  <div class="item-stat-row">
                    <span class="item-stat-label">价值:</span>
                    <span class="item-stat-value">{{ item.value }} 金币</span>
                  </div>
                  <div class="item-stat-row">
                    <span class="item-stat-label">重量:</span>
                    <span class="item-stat-value">{{ item.weight }} 单位</span>
                  </div>
                  <div class="item-stat-row">
                    <span class="item-stat-label">堆叠上限:</span>
                    <span class="item-stat-value">{{ item.stackSize }}</span>
                  </div>
                  
                  <!-- 武器特殊属性 -->
                  <template v-if="item.type === 'weapon'">
                    <div class="item-stat-row item-special-stat">
                      <span class="item-stat-label">攻击力:</span>
                      <span class="item-stat-value">{{ item.attackPower }}</span>
                    </div>
                    <div class="item-stat-row item-special-stat">
                      <span class="item-stat-label">攻击速度:</span>
                      <span class="item-stat-value">{{ item.attackSpeed }}</span>
                    </div>
                    <div class="item-stat-row item-special-stat" v-if="item.weaponEffect">
                      <span class="item-stat-label">特殊效果:</span>
                      <span class="item-stat-value">{{ item.weaponEffect }}</span>
                    </div>
                  </template>
                  
                  <!-- 装备特殊属性 -->
                  <template v-if="item.type === 'equipment'">
                    <div class="item-stat-row item-special-stat">
                      <span class="item-stat-label">防御力:</span>
                      <span class="item-stat-value">{{ item.defense }}</span>
                    </div>
                    <div class="item-stat-row item-special-stat">
                      <span class="item-stat-label">耐久度:</span>
                      <span class="item-stat-value">{{ item.durability }}</span>
                    </div>
                    <div class="item-stat-row item-special-stat">
                      <span class="item-stat-label">装备位置:</span>
                      <span class="item-stat-value">{{ getEquipmentSlotName(item.equipmentSlot) }}</span>
                    </div>
                  </template>
                  
                  <!-- 食物特殊属性 -->
                  <template v-if="item.type === 'food'">
                    <div class="item-stat-row item-special-stat">
                      <span class="item-stat-label">饥饿回复:</span>
                      <span class="item-stat-value">{{ item.hungerRestore }}</span>
                    </div>
                    <div class="item-stat-row item-special-stat">
                      <span class="item-stat-label">健康回复:</span>
                      <span class="item-stat-value">{{ item.healthRestore }}</span>
                    </div>
                    <div class="item-stat-row item-special-stat" v-if="item.foodEffect">
                      <span class="item-stat-label">食用效果:</span>
                      <span class="item-stat-value">{{ item.foodEffect }}</span>
                    </div>
                  </template>
                </div>
                
                <div class="item-card-actions">
                  <el-button size="mini" type="primary" icon="el-icon-edit" @click="editGeneratedItem(item)" disabled>编辑</el-button>
                  <el-button size="mini" type="success" icon="el-icon-plus" @click="saveGeneratedItem(item)" disabled>保存</el-button>
                </div>
              </el-card>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 编辑生成的物品 -->
    <el-dialog title="编辑物品" v-model="editDialogVisible" width="650px">
      <el-form :model="editItemForm" :rules="itemRules" ref="editItemForm" label-width="100px">
        <el-form-item label="物品名称" prop="name">
          <el-input v-model="editItemForm.name" placeholder="请输入物品名称"></el-input>
        </el-form-item>
        <el-form-item label="物品描述" prop="description">
          <el-input type="textarea" v-model="editItemForm.description" rows="3" placeholder="请输入物品描述"></el-input>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="物品类型" prop="type">
              <el-select v-model="editItemForm.type" placeholder="请选择物品类型" disabled style="width: 100%">
                <el-option label="武器" value="weapon"></el-option>
                <el-option label="工具" value="tool"></el-option>
                <el-option label="食物" value="food"></el-option>
                <el-option label="材料" value="material"></el-option>
                <el-option label="装备" value="equipment"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="稀有度" prop="rarity">
              <el-select v-model="editItemForm.rarity" placeholder="请选择稀有度" style="width: 100%">
                <el-option label="普通" value="common"></el-option>
                <el-option label="稀有" value="rare"></el-option>
                <el-option label="史诗" value="epic"></el-option>
                <el-option label="传说" value="legendary"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="堆叠上限" prop="stackSize">
              <el-input-number v-model="editItemForm.stackSize" :min="1" :max="9999" style="width: 100%"></el-input-number>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="价值" prop="value">
              <el-input-number v-model="editItemForm.value" :min="0" :max="99999" style="width: 100%"></el-input-number>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="重量" prop="weight">
              <el-input-number v-model="editItemForm.weight" :min="0" :precision="2" :step="0.1" style="width: 100%"></el-input-number>
            </el-form-item>
          </el-col>
        </el-row>
        
        <!-- 根据不同类型的物品显示不同的编辑字段 -->
        <!-- 武器特殊属性 -->
        <div v-if="editItemForm.type === 'weapon'" class="special-props">
          <el-divider content-position="left">武器属性</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="攻击力" prop="attackPower">
                <el-input-number v-model="editItemForm.attackPower" :min="1" :max="9999" style="width: 100%"></el-input-number>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="攻击速度" prop="attackSpeed">
                <el-input-number v-model="editItemForm.attackSpeed" :min="0.1" :max="10" :step="0.1" :precision="1" style="width: 100%"></el-input-number>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="特殊效果" prop="weaponEffect">
            <el-input v-model="editItemForm.weaponEffect" placeholder="例如：燃烧、冰冻、麻痹等"></el-input>
          </el-form-item>
        </div>
        
        <!-- 装备特殊属性 -->
        <div v-if="editItemForm.type === 'equipment'" class="special-props">
          <el-divider content-position="left">装备属性</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="防御力" prop="defense">
                <el-input-number v-model="editItemForm.defense" :min="0" :max="9999" style="width: 100%"></el-input-number>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="耐久度" prop="durability">
                <el-input-number v-model="editItemForm.durability" :min="1" :max="9999" style="width: 100%"></el-input-number>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="装备位置" prop="equipmentSlot">
            <el-select v-model="editItemForm.equipmentSlot" placeholder="请选择装备位置">
              <el-option label="头部" value="head"></el-option>
              <el-option label="身体" value="body"></el-option>
              <el-option label="腿部" value="legs"></el-option>
              <el-option label="脚部" value="feet"></el-option>
              <el-option label="饰品" value="accessory"></el-option>
            </el-select>
          </el-form-item>
        </div>
        
        <!-- 食物特殊属性 -->
        <div v-if="editItemForm.type === 'food'" class="special-props">
          <el-divider content-position="left">食物属性</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="饥饿回复" prop="hungerRestore">
                <el-input-number v-model="editItemForm.hungerRestore" :min="0" :max="100" style="width: 100%"></el-input-number>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="健康回复" prop="healthRestore">
                <el-input-number v-model="editItemForm.healthRestore" :min="0" :max="100" style="width: 100%"></el-input-number>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="食用效果" prop="foodEffect">
            <el-input v-model="editItemForm.foodEffect" placeholder="例如：体力恢复、防冻等"></el-input>
          </el-form-item>
        </div>
      </el-form>
      <template v-slot:footer>
<span  class="dialog-footer">
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitEditForm" disabled>确定</el-button>
      </span>
</template>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'ItemGenerator',
  data() {
    return {
      // 生成器表单
      generatorForm: {
        type: 'weapon',
        count: 10,
        rarityDistribution: {
          common: 70,
          rare: 20,
          epic: 8,
          legendary: 2
        },
        valueRange: {
          min: 10,
          max: 1000
        },
        // 武器相关设置
        weaponType: 'sword',
        damageRange: {
          min: 10,
          max: 100
        },
        effectChance: 30,
        
        // 装备相关设置
        equipmentSlot: 'body',
        defenseRange: {
          min: 5,
          max: 50
        },
        attributeCount: 2,
        
        // 食物相关设置
        restoreRange: {
          min: 10,
          max: 50
        },
        duration: 60,
        
        // 高级选项
        prefixChance: 50,
        suffixChance: 30,
        seed: ''
      },
      
      // 生成状态
      isGenerating: false,
      
      // 生成的物品列表
      generatedItems: [],
      
      // 编辑对话框
      editDialogVisible: false,
      editItemForm: {},
      editItemIndex: -1,
      
      // 表单验证规则
      itemRules: {
        name: [
          { required: true, message: '请输入物品名称', trigger: 'blur' },
          { min: 1, max: 50, message: '长度在 1 到 50 个字符', trigger: 'blur' }
        ],
        type: [
          { required: true, message: '请选择物品类型', trigger: 'change' }
        ],
        rarity: [
          { required: true, message: '请选择稀有度', trigger: 'change' }
        ],
        stackSize: [
          { required: true, message: '请输入堆叠上限', trigger: 'blur' }
        ],
        value: [
          { required: true, message: '请输入物品价值', trigger: 'blur' }
        ],
        weight: [
          { required: true, message: '请输入物品重量', trigger: 'blur' }
        ]
      }
    };
  },
  computed: {
    // 计算稀有度分布总和
    distributionTotal() {
      const { common, rare, epic, legendary } = this.generatorForm.rarityDistribution;
      return common + rare + epic + legendary;
    },
    
    // 检查稀有度分布是否有效
    isDistributionValid() {
      return this.distributionTotal === 100;
    }
  },
  methods: {
    // 重置生成器
    resetGenerator() {
      this.generatorForm = {
        type: 'weapon',
        count: 10,
        rarityDistribution: {
          common: 70,
          rare: 20,
          epic: 8,
          legendary: 2
        },
        valueRange: {
          min: 10,
          max: 1000
        },
        // 武器相关设置
        weaponType: 'sword',
        damageRange: {
          min: 10,
          max: 100
        },
        effectChance: 30,
        
        // 装备相关设置
        equipmentSlot: 'body',
        defenseRange: {
          min: 5,
          max: 50
        },
        attributeCount: 2,
        
        // 食物相关设置
        restoreRange: {
          min: 10,
          max: 50
        },
        duration: 60,
        
        // 高级选项
        prefixChance: 50,
        suffixChance: 30,
        seed: ''
      };
      this.isGenerating = false;
      this.generatedItems = [];
    },
    // 处理类型变化
    handleTypeChange() {
      // 根据类型设置堆叠上限默认值
      if (this.generatorForm.type === 'weapon' || this.generatorForm.type === 'equipment' || this.generatorForm.type === 'tool') {
        // 这些类型的物品通常不可堆叠
        this.defaultStackSize = 1;
      } else if (this.generatorForm.type === 'food') {
        // 食物通常可以适量堆叠
        this.defaultStackSize = 20;
      } else if (this.generatorForm.type === 'material') {
        // 材料通常可以大量堆叠
        this.defaultStackSize = 99;
      }
    },
    // 更新稀有度分布
    updateRarityDistribution() {
      // 检查总和是否超过100%
      if (this.distributionTotal > 100) {
        // 按比例调整各稀有度
        const excess = this.distributionTotal - 100;
        const { common, rare, epic, legendary } = this.generatorForm.rarityDistribution;
        
        // 根据各稀有度占比来减少
        const totalBeforeAdjustment = this.distributionTotal;
        const commonRatio = common / totalBeforeAdjustment;
        const rareRatio = rare / totalBeforeAdjustment;
        const epicRatio = epic / totalBeforeAdjustment;
        const legendaryRatio = legendary / totalBeforeAdjustment;
        
        this.generatorForm.rarityDistribution.common = Math.round(common - excess * commonRatio);
        this.generatorForm.rarityDistribution.rare = Math.round(rare - excess * rareRatio);
        this.generatorForm.rarityDistribution.epic = Math.round(epic - excess * epicRatio);
        this.generatorForm.rarityDistribution.legendary = Math.round(legendary - excess * legendaryRatio);
        
        // 确保总和为100
        const newTotal = this.generatorForm.rarityDistribution.common + 
                        this.generatorForm.rarityDistribution.rare + 
                        this.generatorForm.rarityDistribution.epic + 
                        this.generatorForm.rarityDistribution.legendary;
        
        if (newTotal !== 100) {
          // 调整common以确保总和为100
          this.generatorForm.rarityDistribution.common += (100 - newTotal);
        }
      }
    },
    // 生成随机种子
    generateRandomSeed() {
      this.$message.error('真实后端尚未提供物品生成接口');
    },
    // 生成物品
    generateItems() {
      this.generatedItems = [];
      this.isGenerating = false;
      this.$message.error('真实后端尚未提供物品生成接口');
    },
    // 生成单个物品
    generateSingleItem(index, seed) {
      // 使用伪随机函数
      const random = () => {
        const x = Math.sin(index + seed.charCodeAt(0) + Date.now()) * 10000;
        return x - Math.floor(x);
      };
      
      // 确定稀有度
      const rarityRoll = random() * 100;
      let rarity = 'common';
      let rarityBonus = 1;
      
      const { common, rare, epic } = this.generatorForm.rarityDistribution;
      
      if (rarityRoll >= common) {
        rarity = 'rare';
        rarityBonus = 1.5;
      }
      if (rarityRoll >= common + rare) {
        rarity = 'epic';
        rarityBonus = 2;
      }
      if (rarityRoll >= common + rare + epic) {
        rarity = 'legendary';
        rarityBonus = 3;
      }
      
      // 生成基本属性
      const value = Math.floor(this.generatorForm.valueRange.min + random() * (this.generatorForm.valueRange.max - this.generatorForm.valueRange.min) * rarityBonus);
      const weight = parseFloat((0.5 + random() * 5).toFixed(2));
      
      // 根据类型生成不同的物品
      let item = {
        id: index + 1,
        itemId: this.generateItemId(this.generatorForm.type),
        name: '',
        description: '',
        type: this.generatorForm.type,
        rarity: rarity,
        value: value,
        weight: weight,
        iconUrl: this.getRandomIconUrl(this.generatorForm.type, rarity),
      };
      
      // 根据物品类型设置特殊属性
      switch (this.generatorForm.type) {
        case 'weapon':
          item = this.generateWeapon(item, random, rarityBonus);
          break;
        case 'equipment':
          item = this.generateEquipment(item, random, rarityBonus);
          break;
        case 'food':
          item = this.generateFood(item, random, rarityBonus);
          break;
        case 'material':
          item = this.generateMaterial(item, random, rarityBonus);
          break;
        case 'tool':
          item = this.generateTool(item, random, rarityBonus);
          break;
      }
      
      // 添加前缀/后缀
      item = this.addPrefixSuffix(item, random);
      
      return item;
    },
    // 生成武器
    generateWeapon(item, random, rarityBonus) {
      const damageMin = this.generatorForm.damageRange.min;
      const damageMax = this.generatorForm.damageRange.max;
      const attackPower = Math.floor((damageMin + random() * (damageMax - damageMin)) * rarityBonus);
      const attackSpeed = parseFloat((0.5 + random() * 2).toFixed(1));
      
      let weaponName = '';
      let description = '';
      
      // 根据武器类型设置名称和描述
      switch (this.generatorForm.weaponType) {
        case 'sword':
          weaponName = this.getRandomName(['钢剑', '长剑', '短剑', '匕首', '大剑', '宽剑', '双手剑']);
          description = '一把锋利的剑，可以造成可观的伤害。';
          break;
        case 'axe':
          weaponName = this.getRandomName(['战斧', '手斧', '双刃斧', '巨斧', '破坏者']);
          description = '沉重的斧头，能够劈开敌人的防御。';
          break;
        case 'bow':
          weaponName = this.getRandomName(['短弓', '长弓', '复合弓', '狩猎弓', '精准射手']);
          description = '远程武器，可以从安全距离攻击敌人。';
          break;
        case 'staff':
          weaponName = this.getRandomName(['法杖', '魔杖', '权杖', '咒术杖', '元素杖']);
          description = '蕴含魔法能量的法杖，可以释放强大的法术。';
          break;
        case 'dagger':
          weaponName = this.getRandomName(['匕首', '短刀', '暗刃', '刺客之刃', '毒牙']);
          description = '锋利的小刀，适合快速攻击和隐蔽暗杀。';
          break;
      }
      
      // 添加特殊效果
      let weaponEffect = '';
      if (random() * 100 < this.generatorForm.effectChance * rarityBonus) {
        const effects = ['燃烧', '冰冻', '麻痹', '中毒', '流血', '眩晕', '削弱', '虚弱', '混乱'];
        weaponEffect = effects[Math.floor(random() * effects.length)];
      }
      
      return {
        ...item,
        name: weaponName,
        description: description,
        stackSize: 1,
        attackPower: attackPower,
        attackSpeed: attackSpeed,
        weaponEffect: weaponEffect
      };
    },
    // 生成装备
    generateEquipment(item, random, rarityBonus) {
      const defenseMin = this.generatorForm.defenseRange.min;
      const defenseMax = this.generatorForm.defenseRange.max;
      const defense = Math.floor((defenseMin + random() * (defenseMax - defenseMin)) * rarityBonus);
      const durability = Math.floor(50 + random() * 450 * rarityBonus);
      
      const equipmentSlot = this.generatorForm.equipmentSlot;
      let equipmentName = '';
      let description = '';
      
      // 根据装备位置设置名称和描述
      switch (equipmentSlot) {
        case 'head':
          equipmentName = this.getRandomName(['头盔', '帽子', '头饰', '头巾', '王冠']);
          description = '保护头部的装备，提供基本的防御力。';
          break;
        case 'body':
          equipmentName = this.getRandomName(['胸甲', '护甲', '锁子甲', '皮甲', '长袍']);
          description = '保护身体的装备，提供最大的防御力。';
          break;
        case 'legs':
          equipmentName = this.getRandomName(['护腿', '腿甲', '裤子', '战裙', '腿环']);
          description = '保护腿部的装备，提供移动时的防御。';
          break;
        case 'feet':
          equipmentName = this.getRandomName(['靴子', '鞋子', '战靴', '护足', '便鞋']);
          description = '保护脚部的装备，提供机动性和防御。';
          break;
        case 'accessory':
          equipmentName = this.getRandomName(['项链', '戒指', '护符', '腰带', '披风']);
          description = '增强能力的配饰，提供额外属性加成。';
          break;
      }
      
      return {
        ...item,
        name: equipmentName,
        description: description,
        stackSize: 1,
        defense: defense,
        durability: durability,
        equipmentSlot: equipmentSlot
      };
    },
    // 生成食物
    generateFood(item, random, rarityBonus) {
      const restoreMin = this.generatorForm.restoreRange.min;
      const restoreMax = this.generatorForm.restoreRange.max;
      const hungerRestore = Math.floor((restoreMin + random() * (restoreMax - restoreMin)) * rarityBonus);
      const healthRestore = Math.floor(hungerRestore * 0.5 * rarityBonus);
      
      const foodNames = ['面包', '肉', '汤', '蛋糕', '派', '烤肉', '炖菜', '水果', '蔬菜', '奶酪'];
      const foodName = foodNames[Math.floor(random() * foodNames.length)];
      const description = '美味的食物，可以恢复饥饿和少量生命值。';
      
      // 添加食物效果
      let foodEffect = '';
      if (random() * 100 < 30 * rarityBonus) {
        const effects = ['体力恢复', '耐力提升', '防冻', '抗热', '夜视', '水下呼吸', '抗毒', '力量提升'];
        foodEffect = effects[Math.floor(random() * effects.length)];
      }
      
      return {
        ...item,
        name: foodName,
        description: description,
        stackSize: 20,
        hungerRestore: hungerRestore,
        healthRestore: healthRestore,
        foodEffect: foodEffect
      };
    },
    // 生成材料
    generateMaterial(item, random) {
      const materialNames = ['铁矿石', '金矿石', '银矿石', '铜矿石', '木材', '皮革', '布料', '宝石', '骨头', '石头'];
      const materialName = materialNames[Math.floor(random() * materialNames.length)];
      const description = '用于制作物品和装备的基础材料。';
      
      return {
        ...item,
        name: materialName,
        description: description,
        stackSize: 99
      };
    },
    // 生成工具
    generateTool(item, random, rarityBonus) {
      const toolNames = ['镐', '斧', '锤', '锄', '铲', '钓竿', '锯', '凿'];
      const toolName = toolNames[Math.floor(random() * toolNames.length)];
      const description = '用于采集资源和构建的工具。';
      const durability = Math.floor(100 + random() * 400 * rarityBonus);
      
      return {
        ...item,
        name: toolName,
        description: description,
        stackSize: 1,
        durability: durability
      };
    },
    // 添加前缀后缀
    addPrefixSuffix(item, random) {
      const prefixes = {
        common: ['普通的', '简单的', '基础的', '粗糙的'],
        rare: ['精良的', '优质的', '强化的', '坚固的'],
        epic: ['卓越的', '超凡的', '华丽的', '精致的'],
        legendary: ['传说的', '神话的', '不朽的', '永恒的']
      };
      
      const suffixes = {
        common: ['', '', ''],
        rare: ['之力', '之触', '之辉'],
        epic: ['之怒', '之魂', '之影'],
        legendary: ['之王', '之神', '之心']
      };
      
      // 添加前缀
      if (random() * 100 < this.generatorForm.prefixChance) {
        const prefix = prefixes[item.rarity][Math.floor(random() * prefixes[item.rarity].length)];
        item.name = prefix + item.name;
      }
      
      // 添加后缀
      if (random() * 100 < this.generatorForm.suffixChance) {
        const suffix = suffixes[item.rarity][Math.floor(random() * suffixes[item.rarity].length)];
        if (suffix) item.name = item.name + suffix;
      }
      
      return item;
    },
    // 随机名称生成
    getRandomName(nameArray) {
      return nameArray[0] || '';
    },
    // 生成物品ID
    generateItemId(type) {
      // 根据物品类型生成ID
      const typePrefix = {
        weapon: 'W',
        tool: 'T',
        food: 'F',
        material: 'M',
        equipment: 'E'
      };
      return typePrefix[type] || '';
    },
    // 导出物品
    exportGeneratedItems() {
      this.$message.error('没有真实物品数据可导出');
    },
    // 保存物品到物品库
    saveToInventory() {
      this.$message.error('真实后端尚未提供物品库接口');
    },
    // 编辑生成的物品
    editGeneratedItem() {
      this.$message.error('真实后端尚未提供物品编辑接口');
    },
    // 保存编辑后的物品
    submitEditForm() {
      this.$message.error('真实后端尚未提供物品编辑接口');
    },
    // 获取物品类型标签
    getItemTypeTag(type) {
      return { weapon: 'danger', tool: 'primary', food: 'success', equipment: 'warning' }[type] || 'info';
    },
    // 获取物品类型名称
    getItemTypeName(type) {
      return { weapon: '武器', tool: '工具', food: '食物', material: '材料', equipment: '装备' }[type] || '其他';
    },
    // 获取物品稀有度标签
    getItemRarityTag(rarity) {
      return { rare: 'primary', epic: 'success', legendary: 'danger' }[rarity] || 'info';
    },
    // 获取物品稀有度名称
    getItemRarityName(rarity) {
      return { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' }[rarity] || '未知';
    },
    // 获取装备槽位名称
    getEquipmentSlotName(slot) {
      return { head: '头部', body: '身体', legs: '腿部', feet: '脚部', accessory: '饰品' }[slot] || '未知';
    },
    // 保存生成的物品
    saveGeneratedItem() {
      this.$message.error('真实后端尚未提供物品库接口');
    }
  }
};
</script>

<style scoped>
.page-container {
  padding: 20px;
}

.main-card {
  margin-bottom: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

/* 生成器面板样式 */
.generator-panel {
  padding: 10px;
  background-color: #f9fafc;
  border-radius: 4px;
  height: 100%;
}

.generator-panel h3 {
  margin-top: 0;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e8ece5;
  color: #27352f;
}

/* 稀有度滑块样式 */
.rarity-sliders {
  margin-bottom: 10px;
}

.rarity-row {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.rarity-label {
  width: 60px;
  text-align: right;
  padding-right: 10px;
  color: #536159;
}

.rarity-value {
  width: 50px;
  text-align: left;
  padding-left: 10px;
  color: #536159;
}

.distribution-total {
  text-align: right;
  color: #4f8a5b;
  font-size: 13px;
  margin-top: 10px;
}

.distribution-error {
  color: #c94f4f;
}

/* 类型特定设置样式 */
.type-specific-settings {
  margin-top: 15px;
  padding: 15px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

/* 生成结果面板样式 */
.result-panel {
  padding: 10px;
  height: 100%;
  min-height: 600px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e8ece5;
}

.result-header h3 {
  margin: 0;
  color: #27352f;
}

.result-actions {
  display: flex;
  gap: 10px;
}

.empty-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #758078;
}

.empty-result i {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-result p {
  font-size: 16px;
}

/* 物品卡片网格样式 */
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.item-card {
  border-radius: 4px;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.item-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
}

.item-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background-color: #758078;
}

.rarity-common::before {
  background-color: #758078;
}

.rarity-rare::before {
  background-color: #d97932;
}

.rarity-epic::before {
  background-color: #4f8a5b;
}

.rarity-legendary::before {
  background-color: #d99b32;
}

.item-card-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.item-card-icon {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  margin-right: 10px;
  border: 1px solid #e8ece5;
}

.item-card-title {
  flex: 1;
}

.item-card-name {
  font-weight: bold;
  margin-bottom: 5px;
  color: #27352f;
}

.item-card-tags {
  display: flex;
  gap: 5px;
}

.item-card-description {
  color: #536159;
  font-size: 13px;
  margin-bottom: 15px;
  min-height: 40px;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.item-card-stats {
  background-color: #f9fafc;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
}

.item-stat-row {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  font-size: 13px;
  border-bottom: 1px dashed #e8ece5;
}

.item-stat-row:last-child {
  border-bottom: none;
}

.item-stat-label {
  color: #758078;
}

.item-stat-value {
  color: #27352f;
  font-weight: 500;
}

.item-special-stat {
  color: #d97932;
}

.item-card-actions {
  display: flex;
  justify-content: space-between;
}

/* 表单样式调整 */
:deep(.el-form-item) {
  margin-bottom: 18px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-select) {
  width: 100%;
}

:deep(.el-slider) {
  margin-top: 10px;
}

:deep(.el-slider__runway) {
  margin: 8px 0;
}

:deep(.el-collapse-item__header) {
  font-weight: 600;
}

:deep(.el-collapse-item__content) {
  padding: 15px 0;
}

:deep(.el-divider__text) {
  background-color: #f9fafc;
  font-weight: 600;
  color: #536159;
}

/* 特殊属性样式 */
.special-props {
  margin-top: 15px;
  padding: 15px;
  background-color: #f9fbfc;
  border-radius: 4px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .items-grid {
    grid-template-columns: repeat(auto-fill, minmax(100%, 1fr));
  }
  
  .result-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .result-actions {
    margin-top: 10px;
  }
}
</style>
