import { useCallback, useEffect, useState } from 'react'

/**
 * The sticker book: which worlds' quizzes have been answered. Kept in this browser only (no
 * accounts, nothing sent anywhere); storage can be missing or blocked, so every access is
 * guarded and the app works the same without it.
 */

const KEY = 'space-kids:stickers'

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

function write(list: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // Private window or storage blocked: stickers last until the page is closed.
  }
}

export function useStickers() {
  const [stickers, setStickers] = useState<string[]>(read)

  useEffect(() => write(stickers), [stickers])

  const earn = useCallback((name: string) => setStickers((s) => (s.includes(name) ? s : [...s, name])), [])
  const clear = useCallback(() => setStickers([]), [])

  return { stickers, earn, clear }
}
