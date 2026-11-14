import { useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { watchRows } from './rowChanges'
/** Refresh the mounted view only; never clear a form or recalculate other applicants. */
export function useLiveRefresh(refresh: () => void, tables: string[], enabled = true) {
  const latest = useRef(refresh)
  useEffect(() => { latest.current = refresh }, [refresh])
  const key = tables.join(',')
  useEffect(() => {
    if (!enabled) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const request = () => {
      clearTimeout(timer)
      if (navigator.onLine && document.visibilityState !== 'hidden') timer = setTimeout(() => latest.current(), 400)
    }
    const stops = key.split(',').filter(Boolean).map(table => watchRows(supabase, table, undefined, request,
      status => { if (status === 'SUBSCRIBED') request() }))
    window.addEventListener('focus', request)
    window.addEventListener('online', request)
    document.addEventListener('visibilitychange', request)
    const poll = window.setInterval(request, 60000)
    return () => {
      clearTimeout(timer); window.clearInterval(poll); stops.forEach(stop => stop())
      window.removeEventListener('focus', request); window.removeEventListener('online', request)
      document.removeEventListener('visibilitychange', request)
    }
  }, [key, enabled])
}
