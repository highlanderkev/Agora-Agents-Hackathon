import { CopilotSidebar } from '@copilotkit/react-core/v2';

export default function Home() {
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
