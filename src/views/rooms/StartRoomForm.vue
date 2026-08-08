<template>
  <div class="start-room-form">
    <div v-if="room" class="form-container">
      <h3>启动房间: {{ room.name }}</h3>
      
      <FieldGroup>
        <Field>
          <FieldLabel>启动模式</FieldLabel>
          <RadioGroup v-model="formData.worldType" class="option-grid">
            <Field v-for="option in worldTypeOptions" :key="option.value" orientation="horizontal">
              <RadioGroupItem :id="`world-type-${option.value}`" :value="option.value" />
              <FieldLabel :for="`world-type-${option.value}`" class="font-normal">{{ option.label }}</FieldLabel>
            </Field>
          </RadioGroup>
        </Field>
        
        <Field data-disabled>
          <FieldLabel>服务器模式</FieldLabel>
          <RadioGroup v-model="formData.serverMode" class="option-grid" disabled>
            <Field orientation="horizontal" data-disabled>
              <RadioGroupItem id="server-mode-32" value="32" disabled />
              <FieldLabel for="server-mode-32" class="font-normal">32位</FieldLabel>
            </Field>
            <Field orientation="horizontal" data-disabled>
              <RadioGroupItem id="server-mode-64" value="64" disabled />
              <FieldLabel for="server-mode-64" class="font-normal">64位</FieldLabel>
            </Field>
          </RadioGroup>
          <FieldDescription>v2 使用系统设置中的服务端位数</FieldDescription>
        </Field>
        
        <Separator />
        
        <!-- 世界列表预览 -->
        <div class="world-preview" v-if="room.worlds && room.worlds.length > 0">
          <h4>将启动以下世界:</h4>
          <div class="world-list">
            <template v-if="formData.worldType === 'all'">
              <div v-for="world in room.worlds" :key="world.name" class="world-item">
                <CheckCircle2 class="status-icon" />
                <span>{{ world.name }}</span>
                <Badge :variant="getWorldTagType(world.type)">
                  {{ getWorldTypeName(world.type) }}
                </Badge>
              </div>
            </template>
            
            <template v-else-if="formData.worldType === 'forest'">
              <div v-for="world in forestWorlds" :key="world.name" class="world-item">
                <CheckCircle2 class="status-icon" />
                <span>{{ world.name }}</span>
                <Badge variant="outline">森林</Badge>
              </div>
              <div v-if="forestWorlds.length === 0" class="no-worlds">
                <TriangleAlert class="status-icon" />
                <span>未找到森林世界</span>
              </div>
            </template>
            
            <template v-else-if="formData.worldType === 'cave'">
              <div v-for="world in caveWorlds" :key="world.name" class="world-item">
                <CheckCircle2 class="status-icon" />
                <span>{{ world.name }}</span>
                <Badge variant="secondary">洞穴</Badge>
              </div>
              <div v-if="caveWorlds.length === 0" class="no-worlds">
                <TriangleAlert class="status-icon" />
                <span>未找到洞穴世界</span>
              </div>
            </template>
            
            <template v-else-if="formData.worldType === 'unknown'">
              <div v-for="world in unknownWorlds" :key="world.name" class="world-item">
                <CheckCircle2 class="status-icon" />
                <span>{{ world.name }}</span>
                <Badge variant="outline">其他</Badge>
              </div>
              <div v-if="unknownWorlds.length === 0" class="no-worlds">
                <TriangleAlert class="status-icon" />
                <span>未找到其他类型世界</span>
              </div>
            </template>
          </div>
        </div>
      </FieldGroup>
      
      <div class="form-actions">
        <UiButton variant="outline" @click="$emit('close')">取消</UiButton>
        <UiButton @click="handleConfirm" :disabled="loading">
          <Spinner v-if="loading" data-icon="inline-start" />
          启动
        </UiButton>
      </div>
    </div>
    
    <div v-else class="error-message">
      <TriangleAlert class="error-icon" />
      <p>无法加载房间信息</p>
    </div>
  </div>
</template>

<script>
import { CheckCircle2, TriangleAlert } from '@lucide/vue';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';

export default {
  name: 'StartRoomForm',
  components: {
    Badge,
    UiButton,
    CheckCircle2,
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
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
    }
  },
  data() {
    return {
      formData: {
        worldType: this.startForm.worldType,
        serverMode: this.startForm.serverMode
      },
      worldTypeOptions: [
        { value: 'all', label: '所有世界' },
        { value: 'forest', label: '仅森林世界' },
        { value: 'cave', label: '仅洞穴世界' },
        { value: 'unknown', label: '仅其他世界' }
      ],
      loading: false
    }
  },
  computed: {
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
      if (type === 'forest') return '森林';
      if (type === 'cave') return '洞穴';
      return '其他世界';
    }
  }
}
</script>

<style lang="scss" scoped>
.start-room-form {
  .form-container {
    padding: 10px 0;
    
    h3 {
      margin-top: 0;
      margin-bottom: 20px;
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
      text-align: left;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border-color);
      
      &:after {
        display: none;
      }
    }
  }
  
  .world-preview {
    margin-top: 20px;
    
    h4 {
      font-size: 16px;
      margin-bottom: 12px;
      color: var(--text-regular);
    }
    
    .world-list {
      display: flex;
      gap: 8px;
      padding: 12px;
      background-color: var(--surface-muted);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      box-shadow: none;
      flex-direction: column;
      
      .world-item {
        margin: 0;
        display: flex;
        align-items: center;
        background-color: var(--surface-color);
        padding: 8px 12px;
        border: 1px solid var(--border-color);
        border-radius: 3px;
        box-shadow: none;
        
        .status-icon {
          color: var(--primary);
          flex: none;
        }
        
        span {
          flex: 1;
          font-weight: 500;
        }
      }
      
      .no-worlds {
        display: flex;
        align-items: center;
        color: var(--muted-foreground);
        background-color: var(--muted);
        padding: 10px 15px;
        border-radius: 6px;
        
        .status-icon {
          flex: none;
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
  
  .error-message {
    text-align: center;
    padding: 30px 0;
    color: var(--destructive);
    
    .error-icon {
      width: 36px;
      height: 36px;
      margin-bottom: 10px;
    }
    
    p {
      margin: 0;
    }
  }
}
</style>
