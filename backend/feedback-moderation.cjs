const { HttpError, check, requireUuid } = require('./domain.cjs');

/** Remove only a selected review, retaining its application link and acknowledgement history. */
async function removeFeedbackReview(supabase, actor, input, now = () => new Date().toISOString()) {
  if (actor?.role !== 'admin') throw new HttpError(403, 'Only authorized PESO staff can remove feedback reviews.');
  if (input?.confirmed !== true) throw new HttpError(400, 'Please confirm removal of this feedback review.');
  const id = requireUuid(input.feedbackId);
  const row = check(await supabase.from('hired_application_feedback')
    .select('id,application_id,submitted_at,invitation_dismissed_at').eq('id', id).maybeSingle());
  if (!row?.submitted_at) throw new HttpError(404, 'This submitted review is no longer available.');
  const removedAt = now();
  const removed = check(await supabase.from('hired_application_feedback').update({
    rating: null, feedback_text: null, submitted_at: null,
    sentiment_status: 'pending', sentiment_label: null, sentiment_confidence: null,
    sentiment_model: null, sentiment_details: {}, public_story_consent: false,
    public_story_consent_at: null, public_story_display_name: null,
    // Keep congratulations acknowledgement and suppress a fresh invitation after moderation.
    invitation_dismissed_at: row.invitation_dismissed_at || removedAt, updated_at: removedAt,
  }).eq('id', id).eq('submitted_at', row.submitted_at).select('id').maybeSingle());
  if (!removed) throw new HttpError(409, 'This review changed. Refresh the feedback list and try again.');
  let auditRecorded = false;
  try {
    const audit = await supabase.from('activity_logs').insert({
      type: 'applicant', actor: actor.email || actor.id, title: 'Feedback Review Removed',
      description: `Review ${id} removed by staff ${actor.id} at ${removedAt}. Application and referral history retained.`,
    });
    auditRecorded = !audit.error;
  } catch { /* Removal is already saved; report audit availability honestly to the caller. */ }
  return { id, removed: true, removedAt, auditRecorded };
}

function registerFeedbackModeration(app, { supabase, authenticate, admin, asyncRoute, withLock }) {
  app.delete('/api/admin/feedback/:feedbackId', authenticate, admin, asyncRoute(async (req, res) => {
    // Share the classification lock: an in-flight model response cannot rewrite removed content.
    res.json(await withLock('feedback:reclassify', () => removeFeedbackReview(supabase, req.actor,
      { feedbackId: req.params.feedbackId, confirmed: req.body?.confirmed })));
  }));
}
module.exports = { removeFeedbackReview, registerFeedbackModeration };
