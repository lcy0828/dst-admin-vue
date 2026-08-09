<template>
  <div class="room-settings-page">
    <header class="page-header">
      <div>
        <h1>房间外观设置</h1>
        <p>管理房间展示样式。</p>
      </div>
    </header>

    <Empty class="unavailable-state">
      <EmptyHeader>
        <EmptyMedia variant="icon"><Palette /></EmptyMedia>
        <EmptyTitle>房间外观设置暂不可用</EmptyTitle>
        <EmptyDescription>当前后端没有房间外观配置接口。游戏参数请前往房间设置页面管理。</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <UiButton variant="outline" @click="$router.push('/rooms/list')">前往房间管理</UiButton>
      </EmptyContent>
    </Empty>
  </div>
</template>

<script>
import { Palette } from '@lucide/vue';
import { Button as UiButton } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

export default {
  name: 'RoomAppearanceSettings',
  components: { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle, Palette, UiButton }
};
</script>

<style scoped>
.room-settings-page {
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
