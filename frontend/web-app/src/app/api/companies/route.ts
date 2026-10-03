import { NextRequest, NextResponse } from 'next/server';

import publicCompanies from '@/data/public-companies.json';
import { privateCompanies } from '@/data/private-companies';

type PublicCompany = {
  name: string;
  ticker: string;
  exchange: string;
  ownership: 'public';
};

const catalog = [
  ...(publicCompanies as PublicCompany[]),
  ...privateCompanies,
].map((company) => ({ ...company, search: company.name.toLocaleLowerCase() }));

export function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const normalized = query.toLocaleLowerCase();

  if (normalized.length === 0) {
    return NextResponse.json({ items: [], total: catalog.length });
  }

  const items = catalog
    .filter((company) => company.search.includes(normalized))
    .toSorted((a, b) => {
      const aScore = a.search === normalized ? 0 : a.search.startsWith(normalized) ? 1 : 2;
      const bScore = b.search === normalized ? 0 : b.search.startsWith(normalized) ? 1 : 2;
      return aScore - bScore || a.name.localeCompare(b.name);
    })
    .slice(0, 60)
    .map((company) => company.ownership === 'public'
      ? { name: company.name, ownership: company.ownership, ticker: company.ticker, exchange: company.exchange }
      : { name: company.name, ownership: company.ownership });

  return NextResponse.json(
    { items, total: catalog.length },
    { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } },
  );
}
