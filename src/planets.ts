import type { Kind } from './sim'

/**
 * Our solar system, Kurzgesagt-style: real order, colours and facts; distances and sizes
 * squashed so everything fits on one screen (real Neptune would be ~80x further out than
 * Mercury and the Sun ~10x Jupiter's width).
 */

export interface PlanetInfo {
  name: string
  kind: Kind
  /** Display distance from the Sun and radius (world units). */
  d: number
  r: number
  /** Kept small so the planets barely tug on each other, like the real thing. */
  m: number
  color: string
  color2: string
  ring?: 'wide' | 'thin'
  /** Real numbers for the info card. */
  facts: { label: string; value: string }[]
  blurb: string
  /** What the alien thinks of it. */
  alien: string[]
}

export const SUN = {
  name: 'Sun',
  r: 42,
  color: '#ffc94a',
  color2: '#ffe9a8',
  facts: [
    { label: 'Diameter', value: '1.39 million km' },
    { label: 'Surface', value: '5,500 °C' },
    { label: 'Age', value: '4.6 billion years' },
    { label: 'Share of all mass here', value: '99.86 %' },
  ],
  blurb: 'A fairly ordinary star that holds everything here together. It turns 4 million tonnes of itself into light every second.',
  alien: ['99.8% of everything here. Show-off.', 'Do not lick. I learned this.', 'Big warm ball. I like it from here.'],
}

export const PLANETS: PlanetInfo[] = [
  {
    name: 'Mercury',
    kind: 'rock',
    d: 95,
    r: 5,
    m: 0.5,
    color: '#b6ada4',
    color2: '#857c74',
    facts: [
      { label: 'Diameter', value: '4,879 km' },
      { label: 'Day', value: '176 Earth days' },
      { label: 'Year', value: '88 Earth days' },
      { label: 'Moons', value: '0' },
    ],
    blurb: 'The smallest planet and the closest to the Sun: 430 °C by day, −180 °C at night.',
    alien: ['Too hot. Then too cold. Two stars.', 'Tiny and very fast. Respect.'],
  },
  {
    name: 'Venus',
    kind: 'gas',
    d: 135,
    r: 9,
    m: 4,
    color: '#f2c879',
    color2: '#e3ad55',
    facts: [
      { label: 'Diameter', value: '12,104 km' },
      { label: 'Day', value: '243 Earth days' },
      { label: 'Year', value: '225 Earth days' },
      { label: 'Moons', value: '0' },
    ],
    blurb: 'The hottest planet (465 °C), wrapped in clouds of sulfuric acid. Its day is longer than its year.',
    alien: ['Acid rain! Very refreshing. Not.', 'Lovely clouds. Do not breathe them.'],
  },
  {
    name: 'Earth',
    kind: 'rock',
    d: 180,
    r: 10,
    m: 5,
    color: '#4a9cf0',
    color2: '#5fcf73',
    facts: [
      { label: 'Diameter', value: '12,742 km' },
      { label: 'Day', value: '24 hours' },
      { label: 'Year', value: '365.25 days' },
      { label: 'Moons', value: '1' },
    ],
    blurb: 'The only place we know of with life, and the densest planet in the solar system.',
    alien: ['Blue one has snacks. And humans.', 'They put pineapple on pizza here.', 'Hello humans! Take me to your cat.'],
  },
  {
    name: 'Mars',
    kind: 'rock',
    d: 228,
    r: 7,
    m: 1,
    color: '#e2683f',
    color2: '#b4462b',
    facts: [
      { label: 'Diameter', value: '6,779 km' },
      { label: 'Day', value: '24 h 37 min' },
      { label: 'Year', value: '687 Earth days' },
      { label: 'Moons', value: '2' },
    ],
    blurb: 'A cold desert with the tallest volcano in the solar system, Olympus Mons, 22 km high.',
    alien: ['Full of little human robots. Cute.', 'Red dust everywhere. My saucer is ruined.'],
  },
  {
    name: 'Jupiter',
    kind: 'gas',
    d: 380,
    r: 26,
    m: 60,
    color: '#e9b88f',
    color2: '#c9845c',
    facts: [
      { label: 'Diameter', value: '139,820 km' },
      { label: 'Day', value: '9 h 56 min' },
      { label: 'Year', value: '11.9 Earth years' },
      { label: 'Moons', value: '95' },
    ],
    blurb: 'More than twice as massive as all the other planets combined. The Great Red Spot is a storm bigger than Earth.',
    alien: ['That storm is older than your country.', 'Big boy. 95 moons. Greedy.'],
  },
  {
    name: 'Saturn',
    kind: 'gas',
    d: 490,
    r: 21,
    m: 30,
    color: '#f1d493',
    color2: '#d8b46c',
    ring: 'wide',
    facts: [
      { label: 'Diameter', value: '116,460 km' },
      { label: 'Day', value: '10 h 33 min' },
      { label: 'Year', value: '29.4 Earth years' },
      { label: 'Moons', value: '146' },
    ],
    blurb: 'Its rings are mostly ice, hundreds of thousands of km wide but often only 10 m thick. It would float in a big enough bathtub.',
    alien: ['The rings are ice. I licked one.', 'Would float in a bathtub. Bring towel.'],
  },
  {
    name: 'Uranus',
    kind: 'gas',
    d: 595,
    r: 14,
    m: 10,
    color: '#9be4e6',
    color2: '#7fd0d6',
    ring: 'thin',
    facts: [
      { label: 'Diameter', value: '50,724 km' },
      { label: 'Day', value: '17 h 14 min' },
      { label: 'Year', value: '84 Earth years' },
      { label: 'Moons', value: '28' },
    ],
    blurb: 'An ice giant that spins on its side, probably knocked over by a giant impact long ago.',
    alien: ['It rolls around on its side. Relatable.', 'Smells like rotten eggs. Truly.'],
  },
  {
    name: 'Neptune',
    kind: 'gas',
    d: 690,
    r: 13,
    m: 12,
    color: '#5274f0',
    color2: '#3a57cc',
    facts: [
      { label: 'Diameter', value: '49,244 km' },
      { label: 'Day', value: '16 h 6 min' },
      { label: 'Year', value: '165 Earth years' },
      { label: 'Moons', value: '16' },
    ],
    blurb: 'The windiest place in the solar system: storms of over 2,000 km/h. Found with maths before anyone saw it.',
    alien: ['Winds 2,000 km/h. My hat is gone.', 'So far. So blue. So cold.'],
  },
]

/** What the alien says about anything else (thrown worlds, other stars). */
export const ALIEN_GENERIC = [
  'New world! I name it Blorp.',
  'Is this one edible?',
  'I come in peace. Mostly.',
  'Your physics is very strict.',
]

/** When you click the alien. */
export const ALIEN_POKED = ['Hey! Personal space!', 'Beep boop. Hello.', 'I am not a weather balloon.', 'Stop poking. I bite.', 'Wheee!']

/** The asteroid belt between Mars and Jupiter (display distances). */
export const BELT = { inner: 268, outer: 312, count: 320 }
