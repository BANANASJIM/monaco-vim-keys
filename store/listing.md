# AMO Listing Copy

Copy-paste source for the addons.mozilla.org listing form.

## Name

Monaco Vim Keys

## Summary (≤250 chars)

Vim key bindings and relative line numbers for Monaco-based coding practice
sites (LeetGPU, LeetCode, LeetCode China, HackerRank, LintCode), with
per-site toggles and a floating NORMAL/INSERT/VISUAL mode indicator.

(Character count: ~235)

## Description

Monaco Vim Keys brings NeetCode-style editor settings to the Monaco code
editors on popular coding practice sites. It attaches the mature monaco-vim
keybinding engine to the editor the site already loads — no remote code, no
account, nothing leaves your browser.

Features:

- Full vim key bindings (default ON): NORMAL/INSERT/VISUAL modes, motions
  (hjkl, w/b/e, 0/$, gg/G, counts), operators (d, c, y, x, r), undo/redo,
  o/O/A, / search, and more.
- Relative line numbers (default OFF).
- A subtle floating mode indicator (NORMAL / INSERT / VISUAL) next to the
  editor.
- Per-site enable toggles plus global Vim / relative-line-number toggles in
  the toolbar popup. Settings persist and apply instantly — no page reload.

Supported sites:

- leetgpu.com
- leetcode.com
- leetcode.cn
- www.hackerrank.com
- www.lintcode.com (caveat: older Monaco without getEditors(); vim attaches
  when the editor is created or recreated by the page)

Not supported on purpose: neetcode.io and codingame.com already ship native
vim support; codewars.com, algoexpert.io, codeforces.com, exercism.org and
atcoder.jp do not use the Monaco editor.

Unofficial project — not affiliated with or endorsed by any of the
supported sites. Requests no permission besides "storage"; runs only on the
listed sites.

Source code, build instructions, and issue tracker:
https://github.com/BANANASJIM/monaco-vim-keys

## Category

Web Development (AMO slug: `web-development`). Note: AMO has no
"Developer Tools" category — this is the closest valid one.

## Tags

None. AMO only allows its fixed allowlist of consumer-oriented tags
(vim/monaco/etc. are rejected by the API), so the submission omits tags.

## Version notes (0.1.0)

Initial release:

- Vim key bindings via monaco-vim on leetgpu.com, leetcode.com,
  leetcode.cn, hackerrank.com, and lintcode.com
- Relative line numbers toggle
- Floating NORMAL/INSERT/VISUAL mode indicator
- Per-site enable toggles + global settings, applied live without reload
