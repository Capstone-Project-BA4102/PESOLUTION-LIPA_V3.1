import { useCallback, useEffect, useRef, useState } from 'react'

/** Minimal data-fetching hook: { data, loading, error, reload }. */
export function useQuery<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const hasData = useRef(false)
  const inFlight = useRef<Promise<void> | null>(null)
  const [tick, setTick] = useState(0)
  const fetcherRef = useRef(fetcher)
  useEffect(() => { fetcherRef.current = fetcher })

  useEffect(() => {
    let cancelled = false
    setLoading(!hasData.current)
    setRefreshing(true)
    setError(null)
    // A zero-delay start collapses Strict Mode setup/cleanup. Serializing behind the
    // previous promise prevents overlap; cancelled generations cannot publish data.
    const predecessor = inFlight.current
    const timer = setTimeout(() => {
      const task = (async () => {
        await predecessor?.catch(() => {})
        if (cancelled) return
        try {
          const result = await fetcherRef.current()
          if (!cancelled) { hasData.current = true; setData(result) }
        } catch (failure) {
          if (!cancelled) setError(failure instanceof Error ? failure.message : (failure as { message?: string })?.message || 'Something went wrong.')
        } finally {
          if (!cancelled) { setLoading(false); setRefreshing(false) }
        }
      })()
      inFlight.current = task
    }, 0)
    return () => { cancelled = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps])

  const reload = useCallback(() => setTick(t => t + 1), [])
  return { data, loading, refreshing, error, reload }
}
