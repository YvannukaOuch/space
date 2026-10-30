import type { FeatureKind } from './kit'

/**
 * What each world looks like up close. Rocky worlds are drawn "tiny planet" style: seen
 * from above a pole, slowly turning like a wheel, with everything living on the horizon
 * standing up around the edge. Gas giants are seen from the side, their bands and storms
 * drifting. Angles are in degrees around the planet (they turn with it).
 */

export interface Feature {
  kind: FeatureKind
  /** Where on the planet (radians, turns with it). */
  a: number
  /** Size multiplier of the feature unit. */
  s: number
  /** Per-object random 0..1 (variant, animation phase). */
  v: number
  /** Height in size units (towers, mountains, volcanoes). */
  h?: number
  color?: string
}

/** A stretch of the horizon with its own ground: ocean, forest, desert... */
export interface Ground {
  a0: number
  a1: number
  /** Colour of the ground along the horizon, and of the land on the planet's face. */
  color: string
  face?: string
  ocean?: boolean
  /** Detail painted on this stretch of the face, seen from above. */
  tex?: 'trees' | 'jungle' | 'town' | 'city' | 'fields' | 'peaks' | 'dunes' | 'ice' | 'craters' | 'lava'
}

export interface Moon {
  name: string
  /** Radius and orbit size as multiples of the planet's radius; seconds per orbit. */
  r: number
  d: number
  period: number
  phase: number
  color: string
  color2: string
  /** Potato-shaped (Phobos, Deimos). */
  lumpy?: boolean
  /** Geysers / volcanic plume (Enceladus, Triton, Io). */
  plume?: string
  /** Thick haze (Titan). */
  haze?: string
  /** Surface pattern. */
  pattern?: 'craters' | 'cracks' | 'volcanoes' | 'patchwork' | 'bigcrater'
  /** Orbit plane tilt (radians). */
  tilt?: number
}

export interface Craft {
  name: string
  d: number
  period: number
  phase: number
  kind: 'station' | 'wings' | 'tri' | 'shield' | 'telescope'
}

export interface Band {
  /** Centre and height as fractions of the radius (-1 top .. 1 bottom). */
  y: number
  h: number
  color: string
  /** Drift (radius-widths per second) and waviness. */
  speed: number
  wave: number
}

export interface Storm {
  y: number
  rx: number
  ry: number
  color: string
  color2: string
  speed: number
  phase: number
}

export interface Ring {
  inner: number
  outer: number
  color: string
  color2: string
  /** Tilt of the ring plane on screen (radians) and how flat the ellipse looks. */
  tilt: number
  flat: number
  /** Few narrow rings (Uranus) vs broad sheets (Saturn). */
  style: 'broad' | 'narrow' | 'faint'
}

export interface World {
  name: string
  subtitle: string
  kind: 'rock' | 'gas' | 'star'
  base: string
  ground: Ground[]
  features: Feature[]
  clouds?: { count: number; alt: number; spread: number; speed: number; color: string; alpha: number; size: number; surfaceLocked: boolean }
  lightning?: boolean
  birds?: boolean
  planes?: boolean
  moons: Moon[]
  craft: Craft[]
  atmosphere?: { color: string; size: number }
  ring?: Ring
  bands?: Band[]
  storms?: Storm[]
  /** Rotate the whole banded face (Uranus lies on its side). */
  faceTilt?: number
  /** Apparent size of the Sun in this world's sky (fraction of the planet's radius). */
  sunSize: number
  /** Turning speed (rad/s) for rocky worlds; band drift multiplier for gas giants. */
  spin: number
  /** What to look out for, shown in the panel. */
  spot: string[]
  /** What the alien says while visiting. */
  alien: string[]
}

const deg = (d: number) => (d * Math.PI) / 180

/** Small deterministic PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Helpers to lay out features along stretches of the horizon. */
function layout(seed: number) {
  const r = rng(seed)
  const features: Feature[] = []
  const add = (kind: FeatureKind, aDeg: number, s = 1, extra: Partial<Feature> = {}) =>
    features.push({ kind, a: deg(aDeg), s, v: r(), ...extra })
  /** `n` objects spread evenly (with jitter) over [a0, a1] degrees. */
  const spread = (kind: FeatureKind, a0: number, a1: number, n: number, sMin = 0.85, sMax = 1.2, extra: () => Partial<Feature> = () => ({})) => {
    for (let i = 0; i < n; i++) add(kind, a0 + ((a1 - a0) * (i + 0.15 + r() * 0.7)) / n, sMin + r() * (sMax - sMin), extra())
  }
  return { features, add, spread, r }
}

