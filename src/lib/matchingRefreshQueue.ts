import { watchRows } from './rowChanges.ts'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Debounce event bursts and queue one follow-up when inputs change during a run. */
export function matchingRefreshQueue(run: (force: boolean) => Promise<unknown>, onError: (error: unknown) => void, delay = 400) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let running = false
  let pending = false
  let forced = false
  let disposed = false
  async function drain() {
    if (disposed || running) return
    running = true
    try {
      do {
        pending = false
        const force = forced
        forced = false
        try { await run(force) } catch (error) { if (!disposed) onError(error) }
      } while (pending && !disposed)
    } finally { running = false }
  }
  return {
    request(force = false, immediate = false) {
      if (disposed) return
      pending = true
      forced ||= force
      clearTimeout(timer)
      if (!running) timer = setTimeout(() => { void drain() }, immediate ? 0 : delay)
    },
    dispose() { disposed = true; pending = false; clearTimeout(timer) },
  }
}

/** Watch only input tables. Combine status across all channels, not just the last one. */
export function watchMatchingInputs(client: Pick<SupabaseClient, 'channel' | 'removeChannel'>, applicantId: string,
  changed: () => void, status: (value: string) => void) {
  const states = ['CONNECTING', 'CONNECTING', 'CONNECTING']
  let published = ''
  const report = (index: number, value: string) => {
    states[index] = value
    const next = states.every(value => value === 'SUBSCRIBED') ? 'SUBSCRIBED' : states.find(value => value !== 'SUBSCRIBED')!
    if (next !== published) { published = next; status(next) }
  }
  const stops = [
    watchRows(client, 'job_listings', undefined, changed, value => report(0, value)),
    watchRows(client, 'resumes', `applicant_id=eq.${applicantId}`, changed, value => report(1, value)),
    watchRows(client, 'applicants', `id=eq.${applicantId}`, changed, value => report(2, value)),
  ]
  return () => stops.forEach(stop => stop())
}
