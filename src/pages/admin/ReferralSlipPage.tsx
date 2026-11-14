// @ts-nocheck
import { RefreshNotice } from '@/components/shared/RefreshNotice'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { useParams, useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { FileDown, Pencil, XCircle, Save, Printer } from 'lucide-react'
import { downloadReferralPdf } from '@/lib/referralPdf'
import { referralPronouns } from '@/lib/referralPronouns'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { fetchReferralSlip, fetchReferralPreview, updateReferralSlip, cancelReferral, generateReferral } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { printDocument } from '@/lib/print'
import { ErrorBlock } from '@/components/shared/QueryState'
import { usePT, EnglishOnly } from '@/lib/portalCopy'
import toast from 'react-hot-toast'

const fmtLongDate = (d) => {
  const dt = new Date(d)
  return isNaN(dt.getTime())
    ? 'N/A'
    : dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

const toDateInput = (d) => {
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10)
}

export default function ReferralSlipPage() {
  const pt = usePT()
  const navigate = useNavigate()
  const { applicantId } = useParams()
  const [searchParams] = useSearchParams()
  const referralId = searchParams.get('refId')
  const jobId = searchParams.get('jobId')
  const location = useLocation()
  const isAdmin = location.pathname.includes('/admin')

  const [resolvedRefId, setResolvedRefId] = useState(referralId)
  const [refNo, setRefNo] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({ date: '', to: '', address: '', signatory: '' })
  const [isConfirming, setIsConfirming] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState(null) // 'confirm' | 'cancel'

  const fetcher = useCallback(
    () => (resolvedRefId ? fetchReferralSlip(resolvedRefId) : fetchReferralPreview(applicantId, jobId)),
    [resolvedRefId, jobId, applicantId]
  )
  const { data, loading, refreshing, error, reload } = useQuery(fetcher, [resolvedRefId, jobId, applicantId])

  useLiveRefresh(reload, ['referrals', 'applications'], !editMode && !isSaving && !isConfirming && !isCancelling)

  useEffect(() => {
    if (!data || editMode) return
    setRefNo(data.referral_number || '')
    setForm({
      date: toDateInput(data.date_issued),
      to: data.recipient_name || data.company || '',
      address: data.recipient_address || data.companyAddress || '',
      signatory: data.signatory_name || '',
    })
  }, [data, editMode])

  if (loading && !data) return <div className="space-y-6" aria-busy="true">
    <PageHeader title="Referral Slip Preview" />
    <p role="status" className="text-sm text-slate-500">{pt('Loading referral slip details...')}</p>
  </div>
  if (!data) return <ErrorBlock message={error || pt('Referral not found')} onRetry={reload} />

  const pronouns = referralPronouns(data.applicantGender)
  const confirmed = data.applicationStatus === 'Referred'
  const issued = !!resolvedRefId
  const canConfirm = !issued || ['Matched', 'Referral Requested'].includes(data.applicationStatus)
  const downloadable = issued && ['Referred', 'Hired', 'Not Hired'].includes(data.applicationStatus)
  const displayTo = form.to || data.company || ''
  const displayAddress = form.address || data.companyAddress || ''
  const displaySignatory = form.signatory || 'PESO Manager'
  const displayDate = editMode && form.date ? fmtLongDate(form.date) : fmtLongDate(data.date_issued)

  const handleSave = async () => {
    if (!resolvedRefId || !confirmed) {
      // Preview mode: edits stay in memory until Confirm creates the referral
      setEditMode(false)
      return
    }
    setIsSaving(true)
    const toastId = toast(pt('Saving changes…'), { duration: Infinity })
    try {
      await updateReferralSlip(resolvedRefId, {
        date_issued: form.date ? new Date(form.date + 'T09:00:00').toISOString() : data.date_issued,
        signatory_name: form.signatory || null,
        recipient_name: form.to || null,
        recipient_address: form.address || null,
      })
      setEditMode(false)
      await reload()
      toast.success(pt('Referral slip updated.'), { id: toastId })
    } catch (e) {
      toast.error(e.message || pt('Failed to save.'), { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDiscard = () => {
    setForm({
      date: toDateInput(data.date_issued),
      to: data.recipient_name || data.company || '',
      address: data.recipient_address || data.companyAddress || '',
      signatory: data.signatory_name || '',
    })
    setEditMode(false)
  }

  const handleConfirmReferral = async () => {
    if (!isAdmin || isConfirming || loading) return
    setIsConfirming(true)
    try {
      const res = await generateReferral(applicantId, jobId, {
        date_issued: form.date ? new Date(form.date + 'T09:00:00').toISOString() : undefined,
        signatory_name: form.signatory || null, recipient_name: form.to || null,
        recipient_address: form.address || null,
      }, resolvedRefId || undefined)
      setResolvedRefId(res.id)
      setRefNo(res.referral_number)
      toast.success(pt('Referral issued. You can now download or print the slip.'))
      if (resolvedRefId) await reload()
    } catch (e) {
      toast.error(e.message || pt('Failed to issue referral.'))
    } finally { setIsConfirming(false) }
  }

  const handleDownload = async () => {
    if (!downloadable || isConfirming || editMode) return
    setIsConfirming(true)
    const toastId = toast(pt('Generating referral PDF…'), { duration: Infinity })
    try {
      await downloadReferralPdf(document.getElementById('referral-slip-content'), refNo)
      toast.success(pt('Referral PDF downloaded.'), { id: toastId })
    } catch (e) {
      toast.error(e.message || pt('Failed to download PDF.'), { id: toastId })
    } finally { setIsConfirming(false) }
  }

  const handleCancelReferral = async () => {
    if (isCancelling || !resolvedRefId || loading) return
    setConfirmDialog(null)
    setIsCancelling(true)
    const toastId = toast(pt('Cancelling referral…'), { duration: Infinity })
    try {
      await cancelReferral(resolvedRefId)
      toast.success(pt('Referral cancelled.'), { id: toastId })
      navigate(`/admin/matching/${applicantId}`)
    } catch (e) {
      toast.error(e.message || pt('Failed to cancel referral.'), { id: toastId })
    } finally {
      setIsCancelling(false)
    }
  }

  const handlePrint = () => printDocument(refNo || 'referral-slip')

  const inputCls = 'w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-900 focus:border-brand-500 focus:outline-none'

  return (
    <div className="space-y-6">
      <div className="print:hidden no-print">
        <RefreshNotice error={error} refreshing={refreshing} retry={reload} />
        <PageHeader
          title="Referral Slip Preview"
          description="Preview the referral slip. Only PESO staff can issue an official referral."
          back={isAdmin ? { to: `/admin/matching/${applicantId}`, label: "Back to Match Details" } : { to: "/applicant/status", label: "Back to Application Status" }}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {downloadable && !editMode && <>
                <Button variant="neutral" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />{pt('Print')}</Button>
                <Button variant="primary" disabled={isConfirming} onClick={handleDownload}><FileDown className="mr-2 h-4 w-4" />{pt(isConfirming ? 'Generating…' : 'Download PDF')}</Button>
              </>}
              {isAdmin && (editMode ? <>
                <Button variant="primary" disabled={isSaving} onClick={handleSave}><Save className="mr-2 h-4 w-4" />{pt('Save Changes')}</Button>
                <Button variant="neutral" disabled={isSaving} onClick={handleDiscard}>{pt('Discard')}</Button>
              </> : <>
                {(canConfirm || confirmed) && <Button variant="neutral" onClick={() => setEditMode(true)}><Pencil className="mr-2 h-4 w-4" />{pt('Edit')}</Button>}
                {canConfirm && <Button variant="primary" disabled={isConfirming || loading} onClick={() => setConfirmDialog('confirm')}>{pt('Confirm Referral')}</Button>}
                {confirmed && <Button variant="neutral" disabled={isCancelling} onClick={() => setConfirmDialog('cancel')}><XCircle className="mr-2 h-4 w-4" />{pt('Cancel Referral')}</Button>}
              </>)}
            </div>
          }
        />
        {issued && !confirmed && <p role="status" className="mb-4 rounded-lg border border-slate-200 p-3 text-sm">{pt('Referral status')}: {pt(data.applicationStatus)}. {pt('This record is retained for history.')}</p>}
        {editMode && (
          <div className="mb-4 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">{pt('Date')}</label>
              <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">{pt('To (Contact Person / Company)')}</label>
              <textarea rows={3} className={inputCls} value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} placeholder={pt('Contact person, position, and company')} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">{pt('Address')}</label>
              <input className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={pt('Company address')} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">{pt('PESO Manager (Signatory)')}</label>
              <input className={inputCls} value={form.signatory} onChange={(e) => setForm({ ...form, signatory: e.target.value })} placeholder={pt('Signatory name')} />
            </div>
          </div>
        )}
      </div>

      <Modal
        open={confirmDialog === 'confirm'}
        onClose={() => setConfirmDialog(null)}
        title="Confirm Referral"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="neutral" onClick={() => setConfirmDialog(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => { setConfirmDialog(null); handleConfirmReferral() }}>Yes, Confirm Referral</Button>
          </div>
        }
      >
        <p className="text-lg text-slate-700">
          {pt('Issue the referral slip for')} <span className="font-bold text-slate-900">{data.applicantName}</span>{pt(' to')}{' '}
          <span className="font-bold text-slate-900">{displayTo || data.company}</span>?
        </p>
        <p className="mt-2 text-slate-600">
          {pt('This creates the official REF number and records the referral as Referred. Download and print are separate actions.')}
        </p>
      </Modal>

      <Modal
        open={confirmDialog === 'cancel'}
        onClose={() => setConfirmDialog(null)}
        title="Cancel Referral"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="neutral" onClick={() => setConfirmDialog(null)}>Keep Referral</Button>
            <Button variant="primary" disabled={isCancelling} onClick={handleCancelReferral}>{isCancelling ? 'Cancelling…' : 'Yes, Cancel Referral'}</Button>
          </div>
        }
      >
        <p className="text-lg text-slate-700">
          {pt('Cancel referral')} <span className="font-bold text-slate-900">{refNo}</span>?
        </p>
        <p className="mt-2 text-slate-600">{pt('The referral will be closed as Declined. Its slip and status history will be retained. This is not a Not Hired employment outcome.')}</p>
      </Modal>

      <EnglishOnly>
      <div id="referral-slip-content" className="paper max-w-5xl bg-white p-12 shadow-md rounded-xl border border-slate-200 print:shadow-none print:border-none print:p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-brand-600 pb-6 mb-8">
          <div className="flex min-w-0 items-center gap-4">
            <img src="/logo-lipa.png" alt="Lipa City Logo" className="h-20 w-20 shrink-0 object-contain" />
            <div className="min-w-0">
              <h2 className="text-xl font-black text-slate-900 uppercase">Public Employment Service Office</h2>
              <p className="font-semibold text-brand-700">City Government of Lipa</p>
              <p className="text-sm text-slate-500 w-96 max-w-full">PESO Trabaho Center, 2nd Floor, Left Wing, New City Hall Building, Areza Estate, Barangay Bulacnin, Lipa City, Batangas</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-bold text-brand-600">REFERRAL SLIP</p>
            <p className="text-sm font-medium text-slate-500">No. {refNo || 'PENDING — issued on confirm'}</p>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-6 text-slate-800 leading-relaxed">
          <div className="flex justify-between">
            <div className="space-y-1">
              <p><span className="font-semibold inline-block w-24">Date:</span> {displayDate}</p>
              <div className="flex items-start"><span className="font-semibold inline-block w-24 shrink-0">To:</span><span className="whitespace-pre-line">{displayTo || 'N/A'}</span></div>
              <p><span className="font-semibold inline-block w-24">Address:</span> {displayAddress || 'N/A'}</p>
            </div>
          </div>

          <div className="mt-8">
            <p className="mb-4">Dear Sir / Madam,</p>
            <p>
              This is to respectfully refer to your good office the bearer,
              <span className="font-bold text-slate-900 mx-2 text-lg">{data.applicantName || 'N/A'}</span>
              who has signified {pronouns.possessive} intention to apply for the position of
              <span className="font-bold text-slate-900 mx-2">{data.jobTitle || 'N/A'}</span> in your company.
            </p>
            <p className="mt-4">
              Based on our initial assessment and matching process, the applicant possesses qualifications that align with your requirements. We hope you will find {pronouns.object} suitable for employment in your esteemed organization.
            </p>
            <p className="mt-4">
              Please accommodate the applicant and let us know of the result of {pronouns.possessive} application.
            </p>
          </div>

          <div className="mt-12 flex justify-between">
            <div>
              <p className="mb-8">Very truly yours,</p>
              <div className="border-t border-slate-400 pt-2 w-64 text-center">
                <p className="font-bold uppercase text-slate-900">{displaySignatory}</p>
                <p className="text-sm text-slate-500">PESO Manager, City Government of Lipa</p>
              </div>
            </div>

            <div>
              <p className="mb-8">Applicant's Contact Info:</p>
              <div className="border border-slate-200 rounded p-4 text-sm w-64 bg-slate-50">
                <p><span className="font-semibold">Phone:</span> {data.applicantPhone || 'N/A'}</p>
                <p><span className="font-semibold">Email:</span> {data.applicantEmail || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </EnglishOnly>
    </div>
  )
}
