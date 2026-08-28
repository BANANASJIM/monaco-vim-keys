import { test, expect } from '@playwright/test';

// Drives the local harness (tests/harness/index.html) which loads the real
// monaco-editor@0.52.2 from jsDelivr. Site emulation goes through
// window.__shim (tests/harness/shim-entry.js), which runs the same
// resolveSettings() logic as src/content.js and injects dist/page.js only
// when the emulated site is enabled.

const STATUS = '.monaco-vim-keys-status';

async function gotoHarness(page) {
  await page.goto('/tests/harness/index.html');
  await page.waitForFunction(() => window.__shimLoaded === true);
}

// Emulate a supported, enabled site and wait for vim to attach.
async function emulateEnabledSite(page, hostname = 'leetgpu.com', stored) {
  const result = await page.evaluate(
    ([hostname, stored]) => window.__shim.emulateSite(hostname, stored),
    [hostname, stored ?? { sites: {} }]
  );
  expect(result.injected).toBe(true);
  await page.waitForFunction(() => window.__harnessReady === true);
  await page.waitForSelector(STATUS);
  return result;
}

function setPos(page, line, col) {
  return page.evaluate(
    ([line, col]) => {
      window.editor.focus();
      window.editor.setPosition({ lineNumber: line, column: col });
    },
    [line, col]
  );
}

function getPos(page) {
  return page.evaluate(() => {
    const p = window.editor.getPosition();
    return { line: p.lineNumber, col: p.column };
  });
}

function getLine(page, n) {
  return page.evaluate((n) => window.editor.getValue().split('\n')[n - 1], n);
}

function lineCount(page) {
  return page.evaluate(() => window.editor.getValue().split('\n').length);
}

function sendSettings(page, settings) {
  return page.evaluate((s) => window.__shim.sendSettings(s), settings);
}

const status = (page) => page.locator(STATUS);

test.beforeEach(async ({ page }) => {
  await gotoHarness(page);
  await emulateEnabledSite(page);
});

test('starts in NORMAL, i enters INSERT, Esc returns to NORMAL', async ({ page }) => {
  await expect(status(page)).toContainText('NORMAL');
  await setPos(page, 6, 5);
  await page.keyboard.press('i');
  await expect(status(page)).toContainText('INSERT');
  await page.keyboard.press('Escape');
  await expect(status(page)).toContainText('NORMAL');
});

test('basic motions h j k l', async ({ page }) => {
  await setPos(page, 6, 5);
  await page.keyboard.press('l');
  expect(await getPos(page)).toEqual({ line: 6, col: 6 });
  await page.keyboard.press('h');
  expect(await getPos(page)).toEqual({ line: 6, col: 5 });
  await page.keyboard.press('j');
  expect(await getPos(page)).toEqual({ line: 7, col: 5 });
  await page.keyboard.press('k');
  expect(await getPos(page)).toEqual({ line: 6, col: 5 });
});

test('word motions w b e', async ({ page }) => {
  // line 6: "    idx = thread_idx()"
  await setPos(page, 6, 1);
  await page.keyboard.press('w');
  expect((await getPos(page)).col).toBe(5); // "idx"
  await page.keyboard.press('w');
  expect((await getPos(page)).col).toBe(9); // "="
  await page.keyboard.press('b');
  expect((await getPos(page)).col).toBe(5);
  await page.keyboard.press('e');
  expect((await getPos(page)).col).toBe(7); // end of "idx"
});

test('line motions 0 and $', async ({ page }) => {
  await setPos(page, 6, 10);
  await page.keyboard.press('$');
  expect((await getPos(page)).col).toBe(22);
  await page.keyboard.press('0');
  expect((await getPos(page)).col).toBe(1);
});

test('gg and G jump to first/last line', async ({ page }) => {
  await setPos(page, 10, 3);
  await page.keyboard.press('g');
  await page.keyboard.press('g');
  expect((await getPos(page)).line).toBe(1);
  await page.keyboard.press('G');
  expect((await getPos(page)).line).toBe(20);
});

test('counted motions (3j)', async ({ page }) => {
  await setPos(page, 6, 1);
  await page.keyboard.press('3');
  await page.keyboard.press('j');
  expect((await getPos(page)).line).toBe(9);
});

test('x deletes character under cursor', async ({ page }) => {
  await setPos(page, 6, 5);
  await page.keyboard.press('x');
  expect(await getLine(page, 6)).toBe('    dx = thread_idx()');
});

test('dd deletes a line', async ({ page }) => {
  await setPos(page, 7, 1);
  await page.keyboard.press('d');
  await page.keyboard.press('d');
  expect(await getLine(page, 7)).toBe('        out[idx] = a[idx] + b[idx]');
  expect(await lineCount(page)).toBe(19);
});

test('yy + p duplicates a line', async ({ page }) => {
  await setPos(page, 6, 1);
  await page.keyboard.press('y');
  await page.keyboard.press('y');
  await page.keyboard.press('p');
  expect(await getLine(page, 6)).toBe('    idx = thread_idx()');
  expect(await getLine(page, 7)).toBe('    idx = thread_idx()');
  expect(await lineCount(page)).toBe(21);
});

