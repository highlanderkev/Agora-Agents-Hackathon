import { readJsonObjectBody, errorResponse } from '@/lib/agents/http';
import { resolveAgentAdapter } from '@/lib/agents/registry';
import { isServerWalletAccessAllowed, createServerWalletAccessDeniedResponse } from '@/lib/serverWalletAccess';
import type { AgentExecutionRequest } from '@/lib/agents/types';

interface ExecuteRouteContext {
  params: { agentId: string };
}

export async function POST(request: Request, context: ExecuteRouteContext): Promise<Response> {
  try {
    const { agentId } = context.params;
    const adapter = resolveAgentAdapter(agentId);

    if (
      adapter.metadata.capabilities.requiresLocalWalletAccess &&
      !isServerWalletAccessAllowed(request)
    ) {
      return createServerWalletAccessDeniedResponse();
    }

    const body = await readJsonObjectBody(request);
    const action = typeof body.action === 'string' ? body.action : '';
    const input =
      body.input && typeof body.input === 'object' && !Array.isArray(body.input)
        ? (body.input as Record<string, unknown>)
        : undefined;

    if (!action.trim()) {
      return Response.json(
        {
          ok: false,
          error: 'Missing required string field: action',
        },
        { status: 400 },
      );
    }

    const executionRequest: AgentExecutionRequest = {
      action,
      input,
    };
    const result = await adapter.execute(executionRequest);

    if (!result.ok) {
      return Response.json(result, {
        status: result.statusCode ?? 500,
      });
    }

    return Response.json(result);
  } catch (error) {
    return errorResponse(error, 'Agent execution failed.');
  }
}
