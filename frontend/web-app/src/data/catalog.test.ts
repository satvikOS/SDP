import { describe, expect, it } from 'vitest';

import publicCompanies from './public-companies.json';
import globalCompanies from './global-companies.json';
import { companyIdentity, deduplicateCompanies, type CatalogCompany } from '../lib/company-catalog';
import { privateCompanies } from './private-companies';
import { getGeographies, industries, scenarioTemplates } from './taxonomy';

describe('workspace reference data', () => {
  it('ships a substantial organization catalog with ownership metadata', () => {
    expect(publicCompanies.length).toBeGreaterThan(10_000);
    expect(privateCompanies.length).toBeGreaterThan(150);
    expect(publicCompanies.every((company) => company.name && company.ticker && company.exchange)).toBe(true);
    expect(privateCompanies.every((company) => company.ownership === 'private')).toBe(true);
    expect(globalCompanies.length).toBeGreaterThan(30_000);
    const merged = deduplicateCompanies([...publicCompanies, ...globalCompanies, ...privateCompanies] as CatalogCompany[]);
    expect(merged.length).toBeGreaterThan(30_000);
    expect(new Set(merged.map((c) => companyIdentity(c.name))).size).toBe(merged.length);
  });

  it('covers broad industries, countries, regions, and scenario starters', () => {
    const geographies = getGeographies();

    expect(industries.length).toBeGreaterThanOrEqual(200);
    expect(geographies.length).toBeGreaterThan(250);
    expect(geographies.some((item) => item.name === 'Global')).toBe(true);
    expect(geographies.some((item) => item.id === 'US')).toBe(true);
    expect(scenarioTemplates.length).toBeGreaterThanOrEqual(6);
  });
  it('groups legal-name spelling variants and repeated listings', () => {
    expect(companyIdentity('A.P. Møller - Mærsk A/S')).toBe(companyIdentity('AP MOELLER MAERSK A/S A P MOLLE'));
    const result = deduplicateCompanies([{ name:'Example Inc.', ownership:'public', ticker:'TEST', exchange:'Nasdaq', listings:[{ ticker:'TEST', exchange:'Nasdaq' }] }, { name:'Example Corporation', ownership:'public', ticker:'TEST.A', exchange:'Other market' }]);
    expect(result).toHaveLength(1); expect(result[0].listings).toHaveLength(2);
  });
});
