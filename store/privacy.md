# Privacy Policy — Monaco Vim Keys

Monaco Vim Keys is designed to do its job entirely on your machine.

## What the extension accesses

- **Storage permission** (`storage`): used solely for your settings — the
  global Vim toggle, the relative-line-numbers toggle, and per-site enable
  flags. Settings are stored locally in `browser.storage.local` and never
  leave your browser.
- **Host access**: the extension's content script runs only on the
  supported practice sites (leetgpu.com, leetcode.com, leetcode.cn,
  hackerrank.com, lintcode.com). It has no access to any other website.

## What the extension processes

To provide vim key bindings, the extension's keybinding engine
(monaco-vim) processes your keystrokes and the editor's text content
**locally, in the page**, exactly like the site's own editor code does.
This text is never read by us, never transmitted, and never persisted
beyond the site's own editor behavior.

## What the extension collects

Nothing. No analytics, no telemetry, no tracking, no remote code, no
network requests of its own. The extension ships fully self-contained; the
Monaco editor itself is loaded by the websites, not by this extension.

## Contact

Issues: https://github.com/BANANASJIM/monaco-vim-keys/issues
