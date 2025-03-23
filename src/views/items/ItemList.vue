<template>
  <div class="page-container">
    <el-card class="main-card">
      <div slot="header" class="clearfix">
        <span>物品管理</span>
        <el-button style="float: right; padding: 3px 0" type="text" @click="refreshData">刷新</el-button>
      </div>

      <!-- 搜索区域 -->
      <el-form :inline="true" :model="searchForm" class="search-form" size="small">
        <el-form-item label="物品名称">
          <el-input v-model="searchForm.name" placeholder="请输入物品名称"></el-input>
        </el-form-item>
        <el-form-item label="物品类型">
          <el-select v-model="searchForm.type" placeholder="请选择物品类型" clearable>
            <el-option label="武器" value="weapon"></el-option>
            <el-option label="工具" value="tool"></el-option>
            <el-option label="食物" value="food"></el-option>
            <el-option label="材料" value="material"></el-option>
            <el-option label="装备" value="equipment"></el-option>
            <el-option label="其他" value="other"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="稀有度">
          <el-select v-model="searchForm.rarity" placeholder="请选择稀有度" clearable>
            <el-option label="普通" value="common"></el-option>
            <el-option label="稀有" value="rare"></el-option>
            <el-option label="史诗" value="epic"></el-option>
            <el-option label="传说" value="legendary"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜索</el-button>
          <el-button icon="el-icon-refresh" @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 工具栏 -->
      <div class="tool-bar">
        <el-button type="primary" icon="el-icon-plus" @click="handleAdd">添加物品</el-button>
        <el-button type="danger" icon="el-icon-delete" :disabled="!hasSelection" @click="handleBatchDelete">批量删除</el-button>
        <el-button type="warning" icon="el-icon-download" @click="exportItems">导出列表</el-button>
        <el-button type="success" icon="el-icon-upload2" @click="importDialogVisible = true">导入物品</el-button>
      </div>

      <!-- 物品列表 -->
      <div v-loading="loading">
        <el-table
          :data="itemsList"
          border
          stripe
          @selection-change="handleSelectionChange"
          style="width: 100%">
          <el-table-column type="selection" width="55"></el-table-column>
          <el-table-column prop="itemId" label="物品ID" width="100" align="center"></el-table-column>
          <el-table-column prop="name" label="物品名称" min-width="150">
            <template slot-scope="scope">
              <div class="item-info">
                <el-image :src="scope.row.iconUrl" :preview-src-list="[scope.row.iconUrl]" class="item-icon"></el-image>
                <div class="item-detail">
                  <div class="item-name">{{ scope.row.name }}</div>
                  <div class="item-description" v-if="scope.row.description">{{ scope.row.description }}</div>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="type" label="类型" width="100" align="center">
            <template slot-scope="scope">
              <el-tag :type="getItemTypeTag(scope.row.type)">{{ getItemTypeName(scope.row.type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="rarity" label="稀有度" width="100" align="center">
            <template slot-scope="scope">
              <el-tag :type="getItemRarityTag(scope.row.rarity)">{{ getItemRarityName(scope.row.rarity) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="stackSize" label="堆叠上限" width="100" align="center"></el-table-column>
          <el-table-column prop="value" label="价值" width="100" align="center">
            <template slot-scope="scope">
              {{ scope.row.value }} 金币
            </template>
          </el-table-column>
          <el-table-column prop="weight" label="重量" width="100" align="center">
            <template slot-scope="scope">
              {{ scope.row.weight }} 单位
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" align="center">
            <template slot-scope="scope">
              <el-button 
                size="mini" 
                type="primary" 
                icon="el-icon-edit" 
                @click="handleEdit(scope.row)">
                编辑
              </el-button>
              <el-button 
                size="mini" 
                type="success" 
                icon="el-icon-view" 
                @click="handlePreview(scope.row)">
                预览
              </el-button>
              <el-button 
                size="mini" 
                type="danger" 
                icon="el-icon-delete" 
                @click="handleDelete(scope.row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
            :current-page="pagination.currentPage"
            :page-sizes="[10, 20, 50, 100]"
            :page-size="pagination.pageSize"
            layout="total, sizes, prev, pager, next, jumper"
            :total="pagination.total">
          </el-pagination>
        </div>
      </div>
    </el-card>

    <!-- 添加/编辑物品对话框 -->
    <el-dialog :title="dialogType === 'add' ? '添加物品' : '编辑物品'" :visible.sync="dialogVisible" width="650px">
      <el-form :model="itemForm" :rules="itemRules" ref="itemForm" label-width="100px">
        <el-form-item label="物品名称" prop="name">
          <el-input v-model="itemForm.name" placeholder="请输入物品名称"></el-input>
        </el-form-item>
        <el-form-item label="物品描述" prop="description">
          <el-input type="textarea" v-model="itemForm.description" rows="3" placeholder="请输入物品描述"></el-input>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="物品类型" prop="type">
              <el-select v-model="itemForm.type" placeholder="请选择物品类型" style="width: 100%">
                <el-option label="武器" value="weapon"></el-option>
                <el-option label="工具" value="tool"></el-option>
                <el-option label="食物" value="food"></el-option>
                <el-option label="材料" value="material"></el-option>
                <el-option label="装备" value="equipment"></el-option>
                <el-option label="其他" value="other"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="稀有度" prop="rarity">
              <el-select v-model="itemForm.rarity" placeholder="请选择稀有度" style="width: 100%">
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
              <el-input-number v-model="itemForm.stackSize" :min="1" :max="9999" style="width: 100%"></el-input-number>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="价值" prop="value">
              <el-input-number v-model="itemForm.value" :min="0" :max="99999" style="width: 100%"></el-input-number>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="重量" prop="weight">
              <el-input-number v-model="itemForm.weight" :min="0" :precision="2" :step="0.1" style="width: 100%"></el-input-number>
            </el-form-item>
          </el-col>
        </el-row>
        
        <!-- 不同类型物品的特殊属性 -->
        <div v-if="itemForm.type === 'weapon'" class="special-props">
          <el-divider content-position="left">武器属性</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="攻击力" prop="attackPower">
                <el-input-number v-model="itemForm.attackPower" :min="1" :max="9999" style="width: 100%"></el-input-number>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="攻击速度" prop="attackSpeed">
                <el-input-number v-model="itemForm.attackSpeed" :min="0.1" :max="10" :step="0.1" :precision="1" style="width: 100%"></el-input-number>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="特殊效果" prop="weaponEffect">
            <el-input v-model="itemForm.weaponEffect" placeholder="例如：燃烧、冰冻、麻痹等"></el-input>
          </el-form-item>
        </div>
        
        <div v-if="itemForm.type === 'food'" class="special-props">
          <el-divider content-position="left">食物属性</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="饥饿回复" prop="hungerRestore">
                <el-input-number v-model="itemForm.hungerRestore" :min="0" :max="100" style="width: 100%"></el-input-number>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="健康回复" prop="healthRestore">
                <el-input-number v-model="itemForm.healthRestore" :min="0" :max="100" style="width: 100%"></el-input-number>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="食用效果" prop="foodEffect">
            <el-input v-model="itemForm.foodEffect" placeholder="例如：体力恢复、防冻等"></el-input>
          </el-form-item>
        </div>
        
        <div v-if="itemForm.type === 'equipment'" class="special-props">
          <el-divider content-position="left">装备属性</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="防御力" prop="defense">
                <el-input-number v-model="itemForm.defense" :min="0" :max="9999" style="width: 100%"></el-input-number>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="耐久度" prop="durability">
                <el-input-number v-model="itemForm.durability" :min="1" :max="9999" style="width: 100%"></el-input-number>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="装备位置" prop="equipmentSlot">
            <el-select v-model="itemForm.equipmentSlot" placeholder="请选择装备位置">
              <el-option label="头部" value="head"></el-option>
              <el-option label="身体" value="body"></el-option>
              <el-option label="腿部" value="legs"></el-option>
              <el-option label="脚部" value="feet"></el-option>
              <el-option label="饰品" value="accessory"></el-option>
            </el-select>
          </el-form-item>
        </div>
        
        <el-form-item label="图标" prop="iconUrl">
          <el-upload
            class="avatar-uploader"
            action="#"
            :show-file-list="false"
            :http-request="uploadIcon"
            :before-upload="beforeIconUpload">
            <img v-if="itemForm.iconUrl" :src="itemForm.iconUrl" class="avatar">
            <i v-else class="el-icon-plus avatar-uploader-icon"></i>
          </el-upload>
          <div class="upload-tip">请上传物品图标，建议尺寸 128x128 像素</div>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitItemForm">确定</el-button>
      </span>
    </el-dialog>

    <!-- 物品预览对话框 -->
    <el-dialog title="物品预览" :visible.sync="previewVisible" width="500px" center>
      <div class="item-preview" v-if="previewItem">
        <div class="preview-header">
          <el-image :src="previewItem.iconUrl" class="preview-icon"></el-image>
          <div class="preview-title">
            <h2>{{ previewItem.name }}</h2>
            <div class="preview-tags">
              <el-tag :type="getItemTypeTag(previewItem.type)" size="mini">{{ getItemTypeName(previewItem.type) }}</el-tag>
              <el-tag :type="getItemRarityTag(previewItem.rarity)" size="mini">{{ getItemRarityName(previewItem.rarity) }}</el-tag>
            </div>
          </div>
        </div>
        <div class="preview-description">{{ previewItem.description }}</div>
        <el-divider></el-divider>
        <div class="preview-stats">
          <div class="stat-row">
            <span class="stat-label">堆叠上限:</span>
            <span class="stat-value">{{ previewItem.stackSize }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">价值:</span>
            <span class="stat-value">{{ previewItem.value }} 金币</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">重量:</span>
            <span class="stat-value">{{ previewItem.weight }} 单位</span>
          </div>
          
          <!-- 武器特殊属性 -->
          <template v-if="previewItem.type === 'weapon'">
            <el-divider content-position="left">武器属性</el-divider>
            <div class="stat-row">
              <span class="stat-label">攻击力:</span>
              <span class="stat-value">{{ previewItem.attackPower }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">攻击速度:</span>
              <span class="stat-value">{{ previewItem.attackSpeed }}</span>
            </div>
            <div class="stat-row" v-if="previewItem.weaponEffect">
              <span class="stat-label">特殊效果:</span>
              <span class="stat-value">{{ previewItem.weaponEffect }}</span>
            </div>
          </template>
          
          <!-- 食物特殊属性 -->
          <template v-if="previewItem.type === 'food'">
            <el-divider content-position="left">食物属性</el-divider>
            <div class="stat-row">
              <span class="stat-label">饥饿回复:</span>
              <span class="stat-value">{{ previewItem.hungerRestore }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">健康回复:</span>
              <span class="stat-value">{{ previewItem.healthRestore }}</span>
            </div>
            <div class="stat-row" v-if="previewItem.foodEffect">
              <span class="stat-label">食用效果:</span>
              <span class="stat-value">{{ previewItem.foodEffect }}</span>
            </div>
          </template>
          
          <!-- 装备特殊属性 -->
          <template v-if="previewItem.type === 'equipment'">
            <el-divider content-position="left">装备属性</el-divider>
            <div class="stat-row">
              <span class="stat-label">防御力:</span>
              <span class="stat-value">{{ previewItem.defense }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">耐久度:</span>
              <span class="stat-value">{{ previewItem.durability }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">装备位置:</span>
              <span class="stat-value">{{ getEquipmentSlotName(previewItem.equipmentSlot) }}</span>
            </div>
          </template>
        </div>
      </div>
    </el-dialog>

    <!-- 导入物品对话框 -->
    <el-dialog title="导入物品" :visible.sync="importDialogVisible" width="500px">
      <el-upload
        class="upload-demo"
        action="#"
        :http-request="importItems"
        :limit="1"
        :on-exceed="handleExceed"
        :file-list="importFileList"
        accept=".json">
        <el-button size="small" type="primary">点击上传</el-button>
        <div slot="tip" class="el-upload__tip">请上传JSON格式的物品数据文件</div>
      </el-upload>
      <span slot="footer" class="dialog-footer">
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmImport" :disabled="!importFileList.length">确定导入</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'ItemList',
  data() {
    return {
      loading: false,
      // 搜索表单
      searchForm: {
        name: '',
        type: '',
        rarity: ''
      },
      // 物品列表
      itemsList: [],
      // 选中的物品
      selectedItems: [],
      // 分页
      pagination: {
        currentPage: 1,
        pageSize: 10,
        total: 0
      },
      
      // 添加/编辑物品对话框
      dialogVisible: false,
      dialogType: 'add', // 'add' 或 'edit'
      itemForm: {
        id: null,
        itemId: '',
        name: '',
        description: '',
        type: '',
        rarity: 'common',
        stackSize: 99,
        value: 0,
        weight: 0,
        iconUrl: '',
        // 武器特殊属性
        attackPower: 0,
        attackSpeed: 1.0,
        weaponEffect: '',
        // 食物特殊属性
        hungerRestore: 0,
        healthRestore: 0,
        foodEffect: '',
        // 装备特殊属性
        defense: 0,
        durability: 100,
        equipmentSlot: ''
      },
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
      },
      
      // 预览对话框
      previewVisible: false,
      previewItem: null,
      
      // 导入对话框
      importDialogVisible: false,
      importFileList: [],
      importData: null
    };
  },
  computed: {
    hasSelection() {
      return this.selectedItems.length > 0;
    }
  },
  created() {
    this.fetchItemsList();
  },
  methods: {
    fetchItemsList() {
      this.loading = true;
      
      // 模拟从API获取物品列表
      setTimeout(() => {
        // 生成测试数据
        this.itemsList = [
          {
            id: 1,
            itemId: 'W001',
            name: '钢剑',
            description: '锋利的钢制长剑，可造成不俗的伤害。',
            type: 'weapon',
            rarity: 'common',
            stackSize: 1,
            value: 150,
            weight: 3.5,
            iconUrl: 'https://placehold.co/128x128/409EFF/white?text=W1',
            attackPower: 25,
            attackSpeed: 1.2,
            weaponEffect: ''
          },
          {
            id: 2,
            itemId: 'F001',
            name: '烤肉',
            description: '香喷喷的烤肉，恢复大量饥饿值和少量生命值。',
            type: 'food',
            rarity: 'common',
            stackSize: 20,
            value: 10,
            weight: 0.5,
            iconUrl: 'https://placehold.co/128x128/67C23A/white?text=F1',
            hungerRestore: 30,
            healthRestore: 10,
            foodEffect: '短暂体力恢复'
          },
          {
            id: 3,
            itemId: 'M001',
            name: '铁矿石',
            description: '可以冶炼成铁锭的矿石，是制作武器和工具的基础材料。',
            type: 'material',
            rarity: 'common',
            stackSize: 50,
            value: 5,
            weight: 1.2,
            iconUrl: 'https://placehold.co/128x128/909399/white?text=M1'
          },
          {
            id: 4,
            itemId: 'E001',
            name: '皮甲',
            description: '用动物皮革制作的轻型护甲，提供基础防护。',
            type: 'equipment',
            rarity: 'common',
            stackSize: 1,
            value: 100,
            weight: 4.0,
            iconUrl: 'https://placehold.co/128x128/E6A23C/white?text=E1',
            defense: 15,
            durability: 100,
            equipmentSlot: 'body'
          },
          {
            id: 5,
            itemId: 'W002',
            name: '火焰魔杖',
            description: '蕴含火焰魔法的魔杖，可以释放火球术。',
            type: 'weapon',
            rarity: 'rare',
            stackSize: 1,
            value: 500,
            weight: 1.0,
            iconUrl: 'https://placehold.co/128x128/F56C6C/white?text=W2',
            attackPower: 35,
            attackSpeed: 0.8,
            weaponEffect: '燃烧'
          },
          {
            id: 6,
            itemId: 'T001',
            name: '钢镐',
            description: '坚固的挖矿工具，可以高效开采矿石。',
            type: 'tool',
            rarity: 'common',
            stackSize: 1,
            value: 120,
            weight: 2.5,
            iconUrl: 'https://placehold.co/128x128/409EFF/white?text=T1'
          },
          {
            id: 7,
            itemId: 'E002',
            name: '传说之盔',
            description: '传说中英雄佩戴的头盔，提供强大的防护能力。',
            type: 'equipment',
            rarity: 'legendary',
            stackSize: 1,
            value: 2000,
            weight: 2.0,
            iconUrl: 'https://placehold.co/128x128/F56C6C/white?text=E2',
            defense: 50,
            durability: 500,
            equipmentSlot: 'head'
          }
        ];
        
        this.pagination.total = this.itemsList.length;
        this.loading = false;
      }, 800);
    },
    
    refreshData() {
      this.searchForm = {
        name: '',
        type: '',
        rarity: ''
      };
      this.pagination.currentPage = 1;
      this.fetchItemsList();
    },
    
    handleSearch() {
      this.pagination.currentPage = 1;
      this.loading = true;
      
      // 模拟搜索
      setTimeout(() => {
        const { name, type, rarity } = this.searchForm;
        
        // 根据搜索条件过滤物品列表
        const filteredItems = this.itemsList.filter(item => {
          const nameMatch = !name || item.name.toLowerCase().includes(name.toLowerCase());
          const typeMatch = !type || item.type === type;
          const rarityMatch = !rarity || item.rarity === rarity;
          
          return nameMatch && typeMatch && rarityMatch;
        });
        
        this.itemsList = filteredItems;
        this.pagination.total = filteredItems.length;
        this.loading = false;
      }, 500);
    },
    
    resetSearch() {
      this.searchForm = {
        name: '',
        type: '',
        rarity: ''
      };
      this.fetchItemsList();
    },
    
    handleAdd() {
      this.dialogType = 'add';
      this.itemForm = {
        id: null,
        itemId: this.generateItemId(),
        name: '',
        description: '',
        type: '',
        rarity: 'common',
        stackSize: 99,
        value: 0,
        weight: 0,
        iconUrl: '',
        attackPower: 0,
        attackSpeed: 1.0,
        weaponEffect: '',
        hungerRestore: 0,
        healthRestore: 0,
        foodEffect: '',
        defense: 0,
        durability: 100,
        equipmentSlot: ''
      };
      this.dialogVisible = true;
    },
    
    handleEdit(item) {
      this.dialogType = 'edit';
      this.itemForm = JSON.parse(JSON.stringify(item)); // 深拷贝避免直接修改
      this.dialogVisible = true;
    },
    
    handlePreview(item) {
      this.previewItem = item;
      this.previewVisible = true;
    },
    
    handleDelete(item) {
      this.$confirm(`确定要删除物品"${item.name}"吗？此操作不可恢复！`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
        
        // 模拟删除操作
        setTimeout(() => {
          this.itemsList = this.itemsList.filter(i => i.id !== item.id);
          this.pagination.total--;
          
          this.loading = false;
          this.$message({
            type: 'success',
            message: `物品"${item.name}"已删除！`
          });
        }, 500);
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消删除'
        });
      });
    },
    
    handleBatchDelete() {
      if (this.selectedItems.length === 0) return;
      
      this.$confirm(`确定要删除选中的${this.selectedItems.length}个物品吗？此操作不可恢复！`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
        
        // 模拟批量删除操作
        setTimeout(() => {
          const selectedIds = this.selectedItems.map(item => item.id);
          this.itemsList = this.itemsList.filter(item => !selectedIds.includes(item.id));
          this.pagination.total -= selectedIds.length;
          
          this.loading = false;
          this.$message({
            type: 'success',
            message: `已删除${selectedIds.length}个物品！`
          });
        }, 500);
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消删除'
        });
      });
    },
    
    handleSelectionChange(selection) {
      this.selectedItems = selection;
    },
    
    handleSizeChange(size) {
      this.pagination.pageSize = size;
      this.fetchItemsList();
    },
    
    handleCurrentChange(page) {
      this.pagination.currentPage = page;
      this.fetchItemsList();
    },
    
    exportItems() {
      this.loading = true;
      
      // 模拟导出操作
      setTimeout(() => {
        // 准备导出的数据
        const exportData = JSON.stringify(this.itemsList, null, 2);
        
        // 创建Blob对象
        const blob = new Blob([exportData], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        
        // 创建一个a标签用于下载
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'items-export.json');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.loading = false;
        this.$message({
          type: 'success',
          message: '物品列表导出成功！'
        });
      }, 800);
    },
    
    importItems(options) {
      const file = options.file;
      if (!file) return;
      
      // 读取文件内容
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          this.importData = jsonData;
          this.importFileList = [{
            name: file.name,
            size: file.size
          }];
        } catch (error) {
          this.$message.error('无效的JSON文件格式');
          this.importFileList = [];
        }
      };
      reader.readAsText(file);
    },
    
    handleExceed() {
      this.$message.warning('只能上传一个JSON文件');
    },
    
    confirmImport() {
      if (!this.importData) return;
      
      this.loading = true;
      
      // 模拟导入操作
      setTimeout(() => {
        // 为导入的物品生成新ID
        const importedItems = this.importData.map((item, index) => {
          return {
            ...item,
            id: this.itemsList.length + index + 1
          };
        });
        
        this.itemsList = [...this.itemsList, ...importedItems];
        this.pagination.total += importedItems.length;
        
        this.importDialogVisible = false;
        this.importFileList = [];
        this.importData = null;
        
        this.loading = false;
        this.$message({
          type: 'success',
          message: `已成功导入${importedItems.length}个物品！`
        });
      }, 1000);
    },
    
    uploadIcon(options) {
      const file = options.file;
      // 模拟上传图标
      // 在实际应用中，这里应该是上传图片到服务器，然后获取URL
      
      // 使用本地URL预览（仅用于演示）
      const reader = new FileReader();
      reader.onload = (e) => {
        this.itemForm.iconUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    },
    
    beforeIconUpload(file) {
      const isImage = file.type.startsWith('image/');
      const isLt2M = file.size / 1024 / 1024 < 2;
      
      if (!isImage) {
        this.$message.error('上传头像图片只能是图片格式!');
      }
      if (!isLt2M) {
        this.$message.error('上传头像图片大小不能超过 2MB!');
      }
      
      return isImage && isLt2M;
    },
    
    submitItemForm() {
      this.$refs.itemForm.validate((valid) => {
        if (valid) {
          this.loading = true;
          
          if (this.dialogType === 'add') {
            // 模拟添加物品
            setTimeout(() => {
              const newItem = {
                ...this.itemForm,
                id: this.itemsList.length + 1
              };
              
              this.itemsList.unshift(newItem);
              this.pagination.total++;
              
              this.dialogVisible = false;
              this.loading = false;
              
              this.$message({
                type: 'success',
                message: '物品添加成功！'
              });
            }, 800);
          } else {
            // 模拟编辑物品
            setTimeout(() => {
              const index = this.itemsList.findIndex(item => item.id === this.itemForm.id);
              if (index !== -1) {
                this.itemsList[index] = { ...this.itemForm };
              }
              
              this.dialogVisible = false;
              this.loading = false;
              
              this.$message({
                type: 'success',
                message: '物品更新成功！'
              });
            }, 500);
          }
        } else {
          return false;
        }
      });
    },
    
    getItemTypeTag(type) {
      const types = {
        weapon: 'danger',
        tool: 'primary',
        food: 'success',
        material: '',
        equipment: 'warning',
        other: 'info'
      };
      
      return types[type] || 'info';
    },
    
    getItemTypeName(type) {
      const types = {
        weapon: '武器',
        tool: '工具',
        food: '食物',
        material: '材料',
        equipment: '装备',
        other: '其他'
      };
      
      return types[type] || '未知';
    },
    
    getItemRarityTag(rarity) {
      const rarities = {
        common: '',
        rare: 'primary',
        epic: 'success',
        legendary: 'danger'
      };
      
      return rarities[rarity] || '';
    },
    
    getItemRarityName(rarity) {
      const rarities = {
        common: '普通',
        rare: '稀有',
        epic: '史诗',
        legendary: '传说'
      };
      
      return rarities[rarity] || '未知';
    },
    
    getEquipmentSlotName(slot) {
      const slots = {
        head: '头部',
        body: '身体',
        legs: '腿部',
        feet: '脚部',
        accessory: '饰品'
      };
      
      return slots[slot] || '未知';
    },
    
    generateItemId() {
      // 根据物品类型生成ID
      const typePrefix = {
        weapon: 'W',
        tool: 'T',
        food: 'F',
        material: 'M',
        equipment: 'E',
        other: 'O'
      };
      
      // 默认前缀
      const prefix = 'I';
      
      // 随机数
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      
      return `${prefix}${randomNum}`;
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

.search-form {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #EBEEF5;
}

.tool-bar {
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}

/* 物品列表样式 */
.item-info {
  display: flex;
  align-items: center;
}

.item-icon {
  width: 40px;
  height: 40px;
  margin-right: 12px;
  border-radius: 4px;
  border: 1px solid #EBEEF5;
}

.item-detail {
  display: flex;
  flex-direction: column;
}

.item-name {
  font-weight: bold;
  margin-bottom: 4px;
}

.item-description {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* 上传图标样式 */
.avatar-uploader {
  width: 100px;
  height: 100px;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s;
}

.avatar-uploader:hover {
  border-color: #409EFF;
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 100px;
  height: 100px;
  line-height: 100px;
  text-align: center;
}

.avatar {
  width: 100px;
  height: 100px;
  display: block;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

/* 特殊物品属性样式 */
.special-props {
  margin-top: 15px;
  padding: 15px;
  background-color: #f9fbfc;
  border-radius: 4px;
}

/* 物品预览样式 */
.item-preview {
  padding: 10px;
}

.preview-header {
  display: flex;
  margin-bottom: 20px;
}

.preview-icon {
  width: 64px;
  height: 64px;
  border-radius: 4px;
  border: 1px solid #EBEEF5;
  margin-right: 15px;
}

.preview-title {
  flex: 1;
}

.preview-title h2 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 20px;
  color: #303133;
}

.preview-tags {
  display: flex;
  gap: 5px;
}

.preview-description {
  color: #606266;
  line-height: 1.6;
  margin-bottom: 20px;
}

.preview-stats {
  color: #606266;
  font-size: 14px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px dashed #EBEEF5;
}

.stat-row:last-child {
  border-bottom: none;
}

.stat-label {
  color: #909399;
  flex: 1;
}

.stat-value {
  color: #303133;
  font-weight: 500;
  flex: 2;
}

/* 表格样式调整 */
::v-deep .el-table {
  margin-bottom: 20px;
}

::v-deep .el-table th {
  background-color: #f5f7fa;
}

::v-deep .el-table .el-table__row:hover {
  background-color: #f5f7fa;
}

/* 表单布局样式 */
::v-deep .el-form-item__label {
  font-weight: 500;
}

::v-deep .el-input-number {
  width: 100%;
}

::v-deep .el-select {
  width: 100%;
}

/* 标签样式调整 */
::v-deep .el-tag {
  border-radius: 3px;
}

/* 对话框样式调整 */
::v-deep .el-dialog__body {
  padding: 20px 30px 10px;
}

::v-deep .el-dialog__header {
  padding: 15px 20px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #EBEEF5;
}

::v-deep .el-dialog__title {
  font-size: 16px;
  font-weight: 600;
}

::v-deep .el-dialog__footer {
  padding: 15px 20px;
  border-top: 1px solid #EBEEF5;
}

/* 分隔线样式 */
::v-deep .el-divider__text {
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  background-color: #f9fbfc;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .tool-bar {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .tool-bar .el-button {
    width: 100%;
    margin-left: 0;
    margin-bottom: 10px;
  }
  
  .preview-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .preview-icon {
    margin-right: 0;
    margin-bottom: 15px;
  }
}
</style> 