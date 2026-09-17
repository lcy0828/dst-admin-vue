import { gameNotificationsV2API } from '@/api/v2'
import { confirmMaintenance } from '@/lib/feedback'

export function confirmRoomMaintenance(roomId, message, title, options = {}) {
  return confirmMaintenance(message, title, {
    ...options,
    loadPreview: signal => gameNotificationsV2API.maintenancePreview(roomId, signal),
  })
}
