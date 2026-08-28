# AMO Release Checklist

Runbook for submitting Monaco Vim Keys to addons.mozilla.org.

## 1. Pre-flight (local)

```sh
npm ci                 # only if package-lock.json changed
npm run build          # fresh dist/
npm test               # unit (node:test) + Playwright harness suite
npm run lint           # web-ext lint on dist/
npm run test:firefox   # real-Firefox e2e on live leetgpu.com + leetcode.com
```

All must be green before continuing.

## 2. Package

```sh
npm run package          # -> web-ext-artifacts/monaco_vim_keys-<version>.zip
npm run package:source   # -> web-ext-artifacts/monaco-vim-keys-<version>-source.zip
npx web-ext lint --source-dir web-ext-artifacts/monaco_vim_keys-<version>.zip
```

The built zip must lint with 0 errors. The source zip is required by AMO
because the extension contains bundled/minified code (esbuild + monaco-vim);
see `store/source-submission.md`.

## 3. AMO account

- Create / sign in to a developer account at
  https://addons.mozilla.org/developers/
- Accept the Developer Agreement and Distribution Agreement (one-time).

## 4. Submit the add-on

1. **Upload**: `monaco_vim_keys-<version>.zip`. Choose "On your own" if
   self-distributed, or "On this site" for AMO listing (recommended).
2. **Source code**: upload `monaco-vim-keys-<version>-source.zip` when
   prompted (minified/bundled code present: monaco-vim via esbuild).
3. **Listing fields**: copy from `store/listing.md` — name, summary,
   description, category (Developer Tools), tags, version notes.
4. **Privacy**: paste `store/privacy.md` content where a privacy policy is
   requested. When asked about data collection: answer "collects no data"
   (the manifest declares `data_collection_permissions: required: ["none"]`).
5. **Screenshots**: upload PNGs from `store/screenshots/` (1280x800).
6. **Notes to Reviewer**: paste `store/review-notes.md`.
7. **License**: MIT.

## 5. After submission

- Watch the review status email / developer hub. Respond to reviewer
  questions promptly (typical questions are pre-answered in review-notes).
- After approval, install from the AMO listing page in a clean Firefox
  profile and verify on a live site:
  1. Open https://leetgpu.com/challenges/vector-addition
  2. NORMAL indicator appears at the bottom-right of the editor
  3. `i` types, `Esc` returns to NORMAL, `dd` deletes a line
  4. Popup toggles apply instantly

## 6. Version bumps

- Bump `version` in `package.json` only (the manifest version is generated
  from it by `build.mjs`).
- Repeat steps 1–4; update the version notes in `store/listing.md`.
