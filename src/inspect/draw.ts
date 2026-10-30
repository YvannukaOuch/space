import { drawBeam, drawBubble, drawSaucer } from '../alien'
import { ALIEN_POKED } from '../planets'
import { drawBackground } from '../render'
import { bird, c, cloud, cow, hash, KIT, mountain, plane, probe, raw, rock, setLight, station, tower, volcano } from './kit'
import { shield } from './kit2'
import { WORLDS, type Craft, type Feature, type Ground, type Moon, type Ring, type World } from './worlds'

/**
 * The close-up "inspect" view of one world, drawn on a 2D canvas in layers:
 * space, the Sun in this world's sky, moons and craft behind, atmosphere, the planet's face
 * (continents / bands / boiling plasma), its horizon with everything standing on it, the
 * night side, clouds, birds and planes, rings and moons in front, and the alien.
 */

export interface InspectState {
  name: string
  /** How far the world has turned (radians), plus drag-flick speed on top of its own turn. */
  spin: number
  spinVel: number
  zoom: number
  zoomTo: number
  /** 0..1 grow-in when arriving, back to 0 when leaving. */
  appear: number
  alien: { say: string | null; sayT: number; next: number; spin: number; lines: number }
}

export function makeInspect(name: string): InspectState {
  return { name, spin: 0, spinVel: 0, zoom: 1, zoomTo: 1, appear: 0, alien: { say: null, sayT: 0, next: 2.5, spin: 0, lines: 0 } }
}

const smooth = (a: number, b: number, v: number) => {
  const k = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return k * k * (3 - 2 * k)
}

/** Where the world sits on screen. Zooming in keeps the top of the planet in place. */
export function inspectGeometry(w: number, h: number, st: InspectState) {
  // Portrait screens are narrow but tall: let the world use more of the width.
  const R0 = Math.min(w * 0.42, h * 0.3)
  const k = st.appear >= 1 ? 1 : 0.15 + 0.85 * (1 - (1 - st.appear) ** 3)
  const topY = h * (w < h ? 0.47 : 0.57) - R0
  return { R0, R: R0 * st.zoom * k, cx: w / 2, cy: topY + R0 * st.zoom }
}

/** Advance the view: the world's turn, flick momentum, zoom easing, the alien's chatter. */
export function stepInspect(st: InspectState, dt: number) {
  const world = WORLDS[st.name]
  st.spin += ((world?.kind === 'rock' || world?.kind === 'star' ? world.spin : 0.02) + st.spinVel) * dt
  st.spinVel *= Math.exp(-dt * 2.2)
  st.zoom += (st.zoomTo - st.zoom) * (1 - Math.exp(-dt * 6))
  const al = st.alien
  al.sayT += dt
  al.spin = Math.max(0, al.spin - dt * 9)
  al.next -= dt
  if (al.say && al.sayT > 5) al.say = null
  if (al.next <= 0 && world) {
    al.say = world.alien[al.lines % world.alien.length]
    al.lines++
    al.sayT = 0
    al.next = 8
  }
}

/** Where the alien hovers (screen) and its saucer size. */
function alienPose(w: number, h: number, st: InspectState, time: number) {
  const { R, R0, cx, cy } = inspectGeometry(w, h, st)
  // Drift left and right over the middle of the screen, whatever the zoom.
  const want = w / 2 + Math.sin(time * 0.11) * Math.min(w * 0.2, R * 0.75)
  const a = -Math.PI / 2 + Math.asin(Math.max(-0.95, Math.min(0.95, (want - cx) / Math.max(R, 1))))
  const alt = Math.min(R * 0.55, h * 0.2) + Math.sin(time * 1.7) * 4
  const u = Math.min(40, Math.max(20, R0 * 0.085))
  return { a, x: cx + Math.cos(a) * (R + alt), y: cy + Math.sin(a) * (R + alt), gx: cx + Math.cos(a) * R, gy: cy + Math.sin(a) * R, u }
}

export function inspectHitAlien(st: InspectState, w: number, h: number, x: number, y: number, time: number) {
  const p = alienPose(w, h, st, time)
  if (Math.hypot(x - p.x, y - p.y) > p.u * 1.3) return false
  st.alien.spin = Math.PI * 2
  st.alien.say = ALIEN_POKED[Math.floor(Math.random() * ALIEN_POKED.length)]
  st.alien.sayT = 0
  st.alien.next = 7
  return true
}

// Draw order for things on the horizon: big landforms behind, small things in front.
const LAYER: Record<string, number> = {
  mountain: 0,
  shield: 0,
  volcano: 0,
  canyon: 0,
  pyramid: 1,
  dune: 1,
  scarp: 1,
  craterRim: 1,
  field: 1,
  tower: 2,
  radioTower: 2,
  ferrisWheel: 2,
  rocket: 2,
  lighthouse: 2,
  windmill: 2,
  turbine: 2,
  barn: 2,
  house: 3,
  igloo: 3,
  tree: 3,
  pine: 3,
  palm: 3,
  cactus: 3,
  campfire: 4,
  deer: 4,
  penguin: 4,
  rock: 4,
  rover: 5,
  lander: 5,
  veneraLander: 5,
  copter: 6,
  dustDevil: 6,
  balloon: 6,
  ship: 4,
  sailboat: 4,
  whale: 4,
}
const sorted = new WeakMap<World, Feature[]>()
function featuresOf(world: World) {
  let list = sorted.get(world)
  if (!list) {
    list = [...world.features].sort((a, b) => (LAYER[a.kind] ?? 3) - (LAYER[b.kind] ?? 3))
    sorted.set(world, list)
  }
  return list
}

function drawFeature(ctx: CanvasRenderingContext2D, f: Feature, s: number, t: number) {
  switch (f.kind) {
    case 'tower':
      return tower(ctx, s, t, f.v, f.h ?? 3)
    case 'mountain':
      return mountain(ctx, s, t, f.v, f.h ?? 3)
    case 'volcano':
      return volcano(ctx, s, t, f.v, f.h ?? 2.4)
    case 'shield':
      return shield(ctx, s, t, f.v, f.h ?? 2.5, f.color)
    case 'rock':
    case 'dune':
    case 'craterRim':
    case 'canyon':
    case 'scarp':
      return (KIT[f.kind] as (ctx: CanvasRenderingContext2D, s: number, t: number, v: number, color?: string) => void)(ctx, s, t, f.v, f.color)
    default:
      return (KIT[f.kind] as (ctx: CanvasRenderingContext2D, s: number, t: number, v: number) => void)(ctx, s, t, f.v)
  }
}

// ------------------------------------------------------------------ main

