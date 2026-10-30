import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Eye, EyeOff, LocateFixed, Minus, Orbit, Pause, Play, Plus, RotateCcw, Rocket, Tag } from 'lucide-react'
import { alienScreen, cheerAlien, drawAlien, guideAlien, makeAlien, pokeAlien, releaseAlien, updateAlien } from './alien'
import { drawInspect, inspectHitAlien, inspectGeometry, makeInspect, stepInspect, type InspectState } from './inspect/draw'
import { WORLDS } from './inspect/worlds'
import { PlanetCard } from './kids/PlanetCard'
import { useStickers } from './kids/progress'
import { useSpeech } from './kids/speak'
import { Sticker } from './kids/Sticker'
import { StickerBook } from './kids/StickerBook'
import { CHEERS, LESSONS, TOUR_LINES, TRY_AGAIN } from './learn'
import { PLANETS, SUN } from './planets'
import { drawBackground, drawBelt, drawBody, drawHover, drawLabel, drawOrbits, type Camera, type View } from './render'
import { G, makeBody, solarSystem, type Body } from './sim'

/** Sim seconds per real second at 1x: Mercury laps in ~7 s, Earth in ~19 s. */
const TIME_SCALE = 4
const SPEEDS = [0.5, 1, 2, 4, 8]
/** Seconds the land-on / take-off transition takes. */
const TRANSITION = 1.1
/** Order of the worlds: the inspect switcher and the guided trip. */
const ORDER = [SUN.name, ...PLANETS.map((p) => p.name)]
/** Width the planet card takes on wider screens (px, with its margin). */
const CARD_W = 410

/** Earth's Moon, drawn going round Earth in the system view. */
const moon = Object.assign(makeBody('moon', 0, 0), { r: 3.2, color: '#cfcbe3', color2: '#a29fc2', age: 10 })

const smooth = (a: number, b: number, v: number) => {
  const k = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return k * k * (3 - 2 * k)
}
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const pickOne = (list: string[]) => list[Math.floor(Math.random() * list.length)]

/** Zoom that fits every orbit (out to Neptune) between the header and the toolbar. */
const fitZoom = (w: number, h: number) => clamp(Math.min(w / 2 - 16, (h - 210) / 2) / 712, 0.12, 6)

/** How to frame one world next to its card: zoom, and where on screen (offset from the centre) it sits. */
function framing(b: Body, w: number, h: number) {
  const wide = w >= 640
  const room = wide ? Math.min(w - CARD_W, h - 200) : Math.min(w, h * 0.36)
  const px = b.kind === 'star' ? room * 0.16 : b.r >= 13 ? room * 0.12 : room * 0.08
  return { zoom: clamp(px / b.r, 0.12, 6), ox: wide ? CARD_W / 2 : 0, oy: wide ? -10 : h * 0.25 - h / 2 }
}

/** Planets on their circular orbits at sim time t (exact, so the display never drifts). */
function placePlanets(bodies: Body[], t: number) {
  const sun = bodies[0]
  PLANETS.forEach((p, i) => {
    const b = bodies[i + 1]
    if (!b) return
    const w = Math.sqrt((G * sun.m) / p.d) / p.d
    const a = i * 2.39996 + w * t
    b.x = sun.x + Math.cos(a) * p.d
    b.y = sun.y + Math.sin(a) * p.d
    b.vx = -Math.sin(a) * p.d * w
    b.vy = Math.cos(a) * p.d * w
  })
}

interface Press {
  id: number
  x: number
  y: number
  button: number
  moved: boolean
  /** Inspect view: last x and time, for flick speed. */
  lastX: number
  lastT: number
}

