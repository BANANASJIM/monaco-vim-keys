# Third-Party Notices

This project bundles and/or builds upon the following open-source software.

## monaco-vim

- <https://github.com/brijeshb42/monaco-vim>
- License: MIT
- Copyright (c) brijeshb42

monaco-vim provides the vim key bindings this extension attaches to Monaco
editors. It is bundled into `dist/page.js` at build time.

The vim implementation inside monaco-vim is derived from CodeMirror's vim
bindings:

- <https://github.com/codemirror/codemirror5> (`keymap/vim.js`)
- License: MIT
- Copyright (c) Marijn Haverbeke and others

## Monaco Editor

- <https://github.com/microsoft/monaco-editor>
- License: MIT
- Copyright (c) Microsoft Corporation

Monaco Editor is **not bundled** with this extension. It is loaded by the
supported websites themselves; the extension attaches to the `window.monaco`
instance the page already provides. The test harness loads
`monaco-editor@0.52.2` from the jsDelivr CDN for local testing only.
