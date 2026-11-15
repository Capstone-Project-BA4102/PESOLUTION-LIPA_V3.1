import { useEffect, useRef, useState } from 'react'
import { appReveal } from './appReveal'

const reduceMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Eases a displayed number from its previous value to the target. First paint
 * counts up from 0; later changes (filters, live refresh) glide from whatever
 * is currently on screen instead of restarting from zero.
 */
export function useCountUp(target: number, duration = 800) {
  const [reduced] = useState(reduceMotion)
  const [display, setDisplay] = useState(() => (reduced ? target : 0))
  const displayRef = useRef(display)
  useEffect(() => {
    if (reduced) {
      displayRef.current = target
      return
    }
    let frame = 0
    let cancelled = false
    const run = () => {
      if (cancelled) return
      const from = displayRef.current
      if (from === target) return
      const start = performance.now()
      const tick = (now: number) => {
        if (cancelled) return
        const progress = Math.min(1, (now - start) / duration)
        const value = from + (target - from) * (1 - Math.pow(1 - progress, 3))
        displayRef.current = value
        setDisplay(value)
        if (progress < 1) frame = requestAnimationFrame(tick)
        else displayRef.current = target
      }
      frame = requestAnimationFrame(tick)
    }
    const unsubscribe = appReveal.hidden ? appReveal.subscribe(run) : null
    if (!appReveal.hidden) run()
    return () => {
      cancelled = true
      unsubscribe?.()
      cancelAnimationFrame(frame)
    }
  }, [reduced, target, duration])
  return reduced ? target : display
}
