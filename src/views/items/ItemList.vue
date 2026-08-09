<template>
  <div class="page-container">
    <header class="page-header">
      <div>
        <h1>物品管理</h1>
        <p>查看和维护服务器物品目录。</p>
      </div>
    </header>

    <Empty class="unavailable-state">
      <EmptyHeader>
        <EmptyMedia variant="icon"><PackageOpen /></EmptyMedia>
        <EmptyTitle>物品目录暂不可用</EmptyTitle>
        <EmptyDescription>
          当前后端尚未提供物品目录的查询和写入接口。接口接入后，这里将展示真实物品数据。
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  </div>
</template>

<script>
import { PackageOpen } from '@lucide/vue';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

export default {
  name: 'ItemList',
  components: {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    PackageOpen
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
