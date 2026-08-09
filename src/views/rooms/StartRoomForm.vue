<template>
  <div class="start-room-form">
    <div v-if="room" class="form-container">
      <FieldGroup>
        <FieldSet>
          <FieldLegend variant="label">{{ $t('rooms.start.title', { room: room.name }) }}</FieldLegend>
          <FieldDescription>{{ $t('rooms.start.description') }}</FieldDescription>
          <RadioGroup v-model="formData.worldType" class="option-grid">
            <Field v-for="option in worldTypeOptions" :key="option.value" orientation="horizontal">
              <RadioGroupItem :id="`world-type-${option.value}`" :value="option.value" />
              <FieldLabel :for="`world-type-${option.value}`" class="font-normal">{{ option.label }}</FieldLabel>
            </Field>
          </RadioGroup>
        </FieldSet>
        
        <Field data-disabled>
          <FieldLabel>{{ $t('rooms.start.serverMode') }}</FieldLabel>
          <RadioGroup v-model="formData.serverMode" class="option-grid" disabled>
            <Field orientation="horizontal" data-disabled>
              <RadioGroupItem id="server-mode-32" value="32" disabled />
              <FieldLabel for="server-mode-32" class="font-normal">{{ $t('rooms.start.bit32') }}</FieldLabel>
            </Field>
            <Field orientation="horizontal" data-disabled>
              <RadioGroupItem id="server-mode-64" value="64" disabled />
              <FieldLabel for="server-mode-64" class="font-normal">{{ $t('rooms.start.bit64') }}</FieldLabel>
            </Field>
          </RadioGroup>
          <FieldDescription>{{ $t('rooms.start.serverModeDescription') }}</FieldDescription>
        </Field>
        
        <Separator />
        
        <FieldSet class="world-preview">
          <FieldLegend variant="label">{{ $t('rooms.start.preview') }}</FieldLegend>
          <div v-if="selectedWorlds.length" class="world-list" role="list">
            <div v-for="world in selectedWorlds" :key="world.name" class="world-item" role="listitem">
              <CheckCircle2 class="status-icon" />
              <span>{{ world.name }}</span>
              <Badge :variant="getWorldTagType(world.type)">{{ getWorldTypeName(world.type) }}</Badge>
            </div>
          </div>
          <Alert v-else>
            <TriangleAlert />
            <AlertTitle>{{ $t('rooms.start.noWorlds') }}</AlertTitle>
            <AlertDescription>{{ $t('rooms.start.noWorldsDescription') }}</AlertDescription>
          </Alert>
        </FieldSet>
      </FieldGroup>
      
      <div class="form-actions">
        <UiButton variant="outline" @click="$emit('close')">{{ $t('common.actions.cancel') }}</UiButton>
        <UiButton @click="handleConfirm" :disabled="loading || selectedWorlds.length === 0">
          <Spinner v-if="loading" data-icon="inline-start" />
          {{ $t('rooms.start.submit') }}
        </UiButton>
      </div>
    </div>
    
    <Alert v-else variant="destructive">
      <TriangleAlert />
      <AlertTitle>{{ $t('rooms.start.roomUnavailable') }}</AlertTitle>
      <AlertDescription>{{ $t('rooms.start.roomUnavailableDescription') }}</AlertDescription>
    </Alert>
  </div>
</template>

<script>
import { CheckCircle2, TriangleAlert } from '@lucide/vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';

export default {
  name: 'StartRoomForm',
  components: {
    Alert,
    AlertDescription,
    AlertTitle,
    Badge,
    UiButton,
    CheckCircle2,
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
    RadioGroup,
    RadioGroupItem,
    Separator,
    Spinner,
    TriangleAlert
  },
  props: {
    room: {
      type: Object,
      required: true
    },
    startForm: {
      type: Object,
      default: () => ({
        worldType: 'all',
        serverMode: '64'
      })
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      formData: {
        worldType: this.startForm.worldType,
        serverMode: this.startForm.serverMode
      }
    }
  },
  computed: {
    worldTypeOptions() {
      return ['all', 'forest', 'cave', 'unknown'].map(value => ({
        value,
        label: this.$t(`rooms.start.options.${value}`)
      }));
    },
    forestWorlds() {
      if (!this.room || !this.room.worlds) return [];
      return this.room.worlds.filter(world => world.type === 'forest');
    },
    caveWorlds() {
      if (!this.room || !this.room.worlds) return [];
      return this.room.worlds.filter(world => world.type === 'cave');
    },
    unknownWorlds() {
      if (!this.room || !this.room.worlds) return [];
      return this.room.worlds.filter(world => world.type === 'unknown');
    },
    selectedWorlds() {
      if (!this.room || !Array.isArray(this.room.worlds)) return [];
      if (this.formData.worldType === 'all') return this.room.worlds;
      return this.room.worlds.filter(world => world.type === this.formData.worldType);
    }
  },
  watch: {
    startForm: {
      handler(newVal) {
        this.formData = { ...newVal };
      },
      deep: true
    }
  },
  methods: {
    handleConfirm() {
      // 更新父组件的表单数据
      Object.assign(this.startForm, this.formData);
      // 触发确认事件
      this.$emit('confirm');
    },
    getWorldTagType(type) {
      if (type === 'cave') return 'secondary';
      return 'outline';
    },
    getWorldTypeName(type) {
      return this.$t(`rooms.start.types.${['forest', 'cave'].includes(type) ? type : 'unknown'}`);
    }
  }
}
</script>

<style lang="scss" scoped>
.start-room-form {
  .form-container {
    padding: 10px 0;
  }
  
  .world-preview {
    margin-top: 20px;
    
    .world-list {
      display: flex;
      gap: 0;
      flex-direction: column;
      
      .world-item {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 0;
        border-bottom: 1px solid var(--border);

        &:last-child {
          border-bottom: 0;
        }
        
        .status-icon {
          color: var(--primary);
          flex: none;
        }
        
        span {
          flex: 1;
          font-weight: 500;
        }
      }
      
    }
  }

  .option-grid {
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  }
  
  .form-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 20px;
    text-align: right;
    
  }
  
}
</style>
