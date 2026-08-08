<template>
  <div class="app-container">
    <Card>
      <CardHeader>
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div><CardTitle>任务组管理</CardTitle><CardDescription>按用途组织任务并统一控制启用状态</CardDescription></div>
          <div class="flex flex-wrap gap-2">
            <UiButton size="sm" @click="$router.push('/cron/group/add')"><Plus data-icon="inline-start" />添加任务组</UiButton>
            <UiButton size="sm" variant="outline" :disabled="loading" @click="fetchData"><RefreshCw data-icon="inline-start" />刷新</UiButton>
            <UiButton size="sm" variant="outline" @click="$router.push('/cron/tasks')"><ArrowLeft data-icon="inline-start" />返回任务列表</UiButton>
          </div>
        </div>
        <automation-room-select @ready="fetchData" @change="fetchData" />
      </CardHeader>
      <CardContent>
        <div v-if="loading && groupList.length === 0" class="flex flex-col gap-3"><Skeleton v-for="index in 5" :key="index" class="h-12 w-full" /></div>
        <Empty v-else-if="groupList.length === 0"><EmptyHeader><EmptyTitle>暂无任务组</EmptyTitle><EmptyDescription>创建任务组以分类管理自动化任务。</EmptyDescription></EmptyHeader><EmptyContent><UiButton @click="$router.push('/cron/group/add')"><Plus data-icon="inline-start" />添加任务组</UiButton></EmptyContent></Empty>
        <div v-else class="overflow-x-auto">
          <ShadcnTable>
            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>组名称</TableHead><TableHead>描述</TableHead><TableHead>类型</TableHead><TableHead>任务数量</TableHead><TableHead>状态</TableHead><TableHead class="text-right">操作</TableHead></TableRow></TableHeader>
            <TableBody>
              <TableRow v-for="group in groupList" :key="group.id">
                <TableCell>{{ group.id }}</TableCell>
                <TableCell><router-link :to="`/cron/group/${group.id}`" class="link-type">{{ group.name }}</router-link></TableCell>
                <TableCell class="max-w-64 truncate">{{ group.description || '-' }}</TableCell>
                <TableCell><Badge variant="outline">{{ getTypeLabel(group.type) }}</Badge></TableCell>
                <TableCell><router-link :to="`/cron/group/${group.id}`"><Badge variant="secondary">{{ group.task_count || 0 }} 个任务</Badge></router-link></TableCell>
                <TableCell><Badge :variant="group.status === 1 ? 'default' : 'secondary'">{{ group.status === 1 ? '启用' : '禁用' }}</Badge></TableCell>
                <TableCell><div class="flex min-w-max justify-end gap-1">
                  <UiButton size="icon-sm" variant="outline" :title="group.status === 1 ? '禁用' : '启用'" @click="handleToggleStatus(group)"><CircleOff v-if="group.status === 1" /><CircleCheck v-else /></UiButton>
                  <UiButton size="icon-sm" variant="ghost" title="编辑" @click="handleEdit(group)"><Pencil /></UiButton>
                  <UiButton size="icon-sm" variant="ghost" title="查看详情" @click="$router.push(`/cron/group/${group.id}`)"><Eye /></UiButton>
                  <UiButton size="icon-sm" variant="ghost" title="统计数据" @click="viewGroupStats(group.id)"><ChartNoAxesColumn /></UiButton>
                  <UiButton size="icon-sm" variant="destructive" title="删除" :disabled="group.task_count > 0" @click="handleDelete(group)"><Trash2 /></UiButton>
                </div></TableCell>
              </TableRow>
            </TableBody>
          </ShadcnTable>
        </div>
      </CardContent>
    </Card>

    <UiDialog v-model:open="statsDialogVisible">
      <DialogContent class="max-w-4xl">
        <DialogHeader><DialogTitle>任务组统计</DialogTitle><DialogDescription>近 30 天任务执行情况</DialogDescription></DialogHeader>
        <div v-if="statsLoading" class="flex flex-col gap-3"><Skeleton class="h-20 w-full" /><Skeleton class="h-72 w-full" /></div>
        <div v-else class="group-stats">
        <div v-if="groupStats" class="stats-overview">
          <div class="stats-card total-tasks">
            <div class="stats-title">总任务数</div>
            <div class="stats-value">{{ groupStats.total_tasks }}</div>
          </div>
          <div class="stats-card enabled-tasks">
            <div class="stats-title">启用任务数</div>
            <div class="stats-value">{{ groupStats.enabled_tasks }}</div>
          </div>
          <div class="stats-card success-rate">
            <div class="stats-title">成功率</div>
            <div class="stats-value">{{ groupStats.success_rate }}%</div>
          </div>
          <div class="stats-card avg-duration">
            <div class="stats-title">平均耗时</div>
            <div class="stats-value">{{ groupStats.avg_duration }}秒</div>
          </div>
        </div>
        <div class="stats-charts" v-if="groupStats">
          <div id="groupExecutionChart" class="h-72 w-full"></div>
        </div>
        <Empty v-else><EmptyHeader><EmptyTitle>暂无统计数据</EmptyTitle></EmptyHeader></Empty>
        </div>
        <DialogFooter><UiButton variant="outline" @click="statsDialogVisible = false">关闭</UiButton><UiButton @click="$router.push('/cron/charts')">查看更多图表</UiButton></DialogFooter>
      </DialogContent>
    </UiDialog>
  </div>
