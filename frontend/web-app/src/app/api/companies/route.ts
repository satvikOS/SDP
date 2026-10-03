import { NextRequest, NextResponse } from 'next/server';

import publicCompanies from '@/data/public-companies.json';
import { privateCompanies } from '@/data/private-companies';

type PublicCompany = {
  name: string;
  ticker: string;
  exchange: string;
  ownership: 'public';
};

type CompanyResult = PublicCompany | { name: string; ownership: 'private' };

type GlobalQuote = {
  quoteType?: string;
  longname?: string;
  shortname?: string;
  symbol?: string;
  exchDisp?: string;
  exchange?: string;
};

const catalog = [
  ...(publicCompanies as PublicCompany[]),
  ...privateCompanies,
].map((company) => ({ ...company, search: company.name.toLocaleLowerCase() }));

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const normalized = query.toLocaleLowerCase();

  if (normalized.length === 0) {
    return NextResponse.json({ items: [], total: catalog.length });
  }

  const localItems: CompanyResult[] = catalog
    .filter((company) => company.search.includes(normalized))
    .toSorted((a, b) => {
      const aScore = a.search === normalized ? 0 : a.search.startsWith(normalized) ? 1 : 2;
      const bScore = b.search === normalized ? 0 : b.search.startsWith(normalized) ? 1 : 2;
      return aScore - bScore || a.name.localeCompare(b.name);
    })
    .slice(0, 45)
    .map((company) => company.ownership === 'public'
      ? { name: company.name, ownership: company.ownership, ticker: company.ticker, exchange: company.exchange }
      : { name: company.name, ownership: company.ownership });

  const globalItems = normalized.length > 1 ? await searchGlobalListings(query) : [];
  const unique = new Map<string, CompanyResult>();
  [...localItems, ...globalItems].forEach((company) => {
    const key = company.ownership === 'public'
      ? `${company.exchange}:${company.ticker}`.toLocaleLowerCase()
      : `private:${company.name}`.toLocaleLowerCase();
    if (!unique.has(key)) unique.set(key, company);
  });

  const items = [...unique.values()]
    .toSorted((a, b) => rank(a.name, normalized) - rank(b.name, normalized) || a.name.localeCompare(b.name))
    .slice(0, 60);

  return NextResponse.json(
    { items, total: catalog.length },
    { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } },
  );
}

async function searchGlobalListings(query: string): Promise<PublicCompany[]> {
  try {
    const url = new URL('https://query1.finance.yahoo.com/v1/finance/search');
    url.searchParams.set('q', query);
    url.searchParams.set('quotesCount', '20');
    url.searchParams.set('newsCount', '0');
    const response = await fetch(url, {
      headers: { 'User-Agent': 'SDP academic scenario planning project' },
      signal: AbortSignal.timeout(2_500),
      next: { revalidate: 3_600 },
    });
    if (!response.ok) return [];
    const payload = await response.json() as { quotes?: GlobalQuote[] };
    return (payload.quotes ?? []).flatMap((quote) => {
      const name = quote.longname ?? quote.shortname;
      const ticker = quote.symbol;
      const exchange = quote.exchDisp ?? quote.exchange;
      if (quote.quoteType !== 'EQUITY' || !name || !ticker || !exchange) return [];
      return [{ name, ticker, exchange, ownership: 'public' as const }];
    });
  } catch {
    return [];
  }
}

function rank(name: string, query: string) {
  const normalized = name.toLocaleLowerCase();
  return normalized === query ? 0 : normalized.startsWith(query) ? 1 : 2;
}
