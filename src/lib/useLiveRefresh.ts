import { useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { watchRows } from './rowChanges'
import { BACKGROUND_REFRESH, backgroundRefreshScheduler, REFRESH_POLL_MS } from './refreshPolicy'
/** Realtime stays enabled; background checks never request foreground loading UI. */
export function useLiveRefresh(refresh: (reason?: unknown) => void, tables: string[], enabled = true) {
  const latest = useRef(refresh)
  useEffect(() => { latest.current = refresh }, [refresh])
  const key = tables.join(',')
  useEffect(() => {
    if (!enabled) return
    const scheduler=backgroundRefreshScheduler(()=>latest.current(BACKGROUND_REFRESH),()=>navigator.onLine&&document.visibilityState!=='hidden')
    const stops=key.split(',').filter(Boolean).map(table=>{
      let connected=false,reconnecting=false
      return watchRows(supabase,table,undefined,()=>scheduler.request('change'),status=>{
        if(status==='SUBSCRIBED') {scheduler.request(connected&&reconnecting?'reconnect':'focus');connected=true;reconnecting=false}
        else if(connected)reconnecting=true
      })
    })
    const focus=()=>scheduler.request('focus'),online=()=>scheduler.request('online'),poll=()=>scheduler.request('poll')
    window.addEventListener('focus',focus);window.addEventListener('online',online);document.addEventListener('visibilitychange',focus)
    const timer=window.setInterval(poll,REFRESH_POLL_MS)
    return()=>{scheduler.dispose();stops.forEach(stop=>stop());window.clearInterval(timer);window.removeEventListener('focus',focus);window.removeEventListener('online',online);document.removeEventListener('visibilitychange',focus)}
  }, [key, enabled])
}
