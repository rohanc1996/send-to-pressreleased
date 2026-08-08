import './purify.min.js';
import { DEFAULT_SETTINGS, TEXT_SIZES, getErrorMessage, isSensitiveUrl, nextTextSize, normalizeSettings, sanitizeArticle } from './reader-utils.js';

const BUILD_ID = 'local-2026-08-08-reader';
const activeRequests = new Set();
// Cross-platform Soft-Dark Mode Reader view script
function displayReaderMode(data, storedSettings, readerStyles, buildId) {
  // Check if our reader already exists to prevent duplicate injections on quick taps
  if (document.getElementById('pressreleased-root')) return;
  
  // Clean up any stale error popups if the user tries to load a page reader layout
  const oldToast = document.getElementById('pressreleased-toast-root');
  if (oldToast) oldToast.remove();
  const oldLoading = document.getElementById('pressreleased-loading-root');
  if (oldLoading) oldLoading.remove();
  
  // 1. Create a pristine parent container host
  const hostRoot = document.createElement('div');
  hostRoot.id = 'pressreleased-root';
  hostRoot.style.cssText = 'position: fixed; top:0; left:0; width:100vw; height:100vh; z-index:2147483647;';
  const previousFocus = document.activeElement;
  
  // 2. Attach an isolated Shadow DOM wrapper. 
  // This isolates your text and keeps host page CSS from breaking mobile formatting.
  const shadow = hostRoot.attachShadow({ mode: 'closed' });

  const readerView = document.createElement('div');
  readerView.setAttribute('role', 'dialog');
  readerView.setAttribute('aria-modal', 'true');
  readerView.setAttribute('aria-label', 'PressReleased reader');
  readerView.className = 'pressreleased-reader';
  const textScales = { small: '0.92', medium: '1', large: '1.16', xlarge: '1.32' };
  const textSizes = Object.keys(textScales);
  const settings = storedSettings;
  const systemLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const activeTheme = settings.theme === 'system' ? (systemLight ? 'light' : 'dark') : settings.theme;
  readerView.dataset.theme = activeTheme;
  readerView.style.setProperty('--reader-text-scale', textScales[settings.textSize]);

  const container = document.createElement('div');
  container.className = 'pressreleased-container';
  if (settings.wideLayout) container.classList.add('is-wide');

  const toolbar = document.createElement('div');
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Reader settings');
  toolbar.className = 'pressreleased-toolbar';

  const settingsGroup = document.createElement('div');
  settingsGroup.className = 'pressreleased-settings';
  toolbar.appendChild(settingsGroup);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = "Close reader";
  closeBtn.setAttribute('aria-label', 'Close reader');
  closeBtn.className = 'pressreleased-button pressreleased-close';
  closeBtn.onclick = () => {
    hostRoot.remove();
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
  };
  const themeBtn = document.createElement('button');
  themeBtn.type = 'button';
  themeBtn.textContent = 'Light theme';
  themeBtn.setAttribute('aria-pressed', settings.theme !== 'system' ? 'true' : 'false');
  themeBtn.className = 'pressreleased-button';
  settingsGroup.appendChild(themeBtn);

  const fontBtn = document.createElement('button');
  fontBtn.type = 'button';
  fontBtn.textContent = `Text: ${settings.textSize}`;
  fontBtn.setAttribute('aria-pressed', settings.textSize !== 'medium' ? 'true' : 'false');
  fontBtn.className = 'pressreleased-button';
  settingsGroup.appendChild(fontBtn);

  const widthBtn = document.createElement('button');
  widthBtn.type = 'button';
  widthBtn.textContent = settings.wideLayout ? 'Narrow layout' : 'Wide layout';
  widthBtn.setAttribute('aria-pressed', settings.wideLayout ? 'true' : 'false');
  widthBtn.className = 'pressreleased-button';
  settingsGroup.appendChild(widthBtn);
  toolbar.appendChild(closeBtn);
  container.appendChild(toolbar);

  const applyReaderSettings = () => {
    const lightTheme = readerView.dataset.theme === 'light';
    readerView.style.setProperty('--reader-text-scale', textScales[settings.textSize]);
    themeBtn.textContent = settings.theme === 'system' ? 'System theme' : (lightTheme ? 'Dark theme' : 'Light theme');
    themeBtn.setAttribute('aria-pressed', settings.theme !== 'system' ? 'true' : 'false');
    fontBtn.textContent = `Text: ${settings.textSize}`;
    fontBtn.setAttribute('aria-pressed', settings.textSize !== 'medium' ? 'true' : 'false');
    widthBtn.textContent = settings.wideLayout ? 'Narrow layout' : 'Wide layout';
    widthBtn.setAttribute('aria-pressed', settings.wideLayout ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('pressreleased-save-settings', { detail: JSON.stringify(settings) }));
  };

  themeBtn.onclick = () => {
    settings.theme = settings.theme === 'dark' ? 'light' : settings.theme === 'light' ? 'system' : 'dark';
    readerView.dataset.theme = settings.theme === 'system' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : settings.theme;
    applyReaderSettings();
  };
  fontBtn.onclick = () => {
    settings.textSize = textSizes[(textSizes.indexOf(settings.textSize) + 1) % textSizes.length];
    applyReaderSettings();
  };
  widthBtn.onclick = () => {
    settings.wideLayout = !settings.wideLayout;
    container.classList.toggle('is-wide', settings.wideLayout);
    applyReaderSettings();
  };

  if (data.siteName) {
    const meta = document.createElement('div');
    meta.className = 'pressreleased-meta';
    meta.textContent = data.siteName;
    container.appendChild(meta);
  }

  const h1 = document.createElement('h1');
  h1.id = 'pressreleased-title';
  h1.className = 'pressreleased-title';
  h1.textContent = data.title || 'Untitled Article';
  container.appendChild(h1);

  const byline = document.createElement('div');
  byline.className = 'pressreleased-byline';
  byline.textContent = data.byline ? `By ${data.byline}` : 'Reader View';
  container.appendChild(byline);

  if (data.excerpt) {
    const excerpt = document.createElement('div');
    excerpt.className = 'pressreleased-excerpt';
    excerpt.textContent = data.excerpt;
    container.appendChild(excerpt);
  }

  // The HTML string in data.content has already been completely sanitized by DOMPurify in the background script context
  const contentBody = document.createElement('div');
  contentBody.setAttribute('role', 'document');
  contentBody.setAttribute('aria-label', 'Article content');
  const parser = new DOMParser();
  const parsedDoc = parser.parseFromString(data.content, 'text/html');
  const parsedBody = parsedDoc.body || parsedDoc.documentElement;
  
  while (parsedBody.firstChild) {
    contentBody.appendChild(document.adoptNode(parsedBody.firstChild));
  }
  const article = document.createElement('article');
  article.className = 'pressreleased-article';
  article.setAttribute('aria-labelledby', 'pressreleased-title');
  article.appendChild(contentBody);
  container.appendChild(article);

  // Apply localized shadow styling safely
  const styleTag = document.createElement('style');
  styleTag.textContent = readerStyles;
  shadow.appendChild(styleTag);

  readerView.appendChild(container);
  shadow.appendChild(readerView);
  document.body.appendChild(hostRoot);
  applyReaderSettings();
  const buildLabel = document.createElement('div');
  buildLabel.textContent = buildId;
  buildLabel.style.cssText = 'position: fixed; right: 8px; bottom: 6px; color: var(--reader-subtle); font: 0.65rem monospace; opacity: 0.7;';
  readerView.appendChild(buildLabel);
  closeBtn.focus();
  readerView.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeBtn.click();
  });
}

