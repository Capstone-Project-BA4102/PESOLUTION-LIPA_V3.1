import { backgroundRefreshScheduler, REFRESH_POLL_MS } from './refreshPolicy'
import { shareQueryData } from './queryData'
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
    let foregroundRequested = false
    const queue = matchingRefreshQueue(async force => {
      if (!active) return
      const foreground=foregroundRequested;foregroundRequested=false
      setState(previous => {
        const base=previous.applicantId===applicantId?previous:{applicantId,data:null,realtime:'connecting',loading:true,error:null}
        const loading=foreground || !base.data
        return base.loading===loading && (!foreground || !base.error) ? base : {...base,loading,error:foreground?null:base.error}
      })
      let matching: MatchingRunResult | undefined
      let error: string | null = null
      try { matching = await run(applicantId, { force, automatic: !force }) }
      catch (failure) { error = failure instanceof Error ? failure.message : 'Matching could not be refreshed.' }
      // Always refresh display metadata too, including deactivated jobs, even if coaching failed.
      const data = await load(applicantId)
      if (!active) return
      publishedRun = true
      setState(previous => shareQueryData(previous, { ...previous, applicantId, data, loading: false, error,
        matching: matching ? { ...matching, nlpAudit: matching.nlpAudit ||
          (matching.matchingKey === previous.matching?.matchingKey ? previous.matching?.nlpAudit : undefined) } : undefined }))
    }, failure => {
      if (active) setState(previous => ({ ...previous, loading: false, error: failure instanceof Error ? failure.message : 'Matching could not be refreshed.' }))
    })
    const check = (immediate = false) => {
      if (navigator.onLine && document.visibilityState !== 'hidden') queue.request(false, immediate)
    }
    const background=backgroundRefreshScheduler(()=>check(true),()=>navigator.onLine&&document.visibilityState!=='hidden')
    refreshRef.current = (force=false,immediate=true)=>{foregroundRequested=true;queue.request(force,immediate)}
    const stopWatching = watchMatchingInputs(supabase, applicantId, () => background.request('change'), status => {
      if (!active) return
      const realtime=!navigator.onLine?'offline':status==='SUBSCRIBED'?'live':'polling'
      setState(previous=>previous.applicantId===applicantId&&previous.realtime===realtime?previous:{...(previous.applicantId===applicantId?previous:{applicantId,data:null,loading:true,error:null}),realtime})
      if (status === 'SUBSCRIBED') { if (subscribed) background.request('reconnect'); subscribed = true }
    })
    const focus = () => {
      if (navigator.onLine) setState(previous => previous.realtime === 'offline' ? { ...previous, realtime: 'polling' } : previous)
      background.request('focus')
    }
    const offline = () => { if (active) setState(previous => ({ ...previous, realtime: 'offline' })) }
    const online=()=>{if(navigator.onLine)setState(previous=>previous.realtime==='offline'?{...previous,realtime:'polling'}:previous);background.request('online')}
    window.addEventListener('focus', focus)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    document.addEventListener('visibilitychange', focus)
    // Also catches missed events, missing publications, resume deletes and configuration changes.
    const poll = window.setInterval(() => background.request('poll'), REFRESH_POLL_MS)
    // Show saved results immediately while the controlled freshness check runs.
    void load(applicantId).then(data => {
      if (active && !publishedRun) setState(previous => shareQueryData(previous, { ...previous, applicantId, data }))
    }).catch(() => { /* The queued refresh owns error reporting and retry. */ })
    queue.request(false, true)
    return () => {
      active = false
      background.dispose()
      queue.dispose()
      refreshRef.current = () => {}
      window.clearInterval(poll)
      window.removeEventListener('focus', focus)
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
      document.removeEventListener('visibilitychange', focus)
      stopWatching()
    }
  }, [applicantId, load, run])

  return state.applicantId === applicantId ? { ...state, refresh } : { ...state, data: null, matching: undefined, loading: true, error: null, refresh }
}
