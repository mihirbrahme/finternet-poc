# Vartul by Suma — Proof-of-Recovery network

> Every rupee linked to a verified kilo. Every kilo linked to the person who collected it. Every claim made only once.

Vartul turns recovered waste into a verifiable digital asset and connects it to the sponsor funding that paid for its recovery. It is built with Project Aamhi as the anchor partner and showcases Finternet and DPI capabilities: tokenised attested assets, proof chains, programmable settlement, conditional benefit transfer to field workers, exclusive impact claims and open-network (Beckn) discovery.

**Start here: [Vartul product document](docs/product/Vartul_Product_Document.md)**, the authoritative business, product, policy, legal, technical and governance reference. The seeded demonstration data is described in the [demo dataset](docs/product/Vartul_Demo_Dataset.md).

## Run the demonstration

Prerequisites: Node 24.11.1, Foundry 1.8.3 (`forge`, `anvil`) on PATH, pnpm 10.16.1 (`corepack enable` or `npx --yes pnpm@10.16.1`).

```powershell
pnpm install --frozen-lockfile
pnpm demo                # builds the web app and serves http://127.0.0.1:4300
```

The first start compiles the contracts and seeds six months of Murud history plus eleven scene snapshots (about two minutes). Later starts load the saved snapshots in seconds. Open **Presenter** in the top bar to step through the eleven demonstration scenes; each scene resets the ledger to its starting state and runs its steps live.

AI assistants (sponsor and verifier) run in a labelled scripted mode by default. To use a live Claude model, set `OPENROUTER_API_KEY` (and `VARTUL_AI_MODEL` to your gateway's model slug) or `ANTHROPIC_API_KEY` before starting; see [`.env.example`](.env.example).

## Test

```powershell
pnpm typecheck
pnpm check:docs
pnpm test:acceptance     # contracts (unit, lifecycle, fuzz, invariants), service suites, testnet simulation
pnpm test:demo           # browser: all eleven scenes through the presenter, every role surface
```

## Public test network

The contracts are ready for a public test network, but the demonstration does not deploy them (product document, V18). `pnpm testnet plan` shows the deployment; `pnpm testnet simulate` deploys to a local chain that uses Base Sepolia's chain ID, checks the wiring and writes [the simulated public end state](deployment/testnet/base-sepolia.simulated.json), which the ledger explorer displays. `pnpm testnet deploy --network base-sepolia --confirm-public` performs a real deployment with `VARTUL_TESTNET_RPC_URL` and `VARTUL_DEPLOYER_KEY`.

## Repository map

| Directory | Contents |
|---|---|
| `docs/product/` | Product document and demo dataset specification |
| `contracts/src/vartul/`, `contracts/test/vartul/` | Solidity contracts and Foundry tests |
| `services/vartul/` | Ledger runtime, domain API, indexer, anomaly engine, credentials, Beckn sandbox, assistants, seeder |
| `apps/vartul-web/` | The web application: every role surface and the scene presenter |
| `tests/vartul/`, `tests/browser/` | Service and browser acceptance tests |
| `deployment/` | Acceptance, documentation and public test-network scripts |

Earlier versions (the v0.2 sponsorship demonstration) are preserved only in git history, at the `v0.2.0-handover` and `v0.2.1-handover` tags.

Sample data uses the real Murud taluka (Raigad) villages where Project Aamhi works; all other organisations, all people and all quantities are fictional or illustrative. dINR is a sandbox settlement token, not money.
