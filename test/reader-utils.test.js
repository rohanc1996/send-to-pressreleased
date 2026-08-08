import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DEFAULT_SETTINGS, getErrorMessage, isSensitiveUrl, nextTextSize, normalizeSettings, sanitizeArticle } from '../reader-utils.js';

test('normalizes persisted reader settings', () => {
  assert.deepEqual(normalizeSettings({ theme: 'light', textSize: 'xlarge', wideLayout: true }), {
    theme: 'light',
    textSize: 'xlarge',
    wideLayout: true
  });
  assert.deepEqual(normalizeSettings({ theme: 'invalid', textSize: 'invalid' }), DEFAULT_SETTINGS);
});

test('detects sensitive and private URLs', () => {
  assert.equal(isSensitiveUrl('http://localhost:8080/article'), true);
  assert.equal(isSensitiveUrl('http://192.168.1.20/article?token=abc'), true);
  assert.equal(isSensitiveUrl('https://example.com/article'), false);
  assert.equal(isSensitiveUrl('https://user:pass@example.com/article'), true);
});

test('classifies API errors for users', () => {
  assert.match(getErrorMessage(Object.assign(new Error(), { name: 'AbortError' })), /timed out/);
  assert.match(getErrorMessage({ status: 429 }), /rate-limiting/);
  assert.match(getErrorMessage({ status: 404 }), /unsupported/);
});

test('sanitizes article content through the supplied sanitizer', () => {
  let received;
  const sanitized = sanitizeArticle('<script>bad()</script><p>Good</p>', {
    sanitize(value) {
      received = value;
      return '<p>Good</p>';
    }
  });
  assert.equal(received, '<script>bad()</script><p>Good</p>');
  assert.equal(sanitized, '<p>Good</p>');
});

test('cycles through all text-size levels', () => {
  assert.equal(nextTextSize('medium'), 'large');
  assert.equal(nextTextSize('xlarge'), 'small');
});

test('reader rendering exposes accessible controls and rich-content styles', () => {
  const source = fs.readFileSync(new URL('../background.js', import.meta.url), 'utf8');
  const styles = fs.readFileSync(new URL('../reader.css', import.meta.url), 'utf8');
  assert.match(source, /pressreleased-reader/);
  assert.match(source, /pressreleased-save-settings/);
  assert.match(styles, /\.pressreleased-article pre/);
  assert.match(styles, /\.pressreleased-article table/);
  assert.match(styles, /\.pressreleased-close/);
});

test('requires a sanitizer before rendering untrusted content', () => {
  assert.throws(() => sanitizeArticle('<p>Unsafe</p>'), /sanitizer is required/);
});
