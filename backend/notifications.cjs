const { HttpError, check, requireUuid } = require('./domain.cjs');
const { createHash } = require('node:crypto');

const NOTIFIABLE_STATUSES = new Set(['Referred', 'Hired', 'Declined']);
const EMAIL_LOG_MISSING_CODES = new Set(['42P01', 'PGRST204', 'PGRST205']);

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
}[character]));

function optionalEmailLogs(result) {
  if (result.error && EMAIL_LOG_MISSING_CODES.has(result.error.code)) return [];
  return check(result) || [];
}

function templateFor(event, publicUrl) {
  const applicant = event.applicants || {};
  const application = event.applications || {};
  const job = application.job_listings || {};
  const company = job.companies || {};
  const name = String(applicant.full_name || 'Applicant').trim();
  const position = String(job.title || 'your job application').trim();
  const employer = String(company.name || '').trim();
  const status = String(event.status || '').trim();
  if (!NOTIFIABLE_STATUSES.has(status)) throw new HttpError(409, 'This internal status is not available for applicant email notification.');

  const copy = {
    Referred: {
      subject: `PESOLUTION application update: Referred for ${position}`,
      heading: 'Your PESO referral is confirmed',
      message: `Your application for ${position}${employer ? ` at ${employer}` : ''} has been referred. Please review your Applicant Portal for the official referral details.`,
    },
    Hired: {
      subject: `PESOLUTION application update: Hired for ${position}`,
      heading: 'Congratulations on your employment update',
      message: `PESO Lipa City has recorded your application for ${position}${employer ? ` at ${employer}` : ''} as Hired. Please sign in to your Applicant Portal to review the update and complete the feedback process.`,
    },
    Declined: {
      subject: `PESOLUTION application update for ${position}`,
      heading: 'Your application status has been updated',
      message: `Your application for ${position}${employer ? ` at ${employer}` : ''} was not selected for this opportunity. Your PESOLUTION profile remains available for other suitable job matches.`,
    },
  }[status];
  const portalUrl = String(publicUrl || '').replace(/\/$/, '');
  const text = `Hello ${name},\n\n${copy.message}\n\nApplication status: ${status}\nPosition: ${position}${employer ? `\nCompany: ${employer}` : ''}${portalUrl ? `\n\nApplicant Portal: ${portalUrl}` : ''}\n\nThis is an official transactional notice from PESOLUTION / PESO Lipa City. Please do not reply with sensitive personal information.`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#172033"><div style="max-width:640px;margin:0 auto;padding:24px"><div style="background:#c9141b;color:#fff;padding:20px 24px"><strong style="font-size:22px">PESOLUTION</strong><br><span>PESO Lipa City</span></div><div style="background:#fff;padding:28px 24px;border:1px solid #dde3ea"><h1 style="font-size:22px;margin:0 0 18px">${escapeHtml(copy.heading)}</h1><p>Hello ${escapeHtml(name)},</p><p style="line-height:1.65">${escapeHtml(copy.message)}</p><table style="width:100%;border-collapse:collapse;margin:22px 0"><tr><td style="padding:9px;border-bottom:1px solid #e5e7eb;color:#64748b">Status</td><td style="padding:9px;border-bottom:1px solid #e5e7eb;font-weight:bold">${escapeHtml(status)}</td></tr><tr><td style="padding:9px;border-bottom:1px solid #e5e7eb;color:#64748b">Position</td><td style="padding:9px;border-bottom:1px solid #e5e7eb">${escapeHtml(position)}</td></tr>${employer ? `<tr><td style="padding:9px;border-bottom:1px solid #e5e7eb;color:#64748b">Company</td><td style="padding:9px;border-bottom:1px solid #e5e7eb">${escapeHtml(employer)}</td></tr>` : ''}</table>${portalUrl ? `<p><a href="${escapeHtml(portalUrl)}" style="display:inline-block;background:#c9141b;color:#fff;text-decoration:none;padding:12px 18px;border-radius:4px;font-weight:bold">Open Applicant Portal</a></p>` : ''}<p style="margin-top:28px;font-size:13px;color:#64748b">This is an official transactional notice from PESOLUTION / PESO Lipa City. Please do not reply with sensitive personal information.</p></div></div></body></html>`;
  return { applicantName: name, recipientEmail: applicant.email_address, position, company: employer, status, subject: copy.subject, text, html };
}

