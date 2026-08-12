export function composeRoomResults(rooms, settlements) {
  if (!Array.isArray(rooms) || !Array.isArray(settlements) || rooms.length !== settlements.length) {
    throw new TypeError('Room settlement inputs must have matching lengths')
  }

  const completed = []
  const failures = []
  settlements.forEach((settlement, index) => {
    const room = rooms[index]
    if (settlement.status === 'fulfilled') {
      completed.push({ room, value: settlement.value })
      return
    }
    failures.push({
      room_id: room.id,
      room_name: room.name,
      error: settlement.reason
    })
  })
  return { completed, failures }
}

export function throwWhenAllRoomsFailed(roomCount, failures) {
  if (roomCount > 0 && failures.length === roomCount) {
    throw failures[0].error
  }
}
