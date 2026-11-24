const { createHash } = require('node:crypto');
const { HttpError, check, requireUuid } = require('./domain.cjs');
const { referralPdf } = require('./referral-email-pdf.cjs');
const TABLE = 'company_referral_emails';
const emailValid = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
function templateFor(record) {
  const subject = `PESO Lipa City referral ${record.number}: ${record.jobTitle}`;
  const text = `Dear ${record.company},\n\nPESO Lipa City has confirmed the referral of ${record.applicantName} for ${record.jobTitle}.\n\nReferral number: ${record.number}\nThe official referral slip is attached. Please review the applicant for this position and inform PESO of the application outcome through your established PESO contact.\n\nThis notice confirms a referral only; it does not confirm employment.\n\nPESOLUTION / PESO Lipa City`;
  return { subject, text };
}
async function context(supabase, id) {
  const result = check(await supabase.from('referrals').select(`id,application_id,referral_number,date_issued,signatory_name,recipient_name,recipient_address,
    applications(id,status,applicants(full_name,contact_number,email_address),job_listings(title,companies(id,name,email,location)))`)
    .eq('id', requireUuid(id)).maybeSingle());
  if (!result) throw new HttpError(404, 'Referral not found.');
  const app = result.applications;
  if (app?.status !== 'Referred') throw new HttpError(409, 'Only a confirmed, active referral can be emailed to a company.');
  const company = app.job_listings?.companies;
  const recipientEmail = String(company?.email || '').trim();

  const record = { id: result.id, applicationId: result.application_id, number: result.referral_number, date: result.date_issued,
    companyId: company.id, company: company.name, recipientEmail, jobTitle: app.job_listings.title,
    applicantName: app.applicants.full_name, phone: app.applicants.contact_number, applicantEmail: app.applicants.email_address,
    recipientName: result.recipient_name || company.name, address: result.recipient_address || company.location || 'N/A',
    signatory: result.signatory_name || 'PESO Manager' };
  return { ...record, ...templateFor(record) };
}
function fingerprint(record) {
  return createHash('sha256').update(JSON.stringify(record)).digest('hex');
}
async function existing(supabase, id) {
  const result = await supabase.from(TABLE).select('*').eq('referral_id', id).maybeSingle();
  if (['42P01', 'PGRST204', 'PGRST205'].includes(result.error?.code)) {
    throw new HttpError(503, 'Company email is not set up yet. Apply the company referral email migration first.');
  }
  return check(result);
}
async function previewCompanyEmail(supabase, id, includePdf = true) {
  const record = await context(supabase, id);
  if (!emailValid(record.recipientEmail)) throw new HttpError(409, 'Update the company record with a valid email address before sending.');
  const notification = await existing(supabase, id);
  return { recipientEmail: record.recipientEmail, company: record.company, subject: record.subject, text: record.text,
    fingerprint: fingerprint(record), attachmentName: `${record.number}.pdf`,
    ...(includePdf ? { pdfBase64: referralPdf(record).toString('base64') } : {}), notification };
}
async function sendCompanyEmail(supabase, actor, id, body, config) {
  if (actor?.role !== 'admin') throw new HttpError(403, 'Only PESO staff can send company referrals.');
  if (body?.confirmed !== true) throw new HttpError(400, 'Preview and confirm the company email first.');
  if (!config.brevoApiKey || !config.brevoSenderEmail) throw new HttpError(503, 'Brevo email delivery is not configured.');
  const record = await context(supabase, id);
  if (!emailValid(record.recipientEmail)) throw new HttpError(409, 'Update the company record with a valid email address before sending.');
  const contentFingerprint = fingerprint(record);
  if (body.fingerprint !== contentFingerprint) throw new HttpError(409, 'Referral or company details changed. Open a fresh email preview.');
  const previous = await existing(supabase, id);
  if (previous?.email_status === 'Sent') return previous;
  if (previous && previous.email_status !== 'Failed') throw new HttpError(409, 'This email is processing or its delivery is unconfirmed. Check Brevo before attempting another delivery.');
  const pdf = referralPdf(record);
  const row = { referral_id: id, company_id: record.companyId, recipient_email: record.recipientEmail,
    subject: record.subject, content_fingerprint: contentFingerprint, attachment_sha256: createHash('sha256').update(pdf).digest('hex'),
    email_status: 'Sending', sent_by: actor.id, error_details: null, updated_at: new Date().toISOString() };
  const saved = previous
    ? await supabase.from(TABLE).update(row).eq('id', previous.id).eq('email_status', 'Failed').select('*').maybeSingle()
    : await supabase.from(TABLE).insert(row).select('*').single();
  if (saved.error?.code === '23505' || (!saved.error && !saved.data)) throw new HttpError(409, 'This company email has already been submitted.');
  const notification = check(saved);
  let response;
  try {
    // Re-check the persisted referral immediately before contacting the provider.
    if (fingerprint(await context(supabase, id)) !== contentFingerprint) throw new HttpError(409, 'Referral details changed. Open a fresh email preview.');
  } catch (error) {
    check(await supabase.from(TABLE).update({ email_status: 'Failed', error_details: error.message }).eq('id', notification.id));
    throw error;
  }
  try {
    response = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: {
      accept: 'application/json', 'content-type': 'application/json', 'api-key': config.brevoApiKey,
    }, body: JSON.stringify({ sender: { email: config.brevoSenderEmail, name: config.brevoSenderName },
      to: [{ email: record.recipientEmail, name: record.company }], subject: record.subject, textContent: record.text,
      attachment: [{ name: `${record.number}.pdf`, content: pdf.toString('base64') }],
      headers: { IdempotencyKey: createHash('sha256').update(`${notification.id}:${notification.updated_at}`).digest('hex').slice(0, 32) },
    }), signal: AbortSignal.timeout(15000) });
  } catch {
    await supabase.from(TABLE).update({ email_status: 'Unknown', error_details: 'Provider response not received; check Brevo before resending.' }).eq('id', notification.id);
    throw new HttpError(502, 'Referral remains confirmed. Email delivery is unconfirmed; check Brevo before resending.');
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.messageId) {
    const definitiveRejection = response.status >= 400 && response.status < 500;
    await supabase.from(TABLE).update({ email_status: definitiveRejection ? 'Failed' : 'Unknown',
      error_details: `Brevo response ${response.status}; ${definitiveRejection ? 'request rejected' : 'delivery unconfirmed'}` }).eq('id', notification.id);
    throw new HttpError(502, definitiveRejection ? 'Referral remains confirmed. Email was rejected; you can retry.' : 'Email delivery is unconfirmed. Check Brevo before resending.');
  }
  // Do not mark a provider-accepted email as Failed if saving its receipt fails.
  const updated = await supabase.from(TABLE).update({ email_status: 'Sent', provider_message_id: result.messageId,
    sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', notification.id).select('*').single();
  if (updated.error) throw new HttpError(503, 'Brevo accepted the email, but its receipt could not be saved. Check Brevo before resending.');
  return updated.data;
}
module.exports = { templateFor, fingerprint, context, previewCompanyEmail, sendCompanyEmail };
