/**
 * The little things that live on a planet's horizon, drawn flat and bold. Every drawer
 * works in a local frame: the ground is at y = 0, "up" (away from the planet) is -y, and
 * `s` is the size unit in pixels (a tree is about 2.3 s tall).
 *
 * Night: before drawing an object, `setLight(0..1)` says how much sunlight reaches it;
 * colours pass through `c()`, which slides them towards the night tint, and windows switch
 * on when it's dark.
 */

type Ctx = CanvasRenderingContext2D

let light = 1
const NIGHT = [20, 15, 56]
const parsed = new Map<string, number[]>()

function rgb(hex: string) {
  let v = parsed.get(hex)
  if (!v) {
    const n = parseInt(hex.slice(1), 16)
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    parsed.set(hex, v)
  }
  return v
}

export function setLight(l: number) {
  light = Math.min(1, Math.max(0, l))
}

/** A colour as seen in the current light (night keeps a fifth of it, tinted blue). */
export function c(hex: string, alpha = 1) {
  const [r, g, b] = rgb(hex)
  const k = 0.2 + 0.8 * light
  const m = (a: number, n: number) => Math.round(n + (a - n) * k)
  return `rgba(${m(r, NIGHT[0])}, ${m(g, NIGHT[1])}, ${m(b, NIGHT[2])}, ${alpha})`
}

/** Raw colour, unaffected by night (lights, lava, glows). */
export function raw(hex: string, alpha = 1) {
  const [r, g, b] = rgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export const isDark = () => light < 0.45

/** Cheap stable pseudo-random from a few numbers. */
export function hash(a: number, b = 0, c2 = 0) {
  const x = Math.sin(a * 127.1 + b * 311.7 + c2 * 74.7) * 43758.5453
  return x - Math.floor(x)
}

const circle = (ctx: Ctx, x: number, y: number, r: number) => {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

const poly = (ctx: Ctx, pts: number[]) => {
  ctx.beginPath()
  ctx.moveTo(pts[0], pts[1])
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
  ctx.closePath()
  ctx.fill()
}

// ------------------------------------------------------------------ plants

const LEAVES = ['#3fae5a', '#4cbb63', '#36a35a', '#5cc06a']

export function tree(ctx: Ctx, s: number, t: number, v: number) {
  ctx.save()
  ctx.rotate(Math.sin(t * 1.3 + v * 20) * 0.035)
  ctx.fillStyle = c('#7a4a2b')
  ctx.fillRect(-0.13 * s, -1 * s, 0.26 * s, 1.05 * s)
  const leaf = LEAVES[Math.floor(v * LEAVES.length)]
  ctx.fillStyle = c('#2f8a46')
  circle(ctx, 0.28 * s, -1.15 * s, 0.45 * s)
  ctx.fillStyle = c(leaf)
  circle(ctx, 0, -1.45 * s, 0.68 * s)
  circle(ctx, -0.36 * s, -1.12 * s, 0.45 * s)
  ctx.fillStyle = c('#7fd88a', 0.8)
  circle(ctx, -0.22 * s, -1.68 * s, 0.24 * s)
  ctx.restore()
}

export function pine(ctx: Ctx, s: number, t: number, v: number) {
  ctx.save()
  ctx.rotate(Math.sin(t * 1.1 + v * 30) * 0.025)
  const k = 0.85 + v * 0.4
  ctx.fillStyle = c('#6b4226')
  ctx.fillRect(-0.1 * s, -0.5 * s, 0.2 * s, 0.55 * s)
  ctx.fillStyle = c('#2c7a4b')
  poly(ctx, [-0.75 * s, -0.4 * s, 0.75 * s, -0.4 * s, 0, -1.5 * s * k])
  ctx.fillStyle = c('#349159')
  poly(ctx, [-0.6 * s, -1.0 * s * k, 0.6 * s, -1.0 * s * k, 0, -2.0 * s * k])
  ctx.fillStyle = c('#3ea365')
  poly(ctx, [-0.42 * s, -1.55 * s * k, 0.42 * s, -1.55 * s * k, 0, -2.45 * s * k])
  ctx.restore()
}

export function palm(ctx: Ctx, s: number, t: number, v: number) {
  ctx.save()
  const sway = Math.sin(t * 1.5 + v * 10) * 0.08
  const tx = (0.35 + sway) * s
  const ty = -2.1 * s
  ctx.strokeStyle = c('#9a6b3f')
  ctx.lineWidth = 0.18 * s
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(0.05 * s, -1.2 * s, tx, ty)
  ctx.stroke()
  ctx.strokeStyle = c('#43a85a')
  ctx.lineWidth = 0.16 * s
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.55 + sway
    const ex = tx + Math.cos(a) * 1.1 * s
    const ey = ty + Math.sin(a) * 0.7 * s + 0.35 * s
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.quadraticCurveTo(tx + Math.cos(a) * 0.7 * s, ty + Math.sin(a) * 0.9 * s - 0.2 * s, ex, ey)
    ctx.stroke()
  }
  ctx.fillStyle = c('#6b4226')
  circle(ctx, tx - 0.1 * s, ty + 0.12 * s, 0.11 * s)
  circle(ctx, tx + 0.12 * s, ty + 0.1 * s, 0.11 * s)
  ctx.restore()
}

export function cactus(ctx: Ctx, s: number, _t: number, v: number) {
  ctx.fillStyle = c('#4caf6a')
  ctx.strokeStyle = c('#4caf6a')
  ctx.lineCap = 'round'
  ctx.lineWidth = 0.32 * s
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, -1.6 * s)
  ctx.stroke()
  ctx.lineWidth = 0.22 * s
  ctx.beginPath()
  ctx.moveTo(0, -0.7 * s)
  ctx.lineTo(-0.45 * s, -0.7 * s)
  ctx.lineTo(-0.45 * s, -1.15 * s)
  if (v > 0.4) {
    ctx.moveTo(0, -0.95 * s)
    ctx.lineTo(0.42 * s, -0.95 * s)
    ctx.lineTo(0.42 * s, -1.35 * s)
  }
  ctx.stroke()
}

