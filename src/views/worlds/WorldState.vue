<template>
  <div class="world-state-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>世界状态信息</h2>
      <div class="header-actions">
        <el-button type="primary" icon="el-icon-refresh" @click="refreshData" :loading="loading">刷新</el-button>
      </div>
    </div>

    <!-- 选择存档和世界 -->
    <el-card shadow="hover" class="filter-card">
      <div class="filter-container">
        <el-form :inline="true" class="filter-form">
          <el-form-item label="存档名称">
            <el-select v-model="selectedArchive" placeholder="请选择存档" @change="handleArchiveChange" filterable>
              <el-option
                v-for="archive in archives"
                :key="archive.id || archive.name"
                :label="archive.name || archive.id"
                :value="archive.name || archive.id">
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="世界名称">
            <el-select v-model="selectedWorld" placeholder="请选择世界" filterable>
              <el-option
                v-for="world in worldsOfSelectedArchive"
                :key="world.id || world.name"
                :label="world.name || (typeof world === 'string' ? world : world.id)"
                :value="world.name || (typeof world === 'string' ? world : world.id)">
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="fetchWorldState" :disabled="!selectedArchive || !selectedWorld">查询</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <!-- 世界状态信息展示 -->
    <div v-loading="loading" class="state-content">
      <div v-if="!worldState" class="empty-state">
        <i class="el-icon-info"></i>
        <p v-if="selectedArchive && selectedWorld">没有找到世界状态信息，请点击查询按钮获取最新数据</p>
        <p v-else>请选择存档和世界，然后点击查询按钮获取世界状态信息</p>
      </div>
      <div v-else>
        <!-- 基本信息卡片 -->
        <el-row :gutter="20" class="state-cards">
          <el-col :xs="24" :sm="12" :md="6">
            <el-card shadow="hover" class="state-card">
              <div class="state-card-content">
                <div class="state-icon-container" :class="getSeasonClass()">
                  <i :class="getSeasonIcon()"></i>
                </div>
                <div class="state-info">
                  <div class="state-title">季节</div>
                  <div class="state-value">{{ getSeasonName() }}</div>
                  <div class="state-detail">{{ getSeasonDetail() }}</div>
                  <div class="state-detail">世界天数: {{ worldState.cycles }}</div>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-card shadow="hover" class="state-card">
              <div class="state-card-content">
                <div class="state-icon-container" :class="getPhaseClass()">
                  <i :class="getPhaseIcon()"></i>
                </div>
                <div class="state-info">
                  <div class="state-title">地表时间</div>
                  <div class="state-value">{{ getPhaseName() }}</div>
                  <div class="state-detail">{{ getPhaseDetail() }}</div>
                  <div class="state-detail">全天进度: {{ (worldState.time * 100).toFixed(1) }}%</div>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-card shadow="hover" class="state-card">
              <div class="state-card-content">
                <div class="state-icon-container" :class="getWeatherClass()">
                  <i :class="getWeatherIcon()"></i>
                </div>
                <div class="state-info">
                  <div class="state-title">地表天气</div>
                  <div class="state-value">{{ getWeatherName() }}</div>
                  <div class="state-detail">温度: {{ worldState.temperature.toFixed(1) }}°C</div>
                  <div class="state-detail">{{ getWeatherDetail() }}</div>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-card shadow="hover" class="state-card">
              <div class="state-card-content">
                <div class="state-icon-container" :class="getMoonClass()">
                  <i :class="getMoonIcon()"></i>
                </div>
                <div class="state-info">
                  <div class="state-title">地表月相</div>
                  <div class="state-value">{{ getMoonPhaseName() }}</div>
                  <div class="state-detail">{{ getMoonPhaseDetail() }}</div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 洞穴信息卡片 -->
        <el-row :gutter="20" class="state-cards" v-if="hasCaveInfo()">
          <el-col :xs="24" :sm="12" :md="6">
            <el-card shadow="hover" class="state-card">
              <div class="state-card-content">
                <div class="state-icon-container" :class="getCavePhaseClass()">
                  <i :class="getCavePhaseIcon()"></i>
                </div>
                <div class="state-info">
                  <div class="state-title">洞穴时间</div>
                  <div class="state-value">{{ getCavePhaseName() }}</div>
                  <div class="state-detail">洞穴时间阶段</div>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-card shadow="hover" class="state-card">
              <div class="state-card-content">
                <div class="state-icon-container" :class="getCaveMoonClass()">
                  <i :class="getCaveMoonIcon()"></i>
                </div>
                <div class="state-info">
                  <div class="state-title">洞穴月相</div>
                  <div class="state-value">{{ getCaveMoonPhaseName() }}</div>
                  <div class="state-detail">{{ getCaveMoonPhaseDetail() }}</div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 梦魇循环信息卡片 -->
        <el-row :gutter="20" class="state-cards" v-if="hasNightmareInfo()">
          <el-col :xs="24" :sm="12" :md="6">
            <el-card shadow="hover" class="state-card">
              <div class="state-card-content">
                <div class="state-icon-container" :class="getNightmarePhaseClass()">
                  <i :class="getNightmarePhaseIcon()"></i>
                </div>
                <div class="state-info">
                  <div class="state-title">梦魇循环</div>
                  <div class="state-value">{{ getNightmarePhaseName() }}</div>
                  <div class="state-detail">{{ getNightmarePhaseDetail() }}</div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 季节进度条 -->
        <el-card shadow="hover" class="season-progress-card">
          <div slot="header" class="clearfix">
            <span>地表季节进度</span>
            <span class="season-days">
              已过 {{ worldState.elapsed_days_in_season }} 天 / 剩余 {{ worldState.remaining_days_in_season }} 天
            </span>
          </div>
          <div class="season-progress">
            <el-progress
              :percentage="(worldState.season_progress * 100).toFixed(1)"
              :color="getSeasonColor()"
              :stroke-width="20"
              :format="format => `${format}%`">
            </el-progress>
          </div>
          <div class="season-lengths">
            <div class="season-length">
              <span class="season-name autumn">秋季:</span>
              <span class="season-days">{{ worldState.autumn_length }} 天</span>
            </div>
            <div class="season-length">
              <span class="season-name winter">冬季:</span>
              <span class="season-days">{{ worldState.winter_length }} 天</span>
            </div>
            <div class="season-length">
              <span class="season-name spring">春季:</span>
              <span class="season-days">{{ worldState.spring_length }} 天</span>
            </div>
            <div class="season-length">
              <span class="season-name summer">夏季:</span>
              <span class="season-days">{{ worldState.summer_length }} 天</span>
            </div>
          </div>
        </el-card>

        <!-- 详细信息表格 -->
        <el-card shadow="hover" class="details-card">
          <div slot="header" class="clearfix">
            <span>详细信息</span>
            <el-dropdown style="float: right; margin-left: 10px;" @command="handleCategoryFilter">
              <el-button type="text">
                {{ currentCategory || '所有分类' }} <i class="el-icon-arrow-down"></i>
              </el-button>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item command="">所有分类</el-dropdown-item>
                <el-dropdown-item command="basic">基本信息</el-dropdown-item>
                <el-dropdown-item command="season">季节信息</el-dropdown-item>
                <el-dropdown-item command="time">时间信息</el-dropdown-item>
                <el-dropdown-item command="moon">月相信息</el-dropdown-item>
                <el-dropdown-item command="weather">天气信息</el-dropdown-item>
                <el-dropdown-item command="cave">洞穴信息</el-dropdown-item>
                <el-dropdown-item command="nightmare">梦魇循环信息</el-dropdown-item>
                <el-dropdown-item command="other">其他信息</el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
            <el-input
              placeholder="搜索属性或描述"
              v-model="searchQuery"
              style="float: right; width: 200px;"
              clearable
              @clear="handleSearchClear"
              prefix-icon="el-icon-search">
            </el-input>
          </div>
          <el-table :data="filteredDetailsTableData" style="width: 100%" border stripe>
            <el-table-column prop="name" label="属性" width="180"></el-table-column>
            <el-table-column prop="value" label="值"></el-table-column>
            <el-table-column prop="description" label="描述"></el-table-column>
          </el-table>
        </el-card>

        <!-- 原始数据 -->
        <el-card shadow="hover" class="raw-data-card">
          <div slot="header" class="clearfix">
            <span>原始数据</span>
            <el-button style="float: right; padding: 3px 0" type="text" @click="toggleRawData">
              {{ showRawData ? '隐藏' : '显示' }}
            </el-button>
          </div>
          <div v-if="showRawData" class="raw-data">
            <pre>{{ worldState.raw_data }}</pre>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script>