// ------------------------------------------------------------------ Earth

function earth(): World {
  const { features, add, spread, r } = layout(7)
  // Ocean: a ship, a whale, sailboats.
  add('ship', 10, 1.1)
  add('whale', 22, 1.1)
  add('sailboat', 31)
  // Beach and jungle.
  spread('palm', 38, 58, 6, 0.9, 1.25)
  spread('tree', 56, 74, 5, 0.9, 1.2)
  add('campfire', 66, 0.9)
  // Forest with deer and a campsite.
  spread('pine', 74, 118, 14, 0.8, 1.35)
  spread('tree', 76, 116, 8, 0.85, 1.25)
  add('deer', 88, 0.9)
  add('deer', 103, 0.85)
  add('campfire', 111, 0.9)
  // Town: houses, a windmill, garden trees.
  spread('house', 119, 139, 7, 0.9, 1.15)
  spread('tree', 121, 137, 3, 0.75, 0.95)
  add('windmill', 136, 1.1)
  // City: towers of all heights, a ferris wheel, a radio mast.
  spread('tower', 140, 167, 12, 0.95, 1.15, () => ({ h: 2.4 + r() * 5.4 }))
  add('ferrisWheel', 146, 1)
  add('radioTower', 165, 1)
  // Farmland: fields, a barn, wind turbines, a balloon.
  spread('field', 168, 194, 5, 1, 1.1)
  add('barn', 178, 1)
  spread('turbine', 170, 196, 4, 0.95, 1.1)
  add('balloon', 183, 1.1)
  // Mountains with pines at their feet.
  add('mountain', 201, 1, { h: 4.2 })
  add('mountain', 210, 1, { h: 6.2 })
  add('mountain', 219, 1, { h: 4.8 })
  add('mountain', 228, 1, { h: 3.4 })
  spread('pine', 197, 234, 8, 0.75, 1.05)
  // Desert: dunes, cacti, pyramids, a rocket launch site.
  spread('dune', 236, 266, 6, 0.9, 1.3)
  spread('cactus', 238, 262, 5, 0.85, 1.15)
  add('pyramid', 244, 1, {})
  add('pyramid', 249, 0.8, {})
  add('pyramid', 253, 0.6, {})
  add('rocket', 261, 1.05)
  // Second ocean.
  add('sailboat', 274)
  add('ship', 286, 1.05)
  add('whale', 297, 1.2)
  add('sailboat', 309)
  // Volcanic island with a lighthouse.
  add('volcano', 324, 1, { h: 2.2 })
  spread('palm', 317, 333, 4, 0.8, 1.05)
  add('lighthouse', 331, 1)
  // Ice: igloos and penguins.
  add('igloo', 341, 1)
  add('igloo', 354, 0.85)
  spread('penguin', 338, 359, 7, 0.8, 1.05)
  return {
    name: 'Earth',
    subtitle: 'Home: the only place we know of with life',
    kind: 'rock',
    base: '#3a8ee6',
    ground: [
      { a0: 0, a1: 38, color: '#3a8ee6', ocean: true },
      { a0: 38, a1: 74, color: '#43b25c', face: '#3fa957', tex: 'jungle' },
      { a0: 74, a1: 118, color: '#3a9b55', face: '#378f4f', tex: 'trees' },
      { a0: 118, a1: 140, color: '#78c96d', face: '#6cbf65', tex: 'town' },
      { a0: 140, a1: 168, color: '#9aa2b4', face: '#8e9a8a', tex: 'city' },
      { a0: 168, a1: 196, color: '#a8d26b', face: '#9dc963', tex: 'fields' },
      { a0: 196, a1: 236, color: '#8f9bb3', face: '#7f9a7a', tex: 'peaks' },
      { a0: 236, a1: 268, color: '#efcf8c', face: '#e7c57f', tex: 'dunes' },
      { a0: 268, a1: 316, color: '#3a8ee6', ocean: true },
      { a0: 316, a1: 336, color: '#46b25e', face: '#43a95a', tex: 'jungle' },
      { a0: 336, a1: 360, color: '#eef6ff', face: '#f4f8ff', tex: 'ice' },
    ],
    features,
    clouds: { count: 16, alt: 0.2, spread: 0.08, speed: 0.012, color: '#ffffff', alpha: 0.95, size: 1.5, surfaceLocked: true },
    birds: true,
    planes: true,
    moons: [{ name: 'Moon', r: 0.27, d: 2.3, period: 80, phase: 1.1, color: '#d9d6e8', color2: '#aeabc8', pattern: 'craters', tilt: -0.12 }],
    craft: [
      { name: 'ISS', d: 1.42, period: 15, phase: 0.6, kind: 'station' },
      { name: 'Hubble', d: 1.62, period: 21, phase: 3.4, kind: 'telescope' },
    ],
    atmosphere: { color: '120, 190, 255', size: 0.17 },
    sunSize: 0.17,
    spin: 0.04,
    spot: [
      'Forests, jungles and a deer or two',
      'A town with smoking chimneys',
      'A city that lights up at night',
      'Farms, wind turbines and a balloon',
      'Snowy mountains and pyramids',
      'A rocket that launches now and then',
      'Ships, sailboats and a whale',
      'A lighthouse that shines after dark',
      'Penguins and igloos',
      'Birds, planes, the ISS, Hubble and the Moon',
    ],
    alien: [
      'Look at all the tiny trees!',
      'Humans live in little boxes.',
      'The city never sleeps. Neither do I.',
      'Penguins! The best Earthlings.',
      'A whale! Hello, big sea friend!',
      'Their rockets are so cute.',
      'Moo? I will take one of those.',
    ],
  }
}