interface Transition {
  name: string
  /** 0 = solar system, 1 = landed. */
  p: number
  dir: 1 | -1
  /** Camera zoom to come back to. */
  fromZoom: number
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bodies = useRef(solarSystem())
  const alien = useRef(makeAlien())
  const simTime = useRef(0)
  const follow = useRef<number | null>(null)
  /** The camera easing in on a world beside its card (id), or back out to the whole system (null). */
  const goal = useRef<{ id: number | null } | null>(null)
  const hover = useRef<number | null>(null)
  const cam = useRef<Camera>({ x: 0, y: 0, zoom: 1 })
  const presses = useRef(new Map<number, Press>())
  const longPress = useRef<number | null>(null)
  const inspect = useRef<InspectState | null>(null)
  const trans = useRef<Transition | null>(null)
  const size = useRef({ w: 1, h: 1 })
  const clockRef = useRef(0)
  const escape = useRef(() => {})

  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [orbits, setOrbits] = useState(true)
  const [faces, setFaces] = useState(true)
  const [names, setNames] = useState(true)
  /** The world whose card is open outside the trip. */
  const [selected, setSelected] = useState<string | null>(null)
  /** Stop on the guided trip (index into ORDER), or null. */
  const [tour, setTour] = useState<number | null>(null)
  const [finished, setFinished] = useState(false)
  const [book, setBook] = useState(false)
  /** Which world's close-up is on screen (null: the solar system). */
  const [landed, setLanded] = useState<string | null>(null)

  const { stickers, earn, clear } = useStickers()
  const speech = useSpeech()

  const card = tour !== null ? ORDER[tour] : selected
  /** With a card open the planets slow right down, so the one being read about stays easy to watch. */
  const calm = card !== null
  const settings = useRef({ paused, speed, orbits, faces, names, calm })
  settings.current = { paused, speed, orbits, faces, names, calm }

  const bodyNamed = (name: string) => bodies.current.find((x) => x.name === name)

  // ---- the guided trip and planet cards

  /** Ease the camera in on a world, with the alien flying over to say hello. */
  const focusOn = (name: string, line: string) => {
    const b = bodyNamed(name)
    if (!b) return
    follow.current = b.id
    goal.current = { id: b.id }
    guideAlien(alien.current, bodies.current, b.id, line)
  }

  /** Back out to the whole system. */
  const overview = () => {
    follow.current = null
    goal.current = { id: null }
    releaseAlien(alien.current)
  }

  const goTo = (step: number) => {
    setTour(step)
    setSelected(null)
    setFinished(false)
    focusOn(ORDER[step], TOUR_LINES[ORDER[step]])
  }

  const startTour = () => {
    speech.stop()
    goTo(0)
  }

  const endTour = (done = false) => {
    speech.stop()
    setTour(null)
    setFinished(done)
    overview()
    if (done) cheerAlien(alien.current, 'What a trip! You did it!')
  }

  const select = (name: string) => {
    speech.stop()
    setSelected(name)
    setFinished(false)
    const p = PLANETS.find((x) => x.name === name)
    focusOn(name, pickOne(name === SUN.name ? SUN.alien : (p?.alien ?? [TOUR_LINES[name]])))
  }

  const closeCard = () => {
    setSelected(null)
    overview()
  }

  const onRight = (name: string) => {
    earn(name)
    cheerAlien(alien.current, pickOne(CHEERS))
  }
  const onWrong = () => cheerAlien(alien.current, pickOne(TRY_AGAIN), false)

  // ---- landing on a world and taking off again

  const land = (name: string) => {
    if (trans.current || !WORLDS[name]) return
    const b = bodyNamed(name)
    if (!b) return
    speech.stop()
    follow.current = b.id
    inspect.current = makeInspect(name)
    inspect.current.appear = 0.6
    trans.current = { name, p: 0, dir: 1, fromZoom: cam.current.zoom }
    setLanded(name)
  }

  const takeOff = () => {
    const st = inspect.current
    if (!st || (trans.current && trans.current.dir === -1)) return
    const b = bodyNamed(st.name)
    if (b) follow.current = b.id
    trans.current = { name: st.name, p: trans.current?.p ?? 1, dir: -1, fromZoom: trans.current?.fromZoom ?? fitZoom(size.current.w, size.current.h) }
  }

  /** Jump straight to another world's close-up (switcher, arrows). */
  const switchTo = (name: string) => {
    if (!inspect.current || trans.current?.dir === -1) return
    trans.current = null
    inspect.current = makeInspect(name)
    setLanded(name)
  }

  escape.current = () => {
    if (book) setBook(false)
    else if (inspect.current) takeOff()
    else if (tour !== null) endTour()
    else if (selected) closeCard()
    else if (finished) setFinished(false)
  }

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let w = 0
    let h = 0
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      size.current = { w, h }
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    cam.current.zoom = fitZoom(w, h)
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    let last = performance.now()
    let raf = 0
    const sun = bodies.current[0]

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const time = now / 1000
      clockRef.current = time
      const s = settings.current
      const rate = s.paused ? 0 : TIME_SCALE * s.speed * (s.calm ? 0.2 : 1)
      simTime.current += dt * rate
      placePlanets(bodies.current, simTime.current)
      updateAlien(alien.current, bodies.current, dt, rate, cam.current.zoom)

