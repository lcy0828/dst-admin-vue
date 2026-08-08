<template>
  <div 
    class="setting-item"
    :class="{ 'setting-item-changed': isChanged }"
    :data-key="itemKey"
  >
    <div class="setting-image">
      <div 
        class="item-image" 
        :style="getItemImageStyle(item.image, category.atlas)"
      ></div>
    </div>
    <div class="setting-info">
      <p class="setting-name">
        {{ item.text }}
      </p>
      <el-select 
        :value="item.value"
        @change="handleSelectChange"
        size="small" 
        :placeholder="'选择' + item.text" 
        popper-append-to-body
        :popper-class="`select-popper-${itemKey}`"
        :value-key="itemKey"
        :reserve-keyword="false"
        :popper-options="{ boundariesElement: 'viewport', gpuAcceleration: true }"
        @focus="handleSelectFocus"
      >
        <template v-if="getOptionCount(category.desc, item.desc) > 20">
          <el-option
            v-for="(descText, descKey) in getVisibleOptions(category.desc, item.desc)"
            :key="descKey" 
            :label="descText" 
            :value="descKey"
            :class="{ 'default-option': isDefaultOption(descKey) }"
          >
            <span>{{ descText }}</span>
            <span v-if="isDefaultOption(descKey)" class="default-tag">默认</span>
          </el-option>
        </template>
        <template v-else>
          <el-option 
            v-for="(descText, descKey) in getItemOptions(category.desc, item.desc)" 
            :key="descKey" 
            :label="descText" 
            :value="descKey"
            :class="{ 'default-option': isDefaultOption(descKey) }"
          >
            <span>{{ descText }}</span>
            <span v-if="isDefaultOption(descKey)" class="default-tag">默认</span>
          </el-option>
        </template>
      </el-select>
    </div>
    <el-tooltip 
      :content="getSettingDescription()" 
      placement="top" 
      effect="light"
      class="setting-hover-tips"
    >
      <component :is="'el-icon-question'" class="legacy-icon" />
    </el-tooltip>
  </div>
</template>