export function drawInspect(ctx: CanvasRenderingContext2D, w: number, h: number, st: InspectState, time: number) {
  const world = WORLDS[st.name]
  if (!world) return
  const { R0, R, cx, cy } = inspectGeometry(w, h, st)
  const u = R * 0.028
  const spin = st.spin

  drawBackground({ ctx, w, h, cam: { x: spin * 220, y: 0, zoom: 1 }, time, trails: false, faces: false, names: false })

  // The Sun in this world's sky, and the light direction it gives.
  const sunX = w * 0.13
  const sunY = h * 0.2
  let lx = sunX - cx
  let ly = sunY - cy
  const ll = Math.hypot(lx, ly) || 1
  lx /= ll
  ly /= ll
  if (world.kind !== 'star') drawSkySun(ctx, sunX, sunY, Math.max(3, world.sunSize * R0), time)
  const litAt = (theta: number) => (world.kind === 'star' ? 1 : smooth(-0.2, 0.28, Math.cos(theta) * lx + Math.sin(theta) * ly))

  // Moons, craft and ring halves behind the planet.
  const moons = world.moons.map((m) => ({ m, ...orbitPos(m.d, m.period, m.phase, time, 0.3, m.tilt ?? 0) }))
  const craft = world.craft.map((k) => ({ k, ...orbitPos(k.d, k.period, k.phase, time, 0.32, 0.18) }))
  for (const o of moons) if (!o.front) drawMoon(ctx, cx + o.x * R, cy + o.y * R, o.m.r * R, o.m, lx, ly, time)
  for (const o of craft) if (!o.front) drawCraft(ctx, cx + o.x * R, cy + o.y * R, R, o.k, o.dx, o.dy)
  if (world.ring) drawRing(ctx, cx, cy, R, world.ring, 'back', time)

  if (world.kind === 'star') drawStar(ctx, cx, cy, R, spin, time, w, h)
  else {
    // Atmosphere glow.
    if (world.atmosphere) {
      const a = world.atmosphere
      const g = ctx.createRadialGradient(cx, cy, R * 0.97, cx, cy, R * (1 + a.size))
      g.addColorStop(0, `rgba(${a.color}, 0.55)`)
      g.addColorStop(0.4, `rgba(${a.color}, 0.18)`)
      g.addColorStop(1, `rgba(${a.color}, 0)`)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(cx, cy, R * (1 + a.size), 0, Math.PI * 2)
      ctx.fill()
    }

    // The face.
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.clip()
    ctx.fillStyle = world.base
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2)
    if (world.kind === 'gas') drawBands(ctx, world, cx, cy, R, spin, time, lx, ly)
    else drawRockyFace(ctx, world, cx, cy, R, spin, time)
    ctx.restore()

    if (world.kind === 'rock') drawHorizonGround(ctx, world, cx, cy, R, u, spin, time)

    // Night side (also over the ground strip), limb darkening, rim of light.
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, R * 1.03, 0, Math.PI * 2)
    ctx.clip()
    const ng = ctx.createLinearGradient(cx + lx * R * 0.18, cy + ly * R * 0.18, cx - lx * R * 0.5, cy - ly * R * 0.5)
    ng.addColorStop(0, 'rgba(14, 10, 44, 0)')
    ng.addColorStop(1, 'rgba(14, 10, 44, 0.68)')
    ctx.fillStyle = ng
    ctx.fillRect(cx - R * 1.1, cy - R * 1.1, R * 2.2, R * 2.2)
    ctx.restore()
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.clip()
    const ld = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R)
    ld.addColorStop(0, 'rgba(10, 8, 30, 0)')
    ld.addColorStop(1, 'rgba(10, 8, 30, 0.22)')
    ctx.fillStyle = ld
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2)
    if (world.lightning && world.kind === 'gas') drawFaceLightning(ctx, cx, cy, R, lx, ly, time)
    ctx.restore()
    const la = Math.atan2(ly, lx)
    ctx.strokeStyle = 'rgba(255, 246, 220, 0.7)'
    ctx.lineWidth = Math.max(1.5, R * 0.012)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(cx, cy, R * 0.995, la - 1.0, la + 1.0)
    ctx.stroke()

    // Everything living on the horizon.
    if (world.kind === 'rock') {
      const margin = u * 14
      for (const f of featuresOf(world)) {
        const th = f.a + spin
        const px = cx + Math.cos(th) * R
        const py = cy + Math.sin(th) * R
        if (px < -margin || px > w + margin || py < -margin || py > h + margin) continue
        ctx.save()
        ctx.translate(px, py)
        ctx.rotate(th + Math.PI / 2)
        setLight(litAt(th))
        drawFeature(ctx, f, u * f.s, time)
        ctx.restore()
      }
    }

    // Weather and traffic above the ground.
    if (world.clouds) drawClouds(ctx, world, cx, cy, R, u, spin, time, litAt, w, h)
    if (world.birds) drawBirds(ctx, cx, cy, R, u, spin, time, litAt)
    if (world.planes) drawPlanes(ctx, cx, cy, R, u, spin, time, litAt)
  }

  if (world.ring) drawRing(ctx, cx, cy, R, world.ring, 'front', time)
  for (const o of moons) if (o.front) drawMoon(ctx, cx + o.x * R, cy + o.y * R, o.m.r * R, o.m, lx, ly, time)
  for (const o of craft) if (o.front) drawCraft(ctx, cx + o.x * R, cy + o.y * R, R, o.k, o.dx, o.dy)
  setLight(1)

  drawInspectAlien(ctx, w, h, st, world, time)
}

// ------------------------------------------------------------------ sky

function drawSkySun(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, time: number) {
  const glow = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 6 + 30)
  glow.addColorStop(0, 'rgba(255, 214, 110, 0.55)')
  glow.addColorStop(0.3, 'rgba(255, 190, 90, 0.16)')
  glow.addColorStop(1, 'rgba(255, 190, 90, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(x, y, r * 6 + 30, 0, Math.PI * 2)
  ctx.fill()
  // Soft rays.
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(time * 0.03)
  ctx.fillStyle = 'rgba(255, 226, 150, 0.08)'
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4)
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.3)
    ctx.lineTo(r * 4 + 24, -r * 0.08 - 2)
    ctx.lineTo(r * 4 + 24, r * 0.08 + 2)
    ctx.lineTo(0, r * 0.3)
    ctx.fill()
  }
  ctx.restore()
  ctx.fillStyle = '#ffcf4f'
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff2b8'
  ctx.beginPath()
  ctx.arc(x - r * 0.15, y - r * 0.15, r * 0.6, 0, Math.PI * 2)
  ctx.fill()
}

// ------------------------------------------------------------------ rocky worlds