      // Transition progress.
      const tr = trans.current
      if (tr) {
        tr.p = Math.min(1, Math.max(0, tr.p + (tr.dir * dt) / TRANSITION))
        if (tr.dir === 1 && tr.p >= 1) trans.current = null
        if (tr.dir === -1 && tr.p <= 0) {
          trans.current = null
          inspect.current = null
          cam.current.zoom = tr.fromZoom
          setLanded(null)
        }
      }
      const st = inspect.current
      const p = trans.current ? trans.current.p : st ? 1 : 0

      // ---- the solar system (fading out as we land)
      if (p < 0.62) {
        const c = cam.current
        const followed = follow.current !== null ? bodies.current.find((b) => b.id === follow.current) : undefined
        const t2 = trans.current
        if (t2 && followed) {
          // Dive towards the world: zoom so it grows to the close-up's size, centred where it'll be.
          const fill = (Math.min(w, h) * 0.3) / followed.r
          const k = smooth(0, 0.6, t2.p)
          c.zoom = t2.fromZoom * Math.pow(fill / t2.fromZoom, k)
          c.x = followed.x
          c.y = followed.y - (h * 0.07 * k) / c.zoom
        } else {
          const g = goal.current
          const target = g ? (g.id !== null ? bodies.current.find((b) => b.id === g.id) : undefined) : followed
          // Ride along with the world first, so a fast planet never drags the camera behind it.
          if (target) {
            c.x += target.vx * rate * dt
            c.y += target.vy * rate * dt
          }
          const k = 1 - Math.exp(-dt * 5)
          if (g) {
            const f = target ? framing(target, w, h) : { zoom: fitZoom(w, h), ox: 0, oy: 0 }
            c.zoom *= Math.pow(f.zoom / c.zoom, 1 - Math.exp(-dt * 3))
            const tx = (target?.x ?? 0) - f.ox / c.zoom
            const ty = (target?.y ?? 0) - f.oy / c.zoom
            c.x += (tx - c.x) * k
            c.y += (ty - c.y) * k
            if (!target && Math.abs(Math.log(f.zoom / c.zoom)) < 0.003 && Math.hypot(tx - c.x, ty - c.y) < 0.5) goal.current = null
          } else if (target) {
            c.x += (target.x - c.x) * k
            c.y += (target.y - c.y) * k
          }
        }
        const view: View = { ctx, w, h, cam: c, time, trails: false, faces: s.faces, names: s.names }
        drawBackground(view)
        drawBelt(view, sun, simTime.current)
        if (s.orbits) {
          drawOrbits(
            view,
            sun,
            PLANETS.map((pl, i) => ({ d: pl.d, bright: bodies.current[i + 1]?.id === hover.current || bodies.current[i + 1]?.id === follow.current })),
          )
        }
        const order = [...bodies.current].sort((a, b) => b.r - a.r)
        for (const b of order) drawBody(view, b, b === sun ? null : sun)
        const earth = bodies.current.find((b) => b.name === 'Earth')
        if (earth) {
          const a = simTime.current * 0.9
          moon.x = earth.x + Math.cos(a) * earth.r * 2.6
          moon.y = earth.y + Math.sin(a) * earth.r * 2.6
          drawBody(view, moon, sun)
        }
        for (const b of bodies.current) drawLabel(view, b)
        const hovered = hover.current !== null ? bodies.current.find((b) => b.id === hover.current) : undefined
        if (hovered && !trans.current) drawHover(view, hovered, time)
        drawAlien(ctx, alien.current, bodies.current, c, w, h, time)
      }

      // ---- the close-up (fading in as we land)
      if (st && p > 0.33) {
        stepInspect(st, dt)
        if (!trans.current) st.appear = Math.min(1, st.appear + dt * 1.8)
        else st.appear = 0.6 + 0.4 * smooth(0.35, 1, p)
        ctx.save()
        ctx.globalAlpha = smooth(0.33, 0.62, p)
        drawInspect(ctx, w, h, st, time)
        ctx.restore()
      }

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') escape.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- input helpers

