import { ALIEN_GENERIC, ALIEN_POKED, PLANETS, SUN } from './planets'
import type { Camera } from './render'
import type { Body } from './sim'

/**
 * A small, weird tourist: a one-eyed pink blob in a flying saucer. It glides from world
 * to world, circles each one with its tractor beam on, says what it thinks, and moves on.
 * Poke it and it spins.
 */

export interface Alien {
  x: number
  y: number
  vx: number
  vy: number
  target: number | null
  mode: 'fly' | 'visit'
  timer: number
  say: string | null
  sayT: number
  /** Remaining spin from a poke (radians). */
  spin: number
  orbitA: number
  visited: number[]
  /** The followed world's velocity in real time (it moves at the sim's time speed). */
  tvx: number
  tvy: number
  /** On the guided trip: stay at the target, and say this on arrival. */
  stay: boolean
  script: string | null
}

/** Saucer half-width in world units (drawn at least MIN_PX on screen). */
const SIZE = 15
const MIN_PX = 28
const MAX_PX = 44
/** Saucer half-width on screen at this zoom. */
const saucerPx = (zoom: number) => Math.min(Math.max(SIZE * zoom, MIN_PX), MAX_PX)

export function makeAlien(): Alien {
  return { x: 260, y: -200, vx: 0, vy: 0, target: null, mode: 'fly', timer: 0, say: 'Ooh, a solar system!', sayT: 0, spin: 0, orbitA: 0, visited: [], tvx: 0, tvy: 0, stay: false, script: null }
}

function linesFor(b: Body): string[] {
  if (b.name === SUN.name) return SUN.alien
  return PLANETS.find((p) => p.name === b.name)?.alien ?? ALIEN_GENERIC
}

function pickTarget(al: Alien, bodies: Body[]): Body | null {
  // Prefer places it hasn't been lately, and planets over the Sun.
  const options = bodies.filter((b) => b.id !== al.target && !al.visited.slice(-3).includes(b.id))
  const pool = options.length ? options : bodies
  if (!pool.length) return null
  const weights = pool.map((b) => (b.kind === 'star' ? 0.4 : 1))
  let r = Math.random() * weights.reduce((a, w) => a + w, 0)
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]
    if (r <= 0) return pool[i]
  }
  return pool[pool.length - 1]
}

const say = (al: Alien, text: string) => {
  al.say = text
  al.sayT = 0
}

/** Advance the alien by dt real seconds; `rate` = sim seconds per real second. */
export function updateAlien(al: Alien, bodies: Body[], dt: number, rate: number, zoom: number) {
  al.sayT += dt
  if (al.say && al.sayT > 4.5) al.say = null
  al.spin = Math.max(0, al.spin - dt * 9)

  let target = bodies.find((b) => b.id === al.target) ?? null
  if (!target) {
    target = pickTarget(al, bodies)
    al.target = target?.id ?? null
    al.mode = 'fly'
  }
  if (!target) return

  // Where to be: hovering just off the world, a little above it.
  // Far enough (in screen terms) that the saucer never sits on top of the world.
  const hover = target.r + Math.max(target.kind === 'star' ? target.r * 0.8 : 0, (saucerPx(zoom) * 2) / zoom)
  if (al.mode === 'visit') al.orbitA += dt * 0.5
  const gx = target.x + Math.cos(al.orbitA) * hover
  const gy = target.y + Math.sin(al.orbitA) * hover

  // Critically damped chase of a moving point (feeds in the target's own velocity).
  al.tvx = target.vx * rate
  al.tvy = target.vy * rate
  const w = al.mode === 'fly' ? 1.6 : 3
  al.vx += (w * w * (gx - al.x) + 2 * w * (al.tvx - al.vx)) * dt
  al.vy += (w * w * (gy - al.y) + 2 * w * (al.tvy - al.vy)) * dt
  const speed = Math.hypot(al.vx - al.tvx, al.vy - al.tvy)
  const max = 420
  if (speed > max) {
    al.vx = al.tvx + ((al.vx - al.tvx) * max) / speed
    al.vy = al.tvy + ((al.vy - al.tvy) * max) / speed
  }
  al.x += al.vx * dt
  al.y += al.vy * dt

  const dist = Math.hypot(gx - al.x, gy - al.y)
  if (al.mode === 'fly' && dist < 14) {
    al.mode = 'visit'
    al.timer = 6.5
    const lines = linesFor(target)
    say(al, al.script ?? lines[Math.floor(Math.random() * lines.length)])
    al.script = null
  } else if (al.mode === 'visit' && !al.stay) {
    al.timer -= dt
    if (al.timer <= 0) {
      al.visited.push(target.id)
      const next = pickTarget(al, bodies)
      al.target = next?.id ?? null
      al.mode = 'fly'
      // Leave from where it is round the next world, not by flying through it.
      if (next) al.orbitA = Math.atan2(al.y - next.y, al.x - next.x)
      if (next?.name && Math.random() < 0.5) say(al, `Next stop: ${next.name}!`)
    }
  }
}

