// Pure settings-resolution logic, shared by content.js and tests.
// Storage schema (browser.storage.local):
//   {
//     vimEnabled: boolean,            // global vim toggle, default true
//     relativeLineNumbers: boolean,   // default false
//     sites: { "<site id>": { enabled: boolean } }  // per-site overrides
//   }
import { findSite } from './sites.js';

export const DEFAULTS = Object.freeze({
  vimEnabled: true,
  relativeLineNumbers: false,
});

// Resolve the effective settings for a hostname from raw stored values.
// Unknown hosts are always disabled (siteEnabled: false).
export function resolveSettings(hostname, stored = {}) {
  const site = findSite(hostname);
  let siteEnabled = false;
  if (site) {
    const override = stored.sites?.[site.id]?.enabled;
    siteEnabled = override !== undefined ? override : site.defaultEnabled;
  }
  return {
    siteEnabled,
    siteId: site ? site.id : null,
    vimEnabled: stored.vimEnabled ?? DEFAULTS.vimEnabled,
    relativeLineNumbers: stored.relativeLineNumbers ?? DEFAULTS.relativeLineNumbers,
  };
}

// Merge a storage.onChanged `changes` object into a raw stored-values object.
export function applyChanges(stored, changes) {
  const next = { ...stored, sites: { ...(stored.sites || {}) } };
  for (const [key, change] of Object.entries(changes)) {
    if (key === 'sites') {
      next.sites = change.newValue || {};
    } else {
      next[key] = change.newValue;
    }
  }
  return next;
}
