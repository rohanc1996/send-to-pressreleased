window.addEventListener('pressreleased-save-settings', (event) => {
  browser.storage.local.set(JSON.parse(event.detail));
});
