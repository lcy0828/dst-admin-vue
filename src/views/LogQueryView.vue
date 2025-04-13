<template>
  <div class="log-query-container">
    <h1>日志查询</h1>
    
    <div class="filter-section">
      <el-form :inline="true" :model="queryParams" class="demo-form-inline">
        <el-form-item label="存档">
          <el-select v-model="queryParams.archive" placeholder="选择存档" @change="handleArchiveChange">
            <el-option
              v-for="item in archives"
              :key="item.name"
              :label="item.name"
              :value="item.name"
            ></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="世界">
          <el-select v-model="queryParams.world" placeholder="选择世界">
            <el-option
              v-for="world in worlds"
              :key="world.name"
              :label="world.name"
              :value="world.name"
            ></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="日志类型">
          <el-select v-model="queryParams.type" placeholder="选择日志类型">
            <el-option
              v-for="type in logTypes"
              :key="type.type"
              :label="type.name"
              :value="type.type"
            ></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="queryLogs">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </div>
    
    <div class="result-section">
      <el-table
        v-loading="loading"
        :data="logData"
        style="width: 100%"
        border
      >
        <el-table-column prop="timestamp" label="时间" width="180">
          <template slot-scope="scope">
            {{ formatDate(scope.row.timestamp) }}
          </template>
        </el-table-column>
        <el-table-column prop="log_type" label="类型" width="120">
          <template slot-scope="scope">
            <el-tag :type="getLogTypeTag(scope.row.log_type)">{{ scope.row.log_type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="内容"></el-table-column>
        <el-table-column prop="world_name" label="世界" width="120"></el-table-column>
      </el-table>
      
      <div class="pagination-container">
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :current-page="queryParams.page"
          :page-sizes="[10, 20, 50, 100]"
          :page-size="queryParams.page_size"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
        >
        </el-pagination>
      </div>
    </div>
  </div>
</template>

<script>
import { logApi } from '@/api';

export default {
  name: 'LogQueryView',
  data() {
    return {
      // 查询参数
      queryParams: {
        archive: '',
        world: '',
        type: '',
        page: 1,
        page_size: 20
      },
      // 存档列表
      archives: [],
      // 世界列表
      worlds: [],
      // 日志类型
      logTypes: [
        { type: '', name: '全部' },
        { type: 'system', name: '系统' },
        { type: 'chat', name: '聊天' },
        { type: 'connection', name: '连接' },
        { type: 'player', name: '玩家' }
      ],
      // 日志数据
      logData: [],
      // 总条数
      total: 0,
      // 加载状态
      loading: false
    };
  },
  mounted() {
    this.getArchives();
    this.getLogTypes();
  },
  methods: {
    // 获取存档列表
    async getArchives() {
      try {
        console.log('开始获取存档列表');
        const response = await logApi.getArchiveList();
        console.log('获取到存档列表响应:', response);
        
        // 直接使用API返回的数据
        if (response && response.status === 200 && Array.isArray(response.data)) {
          this.archives = response.data;
          if (this.archives.length > 0) {
            this.queryParams.archive = this.archives[0].name;
            this.getWorlds(this.queryParams.archive);
          }
        } else if (response && response.data && response.data.status === 200 && Array.isArray(response.data.data)) {
          this.archives = response.data.data;
          if (this.archives.length > 0) {
            this.queryParams.archive = this.archives[0].name;
            this.getWorlds(this.queryParams.archive);
          }
        } else {
          console.error('获取存档列表格式错误:', response);
        }
      } catch (error) {
        console.error('获取存档列表失败:', error);
        // 显示详细错误信息
        if (error.response) {
          console.error('错误响应数据:', error.response.data);
          console.error('错误状态码:', error.response.status);
        } else if (error.request) {
          console.error('无响应错误:', error.request);
        } else {
          console.error('请求配置错误:', error.message);
        }
        console.error('完整错误对象:', error);
        this.$message.error('获取存档列表失败');
      }
    },
    
    // 根据存档获取世界列表
    async getWorlds(archiveName) {
      if (!archiveName) return;
      
      try {
        console.log('开始获取世界列表，存档名:', archiveName);
        
        // 直接从archives中查找当前选择的存档
        const selectedArchive = this.archives.find(archive => archive.name === archiveName);
        if (selectedArchive && selectedArchive.worlds && Array.isArray(selectedArchive.worlds)) {
          this.worlds = selectedArchive.worlds;
          console.log('从选中存档中获取世界列表:', this.worlds);
          
          if (this.worlds.length > 0) {
            this.queryParams.world = this.worlds[0].name;
          } else {
            this.queryParams.world = '';
          }
        } else {
          // 如果在存档对象中找不到worlds，则尝试API调用
          const worlds = await logApi.getWorldsByArchive(archiveName);
          this.worlds = worlds || [];
          console.log('通过API获取世界列表:', this.worlds);
          
          if (this.worlds.length > 0) {
            this.queryParams.world = this.worlds[0].name;
          } else {
            this.queryParams.world = '';
          }
        }
      } catch (error) {
        console.error('获取世界列表失败:', error);
        this.$message.error('获取世界列表失败');
        this.worlds = [];
        this.queryParams.world = '';
      }
    },
    
    // 获取日志类型统计
    async getLogTypes() {
      try {
        const response = await logApi.getLogTypes(this.queryParams);
        // 如果有返回的日志类型，可以添加到logTypes中
      } catch (error) {
        console.error('获取日志类型统计失败:', error);
      }
    },
    
    // 存档变更处理
    handleArchiveChange(value) {
      this.getWorlds(value);
    },
    
    // 查询日志
    async queryLogs() {
      this.loading = true;
      try {
        console.log('查询参数:', this.queryParams);
        const response = await logApi.getLogsData(this.queryParams);
        console.log('日志查询响应:', response);
        
        // 递归查找logs数组
        const findLogs = (obj) => {
          if (!obj || typeof obj !== 'object') return null;
          
          if (obj.logs && Array.isArray(obj.logs)) {
            return {
              logs: obj.logs,
              total: obj.total || 0
            };
          }
          
          for (const key in obj) {
            const result = findLogs(obj[key]);
            if (result) return result;
          }
          
          return null;
        };
        
        const result = findLogs(response);
        
        if (result) {
          this.logData = result.logs;
          this.total = result.total;
          console.log('成功找到并处理日志数据:', this.logData);
        } else {
          console.error('未找到有效的日志数据:', response);
          this.logData = [];
          this.total = 0;
        }
      } catch (error) {
        console.error('查询日志失败:', error);
        this.$message.error('查询日志失败: ' + (error.message || '未知错误'));
        this.logData = [];
        this.total = 0;
      } finally {
        this.loading = false;
      }
    },
    
    // 格式化日期
    formatDate(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    },
    
    // 重置查询条件
    resetQuery() {
      this.queryParams = {
        archive: this.archives.length > 0 ? this.archives[0].name : '',
        world: this.worlds.length > 0 ? this.worlds[0].name : '',
        type: '',
        page: 1,
        page_size: 20
      };
      this.getWorlds(this.queryParams.archive);
    },
    
    // 分页大小变更
    handleSizeChange(val) {
      this.queryParams.page_size = val;
      this.queryLogs();
    },
    
    // 页码变更
    handleCurrentChange(val) {
      this.queryParams.page = val;
      this.queryLogs();
    },
    
    // 获取日志类型对应的标签类型
    getLogTypeTag(type) {
      switch (type) {
        case 'system':
          return 'info';
        case 'chat':
          return 'success';
        case 'connection':
          return 'warning';
        case 'player':
          return 'primary';
        default:
          return '';
      }
    }
  }
};
</script>

<style scoped>
.log-query-container {
  padding: 20px;
}

.filter-section {
  margin-bottom: 20px;
  background: #fff;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.result-section {
  background: #fff;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}
</style> 