import { runArcTestnetSwap } from './arcSwapService.js';
import type { RunArcTestnetSwapOptions, SwapRequest } from './arcSwapService.js';

export const ARC_SWAP_AGENT_ID = 'arc-swap';
export const ARC_SWAP_ACTION = 'swap';

export interface ArcSwapAgentMetadata {
  id: string;
  name: string;
  description: string;
  supportedActions: readonly [typeof ARC_SWAP_ACTION];
}

export interface ArcSwapAgentExecutionRequest {
  action: string;
  input?: SwapRequest;
}

export interface ArcSwapAgent {
  metadata: ArcSwapAgentMetadata;
  execute(request: ArcSwapAgentExecutionRequest, options?: RunArcTestnetSwapOptions): Promise<unknown>;
}

const agentRegistry = new Map<string, ArcSwapAgent>();

function createDefaultArcSwapAgent(): ArcSwapAgent {
  return {
    metadata: {
      id: ARC_SWAP_AGENT_ID,
      name: 'Arc Swap',
      description: 'Executes Arc Testnet stablecoin swaps.',
      supportedActions: [ARC_SWAP_ACTION],
    },
    async execute(
      request: ArcSwapAgentExecutionRequest,
      options: RunArcTestnetSwapOptions = {},
    ): Promise<unknown> {
      if (request.action !== ARC_SWAP_ACTION) {
        throw new Error(`Unsupported action for ${ARC_SWAP_AGENT_ID}: ${request.action}`);
      }

      const swapRequest = request.input ?? options.swapRequest;

      return runArcTestnetSwap({
        ...options,
        ...(swapRequest ? { swapRequest } : {}),
      });
    },
  };
}

export function registerArcSwapAgent(agent: ArcSwapAgent): void {
  agentRegistry.set(agent.metadata.id, agent);
}

export function resolveArcSwapAgent(agentId: string = ARC_SWAP_AGENT_ID): ArcSwapAgent {
  const resolvedAgent = agentRegistry.get(agentId);

  if (!resolvedAgent) {
    throw new Error(`Unknown arc-swap agent id: ${agentId}`);
  }

  return resolvedAgent;
}

export async function executeArcSwapAgent({
  agentId = ARC_SWAP_AGENT_ID,
  action = ARC_SWAP_ACTION,
  input,
  runOptions,
}: {
  agentId?: string;
  action?: string;
  input?: SwapRequest;
  runOptions?: RunArcTestnetSwapOptions;
} = {}): Promise<unknown> {
  const agent = resolveArcSwapAgent(agentId);
  const request: ArcSwapAgentExecutionRequest = {
    action,
    ...(input ? { input } : {}),
  };

  return agent.execute(request, runOptions);
}

registerArcSwapAgent(createDefaultArcSwapAgent());
