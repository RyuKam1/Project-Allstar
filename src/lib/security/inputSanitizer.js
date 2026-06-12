const MAX_TEXT_LEN = 2000;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sanitizeText(value, maxLen = MAX_TEXT_LEN) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export function sanitizeQueryTerm(value, maxLen = 80) {
  const cleaned = sanitizeText(value, maxLen);
  return cleaned.replace(/[%_]/g, '');
}

export function sanitizeLikeTerm(value, maxLen = 80) {
  const cleaned = sanitizeText(value, maxLen);
  return cleaned.replace(/[%_\\]/g, '');
}

export function sanitizeEmail(value) {
  return sanitizeText(value, 254).toLowerCase();
}

export function sanitizeUuid(value) {
  const cleaned = sanitizeText(value, 64);
  return UUID_REGEX.test(cleaned) ? cleaned : null;
}

/** Accept http(s) URLs only; bare domains get https:// prepended. */
export function sanitizeHttpUrl(value, maxLen = 500) {
  const cleaned = sanitizeText(value, maxLen);
  if (!cleaned) return '';
  try {
    const candidate = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.toString().slice(0, maxLen);
  } catch {
    return '';
  }
}
