import 'dotenv/config';

export const ARC_TESTNET_CHAIN = 'Arc_Testnet';
export const ARC_TESTNET_EXPLORER_URL = 'https://testnet.arcscan.app/';

export function getArcConfig() {
  const { PRIVATE_KEY, KIT_KEY } = process.env;

  if (!PRIVATE_KEY || !KIT_KEY) {
    throw new Error('Missing PRIVATE_KEY or KIT_KEY. Copy .env.example to .env and set both values.');
  }

  return {
    chain: ARC_TESTNET_CHAIN,
    explorerUrl: ARC_TESTNET_EXPLORER_URL,
    privateKey: PRIVATE_KEY,
    kitKey: KIT_KEY,
  };
}
