import { BELT } from './planets'
import { G, type Body, type Burst } from './sim'

/**
 * Flat, bold, softly glowing - the Kurzgesagt look on a plain 2D canvas: deep blue-purple
 * space, layered twinkling stars, planets as flat discs with a crescent shadow away from
 * their sun and a thin rim of light, and little faces that look where they're going.
 */

export interface Camera {
  x: number
  y: number
  zoom: number
}

export interface View {
  ctx: CanvasRenderingContext2D
  w: number
  h: number
  cam: Camera
  time: number
  trails: boolean
  faces: boolean
  names: boolean
}

interface BgStar {
  x: number
  y: number
  r: number
  depth: number
  phase: number
}

const bgStars: BgStar[] = Array.from({ length: 420 }, () => ({
  x: Math.random(),
  y: Math.random(),
  r: 0.4 + Math.random() ** 3 * 1.8,
  depth: 0.04 + Math.random() * 0.22,
  phase: Math.random() * Math.PI * 2,
}))

const nebulae = [
  { x: 0.18, y: 0.25, r: 0.55, color: '255, 92, 168' },
  { x: 0.82, y: 0.7, r: 0.6, color: '80, 140, 255' },
  { x: 0.6, y: 0.15, r: 0.35, color: '120, 230, 220' },
]

