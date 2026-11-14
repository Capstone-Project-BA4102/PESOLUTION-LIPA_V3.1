const { HttpError, text } = require('./domain.cjs');

function publicUrl(value, allowLocal = false) {
  const s = text(value);
  if (!s) return '';
  if (allowLocal && /^\/[a-z0-9._/-]+$/i.test(s)) return s;
  try { if (new URL(s).protocol === 'https:') return s; } catch { /* Invalid URLs are rejected below. */ }
  throw new HttpError(400, 'Public links must use HTTPS.');
}

function validateContent(input) {
  if (!input || typeof input !== 'object') throw new HttpError(400, 'Site content is required.');
  const output = {};
  for (const key of ['title', 'tagline', 'description', 'address', 'telephone', 'email', 'officeHours', 'facebookLabel', 'sourceLabel']) {
    output[key] = text(input[key]);
    if (output[key].length > 2000) throw new HttpError(400, `${key} is too long.`);
  }
  if (Object.hasOwn(input, 'referralSignatoryName')) {
    if (typeof input.referralSignatoryName !== 'string' || !input.referralSignatoryName.trim() || input.referralSignatoryName.trim().length > 200 || Array.from(input.referralSignatoryName).some(character => character.charCodeAt(0) < 32)) {
      throw new HttpError(400, 'Enter a valid default referral signatory name (up to 200 characters).');
    }
    output.referralSignatoryName = input.referralSignatoryName.trim();
  }
  if (!output.title || !output.tagline) throw new HttpError(400, 'Title and tagline are required.');
  if (output.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(output.email)) throw new HttpError(400, 'Enter a valid office email.');
  output.facebookUrl = publicUrl(input.facebookUrl);
  output.sourceUrl = publicUrl(input.sourceUrl);
  output.heroImage = publicUrl(input.heroImage, true);
  for (const [key, fields] of Object.entries({ services: ['id', 'title', 'description', 'imageUrl'], announcements: ['id', 'title', 'body', 'publishedAt', 'url'],
    trainingCatalog: ['id', 'skill', 'title', 'provider', 'url'], testimonials: ['id', 'name', 'role', 'quote', 'imageUrl'] })) {
    const list = key === 'testimonials' && input[key] == null ? [] : input[key];
    if (!Array.isArray(list) || list.length > 50) throw new HttpError(400, `Invalid ${key} list.`);
    output[key] = list.map(item => {
      if (!item || typeof item !== 'object') throw new HttpError(400, `Invalid ${key} entry.`);
      const result = {};
      for (const field of fields) {
        result[field] = field === 'url' ? publicUrl(item[field])
          : field === 'imageUrl'
            ? publicUrl(item[field], true)
            : text(item[field]);
      }
      const primaryText = key === 'testimonials' ? result.name : result.title;
      if (!result.id || !primaryText || Object.values(result).some(s => s.length > 3000)) throw new HttpError(400, `Invalid ${key} entry.`);
      if (key === 'trainingCatalog' && (!result.skill || !result.provider || !result.url)) throw new HttpError(400, 'Training entries need a skill, provider, and verified HTTPS link.');
      if (key === 'announcements' && (!result.publishedAt || Number.isNaN(Date.parse(result.publishedAt)))) throw new HttpError(400, 'Announcements need a valid publication date.');
      if (key === 'testimonials') {
        if (item.consentConfirmed !== true) throw new HttpError(400, 'Applicant testimonials require documented publication consent.');
        result.consentConfirmed = true;
      }
      return result;
    });
    if (new Set(output[key].map(item => item.id)).size !== output[key].length) throw new HttpError(400, `Duplicate ${key} IDs.`);
  }
  return output;
}
module.exports = { validateContent, publicUrl };
