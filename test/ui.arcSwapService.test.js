import test from 'node:test';
import assert from 'node:assert/strict';
import { coerceSwapRequest } from '../apps/ui/src/lib/arcSwapService.js';

test('coerceSwapRequest applies defaults when input is missing', () => {
  const result = coerceSwapRequest(undefined);

  assert.deepEqual(result, {
    tokenIn: 'USDC',
    tokenOut: 'EURC',
    amountIn: '0.01',
  });
});

test('coerceSwapRequest trims and uppercases token symbols', () => {
  const result = coerceSwapRequest({
    tokenIn: ' usdt ',
    tokenOut: ' eurc ',
    amountIn: '1.25',
  });

  assert.deepEqual(result, {
    tokenIn: 'USDT',
    tokenOut: 'EURC',
    amountIn: '1.25',
  });
});

test('coerceSwapRequest falls back for non-string fields', () => {
  const result = coerceSwapRequest({
    tokenIn: 123,
    tokenOut: null,
    amountIn: 0.5,
  });

  assert.deepEqual(result, {
    tokenIn: 'USDC',
    tokenOut: 'EURC',
    amountIn: '0.01',
  });
});
