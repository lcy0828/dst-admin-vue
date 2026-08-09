<template>
  <div class="page-container">
    <header class="page-header">
      <div>
        <h1>物品生成器</h1>
        <p>按规则生成服务器物品。</p>
      </div>
    </header>

    <Empty class="unavailable-state">
      <EmptyHeader>
        <EmptyMedia variant="icon"><WandSparkles /></EmptyMedia>
        <EmptyTitle>物品生成暂不可用</EmptyTitle>
        <EmptyDescription>
          当前后端尚未提供物品生成、保存和导出接口。接口接入后，这里将使用后端返回的真实结果。
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  </div>
</template>

<script>
import { WandSparkles } from '@lucide/vue';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

export default {
  name: 'ItemGenerator',
  components: {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    WandSparkles
  }
};
</script>

<style scoped>
.page-container {
  min-width: 0;
}

.page-header {
  margin-bottom: 16px;
}

.page-header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 650;
  line-height: 28px;
}

.page-header p {
  margin: 2px 0 0;
  color: var(--muted-foreground);
  font-size: 12px;
}

.unavailable-state {
  min-height: 320px;
  border: 1px dashed var(--border);
}
</style>
