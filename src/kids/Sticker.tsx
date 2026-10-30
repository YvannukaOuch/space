import { PLANETS, SUN } from '../planets'

export const colorsOf = (name: string) => {
  if (name === SUN.name) return { color: SUN.color, color2: SUN.color2, ring: undefined }
  const p = PLANETS.find((x) => x.name === name)
  return { color: p?.color ?? '#999', color2: p?.color2 ?? '#666', ring: p?.ring }
}

/** A world as a round sticker: flat disc, soft shading, rings for Saturn and Uranus. */
export function Sticker({ name, size = 48, locked = false }: { name: string; size?: number; locked?: boolean }) {
  const { color, color2, ring } = colorsOf(name)
  const sun = name === SUN.name
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} aria-hidden>
      {ring && (
        <span
          className="absolute rounded-[50%] border-current"
          style={{
            width: size * (ring === 'wide' ? 1.5 : 1.25),
            height: size * (ring === 'wide' ? 0.42 : 0.3),
            borderWidth: Math.max(2, size * (ring === 'wide' ? 0.09 : 0.04)),
            color: locked ? 'rgba(255,255,255,0.18)' : color2,
            transform: `rotate(${ring === 'wide' ? -18 : 75}deg)`,
          }}
        />
      )}
      <span
        className="relative rounded-full"
        style={{
          width: size * (ring === 'wide' ? 0.78 : 0.86),
          height: size * (ring === 'wide' ? 0.78 : 0.86),
          background: locked
            ? 'rgba(255,255,255,0.1)'
            : sun
              ? `radial-gradient(circle at 38% 36%, ${color2} 0 40%, ${color} 70%)`
              : `radial-gradient(circle at 34% 30%, ${color} 0 52%, ${color2} 100%)`,
          boxShadow: locked ? 'inset 0 0 0 2px rgba(255,255,255,0.18)' : sun ? `0 0 ${size * 0.35}px ${color}aa` : 'inset -6px -6px 0 rgba(16,10,48,0.28)',
        }}
      />
      {locked && <span className="font-display absolute text-white/45" style={{ fontSize: size * 0.4, fontWeight: 700 }}>?</span>}
    </span>
  )
}
