import { useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Lightbulb, Rocket, Sparkles, Square, Volume2, X } from 'lucide-react'
import { lessonFor } from '../learn'
import { Sticker } from './Sticker'
import type { useSpeech } from './speak'

export interface TourNav {
  step: number
  total: number
  onBack: () => void
  onNext: () => void
}

interface Props {
  name: string
  earned: boolean
  speech: ReturnType<typeof useSpeech>
  tour?: TourNav
  onClose: () => void
  onLand: () => void
  onRight: (name: string) => void
  onWrong: () => void
}

/**
 * Meet a world: what it is, one wow fact, a big "Land here!" button and a three-answer quiz
 * that wins its sticker. Used both on the guided trip and when a planet is tapped.
 */
export function PlanetCard({ name, earned, speech, tour, onClose, onLand, onRight, onWrong }: Props) {
  const lesson = lessonFor(name)
  const [mode, setMode] = useState<'learn' | 'quiz'>('learn')
  const [wrong, setWrong] = useState<number[]>([])
  const [solved, setSolved] = useState(false)
  if (!lesson) return null
  const { quiz } = lesson

  const learnText = `${name}. ${lesson.about} Wow! ${lesson.wow}`
  const quizText = `${quiz.question} Is it: ${quiz.options.map((o) => o.label).join(', or ')}?`

  const answer = (i: number) => {
    if (solved || wrong.includes(i)) return
    speech.stop()
    if (i === quiz.answer) {
      setSolved(true)
      onRight(name)
    } else {
      setWrong((w) => [...w, i])
      onWrong()
    }
  }

  const startQuiz = () => {
    speech.stop()
    setMode('quiz')
  }

  return (
    <aside
      aria-label={`Meet ${name}`}
      className="absolute top-28 left-4 flex max-h-[calc(100dvh-14rem)] w-[min(23rem,calc(100vw-2rem))] flex-col overflow-y-auto rounded-[2rem] bg-[#1c1546]/92 p-5 shadow-2xl ring-1 ring-white/10 backdrop-blur max-sm:top-auto max-sm:bottom-4 max-sm:max-h-[62dvh] sm:top-32 sm:left-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Sticker name={name} size={52} />
          <div>
            {tour && (
              <p className="text-xs font-bold tracking-wide text-[#ffc94a] uppercase">
                Stop {tour.step + 1} of {tour.total}
              </p>
            )}
            <h2 className="font-display text-3xl leading-tight font-bold">{name}</h2>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            speech.stop()
            onClose()
          }}
          aria-label={tour ? 'End the trip' : 'Close'}
          title={tour ? 'End the trip' : 'Close'}
          className="grid size-11 shrink-0 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
        >
          <X size={22} />
        </button>
      </div>

      {mode === 'learn' ? (
        <>
          <p className="mt-4 text-lg leading-snug text-white/90">{lesson.about}</p>
          <div className="mt-4 rounded-2xl bg-[#ffc94a]/12 p-4 ring-1 ring-[#ffc94a]/30">
            <p className="font-display flex items-center gap-1.5 text-sm font-bold tracking-wide text-[#ffc94a] uppercase">
              <Sparkles size={16} />
              Wow!
            </p>
            <p className="mt-1 text-base leading-snug text-white/90">{lesson.wow}</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {speech.supported && <ReadAloud speech={speech} text={learnText} />}
            <button
              type="button"
              onClick={() => {
                speech.stop()
                onLand()
              }}
              className={`flex h-12 items-center justify-center gap-2 rounded-full bg-white/10 font-bold hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white ${speech.supported ? '' : 'col-span-2'}`}
            >
              <Rocket size={20} />
              Land here!
            </button>
          </div>
          <button
            type="button"
            onClick={startQuiz}
            className="font-display mt-2 flex h-14 items-center justify-center gap-2 rounded-full bg-[#ffc94a] text-lg font-bold text-[#25124d] hover:bg-[#ffd96e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {earned ? 'Play the quiz again' : 'Quiz time! Win a sticker'}
          </button>
        </>
      ) : (
        <>
          <div className="mt-4 flex items-start justify-between gap-2">
            <p className="font-display text-xl leading-snug font-bold">{quiz.question}</p>
            {speech.supported && <ReadAloud speech={speech} text={quizText} compact />}
          </div>
          <div className="mt-4 grid gap-2">
            {quiz.options.map((o, i) => {
              const isWrong = wrong.includes(i)
              const isRight = solved && i === quiz.answer
              return (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => answer(i)}
                  disabled={isWrong || (solved && !isRight)}
                  className={`flex min-h-14 items-center gap-3 rounded-2xl px-4 text-left text-lg font-bold ring-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                    isRight
                      ? 'kid-pop bg-[#48e5c2] text-[#0d2e2a] ring-[#48e5c2]'
                      : isWrong
                        ? 'kid-shake bg-white/5 text-white/35 ring-white/5'
                        : solved
                          ? 'bg-white/5 text-white/35 ring-transparent'
                          : 'bg-white/8 ring-white/15 hover:bg-white/15 hover:ring-white/40'
                  }`}
                >
                  {o.planet && <Sticker name={o.planet} size={36} />}
                  <span className="flex-1">{o.label}</span>
                  {isRight && <Check size={24} strokeWidth={3} />}
                  {isWrong && <X size={22} />}
                </button>
              )
            })}
          </div>
          {wrong.length > 0 && !solved && (
            <p role="status" className="mt-3 flex gap-2 rounded-2xl bg-white/8 p-3 text-base text-white/85">
              <Lightbulb size={20} className="mt-0.5 shrink-0 text-[#ffc94a]" />
              <span>
                <b>Hint:</b> {quiz.hint}
              </span>
            </p>
          )}
          {solved && (
            <div role="status" className="relative mt-4 flex items-center gap-3 rounded-2xl bg-[#48e5c2]/12 p-3 ring-1 ring-[#48e5c2]/40">
              <Burst />
              <Sticker name={name} size={44} />
              <p className="text-base leading-snug">
                <b className="font-display text-lg">You got it!</b>
                <br />
                The {name} sticker is in your sticker book.
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              speech.stop()
              setMode('learn')
              setWrong([])
              setSolved(false)
            }}
            className="mt-3 h-11 rounded-full text-sm font-semibold text-white/65 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
          >
            Back to {name}
          </button>
        </>
      )}

      {tour && (
        <nav aria-label="Trip" className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={() => {
              speech.stop()
              tour.onBack()
            }}
            disabled={tour.step === 0}
            className="flex h-12 items-center gap-1 rounded-full pr-4 pl-2 font-bold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronLeft size={22} />
            Back
          </button>
          <span className="flex gap-1" aria-hidden>
            {Array.from({ length: tour.total }, (_, i) => (
              <span key={i} className={`size-2 rounded-full ${i === tour.step ? 'bg-[#ffc94a]' : i < tour.step ? 'bg-white/50' : 'bg-white/15'}`} />
            ))}
          </span>
          <button
            type="button"
            onClick={() => {
              speech.stop()
              tour.onNext()
            }}
            className={`flex h-12 items-center gap-1 rounded-full pr-2 pl-4 font-bold focus-visible:outline-2 focus-visible:outline-white ${solved ? 'bg-[#ffc94a] text-[#25124d] hover:bg-[#ffd96e]' : 'hover:bg-white/10'}`}
          >
            {tour.step + 1 === tour.total ? 'Finish' : 'Next'}
            <ChevronRight size={22} />
          </button>
        </nav>
      )}
    </aside>
  )
}

