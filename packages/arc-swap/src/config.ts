import 'dotenv/config';

export const ARC_TESTNET_CHAIN = 'Arc_Testnet';
export const ARC_TESTNET_EXPLORER_URL = 'https://testnet.arcscan.app/';

export interface ArcConfigEnv {
  [key: string]: string | undefined;
  PRIVATE_KEY?: string;
  KIT_KEY?: string;
}

interface ValidArcConfigEnv extends ArcConfigEnv {
  PRIVATE_KEY: string;
  KIT_KEY: string;
}

export interface ArcConfig {
  chain: typeof ARC_TESTNET_CHAIN;
  explorerUrl: typeof ARC_TESTNET_EXPLORER_URL;
  privateKey: string;
  kitKey: string;
}

export function validateArcConfigEnv(env: ArcConfigEnv): asserts env is ValidArcConfigEnv {
  const { PRIVATE_KEY, KIT_KEY } = env;

  if (!PRIVATE_KEY || !KIT_KEY) {
    throw new Error('Missing PRIVATE_KEY or KIT_KEY. Copy .env.example to .env and set both values.');
  }
}

export function getArcConfig(env: ArcConfigEnv = process.env): ArcConfig {
  validateArcConfigEnv(env);

  return {
    chain: ARC_TESTNET_CHAIN,
    explorerUrl: ARC_TESTNET_EXPLORER_URL,
    privateKey: env.PRIVATE_KEY,
    kitKey: env.KIT_KEY,
  };
}