function drawRockyFace(ctx: CanvasRenderingContext2D, world: World, cx: number, cy: number, R: number, spin: number, time: number) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(spin)
  // Land: each run of non-ocean horizon continues inward as a continent with a curving coast,
  // split into its biomes along wobbly borders, each painted with its own detail.
  const D = Math.PI / 180
  const runs: Ground[][] = []
  for (const g of world.ground) {
    if (g.ocean || !g.face) {
      runs.push([])
      continue
    }
    if (!runs.length) runs.push([])
    runs[runs.length - 1].push(g)
  }
  runs.forEach((run, ri) => {
    if (!run.length) return
    const A0 = run[0].a0 * D
    const A1 = run[run.length - 1].a1 * D
    const whole = A1 - A0 >= Math.PI * 2 - 0.01
    ctx.save()
    if (!whole) {
      const coast = continentPath(R, A0, A1, ri)
      ctx.strokeStyle = world.name === 'Earth' ? '#62b4f4' : 'rgba(0, 0, 0, 0.12)'
      ctx.lineWidth = R * 0.04
      ctx.lineJoin = 'round'
      ctx.stroke(coast)
      ctx.fillStyle = run[0].face!
      ctx.fill(coast)
      ctx.clip(coast)
    }
    run.forEach((g, gi) => {
      const a0 = gi === 0 && !whole ? A0 - 0.1 : g.a0 * D
      const a1 = gi === run.length - 1 && !whole ? A1 + 0.1 : g.a1 * D
      ctx.save()
      const p = biomePath(R, a0, a1)
      ctx.fillStyle = g.face!
      ctx.fill(p)
      ctx.clip(p)
      if (g.tex) paintBiome(ctx, g.tex, R, g.a0 * D, g.a1 * D, gi + ri * 7)
      ctx.restore()
    })
    ctx.restore()
  })

  if (world.name === 'Earth') {
    // Lakes and islands, the polar ice cap at the middle (we're looking down on the pole).
    ctx.fillStyle = '#4b9cf0'
    for (let i = 0; i < 6; i++) {
      const a = hash(i, 3) * Math.PI * 2
      const d = R * (0.62 + hash(i, 4) * 0.25)
      ctx.beginPath()
      ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d, R * 0.04, R * 0.025, a, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#46b25e'
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.6
      const d = R * 0.38
      ctx.beginPath()
      ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d, R * 0.05, R * 0.03, a, 0, Math.PI * 2)
      ctx.fill()
    }
    // Rivers running from the hills down to the sea.
    ctx.strokeStyle = '#4b9cf0'
    ctx.lineCap = 'round'
    for (const [a, bend] of [[1.62, 0.12], [2.05, -0.1], [3.62, 0.08]]) {
      ctx.lineWidth = R * 0.008
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * R * 0.97, Math.sin(a) * R * 0.97)
      ctx.bezierCurveTo(
        Math.cos(a + bend) * R * 0.85, Math.sin(a + bend) * R * 0.85,
        Math.cos(a - bend) * R * 0.7, Math.sin(a - bend) * R * 0.7,
        Math.cos(a + bend * 0.5) * R * 0.48, Math.sin(a + bend * 0.5) * R * 0.48,
      )
      ctx.stroke()
    }
    polarCap(ctx, R, 0.2, '#f4f8ff', '#dbe7f7')
    // Cloud swirls drifting over the face.
    ctx.rotate(time * 0.012)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)'
    ctx.lineCap = 'round'
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + hash(i) * 0.6
      const d = R * (0.3 + hash(i, 1) * 0.45)
      ctx.lineWidth = Math.min(R * (0.02 + hash(i, 2) * 0.025), 12)
      ctx.beginPath()
      ctx.arc(Math.cos(a) * d * 0.4, Math.sin(a) * d * 0.4, d, a, a + 0.5 + hash(i, 5) * 0.6)
      ctx.stroke()
    }
  } else if (world.name === 'Mars') {
    ctx.fillStyle = 'rgba(140, 50, 25, 0.35)'
    for (let i = 0; i < 9; i++) {
      const a = hash(i, 7) * Math.PI * 2
      const d = R * (0.25 + hash(i, 8) * 0.55)
      ctx.beginPath()
      ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d, R * (0.08 + hash(i, 9) * 0.1), R * 0.05, a, 0, Math.PI * 2)
      ctx.fill()
    }
    // Valles Marineris as a dark scar across the face.
    ctx.strokeStyle = 'rgba(110, 40, 20, 0.6)'
    ctx.lineWidth = R * 0.02
    ctx.beginPath()
    ctx.moveTo(Math.cos(3.25) * R * 0.95, Math.sin(3.25) * R * 0.95)
    ctx.quadraticCurveTo(Math.cos(3.4) * R * 0.6, Math.sin(3.4) * R * 0.6, Math.cos(3.6) * R * 0.42, Math.sin(3.6) * R * 0.42)
    ctx.stroke()
    polarCap(ctx, R, 0.16, '#f6ece6', '#e6d2c8')
  } else if (world.name === 'Mercury') {
    for (let i = 0; i < 26; i++) {
      const a = hash(i, 11) * Math.PI * 2
      const d = R * Math.sqrt(hash(i, 12)) * 0.92
      const r = R * (0.03 + hash(i, 13) ** 2 * 0.1)
      ctx.fillStyle = 'rgba(70, 64, 58, 0.28)'
      ctx.beginPath()
      ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(210, 204, 196, 0.35)'
      ctx.lineWidth = Math.max(1, r * 0.18)
      ctx.beginPath()
      ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r, -2.4, -0.4)
      ctx.stroke()
    }
    // Bright rays from a young crater.
    ctx.strokeStyle = 'rgba(235, 230, 222, 0.22)'
    ctx.lineWidth = R * 0.008
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(R * 0.2, -R * 0.15)
      ctx.lineTo(R * 0.2 + Math.cos(a) * R * 0.45, -R * 0.15 + Math.sin(a) * R * 0.45)
      ctx.stroke()
    }
  } else if (world.name === 'Venus') {
    // The clouds hide the ground: a slow polar vortex of yellow cloud streaks.
    ctx.rotate(time * 0.11 - spin)
    ctx.lineCap = 'round'
    for (let i = 0; i < 14; i++) {
      const d = R * (0.12 + i * 0.065)
      ctx.strokeStyle = i % 2 ? 'rgba(246, 214, 150, 0.6)' : 'rgba(214, 160, 84, 0.45)'
      ctx.lineWidth = R * 0.035
      ctx.beginPath()
      ctx.arc(R * 0.04 * Math.sin(i), 0, d, i * 0.7, i * 0.7 + 2.4 + hash(i) * 1.5)
      ctx.stroke()
    }
  }
  ctx.restore()
}

function polarCap(ctx: CanvasRenderingContext2D, R: number, size: number, color: string, shade: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i <= 20; i++) {
    const a = (i / 20) * Math.PI * 2
    const r = R * size * (0.85 + 0.15 * Math.sin(a * 4) + 0.06 * Math.sin(a * 9))
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  ctx.fill()
  ctx.fillStyle = shade
  ctx.beginPath()
  ctx.ellipse(R * size * 0.2, R * size * 0.2, R * size * 0.45, R * size * 0.3, 0.6, 0, Math.PI * 2)
  ctx.fill()
}

