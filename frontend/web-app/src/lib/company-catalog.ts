export type CatalogCompany = { name: string; ownership: 'public' | 'private'; ticker?: string; exchange?: string; country?: string; listings?: { ticker: string; exchange: string }[] };

// Group an issuer's share classes and cross-listings, not every security as a
// separate company. Do not strip meaningful subsidiary or geographic names.
export function companyIdentity(name: string) {
  const identity = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ø/g,'o').replace(/æ/g,'ae').replace(/œ/g,'oe').replace(/ß/g,'ss').replace(/ł/g,'l')
    .replace(/\b(class [a-z]|sponsored adr|unsponsored adr|american depositary shares|ordinary shares|common stock)\b/g, '')
    .replace(/\b(incorporated|inc|corporation|corp|limited|ltd|plc|co|company|s a|s\.a\.)\b/g, '')
    .replace(/\b(a\/s|as|ag|ab|nv|bv|se)\b[.,\s]*$/g, '')
    .replace(/&/g, 'and').replace(/[^\p{L}\p{N}]/gu, '').trim();
  // Known issuer spelling variants and vendor-truncated legal names.
  if (/^apm(o|oe)llermaersk/.test(identity)) return 'apmollermaersk';
  return identity;
}
export function deduplicateCompanies(companies: CatalogCompany[]) {
  const unique = new Map<string, CatalogCompany>();
  for (const company of companies) {
    const key = companyIdentity(company.name);
    if (!key) continue;
    const existing = unique.get(key);
    const candidates = company.ownership === 'public' && company.ticker && company.exchange ? [{ ticker: company.ticker, exchange: company.exchange }, ...(company.listings ?? [])] : [];
    const listings = [...new Map(candidates.map((l) => [`${l.exchange.toLowerCase()}:${l.ticker}`,l])).values()];
    if (!existing) unique.set(key, { ...company, listings });
    else {
      // A current public listing takes precedence over an outdated private tag.
      const combined = [...(existing.listings ?? []), ...listings];
      existing.listings = [...new Map(combined.map((l) => [`${l.exchange.toLowerCase()}:${l.ticker}`, l])).values()];
      if (existing.ownership === 'private' && company.ownership === 'public') Object.assign(existing, { ...company, listings: existing.listings });
    }
  }
  return [...unique.values()];
}
