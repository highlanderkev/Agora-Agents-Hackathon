"use client";

import { useEffect, useState } from 'react';
import { CopilotSidebar } from '@copilotkit/react-core/v2';

export default function Home() {
  const [runtimeHealth, setRuntimeHealth] = useState({
    loading: true,
    llmConfigured: false,
    note: 'Checking runtime configuration...',
  });
  const [swapForm, setSwapForm] = useState({
    tokenIn: 'USDC',
    tokenOut: 'EURC',
    amountIn: '0.01',
  });
  const [swapState, setSwapState] = useState({
    loading: false,
    message: 'No manual swap submitted yet.',
    payload: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadRuntimeHealth() {
      try {
        const response = await fetch('/api/copilotkit', { method: 'GET' });
        const payload = await response.json();

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

  async function handleTrySwap(event) {
    event.preventDefault();
    setSwapState({
      loading: true,
      message: 'Submitting swap request...',
      payload: null,
    });

    try {
      const response = await fetch('/api/arc/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(swapForm),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        setSwapState({
          loading: false,
          message: payload?.error ?? 'Swap request failed.',
          payload,
        });
        return;
      }

      setSwapState({
        loading: false,
        message: 'Swap request submitted successfully.',
        payload,
      });
    } catch (_error) {
      setSwapState({
        loading: false,
        message: 'Failed to reach /api/arc/swap endpoint.',
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
          Runtime action available via /api/copilotkit: runArcSwap(tokenIn, tokenOut, amountIn).
        </p>
        <div className="runtimeHealth" role="status" aria-live="polite">
          <strong>
            Runtime Status:{' '}
            {runtimeHealth.loading
              ? 'Checking'
              : runtimeHealth.llmConfigured
                ? 'LLM Enabled'
                : 'LLM Not Configured'}
          </strong>
          <p>{runtimeHealth.note}</p>
        </div>
        <form className="swapForm" onSubmit={handleTrySwap}>
          <h2>Try Swap</h2>
          <p className="hint">Manual endpoint test for /api/arc/swap.</p>
          <div className="fieldRow">
            <label htmlFor="tokenIn">Token In</label>
            <input
              id="tokenIn"
              value={swapForm.tokenIn}
              onChange={(event) => {
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
              onChange={(event) => {
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
              onChange={(event) => {
                setSwapForm((current) => ({
                  ...current,
                  amountIn: event.target.value,
                }));
              }}
            />
          </div>
          <button type="submit" disabled={swapState.loading}>
            {swapState.loading ? 'Submitting...' : 'Submit Swap'}
          </button>
          <p className="swapMessage">{swapState.message}</p>
          <pre className="swapPayload">{JSON.stringify(swapState.payload, null, 2)}</pre>
        </form>
      </section>
      <CopilotSidebar
        defaultOpen
        instructions="Help the user operate the Arc Testnet swap workflow and explain failures clearly. Use runArcSwap for execution requests."
        labels={{
          title: 'Arc Testnet Copilot',
          initial: 'Ask me to inspect or run your Arc Testnet swap flow.',
        }}
      />
    </main>
  );
}