/** A continent seen from above the pole: hugging the horizon, with a coast that curves in and out. */
function continentPath(R: number, A0: number, A1: number, seed: number) {
  const p = new Path2D()
  const steps = Math.max(12, Math.round((A1 - A0) * 30))
  for (let i = 0; i <= steps; i++) {
    const a = A0 - 0.03 + ((A1 - A0 + 0.06) * i) / steps
    if (i === 0) p.moveTo(Math.cos(a) * R * 1.05, Math.sin(a) * R * 1.05)
    else p.lineTo(Math.cos(a) * R * 1.05, Math.sin(a) * R * 1.05)
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps
    const a = A0 + (A1 - A0) * t
    const env = Math.min(1, Math.sin(Math.PI * t) * 2.6) ** 0.7
    const depth = (0.4 + 0.1 * Math.sin(a * 5 + seed) + 0.06 * Math.sin(a * 11 + seed * 2) + 0.03 * Math.sin(a * 23 + seed)) * env
    const r = R * (1 - depth)
    p.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  p.closePath()
  return p
}

/** Where one biome meets the next: a border that wanders as it heads inland. */
const border = (a: number, r: number, R: number) => a + 0.06 * Math.sin((r / R) * 9 + a * 3) + 0.025 * Math.sin((r / R) * 23 + a * 7)

function biomePath(R: number, a0: number, a1: number) {
  const p = new Path2D()
  const steps = Math.max(6, Math.round((a1 - a0) * 24))
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps
    if (i === 0) p.moveTo(Math.cos(a) * R * 1.06, Math.sin(a) * R * 1.06)
    else p.lineTo(Math.cos(a) * R * 1.06, Math.sin(a) * R * 1.06)
  }
  for (let i = 12; i >= 0; i--) {
    const r = (R * 1.06 * i) / 12
    const a = border(a1, r, R)
    p.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  for (let i = 0; i <= 12; i++) {
    const r = (R * 1.06 * i) / 12
    const a = border(a0, r, R)
    p.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  p.closePath()
  return p
}

/** Detail on one biome of the face, scattered (deterministically) across its stretch. */
function paintBiome(ctx: CanvasRenderingContext2D, tex: NonNullable<Ground['tex']>, R: number, a0: number, a1: number, seed: number) {
  const span = (a1 - a0) / (Math.PI / 180)
  const at = (i: number, k: number, inner = 0.42) => {
    const a = a0 - 0.05 + (a1 - a0 + 0.1) * hash(i, seed * 31 + k)
    const d = R * (inner + (1 - inner) * Math.sqrt(hash(i, seed * 31 + k + 1)))
    return { a, d, x: Math.cos(a) * d, y: Math.sin(a) * d }
  }
  ctx.lineCap = 'round'
  if (tex === 'trees' || tex === 'jungle') {
    const n = Math.round(span * (tex === 'jungle' ? 3.2 : 2.6))
    const dark = tex === 'jungle' ? '#26894a' : '#24693c'
    const light = tex === 'jungle' ? '#5cc86a' : '#4a9a58'
    for (let i = 0; i < n; i++) {
      const { x, y } = at(i, 1)
      const r = R * (0.011 + hash(i, seed + 3) * 0.012)
      ctx.fillStyle = dark
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = light
      ctx.beginPath()
      ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.5, 0, Math.PI * 2)
      ctx.fill()
    }
    if (tex === 'trees') {
      // Clearings with a lake.
      for (let i = 0; i < 2; i++) {
        const { x, y, a } = at(i, 9, 0.6)
        ctx.fillStyle = '#4b9cf0'
        ctx.beginPath()
        ctx.ellipse(x, y, R * 0.035, R * 0.02, a, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  } else if (tex === 'town') {
    const roofs = ['#d9644a', '#e8a050', '#c75a7c', '#f2f0e6']
    for (let i = 0; i < span * 2.4; i++) {
      const { x, y, a } = at(i, 2, 0.55)
      const s = R * (0.009 + hash(i, seed + 4) * 0.006)
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(a)
      ctx.fillStyle = roofs[i % roofs.length]
      ctx.fillRect(-s, -s * 0.7, s * 2, s * 1.4)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'
      ctx.fillRect(-s, 0, s * 2, s * 0.7)
      ctx.restore()
    }
    // Roads winding between the houses.
    ctx.strokeStyle = 'rgba(240, 232, 210, 0.7)'
    ctx.lineWidth = R * 0.005
    for (let i = 0; i < 3; i++) {
      const a = a0 + ((a1 - a0) * (i + 0.5)) / 3
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * R, Math.sin(a) * R)
      ctx.quadraticCurveTo(Math.cos(a + 0.05) * R * 0.8, Math.sin(a + 0.05) * R * 0.8, Math.cos(a - 0.02) * R * 0.6, Math.sin(a - 0.02) * R * 0.6)
      ctx.stroke()
    }
  } else if (tex === 'city') {
    const blocks = ['#c7cbd8', '#a9afc2', '#dfe3ee', '#8f96ab']
    // A grid of streets: rings and spokes.
    ctx.strokeStyle = 'rgba(70, 74, 92, 0.55)'
    ctx.lineWidth = R * 0.004
    for (let k = 0; k < 5; k++) {
      ctx.beginPath()
      ctx.arc(0, 0, R * (0.62 + k * 0.08), a0 - 0.1, a1 + 0.1)
      ctx.stroke()
    }
    for (let a = a0; a < a1; a += 0.06) {
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55)
      ctx.lineTo(Math.cos(a) * R * 1.02, Math.sin(a) * R * 1.02)
      ctx.stroke()
    }
    for (let i = 0; i < span * 4; i++) {
      const { x, y, a } = at(i, 3, 0.55)
      const s = R * (0.008 + hash(i, seed + 5) * 0.012)
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(a)
      ctx.fillStyle = blocks[i % blocks.length]
      ctx.fillRect(-s, -s, s * 2, s * 2)
      if (hash(i, seed + 6) > 0.6) {
        ctx.fillStyle = raw('#ffe48a')
        ctx.fillRect(-s * 0.3, -s * 0.3, s * 0.6, s * 0.6)
      }
      ctx.restore()
    }
    // A park.
    const pk = at(1, 12, 0.7)
    ctx.fillStyle = '#5fbf68'
    ctx.beginPath()
    ctx.ellipse(pk.x, pk.y, R * 0.03, R * 0.022, pk.a, 0, Math.PI * 2)
    ctx.fill()
  } else if (tex === 'fields') {
    const crops = ['#c9d86a', '#e6d06c', '#8cc35a', '#b7d47a', '#d9b25c']
    for (let i = 0; i < span * 1.6; i++) {
      const { x, y, a } = at(i, 4, 0.5)
      const w = R * (0.03 + hash(i, seed + 7) * 0.025)
      const h = R * (0.018 + hash(i, seed + 8) * 0.015)
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(a + (hash(i, seed + 9) - 0.5) * 0.5)
      ctx.fillStyle = crops[i % crops.length]
      ctx.fillRect(-w / 2, -h / 2, w, h)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
      ctx.lineWidth = Math.max(0.5, R * 0.002)
      for (let k = 1; k < 4; k++) {
        ctx.beginPath()
        ctx.moveTo(-w / 2, -h / 2 + (h * k) / 4)
        ctx.lineTo(w / 2, -h / 2 + (h * k) / 4)
        ctx.stroke()
      }
      ctx.restore()
    }
  } else if (tex === 'peaks') {
    const n = Math.round(span * 0.9)
    for (let i = 0; i < n; i++) {
      const { x, y, a } = at(i, 5, 0.5)
      const s = R * (0.025 + hash(i, seed + 10) * 0.03)
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(a + hash(i, seed + 11))
      // A peak from above: four faces meeting at the summit, lit from one side.
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)'
      ctx.beginPath()
      ctx.moveTo(-s, 0)
      ctx.lineTo(0, -s * 0.7)
      ctx.lineTo(0, 0)
      ctx.lineTo(0, s * 0.6)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(20, 16, 50, 0.22)'
      ctx.beginPath()
      ctx.moveTo(s, 0)
      ctx.lineTo(0, -s * 0.7)
      ctx.lineTo(0, 0)
      ctx.lineTo(0, s * 0.6)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#f4f8ff'
      ctx.beginPath()
      ctx.moveTo(-s * 0.3, 0)
      ctx.lineTo(0, -s * 0.22)
      ctx.lineTo(s * 0.3, 0)
      ctx.lineTo(0, s * 0.18)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
  } else if (tex === 'dunes') {
    ctx.strokeStyle = 'rgba(150, 90, 30, 0.28)'
    ctx.lineWidth = R * 0.006
    for (let i = 0; i < span * 1.1; i++) {
      const { x, y, a } = at(i, 6, 0.45)
      const r = R * (0.02 + hash(i, seed + 12) * 0.03)
      ctx.beginPath()
      ctx.arc(x, y, r, a + 0.4, a + 1.9)
      ctx.stroke()
    }
  } else if (tex === 'ice') {
    ctx.strokeStyle = 'rgba(140, 180, 230, 0.5)'
    ctx.lineWidth = R * 0.004
    for (let i = 0; i < span * 0.8; i++) {
      const { x, y, a } = at(i, 7, 0.5)
      const l = R * (0.03 + hash(i, seed + 13) * 0.04)
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(a + 1.2) * l, y + Math.sin(a + 1.2) * l)
      ctx.lineTo(x + Math.cos(a + 0.6) * l * 1.6, y + Math.sin(a + 0.6) * l * 1.6)
      ctx.stroke()
    }
  } else if (tex === 'craters') {
    for (let i = 0; i < span * 0.35; i++) {
      const { x, y } = at(i, 8, 0.3)
      const r = R * (0.015 + hash(i, seed + 14) ** 2 * 0.05)
      ctx.fillStyle = 'rgba(50, 24, 16, 0.2)'
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 235, 215, 0.28)'
      ctx.lineWidth = Math.max(1, r * 0.2)
      ctx.beginPath()
      ctx.arc(x, y, r, -2.5, -0.5)
      ctx.stroke()
    }
  }
}

