import { z } from 'zod';

import {
  generateScenarioSet,
  MissingProviderKeysError,
} from '@/lib/ai/scenario-engine';
import { scenarioRequestSchema } from '@/lib/scenario-schema';

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const input = scenarioRequestSchema.parse(payload);
    const result = await generateScenarioSet(input);

    return Response.json(result, {
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
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

    console.error('Scenario generation failed', error);
    return Response.json(
      { error: 'Scenario generation failed. No result was saved; try again.' },
      { status: 502 },
    );
  }
}
