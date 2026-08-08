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
          <el-button type="danger" @click="showCleanupLogDialog">清空日志</el-button>
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
        <el-table-column prop="content" label="内容">
          <template slot-scope="scope">
            <div class="log-content">{{ scope.row.content }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="world_name" label="世界" width="120"></el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template slot-scope="scope">
            <el-button type="text" size="small" @click="createRuleFromLog(scope.row)">创建规则</el-button>
          </template>
        </el-table-column>
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

    <!-- 创建规则对话框 -->
    <el-dialog
      title="基于日志创建解析规则"
      v-model="ruleDialogVisible"
      width="80%"
      :close-on-click-modal="false"
      :before-close="handleRuleDialogClose"
      class="rule-dialog"
      top="5vh"
    >
      <div v-if="selectedLog" class="rule-dialog-content">
        <el-card class="rule-form-card">
          <div slot="header" class="clearfix">
            <span>规则基本信息</span>
          </div>
          <el-form :model="ruleForm" :rules="ruleFormRules" ref="ruleForm" label-width="120px">
            <el-form-item label="规则名称" prop="name">
              <el-input v-model="ruleForm.name"></el-input>
            </el-form-item>
            <el-form-item label="描述" prop="description">
              <el-input v-model="ruleForm.description" type="textarea" :rows="2"></el-input>
            </el-form-item>
            <el-form-item label="日志类型" prop="log_type">
              <el-input v-model="ruleForm.log_type"></el-input>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card class="regex-tester-card">
          <div slot="header" class="clearfix">
            <span>正则表达式测试</span>
          </div>
          <regex-tester
            :initial-content="selectedLog.raw_content || selectedLog.content"
            :initial-pattern="initialPattern"
            :initial-is-regex="true"
            :initial-match-mode="'single'"
            @apply="applyRegexToRule"
            ref="regexTester"
          ></regex-tester>
        </el-card>
      </div>
    <span slot="footer" class="dialog-footer">
      <el-button @click="cancelRule">取消</el-button>
      <el-button type="primary" @click="saveRule">保存规则</el-button>
    </span>
    </el-dialog>

    <!-- 清空日志对话框 -->
    <el-dialog
      title="清空日志"
      v-model="cleanupDialogVisible"
      width="30%"
      :close-on-click-modal="false"
    >
      <div class="cleanup-dialog-content">
        <p class="warning-text">警告：此操作将清空所选存档和世界的所有日志记录，并重置日志解析器的位置。此操作不可恢复！</p>
        <el-form :model="cleanupForm" label-width="80px">
          <el-form-item label="存档" required>
            <el-input v-model="cleanupForm.archive_name" disabled></el-input>
          </el-form-item>
          <el-form-item label="世界" required>
            <el-input v-model="cleanupForm.world_name" disabled></el-input>
          </el-form-item>
        </el-form>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="cleanupDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="cleanupLog" :loading="cleanupLoading">确认清空</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { logApi, ruleManagementApi } from '@/api';
import RegexTester from '@/components/RegexTester.vue';

export default {
  name: 'LogQueryView',
  components: {
    RegexTester
  },
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
      loading: false,

      // 规则对话框相关
      ruleDialogVisible: false,
      selectedLog: null,
      initialPattern: '',

      // 规则表单
      ruleForm: {
        name: '',
        description: '',
        log_type: '',
        pattern: '',
        is_regex: true,
        is_enabled: true,
        priority: 50,
        match_mode: 'single',
        tail_pattern: ''
      },

      // 规则表单验证规则
      ruleFormRules: {
        name: [
          { required: true, message: '请输入规则名称', trigger: 'blur' },
          { min: 2, max: 50, message: '规则名称长度应在2-50个字符之间', trigger: 'blur' }
        ],
        description: [
          { required: true, message: '请输入规则描述', trigger: 'blur' },
          { min: 2, max: 200, message: '规则描述长度应在2-200个字符之间', trigger: 'blur' }
        ],
        log_type: [
          { required: true, message: '请选择日志类型', trigger: 'change' }
        ]
      },

      // 清空日志相关
      cleanupDialogVisible: false,
      cleanupLoading: false,
      cleanupForm: {
        archive_name: '',
        world_name: ''
      }
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
        console.log('开始获取有日志的存档列表');
        const response = await logApi.getArchivesWithLogs();
        console.log('获取到存档列表响应:', response);

        // 处理新接口的响应格式
        if (response && response.status === 200 && response.data && Array.isArray(response.data.data)) {
          // 新接口格式
          const archivesData = response.data.data;
          // 将新格式转换为兼容现有代码的格式
          this.archives = archivesData.map(item => ({
            name: item.archive_name,
            worlds: item.worlds.map(worldName => ({ name: worldName }))
          }));

          if (this.archives.length > 0) {
            this.queryParams.archive = this.archives[0].name;
            this.getWorlds(this.queryParams.archive);
          }
        } else if (response && response.data && Array.isArray(response.data)) {
          // 直接返回数组的格式
          const archivesData = response.data;
          this.archives = archivesData.map(item => ({
            name: item.archive_name,
            worlds: item.worlds.map(worldName => ({ name: worldName }))
          }));

          if (this.archives.length > 0) {
            this.queryParams.archive = this.archives[0].name;
            this.getWorlds(this.queryParams.archive);
          }
        } else if (response && response.status === 200 && Array.isArray(response.data)) {
          // 兼容旧接口格式
          this.archives = response.data;
          if (this.archives.length > 0) {
            this.queryParams.archive = this.archives[0].name;
            this.getWorlds(this.queryParams.archive);
          }
        } else if (response && response.data && response.data.status === 200 && Array.isArray(response.data.data)) {
          // 兼容旧接口格式
          this.archives = response.data.data;
          if (this.archives.length > 0) {
            this.queryParams.archive = this.archives[0].name;
            this.getWorlds(this.queryParams.archive);
          }
        } else {
          console.error('获取存档列表格式错误:', response);
          this.$message.warning('获取存档列表格式错误，尝试使用旧接口');
          // 尝试使用旧接口
          const oldResponse = await logApi.getArchiveList();
          if (oldResponse && oldResponse.status === 200 && Array.isArray(oldResponse.data)) {
            this.archives = oldResponse.data;
            if (this.archives.length > 0) {
              this.queryParams.archive = this.archives[0].name;
              this.getWorlds(this.queryParams.archive);
            }
          } else if (oldResponse && oldResponse.data && oldResponse.data.status === 200 && Array.isArray(oldResponse.data.data)) {
            this.archives = oldResponse.data.data;
            if (this.archives.length > 0) {
              this.queryParams.archive = this.archives[0].name;
              this.getWorlds(this.queryParams.archive);
            }
          }
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

        // 尝试使用旧接口
        try {
          console.log('尝试使用旧接口获取存档列表');
          const oldResponse = await logApi.getArchiveList();
          if (oldResponse && oldResponse.status === 200 && Array.isArray(oldResponse.data)) {
            this.archives = oldResponse.data;
            if (this.archives.length > 0) {
              this.queryParams.archive = this.archives[0].name;
              this.getWorlds(this.queryParams.archive);
            }
          } else if (oldResponse && oldResponse.data && oldResponse.data.status === 200 && Array.isArray(oldResponse.data.data)) {
            this.archives = oldResponse.data.data;
            if (this.archives.length > 0) {
              this.queryParams.archive = this.archives[0].name;
              this.getWorlds(this.queryParams.archive);
            }
          }
        } catch (oldError) {
          console.error('旧接口获取存档列表也失败:', oldError);
        }
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
          this.worlds = this.sortWorlds(selectedArchive.worlds);
          console.log('从选中存档中获取并排序世界列表:', this.worlds);

          if (this.worlds.length > 0) {
            this.queryParams.world = this.worlds[0].name;
            // 触发一次查询
            this.$nextTick(() => {
              this.queryLogs();
            });
          } else {
            this.queryParams.world = '';
          }
        } else {
          // 如果在存档对象中找不到worlds，则尝试使用新API
          try {
            console.log('使用新API获取世界列表');
            const response = await logApi.getArchivesWithLogs();

            if (response && response.status === 200 && response.data && Array.isArray(response.data.data)) {
              // 新接口格式
              const archive = response.data.data.find(item => item.archive_name === archiveName);
              if (archive && Array.isArray(archive.worlds)) {
                this.worlds = this.sortWorlds(archive.worlds.map(worldName => ({ name: worldName })));
                console.log('使用新API获取并排序世界列表:', this.worlds);

                if (this.worlds.length > 0) {
                  this.queryParams.world = this.worlds[0].name;
                  // 触发一次查询
                  this.$nextTick(() => {
                    this.queryLogs();
                  });
                } else {
                  this.queryParams.world = '';
                }
                return;
              }
            } else if (response && response.data && Array.isArray(response.data)) {
              // 直接返回数组的格式
              const archive = response.data.find(item => item.archive_name === archiveName);
              if (archive && Array.isArray(archive.worlds)) {
                this.worlds = this.sortWorlds(archive.worlds.map(worldName => ({ name: worldName })));
                console.log('使用新API获取并排序世界列表:', this.worlds);

                if (this.worlds.length > 0) {
                  this.queryParams.world = this.worlds[0].name;
                  // 触发一次查询
                  this.$nextTick(() => {
                    this.queryLogs();
                  });
                } else {
                  this.queryParams.world = '';
                }
                return;
              }
            }

            // 如果新API没有找到对应的存档或世界，则尝试旧API
            console.log('新API没有找到对应的存档或世界，尝试旧API');
          } catch (newApiError) {
            console.error('新API获取世界列表失败:', newApiError);
          }

          // 尝试旧API
          console.log('尝试使用旧API获取世界列表');
          const worlds = await logApi.getWorldsByArchive(archiveName);
          this.worlds = this.sortWorlds(worlds || []);
          console.log('通过旧API获取并排序世界列表:', this.worlds);

          if (this.worlds.length > 0) {
            this.queryParams.world = this.worlds[0].name;
            // 触发一次查询
            this.$nextTick(() => {
              this.queryLogs();
            });
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
    },

    // 对世界列表进行排序
    sortWorlds(worlds) {
      if (!worlds || !Array.isArray(worlds)) return [];

      // 先复制一份数组，避免修改原数组
      const sortedWorlds = [...worlds];

      // 自定义排序函数
      return sortedWorlds.sort((a, b) => {
        const nameA = a.name || '';
        const nameB = b.name || '';

        // 检查是否以Forest开头
        const isAForest = nameA.startsWith('Forest');
        const isBForest = nameB.startsWith('Forest');

        // 如果一个是Forest开头而另一个不是，则Forest开头的优先
        if (isAForest && !isBForest) return -1;
        if (!isAForest && isBForest) return 1;

        // 如果两个都是或都不是Forest开头，则提取最后的数字进行比较
        const getLastNumber = (name) => {
          const matches = name.match(/(\d+)(?!.*\d)/);
          return matches ? parseInt(matches[1], 10) : 0;
        };

        const numA = getLastNumber(nameA);
        const numB = getLastNumber(nameB);

        // 按数字升序排序
        return numA - numB;
      });
    },

    // 从日志创建规则
    createRuleFromLog(log) {
      console.log('创建规则使用的日志:', log);

      // 确保有日志内容
      if (!log || (!log.raw_content && !log.content)) {
        this.$message.error('日志内容为空，无法创建规则');
        return;
      }

      // 优先使用 raw_content，如果没有再使用 content
      const logContent = log.raw_content || log.content;

      this.selectedLog = {
        ...log,
        // 确保内容是最新的
        content: log.content,
        raw_content: log.raw_content
      };

      // 初始化规则表单
      this.ruleForm = {
        name: `自动生成的规则 - ${log.log_type || '未知类型'}`,
        description: `基于日志内容自动生成的解析规则`,
        log_type: log.log_type || '',
        pattern: '',
        is_regex: true,
        is_enabled: true,
        priority: 50,
        match_mode: 'single',
        tail_pattern: ''
      };

      // 尝试生成初始正则表达式
      this.generateInitialPattern(logContent);

      // 显示对话框
      this.ruleDialogVisible = true;

      // 在对话框显示后更新测试器的内容和正则表达式
      this.$nextTick(() => {
        if (this.$refs.regexTester) {
          // 先更新内容
          this.$refs.regexTester.updateContent(logContent);

          // 然后更新正则表达式
          if (this.initialPattern) {
            this.$refs.regexTester.regexForm.pattern = this.initialPattern;
            // 手动触发测试
            setTimeout(() => {
              this.$refs.regexTester.testRegex();
            }, 100);
          }
        }
      });
    },

    // 生成初始正则表达式
    generateInitialPattern(content) {
      if (!content) {
        this.initialPattern = '';
        return;
      }

      console.log('为日志生成正则表达式:', content);

      // 尝试生成一个更精确的正则表达式
      // 先检查是否有时间戳格式 [HH:MM:SS]
      const timeStampMatch = content.match(/\[(\d{2}:\d{2}:\d{2})\]/);

      // 分析日志类型并生成相应的正则表达式
      if (content.includes('Available disk space for save files:')) {
        // diskspace 类型的日志
        this.initialPattern = '\\[\\d{2}:\\d{2}:\\d{2}\\]:\\s+Available disk space for save files:';
      } else if (content.includes('Serializing world:')) {
        // snapshot 类型的日志
        this.initialPattern = '\\[\\d{2}:\\d{2}:\\d{2}\\]:\\s+Serializing world:';
      } else if (content.includes('Account Communication Success')) {
        // 账户通信成功的日志
        this.initialPattern = '\\[\\d{2}:\\d{2}:\\d{2}\\]:\\s+\\[200\\] Account Communication Success';
      } else if (content.includes('Received') && content.includes('from')) {
        // 接收信息的日志
        this.initialPattern = '\\[\\d{2}:\\d{2}:\\d{2}\\]:\\s+Received \\(.*?\\) from';
      } else if (timeStampMatch) {
        // 如果有时间戳，使用更通用的模式
        // 先获取时间戳后的内容
        const afterTimestamp = content.substring(timeStampMatch.index + timeStampMatch[0].length).trim();

        // 检查是否有冒号分隔
        if (afterTimestamp.startsWith(':')) {
          // 如果有冒号，提取冒号后的第一个单词
          const colonContent = afterTimestamp.substring(1).trim();
          const firstWord = colonContent.split(/\s+/)[0];

          if (firstWord && firstWord.length > 0) {
            // 将第一个单词转义并添加到模式中
            const escapedWord = firstWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            this.initialPattern = '\\[\\d{2}:\\d{2}:\\d{2}\\]:\\s+' + escapedWord;
          } else {
            // 如果没有单词，使用通用模式
            this.initialPattern = '\\[\\d{2}:\\d{2}:\\d{2}\\]:';
          }
        } else {
          // 如果没有冒号，使用时间戳模式
          this.initialPattern = '\\[\\d{2}:\\d{2}:\\d{2}\\]';
        }
      } else {
        // 如果没有时间戳，尝试使用内容的第一行
        const firstLine = content.split('\n')[0].trim();

        if (firstLine) {
          // 取前30个字符或整行（取较短的）
          const maxLength = Math.min(30, firstLine.length);
          const significantPart = firstLine.substring(0, maxLength);

          // 将特殊字符转义
          const escapedPart = significantPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

          // 如果内容过长，添加通配符
          if (firstLine.length > maxLength) {
            this.initialPattern = escapedPart + '.*';
          } else {
            this.initialPattern = escapedPart;
          }
        } else {
          this.initialPattern = '';
        }
      }

      console.log('生成的正则表达式:', this.initialPattern);
    },

    // 将正则测试器的结果应用到规则
    applyRegexToRule(regexData) {
      this.ruleForm.pattern = regexData.pattern;
      this.ruleForm.is_regex = regexData.isRegex;
      this.ruleForm.match_mode = regexData.matchMode;
      this.ruleForm.tail_pattern = regexData.tailPattern;
    },

    // 保存规则
    saveRule() {
      this.$refs.ruleForm.validate(async (valid) => {
        if (!valid) {
          return;
        }

        try {
          // 先获取正则测试器的最新数据
          if (this.$refs.regexTester) {
            // 手动运行一次测试，确保数据是最新的
            this.$refs.regexTester.testRegex();

            // 获取正则测试器的数据
            const regexData = {
              pattern: this.$refs.regexTester.regexForm.pattern,
              isRegex: this.$refs.regexTester.regexForm.isRegex,
              matchMode: this.$refs.regexTester.regexForm.matchMode,
              tailPattern: this.$refs.regexTester.regexForm.tailPattern
            };

            // 应用到规则中
            this.applyRegexToRule(regexData);
          }

          // 确保有模式
          if (!this.ruleForm.pattern) {
            this.$message.error('请先设置匹配模式');
            return;
          }

          // 如果是首尾行模式，需要尾行模式
          if (this.ruleForm.match_mode === 'head_tail' && !this.ruleForm.tail_pattern) {
            this.$message.error('首尾行匹配模式需要提供尾行匹配模式');
            return;
          }

          // 创建一个新的数据对象
          const formData = { ...this.ruleForm };
          // 确保优先级是数字类型
          formData.priority = parseInt(formData.priority, 10);

          console.log('提交的规则数据:', formData);

          // 添加解析规则
          const response = await ruleManagementApi.addRule(formData);
          console.log('添加规则响应:', response);
          this.$message.success('添加解析规则成功');

          // 关闭对话框
          this.ruleDialogVisible = false;
          // 清空选中的日志
          this.selectedLog = null;
          this.initialPattern = '';
        } catch (error) {
          console.error('解析规则操作失败:', error);
          this.$message.error('解析规则操作失败: ' + (error.message || '未知错误'));
        }
      });
    },

    // 取消规则创建
    cancelRule() {
      // 关闭对话框
      this.ruleDialogVisible = false;
      // 清空选中的日志
      this.selectedLog = null;
      this.initialPattern = '';
    },

    // 处理规则对话框关闭
    handleRuleDialogClose(done) {
      // 检查表单是否有修改
      const hasChanges = this.ruleForm.name !== `自动生成的规则 - ${this.selectedLog?.log_type || '未知类型'}` ||
                        this.ruleForm.description !== `基于日志内容自动生成的解析规则` ||
                        this.ruleForm.log_type !== (this.selectedLog?.log_type || '') ||
                        this.ruleForm.pattern !== '' ||
                        this.ruleForm.match_mode !== 'single' ||
                        this.ruleForm.tail_pattern !== '';

      const closeDialog = () => {
        // 在关闭对话框前清空选中的日志
        this.selectedLog = null;
        this.initialPattern = '';
        done();
      };

      if (hasChanges) {
        // 如果有修改，弹出确认对话框
        this.$confirm('关闭将丢失未保存的内容，是否确认关闭？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          // 用户确认关闭
          closeDialog();
        }).catch(() => {
          // 用户取消关闭
          // 不做任何操作，对话框保持打开状态
        });
      } else {
        // 如果没有修改，直接关闭
        closeDialog();
      }
    },

    // 显示清空日志对话框
    showCleanupLogDialog() {
      // 检查是否选择了存档和世界
      if (!this.queryParams.archive) {
        this.$message.warning('请先选择存档');
        return;
      }

      if (!this.queryParams.world) {
        this.$message.warning('请先选择世界');
        return;
      }

      // 设置清空日志表单的值
      this.cleanupForm.archive_name = this.queryParams.archive;
      this.cleanupForm.world_name = this.queryParams.world;

      // 显示对话框
      this.cleanupDialogVisible = true;
    },

    // 清空日志
    async cleanupLog() {
      // 再次确认
      try {
        await this.$confirm('此操作将清空所选存档和世界的所有日志记录，并重置日志解析器的位置。此操作不可恢复！是否确认继续？', '警告', {
          confirmButtonText: '确认清空',
          cancelButtonText: '取消',
          type: 'warning',
          distinguishCancelAndClose: true
        });
      } catch (e) {
        return; // 用户取消操作
      }

      this.cleanupLoading = true;
      try {
        const response = await logApi.cleanupLog(this.cleanupForm);
        console.log('清空日志响应:', response);

        if (response && response.status === 200) {
          this.$message.success(response.msg || '成功清空日志记录');
          // 关闭对话框
          this.cleanupDialogVisible = false;
          // 重新查询日志，刷新列表
          this.queryLogs();
        } else {
          this.$message.error(response?.msg || '清空日志失败');
        }
      } catch (error) {
        console.error('清空日志失败:', error);
        this.$message.error('清空日志失败: ' + (error.message || '未知错误'));
      } finally {
        this.cleanupLoading = false;
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

.log-content {
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
  font-family: monospace;
  line-height: 1.5;
}

.rule-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.rule-form-card {
  margin-bottom: 0;
}

.regex-tester-card {
  margin-bottom: 0;
}

/* 确保对话框内容可以滚动 */
.rule-dialog .el-dialog__body {
  max-height: calc(90vh - 150px);
  overflow-y: auto;
}

/* 确保对话框不会太高 */
.rule-dialog :deep(.el-dialog) {
  margin-bottom: 5vh;
}

/* 清空日志对话框样式 */
.cleanup-dialog-content {
  padding: 10px 0;
}

.warning-text {
  color: #d99b32;
  font-weight: bold;
  margin-bottom: 20px;
  padding: 10px;
  background-color: #FDF6EC;
  border-radius: 4px;
  border-left: 4px solid #d99b32;
}
</style>