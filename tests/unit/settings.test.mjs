// Unit tests for the site registry + settings resolution logic.
// Run with: node --test tests/unit/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SITES,
  findSite,
  manifestMatches,
  configurableSites,
} from '../../src/sites.js';
import {
  resolveSettings,
  applyChanges,
  DEFAULTS,
} from '../../src/settings.js';

test('findSite matches exact hosts', () => {
  assert.equal(findSite('leetgpu.com')?.id, 'leetgpu.com');
  assert.equal(findSite('leetcode.com')?.id, 'leetcode.com');
  assert.equal(findSite('leetcode.cn')?.id, 'leetcode.cn');
  assert.equal(findSite('www.lintcode.com')?.id, 'lintcode.com');
});

test('findSite matches subdomains but not lookalike domains', () => {
  assert.equal(findSite('app.leetgpu.com')?.id, 'leetgpu.com');
  assert.equal(findSite('evil-leetcode.com'), null);
  assert.equal(findSite('notleetcode.com'), null);
  assert.equal(findSite('example.com'), null);
  assert.equal(findSite(''), null);
  assert.equal(findSite(undefined), null);
});

test('every registry entry has the required shape', () => {
  for (const site of SITES) {
    assert.ok(site.id, 'id');
    assert.ok(site.name, 'name');
    assert.ok(Array.isArray(site.hosts) && site.hosts.length > 0, 'hosts');
    assert.equal(typeof site.defaultEnabled, 'boolean');
    assert.equal(typeof site.verified, 'boolean');
  }
});

test('manifest matches include only verified sites as https patterns', () => {
  const matches = manifestMatches();
  assert.ok(matches.includes('https://leetgpu.com/*'));
  for (const m of matches) {
    assert.match(m, /^https:\/\/[^/]+\/\*$/);
  }
  const unverified = SITES.filter((s) => !s.verified);
  for (const site of unverified) {
    for (const h of site.hosts) {
      assert.ok(!matches.includes(`https://${h}/*`), `${h} must be excluded`);
    }
  }
  // popup only lists what the manifest can actually run on
  assert.deepEqual(
    configurableSites().map((s) => s.id),
    SITES.filter((s) => s.verified).map((s) => s.id)
  );
});

test('unknown host resolves to disabled', () => {
  const s = resolveSettings('unknown-site.example.com');
  assert.equal(s.siteEnabled, false);
  assert.equal(s.siteId, null);
  assert.equal(s.vimEnabled, DEFAULTS.vimEnabled);
  assert.equal(s.relativeLineNumbers, DEFAULTS.relativeLineNumbers);
});

test('known host resolves to its default', () => {
  const s = resolveSettings('leetgpu.com');
  assert.equal(s.siteEnabled, true);
  assert.equal(s.siteId, 'leetgpu.com');
});

test('per-site override wins over the default', () => {
  const off = resolveSettings('leetgpu.com', {
    sites: { 'leetgpu.com': { enabled: false } },
  });
  assert.equal(off.siteEnabled, false);

  const on = resolveSettings('leetcode.com', {
    sites: { 'leetcode.com': { enabled: true } },
  });
  assert.equal(on.siteEnabled, true);
});

test('global toggles resolve from storage with defaults', () => {
  const s = resolveSettings('leetgpu.com', {
    vimEnabled: false,
    relativeLineNumbers: true,
  });
  assert.equal(s.vimEnabled, false);
  assert.equal(s.relativeLineNumbers, true);
});

test('applyChanges merges storage.onChanged output', () => {
  const stored = { vimEnabled: true, relativeLineNumbers: false, sites: {} };
  const next = applyChanges(stored, {
    sites: { newValue: { 'leetgpu.com': { enabled: false } } },
  });
  assert.equal(next.sites['leetgpu.com'].enabled, false);
  assert.equal(next.vimEnabled, true);

  const next2 = applyChanges(next, { vimEnabled: { newValue: false } });
  assert.equal(next2.vimEnabled, false);
  assert.equal(next2.sites['leetgpu.com'].enabled, false);

  const resolved = resolveSettings('leetgpu.com', next2);
  assert.equal(resolved.siteEnabled, false);
  assert.equal(resolved.vimEnabled, false);
});
