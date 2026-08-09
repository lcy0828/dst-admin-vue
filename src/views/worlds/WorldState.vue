<template>
  <div class="world-state-page">
    <header class="page-header">
      <div>
        <h1>世界状态</h1>
        <p>查询世界的季节、时间、天气和洞穴状态。</p>
      </div>
      <UiButton @click="refreshData" :disabled="loading || !selectedArchive || !selectedWorld">
        <Spinner v-if="loading" data-icon="inline-start" />
        <RefreshCw v-else data-icon="inline-start" />
        刷新
      </UiButton>
    </header>

    <Card class="filter-card">
      <CardHeader>
        <CardTitle>状态查询</CardTitle>
        <CardDescription>选择房间存档和世界分片。</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup class="filter-grid">
          <Field>
            <FieldLabel>存档名称</FieldLabel>
            <UiSelect v-model="selectedArchive" @update:model-value="handleArchiveChange">
              <SelectTrigger><SelectValue placeholder="请选择存档" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem v-for="archive in archives" :key="archive.id || archive.name" :value="archive.name || archive.id">
                    {{ archive.name || archive.id }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </UiSelect>
          </Field>
          <Field>
            <FieldLabel>世界名称</FieldLabel>
            <UiSelect v-model="selectedWorld" :disabled="!selectedArchive">
              <SelectTrigger><SelectValue placeholder="请选择世界" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem
                    v-for="world in worldsOfSelectedArchive"
                    :key="world.id || world.name || world"
                    :value="world.name || (typeof world === 'string' ? world : world.id)"
                  >
                    {{ world.name || (typeof world === 'string' ? world : world.id) }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </UiSelect>
          </Field>
          <Field class="query-action">
            <FieldLabel class="sr-only">查询状态</FieldLabel>
            <UiButton @click="fetchWorldState" :disabled="loading || !selectedArchive || !selectedWorld">查询</UiButton>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>

    <Alert v-if="loadError" variant="destructive">
      <TriangleAlert />
      <AlertTitle>世界状态读取失败</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
      <AlertAction><UiButton size="sm" variant="outline" @click="retryLoad">重新加载</UiButton></AlertAction>
    </Alert>

    <div v-else-if="loading" class="state-skeleton" aria-busy="true" aria-label="正在读取世界状态">
      <Skeleton v-for="row in 6" :key="row" class="h-20 w-full" />
    </div>

    <Empty v-else-if="!worldState">
      <EmptyHeader>
        <EmptyMedia variant="icon"><Activity /></EmptyMedia>
        <EmptyTitle>暂无世界状态</EmptyTitle>
        <EmptyDescription>{{ selectedArchive && selectedWorld ? '点击查询获取最新状态。' : '请选择存档和世界。' }}</EmptyDescription>
      </EmptyHeader>
    </Empty>

    <div v-else class="state-content">
      <div class="state-cards">
        <Card class="state-card">
          <CardContent>
            <component :is="getSeasonIcon()" class="state-icon" />
            <div><span>季节</span><strong>{{ getSeasonName() }}</strong><small>{{ getSeasonDetail() }}</small><small>世界天数: {{ displayValue(worldState.cycles) }}</small></div>
          </CardContent>
        </Card>
        <Card class="state-card">
          <CardContent>
            <component :is="getPhaseIcon()" class="state-icon" />
            <div><span>地表时间</span><strong>{{ getPhaseName() }}</strong><small>{{ getPhaseDetail() }}</small><small>全天进度: {{ formatPercent(worldState.time) }}</small></div>
          </CardContent>
        </Card>
        <Card class="state-card">
          <CardContent>
            <component :is="getWeatherIcon()" class="state-icon" />
            <div><span>地表天气</span><strong>{{ getWeatherName() }}</strong><small>温度: {{ formatNumber(worldState.temperature, 1, '°C') }}</small><small>{{ getWeatherDetail() }}</small></div>
          </CardContent>
        </Card>
        <Card class="state-card">
          <CardContent>
            <component :is="getMoonIcon()" class="state-icon" />
            <div><span>地表月相</span><strong>{{ getMoonPhaseName() }}</strong><small>{{ getMoonPhaseDetail() }}</small></div>
          </CardContent>
        </Card>
        <Card v-if="hasCaveInfo()" class="state-card">
          <CardContent>
            <component :is="getCavePhaseIcon()" class="state-icon" />
            <div><span>洞穴时间</span><strong>{{ getCavePhaseName() }}</strong><small>洞穴时间阶段</small></div>
          </CardContent>
        </Card>
        <Card v-if="hasCaveInfo()" class="state-card">
          <CardContent>
            <component :is="getCaveMoonIcon()" class="state-icon" />
            <div><span>洞穴月相</span><strong>{{ getCaveMoonPhaseName() }}</strong><small>{{ getCaveMoonPhaseDetail() }}</small></div>
          </CardContent>
        </Card>
        <Card v-if="hasNightmareInfo()" class="state-card">
          <CardContent>
            <component :is="getNightmarePhaseIcon()" class="state-icon" />
            <div><span>梦魇循环</span><strong>{{ getNightmarePhaseName() }}</strong><small>{{ getNightmarePhaseDetail() }}</small></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>地表季节进度</CardTitle>
          <CardDescription>已过 {{ displayValue(worldState.elapsed_days_in_season) }} 天 / 剩余 {{ displayValue(worldState.remaining_days_in_season) }} 天</CardDescription>
        </CardHeader>
        <CardContent>
          <UiProgress v-if="isFiniteNumber(worldState.season_progress)" :model-value="worldState.season_progress * 100" />
          <span v-else>--</span>
          <div class="season-lengths">
            <Badge variant="outline">秋季 {{ displayValue(worldState.autumn_length) }} 天</Badge>
            <Badge variant="outline">冬季 {{ displayValue(worldState.winter_length) }} 天</Badge>
            <Badge variant="outline">春季 {{ displayValue(worldState.spring_length) }} 天</Badge>
            <Badge variant="outline">夏季 {{ displayValue(worldState.summer_length) }} 天</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="details-header">
          <div>
            <CardTitle>详细信息</CardTitle>
            <CardDescription>按属性、描述或分类筛选状态字段。</CardDescription>
          </div>
          <div class="details-filters">
            <InputGroup>
              <InputGroupAddon><Search /></InputGroupAddon>
              <InputGroupInput v-model="searchQuery" placeholder="搜索属性或描述" />
            </InputGroup>
            <UiSelect v-model="currentCategory">
              <SelectTrigger><SelectValue placeholder="所有分类" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">所有分类</SelectItem>
                  <SelectItem v-for="(label, key) in categoryMap" :key="key" :value="key">{{ label }}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </UiSelect>
          </div>
        </CardHeader>
        <CardContent class="table-wrap">
          <UiTable>
            <TableHeader><TableRow><TableHead>属性</TableHead><TableHead>值</TableHead><TableHead>描述</TableHead></TableRow></TableHeader>
            <TableBody>
              <TableRow v-for="item in filteredDetailsTableData" :key="item.name">
                <TableCell>{{ item.name }}</TableCell><TableCell>{{ item.value }}</TableCell><TableCell>{{ item.description }}</TableCell>
              </TableRow>
            </TableBody>
          </UiTable>
        </CardContent>
      </Card>

      <Collapsible v-model:open="showRawData">
        <Card>
          <CardHeader class="raw-header">
            <div><CardTitle>原始数据</CardTitle><CardDescription>后端返回的原始世界状态。</CardDescription></div>
            <CollapsibleTrigger as-child>
              <UiButton variant="outline" size="sm">{{ showRawData ? '隐藏' : '显示' }}</UiButton>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent><pre class="raw-data">{{ worldState.raw_data }}</pre></CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  </div>
</template>

<script>
import { Activity, CircleHelp, CircleMinus, CloudRain, CloudSnow, Leaf, Moon, RefreshCw, Search, Snowflake, Sprout, Sun, Sunrise, Sunset, TriangleAlert, Zap } from '@lucide/vue';
import { toast } from 'vue-sonner';
import api from '@/api';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Progress as UiProgress } from '@/components/ui/progress';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default {
  name: 'WorldState',
  components: {
    Activity,
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
    Badge,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    Field,
    FieldGroup,
    FieldLabel,
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    RefreshCw,
    Search,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Skeleton,
    Spinner,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TriangleAlert,
    UiButton,
    UiProgress,
    UiSelect,
    UiTable
  },
  data() {
    return {
      loading: false,
      loadError: '',
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
  beforeUnmount() {
    this.clearRefreshInterval();
  },
  methods: {
    // 获取存档列表
    fetchArchives() {
      this.loading = true;
      this.loadError = '';
      api.worldApi.getWorldList()
        .then(response => {
          this.archives = Array.isArray(response.data) ? response.data : [];

          const query = this.$route.query;
          if (query.archive && query.world) {
            this.selectedArchive = query.archive;
            this.$nextTick(() => {
              this.selectedWorld = query.world;
              this.fetchWorldState();
            });
          }
        })
        .catch(error => {
          this.loadError = error.message || '获取存档列表失败';
          toast.error(`获取存档列表失败: ${error.message || '未知错误'}`);
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
        toast.warning('请选择存档和世界');
        return;
      }

      this.loading = true;
      this.loadError = '';
      api.worldApi.getWorldState({
        archive_name: this.selectedArchive,
        world_name: this.selectedWorld
      })
        .then(response => {
          this.worldState = response.data;
          this.prepareDetailsTableData();

          const currentQuery = this.$route.query;
          if (currentQuery.archive !== this.selectedArchive || currentQuery.world !== this.selectedWorld) {
            this.$router.replace({
              query: { archive: this.selectedArchive, world: this.selectedWorld }
            });
          }
          toast.success(response.msg || '获取世界状态信息成功');
        })
        .catch(error => {
          this.loadError = error.message || '获取世界状态失败';
          toast.error(`获取世界状态失败: ${error.message || '未知错误'}`);
          this.worldState = null;
          this.detailsTableData = [];
        })
        .finally(() => {
          this.loading = false;
        });
    },

    // 刷新数据
    refreshData() {
      this.fetchWorldState();
    },
    retryLoad() {
      return this.selectedArchive && this.selectedWorld ? this.fetchWorldState() : this.fetchArchives();
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

    isFiniteNumber(value) {
      return typeof value === 'number' && Number.isFinite(value);
    },

    displayValue(value) {
      return value === undefined || value === null || value === '' ? '--' : value;
    },

    formatNumber(value, digits = 1, suffix = '') {
      return this.isFiniteNumber(value) ? `${value.toFixed(digits)}${suffix}` : '--';
    },

    formatPercent(value) {
      return this.isFiniteNumber(value) ? `${(value * 100).toFixed(1)}%` : '--';
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
        const safeGet = (obj, path, defaultValue = '--') => {
          try {
            if (!obj) return defaultValue;
            if (typeof path === 'string') {
              const value = obj[path];
              return value !== undefined && value !== null && value !== '' ? value : defaultValue;
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
            if (typeof num === 'number' && Number.isFinite(num)) {
              return num.toFixed(digits);
            }
            return '--';
          } catch (err) {
            console.error(`格式化数字 ${num} 失败:`, err);
            return '--';
          }
        };

        const safePercent = value => {
          return typeof value === 'number' && Number.isFinite(value)
            ? `${safeToFixed(value * 100, 1)}%`
            : '--';
        };

        const booleanValue = value => {
          if (value === true) return '是';
          if (value === false) return '否';
          return '--';
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
          { name: '季节进度', value: safePercent(this.worldState.season_progress), description: '当前季节的进度 (0-100%)' },
          { name: '是否秋季', value: booleanValue(this.worldState.is_autumn), description: '当前是否是秋季' },
          { name: '是否冬季', value: booleanValue(this.worldState.is_winter), description: '当前是否是冬季' },
          { name: '是否春季', value: booleanValue(this.worldState.is_spring), description: '当前是否是春季' },
          { name: '是否夏季', value: booleanValue(this.worldState.is_summer), description: '当前是否是夏季' },
          { name: '秋季长度', value: safeGet(this.worldState, 'autumn_length'), description: '秋季设定持续的总天数' },
          { name: '冬季长度', value: safeGet(this.worldState, 'winter_length'), description: '冬季设定持续的总天数' },
          { name: '春季长度', value: safeGet(this.worldState, 'spring_length'), description: '春季设定持续的总天数' },
          { name: '夏季长度', value: safeGet(this.worldState, 'summer_length'), description: '夏季设定持续的总天数' }
        ];

        // 地表时间信息
        const timeInfo = [
          { name: '地表时间阶段', value: this.getPhaseName(), description: '地表的当前时间阶段(白天/黄昏/夜晚)' },
          { name: '是否白天', value: booleanValue(this.worldState.is_day), description: '地表当前是否是白天' },
          { name: '是否黄昏', value: booleanValue(this.worldState.is_dusk), description: '地表当前是否是黄昏' },
          { name: '是否夜晚', value: booleanValue(this.worldState.is_night), description: '地表当前是否是夜晚' },
          { name: '当前阶段进度', value: safePercent(this.worldState.time_in_phase), description: '当前在当前时间阶段内的进度 (0-100%)' },
          { name: '全天进度', value: safePercent(this.worldState.time), description: '当前在整个昔夜循环中的进度 (0-100%)' }
        ];

        // 地表月相信息
        const moonInfo = [
          { name: '地表月相', value: this.getMoonPhaseName(), description: '地表的当前月相' },
          { name: '是否满月', value: booleanValue(this.worldState.is_full_moon), description: '地表当前是否是满月' },
          { name: '是否新月', value: booleanValue(this.worldState.is_new_moon), description: '地表当前是否是新月' },
          { name: '是否渐盈期', value: booleanValue(this.worldState.is_waxing_moon), description: '地表的月亮当前是否处于渐盈状态' }
        ];

        // 地表天气信息
        const weatherInfo = [
          { name: '地表温度', value: this.isFiniteNumber(this.worldState.temperature) ? `${safeToFixed(this.worldState.temperature, 1)}°C` : '--', description: '当前世界的环境温度' },
          { name: '降水类型', value: this.getPrecipitationName(), description: '当前的降水类型' },
          { name: '降水概率', value: safePercent(this.worldState.pop), description: '降水概率' },
          { name: '是否下雨', value: booleanValue(this.worldState.is_raining), description: '当前是否正在下雨' },
          { name: '是否下雪', value: booleanValue(this.worldState.is_snowing), description: '当前是否正在下雪' },
          { name: '是否下酸雨', value: booleanValue(this.worldState.is_acid_raining), description: '当前是否正在下酸雨' },
          { name: '是否下月石雹', value: booleanValue(this.worldState.is_lunar_hailing), description: '当前是否正在下月石雹' },
          { name: '月石雹等级', value: safeGet(this.worldState, 'lunar_hail_level'), description: '月石雹的强度等级' },
          { name: '湿度', value: safeToFixed(this.worldState.wetness, 1), description: '影响玩家角色的潮湿度等级' },
          { name: '是否潮湿', value: booleanValue(this.worldState.is_wet), description: '世界环境当前是否普遍潮湿' },
          { name: '水分', value: this.isFiniteNumber(this.worldState.moisture) || this.isFiniteNumber(this.worldState.moisture_ceil) ? `${safeToFixed(this.worldState.moisture, 1)} / ${safeToFixed(this.worldState.moisture_ceil, 1)}` : '--', description: '当前世界的水分值/上限' },
          { name: '雪量', value: safeToFixed(this.worldState.snow_level, 1), description: '当前地面积雪的程度' },
          { name: '是否被雪覆盖', value: booleanValue(this.worldState.is_snow_covered), description: '地表是否被雪覆盖' }
        ];

        // 洞穴信息
        const caveInfo = [
          { name: '洞穴时间阶段', value: safeGet(this.worldState, 'cavephase'), description: '洞穴中的当前时间阶段' },
          { name: '洞穴是否白天', value: booleanValue(this.worldState.iscaveday), description: '洞穴中当前是否是白天' },
          { name: '洞穴是否黄昏', value: booleanValue(this.worldState.iscavedusk), description: '洞穴中当前是否是黄昏' },
          { name: '洞穴是否夜晚', value: booleanValue(this.worldState.iscavenight), description: '洞穴中当前是否是夜晚' },
          { name: '洞穴月相', value: safeGet(this.worldState, 'cavemoonphase'), description: '洞穴中的当前月相' },
          { name: '洞穴是否满月', value: booleanValue(this.worldState.iscavefullmoon), description: '洞穴中当前是否是满月' },
          { name: '洞穴是否新月', value: booleanValue(this.worldState.iscavenewmoon), description: '洞穴中当前是否是新月' },
          { name: '洞穴是否渐盈期', value: booleanValue(this.worldState.iscavewaxingmoon), description: '洞穴中的月亮当前是否处于渐盈状态' }
        ];

        // 梦魇循环信息
        const nightmareInfo = [
          { name: '梦魇循环阶段', value: safeGet(this.worldState, 'nightmarephase'), description: '当前梦魇循环的阶段' },
          { name: '是否梦魇平静期', value: booleanValue(this.worldState.isnightmarecalm), description: '梦魇循环当前是否处于平静阶段' },
          { name: '是否梦魇黑暗期', value: booleanValue(this.worldState.isnightmarewild), description: '梦魇循环当前是否处于黑暗阶段' },
          { name: '是否梦魇警告期', value: booleanValue(this.worldState.isnightmarewarn), description: '梦魇循环当前是否处于警告阶段' },
          { name: '是否梦魇黄昏期', value: booleanValue(this.worldState.isnightmaredawn), description: '梦魇循环当前是否处于黄昏阶段' },
          { name: '梦魇循环时间', value: safeGet(this.worldState, 'nightmaretime'), description: '在当前梦魇循环状态下经过的总时间' },
          { name: '梦魇循环阶段时间', value: safeGet(this.worldState, 'nightmaretimeinphase'), description: '在当前梦魇循环的单个阶段内经过的时间' }
        ];

        // 其他信息
        const otherInfo = [
          { name: '月亮祈坛是否激活', value: booleanValue(this.worldState.is_alter_awake), description: '月亮祈坛/天体英雄是否处于激活状态' }
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
        const elapsed = this.displayValue(this.worldState.elapsed_days_in_season);
        const remaining = this.displayValue(this.worldState.remaining_days_in_season);
        const progress = this.formatPercent(this.worldState.season_progress);

        return `已过 ${elapsed} 天 / 剩余 ${remaining} 天 (进度: ${progress})`;
      } catch (err) {
        console.error('获取季节详细信息时出错:', err);
        return '';
      }
    },

    // 获取季节图标
    getSeasonIcon() {
      if (!this.worldState) return CircleHelp;

      try {
        const iconMap = {
          autumn: Leaf,
          winter: Snowflake,
          spring: Sprout,
          summer: Sun
        };

        const season = this.worldState.season;
        if (!season) return CircleHelp;

        return iconMap[season] || CircleHelp;
      } catch (err) {
        console.error('获取季节图标时出错:', err);
        return CircleHelp;
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
        return `当前阶段进度: ${this.formatPercent(this.worldState.time_in_phase)}`;
      } catch (err) {
        console.error('获取时间详细信息时出错:', err);
        return '';
      }
    },

    // 获取时间阶段图标
    getPhaseIcon() {
      if (!this.worldState) return CircleHelp;

      const iconMap = {
        day: Sun,
        dusk: Sunset,
        night: Moon
      };

      return iconMap[this.worldState.phase] || CircleHelp;
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
        const precipitationMap = {
          none: '无降水',
          rain: '下雨',
          snow: '下雪'
        };
        const precipitation = this.worldState.precipitation;
        return precipitation ? (precipitationMap[precipitation] || precipitation) : '--';
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
        if (this.isFiniteNumber(this.worldState.pop)) {
          details.push(`降水概率: ${(this.worldState.pop * 100).toFixed(1)}%`);
        }

        // 添加湿度信息
        if (this.isFiniteNumber(this.worldState.wetness)) {
          details.push(`湿度: ${this.worldState.wetness.toFixed(1)}`);
        }

        // 添加雪量信息
        if (this.isFiniteNumber(this.worldState.snow_level) && this.worldState.snow_level > 0) {
          details.push(`雪量: ${this.worldState.snow_level.toFixed(1)}`);
        }

        // 添加雪覆盖信息
        if (this.worldState.is_snow_covered) {
          details.push('地面被雪覆盖');
        }

        if (details.length) return details.join(', ');
        return this.worldState.precipitation === 'none' ? '无降水' : '--';
      } catch (err) {
        console.error('获取天气详细信息时出错:', err);
        return '';
      }
    },

    // 获取天气图标
    getWeatherIcon() {
      if (!this.worldState) return CircleHelp;

      if (this.worldState.precipitation === 'snow') return CloudSnow;
      if (this.worldState.precipitation === 'rain') return CloudRain;
      if (this.worldState.precipitation === 'none') return Sun;
      return CircleHelp;
    },

    // 获取天气样式类
    getWeatherClass() {
      if (!this.worldState) return '';

      if (this.worldState.precipitation === 'snow') return 'weather-snow';
      if (this.worldState.precipitation === 'rain') return 'weather-rain';
      if (this.worldState.precipitation === 'none') return 'weather-clear';
      return 'weather-unknown';
    },

    // 获取降水类型名称
    getPrecipitationName() {
      if (!this.worldState) return '';

      const precipitationMap = {
        none: '无',
        rain: '雨',
        snow: '雪'
      };

      return precipitationMap[this.worldState.precipitation] || this.worldState.precipitation || '--';
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
      if (!this.worldState) return CircleHelp;

      // 使用默认图标，因为Element UI没有所有月相的图标
      return Moon;
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
        if (this.worldState.is_full_moon === true) return '满月';
        if (this.worldState.is_new_moon === true) return '新月';
        if (this.worldState.is_waxing_moon === true) return '渐盈期';
        if (this.worldState.is_waxing_moon === false) return '渐亏期';
        return '--';
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
          Object.hasOwn(this.worldState, 'cavephase') ||
          Object.hasOwn(this.worldState, 'iscaveday') ||
          Object.hasOwn(this.worldState, 'iscavedusk') ||
          Object.hasOwn(this.worldState, 'iscavenight') ||
          Object.hasOwn(this.worldState, 'cavemoonphase')
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
      if (!this.worldState) return CircleHelp;

      try {
        const iconMap = {
          day: Sun,
          dusk: Sunset,
          night: Moon
        };

        const phase = this.worldState.cavephase;
        if (!phase) return CircleHelp;

        return iconMap[phase] || CircleHelp;
      } catch (err) {
        console.error('获取洞穴时间阶段图标时出错:', err);
        return CircleHelp;
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
      if (!this.worldState) return CircleHelp;
      return Moon;
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
        if (this.worldState.iscavefullmoon === true) return '满月';
        if (this.worldState.iscavenewmoon === true) return '新月';
        if (this.worldState.iscavewaxingmoon === true) return '渐盈期';
        if (this.worldState.iscavewaxingmoon === false) return '渐亏期';
        return '--';
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
          Object.hasOwn(this.worldState, 'nightmarephase') ||
          Object.hasOwn(this.worldState, 'isnightmarecalm') ||
          Object.hasOwn(this.worldState, 'isnightmarewild') ||
          Object.hasOwn(this.worldState, 'isnightmarewarn') ||
          Object.hasOwn(this.worldState, 'isnightmaredawn')
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
      if (!this.worldState) return CircleHelp;

      try {
        const iconMap = {
          calm: Sun,
          warn: TriangleAlert,
          wild: Zap,
          dawn: Sunrise,
          none: CircleMinus
        };

        const phase = this.worldState.nightmarephase;
        if (!phase) return CircleHelp;

        return iconMap[phase] || CircleHelp;
      } catch (err) {
        console.error('获取梦魇循环阶段图标时出错:', err);
        return CircleHelp;
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
  width: 100%;
  min-width: 0;
}

.page-header,
.details-header,
.details-filters,
.raw-header {
  display: flex;
  align-items: center;
}

.page-header {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 650;
}

.page-header p {
  margin: 4px 0 0;
  color: var(--muted-foreground);
}

.filter-card {
  margin-bottom: 16px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)) auto;
  align-items: end;
  gap: 12px;
}

.query-action {
  min-width: 90px;
}

.state-skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
}

.state-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.state-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.state-card [data-slot="card-content"] {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding-top: 18px;
}

.state-icon {
  width: 24px;
  height: 24px;
  flex: none;
  color: var(--primary);
}

.state-card [data-slot="card-content"] > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.state-card span,
.state-card small {
  color: var(--muted-foreground);
  font-size: 12px;
}

.state-card strong {
  font-size: 16px;
}

.season-lengths {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.details-header,
.raw-header {
  justify-content: space-between;
  gap: 16px;
}

.details-filters {
  width: min(500px, 100%);
  gap: 8px;
}

.details-filters > * {
  flex: 1;
}

.table-wrap {
  overflow-x: auto;
}

.raw-data {
  max-height: 420px;
  margin: 0;
  padding: 12px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--muted);
  color: var(--foreground);
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 760px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }

  .query-action {
    width: 100%;
  }

  .query-action > * {
    width: 100%;
  }

  .details-header,
  .raw-header {
    align-items: stretch;
    flex-direction: column;
  }

  .details-filters {
    width: 100%;
    flex-direction: column;
  }
}
</style>