export function drawBackground({ ctx, w, h, cam, time }: View) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#0d1033')
  g.addColorStop(1, '#22134a')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  const size = Math.max(w, h)
  for (const n of nebulae) {
    // Nebulae drift very slightly with the camera, far behind everything.
    const nx = n.x * w - cam.x * 0.02
    const ny = n.y * h - cam.y * 0.02
    const rg = ctx.createRadialGradient(nx, ny, 0, nx, ny, n.r * size)
    rg.addColorStop(0, `rgba(${n.color}, 0.16)`)
    rg.addColorStop(1, `rgba(${n.color}, 0)`)
    ctx.fillStyle = rg
    ctx.fillRect(0, 0, w, h)
  }

  ctx.fillStyle = '#ffffff'
  for (const s of bgStars) {
    // Parallax: nearer layers slide more as the camera pans.
    const px = (((s.x * w - cam.x * s.depth) % w) + w) % w
    const py = (((s.y * h - cam.y * s.depth) % h) + h) % h
    ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * (1 + s.depth * 6) + s.phase))
    ctx.beginPath()
    ctx.arc(px, py, s.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

const toScreen = (v: View, x: number, y: number): [number, number] => [
  (x - v.cam.x) * v.cam.zoom + v.w / 2,
  (y - v.cam.y) * v.cam.zoom + v.h / 2,
]

export function drawTrails(v: View, bodies: Body[]) {
  if (!v.trails) return
  const { ctx } = v
  ctx.lineCap = 'round'
  for (const b of bodies) {
    const t = b.trail
    if (t.length < 4) continue
    const n = t.length / 2
    ctx.strokeStyle = b.color
    ctx.lineWidth = Math.max(1, Math.min(3, b.r * v.cam.zoom * 0.25))
    // Fade in from the tail: draw in a few chunks of rising opacity.
    const chunks = 6
    for (let c = 0; c < chunks; c++) {
      const from = Math.floor((c * n) / chunks)
      const to = Math.min(n - 1, Math.floor(((c + 1) * n) / chunks))
      ctx.globalAlpha = ((c + 1) / chunks) * 0.45
      ctx.beginPath()
      let [sx, sy] = toScreen(v, t[from * 2], t[from * 2 + 1])
      ctx.moveTo(sx, sy)
      for (let i = from + 1; i <= to; i++) {
        ;[sx, sy] = toScreen(v, t[i * 2], t[i * 2 + 1])
        ctx.lineTo(sx, sy)
      }
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1
}

/** The dashed "where it'll go" line while aiming a throw. */
export function drawPrediction(v: View, path: number[], color: string) {
  const { ctx } = v
  ctx.save()
  ctx.setLineDash([2, 9])
  ctx.lineCap = 'round'
  ctx.lineWidth = 2.5
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.85
  ctx.beginPath()
  for (let i = 0; i < path.length; i += 2) {
    const [sx, sy] = toScreen(v, path[i], path[i + 1])
    if (i === 0) ctx.moveTo(sx, sy)
    else ctx.lineTo(sx, sy)
  }
  ctx.stroke()
  ctx.restore()
}

/** The pull-back band from where you grabbed to where the pointer is. */
export function drawAim(v: View, from: [number, number], to: [number, number]) {
  const { ctx } = v
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(from[0], from[1])
  ctx.lineTo(to[0], to[1])
  ctx.stroke()
  ctx.restore()
}

/** Pop-in scale for new and freshly merged bodies: a little overshoot, Kurzgesagt-bouncy. */
function popScale(age: number) {
  if (age > 0.6) return 1
  const k = age / 0.6
  return 1 + Math.sin(k * Math.PI * 2.5) * 0.18 * (1 - k)
}

export function drawBody(v: View, b: Body, light: Body | null) {
  const { ctx, time } = v
  const [sx, sy] = toScreen(v, b.x, b.y)
  // Named worlds never shrink below a few pixels, so the whole system stays readable zoomed out.
  const r = Math.max(b.name ? 3 : 0, b.r * v.cam.zoom) * popScale(b.age)
  if (sx < -r * 4 || sy < -r * 4 || sx > v.w + r * 4 || sy > v.h + r * 4) return

  if (b.kind === 'star') return drawStar(v, b, sx, sy, r)

  // Direction towards the light.
  let lx = -0.6
  let ly = -0.8
  if (light) {
    const d = Math.hypot(light.x - b.x, light.y - b.y) || 1
    lx = (light.x - b.x) / d
    ly = (light.y - b.y) / d
  }

  if (b.ring) drawRing(ctx, b, sx, sy, r, 'back')

  ctx.save()
  ctx.beginPath()
  ctx.arc(sx, sy, r, 0, Math.PI * 2)
  ctx.fillStyle = b.color
  ctx.fill()
  ctx.clip()

  if (b.kind === 'gas') {
    // Bands, gently tilted per planet.
    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate((b.seed - 0.5) * 0.6)
    ctx.fillStyle = b.color2
    for (let k = -3; k <= 3; k++) {
      const y = k * r * 0.32 + Math.sin(k * 3.1 + b.seed * 9) * r * 0.05
      ctx.globalAlpha = k % 2 ? 0.55 : 0.85
      ctx.fillRect(-r, y - r * 0.07, r * 2, r * 0.13 + (k === 1 ? r * 0.08 : 0))
    }
    ctx.restore()
  } else if (b.kind === 'moon' || b.kind === 'rock') {
    // A couple of craters / continents.
    ctx.fillStyle = b.color2
    for (let k = 0; k < 3; k++) {
      const a = b.seed * 40 + k * 2.1
      const d = r * (0.25 + ((b.seed * 7 + k * 0.37) % 0.4))
      ctx.globalAlpha = b.kind === 'moon' ? 0.8 : 0.6
      ctx.beginPath()
      ctx.arc(sx + Math.cos(a) * d, sy + Math.sin(a) * d, r * (b.kind === 'moon' ? 0.2 : 0.32 - k * 0.06), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  // Night side: a big dark disc offset away from the light leaves a lit crescent.
  ctx.fillStyle = 'rgba(16, 10, 48, 0.42)'
  ctx.beginPath()
  ctx.arc(sx - lx * r * 0.55, sy - ly * r * 0.55, r * 1.05, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Rim light on the sunny edge.
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 244, 214, 0.75)'
  ctx.lineWidth = Math.max(1, r * 0.09)
  ctx.lineCap = 'round'
  const la = Math.atan2(ly, lx)
  ctx.beginPath()
  ctx.arc(sx, sy, r * 0.94, la - 0.9, la + 0.9)
  ctx.stroke()
  ctx.restore()

  if (v.faces && r > 7) drawFace(v, b, sx, sy, r, time)
  if (b.ring) drawRing(ctx, b, sx, sy, r, 'front')
}

function drawStar(v: View, b: Body, sx: number, sy: number, r: number) {
  const { ctx, time } = v
  // Soft halo + slowly breathing corona.
  const pulse = 1 + Math.sin(time * 1.6 + b.seed * 10) * 0.04
  const halo = ctx.createRadialGradient(sx, sy, r * 0.6, sx, sy, r * 4.2 * pulse)
  halo.addColorStop(0, b.color + 'aa')
  halo.addColorStop(0.35, b.color + '33')
  halo.addColorStop(1, b.color + '00')
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(sx, sy, r * 4.2 * pulse, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = b.color
  ctx.beginPath()
  ctx.arc(sx, sy, r * 1.12 * pulse, 0, Math.PI * 2)
  ctx.globalAlpha = 0.5
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.beginPath()
  ctx.arc(sx, sy, r, 0, Math.PI * 2)
  ctx.fill()
  // Bright core.
  ctx.fillStyle = b.color2
  ctx.beginPath()
  ctx.arc(sx - r * 0.18, sy - r * 0.18, r * 0.62, 0, Math.PI * 2)
  ctx.fill()
  if (v.faces) drawFace(v, b, sx, sy, r, time)
}

/** Two round eyes that look where the body is heading, blinking every few seconds. */
function drawFace(v: View, b: Body, sx: number, sy: number, r: number, time: number) {
  const { ctx } = v
  const speed = Math.hypot(b.vx, b.vy) || 1
  const lookX = b.kind === 'star' ? 0 : (b.vx / speed) * 0.35
  const lookY = b.kind === 'star' ? 0.1 : (b.vy / speed) * 0.35
  const period = 3 + b.seed * 3
  const blinkPhase = (time + b.seed * 10) % period
  const open = blinkPhase < 0.14 ? Math.abs(blinkPhase - 0.07) / 0.07 : 1
  const eyeR = r * 0.2
  const gap = r * 0.32
  for (const side of [-1, 1]) {
    const ex = sx + side * gap + lookX * r * 0.25
    const ey = sy - r * 0.08 + lookY * r * 0.25
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.ellipse(ex, ey, eyeR, eyeR * Math.max(0.08, open), 0, 0, Math.PI * 2)
    ctx.fill()
    if (open > 0.3) {
      ctx.fillStyle = '#1b1240'
      ctx.beginPath()
      ctx.arc(ex + lookX * eyeR * 0.9, ey + lookY * eyeR * 0.9, eyeR * 0.55, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

export function drawBursts(v: View, bursts: Burst[]) {
  const { ctx } = v
  for (const p of bursts) {
    const [sx, sy] = toScreen(v, p.x, p.y)
    const k = p.t / 0.7
    const r = p.size * v.cam.zoom * (0.6 + k * 2.2)
    ctx.globalAlpha = Math.max(0, 1 - k)
    ctx.strokeStyle = p.color
    ctx.lineWidth = Math.max(1.5, 5 * (1 - k))
    ctx.beginPath()
    ctx.arc(sx, sy, r, 0, Math.PI * 2)
    ctx.stroke()
    // A few flecks flying out.
    ctx.fillStyle = p.color
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + p.size
      ctx.beginPath()
      ctx.arc(sx + Math.cos(a) * r * 1.2, sy + Math.sin(a) * r * 1.2, Math.max(1, 3 * (1 - k)), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}

/** Saturn's broad tilted rings / Uranus's thin, nearly upright one: back half, then front. */
function drawRing(ctx: CanvasRenderingContext2D, b: Body, sx: number, sy: number, r: number, half: 'back' | 'front') {
  const wide = b.ring === 'wide'
  const rot = wide ? -0.32 : 1.3
  const [from, to] = half === 'back' ? [Math.PI, Math.PI * 2] : [0, Math.PI]
  ctx.save()
  ctx.lineCap = 'butt'
  const bands = wide
    ? [
        { k: 1.55, w: 0.28, a: 0.85 },
        { k: 1.9, w: 0.3, a: 0.6 },
        { k: 2.2, w: 0.14, a: 0.45 },
      ]
    : [{ k: 1.75, w: 0.08, a: 0.7 }]
  for (const band of bands) {
    ctx.strokeStyle = b.color2
    ctx.globalAlpha = band.a
    ctx.lineWidth = Math.max(1, r * band.w)
    ctx.beginPath()
    ctx.ellipse(sx, sy, r * band.k, r * band.k * (wide ? 0.3 : 0.22), rot, from, to)
    ctx.stroke()
  }
  ctx.restore()
}

/** Names under the real planets. */
export function drawLabel(v: View, b: Body) {
  if (!v.names || !b.name) return
  const [sx, sy] = toScreen(v, b.x, b.y)
  const r = b.r * v.cam.zoom
  // Zoomed out, the Sun needs no name (and it would sit on Mercury's).
  if (b.kind === 'star' && r < 40) return
  if (sx < -60 || sy < -60 || sx > v.w + 60 || sy > v.h + 60) return
  const { ctx } = v
  ctx.save()
  ctx.font = '600 14px Fredoka, ui-rounded, "SF Pro Rounded", Nunito, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const ly = sy + Math.max(r, 3) * (b.ring === 'wide' ? 1.4 : 1) + (b.kind === 'star' ? r * 0.4 : 0) + 8
  // A dark halo keeps the name readable over the Sun's glow and the asteroid belt.
  ctx.lineJoin = 'round'
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(13, 16, 51, 0.8)'
  ctx.strokeText(b.name, sx, ly)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.fillText(b.name, sx, ly)
  ctx.restore()
}

/** Asteroid belt: a loose ring of small rocks drifting round the Sun (decoration only). */
const belt = Array.from({ length: BELT.count }, () => ({
  d: BELT.inner + Math.random() * (BELT.outer - BELT.inner),
  a: Math.random() * Math.PI * 2,
  s: 0.8 + Math.random() * 1.8,
  shade: Math.random(),
}))

export function drawBelt(v: View, sun: Body, simTime: number) {
  const { ctx } = v
  for (const p of belt) {
    // Kepler: inner rocks go round faster.
    const a = p.a + simTime * Math.sqrt((G * sun.m) / p.d) / p.d
    const [sx, sy] = toScreen(v, sun.x + Math.cos(a) * p.d, sun.y + Math.sin(a) * p.d)
    if (sx < -4 || sy < -4 || sx > v.w + 4 || sy > v.h + 4) continue
    ctx.fillStyle = p.shade > 0.5 ? '#a99f96' : '#857a8f'
    ctx.beginPath()
    ctx.arc(sx, sy, Math.max(0.8, p.s * v.cam.zoom), 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Faint circles showing each planet's path round the Sun; the hovered/selected one brighter. */
export function drawOrbits(v: View, sun: Body, radii: { d: number; bright: boolean }[]) {
  const { ctx } = v
  const [sx, sy] = toScreen(v, sun.x, sun.y)
  ctx.save()
  for (const o of radii) {
    ctx.strokeStyle = o.bright ? 'rgba(255, 255, 255, 0.32)' : 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = o.bright ? 1.6 : 1
    ctx.beginPath()
    ctx.arc(sx, sy, o.d * v.cam.zoom, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}

/** A soft ring around the planet under the pointer. */
export function drawHover(v: View, b: Body, time: number) {
  const { ctx } = v
  const [sx, sy] = toScreen(v, b.x, b.y)
  const r = Math.max(b.r * v.cam.zoom, 6) + 6 + Math.sin(time * 4) * 1.5
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 5])
  ctx.lineDashOffset = -time * 12
  ctx.beginPath()
  ctx.arc(sx, sy, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}