test('u undoes and Ctrl+r redoes', async ({ page }) => {
  await setPos(page, 6, 5);
  await page.keyboard.press('x');
  expect(await getLine(page, 6)).toBe('    dx = thread_idx()');
  await page.keyboard.press('u');
  expect(await getLine(page, 6)).toBe('    idx = thread_idx()');
  await page.keyboard.press('Control+r');
  expect(await getLine(page, 6)).toBe('    dx = thread_idx()');
});

test('o opens a line below in INSERT mode', async ({ page }) => {
  await setPos(page, 6, 1);
  await page.keyboard.press('o');
  await expect(status(page)).toContainText('INSERT');
  expect((await getPos(page)).line).toBe(7);
  await page.keyboard.type('pass');
  await page.keyboard.press('Escape');
  expect((await getLine(page, 7)).trim()).toBe('pass');
  await expect(status(page)).toContainText('NORMAL');
});

test('O opens a line above in INSERT mode', async ({ page }) => {
  await setPos(page, 6, 1);
  await page.keyboard.press('O');
  await expect(status(page)).toContainText('INSERT');
  expect((await getPos(page)).line).toBe(6);
  await page.keyboard.type('pass');
  await page.keyboard.press('Escape');
  expect((await getLine(page, 6)).trim()).toBe('pass');
});

test('A appends at end of line', async ({ page }) => {
  await setPos(page, 6, 5);
  await page.keyboard.press('A');
  await expect(status(page)).toContainText('INSERT');
  expect((await getPos(page)).col).toBe(23);
  await page.keyboard.type(' # done');
  await page.keyboard.press('Escape');
  expect(await getLine(page, 6)).toBe('    idx = thread_idx() # done');
});

test('cw changes a word', async ({ page }) => {
  // line 7: "    if idx < n:"
  await setPos(page, 7, 5);
  await page.keyboard.press('c');
  await page.keyboard.press('w');
  await page.keyboard.type('while');
  await page.keyboard.press('Escape');
  expect(await getLine(page, 7)).toBe('    while idx < n:');
});

test('r<char> replaces a single character', async ({ page }) => {
  await setPos(page, 6, 5);
  await page.keyboard.press('r');
  await page.keyboard.press('z');
  expect(await getLine(page, 6)).toBe('    zdx = thread_idx()');
});

test('visual mode: v + motion + d deletes selection', async ({ page }) => {
  await setPos(page, 6, 5);
  await page.keyboard.press('v');
  await expect(status(page)).toContainText('VISUAL');
  await page.keyboard.press('l');
  await page.keyboard.press('l');
  await page.keyboard.press('d');
  expect(await getLine(page, 6)).toBe('     = thread_idx()');
  await expect(status(page)).toContainText('NORMAL');
});

test('visual mode: V y p duplicates the selected line', async ({ page }) => {
  await setPos(page, 6, 1);
  await page.keyboard.press('V');
  await expect(status(page)).toContainText('VISUAL LINE');
  await page.keyboard.press('y');
  await page.keyboard.press('p');
  expect(await getLine(page, 6)).toBe('    idx = thread_idx()');
  expect(await getLine(page, 7)).toBe('    idx = thread_idx()');
});

test('/ searches forward and jumps to the match', async ({ page }) => {
  await setPos(page, 1, 1);
  await page.keyboard.press('/');
  await page.keyboard.type('torch');
  await page.keyboard.press('Enter');
  expect(await getPos(page)).toEqual({ line: 1, col: 8 });
});

test('relative line numbers setting toggles the editor option', async ({ page }) => {
  await setPos(page, 1, 1);
  const secondLineNo = () => page.locator('.line-numbers').nth(1).textContent();

  // default: absolute numbering
  await expect.poll(secondLineNo).toBe('2');

  await sendSettings(page, {
    siteEnabled: true,
    vimEnabled: true,
    relativeLineNumbers: true,
  });
  // with the cursor on line 1, line 2 is rendered as relative distance "1"
  await expect.poll(secondLineNo).toBe('1');

  await sendSettings(page, {
    siteEnabled: true,
    vimEnabled: true,
    relativeLineNumbers: false,
  });
  await expect.poll(secondLineNo).toBe('2');
});

test('disabling vim restores plain typing and clears the indicator', async ({ page }) => {
  await sendSettings(page, {
    siteEnabled: true,
    vimEnabled: false,
    relativeLineNumbers: false,
  });
  await expect(status(page)).toHaveText('');

  await setPos(page, 1, 1);
  await page.keyboard.type('ZZZ');
  expect(await getLine(page, 1)).toBe('ZZZimport torch');

  // modal keys must be inert now
  const before = await getPos(page);
  await page.keyboard.press('j');
  const after = await getPos(page);
  expect(after.line - before.line).toBeLessThanOrEqual(1);
});

test('vim re-attaches when the SPA recreates the editor', async ({ page }) => {
  await page.evaluate(() => window.recreateEditor());

  // the periodic scan (1s) should attach to the fresh editor
  await page.waitForFunction(() => {
    const el = document.querySelector('.monaco-vim-keys-status');
    return el && el.textContent.includes('NORMAL');
  });
  // exactly one indicator (the old editor's was removed on dispose)
  await expect(page.locator(STATUS)).toHaveCount(1);

  await setPos(page, 6, 5);
  await page.keyboard.press('x');
  expect(await getLine(page, 6)).toBe('    dx = thread_idx()');
});
