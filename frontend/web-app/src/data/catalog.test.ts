import { describe, expect, it } from 'vitest';

import publicCompanies from './public-companies.json';
import { privateCompanies } from './private-companies';
import { getGeographies, industries, scenarioTemplates } from './taxonomy';

describe('workspace reference data', () => {
  it('ships a substantial organization catalog with ownership metadata', () => {
    expect(publicCompanies.length).toBeGreaterThan(10_000);
    expect(privateCompanies.length).toBeGreaterThan(150);
    expect(publicCompanies.every((company) => company.name && company.ticker && company.exchange)).toBe(true);
    expect(privateCompanies.every((company) => company.ownership === 'private')).toBe(true);
  });

  it('covers broad industries, countries, regions, and scenario starters', () => {
    const geographies = getGeographies();

    expect(industries.length).toBeGreaterThanOrEqual(60);
    expect(geographies.length).toBeGreaterThan(250);
    expect(geographies.some((item) => item.name === 'Global')).toBe(true);
    expect(geographies.some((item) => item.id === 'US')).toBe(true);
    expect(scenarioTemplates.length).toBeGreaterThanOrEqual(6);
  });
});
