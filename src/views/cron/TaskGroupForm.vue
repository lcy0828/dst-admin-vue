<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div class="min-w-0"><h1 class="text-2xl font-semibold tracking-normal">{{ isEdit ? '编辑任务组' : '添加任务组' }}</h1><p class="mt-1 text-sm text-muted-foreground">组织并统一控制一组关联的自动化任务。</p></div>
      <div class="flex flex-wrap items-center gap-2"><automation-room-select @ready="handleAutomationRoom" @change="handleAutomationRoom" /><UiButton variant="outline" size="sm" @click="$router.push('/cron/groups')"><ArrowLeft data-icon="inline-start" />返回列表</UiButton></div>
    </header>
    <Card>
      <CardHeader><CardTitle>任务组配置</CardTitle><CardDescription>设置名称、用途与启用状态。</CardDescription></CardHeader>
      <CardContent>
        <form @submit.prevent="submitForm">
          <FieldGroup>
            <Field :data-invalid="Boolean(formErrors.name)">
              <FieldLabel for="group-name">组名称</FieldLabel>
              <UiInput id="group-name" v-model="groupForm.name" :aria-invalid="Boolean(formErrors.name)" placeholder="请输入任务组名称" />
              <FieldError v-if="formErrors.name">{{ formErrors.name }}</FieldError>
            </Field>

            <Field :data-invalid="Boolean(formErrors.description)">
              <FieldLabel for="group-description">组描述</FieldLabel>
              <UiTextarea id="group-description" v-model="groupForm.description" :aria-invalid="Boolean(formErrors.description)" rows="3" placeholder="请输入任务组描述" />
              <FieldError v-if="formErrors.description">{{ formErrors.description }}</FieldError>
            </Field>

            <FieldSet>
              <FieldLegend variant="label">组类型</FieldLegend>
              <RadioGroup v-model="groupForm.type" class="grid gap-3 sm:grid-cols-3">
                <Field v-for="option in typeOptions" :key="option.value" orientation="horizontal">
                  <RadioGroupItem :id="`group-type-${option.value}`" :value="option.value" />
                  <FieldContent>
                    <FieldLabel :for="`group-type-${option.value}`">{{ option.label }}</FieldLabel>
                    <FieldDescription>{{ option.description }}</FieldDescription>
                  </FieldContent>
                </Field>
              </RadioGroup>
            </FieldSet>

            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel for="group-status">启用任务组</FieldLabel>
                <FieldDescription>禁用任务组会同时禁用组内所有任务。</FieldDescription>
              </FieldContent>
              <UiSwitch id="group-status" :model-value="groupForm.status === 1" @update:model-value="groupForm.status = $event ? 1 : 0" />
            </Field>

            <div class="flex flex-wrap justify-end gap-2">
              <UiButton type="button" variant="outline" @click="cancel">取消</UiButton>
              <UiButton type="submit" :disabled="submitting">
                <Spinner v-if="submitting" data-icon="inline-start" />
                保存
              </UiButton>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  </div>
</template>

<script>
import { ArrowLeft } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { cronTaskApi } from '@/api/index';
import AutomationRoomSelect from '@/components/AutomationRoomSelect.vue';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Spinner } from '@/components/ui/spinner';
import { Switch as UiSwitch } from '@/components/ui/switch';
import { Textarea as UiTextarea } from '@/components/ui/textarea';

export default {
  name: 'TaskGroupForm',
  components: {
    ArrowLeft, AutomationRoomSelect, Card, CardContent, CardDescription, CardHeader,
    CardTitle, Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel,
    FieldLegend, FieldSet, RadioGroup, RadioGroupItem, Spinner, UiButton, UiInput, UiSwitch, UiTextarea
  },
  data() {
    return {
      isEdit: false,
      groupId: null,
      submitting: false,
      groupForm: {
        name: '',
        description: '',
        type: 'custom',
        status: 1
      },
      formErrors: {},
      typeOptions: [
        { value: 'system', label: '系统', description: '系统维护相关任务' },
        { value: 'world', label: '世界', description: '游戏世界相关任务' },
        { value: 'custom', label: '自定义', description: '用户自定义任务' }
      ]
    };
  },
  created() {
    // 判断是否是编辑模式
    const { id } = this.$route.params;
    if (id) {
      this.isEdit = true;
      this.groupId = id;
    }
  },
  methods: {
    handleAutomationRoom() {
      if (this.isEdit && this.groupId) this.getGroupDetail(this.groupId);
    },
    getGroupDetail(id) {
      cronTaskApi.getGroupDetail(id)
        .then(response => {
          if (response.data && response.data.status === 200) {
            const group = response.data.data;
            if (group) {
              this.groupForm = {
                name: group.name,
                description: group.description,
                type: group.type,
                status: group.status
              };
            }
          } else {
            toast.error(response.data.message || '获取任务组详情失败');
          }
        })
        .catch(error => {
          console.error('获取任务组详情失败:', error);
          toast.error('获取任务组详情失败');
        });
    },
    validateForm() {
      const errors = {};
      const name = this.groupForm.name.trim();
      const description = (this.groupForm.description || '').trim();
      if (!name) errors.name = '请输入任务组名称';
      else if (name.length < 2 || name.length > 50) errors.name = '长度应在 2 到 50 个字符之间';
      if (description.length > 200) errors.description = '描述不能超过 200 个字符';
      this.formErrors = errors;
      return Object.keys(errors).length === 0;
    },
    submitForm() {
      if (!this.validateForm()) {
        toast.warning('请完善表单信息');
        return;
      }
      this.submitting = true;
          
          const apiMethod = this.isEdit
            ? cronTaskApi.updateGroup(this.groupId, this.groupForm)
            : cronTaskApi.addGroup(this.groupForm);
          
          apiMethod
            .then(response => {
              if (response.data && response.data.status === 200) {
                toast.success(this.isEdit ? '更新成功' : '添加成功');
                this.$router.push('/cron/groups');
              } else {
                toast.error(response.data.message || (this.isEdit ? '更新失败' : '添加失败'));
              }
            })
            .catch(error => {
              console.error(this.isEdit ? '更新任务组失败:' : '添加任务组失败:', error);
              toast.error(error.message || (this.isEdit ? '更新任务组失败' : '添加任务组失败'));
            })
            .finally(() => {
              this.submitting = false;
            });
    },
    cancel() {
      this.$router.push('/cron/groups');
    }
  }
};
</script>

<style scoped>
</style>