  const local = (e: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  /** The planet (or Sun) under a screen point in the system view. Generous, for small fingers. */
  const planetAt = (x: number, y: number) => {
    const { w, h } = size.current
    const c = cam.current
    let best: Body | null = null
    let bestD = Infinity
    for (const b of bodies.current) {
      const sx = (b.x - c.x) * c.zoom + w / 2
      const sy = (b.y - c.y) * c.zoom + h / 2
      const d = Math.hypot(x - sx, y - sy)
      if (d < Math.max(b.r * c.zoom, 12) + 12 && d < bestD) {
        bestD = d
        best = b
      }
    }
    return best
  }

  const zoomAt = (x: number, y: number, factor: number) => {
    const { w, h } = size.current
    const c = cam.current
    goal.current = null
    const bx = (x - w / 2) / c.zoom + c.x
    const by = (y - h / 2) / c.zoom + c.y
    c.zoom = Math.min(6, Math.max(0.12, c.zoom * factor))
    c.x = bx - (x - w / 2) / c.zoom
    c.y = by - (y - h / 2) / c.zoom
  }

  const zoomInspect = (factor: number) => {
    const st = inspect.current
    if (st) st.zoomTo = Math.min(4.5, Math.max(1, st.zoomTo * factor))
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const pt = local(e)
    presses.current.set(e.pointerId, { id: e.pointerId, x: pt.x, y: pt.y, button: e.button, moved: false, lastX: pt.x, lastT: performance.now() })
    // Touch: hold still on a planet to land on it.
    if (e.pointerType === 'touch' && !inspect.current && presses.current.size === 1) {
      if (longPress.current) window.clearTimeout(longPress.current)
      longPress.current = window.setTimeout(() => {
        const pr = presses.current.get(e.pointerId)
        if (!pr || pr.moved) return
        const b = planetAt(pr.x, pr.y)
        if (b?.name) {
          pr.moved = true
          land(b.name)
        }
      }, 550)
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = local(e)
    const pr = presses.current.get(e.pointerId)
    if (!pr) {
      // Hover (mouse): highlight the planet under the pointer.
      if (!inspect.current) {
        const b = planetAt(pt.x, pt.y)
        hover.current = b?.id ?? null
        canvasRef.current!.style.cursor = b ? 'pointer' : 'grab'
      } else canvasRef.current!.style.cursor = 'grab'
      return
    }
    const dx = pt.x - pr.x
    const dy = pt.y - pr.y
    if (!pr.moved && Math.hypot(dx, dy) > 6) pr.moved = true
    if (!pr.moved) return

    if (presses.current.size === 2) {
      // Pinch zoom.
      const others = [...presses.current.values()].find((o) => o.id !== e.pointerId)!
      const before = Math.hypot(pr.x - others.x, pr.y - others.y)
      const after = Math.hypot(pt.x - others.x, pt.y - others.y)
      if (before > 10) {
        if (inspect.current) zoomInspect(after / before)
        else zoomAt((pt.x + others.x) / 2, (pt.y + others.y) / 2, after / before)
      }
      pr.x = pt.x
      pr.y = pt.y
      return
    }

    const st = inspect.current
    if (st && !trans.current) {
      // Spin the world by dragging it, with a flick when you let go.
      const { R } = inspectGeometry(size.current.w, size.current.h, st)
      const now = performance.now()
      const d = (pt.x - pr.lastX) / Math.max(R, 1)
      st.spin += d
      const dts = Math.max(0.008, (now - pr.lastT) / 1000)
      st.spinVel = st.spinVel * 0.5 + (d / dts) * 0.5
      pr.lastX = pt.x
      pr.lastT = now
    } else if (!st) {
      const c = cam.current
      c.x -= (pt.x - pr.x) / c.zoom
      c.y -= (pt.y - pr.y) / c.zoom
      follow.current = null
      goal.current = null
      canvasRef.current!.style.cursor = 'grabbing'
    }
    pr.x = pt.x
    pr.y = pt.y
  }

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pr = presses.current.get(e.pointerId)
    presses.current.delete(e.pointerId)
    if (longPress.current) {
      window.clearTimeout(longPress.current)
      longPress.current = null
    }
    if (!pr || pr.moved) return
    const pt = local(e)
    const st = inspect.current
    if (st) {
      // Close-up: right-click takes off; a click on the alien pokes it.
      if (pr.button === 2) takeOff()
      else inspectHitAlien(st, size.current.w, size.current.h, pt.x, pt.y, clockRef.current)
      return
    }
    if (trans.current) return
    const b = planetAt(pt.x, pt.y)
    if (pr.button === 2) {
      if (b?.name) land(b.name)
      return
    }
    const al = alienScreen(alien.current, cam.current, size.current.w, size.current.h)
    if (Math.hypot(pt.x - al.x, pt.y - al.y) < al.px * 1.3) {
      pokeAlien(alien.current)
      return
    }
    if (!b?.name) return
    // On the trip, tapping another world jumps the trip there.
    if (tour !== null) goTo(ORDER.indexOf(b.name))
    else select(b.name)
  }

  const onDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (inspect.current) return
    const pt = local(e)
    const b = planetAt(pt.x, pt.y)
    if (b?.name) land(b.name)
  }

