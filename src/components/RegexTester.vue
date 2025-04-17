<template>
  <div class="regex-tester">
    <el-form :model="regexForm" label-width="120px" ref="regexForm">
      <el-form-item label="测试内容" prop="testContent">
        <el-input
          type="textarea"
          v-model="regexForm.testContent"
          :rows="5"
          placeholder="输入要测试的日志内容"
        ></el-input>
      </el-form-item>

      <el-form-item label="正则表达式" prop="pattern">
        <div class="input-with-button">
          <el-input
            v-model="regexForm.pattern"
            placeholder="输入正则表达式"
          ></el-input>
          <el-button type="primary" @click="testRegex" icon="el-icon-refresh">测试</el-button>
        </div>
      </el-form-item>

      <el-form-item label="是否使用正则" prop="isRegex">
        <el-switch v-model="regexForm.isRegex" @change="testRegex"></el-switch>
      </el-form-item>

      <el-form-item label="匹配模式" prop="matchMode">
        <el-select v-model="regexForm.matchMode" placeholder="选择匹配模式" @change="testRegex">
          <el-option label="单行匹配" value="single"></el-option>
          <el-option label="多行匹配" value="multi_line"></el-option>
          <el-option label="首尾行匹配" value="head_tail"></el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="尾行匹配模式" prop="tailPattern" v-if="regexForm.matchMode === 'head_tail'">
        <div class="input-with-button">
          <el-input
            v-model="regexForm.tailPattern"
            placeholder="输入尾行匹配模式"
          ></el-input>
          <el-button type="primary" @click="testRegex" icon="el-icon-refresh">测试</el-button>
        </div>
      </el-form-item>
    </el-form>

    <div class="test-results">
      <h4>测试结果</h4>
      <div v-if="testResult.isValid === false" class="error-message">
        <i class="el-icon-error"></i> 正则表达式无效: {{ testResult.error }}
      </div>
      <div v-else-if="testResult.isValid === true">
        <div v-if="testResult.matches.length > 0" class="success-message">
          <i class="el-icon-success"></i> 匹配成功! 找到 {{ testResult.matches.length }} 个匹配项
        </div>
        <div v-else class="warning-message">
          <i class="el-icon-warning"></i> 未找到匹配项
        </div>

        <div v-if="testResult.matches.length > 0" class="matches-container">
          <h5>匹配结果:</h5>
          <div v-for="(match, index) in testResult.matches" :key="index" class="match-item">
            <div class="match-index">匹配 #{{ index + 1 }}</div>
            <div class="match-content">{{ match }}</div>
          </div>
        </div>

        <div class="highlighted-content" v-if="testResult.highlightedContent">
          <h5>高亮显示:</h5>
          <div v-html="testResult.highlightedContent"></div>
        </div>
      </div>
    </div>

    <div class="actions">
      <el-button type="primary" @click="applyRegex">应用到规则</el-button>
      <el-button @click="resetForm">重置</el-button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RegexTester',
  props: {
    initialContent: {
      type: String,
      default: ''
    },
    initialPattern: {
      type: String,
      default: ''
    },
    initialIsRegex: {
      type: Boolean,
      default: true
    },
    initialMatchMode: {
      type: String,
      default: 'single'
    },
    initialTailPattern: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      regexForm: {
        testContent: this.initialContent,
        pattern: this.initialPattern,
        isRegex: this.initialIsRegex,
        matchMode: this.initialMatchMode,
        tailPattern: this.initialTailPattern
      },
      testResult: {
        isValid: null,
        matches: [],
        error: '',
        highlightedContent: ''
      }
    };
  },
  mounted() {
    // 在组件挂载后运行测试
    this.$nextTick(() => {
      // 确保初始化完成后再运行测试
      if (this.regexForm.testContent && this.regexForm.pattern) {
        this.testRegex();
      }
    });
  },
  methods: {
    // 更新测试内容
    updateContent(newContent) {
      if (newContent !== undefined && newContent !== null) {
        this.regexForm.testContent = newContent;
        // 更新内容后自动运行一次测试
        this.$nextTick(() => {
          this.testRegex();
        });
      }
    },

    testRegex() {
      // 重置测试结果
      this.testResult = {
        isValid: null,
        matches: [],
        error: '',
        highlightedContent: ''
      };

      // 如果没有测试内容或模式，则不进行测试
      if (!this.regexForm.testContent || !this.regexForm.pattern) {
        return;
      }

      try {
        if (this.regexForm.isRegex) {
          // 使用正则表达式匹配
          const flags = 'm'; // 多行模式
          const regex = new RegExp(this.regexForm.pattern, flags);

          // 根据匹配模式进行不同的处理
          if (this.regexForm.matchMode === 'single') {
            // 单行匹配模式
            this.testSingleLineMode(regex);
          } else if (this.regexForm.matchMode === 'multi_line') {
            // 多行匹配模式
            this.testMultiLineMode(regex);
          } else if (this.regexForm.matchMode === 'head_tail') {
            // 首尾行匹配模式
            if (!this.regexForm.tailPattern) {
              this.testResult.isValid = false;
              this.testResult.error = '首尾行匹配模式需要提供尾行匹配模式';
              return;
            }
            this.testHeadTailMode(regex);
          }
        } else {
          // 使用字符串匹配
          this.testStringMatch();
        }

        // 生成高亮显示的内容
        this.generateHighlightedContent();

      } catch (error) {
        this.testResult.isValid = false;
        this.testResult.error = error.message;
      }
    },

    testSingleLineMode(regex) {
      const lines = this.regexForm.testContent.split('\n');
      const matches = [];
      const content = this.regexForm.testContent;

      // 先尝试对整个内容进行匹配
      let fullMatch = content.match(regex);
      if (fullMatch) {
        matches.push(fullMatch[0]);
      } else {
        // 如果整体匹配失败，尝试逐行匹配
        for (const line of lines) {
          if (!line.trim()) continue; // 跳过空行

          const match = line.match(regex);
          if (match) {
            matches.push(match[0]);
          }
        }
      }

      this.testResult.isValid = true;
      this.testResult.matches = matches;
    },

    testMultiLineMode(regex) {
      const lines = this.regexForm.testContent.split('\n');
      const matches = [];
      let currentMatch = [];

      for (const line of lines) {
        const match = line.match(regex);
        if (match) {
          if (currentMatch.length > 0) {
            // 如果已经有匹配项，则添加到当前匹配组
            currentMatch.push(line);
          } else {
            // 开始新的匹配组
            currentMatch = [line];
          }
        } else if (currentMatch.length > 0) {
          // 当前行不匹配，但有之前的匹配项，结束当前匹配组
          matches.push(currentMatch.join('\n'));
          currentMatch = [];
        }
      }

      // 处理最后一个匹配组
      if (currentMatch.length > 0) {
        matches.push(currentMatch.join('\n'));
      }

      this.testResult.isValid = true;
      this.testResult.matches = matches;
    },

    testHeadTailMode(regex) {
      try {
        const tailRegex = new RegExp(this.regexForm.tailPattern, 'm');
        const content = this.regexForm.testContent;
        const matches = [];

        // 查找所有头部匹配
        let headMatch;
        let lastIndex = 0;
        const headMatches = [];

        while ((headMatch = regex.exec(content.slice(lastIndex))) !== null) {
          const startIndex = lastIndex + headMatch.index;
          headMatches.push({
            match: headMatch[0],
            startIndex: startIndex,
            endIndex: startIndex + headMatch[0].length
          });
          lastIndex = startIndex + 1; // 移动到下一个可能的匹配位置

          // 防止无限循环
          if (headMatch.index === regex.lastIndex) {
            regex.lastIndex++;
          }
        }

        // 对每个头部匹配，查找对应的尾部匹配
        for (const head of headMatches) {
          const searchStart = head.endIndex;
          const remainingContent = content.slice(searchStart);

          const tailMatch = remainingContent.match(tailRegex);
          if (tailMatch) {
            const tailStartIndex = searchStart + tailMatch.index;
            const tailEndIndex = tailStartIndex + tailMatch[0].length;

            // 提取从头部开始到尾部结束的完整内容
            const fullMatch = content.slice(head.startIndex, tailEndIndex);
            matches.push(fullMatch);
          }
        }

        this.testResult.isValid = true;
        this.testResult.matches = matches;

      } catch (error) {
        this.testResult.isValid = false;
        this.testResult.error = '尾行正则表达式错误: ' + error.message;
      }
    },

    testStringMatch() {
      const content = this.regexForm.testContent;
      const pattern = this.regexForm.pattern;
      const matches = [];

      if (this.regexForm.matchMode === 'single') {
        // 单行匹配模式
        const lines = content.split('\n');
        for (const line of lines) {
          if (line.includes(pattern)) {
            matches.push(line);
          }
        }
      } else if (this.regexForm.matchMode === 'multi_line') {
        // 多行匹配模式 - 对于字符串匹配，简化处理
        const lines = content.split('\n');
        let currentMatch = [];

        for (const line of lines) {
          if (line.includes(pattern)) {
            if (currentMatch.length > 0) {
              currentMatch.push(line);
            } else {
              currentMatch = [line];
            }
          } else if (currentMatch.length > 0) {
            matches.push(currentMatch.join('\n'));
            currentMatch = [];
          }
        }

        if (currentMatch.length > 0) {
          matches.push(currentMatch.join('\n'));
        }
      } else if (this.regexForm.matchMode === 'head_tail') {
        // 首尾行匹配模式 - 对于字符串匹配，需要尾部模式
        if (!this.regexForm.tailPattern) {
          this.testResult.isValid = false;
          this.testResult.error = '首尾行匹配模式需要提供尾行匹配模式';
          return;
        }

        const lines = content.split('\n');
        let inMatch = false;
        let currentMatch = [];

        for (const line of lines) {
          if (!inMatch && line.includes(pattern)) {
            // 找到头部匹配
            inMatch = true;
            currentMatch = [line];
          } else if (inMatch) {
            currentMatch.push(line);

            // 检查是否是尾部匹配
            if (line.includes(this.regexForm.tailPattern)) {
              matches.push(currentMatch.join('\n'));
              inMatch = false;
              currentMatch = [];
            }
          }
        }
      }

      this.testResult.isValid = true;
      this.testResult.matches = matches;
    },

    generateHighlightedContent() {
      if (!this.testResult.isValid || this.testResult.matches.length === 0) {
        return;
      }

      let content = this.regexForm.testContent;

      // 简单的HTML转义
      content = content.replace(/&/g, '&amp;')
                       .replace(/</g, '&lt;')
                       .replace(/>/g, '&gt;')
                       .replace(/"/g, '&quot;')
                       .replace(/'/g, '&#039;');

      // 将换行符转换为<br>
      content = content.replace(/\n/g, '<br>');

      // 高亮匹配项
      for (const match of this.testResult.matches) {
        let escapedMatch = match.replace(/&/g, '&amp;')
                               .replace(/</g, '&lt;')
                               .replace(/>/g, '&gt;')
                               .replace(/"/g, '&quot;')
                               .replace(/'/g, '&#039;')
                               .replace(/\n/g, '<br>');

        // 使用span包裹匹配项并添加高亮样式
        const highlightedMatch = `<span class="highlight">${escapedMatch}</span>`;

        // 替换第一次出现的匹配项
        content = content.replace(escapedMatch, highlightedMatch);
      }

      this.testResult.highlightedContent = content;
    },

    applyRegex() {
      // 触发事件，将正则表达式应用到规则
      this.$emit('apply', {
        pattern: this.regexForm.pattern,
        isRegex: this.regexForm.isRegex,
        matchMode: this.regexForm.matchMode,
        tailPattern: this.regexForm.tailPattern
      });
    },

    resetForm() {
      this.regexForm = {
        testContent: this.initialContent,
        pattern: '',
        isRegex: true,
        matchMode: 'single',
        tailPattern: ''
      };
      this.testRegex();
    }
  }
};
</script>

<style scoped>
.regex-tester {
  padding: 20px;
}

.test-results {
  margin-top: 20px;
  padding: 15px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background-color: #f5f7fa;
}

.error-message {
  color: #f56c6c;
  margin-bottom: 10px;
}

.success-message {
  color: #67c23a;
  margin-bottom: 10px;
}

.warning-message {
  color: #e6a23c;
  margin-bottom: 10px;
}

.matches-container {
  margin-top: 15px;
}

.match-item {
  margin-bottom: 10px;
  padding: 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background-color: #fff;
}

.match-index {
  font-weight: bold;
  margin-bottom: 5px;
  color: #409eff;
}

.match-content {
  white-space: pre-wrap;
  font-family: monospace;
  background-color: #f8f8f8;
  padding: 8px;
  border-radius: 4px;
  border-left: 3px solid #409eff;
}

.highlighted-content {
  margin-top: 15px;
  padding: 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background-color: #fff;
  max-height: 300px;
  overflow-y: auto;
}

.highlighted-content >>> .highlight {
  background-color: #ffeaa7;
  padding: 2px 0;
  border-radius: 2px;
}

.actions {
  margin-top: 20px;
  text-align: right;
}

.input-with-button {
  display: flex;
  align-items: center;
}

.input-with-button .el-input {
  flex: 1;
  margin-right: 10px;
}
</style>
