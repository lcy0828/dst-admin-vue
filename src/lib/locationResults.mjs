export function previewRemaining(preview, receivedAt, now = Date.now()) {
  const expires = Date.parse(preview?.expiresAt),
    server = Date.parse(preview?.serverTime);
  if (!Number.isFinite(expires) || !Number.isFinite(server)) return 0;
  return Math.max(
    0,
    Math.min(60_000, expires - server) - Math.max(0, now - receivedAt),
  );
}
export function isMovementCommand(id) {
  return ['teleport_player', 'relocate_players', 'teleport_to_nearest_entity'].includes(id)
}
export function movementPreview(run, started, now = Date.now()) {
  const m = run?.movement
  if (!isMovementCommand(run?.commandId) || run.status !== 'succeeded' || run.executionOutcome !== 'confirmed' || m?.state !== 'preview' || !/^[a-f0-9-]{36}$/.test(m.previewId)) return null
  const remaining = Math.min(60, Number(m.expiresAt) - Number(m.observedAt)) * 1000 - Math.max(0, now - started)
  if (!Number.isFinite(remaining) || remaining <= 0) return null
  return { id: m.previewId, until: now + remaining }
}
export const teleportReasons = {
  PLAYER_OFFLINE: "玩家已离线，请等玩家进入游戏后再试。",
  PLAYER_MOVING_WORLD: "玩家正在切换世界，请稍后重新检查。",
  PLAYER_GHOST: "玩家目前是幽灵，请先复活。",
  PLAYER_RIDING: "请让玩家先下坐骑，再重新检查。",
  PLAYER_ON_BOAT: "请让玩家先离开船只，再重新检查。",
  PLAYER_TRANSFORMED: "请让玩家恢复普通形态后再试。",
  NO_LANDING_POINT: "附近没有可落脚的位置，请换一个地点。",
  LANDING_CHANGED: "目的地已出现障碍，请重新检查。",
  LOCATION_CHANGED: "地点已修改或删除，请重新选择。",
  TARGET_MOVED: "目标玩家已离开原位置，请重新检查。",
  WORLD_CHANGED: "世界状态已变化，请重新检查。",
  WORLD_MAINTENANCE: "世界正在备份或维护，请结束后重新检查。",
  TELEPORT_CPU_LIMIT: "本次检查耗时较长，尚未传送，请稍后重试。",
  TELEPORT_SCAN_LIMIT: "目的地附近对象较多，请选择更开阔的位置。",
  PREVIEW_EXPIRED: "确认已过期，请重新检查。",
  RESULT_UNCONFIRMED: "尚未确认是否传送，请查看原结果，不要重复操作。",
  PRECHECK_UNAVAILABLE: "暂时无法检查目的地，请确认世界正在运行。",
  TELEPORT_BUSY: "玩家还有待处理传送，请稍后再试。",
  WORKBENCH_UPDATE_REQUIRED: "请先更新运行节点。",
  DISPATCH_REJECTED: "本次请求未被执行，请检查世界是否正在维护。",
};

// Only opaque result references are retained in this browser tab. Actual
// results and authorization always come from the server, never this cache.
export function previewReference(storage, room, world, id) {
  const key = "dst:teleport-results:v1",
    scope = JSON.stringify([room, world]);
  try {
    const entries = JSON.parse(storage.getItem(key) || "[]");
    const safe = Array.isArray(entries)
      ? entries.filter(
          (v) =>
            Array.isArray(v) &&
            typeof v[0] === "string" &&
            /^[a-f0-9-]{36}$/.test(v[1]),
        )
      : [];
    if (id === undefined) return safe.find((v) => v[0] === scope)?.[1] || "";
    const next = safe.filter((v) => v[0] !== scope);
    if (id && /^[a-f0-9-]{36}$/.test(id)) next.push([scope, id]);
    storage.setItem(key, JSON.stringify(next.slice(-32)));
  } catch {
    /* Storage can be unavailable in private browser sessions. */
  }
  return "";
}
export function teleportMessage(result, english = false) {
  const labels = english
    ? {
        prepared: "Ready for your confirmation",
        confirmed: "Teleported; position confirmed",
        rejected: "Not executed",
        uncertain:
          "Result not yet confirmed. Read the original result before trying again.",
        cancelled: "Cancelled before dispatch",
        expired: "Confirmation expired",
        dispatching: "Waiting for the original result",
      }
    : {
        prepared: "目的地已检查，请确认传送",
        confirmed: "已传送，位置已确认",
        rejected: "未执行",
        uncertain: "尚未确认是否传送，请查看原结果，不要重复操作",
        cancelled: "已取消，尚未执行",
        expired: "确认已过期，请重新检查",
        dispatching: "正在等待传送结果",
      };
  return (
    labels[result?.state] ||
    (english ? "Checking destination" : "正在检查目的地")
  );
}
