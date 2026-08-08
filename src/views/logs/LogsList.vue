<template>
  <div class="redirect-container">
    <Card class="box-card">
      <CardHeader>
        <CardTitle>功能已更新</CardTitle>
        <CardDescription>日志功能现已拆分为独立的查询与规则管理模块。</CardDescription>
      </CardHeader>
      <CardContent class="content">
        <div class="button-container">
          <UiButton @click="goToLogQuery">
            <FileSearch data-icon="inline-start" />
            前往日志查询
          </UiButton>
          <UiButton variant="outline" @click="goToRuleManagement">
            <ListChecks data-icon="inline-start" />
            前往规则管理
          </UiButton>
        </div>
        <p class="tip">3 秒后将自动跳转到日志查询页面</p>
      </CardContent>
    </Card>
  </div>
</template>

<script>
import { FileSearch, ListChecks } from '@lucide/vue';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default {
  name: 'LogsList',
  components: {
    UiButton,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    FileSearch,
    ListChecks
  },
  data() {
    return {
      redirectTimer: null
    };
  },
  created() {
    this.startRedirectTimer();
  },
  beforeUnmount() {
    if (this.redirectTimer) clearTimeout(this.redirectTimer);
  },
  methods: {
    startRedirectTimer() {
      this.redirectTimer = setTimeout(() => this.goToLogQuery(), 3000);
    },
    goToLogQuery() {
      this.$router.push('/logs/query');
    },
    goToRuleManagement() {
      this.$router.push('/logs/rules');
    }
  }
};
</script>

<style scoped>
.redirect-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  min-height: 360px;
  padding: 16px;
}

.box-card {
  width: 500px;
  max-width: 100%;
}

.content {
  text-align: center;
}

.button-container {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.tip {
  margin-top: 20px;
  color: var(--muted-foreground);
  font-size: 14px;
}

@media (max-width: 480px) {
  .button-container {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
