import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeText, sanitizeQueryTerm, sanitizeEmail } from '../../src/lib/security/inputSanitizer.js';

test('sanitizeText strips control chars and trims', () => {
  const result = sanitizeText('  hello\u0000\nworld  ');
  assert.equal(result, 'hello world');
});

test('sanitizeQueryTerm removes wildcard characters', () => {
  const result = sanitizeQueryTerm('%admin_user%');
  assert.equal(result, 'adminuser');
});

test('sanitizeEmail lowercases and trims', () => {
  const result = sanitizeEmail('  OWNER@EXAMPLE.COM ');
  assert.equal(result, 'owner@example.com');
});
