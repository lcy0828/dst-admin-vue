// Unknown character state can occur on older runtimes; known transitional
// states must not expose actions that require a living character.
export function playerCanUseCharacterActions(player) {
  return ['online', '在线'].includes(player?.status) && !player?.presence_conflict &&
    !['ghost', 'dead', 'loading', 'selecting_character', 'migrating'].includes(player?.gameplay_state)
}

export function playerQuickCommands(action, playerId, input = {}) {
  const command = (commandId, args = {}) => ({ commandId, arguments: { player_id: playerId, ...args } })
  switch (action) {
    case 'recover':
      return ['health', 'hunger', 'sanity'].map(stat => command('set_player_stat', { stat, value: 100 }))
    case 'clean': return [command('clear_player_debuffs')]
    case 'penalty': return [command('set_health_penalty', { mode: 'clear' })]
    case 'speed': {
      const multiplier = Number(input.multiplier)
      if (!Number.isFinite(multiplier) || multiplier < 0.5 || multiplier > 3) return []
      return [command('set_player_speed', { multiplier })]
    }
    default: return []
  }
}
