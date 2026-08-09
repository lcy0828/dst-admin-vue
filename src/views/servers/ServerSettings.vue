<template>
  <div class="server-settings-page">
    <header class="page-header">
      <div>
        <h1>服务器设置</h1>
        <p>配置专服运行参数和系统级选项。</p>
      </div>
    </header>

    <Empty class="unavailable-state">
      <EmptyHeader>
        <EmptyMedia variant="icon"><Settings /></EmptyMedia>
        <EmptyTitle>服务器设置暂不可用</EmptyTitle>
        <EmptyDescription>当前后端尚未提供服务器级设置接口，请通过系统设置和房间设置管理现有配置。</EmptyDescription>
      </EmptyHeader>
    </Empty>
  </div>
</template>

<script>
import { Settings } from '@lucide/vue';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

export default {
  name: 'ServerSettings',
  components: { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle, Settings }
};
</script>

<style scoped>
.server-settings-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  min-width: 0;
}

.page-header {
  margin: 0;
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

.unavailable-state {
  min-height: 320px;
  border: 1px dashed var(--border);
}
</style>
