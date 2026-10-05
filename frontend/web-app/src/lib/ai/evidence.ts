import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import type { EvidenceReference, EvidenceReview, ScenarioResult } from '../scenario-schema';

export class EvidenceQualityError extends Error {
  constructor(message: string) { super(message); this.name = 'EvidenceQualityError'; }
}

type ResearchTrace = { sources: unknown[]; toolCalls: { toolName?: string; providerExecuted?: boolean }[]; providerMetadata?: { google?: unknown } };
export function hasLiveResearch(response: ResearchTrace) {
  if (response.sources.length || response.toolCalls.some((t) => t.providerExecuted === true && ['web_search', 'google_search', 'server:google_search'].includes(t.toolName ?? ''))) return true;
  // Grounded structured JSON can carry a search trace without text citations.
  // Only provider metadata counts; a model's claim that it searched never does.
  const metadata = response.providerMetadata?.google as {
    groundingMetadata?: { webSearchQueries?: unknown[] } | null;
    urlContextMetadata?: { urlMetadata?: { urlRetrievalStatus?: string }[] } | null;
  } | undefined;
  return Boolean(metadata?.groundingMetadata?.webSearchQueries?.some((q) => typeof q === 'string' && q.trim().length > 0)
    || metadata?.urlContextMetadata?.urlMetadata?.some((url) => url.urlRetrievalStatus === 'URL_RETRIEVAL_STATUS_SUCCESS'));
}

export function assessEvidenceReview(references: EvidenceReference[], review: EvidenceReview) {
  const admitted = new Set(review.sourceAssessments.filter((s) => s.admissible && references.some((r) => r.id === s.sourceId)).map((s) => s.sourceId));
  const admittedReferences = references.filter((r) => admitted.has(r.id));
  const claims = review.claims.map((claim) => {
    const sourceIds = claim.sourceIds.filter((id) => admitted.has(id));
    const supported = sourceIds.length === claim.sourceIds.length && sourceIds.length > 0;
    return { ...claim, sourceIds, verdict: supported ? claim.verdict : 'uncertain' as const,
      reason: supported ? claim.reason : 'The claim lacked a complete set of admitted source references and was excluded.' };
  });
  const accepted = claims.filter((claim) => claim.verdict === 'accepted');
  const problems = [
    ...(admittedReferences.length < 4 ? [`Only ${admittedReferences.length} admissible references; at least four are required.`] : []),
    ...(new Set(admittedReferences.map((r) => r.publisher)).size < 2 ? ['Admitted references must span at least two publishers.'] : []),
    ...(accepted.length < 5 ? [`Only ${accepted.length} accepted, source-supported claims; at least five are required.`] : []),
    ...(new Set(claims.map((c) => c.id)).size !== claims.length ? ['Claim IDs were repeated. Give each claim its own unique integer ID.'] : []),
  ];
  return { admittedReferences, claims, accepted, problems };
}

type SearchSource = { sourceType: string; url?: string; title?: string };
export function publicationTitle(html: string, supplied: string, hostname: string) {
  const decode = (text: string) => text.replace(/<[^>]*>/g, ' ').replace(/&(?:amp|quot|apos|lt|gt|nbsp|#39|#x27);/gi, (entity) => ({ '&amp;': '&', '&quot;': '"', '&apos;': "'", '&#39;': "'", '&#x27;': "'", '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' }[entity.toLowerCase()] ?? entity)).replace(/\s+/g, ' ').trim().slice(0, 240);
  const og = (html.match(/<meta\b[^>]*>/gi) ?? []).find((tag) => /(?:property|name)\s*=\s*["']og:title["']/i.test(tag));
  const extracted = og?.match(/\bcontent\s*=\s*(["'])([\s\S]*?)\1/i)?.[2] ?? html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const provided = decode(supplied);
  const domainOnly = !provided || /^(?:https?:\/\/)?(?:www\.)?[\w.-]+\.[a-z]{2,}\/?$/i.test(provided);
  return domainOnly && extracted ? decode(extracted) || hostname : provided || hostname;
}
async function readPublicationTitle(response: Response, supplied: string, hostname: string) {
  if (!response.headers.get('content-type')?.includes('html') || !response.body) {
    await response.body?.cancel();
    return publicationTitle('', supplied, hostname);
  }
  const reader = response.body.getReader(), parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (size < 16_384) {
      const { value, done } = await reader.read();
      if (done) break;
      const part = value.subarray(0, 16_384 - size);
      parts.push(part); size += part.length;
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.length; }
    return publicationTitle(new TextDecoder().decode(bytes), supplied, hostname);
  } catch {
    return publicationTitle('', supplied, hostname);
  } finally { await reader.cancel().catch(() => undefined); }
}
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

// Existing citation IDs stay immutable when independent research finds more
// verified publications. A repair may add sources, never fabricate support.
export function mergeEvidenceSources(existing: EvidenceReference[], additions: EvidenceReference[], maximum = 20) {
  const merged = [...existing];
  const urls = new Set(existing.map((r) => canonicalUrl(r.url)));
  let nextId = Math.max(0, ...existing.map((r) => r.id)) + 1;
  for (const reference of additions) {
    if (merged.length >= maximum) break;
    const url = canonicalUrl(reference.url);
    if (urls.has(url)) continue;
    urls.add(url);
    merged.push({ ...reference, url, id: nextId++ });
  }
  return merged;
}

// Only URLs returned by the provider's search tool can enter the bibliography.
// Google grounding uses redirect URLs; resolve those to the actual publisher.
export async function verifySearchSources(sources: SearchSource[], offset = 0) {
  const unique = [...new Map(sources.filter((source) => source.sourceType === 'url' && source.url).map((source) => [source.url!, source])).values()].slice(0, 20);
  const inspected = await Promise.allSettled(unique.map(async (source) => {
    let url = await checkPublicUrl(source.url!);
    for (let redirects = 0; redirects < 5; redirects += 1) {
      const response = await fetch(url, { method: 'GET', redirect: 'manual', headers: { 'User-Agent': 'SDP academic evidence review', Range: 'bytes=0-16383' }, signal: AbortSignal.timeout(8_000) });
      if (response.status >= 300 && response.status < 400) {
        await response.body?.cancel();
        const location = response.headers.get('location');
        if (!location) throw new Error('Unresolved source redirect');
        url = await checkPublicUrl(new URL(location, url).toString());
        continue;
      }
      if (!response.ok) { await response.body?.cancel(); throw new Error('Source inaccessible'); }
      const title = await readPublicationTitle(response, source.title ?? '', url.hostname);
      return { title, url: canonicalUrl(url.toString()), publisher: url.hostname.replace(/^www\./, ''), accessedAt: new Date().toISOString() };
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
