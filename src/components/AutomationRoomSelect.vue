<template>
  <div class="automation-room-select">
    <Field>
      <FieldLabel>房间</FieldLabel>
      <UiSelect v-model="roomId" :disabled="loading" @update:model-value="handleChange">
        <SelectTrigger class="automation-room-trigger">
          <Spinner v-if="loading" />
          <SelectValue placeholder="请选择房间" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem v-for="room in rooms" :key="room.id" :value="room.id">
              {{ room.name }}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </UiSelect>
    </Field>
    <Alert v-if="loadError" variant="destructive">
      <CircleAlert />
      <AlertTitle>房间列表加载失败</AlertTitle>
      <AlertAction><UiButton size="sm" variant="outline" @click="loadRooms">重试</UiButton></AlertAction>
    </Alert>
  </div>
</template>

<script>
import { CircleAlert } from '@lucide/vue'
import { cronTaskApi } from '@/api/index'
import { Alert, AlertAction, AlertTitle } from '@/components/ui/alert'
import { Button as UiButton } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'vue-sonner'

export default {
  name: 'AutomationRoomSelect',
  components: {
    Alert, AlertAction, AlertTitle, CircleAlert, Field, FieldLabel, SelectContent, SelectGroup,
    SelectItem, SelectTrigger, SelectValue, Spinner, UiButton, UiSelect
  },
  emits: ['ready', 'change'],
  data() {
    return {
      loading: false,
      loadError: '',
      roomId: '',
      rooms: []
    }
  },
  mounted() {
    this.loadRooms()
  },
  methods: {
    async loadRooms() {
      this.loading = true
      this.loadError = ''
      try {
        const scope = await cronTaskApi.getRoomScope()
        this.rooms = scope.rooms
        this.roomId = scope.roomId
        if (this.roomId) this.$emit('ready', this.roomId)
      } catch (error) {
        this.loadError = error.message || '读取房间列表失败'
        toast.error(error.message || '读取房间列表失败')
      } finally {
        this.loading = false
      }
    },
    handleChange(roomId) {
      cronTaskApi.setRoom(roomId)
      this.$emit('change', roomId)
    }
  }
}
</script>

<style scoped>
.automation-room-select {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: min(320px, 100%);
  margin: 0;
}

.automation-room-trigger {
  flex: 1;
}

@media (max-width: 768px) {
  .automation-room-select {
    width: 100%;
  }
}
</style>
