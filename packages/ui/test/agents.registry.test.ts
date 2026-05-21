import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAgentAdapter, listAgentMetadata } from '../src/lib/agents/registry.js';
import { UnknownAgentError } from '../src/lib/agents/errors.js';

test('listAgentMetadata returns arc and defi adapters', () => {
  const agents = listAgentMetadata();
  const ids = agents.map((agent) => agent.id).sort();

  assert.deepEqual(ids, ['arc-swap', 'defi-agent']);
});

test('resolveAgentAdapter returns known adapter', () => {
  const adapter = resolveAgentAdapter('arc-swap');

  assert.equal(adapter.metadata.id, 'arc-swap');
  assert.equal(adapter.metadata.capabilities.requiresLocalWalletAccess, true);
});

test('resolveAgentAdapter throws on unknown id', () => {
  assert.throws(() => resolveAgentAdapter('unknown-agent'), UnknownAgentError);
});
