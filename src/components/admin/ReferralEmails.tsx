import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { backendRequest } from '@/lib/backend'
import { usePT } from '@/lib/portalCopy'
import { useQuery } from '@/lib/useQuery'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import type { ReferralEmailStatus } from '@/lib/applicantEmailData'

type Kind = 'applicant' | 'company'
type Recipient = { available: boolean; canSend?: boolean; recipientEmail?: string; subject?: string; text?: string; fingerprint?: string; error?: string; notification?: { email_status: string; recipient_email?: string } | null }
type Preview = { referralId: string; number: string; applicantName: string; jobTitle: string; attachmentName: string; pdfBase64: string; recipients: Record<Kind, Recipient> }
type Status = { referralId: string; recipients: Record<Kind, Recipient> }
const kinds: Kind[] = ['applicant', 'company']
const label = (recipient?: Recipient) => {
  if (!recipient) return 'Not checked'
  if (!recipient.available) return 'Unavailable'
  const status = recipient.notification?.email_status
  return status === 'Delivered' || status === 'Sent' ? 'Already Sent' : status === 'Sending' ? 'Processing' : status === 'Queued' || status === 'Unknown' ? 'Unconfirmed' : status === 'Failed' || status === 'Bounced' ? 'Failed' : 'Not sent'
}

const statusColor = (recipient?: Recipient) => {
  const value = label(recipient)
  return value === 'Already Sent' ? 'text-success-700' : value === 'Not sent' || value === 'Failed' ? 'text-red-600 dark:text-red-400' : 'text-slate-500'
}

