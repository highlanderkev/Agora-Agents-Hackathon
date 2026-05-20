"use client";

import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { CopilotSidebar } from '@copilotkit/react-core/v2';
import type { AgentCapabilities, AgentMetadata } from '../lib/agents/types';

interface RuntimeHealth {
  loading: boolean;
  llmConfigured: boolean;
  note: string;
}

interface AgentCatalogState {
  loading: boolean;
  defaultAgentId: string;
  agents: AgentMetadata[];
  note: string;
}

interface AgentHealthState {
  loading: boolean;
  status: string;
  note: string;
}

interface SwapFormState {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
}

interface SwapState {
  loading: boolean;
  message: string;
  payload: unknown;
}

interface RuntimeHealthPayload {
  ok?: boolean;
  llmConfigured?: boolean;
  note?: string;
}

interface AgentCatalogPayload {
  ok?: boolean;
  defaultAgentId?: string;
  agents?: AgentMetadata[];
}

interface AgentExecutionPayload {
  ok?: boolean;
  error?: string;
}

interface AgentHealthPayload {
  ok?: boolean;
  health?: {
    status?: string;
    note?: string;
  };
}

export default function Home() {
  const [runtimeHealth, setRuntimeHealth] = useState<RuntimeHealth>({
    loading: true,
    llmConfigured: false,
    note: 'Checking runtime configuration...',
  });
  const [agentCatalog, setAgentCatalog] = useState<AgentCatalogState>({
    loading: true,
    defaultAgentId: 'arc-swap',
    agents: [],
    note: 'Loading agents...',
  });
  const [selectedAgentId, setSelectedAgentId] = useState<string>('arc-swap');
  const [selectedAction, setSelectedAction] = useState<string>('swap');
  const [genericInputText, setGenericInputText] = useState<string>('{}');
  const [agentHealth, setAgentHealth] = useState<AgentHealthState>({
    loading: true,
    status: 'unknown',
    note: 'Waiting for agent selection...',
  });
  const [swapForm, setSwapForm] = useState<SwapFormState>({
    tokenIn: 'USDC',
    tokenOut: 'EURC',
    amountIn: '0.01',
  });
  const [swapState, setSwapState] = useState<SwapState>({
    loading: false,
    message: 'No manual swap submitted yet.',
    payload: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadRuntimeHealth() {
      try {
        const response = await fetch('/api/copilotkit', { method: 'GET' });
        const payload: RuntimeHealthPayload = await response.json();

        if (!isMounted) {
          return;
        }

        if (!response.ok || !payload?.ok) {
          setRuntimeHealth({
            loading: false,
            llmConfigured: false,
            note: 'Runtime endpoint responded with an error.',
          });
          return;
        }

        setRuntimeHealth({
          loading: false,
          llmConfigured: Boolean(payload.llmConfigured),
          note: payload.note ?? 'Runtime endpoint is reachable.',
        });
      } catch (_error) {
        if (!isMounted) {
          return;
        }

        setRuntimeHealth({
          loading: false,
          llmConfigured: false,
          note: 'Runtime endpoint is unreachable. Start the UI server and try again.',
        });
      }
    }

    loadRuntimeHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadAgents() {
      try {
        const response = await fetch('/api/agents', { method: 'GET' });
        const payload: AgentCatalogPayload = await response.json();

        if (!isMounted) {
          return;
        }

        if (!response.ok || !payload.ok || !Array.isArray(payload.agents)) {
          setAgentCatalog({
            loading: false,
            defaultAgentId: 'arc-swap',
            agents: [],
            note: 'Agent catalog endpoint responded with an error.',
          });
          return;
        }

        const defaultAgentId =
          typeof payload.defaultAgentId === 'string' ? payload.defaultAgentId : 'arc-swap';

        setAgentCatalog({
          loading: false,
          defaultAgentId,
          agents: payload.agents,
          note: `Loaded ${payload.agents.length} agents.`,
        });
        setSelectedAgentId(defaultAgentId);
      } catch {
        if (!isMounted) {
          return;
        }

        setAgentCatalog({
          loading: false,
          defaultAgentId: 'arc-swap',
          agents: [],
          note: 'Agent catalog endpoint is unreachable.',
        });
      }
    }

    loadAgents();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const selected = agentCatalog.agents.find((agent) => agent.id === selectedAgentId);
    const firstAction = selected?.capabilities.supportedActions[0] ?? '';
    setSelectedAction(firstAction);
    setGenericInputText('{}');
  }, [agentCatalog.agents, selectedAgentId]);

  useEffect(() => {
    let isMounted = true;

    async function loadAgentHealth() {
      if (!selectedAgentId) {
        return;
      }

      setAgentHealth({
        loading: true,
        status: 'checking',
        note: `Checking ${selectedAgentId} health...`,
      });

      try {
        const response = await fetch(`/api/agents/${selectedAgentId}/health`, { method: 'GET' });
        const payload: AgentHealthPayload = await response.json();

        if (!isMounted) {
          return;
        }

        if (!response.ok || !payload.ok) {
          setAgentHealth({
            loading: false,
            status: 'error',
            note: 'Health endpoint responded with an error.',
          });
          return;
        }

        setAgentHealth({
          loading: false,
          status: payload.health?.status ?? 'unknown',
          note: payload.health?.note ?? 'No health note provided.',
        });
      } catch {
        if (!isMounted) {
          return;
        }

        setAgentHealth({
          loading: false,
          status: 'unavailable',
          note: 'Failed to reach agent health endpoint.',
        });
      }
    }

    loadAgentHealth();

    return () => {
      isMounted = false;
    };
  }, [selectedAgentId]);

  const selectedAgent = agentCatalog.agents.find((agent) => agent.id === selectedAgentId);

  async function executeAgentAction(action: string, input: Record<string, unknown>) {
    setSwapState({
      loading: true,
      message: `Submitting ${selectedAgentId}/${action}...`,
      payload: null,
    });

    try {
      const response = await fetch(`/api/agents/${selectedAgentId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          input,
        }),
      });
      const payload: AgentExecutionPayload = await response.json();

      if (!response.ok || !payload?.ok) {
        setSwapState({
          loading: false,
          message: payload?.error ?? 'Agent request failed.',
          payload,
        });
        return;
      }

      setSwapState({
        loading: false,
        message: 'Agent action completed successfully.',
        payload,
      });
    } catch {
      setSwapState({
        loading: false,
        message: `Failed to reach /api/agents/${selectedAgentId}/execute endpoint.`,
        payload: null,
      });
    }
  }

  async function handleTrySwap(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await executeAgentAction('swap', swapForm as unknown as Record<string, unknown>);
  }

  async function handleRunGenericAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedAction.trim()) {
      setSwapState({
        loading: false,
        message: 'Action name is required.',
        payload: null,
      });
      return;
    }

    try {
      const parsed: unknown = JSON.parse(genericInputText || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setSwapState({
          loading: false,
          message: 'Input JSON must be an object.',
          payload: null,
        });
        return;
      }

      await executeAgentAction(selectedAction, parsed as Record<string, unknown>);
    } catch {
      setSwapState({
        loading: false,
        message: 'Input JSON is invalid.',
        payload: null,
      });
    }
  }

  return (
    <main className="page">
      <section className="panel">
        <h1>Agora Agent Console</h1>
        <p>
          Use this CopilotKit chat surface to interact with your custom agent and Arc Testnet
          workflow.
        </p>
        <p className="hint">
          Runtime actions available via /api/copilotkit: runArcSwap(...) and runAgentAction(...).
        </p>
        <output className="runtimeHealth" aria-live="polite">
          <strong>
            Runtime Status:{' '}
            {runtimeHealth.loading
              ? 'Checking'
              : runtimeHealth.llmConfigured
                ? 'LLM Enabled'
                : 'LLM Not Configured'}
          </strong>
          <p>{runtimeHealth.note}</p>
        </output>
        <output className="runtimeHealth" aria-live="polite">
          <strong>
            Agents:{' '}
            {agentCatalog.loading
              ? 'Loading'
              : agentCatalog.agents.length > 0
                ? `${agentCatalog.agents.length} Loaded`
                : 'Unavailable'}
          </strong>
          <p>{agentCatalog.note}</p>
        </output>
        <form className="swapForm" onSubmit={handleRunGenericAction}>
          <h2>Run Agent Action</h2>
          <p className="hint">Routes through /api/agents/[agentId]/execute.</p>
          <div className="fieldRow">
            <label htmlFor="agentId">Agent</label>
            <select
              id="agentId"
              value={selectedAgentId}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                setSelectedAgentId(event.target.value);
              }}
            >
              {agentCatalog.agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.id})
                </option>
              ))}
            </select>
          </div>
          <div className="fieldRow">
            <label htmlFor="action">Action</label>
            <input
              id="action"
              value={selectedAction}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setSelectedAction(event.target.value);
              }}
            />
          </div>
          <output className="runtimeHealth" aria-live="polite">
            <strong>
              Agent Health: {agentHealth.loading ? 'Checking' : agentHealth.status}
            </strong>
            <p>{agentHealth.note}</p>
            <p className="hint">
              {selectedAgent
                ? `${selectedAgent.description} Actions: ${selectedAgent.capabilities.supportedActions.join(', ')}`
                : 'No selected agent metadata available.'}
            </p>
          </output>
          <div className="fieldRow">
            <label htmlFor="inputJson">Input JSON</label>
            <textarea
              id="inputJson"
              rows={5}
              value={genericInputText}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
                setGenericInputText(event.target.value);
              }}
            />
          </div>
          <button type="submit" disabled={swapState.loading || !selectedAgentId}>
            {swapState.loading ? 'Running...' : 'Run Action'}
          </button>
        </form>
        <form className="swapForm" onSubmit={handleTrySwap}>
          <h2>Try Swap</h2>
          <p className="hint">Convenience action for arc-swap/swap.</p>
          <div className="fieldRow">
            <label htmlFor="tokenIn">Token In</label>
            <input
              id="tokenIn"
              value={swapForm.tokenIn}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setSwapForm((current) => ({
                  ...current,
                  tokenIn: event.target.value,
                }));
              }}
            />
          </div>
          <div className="fieldRow">
            <label htmlFor="tokenOut">Token Out</label>
            <input
              id="tokenOut"
              value={swapForm.tokenOut}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setSwapForm((current) => ({
                  ...current,
                  tokenOut: event.target.value,
                }));
              }}
            />
          </div>
          <div className="fieldRow">
            <label htmlFor="amountIn">Amount In</label>
            <input
              id="amountIn"
              value={swapForm.amountIn}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setSwapForm((current) => ({
                  ...current,
                  amountIn: event.target.value,
                }));
              }}
            />
          </div>
          <button type="submit" disabled={swapState.loading}>
            {swapState.loading ? 'Submitting...' : 'Submit Arc Swap'}
          </button>
          <p className="swapMessage">{swapState.message}</p>
          <pre className="swapPayload">{JSON.stringify(swapState.payload, null, 2)}</pre>
        </form>
      </section>
      <CopilotSidebar defaultOpen />
    </main>
  );
}
