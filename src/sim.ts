/**
 * The universe: bodies pulling on each other with plain Newtonian gravity.
 * Units are arbitrary (G = 1, distances in world units ~ pixels at zoom 1).
 * Colliding bodies merge, conserving mass and momentum.
 */

import { PLANETS, SUN } from './planets'

export type Kind = 'star' | 'gas' | 'rock' | 'moon'

export interface Body {
  id: number
  kind: Kind
  x: number
  y: number
  vx: number
  vy: number
  m: number
  r: number
  /** Main colour, stripes/craters colour. */
  color: string
  color2: string
  /** Recent positions for the trail (world units), oldest first. */
  trail: number[]
  /** Seconds spent bound to a star, and full laps completed around it. */
  bound: number
  orbits: number
  /** Angle around the star it orbits (for counting laps). */
  angle: number | null
  host: number | null
  /** Random per body: blink timing, stripe tilt, crater layout. */
  seed: number
  /** Seconds since it was created or last merged (for the pop-in animation). */
  age: number
  /** Real solar-system bodies have a name (and Saturn/Uranus a ring). */
  name?: string
  ring?: 'wide' | 'thin'
}

export interface Burst {
  x: number
  y: number
  color: string
  t: number
  size: number
}

export const G = 1
const SOFTEN = 8
const ESCAPE = 9000
const TRAIL_POINTS = 90

/** Kurzgesagt-ish flat colours per kind: [body, accent]. */
const PALETTES: Record<Kind, [string, string][]> = {
  star: [
    ['#ffc94a', '#ffe9a8'],
    ['#ff8a4c', '#ffc39b'],
    ['#7fd8ff', '#d4f3ff'],
  ],
  gas: [
    ['#f4a259', '#e07a3f'],
    ['#5bc0eb', '#3a8fc4'],
    ['#c792ea', '#9d6bd1'],
    ['#ef6f6c', '#c94f55'],
  ],
  rock: [
    ['#4ecdc4', '#2a9d8f'],
    ['#7bd389', '#4caf6a'],
    ['#ff6b9a', '#d94c7c'],
    ['#ffd166', '#e0a83b'],
  ],
  moon: [
    ['#c9c6e0', '#a29fc2'],
    ['#b8c4d6', '#8f9cb3'],
  ],
}

/** Size and mass per kind. */
const SPECS: Record<Kind, { r: [number, number]; density: number }> = {
  star: { r: [34, 46], density: 2.2 },
  gas: { r: [20, 28], density: 0.06 },
  rock: { r: [10, 14], density: 0.08 },
  moon: { r: [5, 7], density: 0.08 },
}

let nextId = 1

export function makeBody(kind: Kind, x: number, y: number, vx = 0, vy = 0): Body {
  const seed = Math.random()
  const spec = SPECS[kind]
  const r = spec.r[0] + Math.random() * (spec.r[1] - spec.r[0])
  const [color, color2] = PALETTES[kind][Math.floor(Math.random() * PALETTES[kind].length)]
  return {
    id: nextId++,
    kind,
    x,
    y,
    vx,
    vy,
    m: spec.density * r * r * r * 0.25,
    r,
    color,
    color2,
    trail: [],
    bound: 0,
    orbits: 0,
    angle: null,
    host: null,
    seed,
    age: 0,
  }
}

/** Speed for a circular orbit at distance d around mass M. */
export function circularSpeed(M: number, d: number) {
  return Math.sqrt((G * M) / d)
}

/** Our solar system: the Sun and the eight planets on circular orbits, spread around the clock. */
export function solarSystem(): Body[] {
  const sun = makeBody('star', 0, 0)
  Object.assign(sun, { name: SUN.name, r: SUN.r, m: 2.2 * SUN.r ** 3 * 0.25, color: SUN.color, color2: SUN.color2, seed: 0.37 })
  const bodies = [sun]
  PLANETS.forEach((p, i) => {
    const a = i * 2.39996 // golden angle: nicely scattered, never lined up
    const v = circularSpeed(sun.m, p.d)
    const b = makeBody(p.kind, Math.cos(a) * p.d, Math.sin(a) * p.d, -Math.sin(a) * v, Math.cos(a) * v)
    Object.assign(b, { name: p.name, r: p.r, m: p.m, color: p.color, color2: p.color2, ring: p.ring, seed: 0.13 + i * 0.11 })
    bodies.push(b)
  })
  return bodies
}

function accelerations(bodies: Body[], ax: Float64Array, ay: Float64Array) {
  ax.fill(0)
  ay.fill(0)
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i]
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const d2 = dx * dx + dy * dy + SOFTEN * SOFTEN
      const inv = G / (d2 * Math.sqrt(d2))
      ax[i] += dx * inv * b.m
      ay[i] += dy * inv * b.m
      ax[j] -= dx * inv * a.m
      ay[j] -= dy * inv * a.m
    }
  }
}

