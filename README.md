# Aamhi Finternet PoC

## Current handover baseline

For transfer to an implementation team, begin with [HANDOVER.md](HANDOVER.md) and the [versioned release notes](docs/handover/17_Handover_Release.md).

Start with the [handover index](docs/handover/00_Handover_Index.md), [business and product blueprint](docs/handover/01_Business_Use_Case_and_Pilot_Blueprint.md), [technology architecture](docs/handover/02_Technology_Architecture_and_Engineering_Blueprint.md), and [current-state/gap register](docs/handover/03_Current_State_and_Gap_Register.md).

The primary demonstration is sponsored recovery: discover a programme, agree terms, deposit sandbox funding, submit evidence, confirm facility receipt, verify the outcome and release payment. Exceptions require sponsor and Aamhi approval. The original material-sale reference implementation remains available and tested.

The redesigned interface includes a programme overview, guided role tasks, evidence review, a downloadable sponsor report and a separate technical-proof view. **Presentation chapters** can prepare a funded programme, exception review or completed outcome using actual local-chain transactions.

Participant themes identify sponsor, Aamhi, facility and verifier. A visible ledger flow shows the commitment, held funding, verified outcome and automatic settlement. Qualifying verification or the final required exception approval releases payment and records attribution in the same contract transaction; no administrator release is needed.

The handover package also includes comprehensive [foundational context](docs/handover/08_Context_and_Finternet_Foundations.md), [product requirements](docs/handover/09_Product_Requirements_and_Operating_Model.md), [policy and rights](docs/handover/10_Policy_and_Rights_Specification.md), [domain model](docs/handover/11_Domain_Model_and_Data_Dictionary.md), [target architecture](docs/handover/12_Target_Architecture_and_Integration_Contracts.md) and [requirement-to-test traceability](docs/handover/14_Requirements_Traceability_and_Test_Strategy.md).

Prerequisites: Node 24.11.1, Foundry 1.8.3 (`forge` and `anvil`) on PATH; pnpm 10.16.1 and Solidity 0.8.24. No Docker, external RPC or API keys are required for this demonstration.

```powershell
npx --yes pnpm@10.16.1 install --frozen-lockfile
npx --yes pnpm@10.16.1 demo:run
```

Open **http://127.0.0.1:4300** and follow the [local walkthrough](docs/handover/04_Local_Demo_Runbook.md). The launcher starts its own chain on 18545 and catalogue endpoint on 4301. Ctrl+C stops it; relaunch starts fresh.

```powershell
npx --yes pnpm@10.16.1 typecheck
npx --yes pnpm@10.16.1 check:docs
npx --yes pnpm@10.16.1 test:acceptance
npx --yes pnpm@10.16.1 exec playwright install chromium
npx --yes pnpm@10.16.1 test:demo
```

Stop an interactive demo before browser acceptance. See the [roadmap](docs/handover/05_Engineering_Roadmap.md), [decision register](docs/handover/06_Decisions_Risks_and_Open_Questions.md) and [handover checklist](docs/handover/07_Handover_Acceptance_Checklist.md).

After Chromium is installed, `npx --yes pnpm@10.16.1 test:handover` runs all validation stages above as one command.

The new browser/API executes actual local-chain transactions with controlled accounts and sample evidence. Discovery is an HTTP Beckn sandbox, not network-certified interoperability. State is temporary with an ignored inspection snapshot. Database persistence, real authentication, secured evidence, hosted deployment and external payment adapters remain pilot work. Sponsorship records are non-transferable contract entries; the separate original flow demonstrates ERC-1155 material entitlements.

The sections below describe the original material-sale reference baseline. This handover package governs the sponsorship scope where earlier designs differ.

Documentation baseline for the Suma Finternet PoC: a tokenised recovery asset demonstrator using verifiable identity, ERC-1155 assets, Beckn discovery, programmable settlement, attestations, claims, and bounded AI-agent participation.

## Current State

This workspace contains implemented domain services, tested Solidity contracts, the functional sponsorship browser demo, original static console prototypes, schemas and acceptance tests. Consult the handover gap register for precise implementation and simulation boundaries.

## Start Here

- [Project index](docs/00_project/00_README_Project_Index.md)
- [Project build plan](docs/00_project/01_Project_Build_Plan.md)
- [Aamhi rural SWM and OBP context](docs/00_project/02_Aamhi_Rural_SWM_and_OBP_Context.md)
- [Context availability and simulation strategy](docs/00_project/03_Context_Availability_and_Simulation_Strategy.md)
- [Technical architecture](docs/01_architecture/02_Finternet_Technical_Architecture.md)
- [Local toolchain setup](docs/04_security-operations/16_Local_Toolchain_Setup.md)
- [Local environment harness](deployment/environments/local/README.md)
- [Aamhi demo sample context](samples/aamhi-demo/README.md)
- [Developer backlog](docs/05_delivery/19_Backlog_and_Implementation_Tasks.md)
- [End-to-end PoC execution plan](docs/05_delivery/20_End_to_End_PoC_Execution_Plan.md)

## Documentation Map

```text
docs/
  00_project/              Project index and build plan
  01_architecture/         Technical architecture, data placement, transaction sequence
  02_finternet-core/       Identity, assets, dINR, contracts, claims, Beckn
  03_software-design/      APIs, data models, wallets, AI agent design
  04_security-operations/  Security, access, DevOps, environments
  05_delivery/             Test plan, demo runbook, implementation backlog
  superpowers/plans/       Agent-ready implementation plans
deployment/
  environments/local/      Local dependency harness
samples/
  aamhi-demo/              Golden demo scenario and sample data
```

## PoC Baseline

- Public programmable ledger: Ethereum public testnet
- Smart contracts: Solidity
- Recovery asset token: ERC-1155
- Settlement token: permissioned ERC-20-style demo INR (`dINR`)
- Organisational identity: `did:web`
- Credentials: W3C Verifiable Credentials Data Model 2.0
- Discovery and contracting: Beckn Protocol v2.0
- Off-chain state: PostgreSQL, IPFS metadata, private object storage for evidence
- Observability: OpenTelemetry, Prometheus, Grafana

## Boundary Notes

`dINR` is a sandbox settlement token only. It is not legal tender, RBI CBDC, a bank deposit, a regulated stablecoin, redeemable INR, or an investment product.

ERC-1155 ownership in this PoC represents a digital contractual/economic entitlement associated with a verified recovery lot. It should not be described as automatically determining legal title under property law.
