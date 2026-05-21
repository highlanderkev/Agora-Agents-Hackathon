import { errorResponse } from '@/lib/agents/http';
import { resolveAgentAdapter } from '@/lib/agents/registry';

interface HealthRouteContext {
  params: Promise<{ agentId: string }>;
}

export async function GET(_request: Request, context: HealthRouteContext): Promise<Response> {
  try {
    const { agentId } = await context.params;
    const adapter = resolveAgentAdapter(agentId);
    const health = await adapter.health();

    return Response.json({
      ok: true,
      agentId: adapter.metadata.id,
      health,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch agent health.');
  }
}
