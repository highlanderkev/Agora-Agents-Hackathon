import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
export { runArcTestnetSwap } from './arcSwapService.js';
import { runArcTestnetSwap } from './arcSwapService.js';

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
