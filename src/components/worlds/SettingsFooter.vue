<template>
  <div class="actions-footer">
    <div class="settings-status">
      <Badge v-if="hasChanges" variant="secondary">{{ $t('worlds.settingsUi.footer.unsaved') }}</Badge>
      <Badge v-else variant="outline">{{ $t('worlds.settingsUi.footer.synced') }}</Badge>
      
      <Popover v-if="hasChanges">
        <PopoverTrigger as-child>
          <UiButton variant="ghost" size="sm" class="view-changes-btn">
            <EyeIcon data-icon="inline-start" />
            {{ $t('worlds.settingsUi.footer.viewChanges', { count: changedItemsCount }) }}
          </UiButton>
        </PopoverTrigger>
        <PopoverContent class="changes-popover">
          <PopoverHeader>
            <PopoverTitle>{{ $t('worlds.settingsUi.footer.changedItems', { count: changedItemsCount }) }}</PopoverTitle>
            <PopoverDescription>{{ $t('worlds.settingsUi.footer.changesDescription') }}</PopoverDescription>
          </PopoverHeader>
          <ScrollArea class="changes-list">
            <div v-for="(item, index) in changedItems" :key="index" class="change-item">
              <div class="change-item-name">{{ item.text }}</div>
              <div class="change-item-values">
                <span class="old-value">{{ item.oldValueText }}</span>
                <ArrowRightIcon />
                <span class="new-value">{{ item.newValueText }}</span>
              </div>
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
    <div class="action-buttons">
      <UiButton
        variant="outline"
        @click="$emit('reset')"
        :disabled="loading || saveLoading || !hasChanges"
      >
        <RotateCcwIcon data-icon="inline-start" />
        {{ $t('common.actions.reset') }}
      </UiButton>
      <UiButton
        @click="$emit('save')"
        :disabled="loading || saveLoading || !hasChanges"
      >
        <Spinner v-if="saveLoading" data-icon="inline-start" />
        <CheckIcon v-else data-icon="inline-start" />
        {{ $t('worlds.settingsUi.footer.save') }}
      </UiButton>
    </div>
  </div>
</template>

<script>
import { ArrowRightIcon, CheckIcon, EyeIcon, RotateCcwIcon } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'

export default {
  name: 'SettingsFooter',
  components: {
    ArrowRightIcon,
    Badge,
    CheckIcon,
    EyeIcon,
    Popover,
    PopoverContent,
    PopoverDescription,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
    RotateCcwIcon,
    ScrollArea,
    Spinner,
    UiButton
  },
  props: {
    hasChanges: {
      type: Boolean,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    saveLoading: {
      type: Boolean,
      default: false
    },
    changedItems: {
      type: Array,
      default: () => []
    }
  },
  computed: {
    changedItemsCount() {
      return this.changedItems.length;
    }
  }
}
</script>

<style scoped>
.actions-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
  gap: 12px;
}

.settings-status {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.action-buttons button {
  min-width: 90px;
}

.view-changes-btn {
  margin-left: 0;
}

.changes-popover {
  width: 320px;
}

.changes-list {
  max-height: 300px;
  overflow-y: auto;
}

.change-item {
  padding: 8px 0;
  border-bottom: 1px dashed var(--border);
}

.change-item:last-child {
  border-bottom: none;
}

.change-item-name {
  font-weight: 500;
  margin-bottom: 5px;
}

.change-item-values {
  display: flex;
  align-items: center;
  font-size: 12px;
}

.old-value {
  color: var(--muted-foreground);
  text-decoration: line-through;
}

.change-item-values svg {
  margin: 0 8px;
  color: var(--muted-foreground);
}

.new-value {
  color: var(--foreground);
  font-weight: 500;
}

@media (max-width: 768px) {
  .actions-footer {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .settings-status {
    justify-content: space-between;
  }
  
  .action-buttons {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .action-buttons button {
    width: 100%;
    min-width: 0;
    margin: 0;
  }
}
</style>
