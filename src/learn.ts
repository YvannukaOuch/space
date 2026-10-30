/**
 * What the kids' trip says about each world: one simple idea, one "wow" fact, and a quiz
 * question with three answers. Written for ages 6 to 10: short sentences, comparisons with
 * everyday things instead of big numbers.
 */

export interface Lesson {
  name: string
  /** One or two short sentences: what this world is. */
  about: string
  /** The fact to remember. */
  wow: string
  quiz: {
    question: string
    /** Three answers; `planet` shows that world's picture on the button. */
    options: { label: string; planet?: string }[]
    /** Index of the right answer. */
    answer: number
    /** A gentle nudge after a wrong answer. */
    hint: string
  }
}

export const LESSONS: Lesson[] = [
  {
    name: 'Sun',
    about: 'The Sun is a star: a giant ball of glowing hot gas. It gives us light and keeps us warm.',
    wow: 'The Sun is so big that about 1.3 million Earths could fit inside it!',
    quiz: {
      question: 'What is the Sun?',
      options: [{ label: 'A star' }, { label: 'A planet' }, { label: 'A giant lamp' }],
      answer: 0,
      hint: 'It is the same kind of thing as the twinkly dots you see at night.',
    },
  },
  {
    name: 'Mercury',
    about: 'Mercury is the smallest planet, and the closest one to the Sun. It zooms around the Sun faster than any other planet.',
    wow: 'A year on Mercury lasts only 88 days. You would have a birthday about every 3 months!',
    quiz: {
      question: 'Which planet is the closest to the Sun?',
      options: [
        { label: 'Neptune', planet: 'Neptune' },
        { label: 'Mercury', planet: 'Mercury' },
        { label: 'Earth', planet: 'Earth' },
      ],
      answer: 1,
      hint: 'It is the smallest planet, too.',
    },
  },
  {
    name: 'Venus',
    about: 'Venus is the hottest planet. Its thick clouds trap the heat like a big blanket, so it is hotter than an oven.',
    wow: 'Venus spins so slowly that one day there lasts longer than its whole year!',
    quiz: {
      question: 'Which planet is the hottest?',
      options: [
        { label: 'Mars', planet: 'Mars' },
        { label: 'Mercury', planet: 'Mercury' },
        { label: 'Venus', planet: 'Venus' },
      ],
      answer: 2,
      hint: 'It is not the closest one to the Sun! Its thick clouds trap the heat.',
    },
  },
  {
    name: 'Earth',
    about: 'Earth is our home! It is the only planet we know of with oceans, plants, animals and people.',
    wow: 'Earth is racing around the Sun at about 30 km every second, and you cannot even feel it!',
    quiz: {
      question: 'How many moons does Earth have?',
      options: [{ label: 'None' }, { label: 'One' }, { label: 'Two' }],
      answer: 1,
      hint: 'Look up at the sky at night. How many moons can you see?',
    },
  },
  {
    name: 'Mars',
    about: 'Mars is the red planet. Its dusty ground is full of rust: the same stuff that turns an old bike red.',
    wow: 'Mars has the tallest volcano of all the planets. It is about 2½ times taller than Mount Everest!',
    quiz: {
      question: 'Why is Mars red?',
      options: [{ label: 'It is on fire' }, { label: 'It is rusty' }, { label: 'Someone painted it' }],
      answer: 1,
      hint: 'Think of an old bike left out in the rain.',
    },
  },
  {
    name: 'Jupiter',
    about: 'Jupiter is the biggest planet. It is a giant ball of gas, so there is no ground to stand on.',
    wow: 'Jupiter has a storm called the Great Red Spot. It is bigger than the whole Earth!',
    quiz: {
      question: 'Which planet is the biggest?',
      options: [
        { label: 'Jupiter', planet: 'Jupiter' },
        { label: 'Earth', planet: 'Earth' },
        { label: 'Mars', planet: 'Mars' },
      ],
      answer: 0,
      hint: 'It has a giant red storm on it.',
    },
  },
  {
    name: 'Saturn',
    about: 'Saturn has beautiful rings made of billions of bits of ice and rock. Some are as small as sand, some as big as a house.',
    wow: 'Saturn is so light that it would float in water, if you could find a bathtub big enough!',
    quiz: {
      question: 'What are Saturn’s rings made of?',
      options: [{ label: 'Gold' }, { label: 'Candy' }, { label: 'Ice and rock' }],
      answer: 2,
      hint: 'Brrr! It is very, very cold out there.',
    },
  },
  {
    name: 'Uranus',
    about: 'Uranus is an icy blue-green giant. It is tipped right over, so it rolls around the Sun on its side.',
    wow: 'One trip around the Sun takes Uranus 84 years. That is about as long as a whole human life!',
    quiz: {
      question: 'What is special about Uranus?',
      options: [{ label: 'It is on its side' }, { label: 'It is square' }, { label: 'It has no colour' }],
      answer: 0,
      hint: 'Think of a ball rolling along the floor.',
    },
  },
  {
    name: 'Neptune',
    about: 'Neptune is the farthest planet from the Sun. It is cold, dark, deep blue and very, very windy.',
    wow: 'The winds on Neptune are the fastest in the solar system: faster than a jet plane!',
    quiz: {
      question: 'Which planet is the farthest from the Sun?',
      options: [
        { label: 'Mars', planet: 'Mars' },
        { label: 'Uranus', planet: 'Uranus' },
        { label: 'Neptune', planet: 'Neptune' },
      ],
      answer: 2,
      hint: 'It is the deep blue one, right at the edge.',
    },
  },
]

export const lessonFor = (name: string) => LESSONS.find((l) => l.name === name)

/** What the alien says at each stop of the trip. */
export const TOUR_LINES: Record<string, string> = {
  Sun: 'Our first stop: the Sun! Do not touch.',
  Mercury: 'Mercury! Tiny and super fast.',
  Venus: 'Venus! Phew, so hot in here.',
  Earth: 'Earth! Hello, humans!',
  Mars: 'Mars! Red dust everywhere.',
  Jupiter: 'Jupiter! The biggest of them all.',
  Saturn: 'Saturn! Look at those rings!',
  Uranus: 'Uranus! It rolls on its side.',
  Neptune: 'Neptune! So far. So blue. So cold.',
}

/** Cheers for a right answer, and comfort for a wrong one. */
export const CHEERS = ['Yay! You got it!', 'Super smart!', 'Correct! Beep boop!', 'Wow, a real space expert!', 'Brilliant!']
export const TRY_AGAIN = ['Oops! Try again!', 'Not quite. You can do it!', 'Hmm, have another go!']