/** The ground strip along the horizon: each biome's colour; oceans get waves. */
function drawHorizonGround(ctx: CanvasRenderingContext2D, world: World, cx: number, cy: number, R: number, u: number, spin: number, time: number) {
  for (const g of world.ground) {
    const a0 = (g.a0 * Math.PI) / 180 + spin
    const a1 = (g.a1 * Math.PI) / 180 + spin
    ctx.fillStyle = g.color
    ctx.beginPath()
    ctx.arc(cx, cy, R * 1.006, a0, a1)
    ctx.arc(cx, cy, R * 0.955, a1, a0, true)
    ctx.closePath()
    ctx.fill()
    if (g.ocean) {
      // Rolling wave crests.
      const step = (u * 0.9) / R
      for (let a = a0 + ((time * 0.04) % step); a < a1; a += step) {
        ctx.fillStyle = '#5aa8f0'
        ctx.beginPath()
        ctx.arc(cx + Math.cos(a) * R * 1.004, cy + Math.sin(a) * R * 1.004, u * 0.26, a + Math.PI, a + Math.PI * 2 + 0.0001)
        ctx.fill()
        if (hash(Math.floor(a * 40)) > 0.7) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'
          ctx.beginPath()
          ctx.arc(cx + Math.cos(a) * R * 1.012, cy + Math.sin(a) * R * 1.012, u * 0.08, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }
}

function drawClouds(
  ctx: CanvasRenderingContext2D,
  world: World,
  cx: number,
  cy: number,
  R: number,
  u: number,
  spin: number,
  time: number,
  litAt: (a: number) => number,
  w: number,
  h: number,
) {
  const cl = world.clouds!
  for (let i = 0; i < cl.count; i++) {
    const a = (i / cl.count) * Math.PI * 2 + hash(i, 21) * 0.4 + (cl.surfaceLocked ? spin : 0) + time * cl.speed
    const alt = R * (cl.alt + hash(i, 22) * cl.spread)
    const px = cx + Math.cos(a) * (R + alt)
    const py = cy + Math.sin(a) * (R + alt)
    if (px < -u * 10 || px > w + u * 10 || py < -u * 10 || py > h + u * 10) continue
    const lit = litAt(a)
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(a + Math.PI / 2)
    setLight(lit)
    cloud(ctx, u * cl.size, time, hash(i, 23), cl.color, cl.alpha)
    // Lightning out of the cloud base now and then.
    if (world.lightning && hash(Math.floor(time * 3), i) > 0.965) {
      ctx.strokeStyle = raw('#fff6a8')
      ctx.lineWidth = Math.max(1.5, u * 0.12)
      ctx.lineJoin = 'round'
      ctx.beginPath()
      let x = 0
      ctx.moveTo(0, 0)
      for (let k = 1; k <= 5; k++) {
        x += (hash(i, k, Math.floor(time * 3)) - 0.5) * u * 0.9
        ctx.lineTo(x, (alt * k) / 5)
      }
      ctx.stroke()
      const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, u * 3)
      gl.addColorStop(0, 'rgba(255, 246, 170, 0.6)')
      gl.addColorStop(1, 'rgba(255, 246, 170, 0)')
      ctx.fillStyle = gl
      ctx.beginPath()
      ctx.arc(0, 0, u * 3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
}

function drawBirds(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, u: number, spin: number, time: number, litAt: (a: number) => number) {
  for (let j = 0; j < 3; j++) {
    const a = spin + time * 0.07 * (1 + j * 0.35) + j * 2.2
    for (let i = 0; i < 5; i++) {
      const back = Math.abs(i - 2)
      const ba = a - (back * u * 0.9) / R
      const alt = R * (0.3 + j * 0.035) + back * u * 0.45 * (i < 2 ? 1 : -0.2)
      ctx.save()
      ctx.translate(cx + Math.cos(ba) * (R + alt), cy + Math.sin(ba) * (R + alt))
      ctx.rotate(ba + Math.PI / 2)
      setLight(litAt(ba))
      bird(ctx, u * 0.75, time, i * 0.13 + j)
      ctx.restore()
    }
  }
}

function drawPlanes(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, u: number, spin: number, time: number, litAt: (a: number) => number) {
  for (let j = 0; j < 2; j++) {
    const a = spin + time * 0.045 + j * 3.3
    const alt = R * (0.42 + j * 0.05)
    ctx.save()
    ctx.translate(cx + Math.cos(a) * (R + alt), cy + Math.sin(a) * (R + alt))
    ctx.rotate(a + Math.PI / 2)
    setLight(litAt(a))
    plane(ctx, u * 0.8)
    // Blinking nav light at night.
    if (litAt(a) < 0.45 && Math.sin(time * 6 + j) > 0.4) {
      ctx.fillStyle = raw('#ff4d4d')
      ctx.beginPath()
      ctx.arc(0, 0, u * 0.12, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
}

// ------------------------------------------------------------------ gas giants

function drawBands(ctx: CanvasRenderingContext2D, world: World, cx: number, cy: number, R: number, spin: number, time: number, lx: number, ly: number) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(world.faceTilt ?? 0)
  const drift = (speed: number) => time * speed + spin * 0.4
  for (const b of world.bands ?? []) {
    const top = (b.y - b.h / 2) * R
    const bottom = (b.y + b.h / 2) * R
    ctx.fillStyle = b.color
    ctx.beginPath()
    const steps = 40
    for (let i = 0; i <= steps; i++) {
      const x = -R + (2 * R * i) / steps
      const y = top + Math.sin((x / R) * 7 + drift(b.speed) * 6) * b.wave * R
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    for (let i = steps; i >= 0; i--) {
      const x = -R + (2 * R * i) / steps
      ctx.lineTo(x, bottom + Math.sin((x / R) * 6 - drift(b.speed) * 5 + 1) * b.wave * R)
    }
    ctx.closePath()
    ctx.fill()
    // Fine streaks running along inside the band.
    ctx.lineWidth = Math.max(1, R * 0.004)
    for (let k = 1; k <= 2; k++) {
      const yy = top + (bottom - top) * (k / 3)
      ctx.strokeStyle = k === 1 ? 'rgba(255, 255, 255, 0.13)' : 'rgba(60, 30, 20, 0.1)'
      ctx.beginPath()
      for (let i = 0; i <= 48; i++) {
        const x = -R + (2 * R * i) / 48
        const y = yy + Math.sin((x / R) * (9 + k * 4) + drift(b.speed) * (5 + k) + k) * b.wave * R * 0.7
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    // Eddies curling off the band edge, drifting with it.
    for (let k = 0; k < 7; k++) {
      const x = ((((hash(b.y * 10, k) * 2.8 + drift(b.speed) * 0.8) % 2.8) + 2.8) % 2.8) - 1.4
      const f = Math.sqrt(Math.max(0, 1 - x * x))
      if (f < 0.05) continue
      const ex = x * R
      const ew = R * (0.035 + hash(b.y * 10, k + 20) * 0.03) * f
      const eh = R * 0.014
      ctx.fillStyle = k % 2 ? 'rgba(255, 255, 255, 0.18)' : 'rgba(80, 40, 20, 0.12)'
      ctx.beginPath()
      ctx.ellipse(ex, top, ew, eh, 0, 0, Math.PI * 2)
      ctx.fill()
      // The curl: a hook of the band's own colour rolling over.
      ctx.strokeStyle = b.color
      ctx.lineWidth = Math.max(1, eh * 0.6)
      ctx.beginPath()
      ctx.ellipse(ex + ew * 0.2, top - eh * 0.2, ew * 0.55, eh * 0.9, 0, Math.PI * 0.9, Math.PI * 2.4)
      ctx.stroke()
    }
  }
  // Storms: travel across the face, squashed towards the edges like on a ball.
  for (const s of world.storms ?? []) {
    const x = ((((s.phase + drift(s.speed)) % 2.8) + 2.8) % 2.8) - 1.4
    const f = Math.sqrt(Math.max(0, 1 - x * x - s.y * s.y * 0.3))
    if (f <= 0.02) continue
    const sx = x * R
    const sy = s.y * R
    ctx.fillStyle = s.color
    ctx.beginPath()
    ctx.ellipse(sx, sy, s.rx * R * f, s.ry * R, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = s.color2
    ctx.globalAlpha = 0.7
    ctx.beginPath()
    ctx.ellipse(sx - s.rx * R * f * 0.12, sy - s.ry * R * 0.1, s.rx * R * f * 0.62, s.ry * R * 0.55, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    if (s.rx > 0.15) {
      // Big storms get a swirling core and a wake of turbulence.
      ctx.strokeStyle = 'rgba(120, 30, 20, 0.35)'
      ctx.lineWidth = R * 0.008
      ctx.beginPath()
      ctx.ellipse(sx, sy, s.rx * R * f * 0.35, s.ry * R * 0.3, 0, time * 0.8, time * 0.8 + 4.5)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
      ctx.beginPath()
      ctx.ellipse(sx + s.rx * R * f * 1.4, sy, s.rx * R * f * 0.6, s.ry * R * 0.4, 0, 2.6, 5.4)
      ctx.stroke()
    }
  }
  ctx.restore()

  // Saturn's rings cast a shadow band across the planet.
  if (world.ring && world.ring.style === 'broad') {
    const r = world.ring
    ctx.save()
    ctx.translate(cx - lx * R * 0.1, cy - ly * R * 0.1)
    ctx.rotate(r.tilt)
    ctx.strokeStyle = 'rgba(40, 25, 10, 0.22)'
    ctx.lineWidth = R * (r.outer - r.inner) * 0.18
    ctx.beginPath()
    ctx.ellipse(0, 0, R * (r.inner + 0.15), R * (r.inner + 0.15) * r.flat, 0, 0.15, Math.PI - 0.15)
    ctx.stroke()
    ctx.restore()
  }
}

function drawFaceLightning(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, lx: number, ly: number, time: number) {
  for (let i = 0; i < 6; i++) {
    if (hash(Math.floor(time * 2.5), i, 7) < 0.82) continue
    // A random spot on the night half.
    const a = Math.atan2(-ly, -lx) + (hash(i, Math.floor(time * 2.5)) - 0.5) * 2.2
    const d = R * (0.35 + hash(i, 3, Math.floor(time * 2.5)) * 0.55)
    const x = cx + Math.cos(a) * d
    const y = cy + Math.sin(a) * d
    const g = ctx.createRadialGradient(x, y, 0, x, y, R * 0.07)
    g.addColorStop(0, 'rgba(220, 235, 255, 0.85)')
    g.addColorStop(1, 'rgba(220, 235, 255, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, R * 0.07, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Ring sheets (Saturn), thin hoops (Uranus) or a faint band (Jupiter, Neptune). */
function drawRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, ring: Ring, half: 'back' | 'front', time: number) {
  const [from, to] = half === 'back' ? [Math.PI, Math.PI * 2] : [0, Math.PI]
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(ring.tilt)
  ctx.lineCap = 'butt'
  if (ring.style === 'broad') {
    const n = 22
    const step = (ring.outer - ring.inner) / n
    for (let i = 0; i < n; i++) {
      const rho = ring.inner + step * (i + 0.5)
      const k = i / n
      if (k > 0.66 && k < 0.73) continue // Cassini Division
      ctx.strokeStyle = i % 3 === 0 ? ring.color2 : ring.color
      ctx.globalAlpha = (k < 0.15 ? 0.35 : 0.65 + hash(i) * 0.3) * (half === 'front' ? 1 : 0.85)
      ctx.lineWidth = step * R * 1.08
      ctx.beginPath()
      ctx.ellipse(0, 0, rho * R, rho * R * ring.flat, 0, from, to)
      ctx.stroke()
    }
  } else if (ring.style === 'narrow') {
    for (let i = 0; i < 5; i++) {
      const rho = ring.inner + ((ring.outer - ring.inner) * i) / 4
      ctx.strokeStyle = i === 4 ? ring.color : ring.color2
      ctx.globalAlpha = i === 4 ? 0.85 : 0.45
      ctx.lineWidth = Math.max(1, R * (i === 4 ? 0.014 : 0.006))
      ctx.beginPath()
      ctx.ellipse(0, 0, rho * R, rho * R * ring.flat, 0, from, to)
      ctx.stroke()
    }
  } else {
    ctx.strokeStyle = ring.color
    ctx.globalAlpha = 0.2
    ctx.lineWidth = (ring.outer - ring.inner) * R
    ctx.beginPath()
    ctx.ellipse(0, 0, ((ring.inner + ring.outer) / 2) * R, ((ring.inner + ring.outer) / 2) * R * ring.flat, 0, from, to)
    ctx.stroke()
  }
  // Glinting ice chunks going round (inner ones faster).
  if (ring.style !== 'faint') {
    ctx.globalAlpha = 1
    for (let i = 0; i < 70; i++) {
      const rho = ring.inner + hash(i, 31) * (ring.outer - ring.inner)
      const a = hash(i, 32) * Math.PI * 2 + time * (0.35 / rho ** 1.5)
      const am = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
      if (half === 'back' ? am < Math.PI : am >= Math.PI) continue
      ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + 0.5 * hash(i, 33)})`
      ctx.beginPath()
      ctx.arc(Math.cos(a) * rho * R, Math.sin(a) * rho * R * ring.flat, Math.max(0.8, R * 0.004), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

// ------------------------------------------------------------------ the Sun

const granules = Array.from({ length: 460 }, (_, i) => ({ a: hash(i, 41) * Math.PI * 2, d: Math.sqrt(hash(i, 42)), r: 0.6 + hash(i, 43) * 0.8, bright: hash(i, 44) > 0.45 }))
const spots = [
  { a: 0.8, d: 0.45, r: 0.06 },
  { a: 1.0, d: 0.52, r: 0.035 },
  { a: 3.6, d: 0.3, r: 0.05 },
  { a: 5.1, d: 0.62, r: 0.04 },
]

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, spin: number, time: number, w: number, h: number) {
  // Corona and streamers.
  const co = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 2.8)
  co.addColorStop(0, 'rgba(255, 196, 90, 0.55)')
  co.addColorStop(0.3, 'rgba(255, 150, 70, 0.16)')
  co.addColorStop(1, 'rgba(255, 150, 70, 0)')
  ctx.fillStyle = co
  ctx.fillRect(Math.max(0, cx - R * 2.8), Math.max(0, cy - R * 2.8), Math.min(w, R * 5.6), Math.min(h, R * 5.6))
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(time * 0.01)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + hash(i, 51) * 0.3
    ctx.fillStyle = 'rgba(255, 210, 140, 0.07)'
    ctx.beginPath()
    ctx.moveTo(Math.cos(a - 0.12) * R, Math.sin(a - 0.12) * R)
    ctx.quadraticCurveTo(Math.cos(a) * R * 1.7, Math.sin(a) * R * 1.7, Math.cos(a + 0.02) * R * (2.6 + hash(i) * 0.8), Math.sin(a + 0.02) * R * (2.6 + hash(i) * 0.8))
    ctx.quadraticCurveTo(Math.cos(a + 0.04) * R * 1.7, Math.sin(a + 0.04) * R * 1.7, Math.cos(a + 0.14) * R, Math.sin(a + 0.14) * R)
    ctx.fill()
  }
  ctx.restore()

  // Solar wind streaming out.
  for (let i = 0; i < 110; i++) {
    const a = hash(i, 61) * Math.PI * 2 + time * 0.004
    const k = (time * (0.06 + hash(i, 62) * 0.05) + hash(i, 63)) % 1
    const d = R * (1.02 + k * 1.9)
    ctx.fillStyle = `rgba(255, 233, 168, ${0.55 * (1 - k)})`
    ctx.beginPath()
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, Math.max(0.8, R * 0.005), 0, Math.PI * 2)
    ctx.fill()
  }

  // Prominences behind the limb.
  drawProminences(ctx, cx, cy, R, spin, time)

  // The disc: bright centre, darker orange edge.
  const disc = ctx.createRadialGradient(cx - R * 0.1, cy - R * 0.1, 0, cx, cy, R)
  disc.addColorStop(0, '#fff3c4')
  disc.addColorStop(0.55, '#ffd24a')
  disc.addColorStop(0.9, '#ffab35')
  disc.addColorStop(1, '#ff8a2a')
  ctx.fillStyle = disc
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fill()

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.clip()
  ctx.translate(cx, cy)
  ctx.rotate(spin)
  // Granulation: a carpet of boiling cells.
  for (let i = 0; i < granules.length; i++) {
    const g = granules[i]
    const d = g.d * R
    const r = R * 0.034 * g.r * (1 + Math.sin(time * 2 + i) * 0.15) * Math.sqrt(1 - g.d * g.d * 0.7)
    ctx.fillStyle = g.bright ? 'rgba(255, 246, 200, 0.22)' : 'rgba(230, 120, 30, 0.14)'
    ctx.beginPath()
    ctx.arc(Math.cos(g.a) * d, Math.sin(g.a) * d, r, 0, Math.PI * 2)
    ctx.fill()
  }
  // Sunspots: dark umbra in a lighter penumbra, with bright faculae nearby.
  for (const s of spots) {
    const x = Math.cos(s.a) * s.d * R
    const y = Math.sin(s.a) * s.d * R
    ctx.fillStyle = 'rgba(255, 250, 220, 0.35)'
    ctx.beginPath()
    ctx.ellipse(x, y, s.r * R * 2.2, s.r * R * 1.6, s.a, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#b8571f'
    ctx.beginPath()
    ctx.ellipse(x, y, s.r * R * 1.25, s.r * R, s.a, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#5a2410'
    ctx.beginPath()
    ctx.ellipse(x, y, s.r * R * 0.65, s.r * R * 0.5, s.a, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // Spicules: a fringe of tiny jets all round the edge.
  ctx.strokeStyle = 'rgba(255, 150, 60, 0.55)'
  ctx.lineWidth = Math.max(1, R * 0.004)
  ctx.beginPath()
  for (let i = 0; i < 180; i++) {
    const a = (i / 180) * Math.PI * 2 + spin
    const len = R * (0.012 + hash(i, Math.floor(time * 3)) * 0.03)
    ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R)
    ctx.lineTo(cx + Math.cos(a) * (R + len), cy + Math.sin(a) * (R + len))
  }
  ctx.stroke()

  // A flare going off somewhere every few seconds.
  const cycle = time / 5.5
  const k = cycle % 1
  if (k < 0.35) {
    const a = hash(Math.floor(cycle), 71) * Math.PI * 2
    const x = cx + Math.cos(a) * R * 0.97
    const y = cy + Math.sin(a) * R * 0.97
    const r = R * (0.05 + k * 0.6)
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(255, 255, 240, ${0.9 * (1 - k / 0.35)})`)
    g.addColorStop(1, 'rgba(255, 220, 120, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawProminences(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, spin: number, time: number) {
  ctx.lineCap = 'round'
  for (let j = 0; j < 7; j++) {
    const a = (j / 7) * Math.PI * 2 + hash(j, 81) * 0.5 + spin
    const wdt = 0.08 + hash(j, 82) * 0.1
    const hgt = R * (0.12 + hash(j, 83) * 0.22) * (0.85 + Math.sin(time * 0.5 + j) * 0.15)
    const p0 = [cx + Math.cos(a - wdt) * R, cy + Math.sin(a - wdt) * R]
    const p2 = [cx + Math.cos(a + wdt) * R, cy + Math.sin(a + wdt) * R]
    const p1 = [cx + Math.cos(a) * (R + hgt * 2), cy + Math.sin(a) * (R + hgt * 2)]
    ctx.strokeStyle = 'rgba(255, 90, 60, 0.35)'
    ctx.lineWidth = R * 0.04
    ctx.beginPath()
    ctx.moveTo(p0[0], p0[1])
    ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1])
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255, 190, 110, 0.8)'
    ctx.lineWidth = R * 0.012
    ctx.beginPath()
    ctx.moveTo(p0[0], p0[1])
    ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1])
    ctx.stroke()
  }
}

// ------------------------------------------------------------------ moons and craft

/** Position on a tilted, flattened orbit (as multiples of R); front = nearer to us. */
function orbitPos(d: number, period: number, phase: number, time: number, flat: number, tilt: number) {
  const a = phase + (time / period) * Math.PI * 2
  const x0 = Math.cos(a) * d
  const y0 = Math.sin(a) * d * flat
  const dir = period < 0 ? -1 : 1
  // Direction of motion (for craft orientation).
  const dx0 = -Math.sin(a) * dir
  const dy0 = Math.cos(a) * flat * dir
  const ct = Math.cos(tilt)
  const st = Math.sin(tilt)
  return { x: x0 * ct - y0 * st, y: x0 * st + y0 * ct, dx: dx0 * ct - dy0 * st, dy: dx0 * st + dy0 * ct, front: Math.sin(a) > 0 }
}

function drawMoon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, m: Moon, lx: number, ly: number, time: number) {
  if (r < 0.6) return
  const seed = m.name.length * 7 + m.name.charCodeAt(0)
  if (m.haze) {
    const g = ctx.createRadialGradient(x, y, r * 0.9, x, y, r * 1.5)
    g.addColorStop(0, `rgba(${m.haze}, 0.55)`)
    g.addColorStop(1, `rgba(${m.haze}, 0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r * 1.5, 0, Math.PI * 2)
    ctx.fill()
  }
  if (m.plume) {
    // Geysers / volcanic umbrella spraying off the moon.
    ctx.save()
    ctx.translate(x, y)
    for (let i = 0; i < 7; i++) {
      const spread = (i - 3) * 0.16
      const len = r * (1.2 + hash(seed, i, Math.floor(time * 4)) * 0.7)
      ctx.strokeStyle = `rgba(${m.plume}, 0.35)`
      ctx.lineWidth = Math.max(1, r * 0.12)
      ctx.beginPath()
      ctx.moveTo(Math.sin(spread) * r * 0.6, r * 0.75)
      ctx.quadraticCurveTo(Math.sin(spread) * r * 1.4, r + len * 0.6, Math.sin(spread) * (r + len) * 0.9, r + len)
      ctx.stroke()
    }
    ctx.restore()
  }
  ctx.save()
  ctx.beginPath()
  if (m.lumpy) {
    for (let i = 0; i <= 14; i++) {
      const a = (i / 14) * Math.PI * 2
      const k = 0.78 + hash(seed, i % 14) * 0.32
      const px = x + Math.cos(a) * r * k * 1.15
      const py = y + Math.sin(a) * r * k * 0.9
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
  } else ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.closePath()
  ctx.fillStyle = m.color
  ctx.fill()
  ctx.clip()
  // Surface pattern.
  const pattern = m.pattern ?? 'craters'
  if (pattern === 'craters' || pattern === 'bigcrater') {
    for (let i = 0; i < 7; i++) {
      const a = hash(seed, i, 1) * Math.PI * 2
      const d = r * Math.sqrt(hash(seed, i, 2)) * 0.8
      ctx.fillStyle = m.color2
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.08 + hash(seed, i, 3) * 0.16), 0, Math.PI * 2)
      ctx.fill()
    }
    if (pattern === 'bigcrater') {
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.arc(x - r * 0.3, y - r * 0.15, r * 0.36, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = m.color
      ctx.beginPath()
      ctx.arc(x - r * 0.3, y - r * 0.15, r * 0.08, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (pattern === 'cracks') {
    ctx.strokeStyle = m.color2
    ctx.globalAlpha = 0.75
    ctx.lineWidth = Math.max(0.8, r * 0.06)
    for (let i = 0; i < 6; i++) {
      const a = hash(seed, i, 4) * Math.PI
      ctx.beginPath()
      ctx.moveTo(x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 1.1)
      ctx.quadraticCurveTo(x + (hash(seed, i, 5) - 0.5) * r, y + (hash(seed, i, 6) - 0.5) * r, x - Math.cos(a) * r * 1.1, y - Math.sin(a) * r * 1.1)
      ctx.stroke()
    }
  } else if (pattern === 'volcanoes') {
    for (let i = 0; i < 9; i++) {
      const a = hash(seed, i, 7) * Math.PI * 2
      const d = r * Math.sqrt(hash(seed, i, 8)) * 0.8
      ctx.fillStyle = ['#c0392b', '#2b2b2b', '#f6f0a8', m.color2][i % 4]
      ctx.globalAlpha = 0.75
      ctx.beginPath()
      ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.07 + hash(seed, i, 9) * 0.1), 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (pattern === 'patchwork') {
    for (let i = 0; i < 5; i++) {
      const a = hash(seed, i, 10) * Math.PI * 2
      ctx.fillStyle = i % 2 ? m.color2 : '#ffffff'
      ctx.globalAlpha = i % 2 ? 0.6 : 0.25
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.arc(x, y, r * 1.1, a, a + 0.6 + hash(seed, i, 11))
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
  // Night side.
  ctx.fillStyle = 'rgba(14, 10, 44, 0.55)'
  ctx.beginPath()
  ctx.arc(x - lx * r * 0.7, y - ly * r * 0.7, r * 1.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  // Name tag.
  if (r > 2.5) {
    ctx.font = '600 11px ui-rounded, "SF Pro Rounded", Nunito, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)'
    ctx.fillText(m.name, x, y + r * (m.plume ? 2.4 : 1.15) + 5)
  }
}

function drawCraft(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, k: Craft, dx: number, dy: number) {
  const s = Math.max(2.2, R * 0.014)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(Math.atan2(dy, dx))
  setLight(1)
  if (k.kind === 'station') station(ctx, s)
  else if (k.kind === 'tri') probe(ctx, s, 'tri')
  else if (k.kind === 'telescope') {
    ctx.fillStyle = c('#d6d9e2')
    ctx.fillRect(-1.1 * s, -0.35 * s, 2.2 * s, 0.7 * s)
    ctx.fillStyle = c('#3d4a6b')
    ctx.fillRect(1.05 * s, -0.3 * s, 0.2 * s, 0.6 * s)
    ctx.fillStyle = c('#4b5d8f')
    ctx.fillRect(-0.5 * s, -1.2 * s, 0.4 * s, 0.75 * s)
    ctx.fillRect(-0.5 * s, 0.45 * s, 0.4 * s, 0.75 * s)
  } else if (k.kind === 'shield') {
    // Parker Solar Probe: a white heat shield facing the Sun, the probe tucked behind it.
    ctx.fillStyle = c('#f4f4f8')
    ctx.beginPath()
    ctx.ellipse(-0.2 * s, 0, 0.25 * s, 1.0 * s, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = c('#3d4a6b')
    ctx.fillRect(0, -0.35 * s, 1.0 * s, 0.7 * s)
    ctx.fillStyle = c('#4b5d8f')
    ctx.fillRect(0.3 * s, -0.9 * s, 0.4 * s, 0.5 * s)
    ctx.fillRect(0.3 * s, 0.4 * s, 0.4 * s, 0.5 * s)
  } else probe(ctx, s, 'wings')
  ctx.restore()
  ctx.font = '600 10px ui-rounded, "SF Pro Rounded", Nunito, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
  ctx.fillText(k.name, x, y + s * 2.2 + 3)
}

// ------------------------------------------------------------------ the alien

function drawInspectAlien(ctx: CanvasRenderingContext2D, w: number, h: number, st: InspectState, world: World, time: number) {
  const p = alienPose(w, h, st, time)
  // Every 16 s it beams something up from the surface for 5 s.
  const cycle = time % 16
  const beam = smooth(9, 9.6, cycle) * (1 - smooth(13.4, 14, cycle))
  if (beam > 0.01 && world.kind !== 'star') {
    const spread = p.u * 1.1
    drawBeam(ctx, p.x, p.y, p.gx, p.gy, p.u, spread, time, beam)
    // Something rising in the beam: a cow on Earth, a rock elsewhere, a puff of gas on giants.
    const k = smooth(9.4, 13.6, cycle)
    if (k > 0 && k < 0.97) {
      const ix = p.gx + (p.x - p.gx) * k
      const iy = p.gy + (p.y - p.gy) * k
      ctx.save()
      ctx.translate(ix, iy)
      ctx.rotate(p.a + Math.PI / 2 + Math.sin(time * 3) * 0.4)
      setLight(1)
      const s = p.u * 0.3
      if (world.name === 'Earth') cow(ctx, s, time)
      else if (world.kind === 'rock') rock(ctx, s * 1.2, time, 0.6, world.ground[0]?.color ?? '#9b8f85')
      else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.beginPath()
        ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
  }
  const look = beam > 0.2 ? p.a : Math.atan2(h * 0.55 - p.y, w / 2 - p.x)
  drawSaucer(ctx, p.x, p.y, p.u, { lean: Math.sin(time * 0.11 + 1.5) * -0.15, spin: st.alien.spin, look }, time)
  if (st.alien.say) drawBubble(ctx, st.alien.say, st.alien.sayT, p.x, p.y, p.u, w, h, 5)
}