// ------------------------------------------------------------------ Mars

function mars(): World {
  const { features, add, spread, r } = layout(11)
  spread('rock', 0, 360, 42, 0.6, 1.4, () => ({ color: r() > 0.5 ? '#a8492b' : '#8f3d25' }))
  add('rover', 32, 1.05)
  add('lander', 64, 1)
  add('copter', 80, 1)
  add('dustDevil', 50, 1.1)
  add('shield', 122, 1, { h: 1.7, color: '#c95a34' })
  add('shield', 141, 1.3, { h: 2.6, color: '#c45633' })
  add('shield', 160, 1, { h: 1.5, color: '#c95a34' })
  add('canyon', 186, 1.3, { color: '#7a3420' })
  add('canyon', 196, 1, { color: '#7a3420' })
  spread('dune', 214, 280, 9, 0.9, 1.4, () => ({ color: r() > 0.5 ? '#e0773f' : '#d36a36' }))
  add('dustDevil', 236, 1.3)
  add('rover', 262, 1.05)
  add('dustDevil', 300, 1)
  spread('craterRim', 300, 350, 4, 0.9, 1.3, () => ({ color: '#b9532f' }))
  return {
    name: 'Mars',
    subtitle: 'The red planet, home to a small crowd of robots',
    kind: 'rock',
    base: '#d9663c',
    ground: [
      { a0: 0, a1: 112, color: '#d9663c', face: '#c85a34', tex: 'craters' },
      { a0: 112, a1: 172, color: '#c95a34', face: '#b54d2c', tex: 'craters' },
      { a0: 172, a1: 206, color: '#b54d2c', face: '#9c4226' },
      { a0: 206, a1: 290, color: '#e07a48', face: '#d86f3e', tex: 'dunes' },
      { a0: 290, a1: 360, color: '#d36536', face: '#c25a32', tex: 'craters' },
    ],
    features,
    clouds: { count: 7, alt: 0.16, spread: 0.06, speed: 0.01, color: '#f6c9b0', alpha: 0.35, size: 1.6, surfaceLocked: true },
    moons: [
      { name: 'Phobos', r: 0.075, d: 1.55, period: 10, phase: 0.4, color: '#8f7d6e', color2: '#6f5f52', lumpy: true, pattern: 'craters' },
      { name: 'Deimos', r: 0.05, d: 2.15, period: 24, phase: 2.6, color: '#a4927f', color2: '#86766a', lumpy: true },
    ],
    craft: [{ name: 'MAVEN', d: 1.3, period: 13, phase: 4.2, kind: 'wings' }],
    atmosphere: { color: '255, 160, 120', size: 0.07 },
    sunSize: 0.12,
    spin: 0.04,
    spot: [
      'Curiosity and Perseverance, the rovers',
      'InSight, the lander that listened for marsquakes',
      'Ingenuity, the little helicopter',
      'Olympus Mons: the tallest volcano anywhere, ~22 km',
      'Valles Marineris: a canyon as long as the USA is wide',
      'Dust devils and red dunes',
      'Phobos and Deimos, two potato moons',
    ],
    alien: [
      'The little robot looks lonely. I wave.',
      'Dust devil! Wheee!',
      'Olympus Mons: nearly 3 Everests tall.',
      'Free real estate. Bring a coat.',
      'Is the helicopter a cousin of mine?',
    ],
  }
}

