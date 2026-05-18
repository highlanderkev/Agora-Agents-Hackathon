import test from 'node:test';
import assert from 'node:assert/strict';
import { ARC_TESTNET_CHAIN, ARC_TESTNET_EXPLORER_URL } from '../src/config.js';

test('defaults are pinned to Arc testnet', () => {
  assert.equal(ARC_TESTNET_CHAIN, 'Arc_Testnet');
  assert.equal(ARC_TESTNET_EXPLORER_URL, 'https://testnet.arcscan.app/');
});
