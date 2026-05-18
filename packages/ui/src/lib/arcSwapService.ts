import { DEFAULT_SWAP_REQUEST, runArcTestnetSwap } from '@agora/arc-swap';
import type { SwapRequest } from '@agora/arc-swap';

export interface SwapRequestInput {
  tokenIn?: unknown;
  tokenOut?: unknown;
  amountIn?: unknown;
}

export interface ArcSwapExecution {
  swapRequest: SwapRequest;
  result: unknown;
}

export function coerceSwapRequest(input: SwapRequestInput | undefined): SwapRequest {
  const tokenIn =
    typeof input?.tokenIn === 'string' ? input.tokenIn.trim().toUpperCase() : DEFAULT_SWAP_REQUEST.tokenIn;
  const tokenOut =
    typeof input?.tokenOut === 'string' ? input.tokenOut.trim().toUpperCase() : DEFAULT_SWAP_REQUEST.tokenOut;
  const amountIn = typeof input?.amountIn === 'string' ? input.amountIn.trim() : DEFAULT_SWAP_REQUEST.amountIn;

  return {
    tokenIn,
    tokenOut,
    amountIn,
  };
}

export async function executeArcSwap(input: SwapRequestInput | undefined): Promise<ArcSwapExecution> {
  const swapRequest = coerceSwapRequest(input);
  const result = await runArcTestnetSwap({ swapRequest });

  return {
    swapRequest,
    result,
  };
}