/** Advance the physics by dt seconds (symplectic Euler, a few substeps). */
export function integrate(bodies: Body[], dt: number, substeps = 4) {
  const ax = new Float64Array(bodies.length)
  const ay = new Float64Array(bodies.length)
  const h = dt / substeps
  for (let s = 0; s < substeps; s++) {
    accelerations(bodies, ax, ay)
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i]
      b.vx += ax[i] * h
      b.vy += ay[i] * h
      b.x += b.vx * h
      b.y += b.vy * h
    }
  }
}

/** Physics + bookkeeping for one frame. Returns bursts from collisions this frame. */
export function step(bodies: Body[], dt: number, trails: boolean): { bodies: Body[]; bursts: Burst[] } {
  integrate(bodies, dt)
  const bursts: Burst[] = []

  // Collisions: merge into the heavier body.
  const dead = new Set<number>()
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i]
    if (dead.has(a.id)) continue
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j]
      if (dead.has(b.id)) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      if (dx * dx + dy * dy > (a.r + b.r) * (a.r + b.r) * 0.6) continue
      const [big, small] = a.m >= b.m ? [a, b] : [b, a]
      const m = big.m + small.m
      big.vx = (big.vx * big.m + small.vx * small.m) / m
      big.vy = (big.vy * big.m + small.vy * small.m) / m
      big.x = (big.x * big.m + small.x * small.m) / m
      big.y = (big.y * big.m + small.y * small.m) / m
      // Planets grow by volume; stars just get heavier (and a bit bigger).
      big.r = big.kind === 'star' ? Math.min(70, big.r * Math.cbrt(m / big.m) ** 0.5) : Math.cbrt(big.r ** 3 + small.r ** 3)
      // Enough rock and a moon becomes a planet, enough mass and a planet a gas giant.
      if (big.kind === 'moon' && big.r > 9) big.kind = 'rock'
      if (big.kind === 'rock' && big.r > 19) {
        big.kind = 'gas'
        big.color2 = small.color
      }
      big.m = m
      big.age = 0
      dead.add(small.id)
      bursts.push({ x: small.x, y: small.y, color: small.color, t: 0, size: small.r + big.r * 0.5 })
    }
  }
  let alive = dead.size ? bodies.filter((b) => !dead.has(b.id)) : bodies
  // Flung off into the void.
  alive = alive.filter((b) => b.x * b.x + b.y * b.y < ESCAPE * ESCAPE || b.kind === 'star')

  // Orbits: which star holds each body, is it bound, how many laps.
  const stars = alive.filter((b) => b.kind === 'star')
  for (const b of alive) {
    b.age += dt
    if (trails) {
      b.trail.push(b.x, b.y)
      if (b.trail.length > TRAIL_POINTS * 2) b.trail.splice(0, 2)
    } else if (b.trail.length) b.trail.length = 0
    if (b.kind === 'star') continue
    let host: Body | null = null
    let pull = 0
    for (const s of stars) {
      const p = s.m / ((s.x - b.x) ** 2 + (s.y - b.y) ** 2)
      if (p > pull) {
        pull = p
        host = s
      }
    }
    if (!host) {
      b.bound = 0
      b.host = null
      b.angle = null
      continue
    }
    const dx = b.x - host.x
    const dy = b.y - host.y
    const rvx = b.vx - host.vx
    const rvy = b.vy - host.vy
    const energy = (rvx * rvx + rvy * rvy) / 2 - (G * host.m) / Math.hypot(dx, dy)
    if (energy < 0 && host.id === b.host) {
      b.bound += dt
      const angle = Math.atan2(dy, dx)
      if (b.angle !== null) {
        let d = angle - b.angle
        d = Math.atan2(Math.sin(d), Math.cos(d))
        b.orbits += Math.abs(d) / (Math.PI * 2)
      }
      b.angle = angle
    } else {
      b.bound = 0
      b.angle = null
    }
    b.host = host.id
  }
  return { bodies: alive, bursts }
}

/** Where a body thrown now would go: positions of the thrown body over the next few seconds. */
export function predict(bodies: Body[], thrown: Body, seconds: number, samples: number): number[] {
  const ghost = [...bodies.map((b) => ({ ...b, trail: [] })), { ...thrown, trail: [] }]
  const me = ghost[ghost.length - 1]
  const out: number[] = []
  const dt = seconds / samples
  for (let i = 0; i < samples; i++) {
    integrate(ghost, dt, 2)
    out.push(me.x, me.y)
    // Stop the line where it would hit something.
    if (ghost.some((b) => b !== me && Math.hypot(b.x - me.x, b.y - me.y) < (b.r + me.r) * 0.6)) break
  }
  return out
}
