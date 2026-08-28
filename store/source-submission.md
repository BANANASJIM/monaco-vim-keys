# Source Code Submission (AMO)

AMO requires build instructions and sources whenever an add-on contains
bundled or minified code. This extension bundles the `monaco-vim` npm
package into `page.js` with esbuild, so a source zip plus these exact steps
are submitted alongside the xpi.

## Environment

- Node.js 24.x (built and verified with v24.19.0; any Node ≥ 20 should work)
- npm 12.x
- Python 3 with Pillow (only used by `tools/make_icons.py` to generate the
  PNG icons; any recent Python 3 + `pip install Pillow` works)
- OS: Linux (any platform with the above works; commands are POSIX)

## Reproduce the build

```sh
git clone https://github.com/BANANASJIM/monaco-vim-keys.git
cd monaco-vim-keys
git checkout v<version>          # or the release commit
npm ci                           # installs exact locked dependencies
npm run build                    # bundles esbuild output into dist/
npm run package                  # -> web-ext-artifacts/monaco_vim_keys-<version>.zip
```

The resulting zip is byte-equivalent in content to the submitted xpi
(same files; zip metadata timestamps may differ).

## What the build does

1. `tools/make_icons.py` renders the extension icons.
2. esbuild bundles:
   - `src/page.js` → `dist/page.js` (IIFE; the npm package `monaco-vim`
     is inlined here; its `monaco-editor` import is aliased to
     `src/monaco-shim.cjs` so it uses the page's own Monaco at runtime)
   - `src/content.js` → `dist/content.js`
   - `popup/popup.js` → `dist/popup/popup.js`
3. `dist/manifest.json` is generated from `src/sites.js` (match patterns)
   and the version in `package.json`.

## Source zip

```sh
npm run package:source   # -> web-ext-artifacts/monaco-vim-keys-<version>-source.zip
```

Contains the full repository source excluding `node_modules/`, `dist/`,
`web-ext-artifacts/`, `.git/`, and test artifacts — everything needed for
the steps above.
