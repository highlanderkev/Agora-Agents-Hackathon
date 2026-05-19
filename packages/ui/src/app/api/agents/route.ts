import { listAgentMetadata, resolveAgentAdapter } from '@/lib/agents/registry';
import { errorResponse } from '@/lib/agents/http';

export async function GET(request: Request): Promise<Response> {
  try {
    const selected = new URL(request.url).searchParams.get('agentId') ?? undefined;
    const selectedAgent = resolveAgentAdapter(selected);

    return Response.json({
      ok: true,
      defaultAgentId: selectedAgent.metadata.id,
      agents: listAgentMetadata(),
    });
  } catch (error) {
    return errorResponse(error, 'Failed to list agents.');
  }
}