// ------------------------------------------------------------------ buildings

const WALLS = ['#f4e3c3', '#ffd6a5', '#f7c59f', '#e8eef7', '#ffe3e3']
const ROOFS = ['#d9534f', '#8a5a44', '#c0504d', '#5b6d9a']

export function house(ctx: Ctx, s: number, t: number, v: number) {
  const w = 1.25 * s
  const h = 0.85 * s
  ctx.fillStyle = c(WALLS[Math.floor(v * WALLS.length)])
  ctx.fillRect(-w / 2, -h, w, h)
  ctx.fillStyle = c(ROOFS[Math.floor(hash(v) * ROOFS.length)])
  poly(ctx, [-w / 2 - 0.15 * s, -h, w / 2 + 0.15 * s, -h, 0, -h - 0.6 * s])
  // Chimney with a curl of smoke.
  ctx.fillStyle = c('#8a5a44')
  ctx.fillRect(0.25 * s, -h - 0.55 * s, 0.18 * s, 0.4 * s)
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.35 + i / 3 + v) % 1
    ctx.fillStyle = c('#e8e8f0', 0.55 * (1 - k))
    circle(ctx, 0.34 * s + Math.sin(k * 6 + v * 9) * 0.15 * s, -h - 0.6 * s - k * 1.3 * s, (0.12 + k * 0.22) * s)
  }
  ctx.fillStyle = c('#7a4a2b')
  ctx.fillRect(-0.4 * s, -0.48 * s, 0.26 * s, 0.48 * s)
  ctx.fillStyle = isDark() ? raw('#ffd56b') : c('#9ad0f5')
  ctx.fillRect(0.05 * s, -0.62 * s, 0.32 * s, 0.26 * s)
}

const TOWERS = ['#8fa3c7', '#a7b8d8', '#6f86b5', '#c7d2e8', '#7c8fb8']

