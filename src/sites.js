// Registry of supported practice sites (Monaco-based editors).
// Shared by build.mjs (manifest generation) and src/settings.js.
//
// Fields:
//   id             storage key / canonical host
//   name           display name for the popup
//   hosts          hostnames the content script activates on
//   defaultEnabled whether the site is enabled out of the box
//   verified       runtime probe confirmed window.monaco + .monaco-editor.
//                  Only verified sites are included in manifest matches.
//
// Excluded on purpose (see README):
//   - neetcode.io, codingame.com: Monaco but ship native vim support already
//   - codewars, algoexpert, codeforces, exercism, atcoder: not Monaco
export const SITES = [
  {
    id: 'leetgpu.com',
    name: 'LeetGPU',
    hosts: ['leetgpu.com'],
    defaultEnabled: true,
    verified: true,
  },
  {
    id: 'leetcode.com',
    name: 'LeetCode',
    hosts: ['leetcode.com'],
    defaultEnabled: true,
    verified: true,
  },
  {
    id: 'leetcode.cn',
    name: 'LeetCode China',
    hosts: ['leetcode.cn'],
    defaultEnabled: true,
    verified: true,
  },
  {
    id: 'hackerrank.com',
    name: 'HackerRank',
    hosts: ['www.hackerrank.com', 'hackerrank.com'],
    defaultEnabled: true,
    verified: true,
  },
  {
    id: 'lintcode.com',
    name: 'LintCode',
    hosts: ['www.lintcode.com', 'lintcode.com'],
    defaultEnabled: true,
    // window.monaco exists and editors render, but monaco.editor.getEditors
    // is missing (older Monaco) — attachment relies on the create() hook, so
    // an editor that already exists at injection time may be missed until
    // the SPA recreates it.
    verified: true,
  },
  {
    id: 'app.codesignal.com',
    name: 'CodeSignal',
    hosts: ['app.codesignal.com'],
    defaultEnabled: true,
    // Probe hit a login wall (no editor reachable headless) — excluded from
    // manifest matches until manually verified.
    verified: false,
  },
];

// Content-script match patterns for the manifest (verified sites only).
export function manifestMatches() {
  return SITES.filter((s) => s.verified).flatMap((s) =>
    s.hosts.map((h) => `https://${h}/*`)
  );
}

// Sites shown in the popup (must match what can actually run = verified).
export function configurableSites() {
  return SITES.filter((s) => s.verified);
}

// Find the registry entry for a hostname, or null if unsupported.
export function findSite(hostname) {
  if (!hostname) return null;
  const host = hostname.toLowerCase();
  return (
    SITES.find((site) =>
      site.hosts.some((h) => host === h || host.endsWith('.' + h))
    ) ?? null
  );
}
