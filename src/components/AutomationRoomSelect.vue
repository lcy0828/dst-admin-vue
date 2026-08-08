<template>
  <div class="automation-room-select">
    <span class="automation-room-label">房间</span>
    <UiSelect
      v-model="roomId"
      :disabled="loading"
      @update:model-value="handleChange"
    >
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
  </div>
</template>

<script>
import { cronTaskApi } from '@/api/index'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'vue-sonner'

export default {
  name: 'AutomationRoomSelect',
  components: { UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, Spinner },
  emits: ['ready', 'change'],
  data() {
    return {
      loading: false,
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
      try {
        const scope = await cronTaskApi.getRoomScope()
        this.rooms = scope.rooms
        this.roomId = scope.roomId
        if (this.roomId) this.$emit('ready', this.roomId)
      } catch (error) {
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
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 250px;
  margin: 0;
}

.automation-room-label {
  flex: 0 0 auto;
  color: var(--text-regular);
  font-size: 13px;
}

.automation-room-trigger {
  flex: 1;
}

@media (max-width: 768px) {
  .automation-room-select {
    float: none;
    width: 100%;
    margin: 10px 0 0;
  }
}
</style>