// ------------------------------------------------------------------ Mercury

function mercury(): World {
  const { features, spread, add, r } = layout(5)
  spread('craterRim', 0, 360, 22, 0.8, 1.8, () => ({ color: r() > 0.5 ? '#a39b93' : '#968e86' }))
  spread('rock', 0, 360, 26, 0.5, 1.2, () => ({ color: '#8e867e' }))
  add('scarp', 70, 1.2, { color: '#a39b93' })
  add('scarp', 205, 1.4, { color: '#9c948c' })
  add('scarp', 300, 1, { color: '#a39b93' })
  return {
    name: 'Mercury',
    subtitle: 'The smallest planet, and the closest to the Sun',
    kind: 'rock',
    base: '#9b948d',
    ground: [{ a0: 0, a1: 360, color: '#a39b93', face: '#9b948d', tex: 'craters' }],
    features,
    moons: [],
    craft: [{ name: 'BepiColombo', d: 1.38, period: 17, phase: 1.3, kind: 'wings' }],
    sunSize: 0.36,
    spin: 0.012,
    spot: ['Craters on craters on craters', 'Cliffs hundreds of km long, where the planet shrank', 'A Sun almost three times bigger than from Earth', 'BepiColombo, on its way in'],
    alien: ['The Sun is SO big here!', 'Craters everywhere. Messy neighbour.', 'Hot side 430 °C, cold side −180 °C.', 'One day here lasts two of its years!'],
  }
}

// ------------------------------------------------------------------ Venus

function venus(): World {
  const { features, add, spread, r } = layout(9)
  spread('rock', 0, 360, 30, 0.6, 1.3, () => ({ color: r() > 0.5 ? '#a86b3a' : '#94592f' }))
  add('volcano', 25, 1.2, { h: 3.2 })
  add('volcano', 95, 1, { h: 2.4 })
  add('volcano', 160, 1.4, { h: 3.6 })
  add('volcano', 250, 1, { h: 2.6 })
  add('volcano', 318, 1.1, { h: 2.9 })
  add('veneraLander', 205, 1.1)
  return {
    name: 'Venus',
    subtitle: 'The hottest planet, under clouds of sulfuric acid',
    kind: 'rock',
    base: '#e7b664',
    ground: [{ a0: 0, a1: 360, color: '#c98d4a' }],
    features,
    clouds: { count: 34, alt: 0.2, spread: 0.12, speed: 0.11, color: '#f3d38a', alpha: 0.82, size: 1.9, surfaceLocked: false },
    lightning: true,
    moons: [],
    craft: [{ name: 'Akatsuki', d: 1.62, period: 22, phase: 0.2, kind: 'wings' }],
    atmosphere: { color: '255, 214, 130', size: 0.3 },
    sunSize: 0.24,
    spin: -0.006,
    spot: [
      'Active-looking volcanoes (Venus has over 1,600)',
      'A Venera lander: it lasted 2 hours in the heat',
      'Clouds racing round 60x faster than the ground turns',
      'Lightning in the clouds',
      'The ground turns backwards compared to most planets',
    ],
    alien: ['Acid clouds. I am melting!', 'Volcanoes AND lightning. Nope.', 'A day here is longer than a year!', 'The clouds lap the planet in 4 days. The ground takes 243.'],
  }
}

// ------------------------------------------------------------------ gas giants

