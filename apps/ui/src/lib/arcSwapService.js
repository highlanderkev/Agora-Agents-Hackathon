import { runArcTestnetSwap } from '../../../../src/arcSwapService.js';

export function coerceSwapRequest(input) {
  const tokenIn = typeof input?.tokenIn === 'string' ? input.tokenIn.trim().toUpperCase() : 'USDC';
  const tokenOut = typeof input?.tokenOut === 'string' ? input.tokenOut.trim().toUpperCase() : 'EURC';
  const amountIn = typeof input?.amountIn === 'string' ? input.amountIn.trim() : '0.01';

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