async function eventContext(supabase, eventId) {
  const id = requireUuid(eventId);
  const event = check(await supabase.from('status_history').select(`
    id, applicant_id, application_id, status, remarks, changed_at,
    applicants(full_name, email_address),
    applications(id, applicant_id, status, job_listings(title, companies(name)))
  `).eq('id', id).maybeSingle());
  if (!event || !event.application_id || !event.applications) throw new HttpError(404, 'A persisted application status event is required.');
  if (event.applicant_id !== event.applications.applicant_id || event.status !== event.applications.status) {
    throw new HttpError(409, 'The application has moved to a newer status. Refresh before sending an email.');
  }
  if (!event.applicants?.email_address) throw new HttpError(409, 'The applicant does not have a recipient email address.');
  return event;
}

async function previewNotification(supabase, eventId, config) {
  const event = await eventContext(supabase, eventId);
  const notificationResult = await supabase.from('application_email_notifications')
    .select('id,email_status,provider_message_id,error_details,sent_at').eq('status_history_id', event.id).maybeSingle();
  const notification = notificationResult.error && EMAIL_LOG_MISSING_CODES.has(notificationResult.error.code)
    ? null : check(notificationResult);
  return { eventId: event.id, ...templateFor(event, config.publicUrl), notification };
}

async function listNotificationEvents(supabase, applicantId) {
  const id = requireUuid(applicantId);
  const events = check(await supabase.from('status_history').select(`
    id, applicant_id, application_id, status, remarks, changed_at,
    applications(id, status, job_listings(title, companies(name)))
  `).eq('applicant_id', id).order('changed_at', { ascending: false })) || [];
  if (!events.length) return [];

  const eventIds = events.map(event => event.id);
  const notifications = optionalEmailLogs(await supabase.from('application_email_notifications')
    .select('id,status_history_id,email_status,provider_message_id,error_details,sent_at,delivered_at,updated_at')
    .in('status_history_id', eventIds));
  const byEvent = new Map(notifications.map(notification => [notification.status_history_id, notification]));

  return events.map(event => ({
    id: event.id,
    applicantId: event.applicant_id,
    applicationId: event.application_id,
    status: event.status,
    remarks: event.remarks,
    changedAt: event.changed_at,
    jobTitle: event.applications?.job_listings?.title || null,
    company: event.applications?.job_listings?.companies?.name || null,
    canEmail: Boolean(event.application_id && NOTIFIABLE_STATUSES.has(event.status) && event.applications?.status === event.status),
    notification: byEvent.get(event.id) || null,
  }));
}

async function listCurrentNotificationEvents(supabase, applicantIds) {
  const ids = [...new Set((Array.isArray(applicantIds) ? applicantIds : []).map(requireUuid))];
  if (!ids.length) return [];
  if (ids.length > 50) throw new HttpError(400, 'A maximum of 50 applicants may be checked at once.');
  const events = check(await supabase.from('status_history').select(`
    id, applicant_id, application_id, status, remarks, changed_at,
    applications(id, status, job_listings(title, companies(name)))
  `).in('applicant_id', ids).in('status', [...NOTIFIABLE_STATUSES]).order('changed_at', { ascending: false })) || [];
  const seenApplicants = new Set();
  const current = events.filter(event => {
    const eligible = event.application_id && event.applications?.status === event.status && !seenApplicants.has(event.applicant_id);
    if (eligible) seenApplicants.add(event.applicant_id);
    return eligible;
  });
  if (!current.length) return [];
  const notifications = optionalEmailLogs(await supabase.from('application_email_notifications')
    .select('id,status_history_id,email_status,provider_message_id,error_details,sent_at,delivered_at,updated_at')
    .in('status_history_id', current.map(event => event.id)));
  const byEvent = new Map(notifications.map(notification => [notification.status_history_id, notification]));
  return current.map(event => ({
    id: event.id, applicantId: event.applicant_id, applicationId: event.application_id,
    status: event.status, remarks: event.remarks, changedAt: event.changed_at,
    jobTitle: event.applications?.job_listings?.title || null,
    company: event.applications?.job_listings?.companies?.name || null,
    canEmail: true, notification: byEvent.get(event.id) || null,
  }));
}

