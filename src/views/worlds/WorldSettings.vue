<template>
  <div class="world-settings-container">
    <el-card class="settings-card">
      <div slot="header" class="card-header">
        <h2>世界设置</h2>
        <div class="header-actions">
          <el-button 
            size="small" 
            icon="el-icon-refresh" 
            @click="fetchWorldSettings" 
            :loading="loading"
            :disabled="loading"
          >刷新设置</el-button>
        </div>
      </div>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="森林" name="forest">
          <div v-if="loading" class="loading-container">
            <el-skeleton :rows="10" animated />
          </div>
          <div v-else-if="forestSettings">
            <div v-for="(group, groupKey) in forestSettings" :key="groupKey">
              <h3>{{ groupKey === 'WORLDGEN_GROUP' ? '世界生成组' : '世界设置组' }}</h3>
              
              <div 
                v-for="category in getSortedCategories(group)" 
                :key="category.key" 
                class="settings-category"
              >
                <h4>{{ category.value.text }}</h4>
                <div class="settings-grid">
                  <div 
                    v-for="(item, itemKey) in category.value.items" 
                    :key="itemKey" 
                    class="setting-item"
                  >
                    <div class="setting-image">
                      <div 
                        class="item-image" 
                        :style="getItemImageStyle(item.image, category.value.atlas)"
                      ></div>
                    </div>
                    <div class="setting-info">
                      <p class="setting-name">{{ item.text }}</p>
                      <el-select v-model="item.value" size="small" :placeholder="'选择' + item.text">
                        <el-option 
                          v-for="(descText, descKey) in getItemOptions(category.value.desc, item.desc)" 
                          :key="descKey" 
                          :label="descText" 
                          :value="descKey"
                        ></el-option>
                      </el-select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <el-empty description="暂无森林世界设置数据"></el-empty>
          </div>
        </el-tab-pane>

        <el-tab-pane label="洞穴" name="cave">
          <div v-if="loading" class="loading-container">
            <el-skeleton :rows="10" animated />
          </div>
          <div v-else-if="caveSettings">
            <div v-for="(group, groupKey) in caveSettings" :key="groupKey">
              <h3>{{ groupKey === 'WORLDGEN_GROUP' ? '世界生成组' : '世界设置组' }}</h3>
              
              <div 
                v-for="category in getSortedCategories(group)" 
                :key="category.key" 
                class="settings-category"
              >
                <h4>{{ category.value.text }}</h4>
                <div class="settings-grid">
                  <div 
                    v-for="(item, itemKey) in category.value.items" 
                    :key="itemKey" 
                    class="setting-item"
                  >
                    <div class="setting-image">
                      <div 
                        class="item-image" 
                        :style="getItemImageStyle(item.image, category.value.atlas)"
                      ></div>
                    </div>
                    <div class="setting-info">
                      <p class="setting-name">{{ item.text }}</p>
                      <el-select v-model="item.value" size="small" :placeholder="'选择' + item.text">
                        <el-option 
                          v-for="(descText, descKey) in getItemOptions(category.value.desc, item.desc)" 
                          :key="descKey" 
                          :label="descText" 
                          :value="descKey"
                        ></el-option>
                      </el-select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <el-empty description="暂无洞穴世界设置数据"></el-empty>
          </div>
        </el-tab-pane>
      </el-tabs>

      <div class="actions-footer">
        <el-button 
          type="primary" 
          @click="saveSettings" 
          :loading="saveLoading" 
          :disabled="loading || saveLoading"
        >保存设置</el-button>
        <el-button 
          @click="resetSettings" 
          :disabled="loading || saveLoading"
        >重置</el-button>
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'WorldSettings',
  data() {
    return {
      activeTab: 'forest',
      forestSettings: null,
      caveSettings: null,
      originalSettings: null,
      loading: false,
      saveLoading: false
    }
  },
  created() {
    this.fetchWorldSettings();
  },
  methods: {
    fetchWorldSettings() {
      this.loading = true;
      // 如果API调用失败，使用本地JSON数据（实际开发中应移除）
      this.loadLocalSettings();
      this.loading = false;
    },
    loadLocalSettings() {
      // 从本地JSON文件加载设置（仅用于演示）
      fetch('/static/json/dst_world_setting_zh.json')
        .then(response => response.json())
        .then(data => {
          this.forestSettings = data.forest || {};
          this.caveSettings = data.cave || {};
          this.originalSettings = JSON.parse(JSON.stringify(data));
        })
        .catch(error => {
          console.error('加载本地设置失败:', error);
          this.$message.error('加载设置失败');
        });
    },
    getItemImageStyle(image, atlas) {
      if (!image || !atlas) return {};
      
      // 计算背景位置
      const bgPosX = -(image.x * atlas.width / atlas.item_size * 100);
      const bgPosY = -(image.y * atlas.height / atlas.item_size * 100);
      
      // 构建图片URL
      const imageUrl = `/static/misc/${atlas.name}.webp`;
      
      return {
        backgroundImage: `url(${imageUrl})`,
        backgroundPosition: `${bgPosX}% ${bgPosY}%`,
        backgroundSize: `${atlas.width / atlas.item_size * 100}%`,
      };
    },
    getItemOptions(categoryDesc, itemDesc) {
      // 使用项目特定的描述，如果有的话，否则使用类别的描述
      return itemDesc || categoryDesc || {};
    },
    getSortedCategories(group) {
      // 将对象转换为包含key和value的数组，并按order排序
      return Object.entries(group)
        .map(([key, value]) => ({ key, value }))
        .sort((a, b) => (a.value.order || 999) - (b.value.order || 999));
    },
    saveSettings() {
      this.saveLoading = true;
      
      // 保存森林设置
      if (this.activeTab === 'forest' && this.forestSettings) {
        this.$api.roomApi.saveWorldSettings('forest', { forest: this.forestSettings })
          .then(response => {
            this.$message.success('森林世界设置保存成功');
            this.originalSettings = JSON.parse(JSON.stringify({ forest: this.forestSettings }));
          })
          .catch(error => {
            console.error('保存森林世界设置失败:', error);
            this.$message.error('保存森林世界设置失败');
          })
          .finally(() => {
            this.saveLoading = false;
          });
      } 
      // 保存洞穴设置
      else if (this.activeTab === 'cave' && this.caveSettings) {
        this.$api.roomApi.saveWorldSettings('cave', { cave: this.caveSettings })
          .then(response => {
            this.$message.success('洞穴世界设置保存成功');
          })
          .catch(error => {
            console.error('保存洞穴世界设置失败:', error);
            this.$message.error('保存洞穴世界设置失败');
          })
          .finally(() => {
            this.saveLoading = false;
          });
      } else {
        this.saveLoading = false;
      }
    },
    resetSettings() {
      if (this.activeTab === 'forest' && this.originalSettings) {
        this.forestSettings = JSON.parse(JSON.stringify(this.originalSettings.forest || {}));
        this.$message.info('森林世界设置已重置');
      } else if (this.activeTab === 'cave' && this.originalSettings) {
        this.caveSettings = JSON.parse(JSON.stringify(this.originalSettings.cave || {}));
        this.$message.info('洞穴世界设置已重置');
      }
    }
  }
}
</script>

<style scoped>
.world-settings-container {
  padding: 20px;
}

.settings-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.settings-category {
  margin-bottom: 20px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.setting-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.setting-image {
  margin-right: 12px;
}

.item-image {
  width: 64px;
  height: 64px;
  border-radius: 4px;
  background-size: 1600% !important; /* 这确保图标显示正确 */
}

.setting-info {
  flex: 1;
}

.setting-name {
  margin: 0 0 8px;
  font-weight: 500;
}

.actions-footer {
  margin-top: 24px;
  text-align: center;
}

.loading-container, .empty-state {
  padding: 30px;
  text-align: center;
}
</style>