function jupiter(): World {
  return {
    name: 'Jupiter',
    subtitle: 'The giant: more than twice the mass of all other planets combined',
    kind: 'gas',
    base: '#ecd0b2',
    ground: [],
    features: [],
    bands: [
      { y: -0.93, h: 0.1, color: '#b98f72', speed: 0.01, wave: 0.01 },
      { y: -0.78, h: 0.12, color: '#c99877', speed: -0.02, wave: 0.015 },
      { y: -0.6, h: 0.11, color: '#b77f5c', speed: 0.03, wave: 0.02 },
      { y: -0.43, h: 0.12, color: '#ead0b0', speed: -0.025, wave: 0.02 },
      { y: -0.25, h: 0.15, color: '#c2835a', speed: 0.04, wave: 0.03 },
      { y: -0.06, h: 0.13, color: '#f6e4cd', speed: -0.02, wave: 0.02 },
      { y: 0.1, h: 0.08, color: '#e9c8a4', speed: 0.035, wave: 0.02 },
      { y: 0.25, h: 0.16, color: '#b9744f', speed: -0.045, wave: 0.03 },
      { y: 0.45, h: 0.11, color: '#e3b48c', speed: 0.03, wave: 0.02 },
      { y: 0.62, h: 0.12, color: '#c9845c', speed: -0.02, wave: 0.015 },
      { y: 0.79, h: 0.11, color: '#d6a682', speed: 0.015, wave: 0.01 },
      { y: 0.93, h: 0.1, color: '#b98f72', speed: -0.01, wave: 0.01 },
    ],
    storms: [
      { y: 0.36, rx: 0.24, ry: 0.13, color: '#cf5a3c', color2: '#eb9264', speed: 0.025, phase: 0.2 },
      { y: -0.5, rx: 0.07, ry: 0.035, color: '#fbf3e8', color2: '#ffffff', speed: -0.03, phase: 1.1 },
      { y: -0.5, rx: 0.06, ry: 0.03, color: '#fbf3e8', color2: '#ffffff', speed: -0.03, phase: 1.7 },
      { y: -0.5, rx: 0.065, ry: 0.032, color: '#fbf3e8', color2: '#ffffff', speed: -0.03, phase: 2.3 },
      { y: 0.13, rx: 0.12, ry: 0.025, color: '#8a5038', color2: '#a2644a', speed: 0.04, phase: 0.9 },
      { y: 0.55, rx: 0.09, ry: 0.04, color: '#f3e1cf', color2: '#ffffff', speed: 0.03, phase: 2.6 },
    ],
    lightning: true,
    moons: [
      { name: 'Io', r: 0.075, d: 1.6, period: 11, phase: 0.3, color: '#f0cf55', color2: '#c98a2d', pattern: 'volcanoes', plume: '170, 200, 255' },
      { name: 'Europa', r: 0.065, d: 1.95, period: 19, phase: 2.2, color: '#efe6d6', color2: '#b98a5e', pattern: 'cracks' },
      { name: 'Ganymede', r: 0.1, d: 2.35, period: 31, phase: 4.1, color: '#b4a28c', color2: '#8c7a66', pattern: 'patchwork' },
      { name: 'Callisto', r: 0.09, d: 2.75, period: 47, phase: 5.4, color: '#7f7266', color2: '#5e534a', pattern: 'craters' },
    ],
    craft: [{ name: 'Juno', d: 1.26, period: 14, phase: 1.2, kind: 'tri' }],
    atmosphere: { color: '255, 220, 185', size: 0.06 },
    ring: { inner: 1.25, outer: 1.42, color: '#c9a98a', color2: '#a98a70', tilt: -0.08, flat: 0.12, style: 'faint' },
    sunSize: 0.055,
    spin: 1,
    spot: [
      'The Great Red Spot: a storm wider than Earth, raging for 350+ years',
      'White ovals and dark "barges": more storms',
      'Belts and zones flowing in opposite directions',
      'Lightning on the night side',
      'Io (volcanoes!), Europa (an ocean under the ice), Ganymede, Callisto',
      'A faint ring, and Juno',
    ],
    alien: ['The red spot is staring at me.', 'Io keeps erupting. Rude.', 'Europa has an ocean under the ice. Swim?', '95 moons. Greedy.', 'No ground to land on. Hovering it is.'],
  }
}

