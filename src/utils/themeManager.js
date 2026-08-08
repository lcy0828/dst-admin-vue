/**
 * 主题管理服务
 * 提供主题切换和存储功能
 */

import { refreshSystemTheme } from '@/utils/systemPreferences'

// 主题类型
export const THEMES = {
  LIGHT: 'light', // 科技白
  DARK: 'dark'    // 暗黑模式
};

// 默认主题
const DEFAULT_THEME = THEMES.LIGHT;

// 本地存储键名
const THEME_STORAGE_KEY = 'app_theme';

/**
 * 主题管理类
 */
class ThemeManager {
  constructor() {
    this.currentTheme = null;
    this.listeners = [];
    this.init();
  }

  /**
   * 初始化主题
   */
  init() {
    // 从本地存储获取主题设置，如果没有则使用默认主题
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    this.setTheme(savedTheme || DEFAULT_THEME);
  }

  /**
   * 设置主题
   * @param {string} theme - 主题名称
   */
  setTheme(theme) {
    if (!Object.values(THEMES).includes(theme)) {
      console.warn(`无效的主题: ${theme}，使用默认主题`);
      theme = DEFAULT_THEME;
    }

    this.currentTheme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    
    // shadcn-vue 使用 .dark，旧页面继续通过 data-theme 读取模式。
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === THEMES.DARK);
    refreshSystemTheme();
    
    // 通知所有监听器
    this.notifyListeners();
  }

  /**
   * 获取当前主题
   * @returns {string} 当前主题名称
   */
  getTheme() {
    return this.currentTheme;
  }

  /**
   * 切换主题
   * 在科技白和暗黑模式之间切换
   */
  toggleTheme() {
    const newTheme = this.currentTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
    this.setTheme(newTheme);
  }

  /**
   * 添加主题变化监听器
   * @param {Function} listener - 监听函数
   */
  addListener(listener) {
    if (typeof listener === 'function' && !this.listeners.includes(listener)) {
      this.listeners.push(listener);
    }
  }

  /**
   * 移除主题变化监听器
   * @param {Function} listener - 监听函数
   */
  removeListener(listener) {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知所有监听器主题已变化
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentTheme);
      } catch (error) {
        console.error('主题变化监听器执行出错:', error);
      }
    });
  }
}

// 创建单例实例
const themeManager = new ThemeManager();

export default themeManager;
