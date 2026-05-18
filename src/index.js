import { AppKit } from '@circle-fin/app-kit';
import { createViemAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2';
import { privateKeyToAccount } from 'viem/accounts';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getArcConfig } from './config.js';

function normalizePrivateKey(privateKey) {
  return privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
}

function isInsufficientBalanceError(error) {
  return error?.type === 'BALANCE' && error?.code === 9001;
}

function formatBalanceGuidance({ walletAddress, explorerUrl }) {
  return [
    'Swap failed because the wallet does not have enough token balance on Arc Testnet.',
    `Wallet: ${walletAddress}`,
    `Explorer: ${explorerUrl}address/${walletAddress}`,
    'Fix steps:',
    '1) Fund this wallet on Arc Testnet with tokenIn (USDC).',
    '2) Try a smaller amount (for example, 0.10 or 0.01).',
    '3) Confirm you funded the same wallet derived from PRIVATE_KEY.',
  ].join('\n');
}

export async function runArcTestnetSwap() {
  const { chain, privateKey, kitKey, explorerUrl } = getArcConfig();
  const normalizedPrivateKey = normalizePrivateKey(privateKey);
  const walletAddress = privateKeyToAccount(normalizedPrivateKey).address;
  const kit = new AppKit();
  const adapter = createViemAdapterFromPrivateKey({ privateKey: normalizedPrivateKey });

  try {
    return await kit.swap({
      from: { adapter, chain },
      tokenIn: 'USDC',
      tokenOut: 'EURC',
      amountIn: '1.00',
      config: { kitKey },
    });
  } catch (error) {
    if (isInsufficientBalanceError(error)) {
      throw new Error(formatBalanceGuidance({ walletAddress, explorerUrl }), { cause: error });
    }

    throw error;
  }
}

export function isDirectExecution(importMetaUrl, argv1 = process.argv[1]) {
  if (!argv1) {
    return false;
  }

  return importMetaUrl === pathToFileURL(resolve(argv1)).href;
}

if (isDirectExecution(import.meta.url)) {
  runArcTestnetSwap()
    .then((result) => {
      console.log('Arc testnet swap request submitted:', result);
    })
    .catch((error) => {
      console.error('Arc testnet starter flow failed:', error);
      process.exitCode = 1;
    });
}
