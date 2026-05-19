import { executeArcSwap } from '../../arcSwapService.js';
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentHealthStatus,
  AgentRuntimeAdapter,
} from '../types.js';

function isObjectInput(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export const arcSwapAdapter: AgentRuntimeAdapter = {
  metadata: {
    id: 'arc-swap',
    name: 'Arc Swap',
    description: 'Executes Arc Testnet stablecoin swaps with the server wallet.',
    capabilities: {
      supportsMockMode: false,
      requiresLocalWalletAccess: true,
      supportedActions: ['swap'],
      llmMode: 'agent-owned',
    },
  },

  async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    if (request.action !== 'swap') {
      return {
        ok: false,
        agentId: this.metadata.id,
        action: request.action,
        statusCode: 400,
        error: `Unsupported action for arc-swap: ${request.action}`,
      };
    }

    const input = isObjectInput(request.input) ? request.input : undefined;

    try {
      const { swapRequest, result } = await executeArcSwap(input);

      return {
        ok: true,
        agentId: this.metadata.id,
        action: request.action,
        data: {
          swapRequest,
          result,
        },
      };
    } catch (error) {
      return {
        ok: false,
        agentId: this.metadata.id,
        action: request.action,
        statusCode: 500,
        error: error instanceof Error ? error.message : 'Swap request failed',
      };
    }
  },

  async health(): Promise<AgentHealthStatus> {
    return {
      ok: true,
      status: 'healthy',
      note: 'Arc swap adapter is available.',
    };
  },
};
