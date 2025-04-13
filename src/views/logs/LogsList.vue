<template>
  <div class="redirect-container">
    <el-card class="box-card">
      <div slot="header" class="clearfix">
        <span>功能已更新</span>
      </div>
      <div class="content">
        <p>日志和规则管理功能已更新，现已分为以下两个独立模块：</p>
        <div class="button-container">
          <el-button type="primary" @click="goToLogQuery">前往日志查询</el-button>
          <el-button type="success" @click="goToRuleManagement">前往规则管理</el-button>
        </div>
        <p class="tip">您将在3秒后自动跳转到日志查询页面...</p>
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'LogsList',
  data() {
    return {
      redirectTimer: null
    };
  },
  created() {
    this.startRedirectTimer();
  },
  beforeDestroy() {
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
    }
  },
  methods: {
    startRedirectTimer() {
      this.redirectTimer = setTimeout(() => {
        this.goToLogQuery();
      }, 3000);
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
  padding: 20px;
}

.box-card {
  width: 500px;
  max-width: 100%;
}

.content {
  text-align: center;
}

.button-container {
  margin: 20px 0;
  display: flex;
  justify-content: center;
  gap: 20px;
}

.tip {
  font-size: 14px;
  color: #909399;
  margin-top: 20px;
}
</style> 