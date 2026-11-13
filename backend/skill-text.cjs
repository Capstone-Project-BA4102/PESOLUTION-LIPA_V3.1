const { normalize } = require('./domain.cjs');

// Wording normalization is deliberately limited to soft-skill word hyphens.
// Hard-skill identifiers, plus/hash signs, slashes, periods and case boundaries stay intact.
function competencyKey(value, category) {
  const key = normalize(value);
  return category === 'soft' ? key.replace(/(?<=[a-z]{2})[-\u2010\u2011](?=[a-z]{2})/g, ' ') : key;
}

function components(value) {
  const phrase = value.trim();
  // Quoted labels and malformed grouping are ambiguous: keep the whole phrase.
  if (/["“”]/u.test(phrase)) return [phrase];
  const stack = []; const parts = []; let start = 0;
  const closing = { ')': '(', ']': '[', '}': '{' };
  for (let i = 0; i < phrase.length; i++) {
    const char = phrase[i];
    if ('([{'.includes(char)) stack.push(char);
    else if (Object.hasOwn(closing, char)) {
      if (stack.pop() !== closing[char]) return [phrase];
    } else if (!stack.length && (char === ';' || char === '&' && /\s/u.test(phrase[i - 1] || '') && /\s/u.test(phrase[i + 1] || ''))) {
      parts.push(phrase.slice(start, i).trim()); start = i + 1;
    }
  }
  parts.push(phrase.slice(start).trim());
  return stack.length || parts.some(part => !part) ? [phrase] : [...new Set(parts)];
}

function variants(phrase, required) {
  // A compound requirement stays whole; one component must not satisfy all of it.
  return components(required).length > 1 ? [phrase] : [...new Set([phrase, ...components(phrase)])];
}

function findExact(available, required, category) {
  available = [...available].sort((a, b) => normalize(a) < normalize(b) ? -1 : normalize(a) > normalize(b) ? 1 : 0);
  const key = competencyKey(required, category);
  for (const phrase of available) {
    if (competencyKey(phrase, category) === key) return { phrase, competency: phrase };
  }
  for (const phrase of available) {
    const competency = variants(phrase, required).find(part => competencyKey(part, category) === key);
    if (competency) return { phrase, competency };
  }
  return null;
}

module.exports = { competencyKey, components, variants, findExact };