import api from '@/api';

export default {
  name: 'WorldState',
  data() {
    return {
      loading: false,
      archives: [],
      selectedArchive: '',
      selectedWorld: '',
      worldState: null,
      showRawData: false,
      autoRefresh: false,
      refreshInterval: null,
      detailsTableData: [],
      searchQuery: '',
      currentCategory: '',
      categoryMap: {
        basic: '基本信息',
        season: '季节信息',
        time: '时间信息',
        moon: '月相信息',
        weather: '天气信息',
        cave: '洞穴信息',
        nightmare: '梦魇循环信息',
        other: '其他信息'
      }
    };
  },
  computed: {
    worldsOfSelectedArchive() {
      if (!this.selectedArchive) return [];
      const archive = this.archives.find(a => a.name === this.selectedArchive || a.id === this.selectedArchive);

      // 检查archive对象的结构
      if (!archive) return [];

      // 如果有worlds属性并且是数组，直接返回
      if (archive.worlds && Array.isArray(archive.worlds)) {
        return archive.worlds;
      }

      // 如果有children属性并且是数组，返回它
      if (archive.children && Array.isArray(archive.children)) {
        return archive.children;
      }

      return [];
    },

    // 过滤后的详细信息表格数据
    filteredDetailsTableData() {
      if (!this.detailsTableData || this.detailsTableData.length === 0) {
        return [];
      }

      let result = this.detailsTableData;

      // 如果有搜索查询，按搜索查询过滤
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        result = result.filter(item => {
          return (
            (item.name && item.name.toLowerCase().includes(query)) ||
            (item.description && item.description.toLowerCase().includes(query)) ||
            (item.value && String(item.value).toLowerCase().includes(query))
          );
        });
      }

      // 如果有分类过滤，按分类过滤
      if (this.currentCategory) {
        // 根据当前分类确定起始和结束索引
        const categoryRanges = {
          basic: { start: 0, end: 3 },
          season: { start: 3, end: 15 },
          time: { start: 15, end: 21 },
          moon: { start: 21, end: 25 },
          weather: { start: 25, end: 38 },
          cave: { start: 38, end: 46 },
          nightmare: { start: 46, end: 53 },
          other: { start: 53, end: 54 }
        };

        const range = categoryRanges[this.currentCategory];
        if (range) {
          // 如果有搜索查询，则不使用索引范围，而是使用分类名称过滤
          if (this.searchQuery) {
            // 已经按搜索查询过滤过了，不需要再过滤
          } else {
            result = this.detailsTableData.slice(range.start, range.end);
          }
        }
      }

      return result;
    }
  },
  created() {
    this.fetchArchives();
  },
  beforeDestroy() {
    this.clearRefreshInterval();
  },
  methods: {
    // 获取存档列表
    fetchArchives() {
      this.loading = true;
      api.worldApi.getWorldList()
        .then(response => {
          console.log('存档列表响应:', response);
          // 检查响应结构，处理可能的嵌套数据
          let archivesList = [];
          if (response && response.status === 200) {
            if (Array.isArray(response.data)) {
              archivesList = response.data;
            } else if (response.data && response.data.code === 200 && Array.isArray(response.data.data)) {
              archivesList = response.data.data;
            }

            this.archives = archivesList;
            console.log('处理后的存档列表:', this.archives);

            // 如果URL中有参数，自动选择
            const query = this.$route.query;
            if (query.archive && query.world) {
              this.selectedArchive = query.archive;
              this.$nextTick(() => {
                this.selectedWorld = query.world;
                this.fetchWorldState();
              });
            }
          }
        })
        .catch(error => {
          console.error('获取存档列表失败:', error);
          this.$message.error('获取存档列表失败');
        })
        .finally(() => {
          this.loading = false;
        });
    },

    // 存档变更处理
    handleArchiveChange() {
      this.selectedWorld = '';
    },

    // 获取世界状态
    fetchWorldState() {
      if (!this.selectedArchive || !this.selectedWorld) {
        this.$message.warning('请选择存档和世界');
        return;
      }

      console.log('开始获取世界状态，参数:', {
        archive_name: this.selectedArchive,
        world_name: this.selectedWorld
      });

      this.loading = true;
      api.worldApi.getWorldState({
        archive_name: this.selectedArchive,
        world_name: this.selectedWorld
      })
        .then(response => {
          console.log('世界状态API响应:', response);

          // 直接检查响应数据结构，不依赖response.status
          if (response && response.data) {
            console.log('完整响应数据:', JSON.stringify(response.data));
            console.log('响应数据的code类型:', typeof response.data.code, '值:', response.data.code);

            // 检查是否有data属性，如果有，则认为是成功的响应
            // 如果没有code属性，或者code属性等于200，则认为是成功的响应
            if (!response.data.hasOwnProperty('code') || response.data.code == 200) {
              // 检查是否是直接返回的数据（没有data属性，但有其他属性）
              if (!response.data.hasOwnProperty('data') && response.data.hasOwnProperty('season') && response.data.hasOwnProperty('phase')) {
                // 直接使用响应数据
                this.worldState = response.data;
                console.log('直接使用响应数据作为世界状态数据:', this.worldState);

                try {
                  this.prepareDetailsTableData();
                  console.log('详细信息表格数据准备完成:', this.detailsTableData);
                } catch (err) {
                  console.error('准备详细信息表格数据时出错:', err);
                  this.$message.error('处理世界状态数据时出错');
                }

                // 更新URL参数，方便分享
                // 只有当URL参数与当前选择的存档和世界不同时才更新
                const currentQuery = this.$route.query;
                if (currentQuery.archive !== this.selectedArchive || currentQuery.world !== this.selectedWorld) {
                  this.$router.replace({
                    query: {
                      archive: this.selectedArchive,
                      world: this.selectedWorld
                    }
                  }).catch(err => {
                    // 忽略导航重复错误
                    if (err.name !== 'NavigationDuplicated') {
                      console.error('更新URL参数时出错:', err);
                    }
                  });
                }

                this.$message.success('获取世界状态信息成功');
              }
              // 如果有data属性，则使用它
              else if (response.data.hasOwnProperty('data')) {
                // 如果data属性不为空，则使用它
                if (response.data.data && Object.keys(response.data.data).length > 0) {
                  this.worldState = response.data.data;
                  console.log('获取到世界状态数据:', this.worldState);

                  try {
                    this.prepareDetailsTableData();
                    console.log('详细信息表格数据准备完成:', this.detailsTableData);
                  } catch (err) {
                    console.error('准备详细信息表格数据时出错:', err);
                    this.$message.error('处理世界状态数据时出错');
                  }

                  // 更新URL参数，方便分享
                  // 只有当URL参数与当前选择的存档和世界不同时才更新
                  const currentQuery = this.$route.query;
                  if (currentQuery.archive !== this.selectedArchive || currentQuery.world !== this.selectedWorld) {
                    this.$router.replace({
                      query: {
                        archive: this.selectedArchive,
                        world: this.selectedWorld
                      }
                    }).catch(err => {
                      // 忽略导航重复错误
                      if (err.name !== 'NavigationDuplicated') {
                        console.error('更新URL参数时出错:', err);
                      }
                    });
                  }

                  this.$message.success(response.data.msg || '获取世界状态信息成功');
                } else {
                  // 如果data属性为空，但响应成功，显示成功消息
                  console.log('响应成功，但数据为空:', response.data);
                  this.$message.info(response.data.msg || '获取世界状态信息成功，但数据为空');
                  // 清空当前世界状态
                  this.worldState = null;

                  // 在空状态下显示更友好的提示
                  this.$nextTick(() => {
                    const emptyState = document.querySelector('.empty-state');
                    if (emptyState) {
                      const p = emptyState.querySelector('p');
                      if (p) {
                        p.textContent = '没有找到世界状态数据，请确认所选世界是否正在运行';
                      }
                    }
                  });
                }
              }
            } else {
              // 响应中的code不是200，显示错误消息
              console.error('响应中的code不是200:', response.data);
              // 如果有错误消息，显示错误消息，否则显示通用错误消息
              this.$message.error(response.data.msg || '响应数据结构不符合预期');
              // 清空当前世界状态
              this.worldState = null;
            }
          } else {
            // 响应中没有data属性
            console.error('响应中没有data属性:', response);
            this.$message.error('响应数据结构不符合预期');
            // 清空当前世界状态
            this.worldState = null;
          }
        })
        .catch(error => {
          console.error('获取世界状态失败:', error);

          // 尝试从错误对象中提取更详细的错误信息
          let errorMsg = '未知错误';
          if (error.message) {
            errorMsg = error.message;
          } else if (error.response && error.response.data) {
            // 如果是Axios错误并且有响应数据
            if (error.response.data.msg) {
              errorMsg = error.response.data.msg;
            } else if (typeof error.response.data === 'string') {
              errorMsg = error.response.data;
            }
          }

          this.$message.error(`获取世界状态失败: ${errorMsg}`);

          // 清空当前世界状态
          this.worldState = null;
        })
        .finally(() => {
          this.loading = false;
        });
    },

    // 刷新数据
    refreshData() {
      this.fetchWorldState();
    },

    // 切换显示原始数据
    toggleRawData() {
      this.showRawData = !this.showRawData;
    },

    // 处理分类过滤
    handleCategoryFilter(category) {
      this.currentCategory = category;
    },

    // 处理搜索清除
    handleSearchClear() {
      this.searchQuery = '';
    },

    // 设置自动刷新
    setAutoRefresh(enabled) {
      this.autoRefresh = enabled;
      this.clearRefreshInterval();

      if (enabled) {
        this.refreshInterval = setInterval(() => {
          this.fetchWorldState();
        }, 30000); // 30秒刷新一次
      }
    },

    // 清除刷新定时器
    clearRefreshInterval() {
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
        this.refreshInterval = null;
      }
    },

    // 准备详细信息表格数据
    prepareDetailsTableData() {
      if (!this.worldState) {
        console.warn('无法准备详细信息表格数据：worldState为空');
        return;
      }

      try {
        // 创建一个安全的获取属性的函数
        const safeGet = (obj, path, defaultValue = '') => {
          try {
            if (!obj) return defaultValue;
            if (typeof path === 'string') {
              return obj[path] !== undefined ? obj[path] : defaultValue;
            }
            return defaultValue;
          } catch (err) {
            console.error(`获取属性 ${path} 失败:`, err);
            return defaultValue;
          }
        };

        // 安全的格式化数字
        const safeToFixed = (num, digits = 2) => {
          try {
            if (typeof num === 'number') {
              return num.toFixed(digits);
            }
            return String(num || '0');
          } catch (err) {
            console.error(`格式化数字 ${num} 失败:`, err);
            return '0';
          }
        };

        // 基本信息
        const basicInfo = [
          { name: '存档名称', value: safeGet(this.worldState, 'archive_name'), description: '游戏存档的名称' },
          { name: '世界名称', value: safeGet(this.worldState, 'world_name'), description: '当前世界的名称' },
          { name: '世界天数', value: safeGet(this.worldState, 'cycles'), description: '从世界创建开始，已经过的完整昔夜循环总数' }
        ];

        // 地表季节信息
        const seasonInfo = [
          { name: '地表季节', value: this.getSeasonName(), description: '地表的当前季节' },
          { name: '当前季节已过天数', value: safeGet(this.worldState, 'elapsed_days_in_season'), description: '当前季节已经过去的天数' },
          { name: '当前季节剩余天数', value: safeGet(this.worldState, 'remaining_days_in_season'), description: '当前季节还剩余的天数' },
          { name: '季节进度', value: `${safeToFixed(safeGet(this.worldState, 'season_progress', 0) * 100, 1)}%`, description: '当前季节的进度 (0-100%)' },
          { name: '是否秋季', value: safeGet(this.worldState, 'is_autumn') ? '是' : '否', description: '当前是否是秋季' },
          { name: '是否冬季', value: safeGet(this.worldState, 'is_winter') ? '是' : '否', description: '当前是否是冬季' },
          { name: '是否春季', value: safeGet(this.worldState, 'is_spring') ? '是' : '否', description: '当前是否是春季' },
          { name: '是否夏季', value: safeGet(this.worldState, 'is_summer') ? '是' : '否', description: '当前是否是夏季' },
          { name: '秋季长度', value: safeGet(this.worldState, 'autumn_length'), description: '秋季设定持续的总天数' },
          { name: '冬季长度', value: safeGet(this.worldState, 'winter_length'), description: '冬季设定持续的总天数' },
          { name: '春季长度', value: safeGet(this.worldState, 'spring_length'), description: '春季设定持续的总天数' },
          { name: '夏季长度', value: safeGet(this.worldState, 'summer_length'), description: '夏季设定持续的总天数' }
        ];

        // 地表时间信息
        const timeInfo = [
          { name: '地表时间阶段', value: this.getPhaseName(), description: '地表的当前时间阶段(白天/黄昏/夜晚)' },
          { name: '是否白天', value: safeGet(this.worldState, 'is_day') ? '是' : '否', description: '地表当前是否是白天' },
          { name: '是否黄昏', value: safeGet(this.worldState, 'is_dusk') ? '是' : '否', description: '地表当前是否是黄昏' },
          { name: '是否夜晚', value: safeGet(this.worldState, 'is_night') ? '是' : '否', description: '地表当前是否是夜晚' },
          { name: '当前阶段进度', value: `${safeToFixed(safeGet(this.worldState, 'time_in_phase', 0) * 100, 1)}%`, description: '当前在当前时间阶段内的进度 (0-100%)' },
          { name: '全天进度', value: `${safeToFixed(safeGet(this.worldState, 'time', 0) * 100, 1)}%`, description: '当前在整个昔夜循环中的进度 (0-100%)' }
        ];

        // 地表月相信息
        const moonInfo = [
          { name: '地表月相', value: this.getMoonPhaseName(), description: '地表的当前月相' },
          { name: '是否满月', value: safeGet(this.worldState, 'is_full_moon') ? '是' : '否', description: '地表当前是否是满月' },
          { name: '是否新月', value: safeGet(this.worldState, 'is_new_moon') ? '是' : '否', description: '地表当前是否是新月' },
          { name: '是否渐盈期', value: safeGet(this.worldState, 'is_waxing_moon') ? '是' : '否', description: '地表的月亮当前是否处于渐盈状态' }
        ];

        // 地表天气信息
        const weatherInfo = [
          { name: '地表温度', value: `${safeToFixed(safeGet(this.worldState, 'temperature', 0), 1)}°C`, description: '当前世界的环境温度' },
          { name: '降水类型', value: this.getPrecipitationName(), description: '当前的降水类型' },
          { name: '降水概率', value: `${safeToFixed(safeGet(this.worldState, 'pop', 0) * 100, 1)}%`, description: '降水概率' },
          { name: '是否下雨', value: safeGet(this.worldState, 'is_raining') ? '是' : '否', description: '当前是否正在下雨' },
          { name: '是否下雪', value: safeGet(this.worldState, 'is_snowing') ? '是' : '否', description: '当前是否正在下雪' },
          { name: '是否下酸雨', value: safeGet(this.worldState, 'is_acid_raining') ? '是' : '否', description: '当前是否正在下酸雨' },
          { name: '是否下月石雹', value: safeGet(this.worldState, 'is_lunar_hailing') ? '是' : '否', description: '当前是否正在下月石雹' },
          { name: '月石雹等级', value: safeGet(this.worldState, 'lunar_hail_level'), description: '月石雹的强度等级' },
          { name: '湿度', value: safeToFixed(safeGet(this.worldState, 'wetness', 0), 1), description: '影响玩家角色的潮湿度等级' },
          { name: '是否潮湿', value: safeGet(this.worldState, 'is_wet') ? '是' : '否', description: '世界环境当前是否普遍潮湿' },
          { name: '水分', value: `${safeToFixed(safeGet(this.worldState, 'moisture', 0), 1)} / ${safeToFixed(safeGet(this.worldState, 'moisture_ceil', 0), 1)}`, description: '当前世界的水分值/上限' },
          { name: '雪量', value: safeToFixed(safeGet(this.worldState, 'snow_level', 0), 1), description: '当前地面积雪的程度' },
          { name: '是否被雪覆盖', value: safeGet(this.worldState, 'is_snow_covered') ? '是' : '否', description: '地表是否被雪覆盖' }
        ];

        // 洞穴信息
        const caveInfo = [
          { name: '洞穴时间阶段', value: safeGet(this.worldState, 'cavephase'), description: '洞穴中的当前时间阶段' },
          { name: '洞穴是否白天', value: safeGet(this.worldState, 'iscaveday') ? '是' : '否', description: '洞穴中当前是否是白天' },
          { name: '洞穴是否黄昏', value: safeGet(this.worldState, 'iscavedusk') ? '是' : '否', description: '洞穴中当前是否是黄昏' },
          { name: '洞穴是否夜晚', value: safeGet(this.worldState, 'iscavenight') ? '是' : '否', description: '洞穴中当前是否是夜晚' },
          { name: '洞穴月相', value: safeGet(this.worldState, 'cavemoonphase'), description: '洞穴中的当前月相' },
          { name: '洞穴是否满月', value: safeGet(this.worldState, 'iscavefullmoon') ? '是' : '否', description: '洞穴中当前是否是满月' },
          { name: '洞穴是否新月', value: safeGet(this.worldState, 'iscavenewmoon') ? '是' : '否', description: '洞穴中当前是否是新月' },
          { name: '洞穴是否渐盈期', value: safeGet(this.worldState, 'iscavewaxingmoon') ? '是' : '否', description: '洞穴中的月亮当前是否处于渐盈状态' }
        ];

        // 梦魇循环信息
        const nightmareInfo = [
          { name: '梦魇循环阶段', value: safeGet(this.worldState, 'nightmarephase'), description: '当前梦魇循环的阶段' },
          { name: '是否梦魇平静期', value: safeGet(this.worldState, 'isnightmarecalm') ? '是' : '否', description: '梦魇循环当前是否处于平静阶段' },
          { name: '是否梦魇黑暗期', value: safeGet(this.worldState, 'isnightmarewild') ? '是' : '否', description: '梦魇循环当前是否处于黑暗阶段' },
          { name: '是否梦魇警告期', value: safeGet(this.worldState, 'isnightmarewarn') ? '是' : '否', description: '梦魇循环当前是否处于警告阶段' },
          { name: '是否梦魇黄昏期', value: safeGet(this.worldState, 'isnightmaredawn') ? '是' : '否', description: '梦魇循环当前是否处于黄昏阶段' },
          { name: '梦魇循环时间', value: safeGet(this.worldState, 'nightmaretime'), description: '在当前梦魇循环状态下经过的总时间' },
          { name: '梦魇循环阶段时间', value: safeGet(this.worldState, 'nightmaretimeinphase'), description: '在当前梦魇循环的单个阶段内经过的时间' }
        ];

        // 其他信息
        const otherInfo = [
          { name: '月亮祈坛是否激活', value: safeGet(this.worldState, 'is_alter_awake') ? '是' : '否', description: '月亮祈坛/天体英雄是否处于激活状态' }
        ];

        // 合并所有信息
        this.detailsTableData = [
          ...basicInfo,
          ...seasonInfo,
          ...timeInfo,
          ...moonInfo,
          ...weatherInfo,
          ...caveInfo,
          ...nightmareInfo,
          ...otherInfo
        ];

        console.log('详细信息表格数据准备完成');
      } catch (err) {
        console.error('准备详细信息表格数据时出错:', err);
        this.detailsTableData = [];
      }
    },

    // 获取季节名称
    getSeasonName() {
      if (!this.worldState) return '';

      try {
        const seasonMap = {
          autumn: '秋季',
          winter: '冬季',
          spring: '春季',
          summer: '夏季'
        };

        const season = this.worldState.season;
        if (!season) return '未知';

        return seasonMap[season] || season;
      } catch (err) {
        console.error('获取季节名称时出错:', err);
        return '未知';
      }
    },

    // 获取季节详细信息
    getSeasonDetail() {
      if (!this.worldState) return '';

      try {
        const elapsed = this.worldState.elapsed_days_in_season || 0;
        const remaining = this.worldState.remaining_days_in_season || 0;
        const total = elapsed + remaining;
        const progress = this.worldState.season_progress || 0;

        return `已过 ${elapsed} 天 / 剩余 ${remaining} 天 (进度: ${(progress * 100).toFixed(1)}%)`;
      } catch (err) {
        console.error('获取季节详细信息时出错:', err);
        return '';
      }
    },

    // 获取季节图标
    getSeasonIcon() {
      if (!this.worldState) return 'el-icon-question';

      try {
        const iconMap = {
          autumn: 'el-icon-umbrella',
          winter: 'el-icon-heavy-rain',
          spring: 'el-icon-sunrise',
          summer: 'el-icon-sunny'
        };

        const season = this.worldState.season;
        if (!season) return 'el-icon-question';

        return iconMap[season] || 'el-icon-question';
      } catch (err) {
        console.error('获取季节图标时出错:', err);
        return 'el-icon-question';
      }
    },

    // 获取季节样式类
    getSeasonClass() {
      if (!this.worldState) return '';

      try {
        const season = this.worldState.season;
        if (!season) return 'season-unknown';

        return `season-${season}`;
      } catch (err) {
        console.error('获取季节样式类时出错:', err);
        return 'season-unknown';
      }
    },

    // 获取季节颜色
    getSeasonColor() {
      if (!this.worldState) return '#409EFF';

      const colorMap = {
        autumn: '#E6A23C',
        winter: '#909399',
        spring: '#67C23A',
        summer: '#F56C6C'
      };

      return colorMap[this.worldState.season] || '#409EFF';
    },

    // 获取时间阶段名称
    getPhaseName() {
      if (!this.worldState) return '';

      try {
        const phaseMap = {
          day: '白天',
          dusk: '黄昏',
          night: '夜晚'
        };

        const phase = this.worldState.phase;
        if (!phase) return '未知';

        return phaseMap[phase] || phase;
      } catch (err) {
        console.error('获取时间阶段名称时出错:', err);
        return '未知';
      }
    },

    // 获取时间详细信息
    getPhaseDetail() {
      if (!this.worldState) return '';

      try {
        const timeInPhase = this.worldState.time_in_phase || 0;
        const time = this.worldState.time || 0;

        return `当前阶段进度: ${(timeInPhase * 100).toFixed(1)}%`;
      } catch (err) {
        console.error('获取时间详细信息时出错:', err);
        return '';
      }
    },

    // 获取时间阶段图标
    getPhaseIcon() {
      if (!this.worldState) return 'el-icon-question';

      const iconMap = {
        day: 'el-icon-sunny',
        dusk: 'el-icon-sunset',
        night: 'el-icon-moon'
      };

      return iconMap[this.worldState.phase] || 'el-icon-question';
    },

    // 获取时间阶段样式类
    getPhaseClass() {
      if (!this.worldState) return '';

      return `phase-${this.worldState.phase}`;
    },

    // 获取天气名称
    getWeatherName() {
      if (!this.worldState) return '';

      try {
        if (this.worldState.is_snowing) return '下雪';
        if (this.worldState.is_raining) return '下雨';
        if (this.worldState.is_acid_raining) return '酸雨';
        if (this.worldState.is_lunar_hailing) return '月石雹';

        return '晴朗';
      } catch (err) {
        console.error('获取天气名称时出错:', err);
        return '未知';
      }
    },

    // 获取天气详细信息
    getWeatherDetail() {
      if (!this.worldState) return '';

      try {
        let details = [];

        // 添加降水类型信息
        if (this.worldState.precipitation && this.worldState.precipitation !== 'none') {
          const precipitationMap = {
            rain: '雨',
            snow: '雪'
          };
          details.push(`降水类型: ${precipitationMap[this.worldState.precipitation] || this.worldState.precipitation}`);
        }

        // 添加降水概率
        if (this.worldState.hasOwnProperty('pop')) {
          details.push(`降水概率: ${(this.worldState.pop * 100).toFixed(1)}%`);
        }

        // 添加湿度信息
        if (this.worldState.hasOwnProperty('wetness')) {
          details.push(`湿度: ${this.worldState.wetness.toFixed(1)}`);
        }

        // 添加雪量信息
        if (this.worldState.hasOwnProperty('snow_level') && this.worldState.snow_level > 0) {
          details.push(`雪量: ${this.worldState.snow_level.toFixed(1)}`);
        }

        // 添加雪覆盖信息
        if (this.worldState.is_snow_covered) {
          details.push('地面被雪覆盖');
        }

        return details.join(', ') || '无特殊天气状况';
      } catch (err) {
        console.error('获取天气详细信息时出错:', err);
        return '';
      }
    },

    // 获取天气图标
    getWeatherIcon() {
      if (!this.worldState) return 'el-icon-question';

      if (this.worldState.is_snowing) return 'el-icon-heavy-rain';
      if (this.worldState.is_raining) return 'el-icon-umbrella';
      if (this.worldState.is_acid_raining) return 'el-icon-lightning';
      if (this.worldState.is_lunar_hailing) return 'el-icon-lightning';

      return 'el-icon-sunny';
    },

    // 获取天气样式类
    getWeatherClass() {
      if (!this.worldState) return '';

      if (this.worldState.is_snowing) return 'weather-snow';
      if (this.worldState.is_raining) return 'weather-rain';
      if (this.worldState.is_acid_raining) return 'weather-acid';
      if (this.worldState.is_lunar_hailing) return 'weather-hail';

      return 'weather-clear';
    },

    // 获取降水类型名称
    getPrecipitationName() {
      if (!this.worldState) return '';

      const precipitationMap = {
        none: '无',
        rain: '雨',
        snow: '雪'
      };

      return precipitationMap[this.worldState.precipitation] || this.worldState.precipitation;
    },

    // 获取月相名称
    getMoonPhaseName() {
      if (!this.worldState) return '';

      try {
        const moonPhaseMap = {
          new: '新月',
          quarter: '弦月',
          half: '半月',
          threequarter: '盈凸月',
          full: '满月'
        };

        const moonPhase = this.worldState.moon_phase;
        if (!moonPhase) return '未知';

        return moonPhaseMap[moonPhase] || moonPhase;
      } catch (err) {
        console.error('获取月相名称时出错:', err);
        return '未知';
      }
    },

    // 获取月相图标
    getMoonIcon() {
      if (!this.worldState) return 'el-icon-question';

      const iconMap = {
        new: 'el-icon-moon-night',
        quarter: 'el-icon-moon',
        half: 'el-icon-moon',
        threequarter: 'el-icon-moon',
        full: 'el-icon-full-moon'
      };

      // 使用默认图标，因为Element UI没有所有月相的图标
      return 'el-icon-moon';
    },

    // 获取月相样式类
    getMoonClass() {
      if (!this.worldState) return '';

      return `moon-${this.worldState.moon_phase}`;
    },

    // 获取月相详细信息
    getMoonPhaseDetail() {
      if (!this.worldState) return '';

      try {
        let details = [];

        if (this.worldState.is_full_moon) details.push('满月');
        if (this.worldState.is_new_moon) details.push('新月');
        if (this.worldState.is_waxing_moon) details.push('渐盈期');
        else details.push('渐亡期');

        return details.join(', ');
      } catch (err) {
        console.error('获取月相详细信息时出错:', err);
        return '';
      }
    },

    // 检查是否有洞穴信息
    hasCaveInfo() {
      if (!this.worldState) return false;

      try {
        // 检查是否有洞穴相关属性
        return (
          this.worldState.hasOwnProperty('cavephase') ||
          this.worldState.hasOwnProperty('iscaveday') ||
          this.worldState.hasOwnProperty('iscavedusk') ||
          this.worldState.hasOwnProperty('iscavenight') ||
          this.worldState.hasOwnProperty('cavemoonphase')
        );
      } catch (err) {
        console.error('检查洞穴信息时出错:', err);
        return false;
      }
    },

    // 获取洞穴时间阶段名称
    getCavePhaseName() {
      if (!this.worldState) return '';

      try {
        const phaseMap = {
          day: '白天',
          dusk: '黄昏',
          night: '夜晚'
        };

        const phase = this.worldState.cavephase;
        if (!phase) return '未知';

        return phaseMap[phase] || phase;
      } catch (err) {
        console.error('获取洞穴时间阶段名称时出错:', err);
        return '未知';
      }
    },

    // 获取洞穴时间阶段图标
    getCavePhaseIcon() {
      if (!this.worldState) return 'el-icon-question';

      try {
        const iconMap = {
          day: 'el-icon-sunny',
          dusk: 'el-icon-sunset',
          night: 'el-icon-moon'
        };

        const phase = this.worldState.cavephase;
        if (!phase) return 'el-icon-question';

        return iconMap[phase] || 'el-icon-question';
      } catch (err) {
        console.error('获取洞穴时间阶段图标时出错:', err);
        return 'el-icon-question';
      }
    },

    // 获取洞穴时间阶段样式类
    getCavePhaseClass() {
      if (!this.worldState) return '';

      try {
        const phase = this.worldState.cavephase;
        if (!phase) return 'phase-unknown';

        return `phase-${phase}`;
      } catch (err) {
        console.error('获取洞穴时间阶段样式类时出错:', err);
        return 'phase-unknown';
      }
    },

    // 获取洞穴月相名称
    getCaveMoonPhaseName() {
      if (!this.worldState) return '';

      try {
        const moonPhaseMap = {
          new: '新月',
          quarter: '弦月',
          half: '半月',
          threequarter: '盈凸月',
          full: '满月'
        };

        const moonPhase = this.worldState.cavemoonphase;
        if (!moonPhase) return '未知';

        return moonPhaseMap[moonPhase] || moonPhase;
      } catch (err) {
        console.error('获取洞穴月相名称时出错:', err);
        return '未知';
      }
    },

    // 获取洞穴月相图标
    getCaveMoonIcon() {
      if (!this.worldState) return 'el-icon-question';

      try {
        // 使用默认图标，因为Element UI没有所有月相的图标
        return 'el-icon-moon';
      } catch (err) {
        console.error('获取洞穴月相图标时出错:', err);
        return 'el-icon-question';
      }
    },

    // 获取洞穴月相样式类
    getCaveMoonClass() {
      if (!this.worldState) return '';

      try {
        const moonPhase = this.worldState.cavemoonphase;
        if (!moonPhase) return 'moon-unknown';

        return `moon-${moonPhase}`;
      } catch (err) {
        console.error('获取洞穴月相样式类时出错:', err);
        return 'moon-unknown';
      }
    },

    // 获取洞穴月相详细信息
    getCaveMoonPhaseDetail() {
      if (!this.worldState) return '';

      try {
        let details = [];

        if (this.worldState.iscavefullmoon) details.push('满月');
        if (this.worldState.iscavenewmoon) details.push('新月');
        if (this.worldState.iscavewaxingmoon) details.push('渐盈期');
        else details.push('渐亡期');

        return details.join(', ');
      } catch (err) {
        console.error('获取洞穴月相详细信息时出错:', err);
        return '';
      }
    },

    // 检查是否有梦魇循环信息
    hasNightmareInfo() {
      if (!this.worldState) return false;

      try {
        // 检查是否有梦魇循环相关属性
        return (
          this.worldState.hasOwnProperty('nightmarephase') ||
          this.worldState.hasOwnProperty('isnightmarecalm') ||
          this.worldState.hasOwnProperty('isnightmarewild') ||
          this.worldState.hasOwnProperty('isnightmarewarn') ||
          this.worldState.hasOwnProperty('isnightmaredawn')
        );
      } catch (err) {
        console.error('检查梦魇循环信息时出错:', err);
        return false;
      }
    },

    // 获取梦魇循环阶段名称
    getNightmarePhaseName() {
      if (!this.worldState) return '';

      try {
        const phaseMap = {
          calm: '平静期',
          warn: '警告期',
          wild: '黑暗期',
          dawn: '黄昏期',
          none: '无效期'
        };

        const phase = this.worldState.nightmarephase;
        if (!phase) return '未知';

        return phaseMap[phase] || phase;
      } catch (err) {
        console.error('获取梦魇循环阶段名称时出错:', err);
        return '未知';
      }
    },

    // 获取梦魇循环阶段图标
    getNightmarePhaseIcon() {
      if (!this.worldState) return 'el-icon-question';

      try {
        const iconMap = {
          calm: 'el-icon-sunny',
          warn: 'el-icon-warning',
          wild: 'el-icon-lightning',
          dawn: 'el-icon-sunset',
          none: 'el-icon-remove'
        };

        const phase = this.worldState.nightmarephase;
        if (!phase) return 'el-icon-question';

        return iconMap[phase] || 'el-icon-question';
      } catch (err) {
        console.error('获取梦魇循环阶段图标时出错:', err);
        return 'el-icon-question';
      }
    },

    // 获取梦魇循环阶段样式类
    getNightmarePhaseClass() {
      if (!this.worldState) return '';

      try {
        const phase = this.worldState.nightmarephase;
        if (!phase) return 'nightmare-unknown';

        return `nightmare-${phase}`;
      } catch (err) {
        console.error('获取梦魇循环阶段样式类时出错:', err);
        return 'nightmare-unknown';
      }
    },

    // 获取梦魇循环阶段详细信息
    getNightmarePhaseDetail() {
      if (!this.worldState) return '';

      try {
        let details = [];

        if (this.worldState.isnightmarecalm) details.push('平静期');
        if (this.worldState.isnightmarewarn) details.push('警告期');
        if (this.worldState.isnightmarewild) details.push('黑暗期');
        if (this.worldState.isnightmaredawn) details.push('黄昏期');

        if (details.length === 0) {
          if (this.worldState.nightmarephase === 'none') {
            details.push('无效期');
          } else {
            details.push('未知状态');
          }
        }

        return details.join(', ');
      } catch (err) {
        console.error('获取梦魇循环阶段详细信息时出错:', err);
        return '';
      }
    }
  }
};
</script>