  const recenter = () => {
    speech.stop()
    if (tour !== null) setTour(null)
    setSelected(null)
    overview()
  }

  const world = landed ? WORLDS[landed] : null
  const idx = landed ? ORDER.indexOf(landed) : -1
  const idle = !card && !finished

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#0d1033] text-white select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => (hover.current = null)}
        onDoubleClick={onDoubleClick}
        onWheel={(e) => {
          if (inspect.current) zoomInspect(Math.exp(-e.deltaY * 0.0015))
          else {
            const pt = local(e)
            zoomAt(pt.x, pt.y, Math.exp(-e.deltaY * 0.0015))
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={landed ? `Close-up of ${landed}: drag to spin it, scroll to zoom` : 'The solar system: tap a planet to meet it'}
      />

      {!landed && (
        <>
          <header className="pointer-events-none absolute top-4 left-4 sm:top-6 sm:left-6">
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Space Explorers</h1>
            <p className="mt-0.5 max-w-[30ch] text-base text-white/75 max-sm:max-w-[20ch] max-sm:text-sm">Fly around the solar system with Zib the alien!</p>
          </header>

          <button
            type="button"
            onClick={() => setBook(true)}
            className="absolute top-4 right-4 flex h-12 items-center gap-2 rounded-full bg-white/10 pr-4 pl-3 font-bold shadow-lg ring-1 ring-white/10 backdrop-blur hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white sm:top-6 sm:right-6"
          >
            <BookOpen size={20} className="text-[#ffc94a]" />
            <span className="max-sm:hidden">Stickers</span>
            <span className="rounded-full bg-[#ffc94a] px-2 py-0.5 text-sm text-[#25124d] tabular-nums">
              {stickers.length}/{LESSONS.length}
            </span>
          </button>

          {card && (
            <PlanetCard
              key={card}
              name={card}
              earned={stickers.includes(card)}
              speech={speech}
              tour={
                tour !== null
                  ? {
                      step: tour,
                      total: ORDER.length,
                      onBack: () => goTo(Math.max(0, tour - 1)),
                      onNext: () => (tour + 1 < ORDER.length ? goTo(tour + 1) : endTour(true)),
                    }
                  : undefined
              }
              onClose={() => (tour !== null ? endTour() : closeCard())}
              onLand={() => land(card)}
              onRight={onRight}
              onWrong={onWrong}
            />
          )}

          {finished && (
            <TripDone
              stickers={stickers}
              onBook={() => {
                setFinished(false)
                setBook(true)
              }}
              onAgain={startTour}
              onClose={() => setFinished(false)}
            />
          )}

          {idle && (
            <div className="absolute bottom-24 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 sm:top-36 sm:bottom-auto sm:left-6 sm:translate-x-0 sm:items-start">
              <button
                type="button"
                onClick={startTour}
                className="kid-float font-display flex h-16 items-center whitespace-nowrap gap-3 rounded-full bg-[#ffc94a] pr-7 pl-6 text-2xl font-bold text-[#25124d] shadow-[0_8px_30px_rgba(255,201,74,0.35)] hover:bg-[#ffd96e] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                <Rocket size={28} />
                {stickers.length ? 'Go on a trip' : 'Start the trip!'}
              </button>
              <p className="pointer-events-none rounded-full bg-[#0d1033]/50 px-3 py-1 whitespace-nowrap text-sm text-white/80 backdrop-blur">or tap any planet to meet it</p>
            </div>
          )}

          <nav
            aria-label="Controls"
            className={`absolute bottom-4 left-1/2 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full bg-[#1c1546]/85 p-2 shadow-lg ring-1 ring-white/10 backdrop-blur sm:bottom-6 ${card || finished ? 'max-sm:hidden' : ''}`}
          >
            <IconButton label={paused ? 'Play' : 'Pause'} onClick={() => setPaused((v) => !v)}>
              {paused ? <Play size={20} /> : <Pause size={20} />}
            </IconButton>
            <button
              type="button"
              onClick={() => setSpeed((v) => SPEEDS[(SPEEDS.indexOf(v) + 1) % SPEEDS.length])}
              title="How fast the planets move"
              aria-label={`Speed: ${speed} times`}
              className="h-12 w-12 shrink-0 rounded-full text-base font-bold tabular-nums hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
            >
              {speed}×
            </button>
            <span className="mx-1 h-7 w-px shrink-0 bg-white/15" />
            <IconButton label={orbits ? 'Hide orbits' : 'Show orbits'} onClick={() => setOrbits((v) => !v)} active={orbits}>
              <Orbit size={20} />
            </IconButton>
            <IconButton label={names ? 'Hide names' : 'Show names'} onClick={() => setNames((v) => !v)} active={names}>
              <Tag size={20} />
            </IconButton>
            <IconButton label={faces ? 'Hide faces' : 'Give the planets faces'} onClick={() => setFaces((v) => !v)} active={faces}>
              {faces ? <Eye size={20} /> : <EyeOff size={20} />}
            </IconButton>
            <span className="mx-1 h-7 w-px shrink-0 bg-white/15" />
            <IconButton label="Zoom out" onClick={() => zoomAt(size.current.w / 2, size.current.h / 2, 1 / 1.3)}>
              <Minus size={20} />
            </IconButton>
            <IconButton label="Zoom in" onClick={() => zoomAt(size.current.w / 2, size.current.h / 2, 1.3)}>
              <Plus size={20} />
            </IconButton>
            <IconButton label="Show the whole solar system" onClick={recenter}>
              <LocateFixed size={20} />
            </IconButton>
          </nav>
        </>
      )}

      {landed && world && (
        <>
          <header className="absolute top-4 left-4 sm:top-6 sm:left-6">
            <button
              type="button"
              onClick={takeOff}
              className="font-display flex h-12 items-center gap-2 rounded-full bg-[#ffc94a] pr-5 pl-4 text-lg font-bold text-[#25124d] shadow-lg hover:bg-[#ffd96e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <ArrowLeft size={20} />
              Back to space
            </button>
            <h1 className="font-display mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{world.name}</h1>
            <p className="mt-1 max-w-[30ch] text-base text-white/75">{world.subtitle}</p>
          </header>

          <WorldPanel name={world.name} />

          <p className="pointer-events-none absolute bottom-28 left-1/2 w-max max-w-[90vw] -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-center text-sm text-white/85 backdrop-blur sm:bottom-24">
            <span className="max-sm:hidden">Drag to spin it · Scroll to zoom in close</span>
            <span className="sm:hidden">Drag to spin · Pinch to zoom in</span>
          </p>

          <nav
            aria-label="Worlds"
            className="absolute bottom-4 left-1/2 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full bg-[#1c1546]/85 p-2 shadow-lg ring-1 ring-white/10 backdrop-blur sm:bottom-6"
          >
            <IconButton label="Previous world" onClick={() => switchTo(ORDER[(idx - 1 + ORDER.length) % ORDER.length])} active>
              <ChevronLeft size={20} />
            </IconButton>
            {ORDER.map((n) => {
              const color = n === SUN.name ? SUN.color : PLANETS.find((p) => p.name === n)!.color
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => switchTo(n)}
                  title={n}
                  aria-label={n}
                  aria-pressed={n === landed}
                  className={`grid size-10 shrink-0 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-white ${n === landed ? 'bg-white/20' : 'hover:bg-white/10'}`}
                >
                  <span className="block rounded-full" style={{ width: n === SUN.name ? 20 : 15, height: n === SUN.name ? 20 : 15, background: color }} />
                </button>
              )
            })}
            <IconButton label="Next world" onClick={() => switchTo(ORDER[(idx + 1) % ORDER.length])} active>
              <ChevronRight size={20} />
            </IconButton>
            <span className="mx-1 h-7 w-px shrink-0 bg-white/15" />
            <IconButton label="Zoom out" onClick={() => zoomInspect(1 / 1.4)} active>
              <Minus size={20} />
            </IconButton>
            <IconButton label="Zoom in to the surface" onClick={() => zoomInspect(1.4)} active>
              <Plus size={20} />
            </IconButton>
          </nav>
        </>
      )}

      {book && (
        <StickerBook
          stickers={stickers}
          onClose={() => setBook(false)}
          onClear={clear}
          onPick={(name) => {
            setBook(false)
            if (landed) return
            if (tour !== null) goTo(ORDER.indexOf(name))
            else select(name)
          }}
        />
      )}
    </div>
  )
}

