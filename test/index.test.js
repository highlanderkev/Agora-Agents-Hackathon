import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { relative } from 'node:path';
import { isDirectExecution, runArcTestnetSwap } from '../src/index.js';

test('isDirectExecution returns true for absolute script paths', () => {
  const importMetaUrl = new URL('../src/index.js', import.meta.url).href;
  const absoluteScriptPath = fileURLToPath(importMetaUrl);

  assert.equal(isDirectExecution(importMetaUrl, absoluteScriptPath), true);
});

test('isDirectExecution returns true for relative script paths', () => {
  const importMetaUrl = new URL('../src/index.js', import.meta.url).href;
  const absoluteScriptPath = fileURLToPath(importMetaUrl);
  const relativeScriptPath = relative(process.cwd(), absoluteScriptPath);

  assert.equal(isDirectExecution(importMetaUrl, relativeScriptPath), true);
});

test('isDirectExecution returns false when argv1 is missing or different', () => {
  const importMetaUrl = new URL('../src/index.js', import.meta.url).href;

  assert.equal(isDirectExecution(importMetaUrl, undefined), false);
  assert.equal(isDirectExecution(importMetaUrl, '/tmp/not-index.js'), false);
});

test('runArcTestnetSwap rethrows non-balance errors unchanged', async () => {
  const nonBalanceError = new Error('network failure');

  await assert.rejects(
    runArcTestnetSwap({
      getConfig: () => ({
        chain: 'Arc_Testnet',
        privateKey: '0x1234',
        kitKey: 'kit-key',
        explorerUrl: 'https://testnet.arcscan.app/',
      }),
      appKitFactory: () => ({
        swap: async () => {
          throw nonBalanceError;
        },
      }),
      createAdapter: () => ({}),
      toAccount: () => ({ address: '0xabc' }),
    }),
    (error) => error === nonBalanceError,
  );
});

test('runArcTestnetSwap wraps insufficient balance errors with guidance', async () => {
  const balanceError = { type: 'BALANCE', code: 9001, message: 'insufficient funds' };

  await assert.rejects(
    runArcTestnetSwap({
      getConfig: () => ({
        chain: 'Arc_Testnet',
        privateKey: '0x1234',
        kitKey: 'kit-key',
        explorerUrl: 'https://testnet.arcscan.app/',
      }),
      appKitFactory: () => ({
        swap: async () => {
          throw balanceError;
        },
      }),
      createAdapter: () => ({}),
      toAccount: () => ({ address: '0xabc' }),
    }),
    (error) => {
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
  let adapterPrivateKey;
  let accountPrivateKey;

  const result = await runArcTestnetSwap({
    getConfig: () => ({
      chain: 'Arc_Testnet',
      privateKey: 'abcd',
      kitKey: 'kit-key',
      explorerUrl: 'https://testnet.arcscan.app/',
    }),
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
