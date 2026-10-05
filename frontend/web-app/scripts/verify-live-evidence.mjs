import { writeFile, mkdir } from 'node:fs/promises';
const base = process.argv[2] ?? 'https://sdp-decision-room.vercel.app';
const health = await fetch(`${base}/api/health`).then((r) => r.json());
if (health.status !== 'ready' || !health.providers?.researchEnabled) throw new Error('The evidence-enabled deployment is not ready.');
const started = Date.now();
const response = await fetch(`${base}/api/scenarios`, {
  method:'POST', headers:{'Content-Type':'application/json'}, signal:AbortSignal.timeout(300_000),
  body:JSON.stringify({ organization:'A.P. Møller – Mærsk', industry:'Container shipping', region:'Global', horizonYear:2036,
    focalQuestion:'How should Maersk stage fleet and fuel commitments through 2036 while preserving flexibility under uncertain regulation, fuel supply and shipping demand?',
    strategicContext:'This academic exercise asks for a source-led assessment of fleet renewal choices. Investigate the current published strategy and relevant maritime regulation; do not treat any company figures or demand forecasts as given. Compare reversible and irreversible commitments, and explicitly distinguish evidence from conditional assumptions.',
    knownUncertainties:['Alternative fuel availability and cost','Maritime regulation and enforcement','Container demand and financing conditions'],
  }),
});
const data = await response.json();
if (!response.ok) throw new Error(`Evidence generation failed (${response.status}): ${data.error ?? 'unknown error'}`);
if (!data.evidence?.references?.length || data.evidence.references.length < 4) throw new Error('Missing reference coverage');
if (Math.abs(data.scenarios.reduce((sum,s)=>sum+s.probability,0)-100)>.01) throw new Error('Weights do not sum to 100');
if (!data.provenance.some((s)=>s.role==='fact auditor')) throw new Error('Final audit missing');
await mkdir('../../output/pdf',{recursive:true});
await writeFile('../../output/pdf/evidence-e2e-result.json',JSON.stringify(data,null,2));
console.log(JSON.stringify({ id:data.id, durationMs:Date.now()-started, references:data.evidence.references.length, acceptedClaims:data.evidence.claims.filter((c)=>c.verdict==='accepted').length, scenarios:data.scenarios.length, weights:data.scenarios.map((s)=>s.probability), stages:data.provenance.map((s)=>({provider:s.provider,role:s.role,durationMs:s.durationMs})) },null,2));
