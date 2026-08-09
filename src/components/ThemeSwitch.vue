<template>
  <div class="theme-switch">
    <Tooltip>
      <TooltipTrigger as-child>
        <UiButton variant="ghost" size="icon-sm" :aria-label="tooltipText" @click="toggleTheme">
          <MoonIcon v-if="currentTheme === themes.LIGHT" />
          <SunIcon v-else />
        </UiButton>
      </TooltipTrigger>
      <TooltipContent>{{ tooltipText }}</TooltipContent>
    </Tooltip>
  </div>
</template>

<script>
import { MoonIcon, SunIcon } from '@lucide/vue'
import { Button as UiButton } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import themeManager, { THEMES } from '@/utils/themeManager';

export default {
  name: 'ThemeSwitch',
  components: { UiButton, MoonIcon, SunIcon, Tooltip, TooltipContent, TooltipTrigger },
  data() {
    return {
      currentTheme: themeManager.getTheme(),
      themes: THEMES
    };
  },
  computed: {
    /**
     * 根据当前主题返回提示文本
     */
    tooltipText() {
      return this.currentTheme === THEMES.LIGHT 
        ? '切换到暗黑模式' 
        : '切换到浅色模式';
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

</style>
