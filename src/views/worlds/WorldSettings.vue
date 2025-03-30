<template>
  <div class="world-settings-page">
    <div class="page-header">
      <h2>{{ isEdit ? '编辑存档' : '创建存档' }}</h2>
      <div class="header-actions">
        <el-button @click="goBack">返回列表</el-button>
        <el-dropdown v-if="saves.length > 0" @command="handleSaveSelect" split-button type="primary">
          {{ saveId ? '切换存档' : '选择存档' }}
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item 
              v-for="save in saves" 
              :key="save.id" 
              :command="save.id"
              :disabled="saveId === save.id"
            >
              {{ save.name }}
              <el-tag v-if="saveId === save.id" size="mini" type="success">当前</el-tag>
            </el-dropdown-item>
            <el-dropdown-item divided command="new">创建新存档</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
        <el-button v-if="saveId" type="primary" @click="previewSettings" :loading="previewLoading">预览</el-button>
        <el-dropdown v-if="saveId" @command="handleExportImport" split-button type="info">
          导入/导出
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="export">导出配置</el-dropdown-item>
            <el-dropdown-item command="import">导入配置</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
        <el-button v-if="saveId || $route.query.mode === 'new'" type="primary" @click="saveSettings" :loading="loading">{{ isEdit ? '保存修改' : '创建存档' }}</el-button>
      </div>
    </div>
    
    <!-- 页面加载状态 -->
    <el-card v-if="pageLoading" shadow="hover" class="settings-card">
      <div class="loading-page-content">
        <i class="el-icon-loading loading-page-icon"></i>
        <p>正在加载页面内容...</p>
      </div>
    </el-card>
    
    <!-- 添加存档选择面板 -->
    <el-card v-if="!saveId && saves.length > 0" shadow="hover" class="settings-card select-save-card">
      <div slot="header" class="select-save-header">
        <span>请选择要编辑的存档</span>
        <el-button type="primary" size="small" @click="createNewSave">创建新存档</el-button>
      </div>
      <div v-loading="savesLoading" class="save-list">
        <el-row :gutter="20">
          <el-col :span="8" v-for="save in saves" :key="save.id">
            <el-card shadow="hover" class="save-item" @click.native="selectSave(save.id)">
              <div class="save-item-content">
                <h4 class="save-name">{{ save.name }}</h4>
                <p class="save-desc">{{ save.description || '暂无描述' }}</p>
                <div class="save-worlds">
                  <el-tag size="small" v-for="(world, index) in save.worlds" :key="index" 
                    :type="world.type === 'master' ? 'primary' : 'success'" class="world-tag">
                    {{ world.name }}
                  </el-tag>
                </div>
                <div class="save-info">
                  <span class="save-date" v-if="save.updateTime">
                    <i class="el-icon-time"></i> {{ formatDate(save.updateTime) }}
                  </span>
                  <span class="save-world-count">
                    <i class="el-icon-s-grid"></i> {{ save.worlds.length }} 个世界
                  </span>
                </div>
              </div>
              <div class="save-actions">
                <el-button type="primary" size="small" @click.stop="selectSave(save.id)">选择</el-button>
                <el-button type="danger" size="small" @click.stop="deleteSave(save.id)">删除</el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </el-card>
    
    <!-- 无存档时的导引提示 -->
    <el-card v-if="!saveId && saves.length === 0 && !savesLoading" shadow="hover" class="settings-card empty-save-card">
      <div class="empty-save-content">
        <i class="el-icon-folder-add empty-save-icon"></i>
        <h4>暂无存档</h4>
        <p>您尚未创建任何存档，请点击下方按钮创建新存档</p>
        <el-button type="primary" @click="createNewSave">创建新存档</el-button>
      </div>
    </el-card>
    
    <!-- 存档加载中的状态 -->
    <el-card v-if="savesLoading && saves.length === 0" shadow="hover" class="settings-card">
      <div class="loading-saves-content">
        <i class="el-icon-loading loading-saves-icon"></i>
        <p>正在加载存档列表...</p>
      </div>
    </el-card>
    
    <!-- 显示当前编辑的存档信息 -->
    <el-card v-if="saveId" shadow="hover" class="settings-card">
      <el-form ref="saveForm" :model="saveForm" :rules="saveRules" label-width="120px">
        <el-form-item label="存档名称" prop="name">
          <el-input v-model="saveForm.name" placeholder="请输入存档名称"></el-input>
            </el-form-item>
            
        <el-form-item label="存档描述">
          <el-input type="textarea" v-model="saveForm.description" rows="3" placeholder="请输入存档描述"></el-input>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 添加预览对话框 -->
    <el-dialog
      title="配置预览"
      :visible.sync="previewVisible"
      width="60%"
      :close-on-click-modal="true"
    >
      <div v-if="previewData" class="preview-content">
        <h3>基本信息</h3>
        <p><strong>存档名称:</strong> {{ previewData.name }}</p>
        <p><strong>存档描述:</strong> {{ previewData.description }}</p>
        
        <h3>世界配置</h3>
        <div v-for="(world, index) in previewData.worlds" :key="index" class="preview-world">
          <h4>{{ world.name }} <span class="world-type">({{ world.type === 'master' ? '森林' : '洞穴' }})</span></h4>
          
          <div class="preview-section">
            <h5>世界生成</h5>
            <div v-for="(category, categoryKey) in world.worldgen" :key="`gen-${categoryKey}`" class="preview-category">
              <h6>{{ getCategoryTitle(categoryKey, world.type, 'worldgen') }}</h6>
              <ul>
                <li v-for="(value, itemKey) in category" :key="`gen-${categoryKey}-${itemKey}`">
                  {{ getItemTitle(categoryKey, itemKey, world.type, 'worldgen') }}: {{ getOptionText(categoryKey, itemKey, value, world.type, 'worldgen') }}
                </li>
              </ul>
            </div>
          </div>
          
          <div class="preview-section">
            <h5>世界设置</h5>
            <div v-for="(category, categoryKey) in world.worldsettings" :key="`set-${categoryKey}`" class="preview-category">
              <h6>{{ getCategoryTitle(categoryKey, world.type, 'worldsettings') }}</h6>
              <ul>
                <li v-for="(value, itemKey) in category" :key="`set-${categoryKey}-${itemKey}`">
                  {{ getItemTitle(categoryKey, itemKey, world.type, 'worldsettings') }}: {{ getOptionText(categoryKey, itemKey, value, world.type, 'worldsettings') }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
    
    <!-- 添加导入对话框 -->
    <el-dialog
      title="导入配置"
      :visible.sync="importDialogVisible"
      width="50%"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="!importLoading"
    >
      <el-form>
        <el-form-item label="配置内容">
          <el-input
            type="textarea"
            :rows="10"
            placeholder="请粘贴JSON格式的配置内容"
            v-model="importContent"
            :disabled="importLoading"
          ></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="cancelImport" :disabled="importLoading">取消</el-button>
        <el-button type="primary" @click="importSettings" :loading="importLoading">确认导入</el-button>
      </span>
    </el-dialog>
    
    <!-- 添加错误提示框 -->
    <el-dialog
      title="错误"
      :visible.sync="errorVisible"
      width="30%"
      center
    >
      <div style="text-align: center; color: #F56C6C;">
        <i class="el-icon-error" style="font-size: 32px;"></i>
        <p style="margin-top: 15px;">{{ errorMessage }}</p>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button type="primary" @click="errorVisible = false">确定</el-button>
      </span>
    </el-dialog>
    
    <!-- 批量操作抽屉 -->
    <el-drawer
      title="批量操作"
      :visible.sync="batchDrawerVisible"
      direction="rtl"
      size="30%"
    >
      <div class="batch-drawer-content">
        <el-form label-position="top">
          <el-form-item label="选择操作世界">
            <el-checkbox-group v-model="batchSelectedWorlds">
              <el-checkbox 
                v-for="(world, index) in worlds" 
                :key="index" 
                :label="index"
              >
                {{ world.name }} ({{ world.type === 'master' ? '森林' : '洞穴' }})
              </el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          
          <el-form-item label="操作类型">
            <el-radio-group v-model="batchOperationType">
              <el-radio label="worldgen">世界生成配置</el-radio>
              <el-radio label="worldsettings">世界设置配置</el-radio>
              </el-radio-group>
            </el-form-item>
            
          <el-form-item label="批量操作">
            <el-button 
              type="warning" 
              @click="batchResetToDefault" 
              :disabled="batchSelectedWorlds.length === 0" 
              :loading="batchLoading"
            >批量恢复默认值</el-button>
            </el-form-item>
        </el-form>
      </div>
    </el-drawer>
    
    <!-- 世界列表 -->
    <div v-if="saveId" class="worlds-container">
      <h3 class="section-title">世界列表</h3>
      
      <el-tabs v-model="activeWorldTab" type="card" closable @tab-remove="handleRemoveWorld">
        <el-tab-pane 
          v-for="(world, index) in worlds" 
          :key="index"
          :name="index.toString()"
        >
          <span slot="label">
            <span>{{ world.name }}</span>
            <span class="world-type-label">{{ world.type === 'master' ? '(森林)' : '(洞穴)' }}</span>
          </span>
          
          <div class="world-card">
            <el-tabs v-model="world.activeTab" class="world-inner-tabs">
        <el-tab-pane label="基本设置" name="basic">
                <el-form :model="world" label-width="120px">
            <el-form-item label="世界名称" prop="name">
                    <el-input v-model="world.name" placeholder="请输入世界名称"></el-input>
            </el-form-item>
            
            <el-form-item label="世界类型" prop="type">
                    <el-radio-group v-model="world.type" disabled>
                      <el-radio label="master">森林</el-radio>
                <el-radio label="cave">洞穴</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="世界生成" name="generation">
                <div class="category-header-with-actions">
                  <div class="category-header-left">
                    <h3>世界生成配置</h3>
                  </div>
                  <div class="category-header-right">
                    <el-input
                      placeholder="搜索配置项"
                      v-model="world.worldgenSearch"
                      prefix-icon="el-icon-search"
                      clearable
                      size="small"
                      class="search-input"
                    ></el-input>
                    <el-button 
                      size="small" 
                      type="warning" 
                      @click="resetWorldgenToDefault(world)"
                      :loading="world.worldgenResetting"
                    >恢复默认值</el-button>
                  </div>
                </div>
                
              <div class="world-config-container">
                  <!-- 世界生成配置 -->
                  <div 
                    v-for="categoryKey in getSortedCategoryKeys(getWorldgenCategories(world.type))" 
                    :key="categoryKey" 
                    class="config-category"
                    v-show="isCategoryVisible(getWorldgenCategories(world.type)[categoryKey], world.worldgenSearch)"
                  >
                  <div class="category-header">
                      <h3>{{ getWorldgenCategories(world.type)[categoryKey].text }}</h3>
                      <span v-if="getWorldgenCategories(world.type)[categoryKey].desc" class="category-desc">
                        {{ getWorldgenCategories(world.type)[categoryKey].desc }}
                      </span>
                  </div>
                  
                  <div class="category-items">
                      <div 
                        v-for="itemKey in getSortedItemKeys(getWorldgenCategories(world.type)[categoryKey].items)" 
                        :key="itemKey" 
                        class="config-item"
                        v-show="isItemVisible(getWorldgenCategories(world.type)[categoryKey].items[itemKey], world.worldgenSearch)"
                      >
                      <div class="item-header">
                          <div class="item-icon" v-if="getWorldgenCategories(world.type)[categoryKey].items[itemKey].image">
                          <div 
                              v-if="imagePaths.worldgen"
                            class="item-image" 
                              :style="getItemImageStyle(getWorldgenCategories(world.type)[categoryKey].items[itemKey], true, categoryKey, itemKey)"
                              :class="{ 'image-loading': imagesLoading }"
                              @click="showImagePreview(getWorldgenCategories(world.type)[categoryKey].items[itemKey], true, categoryKey)"
                          ></div>
                            <div v-else class="item-image-fallback">
                              <i class="el-icon-picture-outline-round"></i>
                            </div>
                            <div v-if="imagesLoading" class="image-loading-overlay">
                              <i class="el-icon-loading"></i>
                            </div>
                        </div>
                        <div class="item-info">
                            <span class="item-title">{{ getWorldgenCategories(world.type)[categoryKey].items[itemKey].text }}</span>
                        </div>
                      </div>

                      <div class="item-control">
                        <el-select 
                            v-model="world.worldgen[categoryKey][itemKey]" 
                            placeholder="请选择"
                            :loading="selectsLoading"
                            popper-class="world-config-select">
                          <el-option 
                              v-for="(label, value) in getItemDescOptions(getWorldgenCategories(world.type)[categoryKey], itemKey)" 
                            :key="value" 
                            :label="label" 
                            :value="value">
                              <span :class="{'option-default': value === 'default'}">{{ label }}</span>
                          </el-option>
                        </el-select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
        </el-tab-pane>
        
              <el-tab-pane label="世界设置" name="settings">
                <div class="category-header-with-actions">
                  <div class="category-header-left">
                    <h3>世界设置配置</h3>
                  </div>
                  <div class="category-header-right">
                    <el-input
                      placeholder="搜索配置项"
                      v-model="world.worldsettingsSearch"
                      prefix-icon="el-icon-search"
                      clearable
                      size="small"
                      class="search-input"
                    ></el-input>
                    <el-button 
                      size="small" 
                      type="warning" 
                      @click="resetWorldsettingsToDefault(world)"
                      :loading="world.worldsettingsResetting"
                    >恢复默认值</el-button>
                  </div>
                </div>
                
                <div class="world-config-container">
                  <!-- 世界设置配置 -->
                  <div 
                    v-for="categoryKey in getSortedCategoryKeys(getWorldsettingsCategories(world.type))" 
                    :key="categoryKey" 
                    class="config-category"
                    v-show="isCategoryVisible(getWorldsettingsCategories(world.type)[categoryKey], world.worldsettingsSearch)"
                  >
                    <div class="category-header">
                      <h3>{{ getWorldsettingsCategories(world.type)[categoryKey].text }}</h3>
                      <span v-if="getWorldsettingsCategories(world.type)[categoryKey].desc" class="category-desc">
                        {{ getWorldsettingsCategories(world.type)[categoryKey].desc }}
                      </span>
                    </div>
                    
                    <div class="category-items">
                      <div 
                        v-for="itemKey in getSortedItemKeys(getWorldsettingsCategories(world.type)[categoryKey].items)" 
                        :key="itemKey" 
                        class="config-item"
                        v-show="isItemVisible(getWorldsettingsCategories(world.type)[categoryKey].items[itemKey], world.worldsettingsSearch)"
                      >
                        <div class="item-header">
                          <div class="item-icon" v-if="getWorldsettingsCategories(world.type)[categoryKey].items[itemKey].image">
                            <div 
                              v-if="imagePaths.worldsettings"
                              class="item-image" 
                              :style="getItemImageStyle(getWorldsettingsCategories(world.type)[categoryKey].items[itemKey], false, categoryKey, itemKey)"
                              :class="{ 'image-loading': imagesLoading }"
                              @click="showImagePreview(getWorldsettingsCategories(world.type)[categoryKey].items[itemKey], false, categoryKey)"
                            ></div>
                            <div v-else class="item-image-fallback">
                              <i class="el-icon-picture-outline-round"></i>
                            </div>
                            <div v-if="imagesLoading" class="image-loading-overlay">
                              <i class="el-icon-loading"></i>
                            </div>
                          </div>
                          <div class="item-info">
                            <span class="item-title">{{ getWorldsettingsCategories(world.type)[categoryKey].items[itemKey].text }}</span>
                          </div>
                        </div>

                        <div class="item-control">
                          <el-select 
                            v-model="world.worldsettings[categoryKey][itemKey]" 
                            placeholder="请选择"
                            :loading="selectsLoading"
                            popper-class="world-config-select">
                            <el-option 
                              v-for="(label, value) in getItemDescOptions(getWorldsettingsCategories(world.type)[categoryKey], itemKey)" 
                              :key="value" 
                              :label="label" 
                              :value="value">
                              <span :class="{'option-default': value === 'default'}">{{ label }}</span>
                            </el-option>
              </el-select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </el-tab-pane>
              
              <el-tab-pane label="模组配置" name="mods">
                <p>模组配置功能待开发</p>
              </el-tab-pane>
              
              <el-tab-pane label="其他配置" name="others">
                <p>其他配置功能待开发</p>
        </el-tab-pane>
      </el-tabs>
          </div>
        </el-tab-pane>
      </el-tabs>
      
      <!-- 空状态提示 -->
      <div v-if="worlds.length === 0" class="empty-worlds-tip">
        <i class="el-icon-info"></i>
        <p>暂无世界配置，请点击下方按钮添加世界</p>
      </div>
      
      <div class="add-world-actions">
        <el-button type="primary" @click="addWorld('master')" :disabled="hasForestWorld">添加森林世界</el-button>
        <el-button type="primary" @click="addWorld('cave')" :disabled="hasCaveWorld">添加洞穴世界</el-button>
        <el-button type="info" @click="batchDrawerVisible = true" :disabled="worlds.length === 0">批量操作</el-button>
      </div>
    </div>
    
    <!-- 图片预览对话框 -->
    <el-dialog
      title="图标预览"
      :visible.sync="imagePreviewVisible"
      width="300px"
      center
      :append-to-body="true"
      custom-class="image-preview-dialog"
    >
      <div class="image-preview-container">
        <template v-if="previewingItem">
          <div v-if="getItemAtlasPath(previewingItemIsWorldgen)" 
            class="image-preview"
            :style="getItemPreviewStyle(previewingItem, previewingItemIsWorldgen, previewingCategoryKey)"
          ></div>
          <div v-else class="image-preview-fallback">
            <i class="el-icon-picture-outline"></i>
          </div>
          <p class="image-preview-title">{{ previewingItem.text }}</p>
        </template>
      </div>
    </el-dialog>
    
    <div v-if="imagesLoading" class="global-loading-indicator">
      <el-card shadow="hover" class="loading-card">
        <div class="loading-content">
          <i class="el-icon-loading loading-icon"></i>
          <span class="loading-text">正在加载图片资源...</span>
          <el-progress :percentage="imageLoadProgress" :show-text="false"></el-progress>
        </div>
    </el-card>
    </div>
  </div>
</template>

<script>
// 导入世界设置JSON数据
import worldSettingsData from '../../../dist/misc/dst_world_setting.json'
// 导入世界配置工具函数
import { 
  initWorldCategorySettings, 
  getWorldCategories, 
  getSortedCategoryKeys, 
  getSortedItemKeys, 
  createWorldConfig, 
  getItemImageStyle,
  mergeSettings
} from '../../utils/worldConfigUtils';

export default {
  name: 'WorldSettings',
  data() {
    return {
      loading: false,
      previewLoading: false,
      previewVisible: false,
      previewData: null,
      isEdit: false,
      saveId: null,
      
      // 页面加载状态
      pageLoading: true,
      
      // 添加存档列表
      saves: [],
      savesLoading: false,
      
      // 存档基本信息
      saveForm: {
        name: '',
        description: ''
      },
      
      // 验证规则
      saveRules: {
        name: [
          { required: true, message: '请输入存档名称', trigger: 'blur' },
          { min: 2, max: 30, message: '长度在 2 到 30 个字符', trigger: 'blur' }
        ]
      },
      
      // 世界列表
      worlds: [],
      
      // 世界设置数据
      worldSettingsData: worldSettingsData,
      
      // 当前操作状态
      currentAction: null,
      
      // 错误信息
      errorMessage: '',
      errorVisible: false,
      
      // 导入导出
      importDialogVisible: false,
      importContent: '',
      importLoading: false,
      
      // 批量操作
      batchDrawerVisible: false,
      batchSelectedWorlds: [],
      batchOperationType: 'worldgen',
      batchLoading: false,
      
      // 图片加载状态
      imagesLoading: true,
      imageLoadErrors: [],
      imageLoadProgress: 0,
      
      // 图片预览
      imagePreviewVisible: false,
      previewingItem: null,
      previewingItemIsWorldgen: true,
      previewingCategoryKey: null,
      
      // 图片资源路径
      imagePaths: {
        worldgen: '',
        worldsettings: ''
      },
      
      // 选择框状态
      selectsLoading: false,
      
      // 当前激活的世界标签页
      activeWorldTab: '0',
    }
  },
  computed: {
    // 是否已有森林世界
    hasForestWorld() {
      return this.worlds.some(world => world.type === 'master');
    },
    
    // 是否已有洞穴世界
    hasCaveWorld() {
      return this.worlds.some(world => world.type === 'cave');
    },
    
    // 是否有未保存的修改
    hasUnsavedChanges: {
      get() {
        return this.$data._hasUnsavedChanges || false;
      },
      set(value) {
        this.$data._hasUnsavedChanges = value;
      }
    }
  },
  methods: {
    // 返回列表页
    goBack() {
      // 检查是否有未保存的修改
      if (this.hasUnsavedChanges) {
        this.$confirm('您有未保存的修改，确定要离开吗？', '提示', {
          confirmButtonText: '确定离开',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          this.$router.push('/worlds/list');
        }).catch(() => {});
      } else {
        this.$router.push('/worlds/list');
      }
    },
    
    // 保存设置
    saveSettings() {
      this.$refs.saveForm.validate(valid => {
        if (valid) {
          if (this.worlds.length === 0) {
            this.showError('请至少添加一个世界');
            return;
          }
          
          this.loading = true;
          this.currentAction = 'saving';
          
          // 准备保存的数据
          const saveData = {
            ...this.saveForm,
            worlds: this.worlds.map(world => {
              // 仅保存必要的数据，不包括UI状态等
              return {
                name: world.name,
                type: world.type,
                worldgen: world.worldgen,
                worldsettings: world.worldsettings,
                mods: world.mods,
                others: world.others
              };
            })
          };
          
          // 添加或更新时间戳
          saveData.updateTime = new Date().getTime();
          
          console.log('保存的数据:', saveData);
          
          // 模拟API调用
          setTimeout(() => {
            this.loading = false;
            this.currentAction = null;
            
            // 如果是新建，模拟返回ID并添加到列表
            if (!this.isEdit) {
              const newId = Math.max(0, ...this.saves.map(s => s.id)) + 1;
              const newSave = {
                id: newId,
                ...saveData
              };
              
              this.saves.push(newSave);
              this.saveId = newId;
              this.isEdit = true;
              
              // 更新URL
              this.$router.replace({
                query: { ...this.$route.query, id: newId, mode: undefined }
              });
              
              this.$message({
                message: '存档创建成功',
                type: 'success'
              });
            } else {
              // 更新已有存档
              const saveIndex = this.saves.findIndex(s => s.id === this.saveId);
              if (saveIndex !== -1) {
                this.saves.splice(saveIndex, 1, {
                  id: this.saveId,
                  ...saveData
                });
              }
              
              this.$message({
                message: '存档设置已更新',
                type: 'success'
              });
            }
            
            // 重置未保存状态
            this.hasUnsavedChanges = false;
          }, 1000);
        } else {
          this.showError('请正确填写表单信息');
          return false;
        }
      });
    },
    
    // 添加世界
    addWorld(type) {
      // 使用工具函数创建新世界的初始数据结构
      const newWorld = createWorldConfig(type, type === 'master' ? '森林世界' : '洞穴世界', this.worldSettingsData);
      
      // 添加搜索和重置状态
      newWorld.worldgenSearch = '';
      newWorld.worldsettingsSearch = '';
      newWorld.worldgenResetting = false;
      newWorld.worldsettingsResetting = false;
      
      // 添加到世界列表
      this.worlds.push(newWorld);
      
      // 切换到新添加的世界标签页
      this.$nextTick(() => {
        this.activeWorldTab = (this.worlds.length - 1).toString();
      });
    },
    
    // 删除世界
    removeWorld(index) {
      this.$confirm('确定要删除此世界吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.worlds.splice(index, 1);
        this.$message({
          type: 'success',
          message: '删除成功!'
        });
      }).catch(() => {});
    },
    
    // 获取世界生成分类
    getWorldgenCategories(worldType) {
      const mappedType = worldType === 'master' ? 'forest' : 'cave';
      return getWorldCategories(this.worldSettingsData, mappedType, 'WORLDGEN_GROUP');
    },
    
    // 获取世界设置分类
    getWorldsettingsCategories(worldType) {
      const mappedType = worldType === 'master' ? 'forest' : 'cave';
      return getWorldCategories(this.worldSettingsData, mappedType, 'WORLDSETTINGS_GROUP');
    },
    
    // 获取排序后的分类键数组
    getSortedCategoryKeys(categories) {
      return getSortedCategoryKeys(categories);
    },
    
    // 获取排序后的项目键数组
    getSortedItemKeys(items) {
      return getSortedItemKeys(items);
    },
    
    // 获取配置项的图片样式
    getItemImageStyle(item, isWorldgen = true, categoryKey = null, itemKey = null) {
      if (!item.image) {
        return {};
      }
      
      // 获取图片路径
      const atlasPath = isWorldgen 
        ? this.imagePaths.worldgen 
        : this.imagePaths.worldsettings;
      
      if (!atlasPath) {
        return {
          backgroundColor: '#e0e0e0',
          cursor: 'not-allowed'
        };
      }
      
      // 获取分类的atlas属性
      const categoryAtlas = this.getCategoryAtlas(isWorldgen, categoryKey);
      
      // 获取基本样式，并添加背景图片路径
      const baseStyle = getItemImageStyle(item, isWorldgen, categoryAtlas);
      return {
        ...baseStyle,
        backgroundImage: `url(${atlasPath})`
      };
    },
    
    // 获取预览图片样式
    getItemPreviewStyle(item, isWorldgen = true, categoryKey = null) {
      if (!item.image) {
        return {};
      }
      
      // 获取图片路径
      const atlasPath = isWorldgen 
        ? this.imagePaths.worldgen 
        : this.imagePaths.worldsettings;
      
      if (!atlasPath) {
        return {
          backgroundColor: '#e0e0e0',
          cursor: 'not-allowed',
          width: '128px',
          height: '128px'
        };
      }
      
      // 获取分类的atlas属性
      const categoryAtlas = this.getCategoryAtlas(isWorldgen, categoryKey);
      
      // 图集尺寸和项目尺寸
      const atlasWidth = categoryAtlas.width || 2048;
      const itemSize = categoryAtlas.item_size || 128;
      
      // 计算背景位置百分比：-(atlas的width/atlas的item_size) * 坐标
      const positionPercentage = -(atlasWidth / itemSize) * 100;
      
      // 计算背景位置并添加缩放
      return {
        backgroundImage: `url(${atlasPath})`,
        backgroundPosition: `${item.image.x * positionPercentage}% ${item.image.y * positionPercentage}%`,
        backgroundSize: `${atlasWidth}px ${atlasWidth}px`,
        transform: 'scale(2)', // 放大显示
        imageRendering: 'pixelated',
        cursor: 'default'
      };
    },
    
    // 获取项目所在分类的atlas属性
    getItemAtlas(item, isWorldgen = true) {
      // 默认值
      const defaultAtlas = {
        name: isWorldgen ? 'worldgen_customization' : 'worldsettings_customization',
            width: 2048,
            item_size: 128
      };
      
      // 遍历所有分类寻找该项目
      const categories = isWorldgen 
        ? this.worldSettingsData.forest.WORLDGEN_GROUP 
        : this.worldSettingsData.forest.WORLDSETTINGS_GROUP;
      
      if (!categories) return defaultAtlas;
      
      // 遍历所有分类
      for (const categoryKey in categories) {
        const category = categories[categoryKey];
        
        // 找到分类中的atlas属性
        if (category.atlas) {
          // 检查项目是否在这个分类中
          if (category.items) {
            for (const itemKey in category.items) {
              const categoryItem = category.items[itemKey];
              if (categoryItem === item || (categoryItem.image && item.image && 
                  categoryItem.image.x === item.image.x && categoryItem.image.y === item.image.y)) {
                return category.atlas;
                }
              }
            }
          }
        }
      
      return defaultAtlas;
    },
    
    // 显示图片预览
    showImagePreview(item, isWorldgen, categoryKey = null) {
      if (!item.image) return;
      
      // 检查图片路径是否可用
      const atlasPath = isWorldgen 
        ? this.imagePaths.worldgen 
        : this.imagePaths.worldsettings;
        
      if (!atlasPath) {
        this.showError('图片资源不可用，无法预览');
        return;
      }
      
      this.previewingItem = item;
      this.previewingItemIsWorldgen = isWorldgen;
      this.previewingCategoryKey = categoryKey;
      this.imagePreviewVisible = true;
    },
    
    // 加载存档数据
    loadSaveData() {
      if (!this.saveId) return;
      
      this.pageLoading = true;
          
          // 模拟API调用
          setTimeout(() => {
        // 查找存档
        const existingSave = this.saves.find(save => save.id === this.saveId);
        
        if (existingSave) {
          // 如果存档存在，应用数据
          this.applySaveData(existingSave);
          
            this.$message({
            message: `已加载存档 "${existingSave.name}"`,
              type: 'success'
            });
        } else {
          // 如果存档不存在，显示错误并重定向到选择页面
          this.$message.error('找不到指定的存档');
          
          // 重置URL参数
          this.$router.replace({
            query: { ...this.$route.query, id: undefined, mode: undefined }
          });
          
          // 如果有其他存档，显示选择界面
          if (this.saves.length > 0) {
            this.resetForm();
          } else {
            // 如果没有存档，创建新存档
            this.createNewSave();
          }
        }
        
        this.pageLoading = false;
      }, 800);
    },
    
    // 应用存档数据
    applySaveData(saveData) {
      if (!saveData) return;
      
      // 设置表单数据
      this.saveForm = {
        name: saveData.name || '',
        description: saveData.description || ''
      };
      
      // 设置世界数据
      if (saveData.worlds && Array.isArray(saveData.worlds)) {
        this.worlds = saveData.worlds.map(world => {
          // 确保world.type存在，默认为'master'
          const type = world.type || 'master';
          
          // 创建完整的世界配置
          const mappedType = type === 'master' ? 'forest' : 'cave';
      return {
            ...world,
            type,
            // 初始化分类设置，合并已有设置和默认设置
            worldgen: mergeSettings(
              initWorldCategorySettings(this.worldSettingsData, mappedType, 'WORLDGEN_GROUP'),
              world.worldgen || {}
            ),
            worldsettings: mergeSettings(
              initWorldCategorySettings(this.worldSettingsData, mappedType, 'WORLDSETTINGS_GROUP'),
              world.worldsettings || {}
            ),
            // 确保其他属性存在
            mods: world.mods || {},
            others: world.others || {},
            // 添加UI状态
            editingName: false
          };
        });
        
        // 设置默认激活标签页
        if (this.worlds.length > 0) {
          this.activeWorldTab = '0';
        }
      } else {
        // 如果没有世界数据，添加默认世界
        this.worlds = [];
        this.addWorld('master');
      }
      
      // 重置未保存状态
      this.hasUnsavedChanges = false;
    },
    
    // 合并设置，确保所有的设置项都有值
    // 获取预览表格数据
    getPreviewTableData(settings) {
      const result = [];
      Object.entries(settings).forEach(([categoryKey, category]) => {
        Object.entries(category).forEach(([itemKey, value]) => {
          result.push({
            category: this.getCategoryText(categoryKey),
            item: this.getItemText(categoryKey, itemKey),
            value: this.getOptionText(categoryKey, itemKey, value)
        });
      });
      });
      return result;
    },
    
    // 获取分类文本
    getCategoryText(categoryKey) {
      const categories = {
        ...this.getWorldgenCategories('master'),
        ...this.getWorldsettingsCategories('master')
      };
      return categories[categoryKey]?.text || categoryKey;
    },
    
    // 获取项目文本
    getItemText(categoryKey, itemKey) {
      const categories = {
        ...this.getWorldgenCategories('master'),
        ...this.getWorldsettingsCategories('master')
      };
      return categories[categoryKey]?.items[itemKey]?.text || itemKey;
    },
    
    // 获取选项文本
    getOptionText(categoryKey, itemKey, value, worldType, settingType) {
      const categories = getWorldCategories(worldType, settingType === 'worldgen' ? 'WORLDGEN_GROUP' : 'WORLDSETTINGS_GROUP');
      
      if (!categories || !categories[categoryKey]) {
        return value;
      }
      
      // 获取项目
      const category = categories[categoryKey];
      if (!category || !category.items || !category.items[itemKey]) {
        return value;
      }
      
      // 获取选项描述
      const item = category.items[itemKey];
      
      // 1. 尝试从项目的desc获取
      if (item.desc && typeof item.desc === 'object' && item.desc[value]) {
        return item.desc[value];
      }
      
      // 2. 如果项目没有desc或没有匹配的值，尝试从分类的通用desc获取
      if (category.desc && typeof category.desc === 'object' && category.desc[value]) {
        return category.desc[value];
      }
      
      // 3. 使用通用描述映射
      const commonDescMap = {
        'default': '默认',
        'none': '无',
        'rare': '很少',
        'default_rare': '默认(很少)',
        'uncommon': '较少',
        'default_uncommon': '默认(较少)',
        'often': '较多',
        'default_often': '默认(较多)',
        'mostly': '很多',
        'default_mostly': '默认(很多)',
        'always': '总是',
        'default_always': '默认(总是)',
        'never': '从不',
        'default_never': '默认(从不)'
      };
      
      return commonDescMap[value] || value;
    },
    
    // 判断分类是否应该显示（基于搜索关键词）
    isCategoryVisible(category, searchTerm) {
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      
      // 检查分类名称
      if (category.text.toLowerCase().includes(searchLower)) return true;
      
      // 检查分类下的所有项目
      for (const key in category.items) {
        const item = category.items[key];
        if (item.text.toLowerCase().includes(searchLower)) return true;
      }
      
      return false;
    },
    
    // 判断项目是否应该显示（基于搜索关键词）
    isItemVisible(item, searchTerm) {
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      return item.text.toLowerCase().includes(searchLower);
    },
    
    // 重置世界生成配置为默认值
    resetWorldgenToDefault(world) {
      this.$confirm('确定要将世界生成配置恢复为默认值吗？此操作不可逆！', '警告', {
        confirmButtonText: '确定恢复',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        world.worldgenResetting = true;
        
        // 模拟API调用延迟
        setTimeout(() => {
          const mappedType = world.type === 'master' ? 'forest' : 'cave';
          world.worldgen = initWorldCategorySettings(this.worldSettingsData, mappedType, 'WORLDGEN_GROUP');
          world.worldgenResetting = false;
          
          this.$message({
            type: 'success',
            message: '世界生成配置已恢复默认值'
          });
        }, 500);
      }).catch(() => {});
    },
    
    // 重置世界设置配置为默认值
    resetWorldsettingsToDefault(world) {
      this.$confirm('确定要将世界设置配置恢复为默认值吗？此操作不可逆！', '警告', {
        confirmButtonText: '确定恢复',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        world.worldsettingsResetting = true;
        
        // 模拟API调用延迟
        setTimeout(() => {
          const mappedType = world.type === 'master' ? 'forest' : 'cave';
          world.worldsettings = initWorldCategorySettings(this.worldSettingsData, mappedType, 'WORLDSETTINGS_GROUP');
          world.worldsettingsResetting = false;
          
          this.$message({
            type: 'success',
            message: '世界设置配置已恢复默认值'
          });
        }, 500);
      }).catch(() => {});
    },
    
    // 显示错误消息
    showError(message) {
      console.warn('错误:', message);
      this.$message({
        message: message,
        type: 'error',
        duration: 3000
      });
    },
    
    // 模拟处理保存错误
    handleSaveError(error) {
      console.error('保存错误:', error);
      this.showError('保存失败: ' + (error.message || '未知错误'));
        this.loading = false;
      this.currentAction = null;
    },
    
    // 处理导入导出
    handleExportImport(command) {
      if (command === 'export') {
        this.exportSettings();
      } else if (command === 'import') {
        this.importDialogVisible = true;
      }
    },
    
    // 导出设置
    exportSettings() {
      // 准备导出数据
      const exportData = {
        name: this.saveForm.name,
        description: this.saveForm.description,
        worlds: this.worlds.map(world => {
          return {
            name: world.name,
            type: world.type,
            worldgen: world.worldgen,
            worldsettings: world.worldsettings,
            mods: world.mods,
            others: world.others
          };
        }),
        exportTime: new Date().toISOString(),
        version: '1.0'
      };
      
      // 转换为JSON字符串
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // 创建Blob对象
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.saveForm.name || 'world_settings'}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      
      // 释放URL对象
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 0);
      
      this.$message({
        message: '配置已导出',
        type: 'success'
      });
    },
    
    // 导入设置
    importSettings() {
      if (!this.importContent) {
        this.$message.warning('请输入导入内容');
        return;
      }
      
      this.importLoading = true;
      
      try {
        // 解析JSON数据
        const importData = JSON.parse(this.importContent);
        
        // 验证数据格式
        if (!importData.worlds || !Array.isArray(importData.worlds)) {
          throw new Error('导入数据格式不正确');
        }
        
        // 确认导入
        this.$confirm('确定要导入这些设置吗？当前的设置将被覆盖。', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          // 更新表单数据
          this.saveForm.name = importData.name || this.saveForm.name;
          this.saveForm.description = importData.description || this.saveForm.description;
          
          // 转换世界数据
          this.worlds = importData.worlds.map(world => {
            const type = world.type || 'master';
            const mappedType = type === 'master' ? 'forest' : 'cave';
            
            return {
              name: world.name || `世界 ${Math.floor(Math.random() * 1000)}`,
              type: type,
              worldgen: mergeSettings(
                initWorldCategorySettings(this.worldSettingsData, mappedType, 'WORLDGEN_GROUP'),
                world.worldgen || {}
              ),
              worldsettings: mergeSettings(
                initWorldCategorySettings(this.worldSettingsData, mappedType, 'WORLDSETTINGS_GROUP'),
                world.worldsettings || {}
              ),
              mods: world.mods || {},
              others: world.others || {},
              editingName: false
            };
          });
          
          // 如果没有世界，添加默认世界
          if (this.worlds.length === 0) {
            this.addWorld('master');
          }
          
          // 设置默认激活标签页
          this.activeWorldTab = '0';
          
          // 标记为未保存状态
          this.hasUnsavedChanges = true;
          
          this.$message({
            message: '配置已导入',
            type: 'success'
          });
          
          // 关闭对话框
          this.importDialogVisible = false;
          this.importContent = '';
        }).catch(() => {
          this.$message({
            type: 'info',
            message: '已取消导入'
          });
        }).finally(() => {
          this.importLoading = false;
        });
      } catch (error) {
        this.importLoading = false;
        this.$message.error(`导入失败: ${error.message}`);
      }
    },
    
    // 取消导入
    cancelImport() {
      this.importDialogVisible = false;
      this.importContent = '';
      this.importLoading = false;
    },
    
    // 批量恢复默认值
    batchResetToDefault() {
      if (this.batchSelectedWorlds.length === 0) {
        this.showError('请选择至少一个世界');
        return;
      }
      
      const operationType = this.batchOperationType;
      const operationName = operationType === 'worldgen' ? '世界生成配置' : '世界设置配置';
      const groupType = operationType === 'worldgen' ? 'WORLDGEN_GROUP' : 'WORLDSETTINGS_GROUP';
      
      this.$confirm(`确定要将选中世界的${operationName}批量恢复为默认值吗？此操作不可逆！`, '警告', {
        confirmButtonText: '确定恢复',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.batchLoading = true;
        
        // 模拟API调用延迟
        setTimeout(() => {
          // 对每个选中的世界执行恢复操作
          this.batchSelectedWorlds.forEach(index => {
            const world = this.worlds[index];
            const mappedType = world.type === 'master' ? 'forest' : 'cave';
            world[operationType] = initWorldCategorySettings(this.worldSettingsData, mappedType, groupType);
          });
          
          this.batchLoading = false;
          
          this.$message({
            type: 'success',
            message: `已成功将 ${this.batchSelectedWorlds.length} 个世界的${operationName}恢复为默认值`
          });
          
          // 清空选择
          this.batchSelectedWorlds = [];
          this.batchDrawerVisible = false;
        }, 1000);
      }).catch(() => {});
    },
    
    // 预加载图片
    preloadImages() {
      this.imagesLoading = true;
      this.imageLoadProgress = 0;
      
      // 从世界设置数据中获取atlas名称
      let worldgenAtlasName = 'worldgen_customization';
      let worldsettingsAtlasName = 'worldsettings_customization';
      
      // 尝试从世界设置数据中获取图集名称
      if (this.worldSettingsData) {
        // 查找worldgen分类中的atlas名称
        if (this.worldSettingsData.forest && this.worldSettingsData.forest.WORLDGEN_GROUP) {
          const categories = this.worldSettingsData.forest.WORLDGEN_GROUP;
          for (const categoryKey in categories) {
            const category = categories[categoryKey];
            if (category.atlas && category.atlas.name) {
              worldgenAtlasName = category.atlas.name;
              break;
            }
          }
        }
        
        // 查找worldsettings分类中的atlas名称
        if (this.worldSettingsData.forest && this.worldSettingsData.forest.WORLDSETTINGS_GROUP) {
          const categories = this.worldSettingsData.forest.WORLDSETTINGS_GROUP;
          for (const categoryKey in categories) {
            const category = categories[categoryKey];
            if (category.atlas && category.atlas.name) {
              worldsettingsAtlasName = category.atlas.name;
              break;
            }
          }
        }
      }
      
      console.log(`使用图集: worldgen=${worldgenAtlasName}, worldsettings=${worldsettingsAtlasName}`);
      
      // 尝试多种可能的路径，包括global, misc, atlas, giants, monsters等
      const baseUrls = [
        '/static/misc/',
        '/dist/misc/',
        '/assets/misc/',
        '/static/global/',
        '/dist/global/',
        '/static/atlas/',
        '/dist/atlas/',
        '/static/giants/',
        '/dist/giants/',
        '/static/monsters/',
        '/dist/monsters/',
        '/'
      ];
      
      // 为每种图集生成可能的路径
      const worldgenPaths = [];
      const worldsettingsPaths = [];
      
      // 添加不同的文件扩展名
      const extensions = ['.webp', '.png', '.jpg'];
      
      baseUrls.forEach(baseUrl => {
        extensions.forEach(ext => {
          worldgenPaths.push(`${baseUrl}${worldgenAtlasName}${ext}`);
          worldsettingsPaths.push(`${baseUrl}${worldsettingsAtlasName}${ext}`);
        });
      });
      
      // 尝试加载一个图片，从多个可能的路径
      const tryLoadImage = (paths, type) => {
        return new Promise((resolve) => {
          let loaded = false;
          let currentIndex = 0;
          
          const tryNextPath = () => {
            if (currentIndex >= paths.length) {
              resolve(''); // 所有路径都失败了
              return;
            }
            
            const path = paths[currentIndex];
            const img = new Image();
            
            img.onload = () => {
              loaded = true;
              resolve(path);
            };
            
            img.onerror = () => {
              currentIndex++;
              if (!loaded) {
                tryNextPath();
              }
            };
            
            img.src = path;
          };
          
          tryNextPath();
        });
      };
      
      // 并行尝试加载两种图片
      Promise.all([
        tryLoadImage(worldgenPaths, 'worldgen'),
        tryLoadImage(worldsettingsPaths, 'worldsettings')
      ]).then(([worldgenPath, worldsettingsPath]) => {
        this.imagePaths.worldgen = worldgenPath;
        this.imagePaths.worldsettings = worldsettingsPath;
        
        if (!worldgenPath || !worldsettingsPath) {
          this.showError('无法加载图片资源，请检查网络或联系管理员');
          this.imageLoadErrors.push('图片资源路径错误');
        }
        
        this.imagesLoading = false;
        this.imageLoadProgress = 100;
      }).catch(() => {
        this.imagesLoading = false;
        this.imageLoadProgress = 100;
        this.showError('加载图片资源时发生错误');
      });
      
      // 设置超时处理，防止图片长时间无法加载
      setTimeout(() => {
        if (this.imagesLoading) {
          this.imagesLoading = false;
          this.showError('图标加载超时，请检查网络连接');
        }
      }, 10000);
    },
    
    // 获取图片路径
    getItemAtlasPath(isWorldgen) {
      return isWorldgen ? this.imagePaths.worldgen : this.imagePaths.worldsettings;
    },
    
    // 获取项目的选项描述
    getItemDescOptions(category, itemKey) {
      if (!category || !category.items || !category.items[itemKey]) {
        console.warn(`找不到分类或项目: ${itemKey}`);
        return { 'default': '默认' };
      }
      
      // 1. 先尝试从项目本身获取desc
      const itemDesc = category.items[itemKey].desc;
      if (itemDesc && typeof itemDesc === 'object') {
        return itemDesc;
      }
      
      // 2. 如果项目没有desc，尝试从分类获取通用desc
      if (category.desc && typeof category.desc === 'object') {
        return category.desc;
      }
      
      // 3. 如果都没有或格式不正确，提供默认值
      console.warn(`项目 ${itemKey} 没有有效的选项描述`);
      return {
        'default': '默认值',
        'none': '无',
        'rare': '很少',
        'often': '较多'
      };
    },
    
    // 添加重置默认选项方法
    resetItemToDefault(world, settingType, categoryKey, itemKey) {
      const defaultValue = 'default';
      // 设置值为default
      if (world[settingType][categoryKey] && world[settingType][categoryKey][itemKey] !== undefined) {
        this.$set(world[settingType][categoryKey], itemKey, defaultValue);
      }
    },
    
    // 处理移除世界标签页
    handleRemoveWorld(targetName) {
      this.$confirm('确定要删除此世界吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const index = parseInt(targetName);
        this.worlds.splice(index, 1);
        
        // 调整当前激活的标签页
        if (this.worlds.length > 0) {
          // 如果删除的是最后一个标签页，则激活前一个
          if (index >= this.worlds.length) {
            this.activeWorldTab = (this.worlds.length - 1).toString();
          } else {
            // 否则保持当前索引
            this.activeWorldTab = index.toString();
          }
        }
        
        this.$message({
          type: 'success',
          message: '删除成功!'
        });
      }).catch(() => {});
    },
    
    // 获取所有存档列表
    fetchSaves() {
      this.savesLoading = true;
      
      // 模拟API调用
      setTimeout(() => {
        // 模拟从API获取的数据
        this.saves = [
      {
        id: 1,
            name: '默认存档',
            description: '这是一个默认存档',
            updateTime: new Date().getTime() - 3600000 * 24 * 3, // 3天前
            worlds: [
              { name: '森林世界', type: 'master' },
              { name: '洞穴世界', type: 'cave' }
            ]
      },
      {
        id: 2,
            name: '测试存档',
            description: '这是一个测试存档',
            updateTime: new Date().getTime() - 3600000 * 2, // 2小时前
            worlds: [
              { name: '测试森林', type: 'master' }
            ]
      },
      {
        id: 3,
            name: '多人游戏专用',
            description: '适合多人游戏的配置',
            updateTime: new Date().getTime() - 3600000 * 24 * 7, // 一周前
            worlds: [
              { name: '多人森林', type: 'master' },
              { name: '多人洞穴', type: 'cave' }
            ]
          }
        ];
        
        this.savesLoading = false;
        
        // 如果没有任何存档且没有指定ID或模式，自动跳转到创建页面
        if (this.saves.length === 0 && !this.$route.query.id && !this.$route.query.mode) {
          this.createNewSave();
        } else if (this.saves.length > 0 && !this.saveId && !this.$route.query.id && !this.$route.query.mode) {
          // 如果有存档但没有指定ID或模式，显示选择界面
          this.resetForm();
          this.pageLoading = false;
        } else if (this.$route.query.id) {
          // 如果URL中有ID，尝试加载该存档
          this.saveId = parseInt(this.$route.query.id);
          this.isEdit = true;
          this.loadSaveData();
        } else if (this.$route.query.mode === 'new') {
          // 如果是新建模式
          this.createNewSave();
        }
      }, 500);
    },
    
    // 选择存档
    selectSave(id) {
      if (id === this.saveId) return;
      
      this.saveId = id;
      this.isEdit = true;
      this.loadSaveData();
      
      // 更新URL但不重新加载页面
      this.$router.push({
        query: { ...this.$route.query, id }
      });
    },
    
    // 创建新存档
    createNewSave() {
      this.saveId = null;
      this.isEdit = false;
      this.resetForm();
      
      // 添加一个默认的森林世界
      this.worlds = [];
      this.addWorld('master');
      
      // 更新表单默认值
      this.saveForm = {
        name: `新存档 ${new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })}`,
        description: '新的游戏存档'
      };
      
      // 更新URL但不重新加载页面
      this.$router.replace({
        path: this.$route.path,
        query: { ...this.$route.query, id: undefined, mode: 'new' }
      });
      
      // 重置未保存状态
      this.hasUnsavedChanges = true;
      
      // 页面加载完成
      this.pageLoading = false;
    },
    
    // 删除存档
    deleteSave(id) {
      this.$confirm('确定要删除此存档吗？此操作不可恢复！', '警告', {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 模拟API调用
        setTimeout(() => {
          // 从列表中移除
          this.saves = this.saves.filter(save => save.id !== id);
          
          // 如果删除的是当前正在编辑的存档，重置表单
          if (id === this.saveId) {
            this.saveId = null;
            this.isEdit = false;
            this.resetForm();
          }
          
          this.$message({
            type: 'success',
            message: '删除成功!'
          });
          
          // 如果没有任何存档，创建一个新的
          if (this.saves.length === 0) {
            this.createNewSave();
          }
        }, 500);
      }).catch(() => {});
    },
    
    // 重置表单
    resetForm() {
      this.saveForm = {
        name: '',
        description: ''
      };
      this.worlds = [];
    },
    
    // 处理存档下拉选择
    handleSaveSelect(command) {
      if (command === 'new') {
        this.createNewSave();
      } else {
        this.selectSave(command);
      }
    },
    
    // 格式化日期显示
    formatDate(timestamp) {
      if (!timestamp) return '';
      
      const now = new Date().getTime();
      const diff = now - timestamp;
      
      // 一小时内
      if (diff < 3600000) {
        return '刚刚更新';
      }
      // 24小时内
      else if (diff < 86400000) {
        return `${Math.floor(diff / 3600000)}小时前更新`;
      }
      // 30天内
      else if (diff < 2592000000) {
        return `${Math.floor(diff / 86400000)}天前更新`;
      }
      // 超过30天
      else {
        const date = new Date(timestamp);
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      }
    },
    
    // 页面刷新或关闭前的处理
    handleBeforeUnload(e) {
      if (this.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    },
    
    // 获取分类标题
    getCategoryTitle(categoryKey, worldType, settingType) {
      const categories = getWorldCategories(worldType, settingType === 'worldgen' ? 'WORLDGEN_GROUP' : 'WORLDSETTINGS_GROUP');
      if (categories && categories[categoryKey]) {
        return categories[categoryKey].text || categoryKey;
      }
      return categoryKey;
    },
    
    // 获取项目标题
    getItemTitle(categoryKey, itemKey, worldType, settingType) {
      const categories = getWorldCategories(worldType, settingType === 'worldgen' ? 'WORLDGEN_GROUP' : 'WORLDSETTINGS_GROUP');
      if (categories && categories[categoryKey] && categories[categoryKey].items && categories[categoryKey].items[itemKey]) {
        return categories[categoryKey].items[itemKey].text || itemKey;
      }
      return itemKey;
    },
    
    // 预览设置
    previewSettings() {
      this.previewLoading = true;
      
      // 准备预览数据
      const previewData = {
        name: this.saveForm.name,
        description: this.saveForm.description,
        worlds: this.worlds.map(world => {
          return {
            name: world.name,
            type: world.type,
            worldgen: world.worldgen,
            worldsettings: world.worldsettings,
            mods: world.mods,
            others: world.others
          };
        })
      };
      
      // 设置预览数据
      this.previewData = previewData;
      this.previewVisible = true;
      this.previewLoading = false;
    },
    
    // 获取分类的atlas属性
    getCategoryAtlas(isWorldgen = true, categoryKey = null) {
      // 默认值
      const defaultAtlas = {
        name: isWorldgen ? 'worldgen_customization' : 'worldsettings_customization',
        width: 2048,
        item_size: 128
      };
      
      // 如果没有指定分类，返回默认值
      if (!categoryKey) return defaultAtlas;
      
      // 获取对应的分类数据
      const categories = isWorldgen 
        ? this.worldSettingsData.forest.WORLDGEN_GROUP 
        : this.worldSettingsData.forest.WORLDSETTINGS_GROUP;
      
      if (!categories || !categories[categoryKey]) return defaultAtlas;
      
      // 返回分类的atlas属性，如果不存在则返回默认值
      return categories[categoryKey].atlas || defaultAtlas;
    },
  },
  created() {
    // 获取存档列表
    this.fetchSaves();
    
    // 判断是否为编辑模式
    const { id, mode } = this.$route.query;
    
    // 初始化状态
    this.pageLoading = true;
    
    if (id) {
      this.isEdit = true;
      this.saveId = parseInt(id);
      this.loadSaveData();
    } else if (mode === 'new') {
      // 如果是新建模式
      this.isEdit = false;
      this.saveId = null;
      this.createNewSave();
    }
    
    // 预加载图片
    this.preloadImages();
    
    // 监听表单变化以检测未保存的修改
    this.$watch(
      () => [
        JSON.stringify(this.saveForm),
        JSON.stringify(this.worlds.map(w => ({
          name: w.name,
          type: w.type,
          worldgen: w.worldgen,
          worldsettings: w.worldsettings
        })))
      ],
      () => {
        this.hasUnsavedChanges = true;
      },
      { deep: true }
    );
    
    // 模拟页面加载完成
    setTimeout(() => {
      this.pageLoading = false;
    }, 700);
  },
  
  // 在组件被挂载后，将未保存状态设为false
  mounted() {
    this.hasUnsavedChanges = false;
    
    // 添加刷新或关闭页面前的提示
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  },
  
  // 在组件销毁前移除事件监听
  beforeDestroy() {
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  },
  
  // 添加路由离开守卫
  beforeRouteLeave(to, from, next) {
    if (this.hasUnsavedChanges) {
      this.$confirm('您有未保存的修改，确定要离开吗？', '提示', {
        confirmButtonText: '确定离开',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        next();
      }).catch(() => {
        next(false);
      });
    } else {
      next();
    }
  },
}
</script>

