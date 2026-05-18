import { AppKit } from '@circle-fin/app-kit';
import { createViemAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getArcConfig } from './config.js';

export async function runArcTestnetSwap() {
  const { chain, privateKey, kitKey } = getArcConfig();
  const kit = new AppKit();
  const adapter = createViemAdapterFromPrivateKey({ privateKey });

  return kit.swap({
    from: { adapter, chain },
    tokenIn: 'USDC',
    tokenOut: 'EURC',
    amountIn: '1.00',
    config: { kitKey },
  });
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
