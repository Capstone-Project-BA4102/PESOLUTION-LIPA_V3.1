import { fetchCurrentApplicantStatusEvents, fetchApplicantSetupEmailStatuses } from './api'
import { backendRequest } from './backend'

export type ReferralEmailStatus = {
  referralId: string
  recipients: Record<'applicant' | 'company', { available: boolean; notification?: { email_status: string; recipient_email?: string } | null }>
}

/** Publish a page's email actions only after every supporting status has been read. */
export async function fetchApplicantEmailData(ids: string[]) {
  if (!ids.length) return { events: {}, setupEmails: {}, referralStatuses: {}, referralErrors: {}, statusErrors: {}, setupErrors: {}, notice: '' }
  const [eventResult, setupResult] = await Promise.allSettled([
    fetchCurrentApplicantStatusEvents(ids), fetchApplicantSetupEmailStatuses(ids),
  ])
  const events = eventResult.status === 'fulfilled' ? eventResult.value : []
  const setupEmails = setupResult.status === 'fulfilled' ? setupResult.value : []
  const statusErrors = eventResult.status === 'rejected' ? Object.fromEntries(ids.map(id => [id, 'Status-email history could not be checked.'])) : {}
  const setupErrors = setupResult.status === 'rejected' ? Object.fromEntries(ids.map(id => [id, 'Welcome-email history could not be checked.'])) : {}
  const referred = events.filter(event => event.status === 'Referred' && event.applicationId)
  const checkedReferrals = await Promise.all(referred.map(async event => {
    try {
      const status = await backendRequest<ReferralEmailStatus>(`/admin/applications/${event.applicationId}/referral-email-status`)
      return { id: event.applicantId, status }
    } catch {
      return { id: event.applicantId, error: 'Referral email status could not be checked.' }
    }
  }))
  return {
    statusErrors,
    setupErrors,
    notice: eventResult.status === 'rejected' || setupResult.status === 'rejected' || checkedReferrals.some(row => row.error)
      ? 'Some email statuses could not be checked. Applicant records are still available.' : '',
    events: Object.fromEntries(events.map(event => [event.applicantId, event])),
    setupEmails: Object.fromEntries(setupEmails.map(email => [email.applicant_id, email])),
    referralStatuses: Object.fromEntries(checkedReferrals.filter(row => row.status).map(row => [row.id, row.status])),
    referralErrors: Object.fromEntries(checkedReferrals.filter(row => row.error).map(row => [row.id, row.error])),
  }
}
