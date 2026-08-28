// Create the AMO source-code submission zip: the repo source needed to
// reproduce the build, excluding generated/vendored directories.
// Output: web-ext-artifacts/monaco-vim-keys-<version>-source.zip
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const outDir = 'web-ext-artifacts';
const out = `${outDir}/monaco-vim-keys-${version}-source.zip`;

mkdirSync(outDir, { recursive: true });

execFileSync(
  'zip',
  [
    '-r',
    out,
    '.',
    '-x',
    'node_modules/*',
    'dist/*',
    'web-ext-artifacts/*',
    '.git/*',
    'test-results/*',
    'playwright-report/*',
    'tests/harness/shim.js',
  ],
  { stdio: 'inherit' }
);

console.log(`source submission zip: ${out}`);
