import type {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentHealthStatus,
  AgentRuntimeAdapter,
} from '../types.js';

const DEFAULT_DEFI_AGENT_SERVICE_URL = 'http://127.0.0.1:8001';
const DEFAULT_DEFI_AGENT_TIMEOUT_MS = 15000;

interface DefiServiceConfig {
  serviceUrl: string;
  timeoutMs: number;
}

function getDefiServiceConfig(env: NodeJS.ProcessEnv = process.env): DefiServiceConfig {
  const serviceUrl = env.DEFI_AGENT_SERVICE_URL?.trim() || DEFAULT_DEFI_AGENT_SERVICE_URL;
  const timeoutMs = Number(env.DEFI_AGENT_TIMEOUT_MS ?? DEFAULT_DEFI_AGENT_TIMEOUT_MS);

  return {
    serviceUrl: serviceUrl.replace(/\/$/, ''),
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_DEFI_AGENT_TIMEOUT_MS,
  };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function parseJsonBody(response: Response): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

export const defiAgentHttpAdapter: AgentRuntimeAdapter = {
  metadata: {
    id: 'defi-agent',
    name: 'DeFi Agent',
    description: 'Routes agent actions to the Python DeFi agent HTTP service.',
    capabilities: {
      supportsMockMode: true,
      requiresLocalWalletAccess: false,
      supportedActions: ['run-strategy-cycle'],
      llmMode: 'agent-owned',
    },
  },

  async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    const { serviceUrl, timeoutMs } = getDefiServiceConfig();

    try {
      const response = await fetchWithTimeout(
        `${serviceUrl}/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: request.action,
            input: request.input ?? {},
          }),
        },
        timeoutMs,
      );
      const body = await parseJsonBody(response);

      if (!response.ok) {
        return {
          ok: false,
          agentId: this.metadata.id,
          action: request.action,
          statusCode: response.status,
          error:
            typeof body.error === 'string'
              ? body.error
              : `DeFi agent service returned ${response.status}`,
        };
      }

      return {
        ok: true,
        agentId: this.metadata.id,
        action: request.action,
        data: body,
      };
    } catch (error) {
      return {
        ok: false,
        agentId: this.metadata.id,
        action: request.action,
        statusCode: 503,
        error:
          error instanceof Error && error.name === 'AbortError'
            ? 'Timed out calling DeFi agent service.'
            : 'Failed to reach DeFi agent service.',
      };
    }
  },

  async health(): Promise<AgentHealthStatus> {
    const { serviceUrl, timeoutMs } = getDefiServiceConfig();

    try {
      const response = await fetchWithTimeout(
        `${serviceUrl}/health`,
        {
          method: 'GET',
        },
        timeoutMs,
      );

      if (!response.ok) {
        return {
          ok: false,
          status: 'degraded',
          note: `DeFi agent health check returned ${response.status}.`,
          details: {
            statusCode: response.status,
          },
        };
      }

      const body = await parseJsonBody(response);
      const upstreamStatus = typeof body.status === 'string' ? body.status : 'healthy';
      const note = typeof body.note === 'string' ? body.note : 'DeFi agent service is reachable.';

      return {
        ok: true,
        status: upstreamStatus === 'healthy' ? 'healthy' : 'degraded',
        note,
        details: body,
      };
    } catch (error) {
      return {
        ok: false,
        status: 'unavailable',
        note:
          error instanceof Error && error.name === 'AbortError'
            ? 'Timed out calling DeFi agent health endpoint.'
            : 'Failed to reach DeFi agent health endpoint.',
      };
    }
  },
};