function ReadAloud({ speech, text, compact }: { speech: ReturnType<typeof useSpeech>; text: string; compact?: boolean }) {
  const on = speech.speaking === text
  const label = on ? 'Stop reading' : 'Read to me'
  if (compact) {
    return (
      <button
        type="button"
        onClick={() => speech.toggle(text)}
        aria-label={label}
        title={label}
        className={`grid size-11 shrink-0 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-white ${on ? 'bg-[#7fd8ff] text-[#0d1033]' : 'bg-white/10 hover:bg-white/20'}`}
      >
        {on ? <Square size={16} fill="currentColor" /> : <Volume2 size={20} />}
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={() => speech.toggle(text)}
      className={`flex h-12 items-center justify-center gap-2 rounded-full font-bold focus-visible:outline-2 focus-visible:outline-white ${on ? 'bg-[#7fd8ff] text-[#0d1033]' : 'bg-white/10 hover:bg-white/20'}`}
    >
      {on ? <Square size={16} fill="currentColor" /> : <Volume2 size={20} />}
      {label}
    </button>
  )
}

/** A little burst of stars for a right answer. */
function Burst() {
  return (
    <span className="pointer-events-none absolute top-1/2 left-8" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className="kid-star absolute text-[#ffc94a]"
          style={{ '--a': `${i * 36}deg`, animationDelay: `${(i % 3) * 40}ms`, fontSize: 14 + (i % 3) * 5 } as React.CSSProperties}
        >
          ★
        </span>
      ))}
    </span>
  )
}
