import { UnknownAgentError } from './errors.js';
import { arcSwapAdapter } from './adapters/arcSwapAdapter.js';
import { defiAgentHttpAdapter } from './adapters/defiAgentHttpAdapter.js';
import type { AgentMetadata, AgentRuntimeAdapter } from './types.js';

const adapters: AgentRuntimeAdapter[] = [arcSwapAdapter, defiAgentHttpAdapter];

const adapterById = new Map<string, AgentRuntimeAdapter>(
  adapters.map((adapter) => [adapter.metadata.id, adapter]),
);

const DEFAULT_AGENT_ID = 'arc-swap';

export function listAgentMetadata(): AgentMetadata[] {
  return adapters.map((adapter) => adapter.metadata);
}

export function resolveAgentAdapter(agentId: string | undefined): AgentRuntimeAdapter {
  const selectedAgentId = agentId?.trim() || process.env.DEFAULT_AGENT_ID || DEFAULT_AGENT_ID;
  const resolved = adapterById.get(selectedAgentId);

  if (!resolved) {
    throw new UnknownAgentError(selectedAgentId);
  }

  return resolved;
}