<style scoped>
.world-settings-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.settings-card {
  margin-bottom: 20px;
}

.section-title {
  margin-top: 20px;
  margin-bottom: 15px;
  font-size: 18px;
  font-weight: 500;
}

.worlds-container {
  margin-top: 20px;
  margin-bottom: 30px;
}

.worlds-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 20px;
}

.world-card {
  width: 100%;
  background-color: #fff;
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.world-card-header {
  display: none;
}

.add-world-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  justify-content: center;
  padding: 10px 0;
  border-top: 1px dashed #E4E7ED;
}

.config-category {
  margin-bottom: 30px;
}

.category-header {
  margin-bottom: 15px;
}

.category-header h3 {
  margin: 0 0 5px 0;
  font-size: 16px;
  font-weight: 500;
}

.category-desc {
  font-size: 14px;
  color: #909399;
}

.category-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 10px;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.item-image {
  width: 64px;
  height: 64px;
}

.item-image:hover {
  transform: scale(1.1);
}

.image-loading {
  opacity: 0.5;
}

.image-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.6);
  z-index: 1;
}

.item-info {
  flex-grow: 1;
}

.item-title {
  font-weight: 500;
  display: block;
}

.item-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
  display: block;
}

.item-control {
  width: 100%;
}

.preview-content {
  min-height: 200px;
}

