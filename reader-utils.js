export const DEFAULT_SETTINGS = {
  theme: 'system',
  textSize: 'medium',
  wideLayout: false
};

export const TEXT_SIZES = {
  small: '0.92',
  medium: '1',
  large: '1.16',
  xlarge: '1.32'
};

export function normalizeSettings(settings = {}) {
  return {
    theme: ['system', 'light', 'dark'].includes(settings.theme) ? settings.theme : DEFAULT_SETTINGS.theme,
    textSize: Object.hasOwn(TEXT_SIZES, settings.textSize) ? settings.textSize : DEFAULT_SETTINGS.textSize,
    wideLayout: settings.wideLayout === true
  };
}

export function nextTextSize(currentSize) {
  const sizes = Object.keys(TEXT_SIZES);
  const index = sizes.indexOf(currentSize);
  return sizes[(index + 1) % sizes.length];
}

export function isSensitiveUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.toLowerCase();
    const privateHost = hostname === 'localhost'
      || hostname === '::1'
      || /^127\./.test(hostname)
      || /^10\./.test(hostname)
      || /^192\.168\./.test(hostname)
      || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
    const tokenParameter = /(token|auth|secret|key|password|session|jwt|access)/i;
    return url.protocol === 'file:' || privateHost || Boolean(url.username || url.password)
      || [...url.searchParams.keys()].some((key) => tokenParameter.test(key));
  } catch {
    return true;
  }
}

export function getErrorMessage(error) {
  if (error?.name === 'AbortError') {
    return 'PressReleased timed out while retrieving this article. Please try again.';
  }
  if (error?.status === 429) {
    return 'PressReleased is rate-limiting requests right now. Please wait and try again.';
  }
  if (error?.status === 400 || error?.status === 404) {
    return 'This page is unsupported or could not be converted to reader view.';
  }
  if (error?.name === 'TypeError') {
    return 'PressReleased could not connect to its reader service. Check your connection and try again.';
  }
  return 'PressReleased could not retrieve readable text from this page.';
}

export function sanitizeArticle(html, purify) {
  if (!purify || typeof purify.sanitize !== 'function') {
    throw new TypeError('A sanitizer is required for article content');
  }
  return purify.sanitize(html);
}
