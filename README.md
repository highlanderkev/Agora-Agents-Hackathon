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

This starter uses:
- Arc Agent SDK App Kit: `@circle-fin/app-kit`
- Viem adapter: `@circle-fin/adapter-viem-v2`
- Arc testnet chain: `Arc_Testnet`
- Arc testnet explorer: https://testnet.arcscan.app/
