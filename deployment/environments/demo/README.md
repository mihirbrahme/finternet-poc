# Demo Environment

This environment is the Packet 11 public-demo handover target. It is ready for dry-run deployment planning now, and it can be switched to a public Ethereum testnet only when the team provides real RPC and deployer credentials.

## Dependency Modes

```text
Ethereum: NOT_CONNECTED until live deploy, then TESTNET_REAL
Object Storage: LOCAL_MOCK or SANDBOX_ADAPTER until hosted evidence storage exists
IPFS: LOCAL_MOCK until a pinning adapter is connected
Beckn: SANDBOX_ADAPTER until an external network endpoint is connected
Smart accounts: LOCAL_MOCK / adapter boundary until ERC-4337 provider is integrated
OBP Registry: NOT_CONNECTED
EPR Registry: NOT_CONNECTED
```

## Dry-Run Contract Deployment

Dry-run is the default. It builds a dependency-ordered deployment manifest without submitting transactions or inventing public-chain addresses.

```bash
npx pnpm@10.16.1 deploy:demo
npx pnpm@10.16.1 deploy:demo -- --write
```

Default dry-run output path when `--write` is used:

```text
deployment/deploy-contracts.demo.json
```

## Live Contract Deployment

Live mode requires a public testnet RPC URL and a deployer private key. Do not store the key in the repository.

PowerShell:

```powershell
$env:DEMO_DEPLOY_MODE="live"
$env:DEMO_CHAIN_NAME="selected-public-testnet"
$env:DEMO_RPC_URL="<https-rpc-url>"
$env:DEMO_DEPLOYER_PRIVATE_KEY="<private-key>"
npx pnpm@10.16.1 deploy:demo -- --write
```

Bash:

```bash
DEMO_DEPLOY_MODE=live \
DEMO_CHAIN_NAME=selected-public-testnet \
DEMO_RPC_URL=<https-rpc-url> \
DEMO_DEPLOYER_PRIVATE_KEY=<private-key> \
npx pnpm@10.16.1 deploy:demo -- --write
```

The script deploys in this order:

```text
ParticipantRegistry
CredentialRegistry
RecoveryAsset
DemoINR
AttestationRegistry
ClaimRegistry
SettlementEngine
```

If live mode is selected without `DEMO_RPC_URL` or `DEMO_DEPLOYER_PRIVATE_KEY`, the script fails before deployment.

## Contract Address Registry

The source-of-truth handover registry is:

```text
deployment/contract-addresses.demo.json
```

It intentionally uses `PENDING_LIVE_DEPLOYMENT` until an actual chain deployment has occurred. After live deployment, copy the deployed contract addresses, transaction hashes and block numbers from the live deploy output into that file.

## Demo Seed

The current seed script reuses the supported Packet 9 demo services. It creates the same Aamhi participants, credentials, recovery asset, evidence, tokenisation, Beckn sandbox catalogue, settlement, receipt attestation and `OBP_READY_RECOVERY_CLAIM` summary without direct database edits.

```bash
npx pnpm@10.16.1 seed:demo
npx pnpm@10.16.1 seed:demo -- --write
```

Default seed output path when `--write` is used:

```text
deployment/demo-seed.summary.json
```

When hosted demo APIs exist, switch to:

```bash
DEMO_SEED_MODE=live-api DEMO_API_BASE_URL=<https-api-url> npx pnpm@10.16.1 seed:demo
```

The `live-api` mode is intentionally blocked until authenticated API adapters are connected. Production-style demo seeding must use participant, credential, asset, evidence, tokenisation, Beckn, settlement, attestation and claim APIs, not database patching.

## Boundaries

- dINR is sandbox programmable settlement value only.
- `OBP_READY_RECOVERY_CLAIM` is evidence-backed, quantity-bounded and `isOfficialCredit=false`.
- The PoC does not issue official OBP credits, EPR certificates or government claims.
