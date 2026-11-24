const { HttpError, check, requireUuid } = require('./domain.cjs');
const { createHash } = require('node:crypto');
const { context, previewCompanyEmail, sendCompanyEmail } = require('./company-referral-email.cjs');
const { previewNotification, sendNotification } = require('./notifications.cjs');
const { referralPdf } = require('./referral-email-pdf.cjs');
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');
const canSend = receipt => !receipt || ['Not Sent', 'Failed', 'Bounced'].includes(receipt.email_status);
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function referralForApplication(supabase, applicationId) {
  const row = check(await supabase.from('referrals').select('id').eq('application_id', requireUuid(applicationId)).maybeSingle());
  if (!row) throw new HttpError(404, 'No official referral slip exists for this application.');
  return row.id;
}
async function applicantPreview(supabase, record, config) {
  const event = check(await supabase.from('status_history').select('id').eq('application_id', record.applicationId)
    .eq('status', 'Referred').order('changed_at', { ascending: false }).limit(1).maybeSingle());
  if (!event) throw new HttpError(409, 'A confirmed referral status event is required.');
  const preview = await previewNotification(supabase, event.id, config);
  if (!validEmail(preview.recipientEmail)) throw new HttpError(409, 'Update the applicant record with a valid email address.');
  return { ...preview, fingerprint: digest({ record, eventId: event.id, recipient: preview.recipientEmail, text: preview.text }) };
}
async function previewReferralEmails(supabase, referralId, config, includePdf = true) {
  const record = await context(supabase, referralId);
  const results = await Promise.allSettled([applicantPreview(supabase, record, config), previewCompanyEmail(supabase, referralId, false)]);
  const recipients = {};
  for (const [index, kind] of ['applicant', 'company'].entries()) {
    const result = results[index];
    if (result.status === 'rejected') {
      recipients[kind] = { available: false, recipientEmail: kind === 'applicant' ? record.applicantEmail : record.recipientEmail,
        error: result.reason instanceof HttpError ? result.reason.message : 'Preview is unavailable. Please reload or contact PESO support.' };
    } else {
      const { pdfBase64: _pdf, ...value } = result.value;
      recipients[kind] = { ...value, available: true, canSend: canSend(value.notification) };
    }
  }
  return { referralId, number: record.number, applicantName: record.applicantName, jobTitle: record.jobTitle,
    attachmentName: `${record.number}.pdf`, ...(includePdf ? { pdfBase64: referralPdf(record).toString('base64') } : {}), recipients };
}
async function sendReferralEmails(supabase, actor, referralId, body, config) {
  if (actor?.role !== 'admin') throw new HttpError(403, 'Only PESO staff can send referral emails.');
  const selected = body?.recipients;
  if (body?.confirmed !== true || !Array.isArray(selected) || !selected.length || selected.length > 2 ||
      new Set(selected).size !== selected.length || selected.some(kind => !['applicant', 'company'].includes(kind))) {
    throw new HttpError(400, 'Select applicant and/or company and confirm before sending.');
  }
  // Validate every selected preview before sending either recipient.
  const preview = await previewReferralEmails(supabase, referralId, config, false);
  for (const kind of selected) {
    const recipient = preview.recipients[kind];
    if (!recipient.available || recipient.fingerprint !== body.fingerprints?.[kind]) throw new HttpError(409, 'Recipient or referral details changed. Reload the preview before sending.');
  }
  const outcomes = {};
  for (const kind of selected) {
    try {
      const recipient = preview.recipients[kind];
      if (!recipient.canSend) { outcomes[kind] = { success: false, error: 'Already sent or awaiting delivery verification. No duplicate email was sent.' }; continue; }
      if (kind === 'company') {
        const receipt = await sendCompanyEmail(supabase, actor, referralId, { confirmed: true, fingerprint: recipient.fingerprint }, config);
        outcomes[kind] = { success: true, receipt };
      } else {
        const record = await context(supabase, referralId);
        const current = await applicantPreview(supabase, record, config);
        if (current.fingerprint !== recipient.fingerprint) throw new HttpError(409, 'Referral details changed. Reload the preview.');
        const receipt = await sendNotification(supabase, actor, current.eventId, config, {
          attachment: { name: `${record.number}.pdf`, content: referralPdf(record).toString('base64') }, safeDelivery: true,
        });
        outcomes[kind] = { success: true, receipt };
      }
    } catch (error) {
      outcomes[kind] = { success: false, error: error instanceof HttpError ? error.message : 'Email delivery could not be verified. Reload the preview before retrying.' };
    }
  }
  return { outcomes };
}
module.exports = { referralForApplication, previewReferralEmails, sendReferralEmails, canSend };
