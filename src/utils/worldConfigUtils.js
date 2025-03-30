/**
 * 世界配置工具函数
 */

/**
 * 初始化世界分类设置
 * @param {Object} worldSettingsData - 世界设置数据
 * @param {String} worldType - 世界类型 (forest/cave)
 * @param {String} groupType - 分组类型 (WORLDGEN_GROUP/WORLDSETTINGS_GROUP)
 * @returns {Object} - 初始化的分类设置
 */
export function initWorldCategorySettings(worldSettingsData, worldType, groupType) {
  if (!worldSettingsData[worldType] || !worldSettingsData[worldType][groupType]) {
    console.error(`无效的世界类型或分组类型: ${worldType}, ${groupType}`);
    return {};
  }
  
  const result = {};
  const categories = worldSettingsData[worldType][groupType];
  
  Object.keys(categories).forEach(categoryKey => {
    const category = categories[categoryKey];
    result[categoryKey] = {};
    
    // 遍历分类下的所有项目
    Object.keys(category.items).forEach(itemKey => {
      const item = category.items[itemKey];
      
      // 获取该项目的默认值
      let defaultValue = item.value;
      
      // 如果没有默认值，使用"default"
      if (defaultValue === undefined || defaultValue === null || defaultValue === '') {
        // 检查项目的desc中是否有default选项
        if (item.desc && item.desc.default !== undefined) {
          defaultValue = 'default';
        } else if (category.desc && category.desc.default !== undefined) {
          defaultValue = 'default';
        } else {
          // 尝试找到第一个有效选项
          if (item.desc && Object.keys(item.desc).length > 0) {
            defaultValue = Object.keys(item.desc)[0];
          } else if (category.desc && Object.keys(category.desc).length > 0) {
            defaultValue = Object.keys(category.desc)[0];
          } else {
            defaultValue = 'default'; // 最后的回退
          }
        }
      }
      
      result[categoryKey][itemKey] = defaultValue;
    });
  });
  
  return result;
}

/**
 * 获取世界分类项目
 * @param {Object} worldSettingsData - 世界设置数据
 * @param {String} worldType - 世界类型 (forest/cave)
 * @param {String} groupType - 分组类型 (WORLDGEN_GROUP/WORLDSETTINGS_GROUP)
 * @returns {Object} - 分类项目对象
 */
export function getWorldCategories(worldSettingsData, worldType, groupType) {
  if (!worldSettingsData[worldType] || !worldSettingsData[worldType][groupType]) {
    return {};
  }
  
  return worldSettingsData[worldType][groupType];
}

/**
 * 获取分类排序后的键数组
 * @param {Object} categories - 分类对象
 * @returns {Array} - 排序后的键数组
 */
export function getSortedCategoryKeys(categories) {
  return Object.keys(categories).sort((a, b) => {
    const orderA = categories[a].order || 0;
    const orderB = categories[b].order || 0;
    return orderA - orderB;
  });
}

/**
 * 获取项目排序后的键数组
 * @param {Object} items - 项目对象
 * @returns {Array} - 排序后的键数组
 */
export function getSortedItemKeys(items) {
  return Object.keys(items).sort((a, b) => {
    const orderA = items[a].order || 0;
    const orderB = items[b].order || 0;
    return orderA - orderB;
  });
}

/**
 * 创建新的世界配置对象
 * @param {String} worldType - 世界类型 (master/cave)
 * @param {String} worldName - 世界名称
 * @param {Object} worldSettingsData - 世界设置数据
 * @returns {Object} - 新的世界配置对象
 */
export function createWorldConfig(worldType, worldName, worldSettingsData) {
  return {
    name: worldName,
    type: worldType,
    activeTab: 'basic',
    worldgen: initWorldCategorySettings(worldSettingsData, worldType === 'master' ? 'forest' : 'cave', 'WORLDGEN_GROUP'),
    worldsettings: initWorldCategorySettings(worldSettingsData, worldType === 'master' ? 'forest' : 'cave', 'WORLDSETTINGS_GROUP'),
    mods: {},
    others: {}
  };
}

/**
 * 合并设置，确保所有的设置项都有值
 * @param {Object} defaultSettings - 默认设置
 * @param {Object} savedSettings - 保存的设置
 * @returns {Object} - 合并后的设置
 */
export function mergeSettings(defaultSettings, savedSettings) {
  const result = JSON.parse(JSON.stringify(defaultSettings)); // 深拷贝
  
  // 遍历保存的设置项，如果有值就使用保存的值
  Object.keys(savedSettings).forEach(categoryKey => {
    if (!result[categoryKey]) {
      result[categoryKey] = {};
    }
    
    Object.keys(savedSettings[categoryKey]).forEach(itemKey => {
      const savedValue = savedSettings[categoryKey][itemKey];
      // 只有当保存的值非空且默认设置有这个项目时才设置
      if (savedValue !== undefined && savedValue !== null) {
        result[categoryKey][itemKey] = savedValue;
      }
    });
  });
  
  return result;
}

/**
 * 获取配置项的图片坐标样式
 * @param {Object} item - 配置项对象
 * @param {Boolean} isWorldgen - 是否为世界生成配置项
 * @param {Object} categoryAtlas - 配置项所在分类的atlas属性
 * @returns {Object} - CSS样式对象
 */
export function getItemImageStyle(item, isWorldgen = true, categoryAtlas = null) {
  if (!item || !item.image) {
    return {};
  }
  
  // 使用传入的categoryAtlas或默认值
  const atlas = categoryAtlas || {
    name: isWorldgen ? 'worldgen_customization' : 'worldsettings_customization',
    width: 2048,
    item_size: 128
  };
  
  // 图集尺寸和项目尺寸
  const atlasWidth = atlas.width || 2048;
  const itemSize = atlas.item_size || 128;
  
  // 计算背景位置百分比：-(atlas的width/atlas的item_size) * 坐标
  const positionPercentage = -(atlasWidth / itemSize) * 100;
  
  return {
    backgroundPosition: `${item.image.x * positionPercentage}% ${item.image.y * positionPercentage}%`,
    backgroundSize: `${atlasWidth}px ${atlasWidth}px`, // 固定背景尺寸
    transform: 'scale(1)', // 调整缩放
    imageRendering: 'pixelated', // 优化小图像显示
    cursor: 'zoom-in' // 添加鼠标样式提示可点击
  };
} 