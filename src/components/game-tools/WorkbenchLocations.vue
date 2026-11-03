<script setup>
import { computed, ref, watch, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { MapPin, Plus, RefreshCw, Pencil, Trash2 } from "@lucide/vue";
import { toast } from "vue-sonner";
import { locationsV2API } from "@/api/v2";
import {
  previewRemaining,
  previewReference,
  teleportMessage,
  teleportReasons,
} from "@/lib/locationResults.mjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
const props = defineProps({
  roomId: { type: String, default: "" },
  worldId: { type: String, default: "" },
  playerId: { type: String, default: "" },
  playerName: { type: String, default: "" },
  mapPoint: { type: Object, default: null },
});
const { locale } = useI18n();
const en = computed(() => locale.value.startsWith("en"));
const text = (zh, eng) => (en.value ? eng : zh);
const items = ref([]),
  search = ref(""),
  offset = ref(0),
  more = ref(false),
  loading = ref(false),
  busy = ref(false),
  error = ref("");
const editor = ref(false),
  editing = ref(null),
  name = ref(""),
  coordinates = ref(false),
  x = ref(""),
  z = ref(""),
  deleting = ref(null);
const preview = ref(null),
  received = ref(0),
  now = ref(Date.now()),
  player = ref("");
let generation = 0,
  loadSequence = 0,
  alive = true,
  ticker;
const target = computed(() => props.playerId || player.value.trim());
const canConfirm = computed(
  () =>
    !busy.value &&
    preview.value?.state === "prepared" &&
    previewRemaining(preview.value, received.value, now.value) > 0,
);
function showError(e) {
  error.value =
    e.rawMessage || e.message || text("操作失败，请稍后重试", "Request failed");
}
async function load() {
  const seq = generation,
    request = ++loadSequence,
    room = props.roomId,
    world = props.worldId;
  if (!room || !world) {
    items.value = [];
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    const data = await locationsV2API.list(room, {
      worldId: world,
      search: search.value || undefined,
      offset: offset.value,
    });
    if (alive && seq === generation && request === loadSequence) {
      items.value = data.items || [];
      more.value = data.hasMore;
    }
  } catch (e) {
    if (alive && seq === generation && request === loadSequence) showError(e);
  } finally {
    if (alive && seq === generation && request === loadSequence)
      loading.value = false;
  }
}
function sourceLabel(item) {
  const label =
    {
      player: text("玩家现场位置", "Live player position"),
      map: text("地图选点", "Map snapshot"),
      coordinates: text("手动坐标", "Manual coordinates"),
    }[item.source] || "";
  const date = item.sourceTime
  return (
    label +
    (date && Number.isFinite(Date.parse(date))
      ? " · " + new Date(date).toLocaleString(en.value ? "en-US" : "zh-CN")
      : "")
  );
}
function remember(room, world, id) {
  try {
    return previewReference(window.sessionStorage, room, world, id);
  } catch {
    return "";
  }
}
async function restorePreview(seq, room, world) {
  const id = remember(room, world);
  if (!id) return;
  busy.value = true;
  try {
    const value = await locationsV2API.result(room, id);
    if (alive && seq === generation) acceptResult(value);
  } catch (e) {
    if (alive && seq === generation) showError(e);
  } finally {
    if (alive && seq === generation) busy.value = false;
  }
}
function closePreview() {
  remember(props.roomId, props.worldId, "");
  preview.value = null;
  clearInterval(ticker);
}
function openEditor(item) {
  editing.value = item || null;
  name.value = item?.name || "";
  x.value = item?.x ?? props.mapPoint?.x ?? "";
  z.value = item?.z ?? props.mapPoint?.z ?? "";
  coordinates.value = Boolean(props.mapPoint);
  editor.value = true;
}
async function save() {
  if (!name.value.trim() || busy.value) return;
  const data = { name: name.value.trim(), worldId: props.worldId };
  if (editing.value) data.revision = editing.value.revision;
  if (coordinates.value) {
    if (
      x.value === "" ||
      z.value === "" ||
      !Number.isFinite(Number(x.value)) ||
      !Number.isFinite(Number(z.value))
    )
      return;
    Object.assign(data, {
      x: Number(x.value),
      z: Number(z.value),
      ...(props.mapPoint?.mapId ? { mapId: props.mapPoint.mapId } : {}),
    });
  } else if (!editing.value) {
    if (!target.value) {
      error.value = text(
        "请先选择玩家，或填写坐标。",
        "Select a player or enter coordinates.",
      );
      return;
    }
    data.playerId = target.value;
  }
  busy.value = true;
  error.value = "";
  const seq = generation,
    room = props.roomId;
  try {
    await locationsV2API.save(room, data, editing.value?.id);
    if (alive && seq === generation) {
      editor.value = false;
      await load();
      toast.success(text("地点已保存", "Location saved"));
    }
  } catch (e) {
    if (alive && seq === generation) showError(e);
  } finally {
    if (alive && seq === generation) busy.value = false;
  }
}
async function remove() {
  if (!deleting.value || busy.value) return;
  busy.value = true;
  const seq = generation,
    room = props.roomId,
    item = deleting.value;
  try {
    await locationsV2API.remove(room, item);
    if (alive && seq === generation) {
      deleting.value = null;
      await load();
    }
  } catch (e) {
    if (alive && seq === generation) showError(e);
  } finally {
    if (alive && seq === generation) busy.value = false;
  }
}
function acceptResult(value) {
  preview.value = value;
  received.value = Date.now();
  now.value = received.value;
  clearInterval(ticker);
  if (value.state === "prepared")
    ticker = setInterval(() => {
      now.value = Date.now();
      if (!canConfirm.value && !busy.value) clearInterval(ticker);
    }, 1000);
}
async function prepare(item) {
  if (!target.value || busy.value) return;
  busy.value = true;
  error.value = "";
  const seq = generation,
    room = props.roomId,
    world = props.worldId;
  try {
    const result = await locationsV2API.prepare(room, {
      playerId: target.value,
      worldId: world,
      locationId: item.id,
    });
    remember(room, world, result.id);
    if (alive && seq === generation) acceptResult(result);
  } catch (e) {
    if (alive && seq === generation) showError(e);
  } finally {
    if (alive && seq === generation) busy.value = false;
  }
}
async function operate(action) {
  if (
    busy.value ||
    !preview.value ||
    (action === "execute" && !canConfirm.value)
  )
    return;
  const room = props.roomId,
    id = preview.value.id,
    seq = generation;
  busy.value = true;
  error.value = "";
  if (action === "execute") {
    preview.value = { ...preview.value, state: "dispatching" };
    toast.loading(
      text(
        "正在传送，等待位置确认",
        "Teleporting; waiting for position confirmation",
      ),
      { id: `teleport:${id}` },
    );
  }
  try {
    const result = await locationsV2API[action](room, id);
    if (action === "execute" || action === "result") {
      const show =
        result.state === "confirmed"
          ? toast.success
          : result.state === "rejected"
            ? toast.error
            : toast.message;
      show(teleportMessage(result, en.value), {
        id: `teleport:${id}`,
        duration: 8000,
      });
    }
    if (alive && seq === generation) acceptResult(result);
  } catch (e) {
    if (action === "execute")
      toast.message(
        text(
          "传送结果尚未确认，请查看原结果",
          "Teleport result is uncertain; read the original result",
        ),
        { id: `teleport:${id}`, duration: 8000 },
      );
    if (alive && seq === generation) {
      if (action === "execute")
        preview.value = { ...preview.value, state: "uncertain" };
      showError(e);
    }
  } finally {
    if (alive && seq === generation) busy.value = false;
  }
}
watch(
  () => [props.roomId, props.worldId, props.playerId],
  () => {
    ++generation;
    clearInterval(ticker);
    busy.value = false;
    preview.value = null;
    editor.value = false;
    deleting.value = null;
    items.value = [];
    offset.value = 0;
    void load();
    void restorePreview(generation, props.roomId, props.worldId);
  },
  { immediate: true },
);
watch(
  () => props.mapPoint,
  (value) => {
    if (value) openEditor();
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  alive = false;
  ++generation;
  clearInterval(ticker);
});
</script>
<template>
  <section class="flex min-w-0 flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h3 class="flex items-center gap-2 font-medium">
          <MapPin class="size-4" />{{ text("地点", "Locations") }}
        </h3>
        <p class="text-sm text-muted-foreground">
          {{
            text(
              "保存基地等常用位置，传送前会检查能否落脚。",
              "Save useful locations. Each teleport checks the live destination.",
            )
          }}
        </p>
      </div>
      <Button :disabled="busy || !worldId" @click="openEditor()"
        ><Plus data-icon="inline-start" />{{
          text("保存地点", "Save location")
        }}</Button
      >
    </div>
    <Field v-if="!playerId"
      ><FieldLabel for="location-player">{{
        text("玩家昵称或 KU ID", "Player name or KU ID")
      }}</FieldLabel
      ><Input
        id="location-player"
        v-model="player"
        :disabled="busy"
        maxlength="128"
    /></Field>
    <p v-else class="text-sm">
      {{ text("当前玩家：", "Player: ") }}{{ playerName || playerId }}
    </p>
    <form
      class="flex gap-2"
      @submit.prevent="
        offset = 0;
        load();
      "
    >
      <Input
        v-model="search"
        :placeholder="text('搜索地点', 'Search locations')"
        :aria-label="text('搜索地点', 'Search locations')"
        maxlength="48"
      /><Button variant="outline" type="submit" :disabled="loading"
        ><RefreshCw data-icon="inline-start" />{{
          text("查询", "Search")
        }}</Button
      >
    </form>
    <Alert v-if="error" variant="destructive"
      ><AlertDescription>{{ error }}</AlertDescription></Alert
    >
    <Spinner v-if="loading" />
    <p v-else-if="!items.length" class="text-sm text-muted-foreground">
      {{
        text(
          "还没有保存地点。选择在线玩家，即可保存当前位置。",
          "No locations yet. Select an online player to save their current position.",
        )
      }}
    </p>
    <div
      v-for="item in items"
      :key="item.id"
      class="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
    >
      <div class="min-w-0">
        <p class="break-words font-medium">{{ item.name }}</p>
        <p class="text-xs text-muted-foreground">
          X {{ item.x.toFixed(1) }} · Z {{ item.z.toFixed(1) }}
        </p>
        <p class="text-xs text-muted-foreground">{{ sourceLabel(item) }}</p>
      </div>
      <div class="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          :disabled="
            !target ||
            busy ||
            ['prepared', 'dispatching', 'uncertain'].includes(preview?.state)
          "
          @click="prepare(item)"
          >{{ text("传送前检查", "Check destination") }}</Button
        ><Button
          size="icon-sm"
          variant="ghost"
          :disabled="busy"
          :aria-label="text('编辑地点', 'Edit location')"
          @click="openEditor(item)"
          ><Pencil /></Button
        ><Button
          size="icon-sm"
          variant="ghost"
          :disabled="busy"
          :aria-label="text('删除地点', 'Delete location')"
          @click="deleting = item"
          ><Trash2
        /></Button>
      </div>
    </div>
    <div v-if="offset || more" class="flex gap-2">
      <Button
        variant="outline"
        :disabled="!offset || loading"
        @click="
          offset -= 50;
          load();
        "
        >{{ text("上一页", "Previous") }}</Button
      ><Button
        variant="outline"
        :disabled="!more || loading"
        @click="
          offset += 50;
          load();
        "
        >{{ text("下一页", "Next") }}</Button
      >
    </div>
    <Alert v-if="preview" role="status"
      ><AlertTitle>{{ teleportMessage(preview, en) }}</AlertTitle
      ><AlertDescription class="flex flex-col gap-2">
        <p>
          {{ preview.playerName || preview.playerId }} →
          {{ preview.locationName || text("选定位置", "Selected position") }} ·
          X {{ preview.x }} / Z {{ preview.z }}
        </p>
        <p v-if="preview.needsReview">
          {{
            text(
              "世界存档发生过变化，请确认基地等建筑仍在原处。",
              "The save has changed. Check that the intended base or landmark still exists.",
            )
          }}
        </p>
        <p v-if="preview.reason">
          {{
            en
              ? preview.reason
              : teleportReasons[preview.reason] ||
                text(
                  "当前无法完成操作，请重新检查玩家和世界状态。",
                  "Check the player and world state.",
                )
          }}
        </p>
        <template v-if="preview.state === 'prepared'"
          ><p>
            {{
              text(
                "请确认这是你要去的位置。检查只确认能落脚，不代表附近没有危险。",
                "Confirm the destination. A valid landing point may still have nearby dangers.",
              )
            }}
          </p>
          <p>
            {{ Math.ceil(previewRemaining(preview, received, now) / 1000) }}
            {{ text("秒内有效", "seconds remaining") }}
          </p></template
        >
        <div class="flex gap-2">
          <Button
            v-if="preview.state === 'prepared'"
            :disabled="!canConfirm"
            @click="operate('execute')"
            ><Spinner v-if="busy" data-icon="inline-start" />{{
              text("传送", "Teleport")
            }}</Button
          ><Button
            v-if="preview.state === 'prepared'"
            variant="outline"
            :disabled="busy"
            @click="operate('cancel')"
            >{{ text("取消", "Cancel") }}</Button
          ><Button
            v-if="['dispatching', 'uncertain'].includes(preview.state)"
            variant="outline"
            :disabled="busy"
            @click="operate('result')"
            >{{ text("查看原结果", "Read original result") }}</Button
          ><Button
            v-if="
              ['cancelled', 'expired', 'rejected', 'confirmed'].includes(
                preview.state,
              ) ||
              (preview.state === 'prepared' && !canConfirm && !busy)
            "
            variant="ghost"
            @click="closePreview"
            >{{ text("关闭", "Close") }}</Button
          >
        </div>
      </AlertDescription></Alert
    >
    <Dialog v-model:open="editor"
      ><DialogContent
        ><DialogHeader
          ><DialogTitle>{{
            text(
              editing ? "编辑地点" : "保存地点",
              editing ? "Edit location" : "Save location",
            )
          }}</DialogTitle
          ><DialogDescription>{{
            text(
              "地点仅属于当前世界。世界重启后仍会保留。",
              "Locations belong to this world and survive normal restarts.",
            )
          }}</DialogDescription></DialogHeader
        ><FieldGroup
          ><Field
            ><FieldLabel for="location-name">{{
              text("名称", "Name")
            }}</FieldLabel
            ><Input
              id="location-name"
              v-model="name"
              maxlength="48"
              :disabled="busy"
          /></Field>
          <p v-if="!editing && !coordinates" class="text-sm">
            {{
              text(
                "将保存当前玩家这一次的真实位置。",
                "Save the live position of the selected player.",
              )
            }}
          </p>
          <Button
            variant="ghost"
            size="sm"
            :disabled="busy"
            @click="coordinates = !coordinates"
            >{{
              text(
                coordinates ? "收起坐标" : "手动填写坐标",
                coordinates ? "Hide coordinates" : "Enter coordinates",
              )
            }}</Button
          >
          <div v-if="coordinates" class="grid grid-cols-2 gap-3">
            <Field
              ><FieldLabel for="location-x">X</FieldLabel
              ><Input
                id="location-x"
                v-model="x"
                type="number"
                min="-100000"
                max="100000"
                step="any"
                :disabled="busy" /></Field
            ><Field
              ><FieldLabel for="location-z">Z</FieldLabel
              ><Input
                id="location-z"
                v-model="z"
                type="number"
                min="-100000"
                max="100000"
                step="any"
                :disabled="busy"
            /></Field></div></FieldGroup
        ><DialogFooter
          ><Button :disabled="busy || !name.trim()" @click="save"
            ><Spinner v-if="busy" data-icon="inline-start" />{{
              text("保存", "Save")
            }}</Button
          ></DialogFooter
        ></DialogContent
      ></Dialog
    >
    <Dialog
      :open="Boolean(deleting)"
      @update:open="
        (value) => {
          if (!value) deleting = null;
        }
      "
      ><DialogContent
        ><DialogHeader
          ><DialogTitle>{{ text("删除地点", "Delete location") }}</DialogTitle
          ><DialogDescription
            >{{ deleting?.name }} ·
            {{
              text("仅删除保存的位置。", "Remove this saved location.")
            }}</DialogDescription
          ></DialogHeader
        ><DialogFooter
          ><Button
            variant="outline"
            :disabled="busy"
            @click="deleting = null"
            >{{ text("取消", "Cancel") }}</Button
          ><Button variant="destructive" :disabled="busy" @click="remove">{{
            text("删除", "Delete")
          }}</Button></DialogFooter
        ></DialogContent
      ></Dialog
    >
  </section>
</template>
