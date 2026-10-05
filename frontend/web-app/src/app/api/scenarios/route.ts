import { z } from 'zod';

import {
  generateScenarioSet,
  MissingProviderKeysError,
} from '@/lib/ai/scenario-engine';
import { scenarioRequestSchema } from '@/lib/scenario-schema';
import { EvidenceQualityError } from '@/lib/ai/evidence';

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const input = scenarioRequestSchema.parse(payload);
    if (request.headers.get('accept')?.includes('application/x-ndjson')) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (value: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
          try {
            const result = await generateScenarioSet(input, (stage) => send({ event: 'stage', stage }));
            send({ event: 'result', result });
          } catch (error) {
            console.error('Scenario stream failed', { name: error instanceof Error ? error.name : 'UnknownError', message: error instanceof Error ? error.message : 'Unknown failure' });
            send({ event: 'error', error: error instanceof EvidenceQualityError ? error.message : error instanceof MissingProviderKeysError ? 'The scenario service is not configured for this deployment.' : 'Scenario generation failed. No report was saved; please retry.' });
          } finally { controller.close(); }
        },
      });
      return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store, no-transform', 'X-Content-Type-Options': 'nosniff' } });
    }
    const result = await generateScenarioSet(input);

    return Response.json(result, {
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof EvidenceQualityError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    if (error instanceof SyntaxError) {
      return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
    }

    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: 'The scenario brief is incomplete or invalid.',
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 422 },
      );
    }

    if (error instanceof MissingProviderKeysError) {
      return Response.json(
        {
          error: 'The scenario service is not configured for this deployment.',
          missing: error.missing,
        },
        { status: 503 },
      );
    }

    console.error('Scenario generation failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : 'Unknown failure',
    });
    return Response.json(
      { error: 'Scenario generation failed. No result was saved; try again.' },
      { status: 502 },
    );
  }
}