async function sendNotification(supabase, actor, eventId, config) {
  if (!config.brevoApiKey || !config.brevoSenderEmail) throw new HttpError(503, 'Brevo email delivery is not configured.');
  const event = await eventContext(supabase, eventId);
  const template = templateFor(event, config.publicUrl);
  const existingResult = await supabase.from('application_email_notifications').select('*').eq('status_history_id', event.id).maybeSingle();
  if (existingResult.error && EMAIL_LOG_MISSING_CODES.has(existingResult.error.code)) {
    throw new HttpError(503, 'Email notifications are not set up yet. Apply the application email notification migration first.');
  }
  if (existingResult.error) throw new HttpError(503, 'Unable to verify the email notification log.');
  const existing = existingResult.data;
  if (['Queued', 'Sending', 'Sent', 'Delivered'].includes(existing?.email_status)) {
    if (['Sent', 'Delivered'].includes(existing.email_status)) return existing;
    throw new HttpError(409, 'This email is already being processed.');
  }

  const row = { applicant_id: event.applicant_id, application_id: event.application_id, status_history_id: event.id,
    recipient_email: template.recipientEmail, application_status: event.status, subject: template.subject,
    email_status: 'Sending', provider: 'brevo', sent_by: actor.id, error_details: null,
    provider_message_id: null, sent_at: null, delivered_at: null, updated_at: new Date().toISOString() };
  let notification;
  if (existing) {
    notification = check(await supabase.from('application_email_notifications').update(row).eq('id', existing.id)
      .in('email_status', ['Failed', 'Bounced']).select('*').single());
  } else {
    const inserted = await supabase.from('application_email_notifications').insert(row).select('*').single();
    if (inserted.error?.code === '23505') throw new HttpError(409, 'This status email has already been submitted.');
    notification = check(inserted);
  }

  try {
    // A failed delivery must be retryable. Keep the database uniqueness anchored to
    // the saved status event, but use a distinct Brevo key for each persisted attempt.
    const attemptKey = createHash('sha256')
      .update(`${event.id}:${notification.updated_at}`)
      .digest('hex')
      .slice(0, 32);
    const response = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: {
      accept: 'application/json', 'content-type': 'application/json', 'api-key': config.brevoApiKey,
    }, body: JSON.stringify({ sender: { email: config.brevoSenderEmail, name: config.brevoSenderName },
      to: [{ email: template.recipientEmail, name: template.applicantName }], subject: template.subject,
      htmlContent: template.html, textContent: template.text,
      headers: { idempotencyKey: attemptKey } }), signal: AbortSignal.timeout(15000) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.messageId) throw new Error(result.message || `Brevo rejected the request (${response.status}).`);
    return check(await supabase.from('application_email_notifications').update({ email_status: 'Sent', provider_message_id: result.messageId,
      sent_at: new Date().toISOString(), updated_at: new Date().toISOString(), error_details: null }).eq('id', notification.id).select('*').single());
  } catch (error) {
    await supabase.from('application_email_notifications').update({ email_status: 'Failed', error_details: String(error.message || error).slice(0, 2000),
      updated_at: new Date().toISOString() }).eq('id', notification.id);
    throw new HttpError(502, 'The status was saved, but Brevo could not send the email. You can retry it.');
  }
}

module.exports = { NOTIFIABLE_STATUSES, templateFor, listNotificationEvents, listCurrentNotificationEvents, previewNotification, sendNotification };
