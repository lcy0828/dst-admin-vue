<template>
  <div class="automation-room-select">
    <span class="automation-room-label">房间</span>
    <el-select
      v-model="roomId"
      size="small"
      filterable
      :loading="loading"
      placeholder="请选择房间"
      @change="handleChange"
    >
      <el-option
        v-for="room in rooms"
        :key="room.id"
        :label="room.name"
        :value="room.id"
      />
    </el-select>
  </div>
</template>

<script>
import { cronTaskApi } from '@/api/index'

export default {
  name: 'AutomationRoomSelect',
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
        this.$message.error(error.message || '读取房间列表失败')
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
  float: right;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 250px;
  margin-right: 12px;
}

.automation-room-label {
  flex: 0 0 auto;
  color: #536159;
  font-size: 13px;
}

.automation-room-select :deep(.el-select) {
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