<script>
export default {
  name: 'SettingItem',
  props: {
    item: {
      type: Object,
      required: true
    },
    itemKey: {
      type: String,
      required: true
    },
    category: {
      type: Object,
      required: true
    },
    worldType: {
      type: String,
      required: true
    },
    isChanged: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      loadedSelects: false,
      descriptionCache: {},
      itemOptionsCache: {}
    };
  },
  methods: {
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
      // 使用缓存避免重复计算
      const cacheKey = JSON.stringify({ 
        categoryDesc: categoryDesc ? Object.keys(categoryDesc).join(',') : '', 
        itemDesc: itemDesc ? Object.keys(itemDesc).join(',') : '' 
      });
      
      if (this.itemOptionsCache[cacheKey]) {
        return this.itemOptionsCache[cacheKey];
      }
      
      const result = itemDesc || categoryDesc || {};
      this.itemOptionsCache[cacheKey] = result;
      return result;
    },
    
    getSettingDescription() {
      const cacheKey = `${this.itemKey}-${this.item.value}`;
      if (this.descriptionCache[cacheKey]) {
        return this.descriptionCache[cacheKey];
      }
      
      // 基本描述
      let desc = `${this.item.text}：`;
      
      // 添加当前值的描述
      const options = this.getItemOptions(this.category.desc, this.item.desc);
      const currentValue = options[this.item.value] || this.item.value;
      desc += `当前值为【${currentValue}】`;
      
      // 使用策略模式添加详细描述
      const descriptionStrategies = {
        monster: '。此选项影响游戏中怪物的数量和出现频率，数值越高难度越大。',
        enemy: '。此选项影响游戏中怪物的数量和出现频率，数值越高难度越大。',
        hound: '。此选项影响游戏中怪物的数量和出现频率，数值越高难度越大。',
        regrowth: '。此选项影响资源再生速度，选择更快的速度可以使游戏更加轻松。',
        respawn: '。此选项影响资源再生速度，选择更快的速度可以使游戏更加轻松。',
        season: '。此选项影响季节的持续时间，影响游戏的整体节奏。',
        start: '。此选项影响游戏开局设置。',
        world_size: '。世界大小影响地图范围，较大的世界有更多资源但探索难度更高。',
        damage: '。此选项影响伤害计算，调整游戏难度。'
      };
      
      // 查找适用的描述策略
      let descriptionAdded = false;
      for (const [keyword, description] of Object.entries(descriptionStrategies)) {
        if (this.itemKey.includes(keyword) || (keyword === 'world_size' && this.itemKey === keyword)) {
          desc += description;
          descriptionAdded = true;
          break;
        }
      }
      
      // 如果没有匹配的策略，添加通用描述
      if (!descriptionAdded) {
        desc += '。调整此选项可能会影响游戏平衡性。';
      }
      
      // 保存到缓存
      this.descriptionCache[cacheKey] = desc;
      return desc;
    },
    
    isDefaultOption(descKey) {
      // 检查是否为默认选项
      return descKey === 'default';
    },
    
    handleSelectChange(value) {
      // 向父组件发送变更通知
      this.$emit('setting-change', { item: this.item, value });
    },
    
    handleSelectFocus() {
      // 当选择器获得焦点时加载全部选项
      this.loadedSelects = true;
    },
    
    getOptionCount(categoryDesc, itemDesc) {
      const options = this.getItemOptions(categoryDesc, itemDesc);
      return Object.keys(options).length;
    },
    
    getVisibleOptions(categoryDesc, itemDesc) {
      // 如果尚未加载或选项数量不多，则显示所有选项
      if (this.loadedSelects || this.getOptionCount(categoryDesc, itemDesc) <= 20) {
        return this.getItemOptions(categoryDesc, itemDesc);
      }
      
      // 否则，只显示当前值和默认值
      const allOptions = this.getItemOptions(categoryDesc, itemDesc);
      const result = {};
      
      // 确保至少包含当前值
      if (allOptions[this.item.value]) {
        result[this.item.value] = allOptions[this.item.value];
      }
      
      // 添加默认值选项
      if (allOptions['default']) {
        result['default'] = allOptions['default'];
      }
      
      // 如果结果为空，至少显示5个选项
      if (Object.keys(result).length < 2) {
        const keys = Object.keys(allOptions).slice(0, 5);
        keys.forEach(key => {
          result[key] = allOptions[key];
        });
      }
      
      return result;
    }
  }
}
</script>

<style scoped>
.setting-item {
  display: flex;
  align-items: center;
  min-height: 74px;
  padding: 10px;
  position: relative;
  overflow: hidden;
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  transition: background-color 180ms ease, border-color 180ms ease;
}

.setting-item:hover {
  border-color: var(--el-color-primary-light-5);
  background-color: var(--el-color-primary-light-9);
}

.setting-item:hover .setting-hover-tips {
  opacity: 1;
}

.setting-hover-tips {
  position: absolute;
  top: 5px;
  right: 5px;
  font-size: 16px;
  color: var(--text-secondary);
  opacity: 0.55;
  transition: color 180ms ease, opacity 180ms ease;
  z-index: 2;
  cursor: help;
}

.item-image {
  width: 50px;
  height: 50px;
  border-radius: 4px;
  background-size: 1600% !important;
  background-color: var(--surface-muted);
}

.setting-image {
  margin-right: 12px;
}

.setting-info {
  flex: 1;
  min-width: 0;
}

.setting-name {
  margin: 0 20px 6px 0;
  font-weight: 500;
  font-size: 13px;
  color: var(--text-primary);
}

.setting-info :deep(.el-select) {
  width: 100%;
}

.setting-item-changed {
  border-color: var(--warning-color) !important;
  box-shadow: inset 3px 0 0 var(--warning-color) !important;
  background-color: #fff8eb !important;
}

.default-tag {
  margin-left: 8px;
  padding: 0 5px;
  background-color: #f0f9eb;
  color: #4f8a5b;
  font-size: 12px;
  border-radius: 3px;
  line-height: 1.2;
  display: inline-block;
}

.default-option {
  background-color: rgba(103, 194, 58, 0.1);
}

@media (prefers-reduced-motion: reduce) {
  .setting-item,
  .setting-hover-tips {
    transition: none;
  }
}
</style>
