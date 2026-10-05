import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildScenarioPdf } from './report-export';
import { scenarioResultSchema } from './scenario-schema';
import { sample } from './scenario-fixtures.test-data';


describe('professional PDF report', () => {
  it('builds a substantial multi-page decision brief', async () => {
    const document = await buildScenarioPdf(sample);
    const bytes = Buffer.from(document.output('arraybuffer'));
    expect(document.getNumberOfPages()).toBeGreaterThanOrEqual(6);
    expect(bytes.byteLength).toBeGreaterThan(15_000);

    if (process.env.WRITE_PDF_ARTIFACT === '1') {
      const directory = resolve(process.cwd(), '../../output/pdf');
      await mkdir(directory, { recursive: true });
      await writeFile(resolve(directory, 'sdp-scenario-report-reference.pdf'), bytes);
    }
  });

  it('flows maximum-length paragraphs and tables without fixed-height truncation', async () => {
    const repeat = (sentence: string, length: number) => sentence.repeat(Math.ceil(length / sentence.length)).slice(0,length);
    const stress = { ...sample, briefTitle: repeat('Long decision framing. ',100),
      executiveSummary: repeat('Conditional test fixture, not a factual business claim. ',1400),
      request: { ...sample.request, strategicContext: repeat('Client-provided test context for pagination inspection. ',4000) },
      scenarios: sample.scenarios.map((s) => ({ ...s, thesis: repeat('A conditional premise for this test. ',220), narrative: repeat('This is a hypothetical narrative for layout testing only. ',1500), signposts: Array.from({length:6},(_,i) => repeat(`Indicator ${i+1}: a proposed observation for testing. `,180)), strategicMoves: Array.from({length:5},(_,i) => repeat(`Action ${i+1}: a conditional proposal for testing. `,180)) })),
    };
    const document = await buildScenarioPdf(stress);
    expect(document.getNumberOfPages()).toBeGreaterThan(10);
    if (process.env.WRITE_PDF_ARTIFACT === '1') await writeFile(resolve(process.cwd(),'../../output/pdf/sdp-pagination-stress-test.pdf'), Buffer.from(document.output('arraybuffer')));
  });

  it.skipIf(!process.env.SDP_E2E_RESULT)('exports an actual source-verified deployment result', async () => {
    const result = scenarioResultSchema.parse(JSON.parse(await readFile(process.env.SDP_E2E_RESULT!, 'utf8')));
    const document = await buildScenarioPdf(result);
    const directory = resolve(process.cwd(), '../../output/pdf');
    await mkdir(directory, {recursive:true});
    await writeFile(resolve(directory,'sdp-evidence-verified-report.pdf'),Buffer.from(document.output('arraybuffer')));
  });
});
