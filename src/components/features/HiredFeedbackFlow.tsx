import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { PartyPopper, Star } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { backendRequest } from '@/lib/backend'
import { usePT } from '@/lib/portalCopy'
import { StarRating } from '@/components/ui/StarRating'

export interface HiredFeedbackItem { id: string; job_listings?: { title?: string; companies?: { name?: string } }; feedback?: { submitted_at?: string; congratulations_acknowledged_at?: string; sentiment_status?: string } | null }

export function HiredFeedbackFlow({ applications, onChanged }: { applications: HiredFeedbackItem[]; onChanged?: () => void }) {
  const pt = usePT(); const [items, setItems] = useState<HiredFeedbackItem[]>([]); const [active, setActive] = useState<HiredFeedbackItem | null>(null)
  const [stage, setStage] = useState<'congrats'|'invite'|'form'|null>(null); const [rating, setRating] = useState(0); const [text, setText] = useState(''); const [publicConsent, setPublicConsent] = useState(false); const [displayName, setDisplayName] = useState(''); const [busy, setBusy] = useState(false)
  const load = async () => { try { const value = await backendRequest<HiredFeedbackItem[]>('/applicant/feedback'); setItems(value); const fresh = value.find(row => !row.feedback?.congratulations_acknowledged_at); if (fresh) { setActive(fresh); setStage('congrats') } } catch { /* status page remains usable */ } }
  useEffect(() => { if (applications.some(row => row.id)) void load() }, [applications.map(row => row.id).join(',')])
  const request = async (path: string) => { if (!active) return; setBusy(true); try { await backendRequest(path, { method: 'POST' }); await load(); onChanged?.() } finally { setBusy(false) } }
  const continueToInvite = async () => { if (!active) return; await request(`/applicant/feedback/${active.id}/acknowledge`); setStage('invite') }
  const dismiss = async () => { if (!active) return; await request(`/applicant/feedback/${active.id}/dismiss`); setStage(null); setActive(null) }
  const submit = async () => { if (!active) return; setBusy(true); try { await backendRequest(`/applicant/feedback/${active.id}/submit`, { method: 'POST', body: { rating, feedbackText: text, publicStoryConsent: publicConsent, publicStoryDisplayName: publicConsent ? displayName : '' } }); toast.success(pt('Thank you for sharing your feedback.')); setStage(null); setActive(null); setRating(0); setText(''); setPublicConsent(false); setDisplayName(''); await load(); onChanged?.() } catch (e) { toast.error(e instanceof Error ? e.message : pt('Feedback could not be submitted.')) } finally { setBusy(false) } }
  const open = (item: HiredFeedbackItem) => { setActive(item); setStage('form'); setRating(0); setText(''); setPublicConsent(false); setDisplayName('') }
  return <>
    {items.filter(item => !item.feedback?.submitted_at).map(item => <Button key={item.id} size="sm" variant="neutral" icon={<Star className="h-4 w-4" />} onClick={() => open(item)}>{pt('Give Feedback')}</Button>)}
    <Modal open={stage === 'congrats'} onClose={() => {}} title={pt('Congratulations!')} footer={<Button disabled={busy} onClick={() => void continueToInvite()}>{pt('Continue')}</Button>}>
      <div className="text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-50 text-success-700"><PartyPopper className="h-8 w-8" /></span><h3 className="mt-5 text-2xl font-bold text-slate-900">{pt('You have been hired!')}</h3><p className="mt-3 text-lg text-slate-600">{active?.job_listings?.title} · {active?.job_listings?.companies?.name}</p></div>
    </Modal>
    <Modal open={stage === 'invite'} onClose={() => void dismiss()} title={pt('Share your PESOLUTION experience')} footer={<><Button variant="neutral" disabled={busy} onClick={() => void dismiss()}>{pt('Maybe Later')}</Button><Button onClick={() => setStage('form')}>{pt('Give Feedback')}</Button></>}>
      <p className="text-lg leading-8 text-slate-600">{pt('Your optional feedback helps PESO improve employment services for other Lipeños.')}</p>
    </Modal>
    <Modal open={stage === 'form'} onClose={() => setStage(null)} title={pt('PESOLUTION Feedback')} footer={<Button disabled={busy || !rating || text.trim().length < 10} onClick={() => void submit()}>{busy ? pt('Submitting...') : pt('Submit Feedback')}</Button>}>
      <label className="font-bold text-slate-900">{pt('Overall rating')}</label><div className="mt-3"><StarRating value={rating} size="lg" onChange={setRating} /></div>
      <label className="mt-6 block font-bold text-slate-900" htmlFor="hired-feedback">{pt('Tell us about your experience using PESOLUTION')}</label><textarea id="hired-feedback" value={text} onChange={e => setText(e.target.value)} rows={6} maxLength={4000} className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900" /><p className="mt-1 text-sm text-slate-500">{text.length}/4000 · {pt('Minimum 10 characters')}</p>
      <div className="mt-6 border-t border-slate-200 pt-5"><label className="flex items-start gap-3 text-sm leading-6 text-slate-700"><input type="checkbox" checked={publicConsent} onChange={e => setPublicConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-red-700" /><span>I voluntarily allow PESO Lipa City to publish this written feedback on the PESOLUTION public website. My feedback remains private when this is unchecked.</span></label>{publicConsent && <label className="mt-4 block text-sm font-semibold text-slate-900">Public display name (optional)<input value={displayName} maxLength={120} onChange={e => setDisplayName(e.target.value)} placeholder="Example: Juan D. or PESOLUTION Applicant" className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal" /></label>}</div>
    </Modal>
  </>
}
