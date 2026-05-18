import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { relative } from 'node:path';
import { isDirectExecution, runArcTestnetSwap } from '@agora/arc-swap';
import type { ArcConfig, SwapRequest } from '@agora/arc-swap';

interface SwapArgs {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
}

function createConfig(privateKey: string): ArcConfig {
  return {
    chain: 'Arc_Testnet',
    privateKey,
    kitKey: 'kit-key',
    explorerUrl: 'https://testnet.arcscan.app/',
  };
}

test('isDirectExecution returns true for absolute script paths', () => {
  const importMetaUrl = new URL('../../packages/arc-swap/dist/cli.js', import.meta.url).href;
  const absoluteScriptPath = fileURLToPath(importMetaUrl);

  assert.equal(isDirectExecution(importMetaUrl, absoluteScriptPath), true);
});

test('isDirectExecution returns true for relative script paths', () => {
  const importMetaUrl = new URL('../../packages/arc-swap/dist/cli.js', import.meta.url).href;
  const absoluteScriptPath = fileURLToPath(importMetaUrl);
  const relativeScriptPath = relative(process.cwd(), absoluteScriptPath);

  assert.equal(isDirectExecution(importMetaUrl, relativeScriptPath), true);
});

test('isDirectExecution returns false when argv1 is missing or different', () => {
  const importMetaUrl = new URL('../../packages/arc-swap/dist/cli.js', import.meta.url).href;

  assert.equal(isDirectExecution(importMetaUrl, undefined), false);
  assert.equal(isDirectExecution(importMetaUrl, '/tmp/not-index.js'), false);
});

test('runArcTestnetSwap rethrows non-balance errors unchanged', async () => {
  const nonBalanceError = new Error('network failure');

  await assert.rejects(
    runArcTestnetSwap({
      getConfig: () => createConfig('0x1234'),
      appKitFactory: () => ({
        swap: async () => {
          throw nonBalanceError;
        },
      }),
      createAdapter: () => ({}),
      toAccount: () => ({ address: '0xabc' }),
    }),
    (error: unknown) => error === nonBalanceError,
  );
});

test('runArcTestnetSwap wraps insufficient balance errors with guidance', async () => {
  const balanceError = { type: 'BALANCE', code: 9001, message: 'insufficient funds' };

  await assert.rejects(
    runArcTestnetSwap({
      getConfig: () => createConfig('0x1234'),
      appKitFactory: () => ({
        swap: async () => {
          throw balanceError;
        },
      }),
      createAdapter: () => ({}),
      toAccount: () => ({ address: '0xabc' }),
    }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.cause, balanceError);
      assert.match(error.message, /Swap failed because the wallet does not have enough token balance/);
      assert.match(error.message, /Wallet: 0xabc/);
      assert.match(error.message, /Explorer: https:\/\/testnet\.arcscan\.app\/address\/0xabc/);
      return true;
    },
  );
});

test('runArcTestnetSwap normalizes private key without 0x prefix', async () => {
  let adapterPrivateKey: string | undefined;
  let accountPrivateKey: string | undefined;

  const result = await runArcTestnetSwap({
    getConfig: () => createConfig('abcd'),
    appKitFactory: () => ({
      swap: async () => ({ requestId: 'req_123' }),
    }),
    createAdapter: ({ privateKey }) => {
      adapterPrivateKey = privateKey;
      return { kind: 'adapter' };
    },
    toAccount: (privateKey) => {
      accountPrivateKey = privateKey;
      return { address: '0xabc' };
    },
  });

  assert.equal(adapterPrivateKey, '0xabcd');
  assert.equal(accountPrivateKey, '0xabcd');
  assert.deepEqual(result, { requestId: 'req_123' });
});

test('runArcTestnetSwap forwards swapRequest overrides', async () => {
  let capturedSwapArgs: SwapArgs | undefined;
  const swapRequest: SwapRequest = {
    tokenIn: 'USDT',
    tokenOut: 'USDC',
    amountIn: '2.50',
  };

  await runArcTestnetSwap({
    getConfig: () => createConfig('0x1234'),
    swapRequest,
    appKitFactory: () => ({
      swap: async (args: SwapArgs) => {
        capturedSwapArgs = args;
        return { requestId: 'req_override' };
      },
    }),
    createAdapter: () => ({ kind: 'adapter' }),
    toAccount: () => ({ address: '0xabc' }),
  });

  assert.equal(capturedSwapArgs?.tokenIn, 'USDT');
  assert.equal(capturedSwapArgs?.tokenOut, 'USDC');
  assert.equal(capturedSwapArgs?.amountIn, '2.50');
});
