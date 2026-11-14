import { IDLE_TIMEOUT, remainingSeconds, sessionKey, validActivity, type ActivityRecord } from './sessionActivity.ts'
let identity: string | null = null
let blocked = false
let generation = 0
const memory = new Map<string, ActivityRecord>()
const requests = new Set<AbortController>()
export function readActivity(id: string): ActivityRecord {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(sessionKey(id)) || 'null')
    if (validActivity(value)) { memory.set(id, value); return value }
  } catch { /* Private browsing can disable storage; keep this tab protected. */ }
  return memory.get(id) || { lastActivity: Date.now(), ended: false }
}
export function writeActivity(id: string, record: ActivityRecord) {
  memory.set(id, record)
  try { localStorage.setItem(sessionKey(id), JSON.stringify(record)) } catch { /* In-memory fallback. */ }
}
export function activateSession(id: string, fresh = false) {
  if (fresh || identity !== id) generation++
  identity = id
  const record = fresh ? { lastActivity: Date.now(), ended: false } : readActivity(id)
  writeActivity(id, record)
  blocked = remainingSeconds(record, Date.now()) === 0
  return !blocked
}
export function endSession() {
  generation++
  blocked = true
  if (identity) writeActivity(identity, { ...readActivity(identity), ended: true })
  for (const controller of requests) controller.abort()
  requests.clear()
}
export function assertSessionActive() {
  if (blocked || identity && remainingSeconds(readActivity(identity), Date.now()) === 0) {
    endSession()
    throw new Error('Your session has expired. Please sign in again.')
  }
}
/** Abort protected AJAX on logout and reject late responses from an old session. */
export async function protectedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  assertSessionActive()
  const owner = generation
  const controller = new AbortController()
  requests.add(controller)
  try {
    const response = await fetch(input, { ...init, signal: init.signal ? AbortSignal.any([init.signal, controller.signal]) : controller.signal })
    assertSessionActive()
    if (owner !== generation) throw new Error('The signed-in account changed. Please retry.')
    return response
  } finally { requests.delete(controller) }
}
export const sessionDurationMinutes = IDLE_TIMEOUT / 60000
