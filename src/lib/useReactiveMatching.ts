import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchApplicantMatchDetails, runApplicantMatching, type MatchingRunResult } from './api'
import { supabase } from './supabase'
import { matchingRefreshQueue, watchMatchingInputs } from './matchingRefreshQueue'

type AdminData = Awaited<ReturnType<typeof fetchApplicantMatchDetails>>
type RefreshOptions<T> = {
  load?: (applicantId: string) => Promise<T>
  run?: (applicantId: string, options: { force: boolean; automatic: boolean }) => Promise<MatchingRunResult>
}
type State<T> = { applicantId: string; data: T | null;
  matching?: MatchingRunResult; loading: boolean; error: string | null; realtime: string }

/** Fetch/AJAX matching with Realtime invalidation and catch-up checks; no direct scoring in React. */
export function useReactiveMatching<T = AdminData>(applicantId: string, options: RefreshOptions<T> = {}) {
  const load = options.load || fetchApplicantMatchDetails
  const run = options.run || runApplicantMatching
  const [state, setState] = useState<State<T>>({ applicantId, data: null, loading: true, error: null, realtime: 'connecting' })
  const refreshRef = useRef<(force?: boolean, immediate?: boolean) => void>(() => {})
  const refresh = useCallback((force = true) => refreshRef.current(force, true), [])

  useEffect(() => {
    if (!applicantId) return
    let active = true
    let subscribed = false
    let publishedRun = false
    const queue = matchingRefreshQueue(async force => {
      if (!active) return
      setState(previous => ({ ...(previous.applicantId === applicantId ? previous : { applicantId, data: null, realtime: 'connecting' }), loading: true, error: null }))
      let matching: MatchingRunResult | undefined
      let error: string | null = null
      try { matching = await run(applicantId, { force, automatic: !force }) }
      catch (failure) { error = failure instanceof Error ? failure.message : 'Matching could not be refreshed.' }
      // Always refresh display metadata too, including deactivated jobs, even if coaching failed.
      const data = await load(applicantId)
      if (!active) return
      publishedRun = true
      setState(previous => ({ ...previous, applicantId, data, loading: false, error,
        matching: matching ? { ...matching, nlpAudit: matching.nlpAudit ||
          (matching.matchingKey === previous.matching?.matchingKey ? previous.matching?.nlpAudit : undefined) } : undefined }))
    }, failure => {
      if (active) setState(previous => ({ ...previous, loading: false, error: failure instanceof Error ? failure.message : 'Matching could not be refreshed.' }))
    })
    const check = (immediate = false) => {
      if (navigator.onLine && document.visibilityState !== 'hidden') queue.request(false, immediate)
    }
    refreshRef.current = queue.request
    const stopWatching = watchMatchingInputs(supabase, applicantId, () => check(), status => {
      if (!active) return
      setState(previous => ({ ...(previous.applicantId === applicantId ? previous : { applicantId, data: null, loading: true, error: null }), realtime: !navigator.onLine ? 'offline' : status === 'SUBSCRIBED' ? 'live' : 'polling' }))
      if (status === 'SUBSCRIBED') { if (subscribed) check(true); subscribed = true }
    })
    const focus = () => {
      if (navigator.onLine) setState(previous => previous.realtime === 'offline' ? { ...previous, realtime: 'polling' } : previous)
      check(true)
    }
    const offline = () => { if (active) setState(previous => ({ ...previous, realtime: 'offline' })) }
    window.addEventListener('focus', focus)
    window.addEventListener('online', focus)
    window.addEventListener('offline', offline)
    document.addEventListener('visibilitychange', focus)
    // Also catches missed events, missing publications, resume deletes and configuration changes.
    const poll = window.setInterval(() => check(), 30000)
    // Show saved results immediately while the controlled freshness check runs.
    void load(applicantId).then(data => {
      if (active && !publishedRun) setState(previous => ({ ...previous, applicantId, data }))
    }).catch(() => { /* The queued refresh owns error reporting and retry. */ })
    queue.request(false, true)
    return () => {
      active = false
      queue.dispose()
      refreshRef.current = () => {}
      window.clearInterval(poll)
      window.removeEventListener('focus', focus)
      window.removeEventListener('online', focus)
      window.removeEventListener('offline', offline)
      document.removeEventListener('visibilitychange', focus)
      stopWatching()
    }
  }, [applicantId, load, run])

  return state.applicantId === applicantId ? { ...state, refresh } : { ...state, data: null, matching: undefined, loading: true, error: null, refresh }
}
