import {
  CopilotRuntime,
  EmptyAdapter,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import { executeArcSwap } from '@/lib/arcSwapService';
import {
  createServerWalletAccessDeniedResponse,
  isServerWalletAccessAllowed,
} from '@/lib/serverWalletAccess';
import type { SwapRequestInput } from '@/lib/arcSwapService';

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
        const { swapRequest, result } = await executeArcSwap(args);

        return {
          ok: true,
          swapRequest,
          result,
        };
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
