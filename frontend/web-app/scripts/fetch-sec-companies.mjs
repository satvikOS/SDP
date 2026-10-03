import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const response = await fetch('https://www.sec.gov/files/company_tickers_exchange.json', {
  headers: {
    'User-Agent': 'SDP academic scenario planning project',
    Accept: 'application/json',
  },
});

if (!response.ok) {
  throw new Error(`SEC company index returned ${response.status}`);
}

const payload = await response.json();
const companies = payload.data
  .filter(([, , ticker, exchange]) => ticker && exchange)
  .map(([, name, ticker, exchange]) => ({
    name: String(name).replace(/\s+/g, ' ').trim(),
    ticker: String(ticker),
    exchange: String(exchange),
    ownership: 'public',
  }))
  .toSorted((a, b) => a.name.localeCompare(b.name));

const destination = resolve('src/data/public-companies.json');
await writeFile(destination, `${JSON.stringify(companies)}\n`);
console.log(`Wrote ${companies.length} companies to ${destination}`);
