# Vartul by Suma — Proof-of-Recovery network

> Every rupee linked to a verified kilo. Every kilo linked to the person who collected it. Every claim made only once.

Vartul turns recovered waste into a verifiable digital asset and connects it to the sponsor funding that paid for its recovery. It is built with Project Aamhi as the anchor partner and showcases Finternet and DPI capabilities: tokenised attested assets, proof chains, programmable settlement, conditional benefit transfer to field workers, exclusive impact claims and open-network (Beckn) discovery.

**Start here: [Vartul product document](docs/product/Vartul_Product_Document.md)**, the authoritative business, product, policy, legal, technical and governance reference.

## Repository status

The Vartul build is in progress. Until it lands, the runnable application is the earlier v0.2.1 sponsorship demonstration, which the build will replace.

Prerequisites: Node 24.11.1, Foundry 1.8.3 (`forge`, `anvil`) on PATH, pnpm 10.16.1.

```powershell
npx --yes pnpm@10.16.1 install --frozen-lockfile
npx --yes pnpm@10.16.1 demo:run          # http://127.0.0.1:4300
npx --yes pnpm@10.16.1 typecheck
npx --yes pnpm@10.16.1 check:docs
npx --yes pnpm@10.16.1 test:acceptance   # domain + contract tests
npx --yes pnpm@10.16.1 test:demo         # browser tests (stop demo:run first)
```

## Repository map

| Directory | Contents |
|---|---|
| `docs/product/` | The Vartul product document |
| `contracts/` | Solidity contracts and Foundry tests |
| `services/`, `beckn/`, `agents/` | Application services, network adapters and agent components |
| `apps/` | Browser application |
| `schemas/`, `samples/`, `tests/` | Schemas, illustrative sample data and tests |
| `deployment/` | Acceptance scripts and the optional Docker workbench |
| `archive/` | Superseded material, scheduled for deletion (see `archive/README.md`) |

Sample data uses the real Murud taluka (Raigad) villages where Project Aamhi works; all other organisations, all people and all quantities are fictional or illustrative. dINR is a sandbox settlement token, not money.
