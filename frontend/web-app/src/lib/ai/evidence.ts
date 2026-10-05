import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import type { ScenarioResult } from '../scenario-schema';

export class EvidenceQualityError extends Error {
  constructor(message: string) { super(message); this.name = 'EvidenceQualityError'; }
}

type SearchSource = { sourceType: string; url?: string; title?: string };
function privateAddress(address: string) {
  if (address.includes(':')) return address === '::1' || address === '::' || /^(fc|fd|fe80|::ffff:)/i.test(address);
  const [a, b] = address.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || a === 100 && b >= 64 && b <= 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a >= 224;
}

async function checkPublicUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443') throw new Error('Invalid source URL');
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(hostname) || hostname === 'localhost' || hostname.endsWith('.local')) throw new Error('Invalid source host');
  const addresses = await lookup(hostname, { all: true });
  if (addresses.length === 0 || addresses.some(({ address }) => privateAddress(address))) throw new Error('Non-public source');
  return url;
}

export function canonicalUrl(value: string) {
  const url = new URL(value);
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) if (/^(utm_|gclid|fbclid)/i.test(key)) url.searchParams.delete(key);
  return url.toString().replace(/\/$/, '');
}

// Only URLs returned by the provider's search tool can enter the bibliography.
// Google grounding uses redirect URLs; resolve those to the actual publisher.
export async function verifySearchSources(sources: SearchSource[], offset = 0) {
  const unique = [...new Map(sources.filter((source) => source.sourceType === 'url' && source.url).map((source) => [source.url!, source])).values()].slice(0, 20);
  const inspected = await Promise.allSettled(unique.map(async (source) => {
    let url = await checkPublicUrl(source.url!);
    for (let redirects = 0; redirects < 5; redirects += 1) {
      const response = await fetch(url, { method: 'GET', redirect: 'manual', headers: { 'User-Agent': 'SDP academic evidence review', Range: 'bytes=0-4095' }, signal: AbortSignal.timeout(8_000) });
      await response.body?.cancel();
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) throw new Error('Unresolved source redirect');
        url = await checkPublicUrl(new URL(location, url).toString());
        continue;
      }
      if (!response.ok) throw new Error('Source inaccessible');
      return { title: source.title || url.hostname, url: canonicalUrl(url.toString()), publisher: url.hostname.replace(/^www\./, ''), accessedAt: new Date().toISOString() };
    }
    throw new Error('Too many source redirects');
  }));
  const valid = inspected.flatMap((item) => item.status === 'fulfilled' ? [item.value] : []);
  return [...new Map(valid.map((source) => [source.url, source])).values()].map((source, index) => ({ ...source, id: offset + index + 1 }));
}

export function assertCitations(result: ScenarioResult) {
  const references = result.evidence?.references ?? [];
  const validIds = new Set(references.map((source) => source.id));
  const sections = [result.executiveSummarySourceIds, result.dissentSourceIds, ...result.drivers.map((d) => d.sourceIds), ...result.scenarios.map((s) => s.sourceIds), ...result.robustActions.map((a) => a.sourceIds)];
  if (references.length < 4 || sections.some((ids) => ids.length === 0 || ids.some((id) => !validIds.has(id)))) {
    throw new EvidenceQualityError('The report did not meet the reference coverage requirement. No unverified report was saved.');
  }
  const text = JSON.stringify({ executiveSummary: result.executiveSummary, drivers: result.drivers, scenarios: result.scenarios, robustActions: result.robustActions, dissent: result.dissent });
  for (const match of text.matchAll(/\[(\d+)\]/g)) if (!validIds.has(Number(match[1]))) throw new EvidenceQualityError('The report contains an unknown numbered citation. It was not saved.');
  const acceptedClaims = new Set(result.evidence?.claims.filter((claim) => claim.verdict === 'accepted').map((claim) => claim.id));
  if (result.scenarios.some((scenario) => scenario.evidenceFactors.some((factor) => !acceptedClaims.has(factor.claimId)))) throw new EvidenceQualityError('Scenario weighting used a rejected or unverified claim.');
}
