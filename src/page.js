// Page-world script for monaco-vim-keys.
// Runs in the page's MAIN world (injected via a <script> tag by content.js)
// so it can reach the real window.monaco instance the site loads.
// This file is intentionally site-agnostic: it knows nothing about which
// site it runs on — enablement arrives via settings messages.
//
// Responsibilities:
//  - wait for window.monaco, then discover editors (hook monaco.editor.create
//    plus a periodic getEditors() scan as a SPA-safe fallback)
//  - attach monaco-vim exactly once per editor, dispose it with the editor
//  - apply/remove relative line numbers
//  - render a floating NORMAL/INSERT/VISUAL status indicator per editor
//  - receive settings from the content script via window.postMessage

import { initVimMode } from 'monaco-vim';

const MSG_SOURCE = 'monaco-vim-keys'; // content script -> page
const PAGE_SOURCE = 'monaco-vim-keys-page'; // page -> content script

const settings = {
  siteEnabled: true,
  vimEnabled: true,
  relativeLineNumbers: false,
};

// Editors we already manage (dedup) and their per-editor state.
const managed = new WeakSet();
const editorState = new Map(); // editor -> { vimMode, statusEl, disposeSub }

function vimActive() {
  return settings.siteEnabled && settings.vimEnabled;
}

function createStatusElement(editor) {
  const el = document.createElement('div');
  el.className = 'monaco-vim-keys-status';
  Object.assign(el.style, {
    position: 'absolute',
    bottom: '24px',
    right: '16px',
    zIndex: '60',
    padding: '2px 8px',
    font: '11px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    color: '#a0a0a0',
    background: '#151515',
    border: '1px solid #333',
    borderRadius: '4px',
    pointerEvents: 'none',
    opacity: '0.9',
    whiteSpace: 'pre',
  });

  const domNode = editor.getDomNode();
  const host = domNode && domNode.parentElement;
  if (host) {
    if (getComputedStyle(host).position === 'static') {
      host.style.position = 'relative';
    }
    host.appendChild(el);
  } else {
    document.body.appendChild(el);
  }
  return el;
}

function enableVim(editor) {
  const st = editorState.get(editor);
  if (!st || st.vimMode) return;
  st.vimMode = initVimMode(editor, st.statusEl);
}

function disableVim(editor) {
  const st = editorState.get(editor);
  if (!st || !st.vimMode) return;
  st.vimMode.dispose();
  st.vimMode = null;
  st.statusEl.textContent = '';
}

function applyLineNumbers(editor) {
  editor.updateOptions({
    lineNumbers: settings.relativeLineNumbers ? 'relative' : 'on',
  });
}

function detach(editor) {
  const st = editorState.get(editor);
  if (!st) return;
  if (st.vimMode) {
    try {
      st.vimMode.dispose();
    } catch (e) {
      /* editor may already be half-torn-down */
    }
  }
  st.disposeSub.dispose();
  st.statusEl.remove();
  editorState.delete(editor);
  managed.delete(editor);
}

function attach(editor) {
  if (!editor || managed.has(editor)) return;
  managed.add(editor);

  const statusEl = createStatusElement(editor);
  const disposeSub = editor.onDidDispose(() => detach(editor));
  editorState.set(editor, { vimMode: null, statusEl, disposeSub });

  if (vimActive()) enableVim(editor);
  applyLineNumbers(editor);
}

function forEachEditor(fn) {
  const monaco = window.monaco;
  if (!monaco || !monaco.editor) return;
  if (typeof monaco.editor.getEditors === 'function') {
    monaco.editor.getEditors().forEach(fn);
  }
}

// Wrap monaco.editor.create so editors created later (SPA route changes,
// language/framework switches) are picked up immediately.
function hookCreate() {
  const editorNs = window.monaco.editor;
  if (editorNs.__monacoVimKeysHooked) return;
  const original = editorNs.create.bind(editorNs);
  editorNs.create = function (domElement, options, override) {
    const editor = original(domElement, options, override);
    attach(editor);
    return editor;
  };
  editorNs.__monacoVimKeysHooked = true;
}

function startScanning() {
  // Fallback scan covers editors created before we hooked in or by paths
  // that bypass monaco.editor.create wrapping.
  setInterval(() => {
    try {
      forEachEditor(attach);
    } catch (e) {
      /* never let the scanner die */
    }
  }, 1000);
}

function applySettings(next) {
  const wasActive = vimActive();
  const prevRelative = settings.relativeLineNumbers;
  Object.assign(settings, next || {});

  if (wasActive !== vimActive()) {
    forEachEditor((editor) => {
      if (!managed.has(editor)) return;
      if (vimActive()) enableVim(editor);
      else disableVim(editor);
    });
  }
  if (prevRelative !== settings.relativeLineNumbers) {
    forEachEditor((editor) => {
      if (managed.has(editor)) applyLineNumbers(editor);
    });
  }
}

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== MSG_SOURCE) return;
  if (data.type === 'settings') applySettings(data.settings);
});

function init() {
  hookCreate();
  startScanning();
  forEachEditor(attach);
  // Ask the content script for the persisted settings.
  window.postMessage({ source: PAGE_SOURCE, type: 'getSettings' }, '*');
}

// Wait for the page's own Monaco to appear.
const monacoWait = setInterval(() => {
  if (window.monaco && window.monaco.editor) {
    clearInterval(monacoWait);
    init();
  }
}, 250);