/** The end of the trip: a well done, and what to do next. */
function TripDone({ stickers, onBook, onAgain, onClose }: { stickers: string[]; onBook: () => void; onAgain: () => void; onClose: () => void }) {
  const all = stickers.length >= LESSONS.length
  return (
    <aside
      aria-label="Trip finished"
      className="kid-pop absolute top-28 left-4 w-[min(23rem,calc(100vw-2rem))] rounded-[2rem] bg-[#1c1546]/92 p-6 shadow-2xl ring-1 ring-white/10 backdrop-blur max-sm:top-auto max-sm:bottom-4 sm:top-32 sm:left-6"
    >
      <p className="font-display text-3xl font-bold">You did it!</p>
      <p className="mt-2 text-lg leading-snug text-white/85">
        You visited the Sun and all eight planets.{' '}
        {all ? 'And you won every sticker. You are a real Space Explorer!' : `You have ${stickers.length} of ${LESSONS.length} stickers. Can you win them all?`}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {LESSONS.map(({ name }) => (
          <Sticker key={name} name={name} size={32} locked={!stickers.includes(name)} />
        ))}
      </div>
      <div className="mt-5 grid gap-2">
        <button
          type="button"
          onClick={onBook}
          className="font-display flex h-14 items-center justify-center gap-2 rounded-full bg-[#ffc94a] text-lg font-bold text-[#25124d] hover:bg-[#ffd96e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <BookOpen size={20} />
          Open my sticker book
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onAgain}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-white/10 font-bold hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
          >
            <RotateCcw size={18} />
            Go again
          </button>
          <button type="button" onClick={onClose} className="h-12 rounded-full font-bold text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white">
            Explore freely
          </button>
        </div>
      </div>
    </aside>
  )
}

