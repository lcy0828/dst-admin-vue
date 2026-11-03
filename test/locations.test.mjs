import test from "node:test";
import assert from "node:assert/strict";
import {
  previewRemaining,
  previewReference,
  movementPreview,
  teleportMessage,
} from "../src/lib/locationResults.mjs";
import { mapClickWorldPoint } from "../src/lib/worldMaps.mjs";
const manifest = {
  protocolVersion: "1",
  map: {
    imageWidth: 400,
    imageHeight: 200,
    pixelsPerTile: 8,
    worldUnitsPerTile: 4,
    worldBounds: { minX: -100, maxZ: 50 },
    coordinateTransform: {
      pixelX: "(x - minX) / worldUnitsPerTile * pixelsPerTile",
      pixelY: "(maxZ - z) / worldUnitsPerTile * pixelsPerTile",
    },
  },
};
test("renderer pixel coordinates map consistently to game axes after view unrotation", () => {
  assert.deepEqual(mapClickWorldPoint(manifest, [0, 0]), { x: -100, z: -50 });
  assert.deepEqual(mapClickWorldPoint(manifest, [200, 100]), { x: 0, z: 0 });
  assert.deepEqual(mapClickWorldPoint(manifest, [400, 200]), { x: 100, z: 50 });
  assert.equal(mapClickWorldPoint(manifest, [401, 0]), null);
  assert.equal(
    mapClickWorldPoint({ ...manifest, protocolVersion: "other" }, [10, 10]),
    null,
  );
  assert.equal(
    mapClickWorldPoint(
      {
        ...manifest,
        map: {
          ...manifest.map,
          coordinateTransform: { pixelX: "alert(1)", pixelY: "" },
        },
      },
      [10, 10],
    ),
    null,
  );
});
test("confirmation countdown uses server remaining lifetime and never extends it", () => {
  const p = {
    serverTime: "2026-01-01T00:00:00Z",
    expiresAt: "2026-01-01T00:01:00Z",
  };
  assert.equal(previewRemaining(p, 1000, 31000), 30000);
  assert.equal(previewRemaining(p, 1000, 62000), 0);
  assert.equal(previewRemaining({}, 1000, 1000), 0);
  assert.equal(
    previewRemaining({ ...p, expiresAt: "2026-01-01T00:02:00Z" }, 1000, 1000),
    60000,
  );
});
test("dispatch, missing and uncertain evidence never display teleported", () => {
  for (const state of ["dispatching", "uncertain", "sent", undefined])
    assert.doesNotMatch(teleportMessage({ state }), /^已传送/);
  assert.match(teleportMessage({ state: "confirmed" }), /^已传送/);
});

test('original results survive navigation without caching evidence or crossing worlds', () => {
  const values = new Map()
  const storage = { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v) }
  const id = '00000000-0000-4000-8000-000000000001'
  previewReference(storage, 'room', 'Master', id)
  assert.equal(previewReference(storage, 'room', 'Master'), id)
  assert.equal(previewReference(storage, 'room', 'Caves'), '')
  for (let i = 0; i < 40; i++) previewReference(storage, `room-${i}`, 'Master', id)
  assert.equal(previewReference(storage, 'room', 'Master'), '')
  assert.equal(JSON.parse([...values.values()][0]).length, 32)
  previewReference(storage, 'room-39', 'Master', '')
  assert.equal(previewReference(storage, 'room-39', 'Master'), '')
  assert.equal(previewReference({getItem: () => { throw Error('disabled') }}, 'room', 'Master'), '')
})

test('group movement confirms only a verified frozen preview within its original lifetime', () => {
  const run = { commandId: 'relocate_players', status: 'succeeded', executionOutcome: 'confirmed', movement: { state: 'preview', previewId: '00000000-0000-4000-8000-000000000001', observedAt: 100, expiresAt: 160 } }
  assert.deepEqual(movementPreview(run, 1000, 6000), { id: run.movement.previewId, until: 61000 })
  assert.equal(movementPreview(run, 1000, 62000), null)
  assert.equal(movementPreview({ ...run, status: 'sent' }, 1000, 6000), null)
  assert.equal(movementPreview({ ...run, movement: null }, 1000, 6000), null)
})