</template>

<script>
import { ArrowLeft, ChartNoAxesColumn, CircleCheck, CircleOff, Eye, Pencil, Plus, RefreshCw, Trash2 } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { cronTaskApi } from '@/api/index';
import * as echarts from 'echarts';
import AutomationRoomSelect from '@/components/AutomationRoomSelect.vue';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Table as ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { confirmAction } from '@/lib/feedback';

export default {
  name: 'TaskGroups',
  components: {
    ArrowLeft, AutomationRoomSelect, Badge, Card, CardContent, CardDescription,
    CardHeader, CardTitle, ChartNoAxesColumn, CircleCheck, CircleOff, DialogContent,
    DialogDescription, DialogFooter, DialogHeader, DialogTitle, Empty, EmptyContent,
    EmptyDescription, EmptyHeader, EmptyTitle, Eye, Pencil, Plus, RefreshCw, Skeleton,
    ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow, Trash2, UiButton, UiDialog
  },
  data() {
    return {
      loading: false,
      statsLoading: false,
      groupList: [],
      statsDialogVisible: false,
      groupStats: null,
      executionChart: null,
      currentGroupId: null
    };
  },
  methods: {
    fetchData() {
      this.loading = true;
      console.log('开始获取任务组列表');
      cronTaskApi.getGroups()
        .then(response => {
          console.log('获取任务组列表响应:', response);
          
          // 处理各种可能的响应格式
          let groupsData = [];
          let success = false;
          
          if (response && response.data) {
            // 处理标准格式 {code: 200, data: [...], msg: "success"}
            if (response.data.code === 200 && Array.isArray(response.data.data)) {
              groupsData = response.data.data;
              success = true;
            } 
            // 处理嵌套格式 {code: 200, data: {items: [...], total: 10}}
            else if (response.data.code === 200 && response.data.data && Array.isArray(response.data.data.items)) {
              groupsData = response.data.data.items;
              success = true;
            }
            // 处理旧API格式 {status: 200, data: [...]}
            else if (response.data.status === 200 && Array.isArray(response.data.data)) {
              groupsData = response.data.data;
              success = true;
            }
            // 直接返回数组的情况
            else if (Array.isArray(response.data)) {
              groupsData = response.data;
              success = true;
            }
          }
          
          if (success) {
            console.log('原始任务组数据:', groupsData);
            
            // 遍历任务组并处理数据
            groupsData.forEach(group => {
              // 确保task_count属性存在
              if (group.task_count === undefined && group.tasks !== undefined) {
                group.task_count = Array.isArray(group.tasks) ? group.tasks.length : 0;
              } else if (group.task_count === undefined) {
                group.task_count = 0;
              }
            });
            
            console.log('处理后的任务组数据:', groupsData);
            this.groupList = groupsData;
          } else {
            console.error('无法识别的响应格式:', response);
            toast.error(response.data?.msg || response.data?.message || '获取任务组列表失败：无法识别的响应格式');
            this.groupList = [];
          }
        })
        .catch(error => {
          console.error('获取任务组列表失败:', error);
          toast.error('获取任务组列表失败');
        })
        .finally(() => {
          this.loading = false;
        });
    },
    handleEdit(row) {
      this.$router.push(`/cron/group/edit/${row.id}`);
    },
    handleDelete(row) {
      if (row.task_count > 0) {
        toast.warning('该任务组下还有任务，无法删除');
        return;
      }
      
      confirmAction('确定要删除此任务组吗？删除后不可恢复。', '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        cronTaskApi.deleteGroup(row.id)
          .then(response => {
            console.log('删除任务组响应:', response);
            if (response.data && (response.data.code === 200 || response.data.status === 200)) {
              toast.success('删除成功');
              this.fetchData();
            } else {
              toast.error(response.data?.msg || response.data?.message || '删除失败');
            }
          })
          .catch(error => {
            console.error('删除任务组失败:', error);
            toast.error('删除任务组失败');
          });
      }).catch(() => {
        toast.info('已取消删除');
      });
    },
    handleToggleStatus(row) {
      const action = row.status === 1 ? '禁用' : '启用';
      const actionApi = row.status === 1 ? cronTaskApi.disableGroup : cronTaskApi.enableGroup;
      
      confirmAction(`确定要${action}此任务组吗？${action}后组内所有任务将被${action}。`, `确认${action}`, {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        actionApi(row.id)
          .then(response => {
            console.log(`${action}任务组响应:`, response);
            if (response.data && (response.data.code === 200 || response.data.status === 200)) {
              toast.success(`${action}成功`);
              this.fetchData();
            } else {
              toast.error(response.data?.msg || response.data?.message || `${action}失败`);
            }
          })
          .catch(error => {
            console.error(`${action}任务组失败:`, error);
            toast.error(`${action}任务组失败`);
          });
      }).catch(() => {
        toast.info(`已取消${action}`);
      });
    },
    getTypeLabel(type) {
      const types = {
        'system': '系统',
        'world': '世界',
        'custom': '自定义'
      };
      return types[type] || '未知';
    },
    viewGroupStats(groupId) {
      this.statsDialogVisible = true;
      this.statsLoading = true;
      this.currentGroupId = groupId;
      
      // 获取任务组统计数据
      cronTaskApi.getGroupStats(groupId)
        .then(response => {
          console.log('获取任务组统计数据响应:', response);
          if (response.data && (response.data.code === 200 || response.data.status === 200)) {
            this.groupStats = response.data.data;
            
            // 获取任务组执行图表数据
            cronTaskApi.getGroupChart(groupId, { days: 30 })
              .then(chartResponse => {
                console.log('获取任务组图表数据响应:', chartResponse);
                if (chartResponse.data && (chartResponse.data.code === 200 || chartResponse.data.status === 200)) {
                  this.$nextTick(() => {
                    this.initGroupExecutionChart(chartResponse.data.data);
                  });
                }
              });
          } else {
            toast.error(response.data?.msg || response.data?.message || '获取任务组统计失败');
          }
        })
        .catch(error => {
          console.error('获取任务组统计失败:', error);
          toast.error('获取任务组统计失败');
        })
        .finally(() => {
          this.statsLoading = false;
        });
    },
    initGroupExecutionChart(data) {
      const chartDom = document.getElementById('groupExecutionChart');
      if (!chartDom) return;
      
      this.executionChart = echarts.init(chartDom);
      
      const option = {
        title: {
          text: '任务组执行情况统计（近30天）',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        legend: {
          data: ['成功', '失败'],
          bottom: 10
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: data.dates || []
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: '成功',
            type: 'bar',
            stack: 'total',
            itemStyle: {
              color: '#4f8a5b'
            },
            data: data.success || []
          },
          {
            name: '失败',
            type: 'bar',
            stack: 'total',
            itemStyle: {
              color: '#c94f4f'
            },
            data: data.failed || []
          }
        ]
      };
      
      this.executionChart.setOption(option);
    }
  },
  beforeUnmount() {
    if (this.executionChart) {
      this.executionChart.dispose();
    }
  }
};
</script>

<style scoped>
.task-count {
  font-size: 14px;
}
.task-count-badge {
  margin-top: 10px;
}
.link-type {
  color: var(--primary);
  text-decoration: none;
}
.link-type:hover {
  text-decoration: underline;
}
.stats-overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 16px;
}
.stats-card {
  min-width: 0;
  margin: 0;
  padding: 12px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: none;
  text-align: left;
}
.stats-title {
  font-size: 14px;
  color: var(--muted-foreground);
  margin-bottom: 10px;
}
.stats-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--foreground);
}
.stats-charts {
  margin-top: 20px;
}

@media (max-width: 768px) {
  .stats-overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