/** Side panel in the close-up: what to look out for, and the numbers. */
function WorldPanel({ name }: { name: string }) {
  const world = WORLDS[name]
  const info = name === SUN.name ? SUN : PLANETS.find((p) => p.name === name)
  // Open by default where there is room beside the planet; collapsed on phones.
  const [open, setOpen] = useState(() => window.innerWidth >= 640)
  return (
    <aside
      aria-label={`${name}: what to look for`}
      className="absolute top-4 right-4 w-[min(19rem,calc(100vw-2rem))] rounded-3xl bg-[#1c1546]/85 p-5 shadow-xl ring-1 ring-white/10 backdrop-blur max-sm:top-auto max-sm:bottom-48 max-sm:max-h-[55dvh] max-sm:overflow-y-auto max-sm:p-4 sm:top-6 sm:right-6"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="font-display flex w-full items-center justify-between text-left text-lg font-bold focus-visible:outline-2 focus-visible:outline-white"
      >
        Can you spot…
        <span className="text-sm font-semibold text-white/60">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <>
          <ul className="mt-3 space-y-1.5 text-base text-white/85">
            {world.spot.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="mt-[0.55rem] size-1.5 shrink-0 rounded-full bg-[#ffc94a]" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
          {info && (
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/10 pt-4 text-sm">
              {info.facts.map((f) => (
                <div key={f.label}>
                  <dt className="text-white/55">{f.label}</dt>
                  <dd className="font-semibold">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}
    </aside>
  )
}

function IconButton({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`grid h-12 w-12 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white ${active ? 'text-white' : 'text-white/55'}`}
    >
      {children}
    </button>
  )
}