function saturn(): World {
  return {
    name: 'Saturn',
    subtitle: 'Rings of ice, and 146 moons',
    kind: 'gas',
    base: '#f0d595',
    ground: [],
    features: [],
    bands: [
      { y: -0.88, h: 0.14, color: '#d2aa63', speed: 0.01, wave: 0.01 },
      { y: -0.66, h: 0.12, color: '#e6c47c', speed: -0.02, wave: 0.012 },
      { y: -0.44, h: 0.13, color: '#f6e2ad', speed: 0.025, wave: 0.015 },
      { y: -0.22, h: 0.12, color: '#e5c886', speed: -0.02, wave: 0.015 },
      { y: 0.0, h: 0.14, color: '#f8e7b8', speed: 0.03, wave: 0.015 },
      { y: 0.22, h: 0.12, color: '#dcb978', speed: -0.025, wave: 0.015 },
      { y: 0.44, h: 0.12, color: '#efd59a', speed: 0.02, wave: 0.012 },
      { y: 0.66, h: 0.12, color: '#d4ad66', speed: -0.015, wave: 0.01 },
      { y: 0.88, h: 0.14, color: '#c99f5a', speed: 0.01, wave: 0.01 },
    ],
    storms: [{ y: -0.3, rx: 0.06, ry: 0.025, color: '#fbf1d6', color2: '#ffffff', speed: 0.04, phase: 1.5 }],
    ring: { inner: 1.28, outer: 2.3, color: '#e8d3a2', color2: '#c4a878', tilt: -0.36, flat: 0.27, style: 'broad' },
    moons: [
      { name: 'Mimas', r: 0.04, d: 2.55, period: 12, phase: 0.9, color: '#d9d6d0', color2: '#a8a59f', pattern: 'bigcrater' },
      { name: 'Enceladus', r: 0.045, d: 2.75, period: 16, phase: 3.3, color: '#f6f9ff', color2: '#cdd9ee', plume: '225, 240, 255', pattern: 'cracks' },
      { name: 'Rhea', r: 0.06, d: 3.05, period: 24, phase: 5.0, color: '#cfcac2', color2: '#a39d94', pattern: 'craters' },
      { name: 'Titan', r: 0.11, d: 3.4, period: 40, phase: 2.0, color: '#e2a64c', color2: '#c98a3a', haze: '255, 190, 100' },
    ],
    craft: [{ name: 'Cassini', d: 1.18, period: 12, phase: 4.6, kind: 'wings' }],
    atmosphere: { color: '255, 235, 195', size: 0.06 },
    sunSize: 0.04,
    spin: 1,
    spot: [
      'Rings made of ice chunks, from dust to houses in size',
      'The Cassini Division: the dark gap in the rings',
      'The rings’ shadow across the planet',
      'Titan: thicker air than Earth, and lakes of methane',
      'Enceladus spraying ice from its south pole',
      'Mimas: one giant crater (it looks like a space station)',
    ],
    alien: ['The rings are ice. I licked one.', 'Mimas looks like a space station. Suspicious.', 'Enceladus sprays ice. Free slushie!', 'Saturn would float in a bathtub.'],
  }
}

function uranus(): World {
  return {
    name: 'Uranus',
    subtitle: 'The planet that rolls around on its side',
    kind: 'gas',
    base: '#9de3e5',
    ground: [],
    features: [],
    faceTilt: deg(82),
    bands: [
      { y: -0.7, h: 0.18, color: '#93d9dd', speed: 0.01, wave: 0.006 },
      { y: -0.35, h: 0.14, color: '#a8ebec', speed: -0.01, wave: 0.006 },
      { y: 0.0, h: 0.16, color: '#9adfe2', speed: 0.012, wave: 0.006 },
      { y: 0.35, h: 0.14, color: '#a2e6e8', speed: -0.01, wave: 0.006 },
      { y: 0.72, h: 0.2, color: '#b8f0f0', speed: 0.008, wave: 0.006 },
    ],
    storms: [{ y: -0.42, rx: 0.07, ry: 0.035, color: '#e8fbfb', color2: '#ffffff', speed: 0.03, phase: 0.6 }],
    ring: { inner: 1.45, outer: 1.78, color: '#d5eef2', color2: '#9fc3cd', tilt: deg(82), flat: 0.24, style: 'narrow' },
    moons: [
      { name: 'Miranda', r: 0.045, d: 2.0, period: 14, phase: 0.5, color: '#c8c3bd', color2: '#8f8a84', pattern: 'patchwork', tilt: deg(82) },
      { name: 'Ariel', r: 0.06, d: 2.35, period: 20, phase: 2.4, color: '#d4d0ca', color2: '#a29d96', pattern: 'craters', tilt: deg(82) },
      { name: 'Titania', r: 0.075, d: 2.75, period: 30, phase: 4.2, color: '#c2b8ad', color2: '#93887d', pattern: 'craters', tilt: deg(82) },
    ],
    craft: [{ name: 'Voyager 2', d: 1.6, period: 26, phase: 3.0, kind: 'wings' }],
    atmosphere: { color: '160, 240, 245', size: 0.12 },
    sunSize: 0.028,
    spin: 1,
    spot: ['Tipped over by 98°: it orbits the Sun on its side', 'Thin dark rings, standing almost upright', 'Miranda: a moon that looks stitched together', 'Voyager 2: the only spacecraft to visit'],
    alien: ['It rolls on its side. Relatable.', 'Smells like rotten eggs. Truly.', 'Miranda looks stitched together. Spooky.', 'Each pole gets 42 years of sun, then 42 of night.'],
  }
}

