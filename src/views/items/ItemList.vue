<template>
  <div class="page-container">
    <el-card class="main-card">
      <template v-slot:header>
<div  class="clearfix">
        <span>物品管理</span>
        <el-button style="float: right; padding: 3px 0" type="text" @click="refreshData" disabled>刷新</el-button>
      </div>
</template>

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
          <el-button type="primary" icon="el-icon-search" @click="handleSearch" disabled>搜索</el-button>
          <el-button icon="el-icon-refresh" @click="resetSearch" disabled>重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 工具栏 -->
      <div class="tool-bar">
        <el-button type="primary" icon="el-icon-plus" @click="handleAdd" disabled title="真实 v2 物品目录接口尚未实现">添加物品</el-button>
        <el-button type="danger" icon="el-icon-delete" :disabled="!hasSelection" @click="handleBatchDelete">批量删除</el-button>
        <el-button type="warning" icon="el-icon-download" @click="exportItems" disabled>导出列表</el-button>
        <el-button type="success" icon="el-icon-upload2" @click="importDialogVisible = true" disabled>导入物品</el-button>
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
            <template v-slot="scope">
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
            <template v-slot="scope">
              <el-tag :type="getItemTypeTag(scope.row.type)">{{ getItemTypeName(scope.row.type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="rarity" label="稀有度" width="100" align="center">
            <template v-slot="scope">
              <el-tag :type="getItemRarityTag(scope.row.rarity)">{{ getItemRarityName(scope.row.rarity) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="stackSize" label="堆叠上限" width="100" align="center"></el-table-column>
          <el-table-column prop="value" label="价值" width="100" align="center">
            <template v-slot="scope">
              {{ scope.row.value }} 金币
            </template>
          </el-table-column>
          <el-table-column prop="weight" label="重量" width="100" align="center">
            <template v-slot="scope">
              {{ scope.row.weight }} 单位
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" align="center">
            <template v-slot="scope">
              <el-button 
                size="mini" 
                type="primary" 
                  icon="el-icon-edit"
                  disabled
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
                  disabled
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
    <el-dialog :title="dialogType === 'add' ? '添加物品' : '编辑物品'" v-model="dialogVisible" width="650px">
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
            <component v-else :is="'el-icon-plus'" class="legacy-icon avatar-uploader-icon" />
          </el-upload>
          <div class="upload-tip">请上传物品图标，建议尺寸 128x128 像素</div>
        </el-form-item>
      </el-form>
      <template v-slot:footer>
<span  class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitItemForm" disabled>确定</el-button>
      </span>
</template>
    </el-dialog>

    <!-- 物品预览对话框 -->
    <el-dialog title="物品预览" v-model="previewVisible" width="500px" center>
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
    <el-dialog title="导入物品" v-model="importDialogVisible" width="500px">
      <el-upload
        class="upload-demo"
        action="#"
        :http-request="importItems"
        :limit="1"
        :on-exceed="handleExceed"
        :file-list="importFileList"
        accept=".json">
        <el-button size="small" type="primary">点击上传</el-button>
        <template v-slot:tip>
<div  class="el-upload__tip">请上传JSON格式的物品数据文件</div>
</template>
      </el-upload>
      <template v-slot:footer>
<span  class="dialog-footer">
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmImport" disabled>确定导入</el-button>
      </span>
</template>
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
      this.itemsList = [];
      this.pagination.total = 0;
      this.loading = false;
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
      this.$message.error('真实后端尚未提供物品目录接口');
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
      this.$message.error('真实后端尚未提供物品创建接口');
    },
    
    handleEdit(item) {
      void item;
      this.$message.error('真实后端尚未提供物品编辑接口');
    },
    
    handlePreview(item) {
      this.previewItem = item;
      this.previewVisible = true;
    },
    
    handleDelete(item) {
      void item;
      this.$message.error('真实后端尚未提供物品删除接口');
    },
    
    handleBatchDelete() {
      this.$message.error('真实后端尚未提供物品删除接口');
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
      this.$message.error('没有真实物品数据可导出');
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
      this.$message.error('真实后端尚未提供物品导入接口');
    },
    
    uploadIcon(options) {
      void options;
      this.$message.error('真实后端尚未提供物品图标接口');
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
      this.$message.error('真实后端尚未提供物品写入接口');
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
      return '';
    }
  }
};
</script>

<style scoped>
.page-container {
  width: 100%;
  min-width: 0;
}

.main-card {
  margin-bottom: 0;
  box-shadow: none;
  border-radius: 4px;
}

.search-form {
  margin-bottom: 16px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-color);
}

.tool-bar {
  margin-bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tool-bar :deep(.el-button) {
  margin: 0;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
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
  border: 1px solid var(--border-color);
}

.item-detail {
  display: flex;
  flex-direction: column;
}

.item-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.item-description {
  font-size: 12px;
  color: var(--text-secondary);
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
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s;
}

.avatar-uploader:hover {
  border-color: var(--primary-color);
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
  color: var(--text-secondary);
  margin-top: 5px;
}

/* 特殊物品属性样式 */
.special-props {
  margin-top: 15px;
  padding: 15px;
  background-color: var(--surface-muted);
  border: 1px solid var(--border-color);
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
  border: 1px solid var(--border-color);
  margin-right: 15px;
}

.preview-title {
  flex: 1;
}

.preview-title h2 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 20px;
  color: var(--text-primary);
}

.preview-tags {
  display: flex;
  gap: 5px;
}

.preview-description {
  color: var(--text-regular);
  line-height: 1.6;
  margin-bottom: 20px;
}

.preview-stats {
  color: var(--text-regular);
  font-size: 14px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px dashed var(--border-color);
}

.stat-row:last-child {
  border-bottom: none;
}

.stat-label {
  color: var(--text-secondary);
  flex: 1;
}

.stat-value {
  color: var(--text-primary);
  font-weight: 500;
  flex: 2;
}

/* 表格样式调整 */
:deep(.el-table) {
  margin-bottom: 20px;
}

:deep(.el-table th) {
  background-color: var(--surface-muted);
}

:deep(.el-table .el-table__row:hover) {
  background-color: var(--surface-muted);
}

/* 表单布局样式 */
:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-input-number) {
  width: 100%;
}

:deep(.el-select) {
  width: 100%;
}

/* 标签样式调整 */
:deep(.el-tag) {
  border-radius: 3px;
}

/* 对话框样式调整 */
:deep(.el-dialog__body) {
  padding: 16px;
}

:deep(.el-dialog__header) {
  padding: 15px 20px;
  background-color: var(--surface-muted);
  border-bottom: 1px solid var(--border-color);
}

:deep(.el-dialog__title) {
  font-size: 16px;
  font-weight: 600;
}

:deep(.el-dialog__footer) {
  padding: 15px 20px;
  border-top: 1px solid var(--border-color);
}

/* 分隔线样式 */
:deep(.el-divider__text) {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-regular);
  background-color: var(--surface-muted);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .search-form {
    display: block;
  }

  .search-form :deep(.el-form-item),
  .search-form :deep(.el-form-item__content),
  .search-form :deep(.el-select),
  .search-form :deep(.el-input) {
    width: 100%;
    margin-right: 0;
  }

  .tool-bar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  
  .tool-bar :deep(.el-button) {
    width: 100%;
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
