const MAX_TEXT_LEN = 2000;

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

export function sanitizeEmail(value) {
  return sanitizeText(value, 254).toLowerCase();
}
