import { useCallback, useState } from 'react'

// Small localStorage-backed state hook. Falls back to in-memory state if
// localStorage is unavailable (e.g. privacy mode / non-browser tests).
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw != null) return JSON.parse(raw)
    } catch (e) {
      /* fall through to initial */
    }
    // `initial` may be a function (lazy) or a value.
    return typeof initial === 'function' ? initial() : initial
  })

  const set = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved))
        } catch (e) {
          /* storage full or blocked — keep in-memory value */
        }
        return resolved
      })
    },
    [key]
  )

  return [value, set]
}
