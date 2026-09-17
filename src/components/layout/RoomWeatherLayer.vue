<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'
import themeManager, { THEMES } from '@/utils/themeManager'
import { createWeatherCanvas } from '@/lib/weatherCanvas.mjs'

const props = defineProps({ weather: { type: Object, required: true } })
const canvas = ref(null)
const dark = ref(themeManager.getTheme() === THEMES.DARK)
const hidden = ref(document.hidden)
const reducedMotion = usePreferredReducedMotion()
const still = computed(() => hidden.value || reducedMotion.value === 'reduce' || props.weather.paused)
let renderer
function drawWeather() {
  renderer?.update(props.weather, { isDark: dark.value, animate: !still.value, pageVisible: !hidden.value })
}
function themeChanged(theme) { dark.value = theme === THEMES.DARK }
function visibilityChanged() { hidden.value = document.hidden }
function resize() { renderer?.resize() }
watch([() => props.weather, dark, still], drawWeather)
onMounted(() => {
  renderer = createWeatherCanvas(canvas.value)
  drawWeather()
  themeManager.addListener(themeChanged)
  document.addEventListener('visibilitychange', visibilityChanged)
  window.addEventListener('resize', resize, { passive: true })
})
onBeforeUnmount(() => {
  renderer?.dispose()
  themeManager.removeListener(themeChanged)
  document.removeEventListener('visibilitychange', visibilityChanged)
  window.removeEventListener('resize', resize)
})
</script>

<template>
  <Teleport to="body">
    <div class="room-weather-layer" aria-hidden="true" :data-theme="dark ? 'dark' : 'light'" :data-effect="weather.effect" :data-season="weather.season" :data-phase="weather.phase" :data-room-id="weather.roomId" :data-still="still" :data-preview="weather.preview || undefined">
      <div class="weather-lighting">
        <Transition name="weather-glow">
          <div v-if="weather.season" :key="weather.season" class="weather-season-glow" :data-season="weather.season" />
        </Transition>
        <Transition name="weather-glow">
          <div v-if="weather.phase" :key="weather.phase" class="weather-phase-glow" :data-phase="weather.phase" />
        </Transition>
        <Transition name="weather-glow" appear>
          <div v-if="weather.precipitation === 'none' && weather.phase === 'day'" class="weather-sunlight">
            <span v-for="beam in 3" :key="beam" class="weather-sunbeam" />
          </div>
        </Transition>
      </div>
      <canvas ref="canvas" class="weather-canvas" />
    </div>
  </Teleport>
</template>

<style scoped>
/* Above the application shell (30), below menus/dialogs (50). This decorative
   layer never receives input or changes layout, even over the sidebar. */
.room-weather-layer { position: fixed; inset: 0; z-index: 40; overflow: hidden; pointer-events: none; contain: strict; }
.weather-lighting, .weather-season-glow, .weather-phase-glow, .weather-sunlight, .weather-canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
/* The centre stays clear. Only decorative light is masked; rain and snow
   remain full-screen. No application theme tokens or surface colours change. */
