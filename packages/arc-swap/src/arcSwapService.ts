import { getArcConfig } from './config.js';
import type { ArcConfig } from './config.js';

export const DEFAULT_SWAP_REQUEST = {
  tokenIn: 'USDC',
  tokenOut: 'EURC',
  amountIn: '0.01',
} as const;

export interface SwapRequest {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
}

interface WalletAccount {
  address: string;
}

interface SwapKit {
  swap(input: {
    from: { adapter: unknown; chain: ArcConfig['chain'] };
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    config: { kitKey: string };
  }): Promise<unknown>;
}

type AppKitConstructor = new (...args: unknown[]) => SwapKit;

interface RunArcTestnetSwapOptions {
  getConfig?: () => ArcConfig;
  appKitFactory?: () => SwapKit;
  createAdapter?: (input: { privateKey: string }) => unknown;
  toAccount?: (privateKey: string) => WalletAccount;
  swapRequest?: SwapRequest;
}

interface InsufficientBalanceErrorShape {
  type?: string;
  code?: number;
}

function normalizePrivateKey(privateKey: string): string {
  return privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
}

async function loadArcSdk() {
  const [{ AppKit }, { createViemAdapterFromPrivateKey }, { privateKeyToAccount }] = await Promise.all([
    import('@circle-fin/app-kit'),
    import('@circle-fin/adapter-viem-v2'),
    import('viem/accounts'),
  ]);

  return {
    AppKit,
    createViemAdapterFromPrivateKey,
    privateKeyToAccount,
  };
}

const INSUFFICIENT_BALANCE_ERROR_TYPE = 'BALANCE';
const INSUFFICIENT_BALANCE_ERROR_CODE = 9001;

function isInsufficientBalanceError(error: unknown): error is InsufficientBalanceErrorShape {
  const candidate = error as InsufficientBalanceErrorShape | null;

  return (
    candidate?.type === INSUFFICIENT_BALANCE_ERROR_TYPE &&
    candidate?.code === INSUFFICIENT_BALANCE_ERROR_CODE
  );
}

function buildExplorerAddressUrl(explorerUrl: string, walletAddress: string): string {
  return new URL(`address/${walletAddress}`, explorerUrl).href;
}

function formatBalanceGuidance({
  walletAddress,
  explorerUrl,
}: {
  walletAddress: string;
  explorerUrl: string;
}): string {
  return [
    'Swap failed because the wallet does not have enough token balance on Arc Testnet.',
    `Wallet: ${walletAddress}`,
    `Explorer: ${buildExplorerAddressUrl(explorerUrl, walletAddress)}`,
    'Fix steps:',
    '1) Fund this wallet on Arc Testnet with tokenIn (USDC).',
    '2) Try a smaller amount (for example, 0.10 or 0.01).',
    '3) Confirm you funded the same wallet derived from PRIVATE_KEY.',
  ].join('\n');
}

export async function runArcTestnetSwap({
  getConfig = getArcConfig,
  appKitFactory,
  createAdapter,
  toAccount,
  swapRequest = DEFAULT_SWAP_REQUEST,
}: RunArcTestnetSwapOptions = {}): Promise<unknown> {
  const { chain, privateKey, kitKey, explorerUrl } = getConfig();
  const normalizedPrivateKey = normalizePrivateKey(privateKey);

  let AppKit: AppKitConstructor | undefined;
  let createViemAdapterFromPrivateKey: ((input: { privateKey: string }) => unknown) | undefined;
  let privateKeyToAccount: ((privateKey: string) => WalletAccount) | undefined;

  if (!(appKitFactory && createAdapter && toAccount)) {
    const sdk = await loadArcSdk();

    AppKit = sdk.AppKit as unknown as AppKitConstructor;
    createViemAdapterFromPrivateKey =
      sdk.createViemAdapterFromPrivateKey as (input: { privateKey: string }) => unknown;
    privateKeyToAccount = (privateKey: string) =>
      sdk.privateKeyToAccount(privateKey as `0x${string}`) as unknown as WalletAccount;
  }

  const makeAppKit = appKitFactory ?? (() => new AppKit!());
  const makeAdapter = createAdapter ?? createViemAdapterFromPrivateKey;
  const makeAccount = toAccount ?? privateKeyToAccount;
  const walletAddress = makeAccount!(normalizedPrivateKey).address;
  const kit = makeAppKit();
  const adapter = makeAdapter!({ privateKey: normalizedPrivateKey });

  try {
    return await kit.swap({
      from: { adapter, chain },
      tokenIn: swapRequest.tokenIn,
      tokenOut: swapRequest.tokenOut,
      amountIn: swapRequest.amountIn,
      config: { kitKey },
    });
  } catch (error) {
    if (isInsufficientBalanceError(error)) {
      throw new Error(formatBalanceGuidance({ walletAddress, explorerUrl }), { cause: error });
    }

    throw error;
  }
}
