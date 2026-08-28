import { test, expect } from '@playwright/test';

// Site-emulation tests: the harness shim runs the same resolveSettings()
// logic as src/content.js, so emulating a hostname exercises the real
// enable/disable decision and the inject / don't-inject behavior.

const STATUS = '.monaco-vim-keys-status';

async function gotoHarness(page) {
  await page.goto('/tests/harness/index.html');
  await page.waitForFunction(() => window.__shimLoaded === true);
}

test('enabled site (leetgpu.com): page bundle injects and vim attaches', async ({ page }) => {
  await gotoHarness(page);
  const result = await page.evaluate(() =>
    window.__shim.emulateSite('leetgpu.com', { sites: {} })
  );
  expect(result.injected).toBe(true);
  expect(result.settings.siteEnabled).toBe(true);
  await page.waitForFunction(() => window.__harnessReady === true);
  await expect(page.locator(STATUS)).toContainText('NORMAL');
});

test('enabled site (leetcode.com): injects and modal editing works', async ({ page }) => {
  await gotoHarness(page);
  const result = await page.evaluate(() =>
    window.__shim.emulateSite('leetcode.com', { sites: {} })
  );
  expect(result.injected).toBe(true);
  await page.waitForFunction(() => window.__harnessReady === true);
  await expect(page.locator(STATUS)).toContainText('NORMAL');

  await page.evaluate(() => {
    window.editor.focus();
    window.editor.setPosition({ lineNumber: 6, column: 5 });
  });
  await page.keyboard.press('x');
  const line6 = await page.evaluate(() => window.editor.getValue().split('\n')[5]);
  expect(line6).toBe('    dx = thread_idx()');
});

test('unknown site: not injected, editor stays plain', async ({ page }) => {
  await gotoHarness(page);
  const result = await page.evaluate(() =>
    window.__shim.emulateSite('unknown-site.example.com', { sites: {} })
  );
  expect(result.injected).toBe(false);
  expect(result.settings.siteEnabled).toBe(false);
  await expect(page.locator(STATUS)).toHaveCount(0);

  // plain typing works, no modal behavior
  await page.evaluate(() => {
    window.editor.focus();
    window.editor.setPosition({ lineNumber: 1, column: 1 });
  });
  await page.keyboard.type('ZZZ');
  const line1 = await page.evaluate(() => window.editor.getValue().split('\n')[0]);
  expect(line1).toBe('ZZZimport torch');
});

test('site disabled via per-site override: not injected', async ({ page }) => {
  await gotoHarness(page);
  const result = await page.evaluate(() =>
    window.__shim.emulateSite('leetcode.com', {
      sites: { 'leetcode.com': { enabled: false } },
    })
  );
  expect(result.injected).toBe(false);
  expect(result.settings.siteEnabled).toBe(false);
  await expect(page.locator(STATUS)).toHaveCount(0);

  await page.evaluate(() => {
    window.editor.focus();
    window.editor.setPosition({ lineNumber: 1, column: 1 });
  });
  await page.keyboard.type('ZZZ');
  const line1 = await page.evaluate(() => window.editor.getValue().split('\n')[0]);
  expect(line1).toBe('ZZZimport torch');
});

test('disabling the site at runtime disposes vim on the live page', async ({ page }) => {
  await gotoHarness(page);
  await page.evaluate(() => window.__shim.emulateSite('leetgpu.com', { sites: {} }));
  await page.waitForFunction(() => window.__harnessReady === true);
  await expect(page.locator(STATUS)).toContainText('NORMAL');

  // content.js posts siteEnabled:false when the user disables the site
  await page.evaluate(() =>
    window.__shim.sendSettings({
      siteEnabled: false,
      vimEnabled: true,
      relativeLineNumbers: false,
    })
  );
  await expect(page.locator(STATUS)).toHaveText('');

  await page.evaluate(() => {
    window.editor.focus();
    window.editor.setPosition({ lineNumber: 1, column: 1 });
  });
  await page.keyboard.type('ZZZ');
  const line1 = await page.evaluate(() => window.editor.getValue().split('\n')[0]);
  expect(line1).toBe('ZZZimport torch');
});