/** Guided trip: fly to this world, say the line on arrival and wait there. */
export function guideAlien(al: Alien, bodies: Body[], id: number, line: string) {
  al.stay = true
  if (al.target === id && al.mode === 'visit') {
    say(al, line)
    return
  }
  const next = bodies.find((b) => b.id === id)
  al.target = id
  al.mode = 'fly'
  al.script = line
  if (next) al.orbitA = Math.atan2(al.y - next.y, al.x - next.x)
}

/** Back to wandering on its own. */
export function releaseAlien(al: Alien) {
  al.stay = false
  al.script = null
  al.timer = Math.min(al.timer, 3)
}

/** A happy spin and a line (right answers), or just a line. */
export function cheerAlien(al: Alien, text: string, spin = true) {
  if (spin) al.spin = Math.PI * 2
  say(al, text)
}

/** Poke: spin and complain. */
export function pokeAlien(al: Alien) {
  al.spin = Math.PI * 2
  say(al, ALIEN_POKED[Math.floor(Math.random() * ALIEN_POKED.length)])
}

export function alienScreen(al: Alien, cam: Camera, w: number, h: number) {
  const px = saucerPx(cam.zoom)
  return { x: (al.x - cam.x) * cam.zoom + w / 2, y: (al.y - cam.y) * cam.zoom + h / 2, px }
}


// ------------------------------------------------------------------ drawing (shared by both views)

export interface SaucerPose {
  /** Lean into the direction of travel (radians). */
  lean: number
  /** Extra spin from a poke (radians). */
  spin: number
  /** Where the pilot's eye looks (screen angle). */
  look: number
}

/**
 * A one-eyed pink blob with glowing antennae under a glass dome, on a teal saucer with
 * running lights. `u` = saucer half-width in pixels; (sx, sy) its centre.
 */
