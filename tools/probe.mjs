// Runtime probe: visits representative editor pages and reports whether
// window.monaco is exposed and a .monaco-editor element is present.
// Results are written to tools/probe-results.json and printed as a table.
//
// Usage: node tools/probe.mjs
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const TARGETS = [
  { id: 'leetcode.com', url: 'https://leetcode.com/problems/two-sum/' },
  { id: 'leetcode.cn', url: 'https://leetcode.cn/problems/two-sum/' },
  { id: 'hackerrank.com', url: 'https://www.hackerrank.com/challenges/solve-me-first/problem' },
  { id: 'app.codesignal.com', url: 'https://app.codesignal.com/' },
  { id: 'lintcode.com', url: 'https://www.lintcode.com/problem/1/' },
];

const results = [];

const browser = await chromium.launch({ headless: true });

for (const target of TARGETS) {
  const result = { id: target.id, url: target.url };
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64; rv:142.0) Gecko/20100101 Firefox/142.0',
  });
  const page = await context.newPage();
  try {
    const response = await page.goto(target.url, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    result.httpStatus = response ? response.status() : null;
    result.title = await page.title();

    // Give the SPA time to mount the editor.
    await page
      .waitForSelector('.monaco-editor', { timeout: 20000 })
      .catch(() => {});

    const probe = await page.evaluate(() => ({
      monacoGlobal: typeof window.monaco !== 'undefined' && !!window.monaco?.editor,
      monacoVersion:
        typeof window.monaco !== 'undefined' ? window.monaco?.editor?.version ?? null : null,
      editorElements: document.querySelectorAll('.monaco-editor').length,
      editors:
        typeof window.monaco !== 'undefined' &&
        typeof window.monaco?.editor?.getEditors === 'function'
          ? window.monaco.editor.getEditors().length
          : null,
      bodySnippet: document.body ? document.body.innerText.slice(0, 200) : '',
    }));
    Object.assign(result, probe);
    result.verdict =
      probe.monacoGlobal && probe.editorElements > 0
        ? 'verified'
        : 'unverified';
  } catch (err) {
    result.error = String(err).split('\n')[0];
    result.verdict = 'unverified';
  }
  results.push(result);
  console.log(JSON.stringify(result, null, 2));
  await context.close();
}

await browser.close();

writeFileSync(
  new URL('./probe-results.json', import.meta.url),
  JSON.stringify({ date: new Date().toISOString(), results }, null, 2) + '\n'
);
console.log('\nwritten to tools/probe-results.json');
