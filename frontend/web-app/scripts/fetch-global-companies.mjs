import { writeFile, readFile } from 'node:fs/promises';
import { companyIdentity } from '../src/lib/company-catalog.ts';

// Pin all downloads to one immutable revision. The source's MIT attribution is
// bundled beside the transformed data; no guessed exchange/country assignment.
const repo = 'JerBouma/FinanceDatabase';
const revision = await fetch(`https://api.github.com/repos/${repo}/commits/main`).then((r) => r.json()).then((r) => r.sha);
if (!revision) throw new Error('Source revision unavailable');
const files = await fetch(`https://api.github.com/repos/${repo}/contents/database/equities?ref=${revision}`).then((r) => r.json());
const records = [];
function csv(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i+1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
    else if (c === '\n' && !quoted) { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
for (let start = 0; start < files.length; start += 6) {
  await Promise.all(files.slice(start, start + 6).map(async (file) => {
    const response = await fetch(`https://raw.githubusercontent.com/${repo}/${revision}/database/equities/${file.name}`);
    if (!response.ok) throw new Error(`Download failed: ${file.name}`);
    const [headers, ...rows] = csv(await response.text());
    const at = (row, key) => row[headers.indexOf(key)]?.trim() ?? '';
    for (const row of rows) {
      const name = at(row, 'name'), ticker = at(row, 'symbol'), code = at(row, 'exchange');
      if (!name || !ticker || !code || code === 'NAN' || at(row, 'delisted').toLowerCase() === 'true') continue;
      const exchange = ({ NMS: 'Nasdaq Global Select', NGM: 'Nasdaq Global Market', NCM: 'Nasdaq Capital Market', NYQ: 'New York Stock Exchange' })[code] ?? (at(row, 'market') || code);
      records.push({ name, ticker, exchange, country: at(row, 'country'), ownership: 'public' });
    }
  }));
}
// Collapse duplicates into issuer entries while retaining every exchange/ticker.
const issuers = new Map();
for (const record of records.toSorted((a,b) => a.name.localeCompare(b.name))) {
  const key = companyIdentity(record.name), prior = issuers.get(key);
  if (!prior) issuers.set(key, { ...record, listings: [{ ticker: record.ticker, exchange: record.exchange }] });
  else if (!prior.listings.some((l) => l.ticker === record.ticker && l.exchange === record.exchange)) prior.listings.push({ ticker: record.ticker, exchange: record.exchange });
}
await writeFile('src/data/global-companies.json', JSON.stringify([...issuers.values()]) + '\n');
const license = await fetch(`https://raw.githubusercontent.com/${repo}/${revision}/LICENSE`).then((r) => r.text());
await writeFile('src/data/GLOBAL-CATALOG-LICENSE.txt', license);
const sec = JSON.parse(await readFile('src/data/public-companies.json','utf8'));
const total = new Set([...sec, ...issuers.values()].map((r) => companyIdentity(r.name))).size;
await writeFile('src/data/company-catalog-source.json', JSON.stringify({ source: `https://github.com/${repo}`, revision, retrievedAt: new Date().toISOString(), globalIssuers: issuers.size, globalListings: records.length, uniquePublicIssuers: total, note: 'Directory snapshot, not verified investment evidence. Live lookup supplements the directory; listing status may change.' }, null, 2) + '\n');
console.log(JSON.stringify({ globalIssuers: issuers.size, globalListings: records.length, uniquePublicIssuers: total }));
