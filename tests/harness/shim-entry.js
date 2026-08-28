// Harness shim (test-only): emulates what src/content.js does on a real
// site — resolve settings for a hostname, inject the page bundle only when
// the site is enabled, and forward settings via window.postMessage.
// Bundled to tests/harness/shim.js by build.mjs (not part of the extension).
import { resolveSettings } from '../../src/settings.js';

let injected = false;

window.__shim = {
  // Returns { injected, settings } like a content script would decide.
  emulateSite(hostname, stored = { sites: {} }) {
    const settings = resolveSettings(hostname, stored);
    if (!settings.siteEnabled || injected) {
      return { injected: false, settings };
    }
    injected = true;
    const script = document.createElement('script');
    script.src = '/dist/page.js';
    script.onload = () => {
      window.__shim.sendSettings(settings);
      window.__harnessReady = true;
    };
    document.head.appendChild(script);
    return { injected: true, settings };
  },

  // Simulates the settings postMessage exactly the way content.js sends it.
  sendSettings(settings) {
    window.postMessage(
      { source: 'monaco-vim-keys', type: 'settings', settings },
      '*'
    );
  },
};
