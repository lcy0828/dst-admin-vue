<template>
  <div class="world-state-page">
    <header class="page-header">
      <div>
        <h1>{{ $t('worldState.title') }}</h1>
        <p>{{ $t('worldState.subtitle') }}</p>
      </div>
      <div class="header-actions">
        <WorldDataFreshnessBadge
          v-if="worldState"
          :freshness="worldState.freshness"
          :observed-at="worldState.observed_at"
          :age-seconds="worldState.age_seconds"
        />
        <UiButton @click="refreshData" :disabled="loading || !selectedArchive || !selectedWorld">
          <Spinner v-if="loading" data-icon="inline-start" />
          <RefreshCw v-else data-icon="inline-start" />
          {{ $t('worldState.actions.refresh') }}
        </UiButton>
      </div>
    </header>

    <Card class="filter-card">
      <CardHeader>
        <CardTitle>{{ $t('worldState.query.title') }}</CardTitle>
        <CardDescription>{{ $t('worldState.query.description') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup class="filter-grid">
          <Field>
            <FieldLabel>{{ $t('worldState.query.archive') }}</FieldLabel>
            <UiSelect v-model="selectedArchive" @update:model-value="handleArchiveChange">
              <SelectTrigger><SelectValue :placeholder="$t('worldState.query.selectArchive')" /></SelectTrigger>
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
            <FieldLabel>{{ $t('worldState.query.world') }}</FieldLabel>
            <UiSelect v-model="selectedWorld" :disabled="!selectedArchive">
              <SelectTrigger><SelectValue :placeholder="$t('worldState.query.selectWorld')" /></SelectTrigger>
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
            <FieldLabel class="sr-only">{{ $t('worldState.query.queryAria') }}</FieldLabel>
            <UiButton @click="fetchWorldState" :disabled="loading || !selectedArchive || !selectedWorld">
              {{ $t('worldState.actions.query') }}
            </UiButton>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>

    <Alert v-if="loadError" variant="destructive">
      <TriangleAlert />
      <AlertTitle>{{ $t('worldState.error.title') }}</AlertTitle>
      <AlertDescription>{{ loadErrorMessage }}</AlertDescription>
      <AlertAction><UiButton size="sm" variant="outline" @click="retryLoad">{{ $t('worldState.actions.retry') }}</UiButton></AlertAction>
    </Alert>

    <div v-else-if="loading" class="state-skeleton" aria-busy="true" :aria-label="$t('worldState.loadingAria')">
      <Skeleton v-for="row in 6" :key="row" class="h-20 w-full" />
    </div>

    <Empty v-else-if="!worldState">
      <EmptyHeader>
        <EmptyMedia variant="icon"><Activity /></EmptyMedia>
        <EmptyTitle>{{ $t('worldState.empty.title') }}</EmptyTitle>
        <EmptyDescription>{{ $t(selectedArchive && selectedWorld ? 'worldState.empty.ready' : 'worldState.empty.select') }}</EmptyDescription>
      </EmptyHeader>
    </Empty>

    <div v-else class="state-content">
      <Alert v-if="worldState.stale">
        <TriangleAlert />
        <AlertTitle>{{ $t('worldState.freshness.staleTitle') }}</AlertTitle>
        <AlertDescription>{{ $t(`runtimeData.descriptions.${worldState.freshness || 'unavailable'}`) }}</AlertDescription>
      </Alert>

      <div class="state-cards">
        <Card class="state-card">
          <CardHeader><CardTitle>{{ $t('worldState.cards.season') }}</CardTitle><CardDescription>{{ getSeasonDetail() }}</CardDescription><CardAction><span class="state-icon-wrap" aria-hidden="true"><component :is="getSeasonIcon()" class="state-icon" /></span></CardAction></CardHeader>
          <CardContent class="state-value"><strong>{{ getSeasonName() }}</strong><small>{{ $t('worldState.cards.worldDays', { days: displayValue(worldState.cycles) }) }}</small></CardContent>
        </Card>
        <Card class="state-card">
          <CardHeader><CardTitle>{{ $t('worldState.cards.surfaceTime') }}</CardTitle><CardDescription>{{ getPhaseDetail() }}</CardDescription><CardAction><span class="state-icon-wrap" aria-hidden="true"><component :is="getPhaseIcon()" class="state-icon" /></span></CardAction></CardHeader>
          <CardContent class="state-value"><strong>{{ getPhaseName() }}</strong><small>{{ $t('worldState.cards.dayProgress', { progress: formatPercent(worldState.time) }) }}</small></CardContent>
        </Card>
        <Card class="state-card">
          <CardHeader><CardTitle>{{ $t('worldState.cards.surfaceWeather') }}</CardTitle><CardDescription>{{ getWeatherDetail() }}</CardDescription><CardAction><span class="state-icon-wrap" aria-hidden="true"><component :is="getWeatherIcon()" class="state-icon" /></span></CardAction></CardHeader>
          <CardContent class="state-value"><strong>{{ getWeatherName() }}</strong><small>{{ $t('worldState.cards.temperature', { temperature: formatNumber(worldState.temperature, 1, '°C') }) }}</small></CardContent>
        </Card>
        <Card class="state-card">
          <CardHeader><CardTitle>{{ $t('worldState.cards.surfaceMoon') }}</CardTitle><CardDescription>{{ getMoonPhaseDetail() }}</CardDescription><CardAction><span class="state-icon-wrap" aria-hidden="true"><component :is="getMoonIcon()" class="state-icon" /></span></CardAction></CardHeader>
          <CardContent class="state-value"><strong>{{ getMoonPhaseName() }}</strong></CardContent>
        </Card>
        <Card v-if="hasCaveInfo()" class="state-card">
          <CardHeader><CardTitle>{{ $t('worldState.cards.caveTime') }}</CardTitle><CardDescription>{{ $t('worldState.cards.caveTimeDescription') }}</CardDescription><CardAction><span class="state-icon-wrap" aria-hidden="true"><component :is="getCavePhaseIcon()" class="state-icon" /></span></CardAction></CardHeader>
          <CardContent class="state-value"><strong>{{ getCavePhaseName() }}</strong></CardContent>
        </Card>
        <Card v-if="hasCaveInfo()" class="state-card">
          <CardHeader><CardTitle>{{ $t('worldState.cards.caveMoon') }}</CardTitle><CardDescription>{{ getCaveMoonPhaseDetail() }}</CardDescription><CardAction><span class="state-icon-wrap" aria-hidden="true"><component :is="getCaveMoonIcon()" class="state-icon" /></span></CardAction></CardHeader>
          <CardContent class="state-value"><strong>{{ getCaveMoonPhaseName() }}</strong></CardContent>
        </Card>
        <Card v-if="hasNightmareInfo()" class="state-card">
          <CardHeader><CardTitle>{{ $t('worldState.cards.nightmare') }}</CardTitle><CardDescription>{{ getNightmarePhaseDetail() }}</CardDescription><CardAction><span class="state-icon-wrap" aria-hidden="true"><component :is="getNightmarePhaseIcon()" class="state-icon" /></span></CardAction></CardHeader>
          <CardContent class="state-value"><strong>{{ getNightmarePhaseName() }}</strong></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{{ $t('worldState.seasonProgress.title') }}</CardTitle>
          <CardDescription>{{ $t('worldState.seasonProgress.summary', { elapsed: displayValue(worldState.elapsed_days_in_season), remaining: displayValue(worldState.remaining_days_in_season) }) }}</CardDescription>
        </CardHeader>
        <CardContent>
          <UiProgress v-if="isFiniteNumber(worldState.season_progress)" :model-value="worldState.season_progress * 100" />
          <span v-else>--</span>
          <div class="season-lengths">
            <Badge variant="outline">{{ seasonLengthLabel('autumn', worldState.autumn_length) }}</Badge>
            <Badge variant="outline">{{ seasonLengthLabel('winter', worldState.winter_length) }}</Badge>
            <Badge variant="outline">{{ seasonLengthLabel('spring', worldState.spring_length) }}</Badge>
            <Badge variant="outline">{{ seasonLengthLabel('summer', worldState.summer_length) }}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{{ $t('worldState.details.title') }}</CardTitle>
          <CardDescription>{{ $t('worldState.details.description') }}</CardDescription>
          <CardAction class="details-filters max-lg:col-span-full max-lg:row-auto max-lg:justify-self-stretch">
            <InputGroup>
              <InputGroupAddon><Search /></InputGroupAddon>
              <InputGroupInput v-model="searchQuery" :placeholder="$t('worldState.details.search')" />
            </InputGroup>
            <UiSelect v-model="currentCategory">
              <SelectTrigger><SelectValue :placeholder="$t('worldState.details.allCategories')" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{{ $t('worldState.details.allCategories') }}</SelectItem>
                  <SelectItem v-for="(label, key) in categoryMap" :key="key" :value="key">{{ label }}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </UiSelect>
          </CardAction>
        </CardHeader>
        <CardContent class="table-wrap">
          <UiTable>
            <TableHeader><TableRow><TableHead>{{ $t('worldState.details.columns.property') }}</TableHead><TableHead>{{ $t('worldState.details.columns.value') }}</TableHead><TableHead>{{ $t('worldState.details.columns.description') }}</TableHead></TableRow></TableHeader>
            <TableBody>
              <TableRow v-for="item in filteredDetailsTableData" :key="item.name">
                <TableCell>{{ item.name }}</TableCell><TableCell>{{ item.value }}</TableCell><TableCell>{{ item.description }}</TableCell>
              </TableRow>
            </TableBody>
          </UiTable>
        </CardContent>
      </Card>

      <RuntimeDiagnosticsPanel :room-id="selectedRoomId" :world-id="selectedWorldId" :world-name="selectedWorld" />

      <Collapsible v-model:open="showRawData">
        <Card>
          <CardHeader>
            <CardTitle>{{ $t('worldState.raw.title') }}</CardTitle><CardDescription>{{ $t('worldState.raw.description') }}</CardDescription>
            <CardAction><CollapsibleTrigger as-child>
              <UiButton variant="outline" size="sm">{{ $t(showRawData ? 'worldState.actions.hide' : 'worldState.actions.show') }}</UiButton>
            </CollapsibleTrigger></CardAction>
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
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Progress as UiProgress } from '@/components/ui/progress';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { translateWorldStateValue } from '@/i18n/worldStateMessages';
import RuntimeDiagnosticsPanel from '@/components/runtime/RuntimeDiagnosticsPanel.vue';
import WorldDataFreshnessBadge from '@/components/runtime/WorldDataFreshnessBadge.vue';

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
    CardAction,
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
    RuntimeDiagnosticsPanel,
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
    UiTable,
    WorldDataFreshnessBadge
  },
  data() {
    return {
      loading: false,
      loadError: null,
      archives: [],
      selectedArchive: '',
      selectedWorld: '',
      worldState: null,
      showRawData: false,
      autoRefresh: false,
      refreshInterval: null,
      detailsTableData: [],
      searchQuery: '',
      currentCategory: ''
    };
  },
  computed: {
    loadErrorMessage() {
      return this.localizedError(this.loadError);
    },
    categoryMap() {
      return Object.fromEntries(
        ['basic', 'season', 'time', 'moon', 'weather', 'cave', 'nightmare', 'other']
          .map(category => [category, this.$t(`worldState.details.categories.${category}`)])
      );
    },
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

    selectedRoom() {
      return this.archives.find(archive => archive.name === this.selectedArchive || archive.id === this.selectedArchive) || null;
    },

    selectedRoomId() {
      return this.selectedRoom?.id || '';
    },

    selectedWorldId() {
      const world = this.worldsOfSelectedArchive.find(item => (item.name || item.id || item) === this.selectedWorld);
      return typeof world === 'object' ? (world.id || '') : '';
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
  watch: {
    '$i18n.locale'() {
      if (this.worldState) this.prepareDetailsTableData();
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
      this.loadError = null;
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
          this.loadError = this.createLoadError('worldState.error.archiveList', error);
          toast.error(this.localizedError(this.loadError));
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
        toast.warning(this.$t('worldState.feedback.selectArchiveAndWorld'));
        return;
      }

      this.loading = true;
      this.loadError = null;
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
          toast.success(this.$t('worldState.feedback.loaded'));
        })
        .catch(error => {
          this.loadError = this.createLoadError('worldState.error.worldState', error);
          toast.error(this.localizedError(this.loadError));
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

    createLoadError(key, error) {
      return { key, detail: error?.message || '' };
    },

    localizedError(error) {
      if (!error) return '';
      const message = this.$t(error.key);
      const detail = error.detail || this.$t('worldState.error.unknown');
      return this.$t('worldState.error.withDetail', { message, detail });
    },

    protocolLabel(group, value) {
      return translateWorldStateValue(
        key => this.$t(key),
        key => this.$te(key),
        group,
        value
      );
    },

    seasonLengthLabel(season, days) {
      return this.$t('worldState.seasonProgress.length', {
        season: this.protocolLabel('seasons', season),
        days: this.displayValue(days)
      });
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
          if (value === true) return this.$t('worldState.values.yes');
          if (value === false) return this.$t('worldState.values.no');
          return '--';
        };

        const detailItem = (key, value) => ({
          name: this.$t(`worldState.details.fields.${key}.name`),
          value,
          description: this.$t(`worldState.details.fields.${key}.description`)
        });

        // 基本信息
        const basicInfo = [
          detailItem('archiveName', safeGet(this.worldState, 'archive_name')),
          detailItem('worldName', safeGet(this.worldState, 'world_name')),
          detailItem('worldDays', safeGet(this.worldState, 'cycles'))
        ];

        // 地表季节信息
        const seasonInfo = [
          detailItem('surfaceSeason', this.getSeasonName()),
          detailItem('elapsedSeasonDays', safeGet(this.worldState, 'elapsed_days_in_season')),
          detailItem('remainingSeasonDays', safeGet(this.worldState, 'remaining_days_in_season')),
          detailItem('seasonProgress', safePercent(this.worldState.season_progress)),
          detailItem('isAutumn', booleanValue(this.worldState.is_autumn)),
          detailItem('isWinter', booleanValue(this.worldState.is_winter)),
          detailItem('isSpring', booleanValue(this.worldState.is_spring)),
          detailItem('isSummer', booleanValue(this.worldState.is_summer)),
          detailItem('autumnLength', safeGet(this.worldState, 'autumn_length')),
          detailItem('winterLength', safeGet(this.worldState, 'winter_length')),
          detailItem('springLength', safeGet(this.worldState, 'spring_length')),
          detailItem('summerLength', safeGet(this.worldState, 'summer_length'))
        ];

        // 地表时间信息
        const timeInfo = [
          detailItem('surfacePhase', this.getPhaseName()),
          detailItem('isDay', booleanValue(this.worldState.is_day)),
          detailItem('isDusk', booleanValue(this.worldState.is_dusk)),
          detailItem('isNight', booleanValue(this.worldState.is_night)),
          detailItem('phaseProgress', safePercent(this.worldState.time_in_phase)),
          detailItem('dayProgress', safePercent(this.worldState.time))
        ];

        // 地表月相信息
        const moonInfo = [
          detailItem('surfaceMoon', this.getMoonPhaseName()),
          detailItem('isFullMoon', booleanValue(this.worldState.is_full_moon)),
          detailItem('isNewMoon', booleanValue(this.worldState.is_new_moon)),
          detailItem('isWaxingMoon', booleanValue(this.worldState.is_waxing_moon))
        ];

        // 地表天气信息
        const weatherInfo = [
          detailItem('surfaceTemperature', this.isFiniteNumber(this.worldState.temperature) ? `${safeToFixed(this.worldState.temperature, 1)}°C` : '--'),
          detailItem('precipitationType', this.getPrecipitationName()),
          detailItem('precipitationChance', safePercent(this.worldState.pop)),
          detailItem('isRaining', booleanValue(this.worldState.is_raining)),
          detailItem('isSnowing', booleanValue(this.worldState.is_snowing)),
          detailItem('isAcidRaining', booleanValue(this.worldState.is_acid_raining)),
          detailItem('isLunarHailing', booleanValue(this.worldState.is_lunar_hailing)),
          detailItem('lunarHailLevel', safeGet(this.worldState, 'lunar_hail_level')),
          detailItem('wetness', safeToFixed(this.worldState.wetness, 1)),
          detailItem('isWet', booleanValue(this.worldState.is_wet)),
          detailItem('moisture', this.isFiniteNumber(this.worldState.moisture) || this.isFiniteNumber(this.worldState.moisture_ceil) ? `${safeToFixed(this.worldState.moisture, 1)} / ${safeToFixed(this.worldState.moisture_ceil, 1)}` : '--'),
          detailItem('snowLevel', safeToFixed(this.worldState.snow_level, 1)),
          detailItem('isSnowCovered', booleanValue(this.worldState.is_snow_covered))
        ];

        // 洞穴信息
        const caveInfo = [
          detailItem('cavePhase', this.getCavePhaseName()),
          detailItem('isCaveDay', booleanValue(this.worldState.iscaveday)),
          detailItem('isCaveDusk', booleanValue(this.worldState.iscavedusk)),
          detailItem('isCaveNight', booleanValue(this.worldState.iscavenight)),
          detailItem('caveMoon', this.getCaveMoonPhaseName()),
          detailItem('isCaveFullMoon', booleanValue(this.worldState.iscavefullmoon)),
          detailItem('isCaveNewMoon', booleanValue(this.worldState.iscavenewmoon)),
          detailItem('isCaveWaxingMoon', booleanValue(this.worldState.iscavewaxingmoon))
        ];

        // 梦魇循环信息
        const nightmareInfo = [
          detailItem('nightmarePhase', this.getNightmarePhaseName()),
          detailItem('isNightmareCalm', booleanValue(this.worldState.isnightmarecalm)),
          detailItem('isNightmareWild', booleanValue(this.worldState.isnightmarewild)),
          detailItem('isNightmareWarn', booleanValue(this.worldState.isnightmarewarn)),
          detailItem('isNightmareDawn', booleanValue(this.worldState.isnightmaredawn)),
          detailItem('nightmareTime', safeGet(this.worldState, 'nightmaretime')),
          detailItem('nightmarePhaseTime', safeGet(this.worldState, 'nightmaretimeinphase'))
        ];

        // 其他信息
        const otherInfo = [
          detailItem('alterAwake', booleanValue(this.worldState.is_alter_awake))
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
        const season = this.worldState.season;
        return this.protocolLabel('seasons', season);
      } catch (err) {
        console.error('获取季节名称时出错:', err);
        return this.$t('worldState.values.unknown');
      }
    },

    // 获取季节详细信息
    getSeasonDetail() {
      if (!this.worldState) return '';

      try {
        const elapsed = this.displayValue(this.worldState.elapsed_days_in_season);
        const remaining = this.displayValue(this.worldState.remaining_days_in_season);
        const progress = this.formatPercent(this.worldState.season_progress);

        return this.$t('worldState.seasonProgress.detail', { elapsed, remaining, progress });
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
        const phase = this.worldState.phase;
        return this.protocolLabel('phases', phase);
      } catch (err) {
        console.error('获取时间阶段名称时出错:', err);
        return this.$t('worldState.values.unknown');
      }
    },

    // 获取时间详细信息
    getPhaseDetail() {
      if (!this.worldState) return '';

      try {
        return this.$t('worldState.cards.phaseProgress', {
          progress: this.formatPercent(this.worldState.time_in_phase)
        });
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
        const precipitation = this.worldState.precipitation;
        return precipitation ? this.protocolLabel('weather', precipitation) : '--';
      } catch (err) {
        console.error('获取天气名称时出错:', err);
        return this.$t('worldState.values.unknown');
      }
    },

    // 获取天气详细信息
    getWeatherDetail() {
      if (!this.worldState) return '';

      try {
        let details = [];

        // 添加降水类型信息
        if (this.worldState.precipitation && this.worldState.precipitation !== 'none') {
          details.push(this.$t('worldState.weatherDetail.precipitationType', {
            value: this.protocolLabel('precipitation', this.worldState.precipitation)
          }));
        }

        // 添加降水概率
        if (this.isFiniteNumber(this.worldState.pop)) {
          details.push(this.$t('worldState.weatherDetail.precipitationChance', {
            value: `${(this.worldState.pop * 100).toFixed(1)}%`
          }));
        }

        // 添加湿度信息
        if (this.isFiniteNumber(this.worldState.wetness)) {
          details.push(this.$t('worldState.weatherDetail.wetness', {
            value: this.worldState.wetness.toFixed(1)
          }));
        }

        // 添加雪量信息
        if (this.isFiniteNumber(this.worldState.snow_level) && this.worldState.snow_level > 0) {
          details.push(this.$t('worldState.weatherDetail.snowLevel', {
            value: this.worldState.snow_level.toFixed(1)
          }));
        }

        // 添加雪覆盖信息
        if (this.worldState.is_snow_covered) {
          details.push(this.$t('worldState.weatherDetail.snowCovered'));
        }

        if (details.length) return details.join(this.$t('worldState.listSeparator'));
        return this.worldState.precipitation === 'none'
          ? this.protocolLabel('weather', 'none')
          : '--';
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
      return this.worldState.precipitation
        ? this.protocolLabel('precipitation', this.worldState.precipitation)
        : '--';
    },

    // 获取月相名称
    getMoonPhaseName() {
      if (!this.worldState) return '';

      try {
        const moonPhase = this.worldState.moon_phase;
        return this.protocolLabel('moon', moonPhase);
      } catch (err) {
        console.error('获取月相名称时出错:', err);
        return this.$t('worldState.values.unknown');
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
        if (this.worldState.is_full_moon === true) return this.protocolLabel('moon', 'full');
        if (this.worldState.is_new_moon === true) return this.protocolLabel('moon', 'new');
        if (this.worldState.is_waxing_moon === true) return this.protocolLabel('moonState', 'waxing');
        if (this.worldState.is_waxing_moon === false) return this.protocolLabel('moonState', 'waning');
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
        const phase = this.worldState.cavephase;
        return this.protocolLabel('phases', phase);
      } catch (err) {
        console.error('获取洞穴时间阶段名称时出错:', err);
        return this.$t('worldState.values.unknown');
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
        const moonPhase = this.worldState.cavemoonphase;
        return this.protocolLabel('moon', moonPhase);
      } catch (err) {
        console.error('获取洞穴月相名称时出错:', err);
        return this.$t('worldState.values.unknown');
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
        if (this.worldState.iscavefullmoon === true) return this.protocolLabel('moon', 'full');
        if (this.worldState.iscavenewmoon === true) return this.protocolLabel('moon', 'new');
        if (this.worldState.iscavewaxingmoon === true) return this.protocolLabel('moonState', 'waxing');
        if (this.worldState.iscavewaxingmoon === false) return this.protocolLabel('moonState', 'waning');
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
        const phase = this.worldState.nightmarephase;
        return this.protocolLabel('nightmare', phase);
      } catch (err) {
        console.error('获取梦魇循环阶段名称时出错:', err);
        return this.$t('worldState.values.unknown');
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

        if (this.worldState.isnightmarecalm) details.push(this.protocolLabel('nightmare', 'calm'));
        if (this.worldState.isnightmarewarn) details.push(this.protocolLabel('nightmare', 'warn'));
        if (this.worldState.isnightmarewild) details.push(this.protocolLabel('nightmare', 'wild'));
        if (this.worldState.isnightmaredawn) details.push(this.protocolLabel('nightmare', 'dawn'));

        if (details.length === 0) {
          if (this.worldState.nightmarephase === 'none') {
            details.push(this.protocolLabel('nightmare', 'none'));
          } else if (this.worldState.nightmarephase) {
            details.push(this.protocolLabel('nightmare', this.worldState.nightmarephase));
          } else {
            details.push(this.$t('worldState.values.unknownState'));
          }
        }

        return details.join(this.$t('worldState.listSeparator'));
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
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  min-width: 0;
}

.page-header,
.details-filters,
.header-actions {
  display: flex;
  align-items: center;
}

.page-header {
  justify-content: space-between;
  gap: 12px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.page-header p {
  margin: 4px 0 0;
  color: var(--muted-foreground);
  font-size: 14px;
}

.header-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.filter-card {
  margin: 0;
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
  gap: 24px;
}

.state-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.state-icon-wrap {
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
  background: var(--muted);
}

.state-icon {
  width: 18px;
  height: 18px;
  flex: none;
  color: var(--muted-foreground);
}

.state-value {
  display: flex;
  min-height: 52px;
  min-width: 0;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.state-value strong {
  font-size: 24px;
  font-weight: 600;
}

.state-value small {
  color: var(--muted-foreground);
  font-size: 12px;
}

.season-lengths {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
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
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .query-action {
    width: 100%;
  }

  .query-action > * {
    width: 100%;
  }

  .details-filters {
    width: 100%;
    flex-direction: column;
  }
}
</style>