/** Skyscraper `h` size-units tall; windows light up after dark. */
export function tower(ctx: Ctx, s: number, t: number, v: number, h: number) {
  const w = (0.75 + hash(v, 1) * 0.35) * s
  ctx.fillStyle = c(TOWERS[Math.floor(v * TOWERS.length)])
  ctx.fillRect(-w / 2, -h * s, w, h * s)
  ctx.fillStyle = c('#000000', 0.12)
  ctx.fillRect(w * 0.1, -h * s, w * 0.4, h * s)
  const rows = Math.floor(h / 0.32)
  const dark = isDark()
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < 3; k++) {
      const on = hash(v * 100 + r, k)
      ctx.fillStyle = dark ? (on > 0.35 ? raw('#ffd56b', 0.9) : c('#33405e')) : c('#d6e6fb', 0.75)
      ctx.fillRect(-w / 2 + (0.12 + k * 0.3) * w, -h * s + (0.18 + r * 0.32) * s, 0.16 * w, 0.14 * s)
    }
  }
  if (h > 4) {
    ctx.fillStyle = c('#9aa8c2')
    ctx.fillRect(-0.03 * s, -h * s - 0.9 * s, 0.06 * s, 0.9 * s)
    const blink = Math.sin(t * 3 + v * 7) > 0.3
    ctx.fillStyle = blink ? raw('#ff4d4d') : c('#7a2a2a')
    circle(ctx, 0, -h * s - 0.92 * s, 0.09 * s)
  }
}

export function barn(ctx: Ctx, s: number) {
  ctx.fillStyle = c('#c94f4f')
  ctx.fillRect(-0.85 * s, -1 * s, 1.7 * s, 1 * s)
  ctx.fillStyle = c('#8a3a3a')
  poly(ctx, [-0.95 * s, -1 * s, 0.95 * s, -1 * s, 0.55 * s, -1.55 * s, -0.55 * s, -1.55 * s])
  ctx.strokeStyle = c('#ffffff')
  ctx.lineWidth = 0.07 * s
  ctx.strokeRect(-0.3 * s, -0.7 * s, 0.6 * s, 0.7 * s)
  ctx.beginPath()
  ctx.moveTo(-0.3 * s, -0.7 * s)
  ctx.lineTo(0.3 * s, 0)
  ctx.moveTo(0.3 * s, -0.7 * s)
  ctx.lineTo(-0.3 * s, 0)
  ctx.stroke()
}

export function windmill(ctx: Ctx, s: number, t: number, v: number) {
  ctx.fillStyle = c('#f1e4cf')
  poly(ctx, [-0.45 * s, 0, 0.45 * s, 0, 0.25 * s, -1.8 * s, -0.25 * s, -1.8 * s])
  ctx.fillStyle = c('#8a5a44')
  poly(ctx, [-0.35 * s, -1.75 * s, 0.35 * s, -1.75 * s, 0, -2.15 * s])
  ctx.save()
  ctx.translate(0, -1.95 * s)
  ctx.rotate(t * 0.8 + v * 6)
  ctx.fillStyle = c('#ffffff')
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2)
    ctx.fillRect(-0.09 * s, 0, 0.18 * s, 1.15 * s)
  }
  ctx.fillStyle = c('#6b4226')
  circle(ctx, 0, 0, 0.1 * s)
  ctx.restore()
}

export function turbine(ctx: Ctx, s: number, t: number, v: number) {
  ctx.strokeStyle = c('#eef2f8')
  ctx.lineWidth = 0.1 * s
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, -2.8 * s)
  ctx.stroke()
  ctx.save()
  ctx.translate(0, -2.8 * s)
  ctx.rotate(t * 2.2 + v * 9)
  ctx.fillStyle = c('#ffffff')
  for (let i = 0; i < 3; i++) {
    ctx.rotate((Math.PI * 2) / 3)
    poly(ctx, [-0.06 * s, 0, 0.06 * s, 0, 0.02 * s, 1.25 * s])
  }
  circle(ctx, 0, 0, 0.1 * s)
  ctx.restore()
}

export function pyramid(ctx: Ctx, s: number, _t: number, v: number) {
  const k = 1 + v * 0.6
  ctx.fillStyle = c('#e7c983')
  poly(ctx, [-1.6 * s * k, 0, 1.6 * s * k, 0, 0, -1.6 * s * k])
  ctx.fillStyle = c('#c9a35c')
  poly(ctx, [0, 0, 1.6 * s * k, 0, 0, -1.6 * s * k])
}

