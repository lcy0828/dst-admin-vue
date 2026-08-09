<template>
  <div class="presets-section">
    <div class="preset-title">
      <span>{{ $t('worlds.settingsUi.presets.title') }}</span>
      <Tooltip>
        <TooltipTrigger as-child>
          <UiButton variant="ghost" size="icon-xs" :aria-label="$t('worlds.settingsUi.presets.viewHelp')" :title="$t('worlds.settingsUi.presets.viewHelp')"><CircleHelpIcon /></UiButton>
        </TooltipTrigger>
        <TooltipContent>{{ $t('worlds.settingsUi.presets.description') }}</TooltipContent>
      </Tooltip>
    </div>
    <div class="preset-options">
      <ToggleGroup v-model="selectedPreset" type="single" variant="outline" :spacing="1">
        <ToggleGroupItem value="default">{{ $t('worlds.settingsUi.presets.default') }}</ToggleGroupItem>
        <ToggleGroupItem value="easy">{{ $t('worlds.settingsUi.presets.easy') }}</ToggleGroupItem>
        <ToggleGroupItem value="hard">{{ $t('worlds.settingsUi.presets.hard') }}</ToggleGroupItem>
        <ToggleGroupItem value="abundant">{{ $t('worlds.settingsUi.presets.abundant') }}</ToggleGroupItem>
        <ToggleGroupItem value="scarce">{{ $t('worlds.settingsUi.presets.scarce') }}</ToggleGroupItem>
        <ToggleGroupItem value="custom">{{ $t('worlds.settingsUi.presets.custom') }}</ToggleGroupItem>
      </ToggleGroup>
      <UiButton
        variant="secondary"
        size="sm"
        @click="handleSavePreset"
        :disabled="selectedPreset !== 'custom' || disabled"
      >
        <StarIcon data-icon="inline-start" />
        {{ $t('worlds.settingsUi.presets.save') }}
      </UiButton>
    </div>
  </div>
</template>

<script>
import { CircleHelpIcon, StarIcon } from '@lucide/vue'
import { Button as UiButton } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export default {
  name: 'SettingsPreset',
  components: {
    CircleHelpIcon,
    StarIcon,
    ToggleGroup,
    ToggleGroupItem,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    UiButton
  },
  props: {
    currentPreset: {
      type: String,
      default: 'default'
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    selectedPreset: {
      get() {
        return this.currentPreset;
      },
      set(value) {
        // 使用事件通知父组件
        this.$emit('preset-change', value);
      }
    }
  },
  methods: {
    handleSavePreset() {
      this.$emit('save-preset');
    }
  }
}
</script>

<style scoped>
.presets-section {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.preset-title {
  margin-bottom: 10px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 5px;
}

.preset-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

@media (max-width: 768px) {
  .preset-options {
    flex-direction: column;
    align-items: stretch;
  }

  .preset-options [data-slot="toggle-group"] {
    max-width: 100%;
    justify-content: flex-start;
    overflow-x: auto;
  }
}
</style>
