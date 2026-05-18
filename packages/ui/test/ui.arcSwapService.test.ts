import test from 'node:test';
import assert from 'node:assert/strict';
import { coerceSwapRequest } from '../src/lib/arcSwapService.js';
import { isServerWalletAccessAllowed } from '../src/lib/serverWalletAccess.js';

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

test('isServerWalletAccessAllowed allows localhost in development', () => {
  const request = new Request('http://localhost:3000/api/arc/swap');

  assert.equal(isServerWalletAccessAllowed(request, { NODE_ENV: 'development' }), true);
});

test('isServerWalletAccessAllowed blocks non-local hosts', () => {
  const request = new Request('https://example.com/api/arc/swap');

  assert.equal(isServerWalletAccessAllowed(request, { NODE_ENV: 'development' }), false);
});

test('isServerWalletAccessAllowed blocks non-development environments', () => {
  const request = new Request('http://localhost:3000/api/copilotkit');

  assert.equal(isServerWalletAccessAllowed(request, { NODE_ENV: 'production' }), false);
});
