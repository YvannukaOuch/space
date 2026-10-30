import { c, hash, isDark, raw } from './kit'

/**
 * More things that live on planet horizons (same conventions as kit.ts: ground at y = 0,
 * up is -y, `s` = size unit in px, colours through `c()` so night dims them).
 */

type Ctx = CanvasRenderingContext2D

const poly = (ctx: Ctx, pts: number[]) => {
  ctx.beginPath()
  ctx.moveTo(pts[0], pts[1])
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
  ctx.closePath()
  ctx.fill()
}

// ------------------------------------------------------------------ more Earth life

/** A rocket on its pad that launches every so often (cycle ~45 s), then a new one rolls out. */
export function rocket(ctx: Ctx, s: number, t: number, v: number) {
  const cycle = (t / 45 + v) % 1
  // Launch tower stays put.
  ctx.strokeStyle = c('#8a93a8')
  ctx.lineWidth = 0.08 * s
  ctx.beginPath()
  ctx.moveTo(-0.9 * s, 0)
  ctx.lineTo(-0.9 * s, -3.6 * s)
  for (let k = 1; k < 8; k++) {
    ctx.moveTo(-1.15 * s, -k * 0.45 * s)
    ctx.lineTo(-0.65 * s, -k * 0.45 * s)
  }
  ctx.stroke()
  ctx.fillStyle = c('#5b6378')
  ctx.fillRect(-1.3 * s, -0.15 * s, 2.6 * s, 0.2 * s)
  const ignite = cycle > 0.55
  const rise = cycle > 0.62 ? Math.pow((cycle - 0.62) / 0.38, 2.2) * 60 * s : 0
  if (cycle > 0.97) return
  // Smoke billowing at the pad.
  if (ignite && cycle < 0.85) {
    for (let i = 0; i < 7; i++) {
      const k = hash(i, v)
      ctx.fillStyle = c('#eceef4', 0.75)
      ctx.beginPath()
      ctx.arc((k - 0.5) * 3.4 * s, -0.4 * s - hash(i, 2) * 0.6 * s, (0.5 + k * 0.6) * s * Math.min(1, (cycle - 0.55) * 12), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.save()
  ctx.translate(0, -rise)
  if (ignite) {
    const flick = 0.8 + Math.sin(t * 40) * 0.2
    ctx.fillStyle = raw('#ffd56b')
    poly(ctx, [-0.22 * s, -0.25 * s, 0, (0.9 + 1.6 * flick) * s, 0.22 * s, -0.25 * s])
    ctx.fillStyle = raw('#ff7a2f')
    poly(ctx, [-0.12 * s, -0.25 * s, 0, (0.5 + 0.9 * flick) * s, 0.12 * s, -0.25 * s])
  }
  ctx.fillStyle = c('#f4f6fb')
  ctx.fillRect(-0.24 * s, -3.3 * s, 0.48 * s, 3.1 * s)
  ctx.beginPath()
  ctx.moveTo(-0.24 * s, -3.3 * s)
  ctx.quadraticCurveTo(0, -4.2 * s, 0.24 * s, -3.3 * s)
  ctx.fill()
  ctx.fillStyle = c('#2b2f3a')
  ctx.fillRect(-0.24 * s, -1.2 * s, 0.48 * s, 0.18 * s)
  ctx.fillStyle = c('#d9534f')
  poly(ctx, [-0.24 * s, -0.2 * s, -0.5 * s, 0.05 * s, -0.24 * s, -0.8 * s])
  poly(ctx, [0.24 * s, -0.2 * s, 0.5 * s, 0.05 * s, 0.24 * s, -0.8 * s])
  ctx.restore()
}

/** Red-and-white lighthouse; its lamp sweeps a beam after dark. */
export function lighthouse(ctx: Ctx, s: number, t: number) {
  ctx.fillStyle = c('#ffffff')
  poly(ctx, [-0.4 * s, 0, 0.4 * s, 0, 0.25 * s, -2.6 * s, -0.25 * s, -2.6 * s])
  ctx.fillStyle = c('#d9534f')
  for (const y of [0.45, 1.35, 2.15]) {
    const w0 = 0.4 - (y / 2.6) * 0.15
    const w1 = 0.4 - ((y + 0.42) / 2.6) * 0.15
    poly(ctx, [-w0 * s, -y * s, w0 * s, -y * s, w1 * s, -(y + 0.42) * s, -w1 * s, -(y + 0.42) * s])
  }
  ctx.fillStyle = c('#3d4a6b')
  ctx.fillRect(-0.32 * s, -3.1 * s, 0.64 * s, 0.5 * s)
  ctx.fillStyle = isDark() ? raw('#fff2a8') : c('#fff2a8')
  ctx.fillRect(-0.22 * s, -3.0 * s, 0.44 * s, 0.3 * s)
  ctx.fillStyle = c('#d9534f')
  poly(ctx, [-0.38 * s, -3.1 * s, 0.38 * s, -3.1 * s, 0, -3.5 * s])
  if (isDark()) {
    ctx.save()
    ctx.translate(0, -2.85 * s)
    ctx.rotate(Math.sin(t * 1.4) * 0.9)
    const g = ctx.createLinearGradient(0, 0, 9 * s, 0)
    g.addColorStop(0, 'rgba(255, 242, 168, 0.55)')
    g.addColorStop(1, 'rgba(255, 242, 168, 0)')
    ctx.fillStyle = g
    poly(ctx, [0, 0, 9 * s, -1.2 * s, 9 * s, 1.2 * s])
    ctx.restore()
  }
}

/** A tent and a crackling campfire: a little glow on the night side. */
export function campfire(ctx: Ctx, s: number, t: number) {
  ctx.fillStyle = c('#f2994a')
  poly(ctx, [-1.6 * s, 0, -0.4 * s, 0, -1.0 * s, -0.9 * s])
  ctx.fillStyle = c('#c96f2b')
  poly(ctx, [-1.0 * s, 0, -0.75 * s, 0, -1.0 * s, -0.55 * s])
  ctx.fillStyle = c('#6b4226')
  ctx.fillRect(0.2 * s, -0.12 * s, 0.9 * s, 0.12 * s)
  const f = 0.75 + Math.sin(t * 13) * 0.15 + Math.sin(t * 7.3) * 0.1
  if (isDark()) {
    const g = ctx.createRadialGradient(0.65 * s, -0.3 * s, 0, 0.65 * s, -0.3 * s, 2.6 * s)
    g.addColorStop(0, 'rgba(255, 170, 70, 0.45)')
    g.addColorStop(1, 'rgba(255, 170, 70, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0.65 * s, -0.3 * s, 2.6 * s, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = raw('#ff7a2f')
  poly(ctx, [0.35 * s, -0.1 * s, 0.95 * s, -0.1 * s, 0.65 * s, -0.95 * s * f])
  ctx.fillStyle = raw('#ffd56b')
  poly(ctx, [0.5 * s, -0.1 * s, 0.8 * s, -0.1 * s, 0.65 * s, -0.55 * s * f])
}

/** A ferris wheel that slowly turns; its cabins light up at night. */
export function ferrisWheel(ctx: Ctx, s: number, t: number) {
  const r = 1.6 * s
  ctx.strokeStyle = c('#c7d2e8')
  ctx.lineWidth = 0.1 * s
  ctx.beginPath()
  ctx.moveTo(-0.9 * s, 0)
  ctx.lineTo(0, -r - 0.3 * s)
  ctx.lineTo(0.9 * s, 0)
  ctx.stroke()
  ctx.save()
  ctx.translate(0, -r - 0.3 * s)
  ctx.strokeStyle = c('#e8eef7')
  ctx.lineWidth = 0.08 * s
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.stroke()
  const turn = t * 0.25
  const dark = isDark()
  for (let i = 0; i < 8; i++) {
    const a = turn + (i * Math.PI) / 4
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    ctx.stroke()
    ctx.fillStyle = dark ? raw(['#ff7ac8', '#7fd8ff', '#fff38a'][i % 3]) : c(['#ff8fa3', '#7fd8ff', '#ffd166'][i % 3])
    ctx.fillRect(Math.cos(a) * r - 0.18 * s, Math.sin(a) * r, 0.36 * s, 0.3 * s)
  }
  ctx.restore()
}

/** A deer that now and then lowers its head to graze. */
export function deer(ctx: Ctx, s: number, t: number, v: number) {
  const graze = Math.max(0, Math.sin(t * 0.5 + v * 9)) * 0.5
  ctx.fillStyle = c('#b07a4a')
  ctx.beginPath()
  ctx.ellipse(0, -0.75 * s, 0.6 * s, 0.25 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  for (const x of [-0.45, -0.25, 0.2, 0.38]) ctx.fillRect(x * s, -0.7 * s, 0.09 * s, 0.7 * s)
  ctx.save()
  ctx.translate(0.5 * s, -0.85 * s)
  ctx.rotate(-0.5 + graze * 2.2)
  ctx.fillRect(0, -0.08 * s, 0.55 * s, 0.16 * s)
  ctx.beginPath()
  ctx.ellipse(0.62 * s, 0, 0.2 * s, 0.13 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = c('#6b4226')
  ctx.lineWidth = 0.05 * s
  ctx.beginPath()
  ctx.moveTo(0.55 * s, -0.1 * s)
  ctx.lineTo(0.45 * s, -0.45 * s)
  ctx.lineTo(0.3 * s, -0.55 * s)
  ctx.moveTo(0.45 * s, -0.45 * s)
  ctx.lineTo(0.58 * s, -0.6 * s)
  ctx.stroke()
  ctx.restore()
  ctx.fillStyle = c('#f4e3c3')
  ctx.beginPath()
  ctx.arc(-0.6 * s, -0.82 * s, 0.1 * s, 0, Math.PI * 2)
  ctx.fill()
}

/** A hot-air balloon drifting up and down above the farms. */
export function balloon(ctx: Ctx, s: number, t: number, v: number) {
  const y = -3.2 * s - Math.sin(t * 0.4 + v * 7) * 0.8 * s
  ctx.save()
  ctx.translate(Math.sin(t * 0.15 + v) * 1.5 * s, y)
  ctx.strokeStyle = c('#6b4226')
  ctx.lineWidth = 0.05 * s
  ctx.beginPath()
  ctx.moveTo(-0.35 * s, 0.25 * s)
  ctx.lineTo(-0.2 * s, 1.0 * s)
  ctx.moveTo(0.35 * s, 0.25 * s)
  ctx.lineTo(0.2 * s, 1.0 * s)
  ctx.stroke()
  ctx.fillStyle = c('#8a5a44')
  ctx.fillRect(-0.25 * s, 1.0 * s, 0.5 * s, 0.35 * s)
  const stripes = ['#ff6b6b', '#ffd166', '#4ecdc4', '#ff6b6b']
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = c(stripes[i])
    ctx.beginPath()
    ctx.ellipse(0, -0.35 * s, (0.95 - i * 0.24) * s, 0.95 * s, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

// ------------------------------------------------------------------ rocky landforms

/** A broad shield volcano (Olympus Mons): very wide, gentle, with a summit caldera. */
export function shield(ctx: Ctx, s: number, _t: number, v: number, h = 3, color = '#c95a34') {
  const w = h * 4.2 * s
  ctx.fillStyle = c(color)
  ctx.beginPath()
  ctx.moveTo(-w, 0.25 * s)
  ctx.bezierCurveTo(-w * 0.55, 0.2 * s, -w * 0.32, -h * s, -w * 0.08, -h * s)
  ctx.lineTo(w * 0.08, -h * s)
  ctx.bezierCurveTo(w * 0.32, -h * s, w * 0.55, 0.2 * s, w, 0.25 * s)
  ctx.fill()
  ctx.fillStyle = c('#000000', 0.14)
  ctx.beginPath()
  ctx.moveTo(w * 0.08, -h * s)
  ctx.bezierCurveTo(w * 0.32, -h * s, w * 0.55, 0.2 * s, w, 0.25 * s)
  ctx.lineTo(0, 0.25 * s)
  ctx.fill()
  ctx.fillStyle = c('#8f3f22')
  ctx.beginPath()
  ctx.ellipse(0, -h * s + 0.04 * s, w * 0.07, 0.12 * s + v * 0.05 * s, 0, 0, Math.PI * 2)
  ctx.fill()
}

/** A canyon cut into the ground (Valles Marineris): dark walls dropping below the horizon. */
export function canyon(ctx: Ctx, s: number, _t: number, v: number, color = '#7a3420') {
  const w = (2.4 + v) * s
  ctx.fillStyle = c(color)
  poly(ctx, [-w, -0.05 * s, w, -0.05 * s, w * 0.55, 1.6 * s, -w * 0.5, 1.6 * s])
  ctx.fillStyle = c('#000000', 0.25)
  poly(ctx, [0, -0.05 * s, w, -0.05 * s, w * 0.55, 1.6 * s, w * 0.1, 1.6 * s])
  ctx.fillStyle = c('#b54d2c')
  for (const x of [-0.9, -0.2, 0.6]) poly(ctx, [x * w * 0.7 - 0.3 * s, -0.05 * s, x * w * 0.7 + 0.3 * s, -0.05 * s, x * w * 0.6, 0.6 * s])
}

/** A long cliff (scarp) where the crust shrank and cracked, as on Mercury. */
export function scarp(ctx: Ctx, s: number, _t: number, v: number, color = '#a39b93') {
  const w = (2.5 + v * 2) * s
  ctx.fillStyle = c(color)
  poly(ctx, [-w, 0.2 * s, w * 0.35, -1.0 * s, w * 0.45, -1.0 * s, w * 0.5, 0.2 * s])
  ctx.fillStyle = c('#000000', 0.2)
  poly(ctx, [w * 0.45, -1.0 * s, w * 0.5, 0.2 * s, w * 0.38, 0.2 * s])
}