export function drawSaucer(ctx: CanvasRenderingContext2D, sx: number, sy: number, u: number, pose: SaucerPose, time: number) {
  ctx.save()
  ctx.translate(sx, sy)
  ctx.rotate(pose.lean + pose.spin)

  // Glass dome, back half.
  ctx.fillStyle = 'rgba(190, 240, 255, 0.22)'
  ctx.beginPath()
  ctx.arc(0, -u * 0.1, u * 0.62, Math.PI, 0)
  ctx.fill()

  // The pilot.
  const wob = Math.sin(time * 5) * 0.06
  ctx.strokeStyle = '#ff7ac8'
  ctx.lineWidth = Math.max(1.2, u * 0.07)
  ctx.lineCap = 'round'
  for (const side of [-1, 1]) {
    const tipX = side * u * (0.32 + wob)
    const tipY = -u * (0.95 + Math.sin(time * 3 + side) * 0.05)
    ctx.beginPath()
    ctx.moveTo(side * u * 0.12, -u * 0.45)
    ctx.quadraticCurveTo(side * u * 0.1, -u * 0.8, tipX, tipY)
    ctx.stroke()
    ctx.fillStyle = '#fff38a'
    ctx.beginPath()
    ctx.arc(tipX, tipY, u * 0.09, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#ff7ac8'
  ctx.beginPath()
  ctx.ellipse(0, -u * 0.22, u * 0.4 * (1 + wob), u * 0.36 * (1 - wob), 0, 0, Math.PI * 2)
  ctx.fill()
  // Little blush spots.
  ctx.fillStyle = 'rgba(255, 70, 140, 0.45)'
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(side * u * 0.27, -u * 0.12, u * 0.07, u * 0.045, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  // The eye: looks where it's told, blinks now and then.
  const look = pose.look - pose.lean - pose.spin
  const blink = time % 4.3 < 0.13 ? 0.15 : 1
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.ellipse(0, -u * 0.26, u * 0.24, u * 0.24 * blink, 0, 0, Math.PI * 2)
  ctx.fill()
  if (blink > 0.5) {
    ctx.fillStyle = '#3a1466'
    ctx.beginPath()
    ctx.arc(Math.cos(look) * u * 0.09, -u * 0.26 + Math.sin(look) * u * 0.09, u * 0.12, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(Math.cos(look) * u * 0.09 - u * 0.04, -u * 0.3 + Math.sin(look) * u * 0.09, u * 0.035, 0, Math.PI * 2)
    ctx.fill()
  }

  // Saucer: underside, rim, running lights.
  ctx.fillStyle = '#2bb59a'
  ctx.beginPath()
  ctx.ellipse(0, u * 0.16, u * 0.72, u * 0.24, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#48e5c2'
  ctx.beginPath()
  ctx.ellipse(0, u * 0.04, u, u * 0.26, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
  ctx.beginPath()
  ctx.ellipse(-u * 0.3, -u * 0.04, u * 0.42, u * 0.07, 0, 0, Math.PI * 2)
  ctx.fill()
  const colors = ['#fff38a', '#ff7ac8', '#7fd8ff']
  for (let i = 0; i < 5; i++) {
    const lx = (i - 2) * u * 0.38
    ctx.fillStyle = colors[Math.floor(time * 4 + i) % 3]
    ctx.beginPath()
    ctx.arc(lx, u * 0.1 - Math.abs(i - 2) * u * 0.03, u * 0.07, 0, Math.PI * 2)
    ctx.fill()
  }
  // Dome glint, front.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.lineWidth = Math.max(1, u * 0.05)
  ctx.beginPath()
  ctx.arc(0, -u * 0.1, u * 0.5, Math.PI * 1.15, Math.PI * 1.45)
  ctx.stroke()
  ctx.restore()
}

/** Tractor beam from the saucer at (sx, sy) to (tx, ty), `spread` px wide at the far end. */
export function drawBeam(ctx: CanvasRenderingContext2D, sx: number, sy: number, tx: number, ty: number, u: number, spread: number, time: number, strength = 1) {
  const ang = Math.atan2(ty - sy, tx - sx)
  const len = Math.hypot(tx - sx, ty - sy)
  ctx.save()
  ctx.translate(sx, sy)
  ctx.rotate(ang)
  const g = ctx.createLinearGradient(0, 0, len, 0)
  g.addColorStop(0, `rgba(160, 255, 210, ${0.45 * strength})`)
  g.addColorStop(1, `rgba(160, 255, 210, ${0.06 * strength})`)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(u * 0.3, -u * 0.35)
  ctx.lineTo(len, -spread)
  ctx.lineTo(len, spread)
  ctx.lineTo(u * 0.3, u * 0.35)
  ctx.closePath()
  ctx.fill()
  // Rings rising up the beam.
  ctx.strokeStyle = `rgba(210, 255, 235, ${0.4 * strength})`
  ctx.lineWidth = 1.5
  for (let i = 0; i < 4; i++) {
    const k = (time * 0.6 + i / 4) % 1
    const d = len * (1 - k)
    const s = u * 0.35 + (spread - u * 0.35) * (1 - k)
    ctx.beginPath()
    ctx.ellipse(d, 0, s * 0.16, s, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}

/** Speech bubble above a point, kept on screen and clear of the bottom toolbar. */
export function drawBubble(ctx: CanvasRenderingContext2D, text: string, sayT: number, sx: number, sy: number, u: number, w: number, h: number, life = 4.5) {
  const fade = Math.min(1, sayT * 5, (life - sayT) * 3)
  if (fade <= 0) return
  ctx.save()
  ctx.globalAlpha *= fade
  ctx.font = '600 15px Fredoka, ui-rounded, "SF Pro Rounded", Nunito, system-ui, sans-serif'
  const tw = ctx.measureText(text).width
  const bw = tw + 22
  const bh = 34
  const bx = Math.min(w - bw - 8, Math.max(8, sx - bw / 2))
  let by = Math.min(h - 160, Math.max(70, sy - u * 1.3 - bh - 10))
  // No room above (alien near the top of the screen): hang the bubble below it instead.
  const below = by + bh + 8 > sy - u * 0.9
  if (below) by = sy + u * 1.3 + 10
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(bx, by, bw, bh, 17)
  ctx.fill()
  const tailX = Math.min(bx + bw - 14, Math.max(bx + 14, sx))
  ctx.beginPath()
  const edge = below ? by + 1 : by + bh - 1
  ctx.moveTo(tailX - 6, edge)
  ctx.lineTo(tailX + 6, edge)
  ctx.lineTo(tailX, below ? by - 8 : by + bh + 8)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#25124d'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, bx + 11, by + bh / 2 + 1)
  ctx.restore()
}

/** The alien in the solar-system view. */
export function drawAlien(ctx: CanvasRenderingContext2D, al: Alien, bodies: Body[], cam: Camera, w: number, h: number, time: number) {
  const { x: sx, y: sy0, px: u } = alienScreen(al, cam, w, h)
  if (sx < -u * 6 || sy0 < -u * 6 || sx > w + u * 6 || sy0 > h + u * 6) return
  const sy = sy0 + Math.sin(time * 2.2) * u * 0.12
  const target = bodies.find((b) => b.id === al.target)
  if (target && al.mode === 'visit') {
    const tx = (target.x - cam.x) * cam.zoom + w / 2
    const ty = (target.y - cam.y) * cam.zoom + h / 2
    const len = Math.hypot(tx - sx, ty - sy)
    const k = Math.max(0, (len - target.r * cam.zoom * 0.3) / (len || 1))
    drawBeam(ctx, sx, sy, sx + (tx - sx) * k, sy + (ty - sy) * k, u, target.r * cam.zoom * 0.9 + u * 0.4, time)
  }
  const look = target ? Math.atan2(target.y - al.y, target.x - al.x) : 0
  drawSaucer(ctx, sx, sy, u, { lean: Math.max(-0.35, Math.min(0.35, (al.vx - al.tvx) * 0.004)), spin: al.spin, look }, time)
  if (al.say) drawBubble(ctx, al.say, al.sayT, sx, sy, u, w, h)
}
