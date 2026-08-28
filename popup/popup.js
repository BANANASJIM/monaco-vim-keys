// Popup logic: global vim/relative-line-number toggles plus one enable
// toggle per supported site. Reads/writes browser.storage.local; content
// scripts pick changes up live via storage.onChanged.
import { configurableSites } from '../src/sites.js';
import { DEFAULTS } from '../src/settings.js';

const vimToggle = document.getElementById('vimEnabled');
const relToggle = document.getElementById('relativeLineNumbers');
const sitesContainer = document.getElementById('sites');

async function init() {
  const stored = await browser.storage.local.get({
    vimEnabled: DEFAULTS.vimEnabled,
    relativeLineNumbers: DEFAULTS.relativeLineNumbers,
    sites: {},
  });

  vimToggle.checked = stored.vimEnabled;
  relToggle.checked = stored.relativeLineNumbers;

  for (const site of configurableSites()) {
    const enabled = stored.sites[site.id]?.enabled ?? site.defaultEnabled;

    const label = document.createElement('label');
    label.className = 'row';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = enabled;
    input.addEventListener('change', async () => {
      const current = (await browser.storage.local.get('sites')).sites || {};
      current[site.id] = { enabled: input.checked };
      await browser.storage.local.set({ sites: current });
    });

    const name = document.createElement('span');
    name.textContent = site.name;

    const host = document.createElement('span');
    host.className = 'host';
    host.textContent = site.hosts[0];

    label.append(input, name, host);
    sitesContainer.appendChild(label);
  }
}

vimToggle.addEventListener('change', () => {
  browser.storage.local.set({ vimEnabled: vimToggle.checked });
});

relToggle.addEventListener('change', () => {
  browser.storage.local.set({ relativeLineNumbers: relToggle.checked });
});

init();
