/** Shared background refresh policy. Explicit user refreshes remain immediate. */
export const BACKGROUND_REFRESH = Symbol('background-refresh')
export const REFRESH_POLL_MS = 180000
export const FOCUS_STALE_MS = 30000
export type RefreshReason = 'change' | 'focus' | 'online' | 'poll' | 'reconnect'
export function backgroundRefreshScheduler(refresh: () => void, available: () => boolean, now = () => Date.now()) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let last = now(), queued: number | undefined, disposed = false, dirty = false
  const request = (reason: RefreshReason = 'change') => {
    if (disposed) return
    if (reason==='change' || reason==='online' || reason==='reconnect') dirty=true
    if (!available()) return
    const time = now()
    if (reason === 'focus' && !dirty && time - last < FOCUS_STALE_MS) return
    queued ??= time
    clearTimeout(timer)
    const due = Math.max(last + 2000, Math.min(time + 1000, queued + 3000))
    timer = setTimeout(() => {
      timer = undefined; queued = undefined
      if (!disposed && available()) { last = now(); dirty=false; refresh() }
    }, Math.max(0, due - time))
  }
  return { request, dispose() { disposed = true; clearTimeout(timer); queued = undefined } }
}
