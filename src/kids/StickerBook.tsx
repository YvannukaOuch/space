import { useEffect, useRef, useState } from 'react'
import { Rocket, Trophy, X } from 'lucide-react'
import { LESSONS } from '../learn'
import { Sticker } from './Sticker'

interface Props {
  stickers: string[]
  onClose: () => void
  onClear: () => void
  /** Open this world's card, to go and win its sticker. */
  onPick: (name: string) => void
}

/** Every world's sticker: won ones in colour, the rest waiting as "?". */
export function StickerBook({ stickers, onClose, onClear, onPick }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [confirm, setConfirm] = useState(false)
  const all = stickers.length >= LESSONS.length

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-[#0d1033]/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[calc(100dvh-2rem)] w-[min(34rem,100%)] overflow-y-auto rounded-[2rem] bg-[#1c1546] p-6 shadow-2xl ring-1 ring-white/10"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="book-title" className="font-display text-3xl font-bold">
              My sticker book
            </h2>
            <p className="mt-1 text-base text-white/70">
              {stickers.length} of {LESSONS.length} stickers. {all ? '' : 'Win one by answering a planet’s quiz.'}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close the sticker book"
            className="grid size-11 shrink-0 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
          >
            <X size={22} />
          </button>
        </div>

        {all && (
          <p className="kid-pop mt-4 flex items-center gap-3 rounded-2xl bg-[#ffc94a] p-4 text-[#25124d]">
            <Trophy size={32} className="shrink-0" />
            <span>
              <b className="font-display text-xl">You are a Space Explorer!</b>
              <br />
              You won every sticker in the solar system.
            </span>
          </p>
        )}

        <ul className="mt-5 grid grid-cols-3 gap-3">
          {LESSONS.map(({ name }) => {
            const won = stickers.includes(name)
            return (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => onPick(name)}
                  className={`flex w-full flex-col items-center gap-2 rounded-2xl p-3 focus-visible:outline-2 focus-visible:outline-white border-2 ${won ? 'border-transparent bg-white/10 hover:bg-white/15' : 'border-dashed border-white/15 bg-white/4 hover:bg-white/8'}`}
                  aria-label={won ? `${name}: sticker won` : `${name}: not won yet, go and play its quiz`}
                >
                  <Sticker name={name} size={60} locked={!won} />
                  <span className={`font-display text-base font-bold ${won ? '' : 'text-white/45'}`}>{name}</span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="font-display flex h-12 items-center gap-2 rounded-full bg-[#ffc94a] px-5 text-lg font-bold text-[#25124d] hover:bg-[#ffd96e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Rocket size={20} />
            Keep exploring
          </button>
          {stickers.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (!confirm) return setConfirm(true)
                onClear()
                setConfirm(false)
              }}
              onBlur={() => setConfirm(false)}
              className="h-11 rounded-full px-4 text-sm font-semibold text-white/55 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
            >
              {confirm ? 'Tap again to remove all stickers' : 'Start over'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
