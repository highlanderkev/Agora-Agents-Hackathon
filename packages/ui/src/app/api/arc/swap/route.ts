import { errorResponse, readJsonObjectBody } from '@/lib/agents/http';
import { resolveAgentAdapter } from '@/lib/agents/registry';
import {
  createServerWalletAccessDeniedResponse,
  isServerWalletAccessAllowed,
} from '@/lib/serverWalletAccess';

export async function POST(request: Request): Promise<Response> {
  if (!isServerWalletAccessAllowed(request)) {
    return createServerWalletAccessDeniedResponse();
  }

  try {
    const adapter = resolveAgentAdapter('arc-swap');
    const body = await readJsonObjectBody(request);
    const result = await adapter.execute({ action: 'swap', input: body });

    if (!result.ok) {
      return Response.json(result, {
        status: result.statusCode ?? 500,
      });
    }

    return Response.json(result);
  } catch (error) {
    return errorResponse(error, 'Swap request failed');
  }
}

export async function GET(): Promise<Response> {
  return Response.json({
    ok: true,
    endpoint: '/api/arc/swap',
    usage: 'POST JSON body with optional tokenIn, tokenOut, amountIn',
    note: 'POST swap execution is only enabled from local development.',
  });
}
