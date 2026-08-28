// Real-Firefox end-to-end smoke test (bonus, not part of `npm test`).
// Loads the built extension into headless Firefox as a temporary add-on and
// verifies vim attaches on live sites:
//   - leetgpu.com   (required: failures here fail the suite)
//   - leetcode.com  (best-effort: failures are reported but do not fail)
//
// Usage: node tests/firefox-e2e.mjs
import { Builder, By, until, Key } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DIST = join(process.cwd(), 'dist');
const STATUS = '.monaco-vim-keys-status';

// installAddon expects an .xpi (a zip of the extension directory).
function packXpi() {
  const dir = mkdtempSync(join(tmpdir(), 'monaco-vim-keys-'));
  execFileSync(
    'npx',
    ['web-ext', 'build', '--source-dir', DIST, '--artifacts-dir', dir, '--overwrite-dest'],
    { stdio: 'pipe' }
  );
  const zip = join(dir, readdirSync(dir).find((f) => f.endsWith('.zip')));
  const xpi = join(dir, 'monaco-vim-keys.xpi');
  renameSync(zip, xpi);
  return xpi;
}

async function smokeTestSite(driver, { name, url, line, column, expectedAfterX }) {
  const results = [];
  const check = (label, ok) => results.push([label, ok]);

  await driver.get(url);

  const indicator = await driver.wait(
    until.elementLocated(By.css(STATUS)),
    60000
  );
  await driver.wait(
    async () => (await indicator.getText()).includes('NORMAL'),
    30000
  );
  check('status indicator appears and shows NORMAL', true);

  const before = await driver.executeScript(
    'return window.monaco.editor.getEditors()[0].getValue()'
  );
  await driver.executeScript(
    `const ed = window.monaco.editor.getEditors()[0];
     ed.focus();
     ed.setPosition({ lineNumber: ${line}, column: ${column} });`
  );
  const textarea = await driver.findElement(By.css('.monaco-editor textarea.inputarea'));
  await textarea.sendKeys('x');
  const after = await driver.executeScript(
    'return window.monaco.editor.getEditors()[0].getValue()'
  );
  check("'x' deletes one character (modal editing active)", after.length === before.length - 1);

  await textarea.sendKeys('i');
  await textarea.sendKeys('ZZ');
  await textarea.sendKeys(Key.ESCAPE);
  const inserted = await driver.executeScript(
    'return window.monaco.editor.getEditors()[0].getValue()'
  );
  check("'i' + typing inserts text", inserted.startsWith('ZZ'));
  check('Esc returns to NORMAL', (await indicator.getText()).includes('NORMAL'));

  console.log(`--- ${name} (${url})`);
  for (const [label, ok] of results) console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  return results.every(([, ok]) => ok);
}

const options = new firefox.Options()
  .setBinary('/usr/bin/firefox')
  .addArguments('-headless');

let driver;
let requiredOk = true;

try {
  driver = await new Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .build();

  const addonId = await driver.installAddon(packXpi(), true);
  console.log('temporary add-on installed:', addonId);

  try {
    requiredOk = await smokeTestSite(driver, {
      name: 'LeetGPU',
      url: 'https://leetgpu.com/challenges/vector-addition',
      line: 1,
      column: 1,
    });
  } catch (err) {
    console.error('leetgpu e2e error:', err.message);
    requiredOk = false;
  }

  try {
    const leetcodeOk = await smokeTestSite(driver, {
      name: 'LeetCode',
      url: 'https://leetcode.com/problems/two-sum/',
      line: 1,
      column: 1,
    });
    if (!leetcodeOk) console.log('NOTE: leetcode.com smoke test failed (best-effort, not blocking).');
  } catch (err) {
    console.log('NOTE: leetcode.com not reachable/walled headless (best-effort, not blocking):', err.message.split('\n')[0]);
  }
} finally {
  if (driver) await driver.quit();
}

console.log(requiredOk ? 'firefox e2e: REQUIRED PASS' : 'firefox e2e: REQUIRED FAILURE');
process.exit(requiredOk ? 0 : 1);
