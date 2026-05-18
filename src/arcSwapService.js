import { getArcConfig } from './config.js';

export const DEFAULT_SWAP_REQUEST = {
  tokenIn: 'USDC',
  tokenOut: 'EURC',
  amountIn: '0.01',
};

function normalizePrivateKey(privateKey) {
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

// Observed Circle SDK insufficient-balance error shape for swap failures.
// If @circle-fin/app-kit exposes official error constants in a future version,
// prefer those over these values and keep this check in sync with SDK updates.
const INSUFFICIENT_BALANCE_ERROR_TYPE = 'BALANCE';
const INSUFFICIENT_BALANCE_ERROR_CODE = 9001;

function isInsufficientBalanceError(error) {
  return (
    error?.type === INSUFFICIENT_BALANCE_ERROR_TYPE &&
    error?.code === INSUFFICIENT_BALANCE_ERROR_CODE
  );
}

function buildExplorerAddressUrl(explorerUrl, walletAddress) {
  return new URL(`address/${walletAddress}`, explorerUrl).href;
}

function formatBalanceGuidance({ walletAddress, explorerUrl }) {
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
} = {}) {
  const { chain, privateKey, kitKey, explorerUrl } = getConfig();
  const normalizedPrivateKey = normalizePrivateKey(privateKey);

  let AppKit;
  let createViemAdapterFromPrivateKey;
  let privateKeyToAccount;

  if (!(appKitFactory && createAdapter && toAccount)) {
    ({ AppKit, createViemAdapterFromPrivateKey, privateKeyToAccount } = await loadArcSdk());
  }

  const makeAppKit = appKitFactory ?? (() => new AppKit());
  const makeAdapter = createAdapter ?? createViemAdapterFromPrivateKey;
  const makeAccount = toAccount ?? privateKeyToAccount;
  const walletAddress = makeAccount(normalizedPrivateKey).address;
  const kit = makeAppKit();
  const adapter = makeAdapter({ privateKey: normalizedPrivateKey });

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