function displayLoadingState() {
  if (document.getElementById('pressreleased-loading-root')) return;
  const host = document.createElement('div');
  host.id = 'pressreleased-loading-root';
  host.style.cssText = 'position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center; background: rgba(46, 52, 64, 0.92);';
  const shadow = host.attachShadow({ mode: 'closed' });
  const message = document.createElement('div');
  message.className = 'pressreleased-loading';
  message.setAttribute('role', 'status');
  message.setAttribute('aria-live', 'polite');
  message.textContent = 'Loading reader view…';
  shadow.appendChild(message);
  document.body.appendChild(host);
}

// Injects a temporary error toast alert cleanly over mobile and desktop frames inside an isolated Shadow DOM
function displayToastAlert(message) {
  // Prevent duplicate toast windows from building up if a user spams clicks
  if (document.getElementById('pressreleased-toast-root')) return;
  const loading = document.getElementById('pressreleased-loading-root');
  if (loading) loading.remove();

  // 1. Create the top-level host container on the page
  const toastHost = document.createElement('div');
  toastHost.id = 'pressreleased-toast-root';
  toastHost.style.cssText = 'position: fixed; bottom: 24px; left: 24px; right: 24px; max-width: 340px; margin: 0 auto; z-index: 2147483647;';
  
  // Responsive check for desktop PC layout placement
  if (window.innerWidth > 600) {
    toastHost.style.left = 'auto';
  }

  // 2. Attach our isolated Shadow DOM layer
  const shadow = toastHost.attachShadow({ mode: 'closed' });

  // 3. Build the visual toast alert layout inside the shadow barrier
  const toast = document.createElement('div');
  toast.style.cssText = `
    background-color: #bf616a; 
    color: #eceff4;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 0.95rem; 
    font-weight: 500; 
    padding: 16px 20px; 
    border-radius: 8px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.4); 
    line-height: 1.4; 
    text-align: center;
    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease;
    transform: translateY(30px); 
    opacity: 0;
  `;
  toast.textContent = message;

  shadow.appendChild(toast);
  document.body.appendChild(toastHost);

  // Smooth slide up & fade in animations inside the shadow root frame
  requestAnimationFrame(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  });

  // Self-destruct sequences: clean fade out, then drop entire host component node tree safely
  setTimeout(() => {
    toast.style.transform = 'translateY(30px)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

function confirmSensitiveUrl(url) {
  return window.confirm(`This URL may contain private or sensitive information:\n\n${url}\n\nSend it to PressReleased?`);
}

// Global Extension Toolbar Execution Click Listener
browser.action.onClicked.addListener(async (tab) => {
  if (!tab?.id || !tab.url) return;
  if (activeRequests.has(tab.id)) return;
  if (tab.url.startsWith('about:') || tab.url.startsWith('chrome:')) {
    await browser.scripting.executeScript({ target: { tabId: tab.id }, func: displayToastAlert, args: ['This page cannot be opened in reader view.'] });
    return;
  }

  if (isSensitiveUrl(tab.url)) {
    const confirmation = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: confirmSensitiveUrl,
      args: [tab.url]
    });
    if (!confirmation[0]?.result) return;
  }

  activeRequests.add(tab.id);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    await browser.scripting.executeScript({ target: { tabId: tab.id }, func: displayLoadingState });
    const [storedSettings, readerStyles] = await Promise.all([
      browser.storage.local.get(DEFAULT_SETTINGS).then(normalizeSettings),
      fetch(browser.runtime.getURL('reader.css')).then((response) => {
        if (!response.ok) throw new Error(`Stylesheet HTTP ${response.status}`);
        return response.text();
      })
    ]);
    const response = await fetch("https://pressreleased.alwaysdata.net/api/proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ url: tab.url, mode: "reader" }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    const data = await response.json();

    if (data && data.content) {
      // Sanitize the untrusted HTML payload in the secure background context before injection
      data.content = sanitizeArticle(data.content, DOMPurify);

      // Execute the reader mode layout builder with the completely safe data payload
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: displayReaderMode,
        args: [data, storedSettings, readerStyles, BUILD_ID]
      });
    } else {
      throw new Error("Missing content payload");
    }

  } catch (err) {
    clearTimeout(timeoutId);
    await browser.scripting.executeScript({ target: { tabId: tab.id }, func: displayToastAlert, args: [getErrorMessage(err)] });
  } finally {
    activeRequests.delete(tab.id);
    clearTimeout(timeoutId);
  }
});