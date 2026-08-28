# Notes to Reviewer (paste into AMO "Notes to Reviewer")

## What this add-on does

Monaco Vim Keys adds optional vim key bindings and relative line numbers to
the Monaco code editor on a small, fixed list of coding practice sites
(leetgpu.com, leetcode.com, leetcode.cn, hackerrank.com, lintcode.com).
It is essentially the "vim mode" these sites don't offer, in the spirit of
NeetCode's editor settings.

## Architecture (why the permissions look the way they do)

- The only permission requested is `storage` — used to persist user
  settings (global vim toggle, relative line numbers, per-site enable
  flags) in `browser.storage.local`. Nothing is transmitted anywhere.
- Host access is limited to the listed practice sites via the
  `content_scripts` matches in the manifest. The add-on cannot run anywhere
  else.
- Monaco editors live in the page's MAIN JavaScript world, which content
  scripts (isolated world) cannot reach. The content script therefore
  injects `page.js` via a `<script src=moz-extension://...>` tag; that is
  why `page.js` is declared in `web_accessible_resources`, scoped to the
  same site list. Settings are bridged between the two worlds with
  `window.postMessage`.
- `page.js` attaches the vim engine to editors discovered through the
  site's own `window.monaco` (wrapping `monaco.editor.create` plus a
  periodic `monaco.editor.getEditors()` scan), and renders a small
  NORMAL/INSERT/VISUAL indicator element.

## Bundled code / no remote code

- `dist/page.js` is an esbuild bundle that inlines the MIT-licensed npm
  package `monaco-vim` (https://github.com/brijeshb42/monaco-vim). Its
  `monaco-editor` import is aliased to a shim (`src/monaco-shim.cjs`) that
  lazily forwards to the page-global `window.monaco`, so the add-on does
  NOT ship a second copy of Monaco and does NOT load any remote code.
- Monaco Editor itself is loaded by the websites (e.g. from jsDelivr), by
  their own code, independent of this add-on.
- Source code and exact reproducible-build steps are provided in the
  uploaded source zip (see `store/source-submission.md` in the repo:
  `npm ci && npm run build && npm run package`).

## Data collection

None. The manifest declares
`browser_specific_settings.gecko.data_collection_permissions.required = ["none"]`.
Keystrokes and editor text are processed locally by the keybinding engine
only; no analytics, telemetry, or network requests of any kind.

## How to test manually

1. `about:debugging#/runtime/this-firefox` → Load Temporary Add-on →
   select `manifest.json` from the built `dist/` (or the unzipped xpi).
2. Open https://leetgpu.com/challenges/vector-addition (no login needed) or
   https://leetcode.com/problems/two-sum/.
3. A "--NORMAL--" indicator appears at the bottom-right of the code editor.
   Press `i` and type — text is inserted and the indicator shows
   "--INSERT--"; `Esc` returns to NORMAL; `dd` deletes a line.
4. The toolbar popup toggles Vim, relative line numbers, and each site;
   changes apply instantly without reload.

The repository additionally contains an automated real-Firefox e2e
(`npm run test:firefox`, selenium + geckodriver) that performs exactly
these assertions against the live sites.
