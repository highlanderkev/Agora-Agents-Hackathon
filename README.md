# Agora Agents Hackathon

Starter project space for the Agora agent hackathon using the Arc Agent SDK (App Kit) and Arc testnet.

## Quick start

Requires Node.js 20.18.0 or newer.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your environment file:

   ```bash
   cp .env.example .env
   ```

3. Update `.env` with:
   - `PRIVATE_KEY`: wallet private key for testnet usage
   - `KIT_KEY`: Arc/Circle kit key

4. Run the Arc testnet starter flow:

   ```bash
   npm start
   ```

`npm start` now compiles TypeScript first and then runs the built package CLI from `packages/arc-swap/dist/cli.js`.

## TypeScript workflow

- `npm run typecheck`: strict type checks for root and UI
- `npm test`: package-scoped test flow (`npm run test:arc-swap` + `npm run test:ui`)
- `npm run build:ts`: builds shared package and root/test TS outputs

This starter uses:
- Arc Agent SDK App Kit: `@circle-fin/app-kit`
- Viem adapter: `@circle-fin/adapter-viem-v2`
- Arc testnet chain: `Arc_Testnet`
- Arc testnet explorer: https://testnet.arcscan.app/

## CopilotKit UI (Next.js)

A frontend scaffold now lives in `packages/ui` for interacting with custom AI agents.

1. Install UI dependencies:

   ```bash
   npm --prefix packages/ui install
   ```

2. Start the UI:

   ```bash
   npm run dev:ui
   ```

3. Open http://localhost:3000

Current status:
- CopilotKit provider and sidebar UI are wired.
- Runtime action `runArcSwap(tokenIn, tokenOut, amountIn)` is registered in `/api/copilotkit`.
- Runtime route `/api/copilotkit` is available and registers backend action `runArcSwap`.

## Local Swap API Endpoint

The Next.js app now includes a local endpoint at `/api/arc/swap`.

- `GET /api/arc/swap`: health/usage metadata
- `POST /api/arc/swap`: executes `runArcTestnetSwap` from the shared package `@agora/arc-swap`
- Swap execution is intentionally limited to local development requests because it uses the server-side wallet configured by `PRIVATE_KEY`.

Example request:

```bash
curl -X POST http://localhost:3000/api/arc/swap \
   -H "Content-Type: application/json" \
   -d '{"tokenIn":"USDC","tokenOut":"EURC","amountIn":"0.01"}'
```

## Copilot Runtime Endpoint

The UI app includes `/api/copilotkit` for CopilotKit chat runtime traffic.

- It registers backend action `runArcSwap` that uses the shared package `@agora/arc-swap`.
- Transaction-capable runtime requests are only enabled from local development because they use the server-side wallet configured by `PRIVATE_KEY`.
- For LLM-driven chat responses and tool selection, set:

```bash
OPENAI_API_KEY=your_openai_api_key
```

- Optional model override:

```bash
COPILOTKIT_MODEL=gpt-4o-mini
```

If `OPENAI_API_KEY` is missing, the endpoint stays reachable but uses `EmptyAdapter`, which means the chat runtime cannot provide useful model responses.

## DeFi Agent (Python)

`packages/defi-agent` is a Python package (`agora-defi-agent`) that provides an LLM-driven DeFi strategy loop built on the [Almanak SDK](https://almanak.co).

### Prerequisites

- Python 3.12+
- [uv](https://github.com/astral-sh/uv) package manager

### Setup

1. Install dependencies:

   ```bash
   cd packages/defi-agent
   uv sync --all-groups
   ```

2. Create your environment file:

   ```bash
   cp .env.example .env
   ```

3. Update `.env` with:

   | Variable | Description | Default |
   |---|---|---|
   | `AGENT_LLM_API_KEY` | LLM provider API key (required for real mode) | — |
   | `AGENT_LLM_BASE_URL` | OpenAI-compatible base URL | `https://api.openai.com/v1` |
   | `AGENT_LLM_MODEL` | Model to use | `gpt-4o` |
   | `AGENT_SHARE_FULL_TRANSCRIPT` | Share full tool args/results with LLM | `false` |
   | `ALMANAK_NETWORK` | Almanak network (`anvil` for local) | `anvil` |
   | `ALMANAK_GATEWAY_URL` | Almanak gateway gRPC address | `http://127.0.0.1:50051` |

### Strategies

#### RSI Swap (`examples/rsi_swap`)

Buys ETH with USDC when RSI is below the buy threshold and sells when above the sell threshold.

- **Chain**: Arbitrum
- **Tokens**: WETH, USDC, ETH
- **Policy limits**: max $100/trade · $500/day · $2,000 position · 5 trades/hour · 30 s cooldown · 5% stop-loss
- **Tools**: `get_price`, `get_balance`, `get_indicator`, `swap_tokens`, `save_agent_state`, `load_agent_state`, `record_decision`
- **Config** (`config.json`): `rsi_period` (14), `buy_threshold` (30), `sell_threshold` (70), `max_trade_usd` (100)

#### LP Manager (`examples/lp_manager`)

Maintains a concentrated-liquidity LP range around current price; closes and reopens when price drifts out of range.

- **Chain**: Avalanche
- **Tokens**: WAVAX, USDC, AVAX
- **Policy limits**: max $150/trade · $750/day · $3,000 position · 4 trades/hour · 60 s cooldown · 6% stop-loss
- **Tools**: `get_price`, `get_balance`, `open_lp_position`, `close_lp_position`, `swap_tokens`, `save_agent_state`, `load_agent_state`, `record_decision`

#### Yield Farmer (`examples/yield_farmer`)

Rotates idle stablecoins into lending protocols based on momentum and rate signals.

- **Chain**: Avalanche
- **Tokens**: USDC, WAVAX, AVAX
- **Policy limits**: max $200/trade · $1,000/day · $5,000 position · 3 trades/hour · 120 s cooldown · 7% stop-loss
- **Tools**: `get_price`, `get_balance`, `get_indicator`, `supply_lending`, `withdraw_lending`, `swap_tokens`, `save_agent_state`, `load_agent_state`, `record_decision`

### Running Examples

Each example supports a `--mock` flag to run without a live LLM or network connection and a `--once` flag to execute a single decision cycle.

```bash
# RSI swap — mock mode (no API key required)
uv run python examples/rsi_swap/run.py --mock --once

# LP manager — mock mode
uv run python examples/lp_manager/run.py --mock --once

# Yield farmer — mock mode
uv run python examples/yield_farmer/run.py --mock --once

# Real mode (requires AGENT_LLM_API_KEY; an Almanak gateway is only needed
# when using a real Almanak-backed tool executor instead of the demo executor)
uv run python examples/rsi_swap/run.py --once
```

Decision traces are written to `traces/agent_decisions.jsonl` (created automatically).

### Architecture

| Component | Description |
|---|---|
| `DeFiAgent` | Top-level agent that wires config, policy, LLM client, and tool executor |
| `AgentConfig` | Pydantic-settings config loaded from environment / `.env` |
| `run_agent_loop` | Core step loop (max 6 steps): calls LLM → executes tool → records transcript |
| `AgentPolicy` | Almanak SDK policy that enforces per-trade and daily spend limits |
| `OpenAICompatibleLLMClient` | HTTP client for any OpenAI-compatible API |
| `MockLLMClient` | Deterministic scripted responses for testing |

### Development

```bash
# Lint
uv run ruff check src tests examples

# Type-check
uv run mypy src

# Tests
uv run pytest tests
```