<style scoped>
.world-state-page {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 84px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ebeef5;
}

.page-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}

.filter-card {
  margin-bottom: 20px;
  transition: all 0.3s;
}

.filter-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.filter-container {
  display: flex;
  align-items: center;
}

.state-content {
  min-height: 300px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #909399;
}

.empty-state i {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state p {
  font-size: 16px;
}

.state-cards {
  margin-bottom: 20px;
}

.state-card {
  height: 140px;
  margin-bottom: 20px;
  transition: all 0.3s;
}

.state-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.state-card-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.state-icon-container {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  color: white;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
}

.state-card:hover .state-icon-container {
  transform: scale(1.1);
}

.state-icon-container i {
  font-size: 36px;
}

.state-info {
  flex: 1;
}

.state-title {
  font-size: 14px;
  color: #909399;
  margin-bottom: 5px;
}

.state-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 5px;
  transition: all 0.3s;
}

.state-card:hover .state-value {
  color: #409EFF;
}

.state-detail {
  font-size: 14px;
  color: #606266;
  margin-bottom: 3px;
}

/* 季节样式 */
.season-autumn {
  background-color: #E6A23C;
}

.season-winter {
  background-color: #909399;
}

.season-spring {
  background-color: #67C23A;
}

.season-summer {
  background-color: #F56C6C;
}