/** One review window, independent messages and receipts. Opening never sends mail. */
export function ReferralEmails({ referralId, applicationId, disabled = false, compact = false, onDone, initialStatus }: {
  referralId?: string; applicationId?: string; disabled?: boolean; compact?: boolean; onDone?: () => void; initialStatus?: ReferralEmailStatus
}) {
  const pt = usePT()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [selected, setSelected] = useState<Record<Kind, boolean>>({ applicant: false, company: false })
  const [tab, setTab] = useState<Kind>('applicant')
  const [error, setError] = useState('')
  const [outcomes, setOutcomes] = useState<Partial<Record<Kind, { success: boolean; error?: string }>>>({})
  const [pdfUrl, setPdfUrl] = useState('')
  const locked = useRef(false)
  const activePdfUrl = useRef('')
  const status = useQuery(() => initialStatus ? Promise.resolve(initialStatus) : applicationId ? backendRequest<Status>(`/admin/applications/${applicationId}/referral-email-status`) : Promise.resolve(null), [applicationId, initialStatus])
  const visibleStatus = initialStatus || status.data
  useLiveRefresh(status.reload, [], !!applicationId && !initialStatus && !busy)
  useEffect(() => () => { if (activePdfUrl.current) URL.revokeObjectURL(activePdfUrl.current) }, [])
  const applyPreview = (value: Preview) => {
    if (activePdfUrl.current) URL.revokeObjectURL(activePdfUrl.current)
    const bytes = Uint8Array.from(atob(value.pdfBase64), c => c.charCodeAt(0))
    activePdfUrl.current = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
    setPdfUrl(activePdfUrl.current); setPreview(value)
    setSelected({ applicant: !!value.recipients.applicant.canSend && value.recipients.applicant.available, company: !!value.recipients.company.canSend && value.recipients.company.available })
  }
  const resolveId = async () => {
    if (referralId) return referralId
    if (visibleStatus?.referralId) return visibleStatus.referralId
    if (!applicationId) throw new Error('Referral not found.')
    return (await backendRequest<Status>(`/admin/applications/${applicationId}/referral-email-status`)).referralId
  }
  const load = async () => {
    if (locked.current || disabled) return
    locked.current = true; setBusy(true); setError(''); setOutcomes({}); setPreview(null); setPdfUrl(''); setTab('applicant'); setOpen(true)
    try {
      const id = await resolveId()
      applyPreview(await backendRequest<Preview>(`/admin/referrals/${id}/emails-preview`))
    } catch (e) { setError(e instanceof Error ? e.message : 'Email preview could not be loaded.') }
    finally { locked.current = false; setBusy(false) }
  }
  const send = async () => {
    const recipients = kinds.filter(kind => selected[kind] && preview?.recipients[kind].available && preview.recipients[kind].canSend)
    if (!preview || !recipients.length || locked.current || disabled) return
    locked.current = true; setBusy(true); setError(''); setOutcomes({})
    try {
      const result = await backendRequest<{ outcomes: Partial<Record<Kind, { success: boolean; error?: string }>> }>(`/admin/referrals/${preview.referralId}/emails`, {
        method: 'POST', body: { confirmed: true, recipients, fingerprints: Object.fromEntries(recipients.map(kind => [kind, preview.recipients[kind].fingerprint])) },
      })
      setOutcomes(result.outcomes)
    } catch (e) { setError(e instanceof Error ? e.message : 'Delivery could not be verified. Reload before retrying.') }
    finally {
      try { applyPreview(await backendRequest<Preview>(`/admin/referrals/${preview.referralId}/emails-preview`)) }
      catch { setPreview(null); setError('The latest delivery status could not be checked. Reload the preview before retrying.') }
      status.reload();
      try { await onDone?.() } catch { setError('Email status could not be refreshed. Please reload before retrying.') }
      finally { locked.current = false; setBusy(false) }
    }
  }
  const current = preview?.recipients[tab]
  const allSent = !!preview && kinds.every(kind => ['Sent','Delivered'].includes(preview.recipients[kind].notification?.email_status || ''))
  const count = kinds.filter(kind => selected[kind] && preview?.recipients[kind].canSend && preview.recipients[kind].available).length
  return <div className={compact ? 'w-full max-w-[240px]' : ''} onClick={event => event.stopPropagation()}>
    <Button variant="neutral" size={compact ? 'sm' : 'md'} className={compact ? 'w-full' : ''} disabled={disabled || busy} onClick={load}><Mail className="mr-2 h-4 w-4" />{pt('Review referral emails')}</Button>
    {compact && <p className="mt-1 flex flex-wrap gap-x-2 text-[11px] leading-snug text-slate-500">{kinds.map(kind => <span key={kind}>{pt(kind === 'applicant' ? 'Applicant' : 'Company')}: <span className={`font-semibold ${status.error && !visibleStatus ? 'text-slate-500' : statusColor(visibleStatus?.recipients[kind])}`}>{pt(status.error && !visibleStatus ? 'Not checked' : label(visibleStatus?.recipients[kind]))}</span></span>)}</p>}
    <Modal open={open} onClose={() => { if (!busy) setOpen(false) }} dismissible={!busy} title="Review referral emails" size="lg"
      footer={<div className="flex flex-wrap justify-end gap-2"><Button variant="neutral" disabled={busy} onClick={() => setOpen(false)}>{pt('Close')}</Button>
        {!preview && <Button disabled={busy || disabled} onClick={load}>{pt('Reload preview')}</Button>}
        <Button variant={allSent ? 'neutral' : 'primary'} disabled={busy || !count} onClick={send}>{allSent && <CheckCircle2 className="mr-2 h-4 w-4" />}{busy ? pt('Please wait...') : allSent ? pt('Already Sent') : count ? pt('Send selected emails ({count})', { count }) : pt('Select recipients')}</Button></div>}>
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{pt(error)}</p>}
      {busy && !preview && <p role="status">{pt('Preparing email preview...')}</p>}
      {preview && <div className="space-y-4 text-sm">
        <div><p className="font-semibold text-slate-900">{preview.applicantName} <span className="font-normal text-slate-500">/ {preview.number}</span></p><p className="mt-1 text-slate-500">{preview.jobTitle}</p></div>
        <fieldset><legend className="mb-2 font-semibold">{pt('Recipients')}</legend><div className="grid gap-2 sm:grid-cols-2">
          {kinds.map(kind => { const recipient = preview.recipients[kind]; return <label key={kind} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
            {['Sent','Delivered'].includes(recipient.notification?.email_status || '') ? <CheckCircle2 aria-label={pt('Already Sent')} className="mt-0.5 h-5 w-5 shrink-0 text-success-600" /> : <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-red-600" checked={selected[kind]} disabled={busy || !recipient.available || !recipient.canSend} onChange={event => setSelected(previous => ({ ...previous, [kind]: event.target.checked }))} />}
            <span className="min-w-0"><span className="block font-semibold">{pt(kind === 'applicant' ? 'Applicant' : 'Company')} <span className={`ml-1 text-xs font-medium ${statusColor(recipient)}`}>{pt(label(recipient))}</span></span>
              <span className="mt-1 block break-all text-xs text-slate-500">{recipient.recipientEmail || pt('No email address')}</span>
              {recipient.notification?.recipient_email && recipient.notification.recipient_email !== recipient.recipientEmail && <span className="mt-1 block break-all text-xs text-slate-500">{pt('Previous recipient')}: {recipient.notification.recipient_email}</span>}
              {recipient.error && <span className="mt-1 block text-xs text-red-700">{pt(recipient.error)}</span>}
              {['Queued','Unknown','Sending'].includes(recipient.notification?.email_status || '') && <span className="mt-1 block text-xs text-slate-500">{pt('Verify delivery before resending.')}</span>}
            </span>
          </label> })}
        </div></fieldset>
        {kinds.some(kind => outcomes[kind]) && <div role="status" className="space-y-1 rounded-lg border border-slate-200 p-3">{kinds.map(kind => outcomes[kind] && <p key={kind} className={outcomes[kind]?.success ? 'text-success-700' : 'text-red-700'}>{pt(kind === 'applicant' ? 'Applicant' : 'Company')}: {pt(outcomes[kind]?.success ? 'Email sent.' : outcomes[kind]?.error || 'Delivery could not be verified.')}</p>)}</div>}
        <div className="flex gap-1 border-b border-slate-200" aria-label={pt('Email previews')}>{kinds.map(kind => <button type="button" key={kind} aria-pressed={tab === kind} onClick={() => setTab(kind)} className={`border-b-2 px-3 py-2 font-semibold ${tab === kind ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500'}`}>{pt(kind === 'applicant' ? 'Applicant' : 'Company')}</button>)}</div>
        {current?.available ? <div><p className="font-semibold text-slate-900">{current.subject}</p><p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 leading-6 text-slate-700">{current.text}</p></div> : <p className="text-slate-500">{pt(current?.error || 'This preview is unavailable.')}</p>}
        {pdfUrl && <details className="rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer font-semibold">{pt('PDF attachment')} <span className="font-normal text-slate-500">{preview.attachmentName}</span></summary>
          <a href={pdfUrl} download={preview.attachmentName} className="my-3 inline-block text-brand-600 underline">{pt('Download attachment preview')}</a><iframe title="Official referral PDF attachment preview" src={pdfUrl} className="h-80 w-full rounded border border-slate-200" /></details>}
        <p className="text-xs leading-5 text-slate-500">{pt('Separate emails will be sent to the selected recipients, each with the official referral PDF. The slip includes applicant contact details. Nothing is sent until you confirm. Already Sent means the email service accepted the message; inbox delivery may take a moment.')}</p>
      </div>}
    </Modal>
  </div>
}
