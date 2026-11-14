import type { SupabaseClient } from '@supabase/supabase-js'
type Client = Pick<SupabaseClient, 'channel' | 'removeChannel'>
type Listener = { changed: () => void; status: (status: string) => void }
type Entry = { channel: ReturnType<Client['channel']>; listeners: Set<Listener>; status: string }
const clients = new WeakMap<Client, Map<string, Entry>>()
let sequence = 0
/** Share each table/filter subscription between matching and list views. RLS still applies. */
export function watchRows(client: Client, table: string, filter: string | undefined, changed: () => void, status: (status: string) => void = () => {}) {
  let entries = clients.get(client)
  if (!entries) { entries = new Map(); clients.set(client, entries) }
  const key = `${table}:${filter || ''}`
  let entry = entries.get(key)
  const listener = { changed, status }
  if (!entry) {
    const channel = client.channel(`peso-data:${++sequence}`)
    entry = { channel, listeners: new Set([listener]), status: 'CONNECTING' }
    entries.set(key, entry)
    const shared = entry
    channel.on('postgres_changes', { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) }, () => {
      for (const listener of shared.listeners) listener.changed()
    }).subscribe(value => {
      shared.status = value
      for (const listener of shared.listeners) listener.status(value)
    })
  } else { entry.listeners.add(listener); status(entry.status) }
  const shared = entry
  return () => {
    shared.listeners.delete(listener)
    if (!shared.listeners.size) { entries!.delete(key); void client.removeChannel(shared.channel) }
  }
}
