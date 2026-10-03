import { providerStatus } from '@/lib/ai/scenario-engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  const providers = providerStatus();
  const ready = providers.xai && providers.google && providers.openai;

  return Response.json(
    {
      status: ready ? 'ready' : 'configuration_required',
      service: 'sdp-decision-room',
      providers,
      checkedAt: new Date().toISOString(),
    },
    {
      status: ready ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
