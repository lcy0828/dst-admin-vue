<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div class="min-w-0"><h1 class="text-2xl font-semibold tracking-normal">{{ cg(isEdit ? 'cronGroups.form.editTitle' : 'cronGroups.form.addTitle') }}</h1><p class="mt-1 text-sm text-muted-foreground">{{ cg('cronGroups.form.subtitle') }}</p></div>
      <div class="flex flex-wrap items-center gap-2"><automation-room-select @ready="handleAutomationRoom" @change="handleAutomationRoom" /><UiButton variant="outline" size="sm" @click="$router.push('/cron/groups')"><ArrowLeft data-icon="inline-start" />{{ cg('cronGroups.actions.backToList') }}</UiButton></div>
    </header>
    <Card>
      <CardHeader><CardTitle>{{ cg('cronGroups.form.cardTitle') }}</CardTitle><CardDescription>{{ cg('cronGroups.form.cardDescription') }}</CardDescription></CardHeader>
      <CardContent>
        <form @submit.prevent="submitForm">
          <FieldGroup>
            <Field :data-invalid="Boolean(formErrors.name)">
              <FieldLabel for="group-name">{{ cg('cronGroups.form.name') }}</FieldLabel>
              <UiInput id="group-name" v-model="groupForm.name" :aria-invalid="Boolean(formErrors.name)" :placeholder="cg('cronGroups.form.namePlaceholder')" />
              <FieldError v-if="formErrors.name">{{ validationMessage('name') }}</FieldError>
            </Field>

            <Field :data-invalid="Boolean(formErrors.description)">
              <FieldLabel for="group-description">{{ cg('cronGroups.form.description') }}</FieldLabel>
              <UiTextarea id="group-description" v-model="groupForm.description" :aria-invalid="Boolean(formErrors.description)" rows="3" :placeholder="cg('cronGroups.form.descriptionPlaceholder')" />
              <FieldError v-if="formErrors.description">{{ validationMessage('description') }}</FieldError>
            </Field>

            <FieldSet>
              <FieldLegend variant="label">{{ cg('cronGroups.form.type') }}</FieldLegend>
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
                <FieldLabel for="group-status">{{ cg('cronGroups.form.enabled') }}</FieldLabel>
                <FieldDescription>{{ cg('cronGroups.form.enabledDescription') }}</FieldDescription>
              </FieldContent>
              <UiSwitch id="group-status" :model-value="groupForm.status === 1" @update:model-value="groupForm.status = $event ? 1 : 0" />
            </Field>

            <div class="flex flex-wrap justify-end gap-2">
              <UiButton type="button" variant="outline" @click="cancel">{{ cg('cronGroups.actions.cancel') }}</UiButton>
              <UiButton type="submit" :disabled="submitting">
                <Spinner v-if="submitting" data-icon="inline-start" />
                {{ cg('cronGroups.actions.save') }}
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
import {
  CRON_GROUP_TYPE_IDS,
  cronGroupText,
  cronGroupTypeDescription,
  cronGroupTypeLabel,
  formatCronGroupError
} from '@/i18n/cronGroupMessages';

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
      formErrors: {}
    };
  },
  computed: {
    typeOptions() {
      return CRON_GROUP_TYPE_IDS.map(value => ({
        value,
        label: cronGroupTypeLabel(value, this.cg),
        description: cronGroupTypeDescription(value, this.cg)
      }));
    }
  },
  created() {
    const { id } = this.$route.params;
    if (id) {
      this.isEdit = true;
      this.groupId = id;
    }
  },
  methods: {
    cg(key, parameters = {}) {
      return cronGroupText(this.$i18n.locale, key, parameters);
    },
    validationMessage(field) {
      const key = this.formErrors[field];
      return key ? this.cg(key) : '';
    },
    handleAutomationRoom() {
      if (this.isEdit && this.groupId) this.getGroupDetail(this.groupId);
    },
    getGroupDetail(id) {
      cronTaskApi.getGroupDetail(id)
        .then(response => {
          if (response.data && (response.data.status === 200 || response.data.code === 200)) {
            const group = response.data.data;
            if (group) {
              this.groupForm = {
                name: group.name,
                description: group.description || '',
                type: group.type,
                status: group.status
              };
            }
          } else {
            toast.error(formatCronGroupError(this.cg, 'cronGroups.errors.detail', response));
          }
        })
        .catch(error => {
          console.error('Could not load task group details:', error);
          toast.error(formatCronGroupError(this.cg, 'cronGroups.errors.detail', error));
        });
    },
    validateForm() {
      const errors = {};
      const name = this.groupForm.name.trim();
      const description = (this.groupForm.description || '').trim();
      if (!name) errors.name = 'cronGroups.form.validation.nameRequired';
      else if (name.length < 2 || name.length > 50) errors.name = 'cronGroups.form.validation.nameLength';
      if (description.length > 200) errors.description = 'cronGroups.form.validation.descriptionLength';
      this.formErrors = errors;
      return Object.keys(errors).length === 0;
    },
    submitForm() {
      if (!this.validateForm()) {
        toast.warning(this.cg('cronGroups.feedback.completeForm'));
        return;
      }
      this.submitting = true;

      const apiMethod = this.isEdit
        ? cronTaskApi.updateGroup(this.groupId, this.groupForm)
        : cronTaskApi.addGroup(this.groupForm);

      apiMethod
        .then(response => {
          if (response.data && (response.data.status === 200 || response.data.code === 200)) {
            toast.success(this.cg(this.isEdit ? 'cronGroups.feedback.groupUpdated' : 'cronGroups.feedback.groupAdded'));
            this.$router.push('/cron/groups');
          } else {
            toast.error(formatCronGroupError(
              this.cg,
              this.isEdit ? 'cronGroups.errors.updateGroup' : 'cronGroups.errors.addGroup',
              response
            ));
          }
        })
        .catch(error => {
          console.error(this.isEdit ? 'Could not update the task group:' : 'Could not add the task group:', error);
          toast.error(formatCronGroupError(
            this.cg,
            this.isEdit ? 'cronGroups.errors.updateGroup' : 'cronGroups.errors.addGroup',
            error
          ));
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
