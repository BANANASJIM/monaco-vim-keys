// Generate store screenshots with Playwright against the local harness.
// Usage: node tools/screenshots.mjs  (run after `npm run build`)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';

const PORT = 8937;
const BASE = `http://127.0.0.1:${PORT}`;

mkdirSync('store/screenshots', { recursive: true });

// Serve the repo root (same static server as the test suite).
const server = spawn('node', ['tests/serve.mjs'], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'pipe',
});
await new Promise((resolve, reject) => {
  server.stdout.on('data', (d) => d.toString().includes('serving') && resolve());
  server.on('error', reject);
  setTimeout(() => reject(new Error('server start timeout')), 10000);
});

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto(`${BASE}/tests/harness/index.html`);
await page.waitForFunction(() => window.__shimLoaded === true);
await page.evaluate(() => window.__shim.emulateSite('leetgpu.com', { sites: {} }));
await page.waitForFunction(() => window.__harnessReady === true);
await page.waitForSelector('.monaco-vim-keys-status');

// Fill the viewport with the editor so shots have no dead space.
await page.addStyleTag({
  content: '#editor-container { left: 0 !important; top: 0 !important; width: 100vw !important; height: 100vh !important; }',
});
await page.waitForTimeout(400);

// Shot 1: NORMAL mode, indicator visible.
await page.evaluate(() => {
  window.editor.focus();
  window.editor.setPosition({ lineNumber: 6, column: 5 });
});
await page.waitForTimeout(300);
await page.screenshot({ path: 'store/screenshots/editor-vim-normal.png' });

// Shot 2: VISUAL LINE selection across a few lines.
await page.keyboard.press('V');
await page.keyboard.press('j');
await page.keyboard.press('j');
await page.waitForTimeout(300);
await page.screenshot({ path: 'store/screenshots/editor-vim-visual.png' });

await browser.close();
server.kill();
console.log('screenshots written to store/screenshots/');
