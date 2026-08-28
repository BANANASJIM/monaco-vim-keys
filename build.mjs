// Build script: bundle the extension scripts and assemble dist/ as the
// loadable extension directory. The manifest is generated here so the
// content-script match patterns always come from the site registry.
import * as esbuild from 'esbuild';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { manifestMatches } from './src/sites.js';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });

// Generate PNG icons into icons/ (also copied to dist/).
execFileSync('python3', ['tools/make_icons.py'], { stdio: 'inherit' });

const shared = {
  bundle: true,
  format: 'iife',
  target: 'firefox128',
  logLevel: 'warning',
};

// Page-world bundle: monaco-vim aliased to the page's own window.monaco.
await esbuild.build({
  ...shared,
  entryPoints: ['src/page.js'],
  outfile: 'dist/page.js',
  mainFields: ['module', 'main'],
  alias: {
    'monaco-editor': './src/monaco-shim.cjs',
    'monaco-editor/esm/vs/editor/editor.api': './src/monaco-shim.cjs',
  },
});

// Content script + popup (classic scripts; Firefox content_scripts cannot
// use ES modules, so everything gets bundled).
await esbuild.build({
  ...shared,
  entryPoints: ['src/content.js'],
  outfile: 'dist/content.js',
});
await esbuild.build({
  ...shared,
  entryPoints: ['popup/popup.js'],
  outfile: 'dist/popup/popup.js',
});

// Test-only shim that emulates the content script inside the local harness.
await esbuild.build({
  ...shared,
  entryPoints: ['tests/harness/shim-entry.js'],
  outfile: 'tests/harness/shim.js',
});

const matches = manifestMatches();
const manifest = {
  manifest_version: 3,
  name: 'Monaco Vim Keys',
  version: '1.0.0',
  description:
    'Vim key bindings and relative line numbers for Monaco-editor practice sites (leetgpu, leetcode, hackerrank, ...). Unofficial.',
  permissions: ['storage'],
  browser_specific_settings: {
    gecko: {
      id: 'monaco-vim-keys@example.com',
      strict_min_version: '142.0',
      data_collection_permissions: {
        required: ['none'],
      },
    },
  },
  content_scripts: [
    {
      matches,
      js: ['content.js'],
      run_at: 'document_idle',
    },
  ],
  web_accessible_resources: [
    {
      resources: ['page.js'],
      matches,
    },
  ],
  action: {
    default_popup: 'popup/popup.html',
    default_icon: {
      16: 'icons/icon-16.png',
      48: 'icons/icon-48.png',
      96: 'icons/icon-96.png',
    },
  },
  icons: {
    16: 'icons/icon-16.png',
    48: 'icons/icon-48.png',
    96: 'icons/icon-96.png',
  },
};

await writeFile('dist/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
await cp('popup/popup.html', 'dist/popup/popup.html');
await cp('popup/popup.css', 'dist/popup/popup.css');
await cp('icons', 'dist/icons', { recursive: true });

console.log('build complete -> dist/');
console.log('manifest matches:', matches.join(', '));
