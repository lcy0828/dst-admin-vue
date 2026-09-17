import { weatherParticleCount } from './roomWeather.mjs'

// One canvas, bounded particles and pre-rendered flakes. Particle positions
// stay outside Vue reactivity; the draw loop never reads layout or game data.
export function createWeatherCanvas(canvas) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return { update() {}, resize() {}, dispose() {} }
  const random = (min, max) => min + Math.random() * (max - min)
  let width = 1, height = 1, ratio = 1, weather = null, dark = false
  let particles = [], splashes = [], sprites = []
  let frame = 0, lastFrame = 0, elapsed = 0, visible = false, fading = false, opacity = 0

  function snowSprites() {
    return [0, 1, 2].map(depth => {
      const sprite = document.createElement('canvas')
      sprite.width = sprite.height = 48
      const pen = sprite.getContext('2d')
      const glow = pen.createRadialGradient(24, 24, 1, 24, 24, 22)
      // Use a filled, soft flake on light backgrounds; a dark outer ring around
      // a white centre would look like a soap bubble over white cards.
      glow.addColorStop(0, dark ? 'rgba(255,255,255,0.95)' : 'rgba(136,158,175,0.65)')
      glow.addColorStop(0.3, dark ? 'rgba(238,246,255,0.65)' : 'rgba(150,170,186,0.45)')
      glow.addColorStop(0.65, dark ? 'rgba(225,240,255,0.12)' : 'rgba(164,182,195,0.15)')
      glow.addColorStop(1, 'rgba(150,180,210,0)')
      pen.fillStyle = glow
      pen.fillRect(0, 0, 48, 48)
      if (depth === 1) {
        pen.translate(24, 24)
        pen.lineCap = 'round'
        // A soft cool edge keeps white crystals visible on light cards too.
        for (const [color, lineWidth] of [[dark ? '#d7e8f7' : '#819bac', 2.5], ['#ffffff', 1.4]]) {
          pen.strokeStyle = color
          pen.lineWidth = lineWidth
          pen.beginPath()
          for (let branch = 0; branch < 6; branch++) {
            const angle = branch * Math.PI / 3
            const x = Math.cos(angle), y = Math.sin(angle)
            pen.moveTo(0, 0); pen.lineTo(x * 14, y * 14)
            for (const direction of [-1, 1]) {
              pen.moveTo(x * 8, y * 8)
              pen.lineTo(x * 5 - y * 4 * direction, y * 5 + x * 4 * direction)
            }
          }
          pen.stroke()
        }
      }
      return sprite
    })
  }

  function resetParticle(particle, anywhere = false) {
    const depth = particle.depth
    particle.x = random(-80, width + 80)
    particle.y = anywhere ? random(-40, height) : random(-100, -12)
    particle.wave = random(0, Math.PI * 2)
    particle.spin = random(-0.7, 0.7)
    particle.angle = random(0, Math.PI * 2)
    particle.speed = weather.effect === 'rain' ? random(380, 620) * (1 + depth * 0.55) : random(18, 38) * (1 + depth * 0.9)
    particle.size = weather.effect === 'rain' ? random(9, 18) * (1 + depth * 0.5) : random(3, 5) * (1 + depth * 0.95)
    particle.alpha = random(0.45, 0.8)
    return particle
  }

  function populate(reset = false) {
    if (!weather || weather.effect === 'none') return
    const count = weatherParticleCount(weather.effect, width, height, weather.intensity)
    if (reset) particles = []
    particles.length = Math.min(particles.length, count)
    while (particles.length < count) {
      const value = Math.random()
      particles.push(resetParticle({ depth: value < 0.55 ? 0 : value < 0.9 ? 1 : 2 }, true))
    }
  }

  function resize() {
    width = Math.max(1, window.innerWidth)
    height = Math.max(1, window.innerHeight)
    ratio = Math.min(window.devicePixelRatio || 1, 1.5)
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    populate(true)
  }

  function draw(delta) {
    ctx.clearRect(0, 0, width, height)
    elapsed += delta
    const wind = Math.sin(elapsed * 0.19) * 13 + Math.sin(elapsed * 0.07) * 20 + 12
    for (const particle of particles) {
      const depth = particle.depth
      if (weather.effect === 'snow') {
        particle.x += (wind * (0.5 + depth * 0.6) + Math.sin(elapsed * 0.7 + particle.wave) * (9 + depth * 4)) * delta
        particle.y += particle.speed * delta
        particle.angle += particle.spin * delta
        ctx.globalAlpha = opacity * particle.alpha
        ctx.save()
        ctx.translate(particle.x, particle.y)
        ctx.rotate(particle.angle)
        const size = particle.size * (1 + Math.sin(elapsed + particle.wave) * 0.12)
        ctx.drawImage(sprites[depth], -size, -size, size * 2, size * 2)
        ctx.restore()
      } else {
        const slope = 0.13 + wind * 0.002
        particle.x += particle.speed * slope * delta
        particle.y += particle.speed * delta
        ctx.globalAlpha = opacity * particle.alpha * (0.45 + depth * 0.15)
        ctx.lineWidth = 0.65 + depth * 0.4
        ctx.strokeStyle = weather.precipitation === 'acid_rain'
          ? dark ? '#b9d99f' : '#749764' : dark ? '#c0d6e5' : '#6f91a9'
        ctx.beginPath()
        ctx.moveTo(particle.x, particle.y)
        ctx.lineTo(particle.x - particle.size * slope, particle.y - particle.size)
        ctx.stroke()
        if (depth === 2) {
          ctx.globalAlpha *= 0.5
          ctx.strokeStyle = '#f0f8ff'
          ctx.lineWidth = 0.6
          ctx.stroke()
        }
        if (particle.y > height - 8 && particle.y < height + particle.speed * delta && depth > 0 && splashes.length < 22) {
          splashes.push({ x: particle.x, y: height - random(1, 7), life: 0, speed: random(10, 24) })
        }
      }
      if (particle.y > height + 24 || particle.x > width + 80 || particle.x < -80) resetParticle(particle)
    }
    for (const splash of splashes) {
      splash.life += delta
      const age = splash.life
      ctx.globalAlpha = opacity * Math.max(0, 1 - age / 0.35) * 0.4
      ctx.strokeStyle = dark ? '#cbdeed' : '#7b9bad'
      ctx.lineWidth = 0.7
      ctx.beginPath()
      const spread = age * splash.speed
      const rise = Math.sin(Math.min(1, age / 0.35) * Math.PI) * 4
      ctx.moveTo(splash.x - spread, splash.y - rise)
      ctx.lineTo(splash.x - spread - 2, splash.y - rise + 2)
      ctx.moveTo(splash.x + spread, splash.y - rise)
      ctx.lineTo(splash.x + spread + 2, splash.y - rise + 2)
      ctx.stroke()
    }
    splashes = splashes.filter(splash => splash.life < 0.35)
    ctx.globalAlpha = 1
  }

  function stop(clear = false) {
    cancelAnimationFrame(frame)
    frame = 0
    lastFrame = 0
    if (clear) { ctx.clearRect(0, 0, width, height); particles = []; splashes = []; opacity = 0 }
  }
  function tick(now) {
    if (!visible || !weather) { stop(true); return }
    frame = requestAnimationFrame(tick)
    if (lastFrame && now - lastFrame < 1000 / 30) return
    const delta = lastFrame ? Math.min((now - lastFrame) / 1000, 0.08) : 1 / 30
    lastFrame = now
    opacity = Math.max(0, Math.min(1, opacity + delta * (fading ? -1.3 : 1.3)))
    draw(delta)
    if (fading && opacity === 0) stop(true)
  }
  function update(next, { isDark = false, animate = true, pageVisible = true } = {}) {
    const changed = next?.effect !== weather?.effect
    if (dark !== isDark || !sprites.length) { dark = isDark; sprites = snowSprites() }
    visible = pageVisible
    if (!animate || !visible || !next || next.paused || next.intensity === 0) { weather = next; stop(true); return }
    if (next.effect === 'none') {
      if (weather?.effect && weather.effect !== 'none' && frame) fading = true
      else { weather = next; stop(true) }
      return
    }
    fading = false
    weather = next
    if (changed) { opacity = 0; splashes = [] }
    populate(changed)
    if (!frame) frame = requestAnimationFrame(tick)
  }
  resize()
  return { resize, update, dispose: () => { stop(true); sprites = [] } }
}
