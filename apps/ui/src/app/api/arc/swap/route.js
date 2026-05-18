import { executeArcSwap } from '@/lib/arcSwapService';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
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

export async function GET() {
  return Response.json({
    ok: true,
    endpoint: '/api/arc/swap',
    usage: 'POST JSON body with optional tokenIn, tokenOut, amountIn',
  });
}
