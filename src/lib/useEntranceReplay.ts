import { useLayoutEffect, useRef } from 'react'

/**
 * Replays the `ui-page-enter` animation when a preference changes, without
 * remounting the page (which would drop filters, scroll and form state).
 */
export function useEntranceReplay<T extends HTMLElement>(locale: string, theme: string) {
  const ref = useRef<T>(null)
  const seen = useRef({ locale, theme })
  useLayoutEffect(() => {
    if (seen.current.locale === locale && seen.current.theme === theme) return
    seen.current = { locale, theme }
    const element = ref.current
    if (!element) return
    for (const animation of element.getAnimations()) {
      animation.cancel()
      animation.play()
    }
  }, [locale, theme])
  return ref
}
