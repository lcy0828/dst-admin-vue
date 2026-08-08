<template>
  <div class="app-container">
    <el-card class="box-card" shadow="never">
      <template v-slot:header>
<div  class="clearfix">
        <span>日志详情</span>
        <el-button-group style="float: right">
          <el-button type="primary" icon="el-icon-refresh" @click="fetchLogDetail">刷新</el-button>
          <el-button type="info" icon="el-icon-back" @click="goBack">返回</el-button>
        </el-button-group>
      </div>
</template>

      <el-skeleton :loading="loading" animated>
        <template v-slot:template>
          <div style="padding: 20px;">
            <el-skeleton-item variant="text" style="width: 30%; height: 40px;"></el-skeleton-item>
            <el-skeleton-item variant="text" style="margin-top: 20px; width: 100%; height: 300px;"></el-skeleton-item>
          </div>
        </template>

        <template>
          <div v-if="logData" class="log-content">
            <el-descriptions title="基本信息" border :column="2">
              <el-descriptions-item label="日志ID">{{ logData.id }}</el-descriptions-item>
              <el-descriptions-item label="任务ID">{{ logData.task_id }}</el-descriptions-item>
              <el-descriptions-item label="任务名称">
                <router-link
                  :to="`/cron/edit/${logData.task_id}`"
                  class="link-type"
                  v-if="logData.task_id">
                  {{ logData.task_name }}
                </router-link>
                <span v-else>{{ logData.task_name || '未知任务' }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="任务类型">{{ getTaskTypeText(logData.task_type) }}</el-descriptions-item>
              <el-descriptions-item label="执行状态">
                <el-tag :type="logData.status === 'success' || logData.status === 1 ? 'success' : 'danger'">
                  {{ logData.status === 'success' || logData.status === 1 ? '成功' : '失败' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="触发方式">
                <el-tag :type="getTriggerTypeTag(logData.trigger_type)">
                  {{ getTriggerTypeText(logData.trigger_type) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="开始时间">{{ logData.start_time || logData.created_at }}</el-descriptions-item>
              <el-descriptions-item label="结束时间">{{ logData.end_time || logData.updated_at }}</el-descriptions-item>
              <el-descriptions-item label="执行耗时">{{ logData.duration ? logData.duration + ' 秒' : '-' }}</el-descriptions-item>
              <el-descriptions-item label="执行者">{{ logData.executor || '系统' }}</el-descriptions-item>
              <el-descriptions-item label="重试次数">{{ logData.retry_count || 0 }}</el-descriptions-item>
              <el-descriptions-item label="IP地址">{{ logData.ip || '-' }}</el-descriptions-item>
            </el-descriptions>

            <div class="execution-section">
              <h3>执行参数</h3>
              <pre v-if="logData.params" class="code-block params">{{ formatParams(logData.params) }}</pre>
              <el-empty v-else description="无参数" :image-size="100"></el-empty>
            </div>

            <div class="execution-section">
              <h3>执行输出</h3>
              <pre v-if="logData.output" class="code-block output">{{ logData.output }}</pre>
              <el-empty v-else description="无输出" :image-size="100"></el-empty>
            </div>

            <div v-if="logData.error" class="execution-section">
              <h3>错误信息</h3>
              <pre class="code-block error">{{ logData.error }}</pre>
            </div>
          </div>

          <el-empty v-else description="未找到日志详情" :image-size="200"></el-empty>
        </template>
      </el-skeleton>
    </el-card>
  </div>
</template>

<script>
import { cronTaskApi } from '@/api/index';

export default {
  name: 'TaskLogDetail',
  data() {
    return {
      loading: false,
      logId: null,
      logData: null
    };
  },
  created() {
    this.logId = this.$route.params.id;
    if (!this.logId) {
      this.$message.error('缺少日志ID参数');
      this.goBack();
      return;
    }

    this.fetchLogDetail();
  },
  methods: {
    fetchLogDetail() {
      this.loading = true;
      cronTaskApi.getLogDetail(this.logId)
        .then(response => {
          console.log('日志详情响应:', response);

          // 直接处理原始响应数据
          if (response && response.code === 200 && response.data) {
            console.log('使用标准响应格式');
            this.logData = response.data;
            console.log('处理后的日志详情:', this.logData);
          }
          // 处理嵌套的响应格式
          else if (response.data && response.data.code === 200 && response.data.data) {
            console.log('使用嵌套的响应结构处理数据');
            this.logData = response.data.data;
            console.log('处理后的日志详情:', this.logData);
          }
          // 兼容旧的响应格式
          else if (response.data && response.data.status === 200 && response.data.data) {
            console.log('使用旧API响应结构处理数据');
            this.logData = response.data.data;
            console.log('处理后的日志详情:', this.logData);
          } else {
            // 尝试直接解析响应数据
            try {
              console.log('尝试直接解析响应数据');
              // 如果是字符串，尝试解析为JSON
              const data = typeof response === 'string' ? JSON.parse(response) : response;

              if (data && data.code === 200 && data.data) {
                this.logData = data.data;
                console.log('成功解析数据:', this.logData);
                return;
              }
            } catch (e) {
              console.error('解析响应数据失败:', e);
            }

            console.error('响应格式不符合预期:', response);
            this.$message.error('获取日志详情失败: 响应格式不符合预期');
          }
        })
        .catch(error => {
          console.error('获取日志详情失败:', error);
          this.$message.error('获取日志详情失败');
        })
        .finally(() => {
          this.loading = false;
        });
    },
    goBack() {
      // 如果是从任务详情页面进来的，就返回任务详情页面
      if (this.$route.query.from === 'task' && this.$route.query.task_id) {
        this.$router.push(`/cron/task/${this.$route.query.task_id}`);
      } else {
        // 否则默认返回日志列表
        this.$router.push('/cron/logs');
      }
    },
    getTaskTypeText(type) {
      const typeMap = {
        'shell': 'Shell命令',
        'http': 'HTTP请求',
        'script': '脚本执行',
        'system': '系统命令'
      };
      return typeMap[type] || type || '未知类型';
    },
    formatParams(params) {
      if (!params) return '';

      try {
        // 如果是字符串，尝试解析成对象
        if (typeof params === 'string') {
          const parsedParams = JSON.parse(params);
          return JSON.stringify(parsedParams, null, 2);
        }
        // 如果已经是对象，直接格式化
        return JSON.stringify(params, null, 2);
      } catch (e) {
        // 如果无法解析为JSON，则原样返回
        return params;
      }
    },

    // 根据trigger_type获取触发方式的文本描述
    getTriggerTypeText(triggerType) {
      // 根据实际情况调整映射关系
      const triggerTypeMap = {
        0: '定时触发', // 0 代表定时触发
        1: '手动触发', // 1 代表手动触发
        2: '事件触发', // 2 代表事件触发
        3: '依赖触发', // 3 代表依赖触发
        4: 'API触发'    // 4 代表API触发
      };

      // 兼容旧版的is_manual字段
      if (triggerType === undefined && this.logData) {
        // 注意：is_manual为1时表示手动执行，对应trigger_type为1
        return this.logData.is_manual === 1 ? '手动触发' : '定时触发';
      }

      return triggerTypeMap[triggerType] || '未知触发';
    },

    // 根据trigger_type获取标签类型
    getTriggerTypeTag(triggerType) {
      // 根据实际情况调整标签类型
      const triggerTypeTagMap = {
        0: 'primary',  // 0 定时触发 - 蓝色主要
        1: 'warning',  // 1 手动触发 - 黄色警告
        2: 'success',  // 2 事件触发 - 绿色成功
        3: 'info',     // 3 依赖触发 - 灰色信息
        4: 'danger'    // 4 API触发 - 红色危险
      };

      // 兼容旧版的is_manual字段
      if (triggerType === undefined && this.logData) {
        // 注意：is_manual为1时表示手动执行，对应trigger_type为1
        return this.logData.is_manual === 1 ? 'warning' : 'primary';
      }

      return triggerTypeTagMap[triggerType] || 'info';
    }
  }
};
</script>

<style scoped>
.log-content {
  padding: 0;
}
.execution-section {
  margin-top: 20px;
}
.execution-section h3 {
  font-size: 16px;
  margin-bottom: 10px;
  padding-left: 5px;
  border-left: 3px solid #d97932;
}
.code-block {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  font-family: Monaco, Menlo, Consolas, "Courier New", monospace;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 400px;
  overflow-y: auto;
  margin: 0;
}
.code-block.params {
  background-color: #f0f9eb;
}
.code-block.error {
  background-color: #fee;
  color: #d33;
}
.link-type {
  color: #d97932;
  text-decoration: none;
}
.link-type:hover {
  text-decoration: underline;
}
</style>