# Monaco Vim Keys

Vim key bindings and relative line numbers for Monaco-based coding practice
sites. A Firefox extension (MV3) powered by
[monaco-vim](https://github.com/brijeshb42/monaco-vim).

Features:

- **Vim key bindings** (default ON) — NORMAL/INSERT/VISUAL, motions,
  operators, `/` search, undo/redo, counts, the works.
- **Relative line numbers** (default OFF).
- A subtle floating **mode indicator** near the editor.
- **Per-site enable toggles** plus global Vim / relative-line-number toggles
  in the toolbar popup. Settings persist and apply instantly, no reload.

> **Unofficial**: not affiliated with or endorsed by any supported site.
> Requests no permission besides `storage`; runs only on the sites below.

## Supported sites

Verified = a headless runtime probe (`npm run probe`, evidence in
`tools/probe-results.json`) confirmed `window.monaco` plus a mounted
`.monaco-editor` element, and the site ships in the manifest matches.

| Site | Status | Notes |
| --- | --- | --- |
| leetgpu.com | verified | Monaco 0.52.2 via CDN; real-Firefox e2e passes |
| leetcode.com | verified | `window.monaco` global, no login needed; real-Firefox e2e passes |
| leetcode.cn | verified | same infra as leetcode.com |
| www.hackerrank.com | verified | editor mounts on challenge pages |
| www.lintcode.com | verified (caveat) | `monaco.editor.getEditors()` is missing (older Monaco), so attachment relies on the `monaco.editor.create` hook; a pre-existing editor may only pick vim up after the SPA recreates it |
| app.codesignal.com | unverified — excluded | probe hits a login wall; not in manifest matches until manually verified |

**Deliberately excluded:**

- `neetcode.io`, `codingame.com` — Monaco-based but ship **native vim
  support**; this extension would double-handle keys.
- `codewars.com`, `algoexpert.io`, `codeforces.com`, `exercism.org`,
  `atcoder.jp` — not Monaco (CodeMirror / Ace).

## Install (from source)

```sh
npm ci
npm run build
```

Then in Firefox: `about:debugging#/runtime/this-firefox` →
**Load Temporary Add-on...** → select `dist/manifest.json`.

Or run it in a dedicated profile with auto-reload:

```sh
npx web-ext run --source-dir dist
```

## How it works

- `src/sites.js` — site registry (id, name, hosts, default enabled, verified
  flag). `build.mjs` generates the manifest's matches from it; the popup
  lists the same set.
- `src/settings.js` — pure settings resolution. Storage schema:
  `{ vimEnabled, relativeLineNumbers, sites: { "<site id>": { enabled } } }`.
- `src/content.js` — content script: resolves settings for the current
  hostname, injects the page bundle only when the site is enabled, bridges
  settings over `window.postMessage` (live `storage.onChanged` updates;
  disabling a site disposes vim on the live page).
- `src/page.js` — site-agnostic page-world bundle: waits for
  `window.monaco`, hooks `monaco.editor.create` plus a periodic
  `getEditors()` scan (SPA-safe), attaches vim exactly once per editor,
  disposes it with the editor, renders the mode indicator.
- `src/monaco-shim.cjs` — build-time alias so monaco-vim uses the page's own
  Monaco instead of a bundled copy. No remote code in the extension.

## Adding a new site

1. Add an entry to `SITES` in `src/sites.js` with `verified: false`.
2. Add a probe target in `tools/probe.mjs`, run `npm run probe`.
3. If the probe shows `window.monaco` + a mounted `.monaco-editor`, set
   `verified: true` — the site joins the manifest matches and the popup.
4. `npm run build`, then smoke-test manually on the site.

## Development

```sh
npm ci
npm run build        # icons + esbuild bundles + generated manifest -> dist/
npm test             # unit tests (node:test) + Playwright suite (Chromium)
npm run test:unit    # registry/settings unit tests only
npm run test:firefox # real-Firefox e2e (selenium + geckodriver, needs Firefox)
npm run lint         # web-ext lint on dist/
npm run probe        # re-run the site probe
```

Test layout:

- `tests/unit/` — registry and settings-resolution unit tests.
- `tests/vim.spec.mjs` — 21 vim-engine tests against a local harness
  (`tests/harness/`, monaco-editor@0.52.2 from jsDelivr): mode transitions,
  motions, editing, visual mode, search, relative line numbers, runtime
  disable, editor re-creation.
- `tests/sites.spec.mjs` — per-site emulation: enabled sites inject and
  attach; unknown/disabled sites don't; runtime site-disable disposes vim.
- `tests/firefox-e2e.mjs` — real-Firefox smoke test on live leetgpu.com
  (required) and leetcode.com (best-effort).

## License

MIT — see [LICENSE](LICENSE). Third-party credits:
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
