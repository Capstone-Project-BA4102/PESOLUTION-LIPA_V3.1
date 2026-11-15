import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

interface InfiniteMarqueeProps {
  items: ReactNode[]
  label: string
  className?: string
  secondsPerItem: number
}

/**
 * Repeats the item set until one half of the track is wider than the viewport,
 * so translate(-50%) always wraps over real cards instead of empty space.
 */
export function InfiniteMarquee({ items, label, className, secondsPerItem }: InfiniteMarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const groupRef = useRef<HTMLDivElement>(null)
  const [copies, setCopies] = useState(1)

  useLayoutEffect(() => {
    const container = containerRef.current
    const group = groupRef.current
    if (!container || !group || !items.length) return
    const measure = () => {
      const groupWidth = group.getBoundingClientRect().width
      if (groupWidth <= 0) return
      const needed = Math.max(1, Math.ceil(container.clientWidth / groupWidth))
      setCopies(current => (current === needed ? current : needed))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    observer.observe(group)
    return () => observer.disconnect()
    // Widths are re-measured when the number of cards changes; the observer covers reflow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length])

  if (!items.length) return null
  return <div ref={containerRef} className={className ? `ui-marquee ${className}` : 'ui-marquee'}
    style={{ '--marquee-duration': `${Math.max(30, items.length * copies * secondsPerItem)}s` } as CSSProperties} aria-label={label}>
    <div className="ui-marquee-track">
      {Array.from({ length: copies * 2 }, (_, index) => <div key={index} ref={index === 0 ? groupRef : undefined}
        className="ui-marquee-group" data-clone={index > 0 || undefined} aria-hidden={index > 0 || undefined} inert={index > 0}>
        {items}
      </div>)}
    </div>
  </div>
}
