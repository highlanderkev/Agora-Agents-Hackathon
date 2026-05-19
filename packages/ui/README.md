# Agora Agents UI

Next.js + CopilotKit frontend for interacting with local custom agent endpoints.

## Multi-Agent Runtime

The UI now uses an adapter registry so routes can target multiple agents through a common contract.

- `arc-swap` adapter: executes Arc Testnet swaps with server wallet access restrictions.
- `defi-agent` adapter: calls a Python HTTP service (agent-owned LLM configuration).

### API endpoints

- `GET /api/agents` - list registered agents and selected default agent id.
- `GET /api/agents/[agentId]/health` - fetch health status for one agent.
- `POST /api/agents/[agentId]/execute` - execute an action with `{ action, input }`.
- `POST /api/arc/swap` - compatibility endpoint that delegates to `arc-swap` action `swap`.

### Copilot actions

- `runArcSwap(tokenIn, tokenOut, amountIn)`
- `runAgentAction(agentId, action, input)`

### Environment variables

- `DEFAULT_AGENT_ID` (optional, default `arc-swap`)
- `DEFI_AGENT_SERVICE_URL` (optional, default `http://127.0.0.1:8001`)
- `DEFI_AGENT_TIMEOUT_MS` (optional, default `15000`)

## Run

```bash
npm install
npm run dev
```

## TypeScript checks

```bash
npm run typecheck
npm run lint
npm run build
npm run test
```

The app points CopilotKit to `/api/copilotkit` in this workspace.
