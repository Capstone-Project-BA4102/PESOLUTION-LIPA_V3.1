export const IDLE_TIMEOUT = 30 * 60 * 1000
export const IDLE_WARNING = 2 * 60 * 1000
export type ActivityRecord = { lastActivity: number; ended: boolean }
export const sessionKey = (userId: string) => `peso:activity:v1:${userId}`
export function remainingSeconds(record: ActivityRecord, now: number) {
  return record.ended ? 0 : Math.max(0, Math.ceil((record.lastActivity + IDLE_TIMEOUT - now) / 1000))
}
export function validActivity(value: unknown): value is ActivityRecord {
  return !!value && typeof value === 'object' && 'lastActivity' in value && typeof value.lastActivity === 'number' && Number.isFinite(value.lastActivity) && 'ended' in value && typeof value.ended === 'boolean'
}
/** Wall-clock based: sleeping tabs cannot extend a session by delaying a timer. */
export function activityMonitor({ read, write, now = Date.now, changed, expired }: {
  read: () => ActivityRecord; write: (record: ActivityRecord) => void; now?: () => number;
  changed: (seconds: number) => void; expired: () => void;
}) {
  let stopped = false
  let finished = false
  let published = -1
  const check = () => {
    if (stopped || finished) return 0
    const record = read()
    const seconds = remainingSeconds(record, now())
    if (seconds !== published) { published = seconds; changed(seconds) }
    if (!seconds) { finished = true; write({ ...record, ended: true }); expired() }
    return seconds
  }
  return {
    check,
    interact() {
      if (!check()) return false
      write({ lastActivity: now(), ended: false })
      check()
      return true
    },
    dispose() { stopped = true },
  }
}