function neptune(): World {
  return {
    name: 'Neptune',
    subtitle: 'The windiest place in the solar system',
    kind: 'gas',
    base: '#4f72ee',
    ground: [],
    features: [],
    bands: [
      { y: -0.85, h: 0.16, color: '#4466dc', speed: 0.02, wave: 0.01 },
      { y: -0.55, h: 0.12, color: '#5a7cf5', speed: -0.03, wave: 0.012 },
      { y: -0.22, h: 0.16, color: '#4a6ce6', speed: 0.04, wave: 0.015 },
      { y: 0.12, h: 0.14, color: '#5b7ef6', speed: -0.035, wave: 0.015 },
      { y: 0.45, h: 0.16, color: '#4364d8', speed: 0.03, wave: 0.012 },
      { y: 0.8, h: 0.18, color: '#3d5bcf', speed: -0.02, wave: 0.01 },
    ],
    storms: [
      { y: -0.2, rx: 0.2, ry: 0.11, color: '#2a3f9e', color2: '#3a52b8', speed: 0.03, phase: 0.4 },
      { y: -0.36, rx: 0.12, ry: 0.025, color: '#ffffff', color2: '#ffffff', speed: 0.03, phase: 0.45 },
      { y: 0.38, rx: 0.1, ry: 0.022, color: '#ffffff', color2: '#ffffff', speed: 0.12, phase: 1.8 },
      { y: 0.55, rx: 0.07, ry: 0.03, color: '#2f47ae', color2: '#4a64c8', speed: 0.06, phase: 2.9 },
    ],
    moons: [{ name: 'Triton', r: 0.085, d: 2.3, period: -30, phase: 1.4, color: '#e8cdc6', color2: '#c39a92', plume: '255, 235, 235', pattern: 'patchwork' }],
    craft: [{ name: 'Voyager 2', d: 1.55, period: 24, phase: 4.4, kind: 'wings' }],
    atmosphere: { color: '110, 150, 255', size: 0.12 },
    ring: { inner: 1.5, outer: 1.62, color: '#9fb4e8', color2: '#7e94cf', tilt: -0.12, flat: 0.2, style: 'faint' },
    sunSize: 0.022,
    spin: 1,
    spot: ['The Great Dark Spot, a storm the size of Earth', '"Scooter": a white cloud that laps the planet fast', 'Winds up to 2,100 km/h', 'Triton orbits backwards, with nitrogen geysers', 'Faint, clumpy rings'],
    alien: ['Winds of 2,000 km/h. My hat is gone.', 'Triton orbits backwards. Rebel.', 'It might rain diamonds in there!', 'Found with maths before telescopes. Nerds.'],
  }
}

// ------------------------------------------------------------------ the Sun

function sun(): World {
  return {
    name: 'Sun',
    subtitle: 'Our star: 99.86 % of everything in the solar system',
    kind: 'star',
    base: '#ffc94a',
    ground: [],
    features: [],
    moons: [],
    craft: [
      { name: 'Parker Solar Probe', d: 1.55, period: 9, phase: 0.5, kind: 'shield' },
      { name: 'SOHO', d: 2.1, period: 40, phase: 3.6, kind: 'wings' },
    ],
    sunSize: 0,
    spin: 0.015,
    spot: [
      'Granulation: boiling cells, each about the size of a country',
      'Sunspots: cooler, darker patches',
      'Prominences: loops of plasma bigger than Earth',
      'Solar flares and the solar wind streaming out',
      'Parker Solar Probe, the fastest thing humans have built',
    ],
    alien: ['Too bright! My eye!', 'Solar flare! Duck!', 'Do not lick. I learned this.', 'It burns 600 million tonnes of hydrogen a second.'],
  }
}

export const WORLDS: Record<string, World> = Object.fromEntries(
  [sun(), mercury(), venus(), earth(), mars(), jupiter(), saturn(), uranus(), neptune()].map((w) => [w.name, w]),
)
