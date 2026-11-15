import { backendRequest } from './backend'

export function removeFeedbackReview(feedbackId: string) {
  return backendRequest<{ id: string; removed: boolean; removedAt: string; auditRecorded: boolean }>(
    `/admin/feedback/${encodeURIComponent(feedbackId)}`, { method: 'DELETE', body: { confirmed: true } },
  )
}
