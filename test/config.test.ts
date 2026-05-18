import test from 'node:test';
import assert from 'node:assert/strict';
import { ARC_TESTNET_CHAIN, ARC_TESTNET_EXPLORER_URL, getArcConfig } from '@agora/arc-swap/config';

test('defaults are pinned to Arc testnet', () => {
  assert.equal(ARC_TESTNET_CHAIN, 'Arc_Testnet');
  assert.equal(ARC_TESTNET_EXPLORER_URL, 'https://testnet.arcscan.app/');
});

test('getArcConfig includes the Arc explorer URL', () => {
  const config = getArcConfig({
    PRIVATE_KEY: '0x' + '11'.repeat(32),
    KIT_KEY: 'test-kit-key',
  });

  assert.equal(config.chain, ARC_TESTNET_CHAIN);
  assert.equal(config.explorerUrl, ARC_TESTNET_EXPLORER_URL);
});
