import { useEffect, useState } from 'react'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/lib/auth'
import { usePT } from '@/lib/portalCopy'
import { fetchPublicSite } from '@/lib/site'
import type { Announcement } from '@/types/site'

const seenKey = (userId: string) => `pesolution.announcements-seen.${userId}`

function readSeen(userId: string): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(seenKey(userId)) || '[]')
    return Array.isArray(stored) ? stored.filter((item): item is string => typeof item === 'string') : []
  } catch { return [] }
}

/** Pop-up that shows PESO announcements the applicant has not seen since logging in. */
export function AnnouncementNotice() {
  const pt = usePT()
  const { user } = useAuth()
  const [items, setItems] = useState<Announcement[]>([])
  const [index, setIndex] = useState(0)
  const userId = user?.id

  useEffect(() => {
    if (!userId || user?.role !== 'applicant') return
    let cancelled = false
    void fetchPublicSite()
      .then(site => {
        if (cancelled) return
        const now = Date.now()
        const seen = readSeen(userId)
        const unseen = (site.content?.announcements || [])
          .filter(item => Date.parse(item.publishedAt) <= now && !seen.includes(item.id))
          .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
        if (unseen.length) setItems(unseen.slice(0, 5))
      })
      .catch(() => { /* Announcements are optional — never block the dashboard. */ })
    return () => { cancelled = true }
  }, [userId, user?.role])

  if (!items.length) return null
  const item = items[Math.min(index, items.length - 1)]
  const dismiss = () => {
    try { localStorage.setItem(seenKey(userId!), JSON.stringify([...readSeen(userId!), ...items.map(entry => entry.id)])) } catch { /* Private-mode storage failures only mean it reappears next visit. */ }
    setItems([])
    setIndex(0)
  }
  const isLast = index >= items.length - 1
  return <Modal open onClose={dismiss} title="PESO Announcements" footer={<>
    {!isLast && <Button variant="neutral" onClick={() => setIndex(current => current + 1)}>{pt('Next Announcement')}</Button>}
    <Button onClick={dismiss}>{items.length > 1 && !isLast ? pt('Dismiss All') : pt('Got it')}</Button>
  </>}>
    <div className="space-y-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">
        <CalendarDays className="h-4 w-4" />{new Date(item.publishedAt).toLocaleDateString()}
      </p>
      <h3 className="text-2xl font-bold text-slate-900">{item.title}</h3>
      <p className="text-lg leading-8 text-slate-600">{item.body}</p>
      {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-bold text-brand-700">
        {pt('Official announcement')} <ArrowRight className="h-4 w-4" />
      </a>}
      {items.length > 1 && <p className="border-t border-slate-200 pt-3 text-sm text-slate-500">
        {pt('Announcement {current} of {total}', { current: index + 1, total: items.length })}
      </p>}
    </div>
  </Modal>
}
