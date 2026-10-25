// Popup logic: global toggles, plus a "Site list" tab where built-in sites
// can be switched off and custom sites can be added/removed at runtime.
import { configurableSites, findSite } from '../src/sites.js';
import { DEFAULTS } from '../src/settings.js';

const vimToggle = document.getElementById('vimEnabled');
const relToggle = document.getElementById('relativeLineNumbers');
const sitesContainer = document.getElementById('sites');
const addBtn = document.getElementById('addSite');
const addStatus = document.getElementById('addStatus');

// ---- tabs ----
document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((b) =>
      b.classList.toggle('active', b === btn)
    );
    document.getElementById('tab-settings').hidden = btn.dataset.tab !== 'settings';
    document.getElementById('tab-sites').hidden = btn.dataset.tab !== 'sites';
  });
});

// ---- script registration for custom sites ----
// "*." in a match pattern covers the domain itself AND all its subdomains.
function matchPattern(host) {
  return `https://*.${host}/*`;
}

function scriptIds(site) {
  return [`mvk-content-${site.id}`, `mvk-page-${site.id}`];
}

async function registerSite(site) {
  const ids = scriptIds(site);
  const matches = [matchPattern(site.hosts[0])];
  try {
    await browser.scripting.unregisterContentScripts({ ids });
  } catch (e) {
    /* wasn't registered yet; fine */
  }
  await browser.scripting.registerContentScripts([
    { id: ids[0], matches, js: ['/content.js'], runAt: 'document_start' },
    { id: ids[1], matches, js: ['/page.js'], runAt: 'document_start', world: 'MAIN' },
  ]);
}

async function unregisterSite(site) {
  try {
    await browser.scripting.unregisterContentScripts({ ids: scriptIds(site) });
  } catch (e) {
    /* already gone */
  }
}

// ---- site list rendering ----
async function setSiteEnabled(site, enabled) {
  const current = (await browser.storage.local.get('sites')).sites || {};
  current[site.id] = { enabled };
  await browser.storage.local.set({ sites: current });
}

async function removeCustomSite(site) {
  await unregisterSite(site);
  try {
    await browser.permissions.remove({ origins: [matchPattern(site.hosts[0])] });
  } catch (e) {
    /* permission may already be gone */
  }
  const stored = await browser.storage.local.get({ customSites: [], sites: {} });
  delete stored.sites[site.id];
  await browser.storage.local.set({
    customSites: stored.customSites.filter((s) => s.id !== site.id),
    sites: stored.sites,
  });
  await renderSites();
}

function makeRow(site, enabled, onRemove) {
  const label = document.createElement('label');
  label.className = 'row';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = enabled;
  input.addEventListener('change', () => setSiteEnabled(site, input.checked));

  const name = document.createElement('span');
  name.textContent = site.name;

  const host = document.createElement('span');
  host.className = 'host';
  host.textContent = site.hosts[0];

  label.append(input, name, host);

  if (onRemove) {
    const btn = document.createElement('button');
    btn.className = 'remove';
    btn.textContent = '✕';
    btn.title = 'Remove site';
    btn.addEventListener('click', (e) => {
      e.preventDefault(); // don't toggle the checkbox
      onRemove();
    });
    label.appendChild(btn);
  }
  return label;
}

async function renderSites() {
  const stored = await browser.storage.local.get({ sites: {}, customSites: [] });
  sitesContainer.replaceChildren();

  for (const site of configurableSites()) {
    const enabled = stored.sites[site.id]?.enabled ?? site.defaultEnabled;
    sitesContainer.appendChild(makeRow(site, enabled, null));
  }
  for (const site of stored.customSites) {
    const enabled = stored.sites[site.id]?.enabled ?? site.defaultEnabled;
    sitesContainer.appendChild(makeRow(site, enabled, () => removeCustomSite(site)));
  }
}

// ---- "Add this site" ----
async function setupAddButton() {
  const stored = await browser.storage.local.get({ customSites: [] });
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

  let url;
  try {
    url = new URL(tab.url);
  } catch (e) {
    addStatus.textContent = 'Open a website first, then click the icon.';
    return;
  }
  if (url.protocol !== 'https:') {
    addStatus.textContent = 'Only https sites can be added.';
    return;
  }
  if (findSite(url.hostname, stored.customSites)) {
    addStatus.textContent = 'This site is already in the list.';
    return;
  }

  let hasEditor = false;
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => !!document.querySelector('.monaco-editor'),
    });
    hasEditor = results.some((r) => r.result);
  } catch (e) {
    /* page not scriptable */
  }
  if (!hasEditor) {
    addStatus.textContent = 'No Monaco editor detected on this page.';
    return;
  }

  const host = url.hostname.replace(/^www\./, '');
  addStatus.textContent = `Monaco detected on ${host}.`;
  addBtn.disabled = false;

  addBtn.addEventListener('click', async () => {
    // The permission request must come first, straight from the click.
    const granted = await browser.permissions.request({
      origins: [matchPattern(host)],
    });
    if (!granted) {
      addStatus.textContent = 'Permission denied.';
      return;
    }
    const site = {
      id: host,
      name: host,
      hosts: [host],
      defaultEnabled: true,
      custom: true,
    };
    await registerSite(site);
    const latest = await browser.storage.local.get({ customSites: [] });
    await browser.storage.local.set({ customSites: [...latest.customSites, site] });
    await browser.tabs.reload(tab.id); // scripts must load before the page's own code
    window.close();
  });
}

// ---- init ----
async function init() {
  const stored = await browser.storage.local.get({
    vimEnabled: DEFAULTS.vimEnabled,
    relativeLineNumbers: DEFAULTS.relativeLineNumbers,
  });
  vimToggle.checked = stored.vimEnabled;
  relToggle.checked = stored.relativeLineNumbers;
  await renderSites();
  await setupAddButton();
}

vimToggle.addEventListener('change', () => {
  browser.storage.local.set({ vimEnabled: vimToggle.checked });
});
relToggle.addEventListener('change', () => {
  browser.storage.local.set({ relativeLineNumbers: relToggle.checked });
});

init();