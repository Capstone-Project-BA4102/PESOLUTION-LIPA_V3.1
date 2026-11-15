import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button, Modal } from '@/components/ui'
import { backendRequest } from '@/lib/backend'
import { usePT } from '@/lib/portalCopy'
import toast from 'react-hot-toast'
type CacheInfo = { eligible: number; removed: number; retentionDays: number }

/** An explicit maintenance action; never clears activity history or model assets. */
export function CacheCleanup() {
  const pt = usePT()
  const [info, setInfo] = useState<CacheInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const preview = async () => {
    if (busy) return
    setBusy(true); setError('')
    try { setInfo(await backendRequest<CacheInfo>('/admin/runtime-cache')) }
    catch (failure) { setError(failure instanceof Error ? failure.message : pt('Could not check temporary cache.')) }
    finally { setBusy(false) }
  }
  const clear = async () => {
    if (busy || !info?.eligible) return
    setBusy(true); setError('')
    try {
      const result = await backendRequest<CacheInfo>('/admin/runtime-cache/cleanup', { method: 'POST', body: { confirm: true } })
      setInfo(null); toast.success(pt('Expired temporary cache cleared: {count}.', { count: result.removed }))
    } catch (failure) { setError(failure instanceof Error ? failure.message : pt('Could not clear temporary cache.')) }
    finally { setBusy(false) }
  }
  return <>
    <Button size="sm" variant="neutral" icon={<Trash2 className="h-4 w-4" />} onClick={() => void preview()} disabled={busy}>{pt('Clear expired cache')}</Button>
    {error && !info && <p role="alert" className="text-sm text-brand-700">{error}</p>}
    <Modal open={!!info} title={pt('Clear expired temporary cache?')} onClose={() => { if (!busy) { setInfo(null); setError('') } }} dismissible={!busy}
      footer={<><Button size="sm" variant="neutral" disabled={busy} onClick={() => { setInfo(null); setError('') }}>{pt('Cancel')}</Button><Button size="sm" disabled={busy || !info?.eligible} onClick={() => void clear()}>{busy ? pt('Clearing...') : pt('Clear expired cache')}</Button></>}>
      <p className="text-[14px] text-slate-600">{pt('Only temporary matching cache older than {days} days that is not recently used or processing is eligible. Activity history, saved scores, reviews, and pretrained model files are preserved.', { days: info?.retentionDays || 30 })}</p>
      <p className="mt-3 text-[14px] font-medium">{pt('Eligible cache files: {count}', { count: info?.eligible || 0 })}</p>
      <p className="mt-2 text-[13px] text-slate-500">{pt('Expired NLP evidence can be rebuilt on the next matching visit. Cleanup does not run matching or call Gemini.')}</p>
      {error && <p role="alert" className="mt-3 text-sm text-brand-700">{error}</p>}
    </Modal>
  </>
}
