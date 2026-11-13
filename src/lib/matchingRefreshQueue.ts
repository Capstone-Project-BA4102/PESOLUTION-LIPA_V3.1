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

let subscriptionSequence = 0

/** Subscribe only to matching inputs, never output tables (which would cause refresh loops). */
export function watchMatchingInputs(client: Pick<SupabaseClient, 'channel' | 'removeChannel'>, applicantId: string,
  changed: () => void, status: (value: string) => void) {
  const channel = client.channel(`match-results:${applicantId}:${++subscriptionSequence}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'job_listings' }, changed)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'resumes', filter: `applicant_id=eq.${applicantId}` }, changed)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'applicants', filter: `id=eq.${applicantId}` }, changed)
    .subscribe(status)
  return () => { void client.removeChannel(channel) }
}
