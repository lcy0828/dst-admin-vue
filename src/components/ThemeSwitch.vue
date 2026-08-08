<template>
  <div class="theme-switch">
    <el-tooltip :content="tooltipText" placement="bottom" effect="light">
      <div class="theme-switch-icon" @click="toggleTheme">
        <i :class="themeIcon"></i>
      </div>
    </el-tooltip>
  </div>
</template>

<script>
import themeManager, { THEMES } from '@/utils/themeManager';

export default {
  name: 'ThemeSwitch',
  data() {
    return {
      currentTheme: themeManager.getTheme()
    };
  },
  computed: {
    /**
     * 根据当前主题返回图标类名
     */
    themeIcon() {
      return this.currentTheme === THEMES.LIGHT 
        ? 'fas fa-moon' // 当前是亮色主题，显示月亮图标表示可以切换到暗色
        : 'fas fa-sun';  // 当前是暗色主题，显示太阳图标表示可以切换到亮色
    },
    /**
     * 根据当前主题返回提示文本
     */
    tooltipText() {
      return this.currentTheme === THEMES.LIGHT 
        ? '切换到暗黑模式' 
        : '切换到科技白';
    }
  },
  mounted() {
    // 添加主题变化监听器
    themeManager.addListener(this.onThemeChange);
  },
  beforeUnmount() {
    // 移除主题变化监听器
    themeManager.removeListener(this.onThemeChange);
  },
  methods: {
    /**
     * 切换主题
     */
    toggleTheme() {
      themeManager.toggleTheme();
    },
    /**
     * 主题变化处理函数
     */
    onThemeChange(theme) {
      this.currentTheme = theme;
    }
  }
};
</script>

<style scoped>
.theme-switch {
  display: inline-block;
}

.theme-switch-icon {
  cursor: pointer;
  font-size: 20px;
  color: var(--text-regular);
  transition: color 0.3s;
  padding: 5px;
}

.theme-switch-icon:hover {
  color: var(--primary-color);
}
</style>
