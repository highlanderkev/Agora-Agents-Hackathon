import {
  CopilotRuntime,
  EmptyAdapter,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import { resolveAgentAdapter } from '@/lib/agents/registry';
import {
  createServerWalletAccessDeniedResponse,
  isServerWalletAccessAllowed,
} from '@/lib/serverWalletAccess';
import type { SwapRequestInput } from '@/lib/arcSwapService';

interface GenericAgentActionInput {
  agentId?: unknown;
  action?: unknown;
  input?: unknown;
}

function toStringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toInputObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

const runtime = new CopilotRuntime({
  actions: [
    {
      name: 'runArcSwap',
      description:
        'Execute an Arc Testnet stablecoin swap. Accepts optional tokenIn, tokenOut, and amountIn.',
      parameters: [
        {
          name: 'tokenIn',
          type: 'string',
          description: 'Input token symbol, for example USDC.',
          required: false,
        },
        {
          name: 'tokenOut',
          type: 'string',
          description: 'Output token symbol, for example EURC.',
          required: false,
        },
        {
          name: 'amountIn',
          type: 'string',
          description: 'Input amount as a decimal string.',
          required: false,
        },
      ],
      handler: async (args: SwapRequestInput) => {
        const adapter = resolveAgentAdapter('arc-swap');
        const result = await adapter.execute({
          action: 'swap',
          input: toInputObject(args),
        });

        if (!result.ok) {
          throw new Error(result.error);
        }

        return result;
      },
    },
    {
      name: 'runAgentAction',
      description:
        'Run an action on a specific agent adapter. Requires agentId and action, with optional input object.',
      parameters: [
        {
          name: 'agentId',
          type: 'string',
          description: 'Registered agent id, for example arc-swap or defi-agent.',
          required: true,
        },
        {
          name: 'action',
          type: 'string',
          description: 'Action to execute on the target agent.',
          required: true,
        },
        {
          name: 'input',
          type: 'object',
          description: 'Optional action input object.',
          required: false,
        },
      ],
      handler: async (args: GenericAgentActionInput) => {
        const agentId = toStringOrEmpty(args.agentId);
        const action = toStringOrEmpty(args.action);

        if (!agentId || !action) {
          throw new Error('runAgentAction requires non-empty agentId and action.');
        }

        const adapter = resolveAgentAdapter(agentId);
        const result = await adapter.execute({
          action,
          input: toInputObject(args.input),
        });

        if (!result.ok) {
          throw new Error(result.error);
        }

        return result;
      },
    },
  ],
});

const serviceAdapter = process.env.OPENAI_API_KEY
  ? new OpenAIAdapter({
      model: process.env.COPILOTKIT_MODEL ?? 'gpt-4o-mini',
    })
  : new EmptyAdapter();

const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
  endpoint: '/api/copilotkit',
  runtime,
  serviceAdapter,
});

export async function POST(request: Request): Promise<Response> {
  if (!isServerWalletAccessAllowed(request)) {
    return createServerWalletAccessDeniedResponse();
  }

  return handleRequest(request);
}

export async function GET(): Promise<Response> {
  return Response.json({
    ok: true,
    endpoint: '/api/copilotkit',
    llmConfigured: Boolean(process.env.OPENAI_API_KEY),
    transactionActionsNote: 'Transaction-capable actions are only enabled from local development.',
    note: process.env.OPENAI_API_KEY
      ? 'Runtime is configured with OpenAIAdapter.'
      : 'Set OPENAI_API_KEY to enable LLM-driven chat responses and tool selection.',
  });
}
