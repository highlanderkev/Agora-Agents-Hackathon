import { executeArcSwap } from '@/lib/arcSwapService';
import {
  createServerWalletAccessDeniedResponse,
  isServerWalletAccessAllowed,
} from '@/lib/serverWalletAccess';

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await request.json();

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return {};
  } catch {
    return {};
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isServerWalletAccessAllowed(request)) {
    return createServerWalletAccessDeniedResponse();
  }

  try {
    const body = await readJsonBody(request);
    const { swapRequest, result } = await executeArcSwap(body);

    return Response.json({
      ok: true,
      swapRequest,
      result,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Swap request failed',
      },
      { status: 500 },
    );
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
