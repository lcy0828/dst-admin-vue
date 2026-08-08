<template>
  <div class="room-settings-page">
    <div class="page-header">
      <h2>房间设置</h2>
      <p>配置游戏房间的基本信息和风格设置</p>
    </div>

    <Card>
      <CardHeader class="card-header">
        <div>
          <CardTitle>基本信息设置</CardTitle>
          <CardDescription>设置房间展示信息，并在保存前检查预览效果。</CardDescription>
        </div>
        <UiButton size="sm" @click="saveSettings">
          <Save data-icon="inline-start" />
          保存设置
        </UiButton>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field :data-invalid="Boolean(errors.name)">
            <FieldLabel for="room-name">房间名称</FieldLabel>
            <UiInput
              id="room-name"
              v-model="roomForm.name"
              :aria-invalid="Boolean(errors.name)"
              placeholder="请输入房间名称"
              maxlength="30"
            />
            <FieldError v-if="errors.name">{{ errors.name }}</FieldError>
          </Field>

          <Field :data-invalid="Boolean(errors.description)">
            <FieldLabel for="room-description">房间描述</FieldLabel>
            <UiTextarea
              id="room-description"
              v-model="roomForm.description"
              :aria-invalid="Boolean(errors.description)"
              placeholder="请输入房间描述"
              rows="4"
              maxlength="200"
            />
            <FieldError v-if="errors.description">{{ errors.description }}</FieldError>
          </Field>

          <Field>
            <FieldLabel>房间风格</FieldLabel>
            <UiSelect v-model="roomForm.style">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="请选择房间风格" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem v-for="item in roomStyles" :key="item.value" :value="item.value">
                    {{ item.label }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </UiSelect>
          </Field>

          <Field>
            <FieldLabel>预览</FieldLabel>
            <div class="room-preview" :class="'room-style-' + roomForm.style">
              <div class="preview-header">{{ roomForm.name || '房间名称' }}</div>
              <div class="preview-content">{{ roomForm.description || '房间描述内容' }}</div>
            </div>
          </Field>

          <Field>
            <FieldLabel>高级设置</FieldLabel>
            <Accordion type="single" collapsible class="advanced-settings">
              <AccordionItem value="custom-style">
                <AccordionTrigger>自定义样式设置</AccordionTrigger>
                <AccordionContent>
                  <FieldGroup>
                    <Field orientation="horizontal">
                      <FieldLabel for="text-color">文字颜色</FieldLabel>
                      <input id="text-color" v-model="customStyle.textColor" class="color-input" type="color">
                    </Field>
                    <Field orientation="horizontal">
                      <FieldLabel for="background-color">背景颜色</FieldLabel>
                      <input id="background-color" v-model="customStyle.backgroundColor" class="color-input" type="color">
                    </Field>
                    <Field>
                      <FieldLabel>边框样式</FieldLabel>
                      <UiSelect v-model="customStyle.borderStyle">
                        <SelectTrigger class="w-full"><SelectValue placeholder="请选择边框样式" /></SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="none">无边框</SelectItem>
                            <SelectItem value="solid">实线边框</SelectItem>
                            <SelectItem value="dashed">虚线边框</SelectItem>
                            <SelectItem value="dotted">点线边框</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </UiSelect>
                    </Field>
                  </FieldGroup>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  </div>
</template>

<script>
import { Save } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea as UiTextarea } from '@/components/ui/textarea';

export default {
  name: 'RoomSettings',
  components: {
    Accordion, AccordionContent, AccordionItem, AccordionTrigger, UiButton, Card, CardContent,
    CardDescription, CardHeader, CardTitle, Field, FieldError, FieldGroup, FieldLabel, UiInput,
    Save, UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, UiTextarea
  },
  data() {
    return {
      roomForm: {
        name: '饥荒联机版游戏房间',
        description: '欢迎加入我们的饥荒联机版游戏房间，在这里一起探索、生存、冒险！',
        style: 'default'
      },
      customStyle: {
        textColor: '#333333',
        backgroundColor: '#f9f9f9',
        borderStyle: 'solid'
      },
      roomStyles: [
        { value: 'default', label: '默认风格' },
        { value: 'dark', label: '暗黑风格' },
        { value: 'forest', label: '森林风格' },
        { value: 'desert', label: '沙漠风格' },
        { value: 'winter', label: '冬季风格' },
        { value: 'cave', label: '洞穴风格' }
      ],
      errors: {}
    };
  },
  methods: {
    saveSettings() {
      const errors = {};
      const name = this.roomForm.name.trim();
      if (!name) errors.name = '请输入房间名称';
      else if (name.length < 3 || name.length > 30) errors.name = '长度应为 3 到 30 个字符';
      if (this.roomForm.description.length > 200) errors.description = '描述不能超过 200 个字符';
      this.errors = errors;
      if (Object.keys(errors).length > 0) {
        toast.error('表单验证失败，请检查输入');
        return;
      }
      toast.success('房间设置已保存');
    }
  }
};
</script>

<style scoped>
.room-settings-page {
  width: 100%;
  min-width: 0;
}

.page-header {
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}

.page-header p {
  color: var(--muted-foreground);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-direction: row;
  gap: 12px;
}

.room-preview {
  min-height: 150px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background-color: var(--muted);
}

.preview-header {
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid currentColor;
  font-size: 18px;
  font-weight: 600;
}

.preview-content {
  font-size: 14px;
}

.advanced-settings {
  width: 100%;
}

.color-input {
  width: 44px;
  height: 32px;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--background);
  cursor: pointer;
}

.room-style-dark {
  background-color: #333333;
  color: #ffffff;
}

.room-style-forest {
  background-color: #e8f5e9;
  color: #1b5e20;
}

.room-style-desert {
  background-color: #fff8e1;
  color: #ff8f00;
}

.room-style-winter {
  background-color: #edf6ee;
  color: #326343;
}

.room-style-cave {
  background-color: #3e3e3e;
  color: #e0e0e0;
}

@media (max-width: 640px) {
  .card-header {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