.preview-section {
  margin-bottom: 20px;
}

.preview-section h4 {
  margin: 0 0 15px 0;
  color: #409EFF;
  font-size: 16px;
}

.preview-world {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.preview-world h5 {
  margin: 0 0 15px 0;
  color: #303133;
}

.preview-world-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preview-category {
  background-color: #fff;
  padding: 15px;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.preview-category h6 {
  margin: 0 0 10px 0;
  color: #606266;
  font-size: 14px;
}

.category-header-with-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 10px;
}

.category-header-left h3 {
  margin: 0;
  font-size: 18px;
  color: #409EFF;
}

.category-header-right {
  display: flex;
  gap: 10px;
  align-items: center;
}

.search-input {
  width: 200px;
}

.error-message {
  background-color: #fef0f0;
  color: #f56c6c;
  padding: 10px 15px;
  border-radius: 4px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.error-message i {
  cursor: pointer;
}

.no-results {
  text-align: center;
  padding: 30px;
  color: #909399;
  font-size: 14px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.batch-drawer-content {
  padding: 20px;
}

.import-content {
  padding: 20px 0;
}

.image-preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.image-preview {
  width: 128px;
  height: 128px;
  background-repeat: no-repeat;
  transform-origin: center;
  margin-bottom: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border: 1px solid #ebeef5;
  background-color: #f9fafc;
}

.image-preview-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin: 0;
  text-align: center;
}

.image-preview-dialog {
  border-radius: 8px;
  overflow: hidden;
}

.global-loading-indicator {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  background-color: rgba(255, 255, 255, 0.8);
}

.loading-card {
  width: 300px;
  text-align: center;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.loading-icon {
  font-size: 36px;
  color: #409EFF;
  margin-bottom: 15px;
}

.loading-text {
  font-size: 16px;
  color: #606266;
  margin-bottom: 15px;
}

.item-image-fallback {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  background-color: #f5f7fa;
  border-radius: 4px;
  font-size: 18px;
}

.image-preview-fallback {
  width: 128px;
  height: 128px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  background-color: #f5f7fa;
  border-radius: 8px;
  font-size: 36px;
  margin-bottom: 15px;
  border: 1px solid #ebeef5;
}

.option-default {
  color: #409EFF;
  font-weight: bold;
}

.world-config-select {
  max-height: 300px;
}

/* 覆盖el-tabs默认样式 */
::v-deep .el-tabs__header {
  margin-bottom: 15px;
}

::v-deep .el-tabs__item {
  height: 40px;
  line-height: 40px;
}

::v-deep .el-tabs__nav-wrap::after {
  height: 1px;
}

/* 世界标签页样式 */
::v-deep .el-tabs--card > .el-tabs__header .el-tabs__item.is-active {
  border-bottom-color: #fff;
  background-color: #fff;
  color: #409EFF;
  font-weight: bold;
}

::v-deep .el-tabs--card > .el-tabs__header .el-tabs__item {
  border-left: 1px solid #E4E7ED;
  transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}

.world-type-label {
  font-size: 12px;
  color: #909399;
  margin-left: 5px;
}

/* 增强标签页样式 */
::v-deep .el-tabs--card > .el-tabs__header {
  border-bottom: 1px solid #E4E7ED;
  margin-bottom: 20px;
}

::v-deep .el-tabs--card > .el-tabs__header .el-tabs__nav {
  border: 1px solid #E4E7ED;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  box-sizing: border-box;
}

::v-deep .el-tabs--card > .el-tabs__header .el-tabs__item {
  border-bottom: 1px solid transparent;
  border-left: 1px solid #E4E7ED;
  transition: color .3s ease;
  padding: 0 20px;
}

::v-deep .el-tabs--card > .el-tabs__header .el-tabs__item:first-child {
  border-left: none;
}

::v-deep .el-tabs__nav-next, 
::v-deep .el-tabs__nav-prev {
  line-height: 40px;
  font-size: 12px;
}

::v-deep .el-tabs__item .el-icon-close {
  color: #C0C4CC;
  font-weight: bold;
}

::v-deep .el-tabs__item .el-icon-close:hover {
  color: #F56C6C;
  background-color: #f2f2f2;
  border-radius: 50%;
}

.empty-worlds-tip {
  text-align: center;
  padding: 30px;
  background-color: #f8f8f8;
  border-radius: 4px;
  margin-bottom: 20px;
  color: #909399;
}

.empty-worlds-tip i {
  font-size: 40px;
  color: #E6A23C;
  margin-bottom: 15px;
}

.empty-worlds-tip p {
  font-size: 14px;
  margin: 0;
}

/* 子标签页样式 */
.world-inner-tabs {
  margin-top: 10px;
}

::v-deep .world-inner-tabs .el-tabs__header {
  background-color: #f9f9f9;
  border-radius: 4px;
  padding: 5px;
  margin-bottom: 20px;
}

::v-deep .world-inner-tabs .el-tabs__active-bar {
  background-color: #409EFF;
}

::v-deep .world-inner-tabs .el-tabs__item {
  color: #606266;
  font-size: 14px;
  height: 36px;
  line-height: 36px;
}

::v-deep .world-inner-tabs .el-tabs__item.is-active {
  color: #409EFF;
  font-weight: 500;
}

::v-deep .world-inner-tabs .el-tabs__content {
  padding: 5px;
}

/* 整体布局调整 */
.world-card {
  width: 100%;
  background-color: #fff;
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.worlds-container {
  margin-top: 20px;
  margin-bottom: 30px;
}

.add-world-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  justify-content: center;
  padding: 10px 0;
  border-top: 1px dashed #E4E7ED;
}

/* 存档选择卡片样式 */
.select-save-card {
  margin-bottom: 20px;
}

.select-save-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.save-list {
  margin-top: 20px;
}

.save-item {
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.save-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.save-item-content {
  min-height: 120px;
}

.save-name {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #303133;
}

.save-desc {
  margin: 0 0 15px 0;
  font-size: 14px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.save-worlds {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 15px;
}

.world-tag {
  margin-right: 5px;
}

.save-actions {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #EBEEF5;
  padding-top: 10px;
  gap: 10px;
}

.save-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
  margin-top: 10px;
}

.save-date, .save-world-count {
  display: flex;
  align-items: center;
  gap: 4px;
}

.empty-save-card {
  text-align: center;
}

.empty-save-content {
  padding: 30px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-save-icon {
  font-size: 60px;
  color: #DCDFE6;
  margin-bottom: 20px;
}

.empty-save-content h4 {
  font-size: 18px;
  color: #606266;
  margin: 0 0 10px 0;
}

.empty-save-content p {
  color: #909399;
  margin: 0 0 20px 0;
}

.loading-saves-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 0;
  color: #909399;
}

.loading-saves-icon {
  font-size: 36px;
  color: #409EFF;
  margin-bottom: 15px;
}

.loading-page-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 50px 0;
  color: #909399;
}

.loading-page-icon {
  font-size: 48px;
  color: #409EFF;
  margin-bottom: 20px;
}

.preview-content {
  max-height: 600px;
  overflow-y: auto;
  padding: 0 20px;
}

.preview-world {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #EBEEF5;
}

.preview-world:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.world-type {
  color: #909399;
  font-size: 14px;
  font-weight: normal;
}

.preview-section {
  margin-top: 15px;
}

.preview-category {
  margin-bottom: 15px;
}

.preview-category h6 {
  color: #606266;
  margin-bottom: 10px;
  font-weight: bold;
}

.preview-category ul {
  margin: 0;
  padding-left: 20px;
}

.preview-category li {
  margin-bottom: 5px;
}
</style> 