.season-unknown {
  background-color: #909399;
}

/* 时间阶段样式 */
.phase-day, .phase-unknown {
  background-color: #409EFF;
}

.phase-dusk {
  background-color: #E6A23C;
}

.phase-night {
  background-color: #606266;
}

/* 天气样式 */
.weather-clear {
  background-color: #409EFF;
}

.weather-rain {
  background-color: #67C23A;
}

.weather-snow {
  background-color: #909399;
}

.weather-acid {
  background-color: #F56C6C;
}

.weather-hail {
  background-color: #E6A23C;
}

/* 梦魇循环样式 */
.nightmare-calm, .nightmare-unknown {
  background-color: #67C23A;
}

.nightmare-warn {
  background-color: #E6A23C;
}

.nightmare-wild {
  background-color: #F56C6C;
}

.nightmare-dawn {
  background-color: #909399;
}

.nightmare-none {
  background-color: #909399;
}

/* 月相样式 */
.moon-new, .moon-quarter, .moon-half, .moon-threequarter, .moon-full, .moon-unknown {
  background-color: #606266;
}

/* 季节进度条 */
.season-progress-card {
  margin-bottom: 20px;
  transition: all 0.3s;
}

.season-progress-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.season-progress {
  margin-bottom: 15px;
}

.season-days {
  float: right;
  color: #909399;
  font-size: 14px;
}

.season-lengths {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
}

.season-length {
  margin-right: 20px;
  margin-bottom: 10px;
}

.season-name {
  font-weight: bold;
  margin-right: 5px;
}

.season-name.autumn {
  color: #E6A23C;
}

.season-name.winter {
  color: #909399;
}

.season-name.spring {
  color: #67C23A;
}

.season-name.summer {
  color: #F56C6C;
}

/* 详细信息表格 */
.details-card {
  margin-bottom: 20px;
}

.details-card .el-table {
  border-radius: 4px;
  overflow: hidden;
}

.details-card .el-table th {
  background-color: #f5f7fa;
  color: #606266;
  font-weight: bold;
}

.details-card .el-table td {
  padding: 8px 0;
}

/* 原始数据 */
.raw-data-card {
  margin-bottom: 20px;
  transition: all 0.3s;
}

.raw-data-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.raw-data {
  max-height: 300px;
  overflow-y: auto;
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  transition: all 0.3s;
}

.raw-data:hover {
  background-color: #eef1f6;
}

.raw-data pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: 'Courier New', Courier, monospace;
  color: #606266;
}

@media (max-width: 768px) {
  .state-card {
    height: auto;
  }

  .season-lengths {
    flex-direction: column;
  }
}
</style>
