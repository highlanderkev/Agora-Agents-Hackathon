import { AppKit } from '@circle-fin/app-kit';
import { createViemAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2';
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

if (import.meta.url === `file://${process.argv[1]}`) {
  runArcTestnetSwap()
    .then((result) => {
      console.log('Arc testnet swap request submitted:', result);
    })
    .catch((error) => {
      console.error('Arc testnet starter flow failed:', error);
      process.exitCode = 1;
    });
}
