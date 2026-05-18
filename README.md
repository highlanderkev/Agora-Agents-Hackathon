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
