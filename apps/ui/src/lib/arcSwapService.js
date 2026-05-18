import { DEFAULT_SWAP_REQUEST, runArcTestnetSwap } from '@agora/arc-swap';

export function coerceSwapRequest(input) {
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

export async function executeArcSwap(input) {
  const swapRequest = coerceSwapRequest(input);
  const result = await runArcTestnetSwap({ swapRequest });

  return {
    swapRequest,
    result,
  };
}
