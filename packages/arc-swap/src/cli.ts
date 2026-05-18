import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runArcTestnetSwap } from './arcSwapService.js';

export function isDirectExecution(importMetaUrl: string, argv1: string | undefined = process.argv[1]): boolean {
  if (!argv1) {
    return false;
  }

  return importMetaUrl === pathToFileURL(resolve(argv1)).href;
}

export async function runArcTestnetSwapCli(): Promise<void> {
  const result = await runArcTestnetSwap();
  console.log('Arc testnet swap request submitted:', result);
}

if (isDirectExecution(import.meta.url)) {
  runArcTestnetSwapCli().catch((error: unknown) => {
    console.error('Arc testnet starter flow failed:', error);
    process.exitCode = 1;
  });
}