export function igloo(ctx: Ctx, s: number) {
  ctx.fillStyle = c('#f4f8ff')
  ctx.beginPath()
  ctx.arc(0, 0, 0.85 * s, Math.PI, 0)
  ctx.fill()
  ctx.strokeStyle = c('#c8d6ee')
  ctx.lineWidth = 0.05 * s
  for (const y of [-0.3, -0.55]) {
    ctx.beginPath()
    ctx.moveTo(-0.8 * s, y * s)
    ctx.lineTo(0.8 * s, y * s)
    ctx.stroke()
  }
  ctx.fillStyle = c('#3d4a6b')
  ctx.beginPath()
  ctx.arc(0.45 * s, 0, 0.25 * s, Math.PI, 0)
  ctx.fill()
}

export function penguin(ctx: Ctx, s: number, t: number, v: number) {
  const hop = Math.max(0, Math.sin(t * 4 + v * 20)) * 0.12 * s
  ctx.save()
  ctx.translate(0, -hop)
  ctx.fillStyle = c('#1f2433')
  ctx.beginPath()
  ctx.ellipse(0, -0.5 * s, 0.28 * s, 0.5 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = c('#ffffff')
  ctx.beginPath()
  ctx.ellipse(0.06 * s, -0.42 * s, 0.17 * s, 0.36 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = c('#ffa94d')
  poly(ctx, [0.2 * s, -0.78 * s, 0.4 * s, -0.72 * s, 0.2 * s, -0.68 * s])
  ctx.restore()
}

export function radioTower(ctx: Ctx, s: number, t: number) {
  ctx.strokeStyle = c('#c94f4f')
  ctx.lineWidth = 0.07 * s
  ctx.beginPath()
  ctx.moveTo(-0.45 * s, 0)
  ctx.lineTo(0, -3.4 * s)
  ctx.lineTo(0.45 * s, 0)
  for (let k = 1; k < 6; k++) {
    const y = -k * 0.55 * s
    const x = 0.45 * s * (1 - k / 6.2)
    ctx.moveTo(-x, y)
    ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.fillStyle = Math.sin(t * 4) > 0 ? raw('#ff4d4d') : c('#7a2a2a')
  circle(ctx, 0, -3.45 * s, 0.12 * s)
}

// ------------------------------------------------------------------ land

export function mountain(ctx: Ctx, s: number, _t: number, v: number, h: number) {
  const w = h * 0.95 * s
  ctx.fillStyle = c(v > 0.5 ? '#8a96b0' : '#7d8aa6')
  poly(ctx, [-w, 0.2 * s, w, 0.2 * s, 0.08 * w, -h * s])
  ctx.fillStyle = c('#a7b2c9')
  poly(ctx, [-w, 0.2 * s, 0.08 * w, -h * s, -0.12 * w, 0.2 * s])
  if (h > 2.6) {
    ctx.fillStyle = c('#f4f8ff')
    const k = 0.32
    poly(ctx, [
      0.08 * w - w * k * 1.04,
      -h * s * (1 - k),
      0.08 * w,
      -h * s,
      0.08 * w + w * k * 0.92,
      -h * s * (1 - k),
      0.08 * w + w * k * 0.4,
      -h * s * (1 - k * 0.8),
      0.08 * w,
      -h * s * (1 - k * 1.1),
      0.08 * w - w * k * 0.5,
      -h * s * (1 - k * 0.75),
    ])
  }
}

export function dune(ctx: Ctx, s: number, _t: number, v: number, color = '#f0cf8e') {
  const w = (1.6 + v) * s
  ctx.fillStyle = c(color)
  ctx.beginPath()
  ctx.moveTo(-w, 0.15 * s)
  ctx.quadraticCurveTo(-w * 0.2, -1.1 * s * (0.6 + v * 0.5), w, 0.15 * s)
  ctx.fill()
}

export function rock(ctx: Ctx, s: number, _t: number, v: number, color = '#9b8f85') {
  ctx.fillStyle = c(color)
  const k = 0.5 + v * 0.8
  poly(ctx, [-0.7 * s * k, 0.1 * s, -0.55 * s * k, -0.45 * s * k, -0.1 * s * k, -0.7 * s * k, 0.45 * s * k, -0.5 * s * k, 0.7 * s * k, 0.1 * s])
  ctx.fillStyle = c('#000000', 0.15)
  poly(ctx, [0.05 * s * k, 0.1 * s, 0.45 * s * k, -0.5 * s * k, 0.7 * s * k, 0.1 * s])
}

/** A crater rim seen side-on: two lips and a dip between them. */
export function craterRim(ctx: Ctx, s: number, _t: number, v: number, color = '#a39b93') {
  const w = (1.2 + v * 1.4) * s
  ctx.fillStyle = c(color)
  ctx.beginPath()
  ctx.moveTo(-w * 1.25, 0.2 * s)
  ctx.quadraticCurveTo(-w * 1.05, -0.55 * s, -w * 0.8, -0.4 * s)
  ctx.quadraticCurveTo(0, 0.35 * s, w * 0.8, -0.4 * s)
  ctx.quadraticCurveTo(w * 1.05, -0.55 * s, w * 1.25, 0.2 * s)
  ctx.fill()
}

export function volcano(ctx: Ctx, s: number, t: number, v: number, h = 2.4) {
  const w = h * 1.1 * s
  ctx.fillStyle = c('#7a5a4a')
  poly(ctx, [-w, 0.2 * s, w, 0.2 * s, 0.22 * w, -h * s, -0.22 * w, -h * s])
  ctx.fillStyle = c('#5e4436')
  poly(ctx, [0.05 * w, 0.2 * s, w, 0.2 * s, 0.22 * w, -h * s])
  // Glowing crater and lava runs: lit from inside, so not dimmed by night.
  ctx.fillStyle = raw('#ff7a2f')
  ctx.beginPath()
  ctx.ellipse(0, -h * s, 0.22 * w, 0.08 * w, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = raw('#ff9a3c', 0.85)
  ctx.lineWidth = 0.12 * s
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-0.08 * w, -h * s)
  ctx.quadraticCurveTo(-0.25 * w, -h * 0.5 * s, -0.45 * w, -h * 0.15 * s)
  ctx.stroke()
  for (let i = 0; i < 4; i++) {
    const k = (t * 0.25 + i / 4 + v) % 1
    ctx.fillStyle = c('#5a5468', 0.6 * (1 - k))
    circle(ctx, Math.sin(k * 5 + v * 7) * 0.3 * w, -h * s - k * 3.2 * s, (0.3 + k * 0.7) * s)
  }
}

// ------------------------------------------------------------------ sea

export function ship(ctx: Ctx, s: number, t: number, v: number) {
  ctx.save()
  ctx.translate(0, Math.sin(t * 2 + v * 9) * 0.06 * s)
  ctx.rotate(Math.sin(t * 1.7 + v * 5) * 0.04)
  ctx.fillStyle = c('#d9534f')
  poly(ctx, [-1.3 * s, -0.4 * s, 1.4 * s, -0.4 * s, 1.0 * s, 0.15 * s, -1.0 * s, 0.15 * s])
  ctx.fillStyle = c('#ffffff')
  ctx.fillRect(-0.7 * s, -0.85 * s, 1.0 * s, 0.45 * s)
  ctx.fillStyle = c('#3d4a6b')
  ctx.fillRect(0.4 * s, -1.15 * s, 0.25 * s, 0.75 * s)
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.4 + i / 3) % 1
    ctx.fillStyle = c('#dfe3ec', 0.5 * (1 - k))
    circle(ctx, 0.52 * s - k * 0.8 * s, -1.25 * s - k * 0.9 * s, (0.12 + k * 0.25) * s)
  }
  ctx.restore()
}

export function sailboat(ctx: Ctx, s: number, t: number, v: number) {
  ctx.save()
  ctx.translate(0, Math.sin(t * 2.3 + v * 11) * 0.06 * s)
  ctx.rotate(Math.sin(t * 1.9 + v * 3) * 0.06)
  ctx.fillStyle = c('#8a5a44')
  poly(ctx, [-0.8 * s, -0.25 * s, 0.8 * s, -0.25 * s, 0.55 * s, 0.1 * s, -0.55 * s, 0.1 * s])
  ctx.fillStyle = c('#ffffff')
  poly(ctx, [0, -0.3 * s, 0, -1.8 * s, 0.75 * s, -0.35 * s])
  ctx.fillStyle = c('#ff8fa3')
  poly(ctx, [-0.08 * s, -0.35 * s, -0.08 * s, -1.4 * s, -0.6 * s, -0.4 * s])
  ctx.restore()
}

/** A whale that surfaces now and then: a back, a tail flip, a spout. */
export function whale(ctx: Ctx, s: number, t: number, v: number) {
  const cycle = (t * 0.12 + v) % 1
  if (cycle > 0.45) return
  const k = Math.sin((cycle / 0.45) * Math.PI)
  ctx.fillStyle = c('#3b5b8c')
  ctx.beginPath()
  ctx.ellipse(0, 0.2 * s, 1.4 * s, 0.75 * s * k, 0, Math.PI, 0)
  ctx.fill()
  ctx.save()
  ctx.translate(-1.5 * s, 0)
  ctx.rotate(-0.5 * k)
  ctx.fillStyle = c('#3b5b8c')
  poly(ctx, [0, 0, -0.3 * s, -0.7 * s * k, -0.75 * s, -0.85 * s * k, -0.15 * s, -0.25 * s * k])
  ctx.restore()
  if (k > 0.6) {
    ctx.strokeStyle = c('#dff1ff', 0.8)
    ctx.lineWidth = 0.1 * s
    ctx.lineCap = 'round'
    for (const dx of [-0.2, 0, 0.2]) {
      ctx.beginPath()
      ctx.moveTo(0.6 * s, -0.5 * s * k)
      ctx.quadraticCurveTo(0.6 * s + dx * s, -1.3 * s * k, 0.6 * s + dx * 3 * s, -1.5 * s * k)
      ctx.stroke()
    }
  }
}

// ------------------------------------------------------------------ space hardware

export function rover(ctx: Ctx, s: number, t: number, v: number) {
  ctx.save()
  ctx.translate(Math.sin(t * 0.3 + v * 4) * 0.5 * s, 0)
  ctx.fillStyle = c('#2b2b33')
  for (const x of [-0.65, 0, 0.65]) circle(ctx, x * s, -0.22 * s, 0.22 * s)
  ctx.fillStyle = c('#c9ccd6')
  ctx.fillRect(-0.85 * s, -0.75 * s, 1.7 * s, 0.4 * s)
  ctx.fillStyle = c('#7c8fb8')
  ctx.fillRect(-0.8 * s, -0.85 * s, 1.0 * s, 0.12 * s)
  ctx.fillStyle = c('#e7e9ef')
  ctx.fillRect(0.45 * s, -1.55 * s, 0.08 * s, 0.85 * s)
  ctx.fillRect(0.3 * s, -1.75 * s, 0.4 * s, 0.25 * s)
  ctx.fillStyle = c('#3d4a6b')
  circle(ctx, 0.62 * s, -1.63 * s, 0.07 * s)
  ctx.restore()
}

export function lander(ctx: Ctx, s: number) {
  ctx.strokeStyle = c('#c9ccd6')
  ctx.lineWidth = 0.08 * s
  ctx.beginPath()
  ctx.moveTo(-0.7 * s, 0)
  ctx.lineTo(-0.35 * s, -0.55 * s)
  ctx.moveTo(0.7 * s, 0)
  ctx.lineTo(0.35 * s, -0.55 * s)
  ctx.stroke()
  ctx.fillStyle = c('#e9e2c9')
  ctx.fillRect(-0.45 * s, -0.95 * s, 0.9 * s, 0.45 * s)
  ctx.fillStyle = c('#5b6d9a')
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(side * 1.05 * s, -0.75 * s, 0.5 * s, 0.14 * s, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** The little Mars helicopter, hovering. */
export function copter(ctx: Ctx, s: number, t: number, v: number) {
  const y = -1.6 * s - Math.sin(t * 1.6 + v * 6) * 0.5 * s
  ctx.save()
  ctx.translate(Math.sin(t * 0.5 + v) * 1.2 * s, y)
  ctx.strokeStyle = c('#c9ccd6')
  ctx.lineWidth = 0.05 * s
  ctx.beginPath()
  ctx.moveTo(-0.3 * s, 0.25 * s)
  ctx.lineTo(-0.45 * s, 0.6 * s)
  ctx.moveTo(0.3 * s, 0.25 * s)
  ctx.lineTo(0.45 * s, 0.6 * s)
  ctx.moveTo(0, -0.15 * s)
  ctx.lineTo(0, -0.55 * s)
  ctx.stroke()
  ctx.fillStyle = c('#d6d9e2')
  ctx.fillRect(-0.25 * s, -0.15 * s, 0.5 * s, 0.4 * s)
  ctx.strokeStyle = c('#3d4a6b')
  ctx.lineWidth = 0.07 * s
  for (const y2 of [-0.45, -0.58]) {
    const w = Math.abs(Math.cos(t * 30 + y2 * 10)) * 0.75 * s + 0.1 * s
    ctx.beginPath()
    ctx.moveTo(-w, y2 * s)
    ctx.lineTo(w, y2 * s)
    ctx.stroke()
  }
  ctx.restore()
}

/** A twisting column of dust drifting along the ground. */
export function dustDevil(ctx: Ctx, s: number, t: number, v: number) {
  ctx.save()
  ctx.translate(Math.sin(t * 0.2 + v * 5) * 1.5 * s, 0)
  ctx.strokeStyle = c('#e9b48a', 0.45)
  ctx.lineWidth = 0.12 * s
  for (let i = 0; i < 9; i++) {
    const y = -i * 0.38 * s
    const r = (0.15 + i * 0.12) * s
    const a = t * 6 + i * 0.7
    ctx.beginPath()
    ctx.ellipse(Math.sin(a * 0.3) * 0.1 * s, y, r, r * 0.28, 0, a, a + Math.PI * 1.3)
    ctx.stroke()
  }
  ctx.restore()
}

export function veneraLander(ctx: Ctx, s: number) {
  ctx.fillStyle = c('#b9bfcc')
  ctx.beginPath()
  ctx.ellipse(0, -0.2 * s, 0.9 * s, 0.2 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = c('#d7dbe4')
  ctx.fillRect(-0.4 * s, -1.1 * s, 0.8 * s, 0.9 * s)
  ctx.beginPath()
  ctx.arc(0, -1.1 * s, 0.4 * s, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = c('#7c8fb8')
  ctx.fillRect(-0.4 * s, -0.75 * s, 0.8 * s, 0.12 * s)
}

export function cow(ctx: Ctx, s: number, t: number) {
  ctx.save()
  ctx.rotate(Math.sin(t * 3) * 0.3)
  ctx.fillStyle = raw('#ffffff')
  ctx.beginPath()
  ctx.ellipse(0, -0.5 * s, 0.7 * s, 0.38 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = raw('#2b2b33')
  circle(ctx, -0.2 * s, -0.6 * s, 0.16 * s)
  circle(ctx, 0.3 * s, -0.45 * s, 0.12 * s)
  ctx.fillRect(-0.5 * s, -0.25 * s, 0.1 * s, 0.35 * s)
  ctx.fillRect(0.4 * s, -0.25 * s, 0.1 * s, 0.35 * s)
  ctx.fillStyle = raw('#ffffff')
  circle(ctx, 0.75 * s, -0.75 * s, 0.25 * s)
  ctx.fillStyle = raw('#ffb3c1')
  circle(ctx, 0.88 * s, -0.68 * s, 0.11 * s)
  ctx.restore()
}

// ------------------------------------------------------------------ air

export function cloud(ctx: Ctx, s: number, _t: number, v: number, color = '#ffffff', alpha = 0.92) {
  const k = 0.8 + v * 0.7
  ctx.fillStyle = c(color, alpha)
  circle(ctx, -0.7 * s * k, -0.3 * s * k, 0.45 * s * k)
  circle(ctx, 0, -0.55 * s * k, 0.65 * s * k)
  circle(ctx, 0.7 * s * k, -0.35 * s * k, 0.5 * s * k)
  ctx.fillRect(-0.7 * s * k, -0.3 * s * k, 1.4 * s * k, 0.3 * s * k)
}

/** Kurzgesagt bird: round body, flapping wings. */
export function bird(ctx: Ctx, s: number, t: number, v: number) {
  const flap = Math.sin(t * 9 + v * 20)
  ctx.fillStyle = c('#f6f1ff')
  ctx.beginPath()
  ctx.ellipse(0, 0, 0.35 * s, 0.24 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = c('#f6f1ff')
  ctx.lineWidth = 0.14 * s
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-0.1 * s, -0.05 * s)
  ctx.quadraticCurveTo(-0.35 * s, -0.5 * s * flap, -0.65 * s, -0.25 * s * flap)
  ctx.moveTo(0.1 * s, -0.05 * s)
  ctx.quadraticCurveTo(0.35 * s, -0.5 * s * flap, 0.65 * s, -0.25 * s * flap)
  ctx.stroke()
  ctx.fillStyle = c('#ffb84d')
  poly(ctx, [0.33 * s, -0.04 * s, 0.52 * s, 0.02 * s, 0.33 * s, 0.08 * s])
}

export function plane(ctx: Ctx, s: number) {
  ctx.strokeStyle = c('#ffffff', 0.4)
  ctx.lineWidth = 0.08 * s
  ctx.beginPath()
  ctx.moveTo(-0.6 * s, 0)
  ctx.lineTo(-4.5 * s, 0)
  ctx.stroke()
  ctx.fillStyle = c('#ffffff')
  ctx.beginPath()
  ctx.ellipse(0, 0, 0.7 * s, 0.16 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  poly(ctx, [-0.1 * s, 0, 0.25 * s, 0, -0.25 * s, -0.55 * s])
  poly(ctx, [-0.55 * s, 0, -0.35 * s, 0, -0.65 * s, -0.35 * s])
}

/** The International Space Station: a truss with four pairs of solar wings. */
export function station(ctx: Ctx, s: number) {
  ctx.fillStyle = c('#d6d9e2')
  ctx.fillRect(-1.6 * s, -0.06 * s, 3.2 * s, 0.12 * s)
  ctx.fillRect(-0.35 * s, -0.2 * s, 0.7 * s, 0.4 * s)
  ctx.fillStyle = c('#c9a24a')
  for (const x of [-1.45, -0.95, 0.95, 1.45]) {
    ctx.fillRect((x - 0.18) * s, -0.75 * s, 0.36 * s, 0.6 * s)
    ctx.fillRect((x - 0.18) * s, 0.15 * s, 0.36 * s, 0.6 * s)
  }
}

/** A generic probe: body, dish, solar panels. */
export function probe(ctx: Ctx, s: number, panels: 'wings' | 'tri' = 'wings') {
  ctx.fillStyle = c('#4b5d8f')
  if (panels === 'tri') {
    for (let i = 0; i < 3; i++) {
      ctx.save()
      ctx.rotate((i * Math.PI * 2) / 3)
      ctx.fillRect(0.2 * s, -0.17 * s, 1.5 * s, 0.34 * s)
      ctx.restore()
    }
  } else {
    ctx.fillRect(-1.6 * s, -0.2 * s, 1.15 * s, 0.4 * s)
    ctx.fillRect(0.45 * s, -0.2 * s, 1.15 * s, 0.4 * s)
  }
  ctx.fillStyle = c('#e1c27a')
  ctx.fillRect(-0.32 * s, -0.32 * s, 0.64 * s, 0.64 * s)
  ctx.fillStyle = c('#f4f4f8')
  ctx.beginPath()
  ctx.ellipse(0, -0.45 * s, 0.45 * s, 0.14 * s, 0, 0, Math.PI * 2)
  ctx.fill()
}

/** Field of crops lying on the ground: alternating stripes. */
export function field(ctx: Ctx, s: number, _t: number, v: number) {
  const w = 2.2 * s
  const colors = v > 0.5 ? ['#e8c95a', '#d6b445'] : ['#8fd16a', '#79bf57']
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = c(colors[i % 2])
    ctx.fillRect(-w / 2 + (i * w) / 6, -0.16 * s, w / 6 + 0.5, 0.2 * s)
  }
}

import { balloon, campfire, canyon, deer, ferrisWheel, lighthouse, rocket, scarp, shield } from './kit2'

export const KIT = {
  tree,
  pine,
  palm,
  cactus,
  house,
  barn,
  windmill,
  turbine,
  pyramid,
  igloo,
  penguin,
  radioTower,
  dune,
  rock,
  craterRim,
  rover,
  lander,
  copter,
  dustDevil,
  veneraLander,
  ship,
  sailboat,
  whale,
  field,
  rocket,
  lighthouse,
  campfire,
  ferrisWheel,
  deer,
  balloon,
  shield,
  canyon,
  scarp,
} as const

export type FeatureKind = keyof typeof KIT | 'tower' | 'mountain' | 'volcano'
