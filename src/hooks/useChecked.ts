import { useCallback, useEffect, useState } from 'react'

function load(key: string): Record<string, true> {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Record<string, true>) : {}
  } catch {
    return {}
  }
}

/** Persisted set of checked item ids, namespaced by a plan hash. */
export function useChecked(planKey: string): [Record<string, true>, (id: string) => void] {
  const storageKey = `jlp:done:${planKey}`
  const [done, setDone] = useState<Record<string, true>>(() => load(storageKey))

  useEffect(() => {
    setDone(load(storageKey))
  }, [storageKey])

  const toggle = useCallback(
    (id: string) => {
      setDone((prev) => {
        const next = { ...prev }
        if (next[id]) delete next[id]
        else next[id] = true
        try {
          localStorage.setItem(storageKey, JSON.stringify(next))
        } catch {
          /* ignore */
        }
        return next
      })
    },
    [storageKey],
  )

  return [done, toggle]
}
