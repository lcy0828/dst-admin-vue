const SUCCESS_ID_PATTERN = /^[a-z][a-z0-9_]*$/
const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/

const ERROR_DEFAULT_MESSAGES = Object.freeze({
  AGENT_REQUIRED: 'Select an Agent first.',
  BACKUP_NOT_FOUND: 'The requested backup was not found.',
  BACKUP_RESTORE_TO_NEW_ROOM_UNAVAILABLE: 'Restoring a backup into a new room is not supported.',
  CAVE_WORLD_CREATE_UNAVAILABLE: 'Creating a standalone caves world is not supported.',
  CONTAINER_NOT_FOUND: 'The requested container was not found.',
  FOREST_WORLD_CREATE_UNAVAILABLE: 'Creating a standalone forest world is not supported.',
  INVALID_AGENT_ACTION: 'This Agent action is not supported.',
  INVALID_AGENT_TIMEOUT: 'The Agent command timeout must be an integer from 5 to 300 seconds.',
  INVALID_ANNOUNCEMENT_EXPIRY: 'The announcement expiry time is invalid.',
  INVALID_PLAYER_ACTION: 'This player action is not supported.',
  INVALID_PLAYER_INPUT: 'The player action input is invalid.',
  ITEM_API_UNAVAILABLE: 'The item catalog and spawn API are not available.',
  JOB_CANCELED: 'The job was canceled.',
  JOB_FAILED: 'The job failed.',
  JOB_ID_MISSING: 'The server did not return a job ID.',
  JOB_TIMEOUT: 'The job did not finish before the timeout.',
  LEGACY_WORLD_SETTINGS_UNAVAILABLE: 'The legacy world settings operation is not supported.',
  LOG_REFRESH_FAILED: 'The log refresh job failed.',
  LOG_REFRESH_TIMEOUT: 'The log refresh job did not finish before the timeout.',
  MOD_CONFIGURATION_REVISION_REQUIRED: 'Reopen the mod configuration to get its current revision.',
  MOD_ID_REQUIRED: 'A mod ID is required.',
  MOD_KEYWORD_REQUIRED: 'Enter a mod search keyword.',
  MOD_MANAGED_ROOM_REQUIRED: 'No managed room is available for mod management.',
  MOD_PUBLICATION_RESULT_MISSING: 'The completed job did not produce a mod publication record.',
  MOD_RAW_DATA_REQUIRED: 'Raw mod data is required.',
  MOD_UNINSTALL_CONFIRMATION_REQUIRED: 'Enter the full room name to confirm uninstalling the mod.',
  REGENERATE_COMMAND_FAILED: 'The regenerate command failed.',
  REGENERATE_COMMAND_TIMEOUT: 'The regenerate command did not finish before the timeout.',
  RESOURCE_NOT_FOUND: 'The requested resource was not found.',
  ROOM_CONFIGURATION_EXPORT_UNAVAILABLE: 'Exporting cluster.ini is not supported.',
  ROOM_CONFIGURATION_IMPORT_UNAVAILABLE: 'Importing cluster.ini is not supported.',
  ROOM_CREATE_ROLLBACK_FAILED: 'The new room could not be rolled back after configuration failed.',
  ROOM_NOT_FOUND: 'The requested room was not found.',
  ROOM_NOT_MANAGED: 'The requested room is not managed.',
  ROOM_REQUIRED: 'Select a room first.',
  ROOM_UPDATE_UNAVAILABLE: 'Updating room metadata is not supported.',
  SERVER_INI_READ_UNAVAILABLE: 'Reading server.ini is not supported.',
  SERVER_INI_WRITE_UNAVAILABLE: 'Saving server.ini is not supported.',
  SYSTEM_BACKUP_CREATE_UNAVAILABLE: 'System-level backup creation is not supported.',
  SYSTEM_BACKUP_DELETE_UNAVAILABLE: 'System-level backup deletion is not supported.',
  SYSTEM_BACKUP_LIST_UNAVAILABLE: 'System-level backup listing is not supported.',
  SYSTEM_BACKUP_RESTORE_UNAVAILABLE: 'System-level backup restore is not supported.',
  SYSTEM_CONFIGURATION_UPDATE_UNAVAILABLE: 'The legacy system configuration operation is not supported.',
  WORLD_CREATE_ROLLBACK_FAILED: 'The new world could not be rolled back after configuration failed.',
  WORLD_DELETE_UNAVAILABLE: 'The legacy world deletion operation is not supported.',
  WORLD_NOT_FOUND: 'The requested world was not found.',
  WORLD_REQUIRED: 'Select a world first.',
  WORLD_RESTART_TARGET_NOT_FOUND: 'No matching world was found to restart.',
  WORLD_STATE_NOT_FOUND: 'No runtime state snapshot is available for the requested world.',
  WORLD_STOP_TARGET_NOT_FOUND: 'No matching world was found to stop.'
})

function assertProtocolValue(value, pattern, kind) {
  if (!pattern.test(value)) {
    throw new TypeError(`${kind} must be a stable protocol identifier`)
  }
}

export function adapterSuccess(data, msg = 'operation_succeeded', options = {}) {
  assertProtocolValue(msg, SUCCESS_ID_PATTERN, 'Success message')
  const response = { status: 200, data, msg }
  if (options.numericCode) response.code = 200
  if (options.messageAlias) response.message = msg
  if (options.successFlag) response.success = true
  return response
}

export class AdapterProtocolError extends Error {
  constructor(code, options = {}) {
    assertProtocolValue(code, ERROR_CODE_PATTERN, 'Error code')
    const detail = String(options.detail || '').trim()
    const summary = options.message || ERROR_DEFAULT_MESSAGES[code] || 'The adapter request failed.'
    const message = detail && !summary.includes(detail)
      ? `${summary.replace(/[.:]$/, '')}: ${detail}`
      : summary
    super(message)
    this.name = 'AdapterProtocolError'
    this.code = code
    this.detail = detail
    this.context = options.context || {}
  }
}

export function adapterError(code, options = {}) {
  return new AdapterProtocolError(code, options)
}
