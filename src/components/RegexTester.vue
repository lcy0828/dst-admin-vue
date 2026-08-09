<template>
  <Card size="sm" class="regex-tester">
    <CardHeader>
      <div>
        <CardTitle>匹配设置</CardTitle>
        <CardDescription>日志样本、表达式与匹配结果。</CardDescription>
      </div>
    </CardHeader>
    <CardContent class="tester-content">
      <FieldGroup>
        <Field>
          <FieldLabel for="regex-test-content">测试内容</FieldLabel>
          <UiTextarea
            id="regex-test-content"
            v-model="regexForm.testContent"
            rows="5"
            placeholder="输入要测试的日志内容"
          />
        </Field>

        <Field :data-invalid="patternInvalid">
          <FieldLabel for="regex-pattern">正则表达式</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="regex-pattern"
              v-model="regexForm.pattern"
              placeholder="输入正则表达式"
              :aria-invalid="patternInvalid"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton variant="default" :disabled="!canTest" @click="testRegex">
                <RefreshCwIcon data-icon="inline-start" />
                测试
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel for="regex-enabled">使用正则表达式</FieldLabel>
          </FieldContent>
          <UiSwitch id="regex-enabled" v-model="regexForm.isRegex" @update:model-value="testRegex" />
        </Field>

        <Field>
          <FieldLabel for="regex-match-mode">匹配模式</FieldLabel>
          <UiSelect v-model="regexForm.matchMode" @update:model-value="testRegex">
            <SelectTrigger id="regex-match-mode"><SelectValue placeholder="选择匹配模式" /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem value="single">单行匹配</SelectItem>
              <SelectItem value="multi_line">多行匹配</SelectItem>
              <SelectItem value="head_tail">首尾行匹配</SelectItem>
            </SelectGroup></SelectContent>
          </UiSelect>
        </Field>

        <Field v-if="regexForm.matchMode === 'head_tail'" :data-invalid="tailPatternInvalid">
          <FieldLabel for="regex-tail-pattern">尾行匹配模式</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="regex-tail-pattern"
              v-model="regexForm.tailPattern"
              placeholder="输入尾行匹配模式"
              :aria-invalid="tailPatternInvalid"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton variant="default" :disabled="!canTest || !regexForm.tailPattern" @click="testRegex">
                <RefreshCwIcon data-icon="inline-start" />
                测试
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </FieldGroup>

      <Separator />

      <section class="test-results" aria-live="polite">
        <div class="section-heading"><h4>测试结果</h4><Badge v-if="testResult.isValid === true" variant="secondary">{{ testResult.matches.length }} 项</Badge></div>
        <Empty v-if="testResult.isValid === null" class="waiting-state">
          <EmptyHeader><EmptyMedia variant="icon"><ScanSearchIcon /></EmptyMedia><EmptyTitle>等待测试</EmptyTitle><EmptyDescription>当前尚无测试结果。</EmptyDescription></EmptyHeader>
        </Empty>
        <Alert v-else-if="testResult.isValid === false" variant="destructive">
          <CircleXIcon />
          <AlertTitle>正则表达式无效</AlertTitle>
          <AlertDescription>{{ testResult.error }}</AlertDescription>
        </Alert>
        <template v-else>
          <Alert v-if="testResult.matches.length > 0">
            <CircleCheckIcon />
            <AlertTitle>匹配成功</AlertTitle>
            <AlertDescription>找到 {{ testResult.matches.length }} 个匹配项</AlertDescription>
          </Alert>
          <Alert v-else>
            <TriangleAlertIcon />
            <AlertTitle>未找到匹配项</AlertTitle>
            <AlertDescription>当前日志内容与表达式没有产生匹配。</AlertDescription>
          </Alert>

          <section v-if="testResult.matches.length > 0" class="matches-container">
            <h5>匹配结果</h5>
            <ol class="match-list">
              <li v-for="(match, index) in testResult.matches" :key="index" class="match-item">
                <span class="match-index">匹配 #{{ index + 1 }}</span>
                <pre class="match-content">{{ match }}</pre>
              </li>
            </ol>
          </section>

          <section v-if="testResult.highlightedContent" class="highlighted-section">
            <h5>高亮显示</h5>
            <div class="highlighted-content" v-html="testResult.highlightedContent"></div>
          </section>
        </template>
      </section>
    </CardContent>

    <CardFooter class="actions">
      <UiButton variant="outline" @click="resetForm">重置</UiButton>
      <UiButton :disabled="!regexForm.pattern" @click="applyRegex">应用到规则</UiButton>
    </CardFooter>
  </Card>
</template>

<script>
import { CircleCheckIcon, CircleXIcon, RefreshCwIcon, ScanSearchIcon, TriangleAlertIcon } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldContent, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch as UiSwitch } from '@/components/ui/switch'
import { Textarea as UiTextarea } from '@/components/ui/textarea'

export default {
  name: 'RegexTester',
  components: {
    Alert,
    AlertDescription,
    AlertTitle,
    Badge,
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    CircleCheckIcon,
    CircleXIcon,
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    Field,
    FieldContent,
    FieldGroup,
    FieldLabel,
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
    RefreshCwIcon,
    ScanSearchIcon,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Separator,
    UiSwitch,
    UiTextarea,
    TriangleAlertIcon,
    UiButton,
    UiSelect
  },
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
  computed: {
    canTest() {
      return Boolean(this.regexForm.testContent && this.regexForm.pattern)
    },
    tailPatternInvalid() {
      return this.regexForm.matchMode === 'head_tail' && this.testResult.isValid === false &&
        (!this.regexForm.tailPattern || this.testResult.error.includes('尾行'))
    },
    patternInvalid() {
      return this.testResult.isValid === false && !this.tailPatternInvalid
    }
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
  min-width: 0;
}

.tester-content,
.test-results {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 16px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.section-heading h4,
.matches-container h5,
.highlighted-section h5 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.waiting-state {
  min-height: 160px;
}

.matches-container,
.highlighted-section {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

.match-list {
  max-height: 320px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  list-style: none;
}

.match-item {
  min-width: 0;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.match-item:last-child {
  border-bottom: 0;
}

.match-index {
  display: block;
  margin-bottom: 6px;
  color: var(--muted-foreground);
  font-size: 12px;
  font-weight: 600;
}

.match-content {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  white-space: pre-wrap;
}

.highlighted-content {
  max-height: 300px;
  min-width: 0;
  padding: 10px 12px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.highlighted-content :deep(.highlight) {
  background-color: color-mix(in srgb, var(--chart-3) 35%, var(--background));
  color: var(--foreground);
  padding: 2px 0;
  border-radius: 2px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 520px) {
  .actions > * {
    flex: 1 1 calc(50% - 4px);
  }
}
</style>
