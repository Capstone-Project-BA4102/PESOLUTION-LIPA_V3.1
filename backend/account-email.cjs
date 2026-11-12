const { createHash } = require('node:crypto');

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
}[character]));

function requireEmailConfig(config) {
  if (!config?.brevoApiKey || !config?.brevoSenderEmail || !config?.publicUrl) {
    throw new Error('Account email delivery is not configured.');
  }
}

const portalUrl = config => String(config.publicUrl).replace(/\/$/, '');

function accountTemplate({ name, email, actionLink }) {
  const subject = 'Welcome to PESOLUTION - Thank you for applying with PESO Lipa City';
  const heading = 'Welcome to PESOLUTION';
  const lead = 'Thank you for applying with PESO Lipa City. Your PESOLUTION Applicant Portal account is now active, so you can check your application and referral status online.';
  const button = 'Proceed to PESOLUTION Applicant Portal';
  const steps = `<ol style="line-height:1.9;padding-left:20px;margin:18px 0">
      <li>Open the Applicant Portal and sign in with <strong>${escapeHtml(email)}</strong>.</li>
      <li>For the password, use the initial password printed on the account receipt PESO Lipa City handed you.</li>
      <li>On your first sign-in the portal asks you to create your own private password before it opens your dashboard.</li>
    </ol>
    <p style="font-size:13px;line-height:1.6;color:#64748b">Please keep the printed receipt private — it is the only copy of your initial password. This welcome email contains no password and no expiring link, so it stays useful for as long as you need it.</p>`;
  const text = `Hello ${name},\n\n${lead}\n\nLogin email: ${email}\n\n${button}: ${actionLink}\n\n`
    + `To sign in:\n`
    + `1. Open the Applicant Portal and sign in with ${email}.\n`
    + `2. For the password, use the initial password printed on the account receipt PESO Lipa City handed you.\n`
    + `3. On your first sign-in the portal asks you to create your own private password before it opens your dashboard.\n\n`
    + `Please keep the printed receipt private — it is the only copy of your initial password. This welcome email contains no password and no expiring link, so it stays useful for as long as you need it.\n\n`
    + `This message is intended only for you. If you did not expect it, contact PESO Lipa City.`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#172033"><div style="max-width:640px;margin:0 auto;padding:24px"><div style="background:#c9141b;color:#fff;padding:20px 24px"><strong style="font-size:22px">PESOLUTION</strong><br><span>PESO Lipa City</span></div><div style="background:#fff;padding:28px 24px;border:1px solid #dde3ea"><h1 style="font-size:22px;margin:0 0 18px">${escapeHtml(heading)}</h1><p>Hello ${escapeHtml(name)},</p><p style="line-height:1.65">${escapeHtml(lead)}</p><p style="line-height:1.65"><strong>Login email:</strong> ${escapeHtml(email)}</p>${steps}<p style="margin:24px 0"><a href="${escapeHtml(actionLink)}" style="display:inline-block;background:#c9141b;color:#fff;text-decoration:none;padding:12px 18px;border-radius:4px;font-weight:bold">${escapeHtml(button)}</a></p><p style="font-size:13px;line-height:1.6;color:#64748b">This message is intended only for you. If you did not expect it, contact PESO Lipa City.</p></div></div></body></html>`;
  return { subject, text, html };
}

/**
 * The applicant welcome email. It carries no token: the credential lives on the printed
 * walk-in account receipt, so the message only points at the portal.
 */
async function sendAccountEmail(account, config) {
  requireEmailConfig(config);
  const email = String(account.email || '').trim().toLowerCase();
  const name = String(account.name || 'Applicant').trim();
  const actionLink = portalUrl(config);
  const template = accountTemplate({ name, email, actionLink });
  const idempotencyKey = createHash('sha256')
    .update(`welcome:${account.id || email}:${Date.now()}`)
    .digest('hex')
    .slice(0, 32);
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json', 'api-key': config.brevoApiKey },
    body: JSON.stringify({
      sender: { email: config.brevoSenderEmail, name: config.brevoSenderName },
      to: [{ email, name }],
      subject: template.subject,
      htmlContent: template.html,
      textContent: template.text,
      tags: ['applicant-welcome'],
      headers: { idempotencyKey },
    }),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.messageId) {
    throw new Error(result.message || `Brevo rejected the request (${response.status}).`);
  }
  return { status: 'Sent', providerMessageId: result.messageId };
}

module.exports = { accountTemplate, sendAccountEmail };