.weather-lighting { mask-image: radial-gradient(ellipse 60% 65% at 50% 50%, transparent 48%, #000 100%); }
.weather-season-glow {
  --season-colour: 70 164 103;
  --season-strength: 0.26;
  background:
    radial-gradient(ellipse 48% 65% at 0 15%, rgb(var(--season-colour) / var(--season-strength)), transparent 85%),
    radial-gradient(ellipse 40% 55% at 100% 100%, rgb(var(--season-colour) / var(--season-strength)), transparent 90%);
}
.weather-season-glow[data-season="spring"] { --season-colour: 57 161 94; }
.weather-season-glow[data-season="summer"] { --season-colour: 242 188 54; }
.weather-season-glow[data-season="autumn"] { --season-colour: 203 99 51; }
.weather-season-glow[data-season="winter"] { --season-colour: 82 143 202; }
[data-theme="dark"] .weather-season-glow { --season-strength: 0.17; }

/* Daylight, sunset and moonlight occupy different edges, independently of
   season. Dark mode uses dimmer warm light and a lighter moonlit edge. */
.weather-phase-glow[data-phase="day"] {
  background: radial-gradient(ellipse 75% 70% at 0 0, rgb(255 221 137 / 0.13), transparent 72%);
}
.weather-phase-glow[data-phase="dusk"] {
  background:
    radial-gradient(ellipse 75% 45% at 100% 100%, rgb(227 119 71 / 0.26), transparent 90%),
    linear-gradient(to bottom, rgb(94 71 115 / 0.06), transparent 28%);
}
.weather-phase-glow[data-phase="night"] {
  background:
    radial-gradient(ellipse 45% 60% at 100% 0, rgb(129 170 222 / 0.2), transparent 80%),
    radial-gradient(ellipse 70% 75% at 50% 40%, transparent 48%, rgb(35 48 76 / 0.16) 100%);
}
[data-theme="dark"] .weather-phase-glow[data-phase="day"] {
  background: radial-gradient(ellipse 75% 70% at 0 0, rgb(238 197 117 / 0.07), transparent 72%);
}
[data-theme="dark"] .weather-phase-glow[data-phase="dusk"] {
  background:
    radial-gradient(ellipse 75% 45% at 100% 100%, rgb(199 111 72 / 0.15), transparent 90%),
    linear-gradient(to bottom, rgb(17 15 32 / 0.12), transparent 28%);
}
[data-theme="dark"] .weather-phase-glow[data-phase="night"] {
  background:
    radial-gradient(ellipse 45% 60% at 100% 0, rgb(153 184 224 / 0.09), transparent 80%),
    radial-gradient(ellipse 70% 75% at 50% 40%, transparent 48%, rgb(4 9 21 / 0.3) 100%);
}
.weather-sunlight {
  --sun-beam: 0.26;
  --sun-core: 0.32;
  --sun-halo: 0.2;
  background: radial-gradient(ellipse 58% 65% at 0 0, rgb(255 240 189 / var(--sun-core)), rgb(249 195 78 / var(--sun-halo)) 22%, transparent 72%);
}
.weather-sunbeam {
  --beam-angle: 96deg;
  position: absolute;
  top: 0;
  left: 0;
  /* The mask ends at 80% of its original 90% × 85% radii. Keep only
     that visible area; 125% radii preserve the original light falloff. */
  width: 72%;
  height: 68%;
  transform-origin: top left;
  background: conic-gradient(from var(--beam-angle) at 0 0, transparent 0deg, rgb(255 227 147 / var(--sun-beam)) 5deg, rgb(255 245 209 / var(--sun-beam)) 8deg, transparent 15deg);
  mask-image: radial-gradient(ellipse 125% 125% at 0 0, #000 8%, transparent 80%);
  animation: weather-sunbeam 16s ease-in-out -4s infinite alternate;
}
.weather-sunbeam:nth-child(2) { --beam-angle: 123deg; animation-duration: 21s; animation-delay: -12s; }
.weather-sunbeam:nth-child(3) { --beam-angle: 153deg; animation-duration: 26s; animation-delay: -19s; }
[data-theme="dark"] .weather-sunlight { --sun-beam: 0.14; --sun-core: 0.16; --sun-halo: 0.09; }
.weather-glow-enter-active, .weather-glow-leave-active { transition: opacity 350ms ease; }
.weather-glow-enter-from, .weather-glow-leave-to { opacity: 0; }
[data-still="true"] .weather-sunbeam { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) {
  .weather-glow-enter-active, .weather-glow-leave-active { transition: none; }
}
@keyframes weather-sunbeam { from { transform: rotate(-3deg); opacity: 0.65; } to { transform: rotate(3deg); opacity: 1; } }
</style>
