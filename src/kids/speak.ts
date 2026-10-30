import { useCallback, useEffect, useState } from 'react'

/**
 * Read aloud with the browser's own voice, for kids who are still learning to read. Nothing
 * is downloaded; where the browser has no speech support the button simply isn't shown.
 */

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null

/** A clear English voice if there is one, preferring the friendlier-sounding ones. */
function pickVoice() {
  const voices = synth?.getVoices() ?? []
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'))
  return english.find((v) => /samantha|google us|zira|aria|jenny/i.test(v.name)) ?? english[0] ?? null
}

export function useSpeech() {
  const [speaking, setSpeaking] = useState<string | null>(null)

  const stop = useCallback(() => {
    synth?.cancel()
    setSpeaking(null)
  }, [])

  /** Read `text`, or stop if that same text is being read already. */
  const toggle = useCallback(
    (text: string) => {
      if (!synth) return
      synth.cancel()
      if (speaking === text) {
        setSpeaking(null)
        return
      }
      const u = new SpeechSynthesisUtterance(text)
      const voice = pickVoice()
      if (voice) u.voice = voice
      u.lang = voice?.lang ?? 'en-US'
      u.rate = 0.92
      u.pitch = 1.08
      u.onend = u.onerror = () => setSpeaking((s) => (s === text ? null : s))
      setSpeaking(text)
      synth.speak(u)
    },
    [speaking],
  )

  useEffect(() => () => synth?.cancel(), [])

  return { supported: !!synth, speaking, toggle, stop }
}
