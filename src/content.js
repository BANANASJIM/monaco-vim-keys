// Isolated content script for monaco-vim-keys.
// Reads settings for the current hostname, injects the page-world bundle
// only when this site is enabled, and bridges settings between
// browser.storage.local and the page world via window.postMessage.

import { resolveSettings, applyChanges, DEFAULTS } from './settings.js';

const MSG_SOURCE = 'monaco-vim-keys';
const PAGE_SOURCE = 'monaco-vim-keys-page';

const hostname = location.hostname;
let stored = { sites: {} };
let current = resolveSettings(hostname, stored);
let injected = false;

function postSettings() {
  window.postMessage(
    { source: MSG_SOURCE, type: 'settings', settings: { ...current } },
    '*'
  );
}

function inject() {
  if (injected) return;
  injected = true;
  const script = document.createElement('script');
  script.src = browser.runtime.getURL('page.js');
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
}

function refresh() {
  current = resolveSettings(hostname, stored);
  // The page bundle cannot be un-injected once loaded, so a disabled site is
  // communicated via settings: page.js then disposes vim entirely.
  if (current.siteEnabled) inject();
  postSettings();
}

async function loadSettings() {
  try {
    stored = await browser.storage.local.get({
      vimEnabled: DEFAULTS.vimEnabled,
      relativeLineNumbers: DEFAULTS.relativeLineNumbers,
      sites: {},
    });
  } catch (e) {
    stored = { sites: {} };
  }
  refresh();
}

// Respond to the page world's settings request.
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== PAGE_SOURCE) return;
  if (data.type === 'getSettings') postSettings();
});

// Live-apply changes coming from the popup.
browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  stored = applyChanges(stored, changes);
  refresh();
});

loadSettings();
