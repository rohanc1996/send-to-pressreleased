import './purify.min.js';
// Cross-platform Soft-Dark Mode Reader view script
function displayReaderMode(data) {
  // Check if our reader already exists to prevent duplicate injections on quick taps
  if (document.getElementById('pressreleased-root')) return;
  
  // Clean up any stale error popups if the user tries to load a page reader layout
  const oldToast = document.getElementById('pressreleased-toast-root');
  if (oldToast) oldToast.remove();
  
  // 1. Create a pristine parent container host
  const hostRoot = document.createElement('div');
  hostRoot.id = 'pressreleased-root';
  hostRoot.style.cssText = 'position: fixed; top:0; left:0; width:100vw; height:100vh; z-index:2147483647;';
  
  // 2. Attach an isolated Shadow DOM wrapper. 
  // This isolates your text and keeps host page CSS from breaking mobile formatting.
  const shadow = hostRoot.attachShadow({ mode: 'closed' });

  const readerView = document.createElement('div');
  readerView.style.cssText = `
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    background-color: #2e3440;
    color: #d8dee9;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Georgia, serif;
    line-height: 1.6;
    padding: 24px 16px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch; /* buttery smooth scrolling on mobile webkit engines */
    box-sizing: border-box;
  `;

  const container = document.createElement('div');
  container.style.cssText = "max-width: 680px; margin: 0 auto; padding-bottom: 60px;";

  // Mobile-friendly Close/Exit Button so mobile users aren't locked in
  const closeBtn = document.createElement('button');
  closeBtn.textContent = "✕ Close Reader";
  closeBtn.style.cssText = `
    float: right; background: #3b4252; color: #eceff4; border: none;
    padding: 8px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;
    cursor: pointer; font-family: sans-serif; margin-bottom: 20px;
  `;
  closeBtn.onclick = () => hostRoot.remove();
  container.appendChild(closeBtn);

  // Clear float layout wrapper
  const clearFix = document.createElement('div');
  clearFix.style.clear = 'both';
  container.appendChild(clearFix);

  if (data.siteName) {
    const meta = document.createElement('div');
    meta.style.cssText = "font-family: sans-serif; font-size: 0.85rem; color: #4c566a; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; font-weight: 600;";
    meta.textContent = data.siteName;
    container.appendChild(meta);
  }

  const h1 = document.createElement('h1');
  h1.style.cssText = "font-size: 2.2rem; line-height: 1.25; margin-top: 0; margin-bottom: 15px; color: #eceff4; font-weight: 700;";
  h1.textContent = data.title || 'Untitled Article';
  container.appendChild(h1);

  const byline = document.createElement('div');
  byline.style.cssText = "font-family: sans-serif; font-style: italic; color: #9cafc2; margin-bottom: 25px; border-bottom: 1px solid #3b4252; padding-bottom: 15px; font-size: 0.95rem;";
  byline.textContent = data.byline ? `By ${data.byline}` : 'Reader View';
  container.appendChild(byline);

  if (data.excerpt) {
    const excerpt = document.createElement('div');
    excerpt.style.cssText = "font-size: 1.15rem; color: #a3be8c; font-style: italic; margin-bottom: 25px; line-height: 1.5;";
    excerpt.textContent = data.excerpt;
    container.appendChild(excerpt);
  }

  // The HTML string in data.content has already been completely sanitized by DOMPurify in the background script context
  const contentBody = document.createElement('div');
  const parser = new DOMParser();
  const parsedDoc = parser.parseFromString(data.content, 'text/html');
  const parsedBody = parsedDoc.body || parsedDoc.documentElement;
  
  while (parsedBody.firstChild) {
    contentBody.appendChild(document.adoptNode(parsedBody.firstChild));
  }
  container.appendChild(contentBody);

  // Apply localized shadow styling safely
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    p { font-size: 1.15rem; margin-top: 0; margin-bottom: 1.6rem; color: #d8dee9; word-wrap: break-word; }
    h2, h3 { color: #e5e9f0; margin-top: 2.2rem; margin-bottom: 1rem; font-size: 1.5rem; line-height: 1.3; }
    a { color: #88c0d0; text-decoration: none; border-bottom: 1px dashed #88c0d0; }
    img { max-width: 100%; height: auto; border-radius: 6px; opacity: 0.8; display: block; margin: 1.5rem auto; }
  `;
  shadow.appendChild(styleTag);

  readerView.appendChild(container);
  shadow.appendChild(readerView);
  document.body.appendChild(hostRoot);
}

// Injects a temporary error toast alert cleanly over mobile and desktop frames inside an isolated Shadow DOM
function displayToastAlert(message) {
  // Prevent duplicate toast windows from building up if a user spams clicks
  if (document.getElementById('pressreleased-toast-root')) return;

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

// Global Extension Toolbar Execution Click Listener
browser.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.url || tab.url.startsWith('about:') || tab.url.startsWith('chrome:')) return;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
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

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (data && data.content) {
      // Sanitize the untrusted HTML payload in the secure background context before injection
      data.content = DOMPurify.sanitize(data.content);

      // Execute the reader mode layout builder with the completely safe data payload
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: displayReaderMode,
        args: [data]
      });
    } else {
      throw new Error("Missing content payload");
    }

  } catch (err) {
    clearTimeout(timeoutId);
    let alertMessage = "Encountered an error. PressReleased was not able to retrieve any text for you, sorry.";
    
    if (err.name === 'AbortError') {
      alertMessage = "The PressReleased queue is too long at the moment, so please try again later.";
    }

    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: displayToastAlert,
      args: [alertMessage]
    });
  }
});