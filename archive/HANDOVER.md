# Finternet PoC — team handover

## Begin here

This project continues the `v0.2.1-handover` sponsorship baseline. It connects a sponsor's funded purpose to evidence, facility receipt, verifier acceptance, automatic settlement and bounded outcome attribution. The current working tree has a subsequent [repository cleanup](docs/handover/18_Repository_Scope.md); the original tag and verified ZIP remain frozen at their released source.

The product also showcases reusable Finternet capabilities. The business/architecture foundation covers the broader platform, while the demo implements a focused programme profile. No public deployment, official credit, live financial instrument or external network certification is asserted.

## Reading order

1. [Handover index](docs/handover/00_Handover_Index.md) — audience-specific paths through all specifications.
2. [Business and product blueprint](docs/handover/01_Business_Use_Case_and_Pilot_Blueprint.md).
3. [Technology architecture](docs/handover/02_Technology_Architecture_and_Engineering_Blueprint.md).
4. [Current state and gaps](docs/handover/03_Current_State_and_Gap_Register.md).
5. [Demo and presenter runbook](docs/handover/04_Local_Demo_Runbook.md).
6. [Prioritized engineering roadmap](docs/handover/05_Engineering_Roadmap.md).
7. [Decisions and stakeholder validation](docs/handover/06_Decisions_Risks_and_Open_Questions.md).
8. [Release notes and package instructions](docs/handover/17_Handover_Release.md).

The index also links detailed foundations, product requirements, rights/policy, data dictionary, target architecture/adapters, experience design, traceability, operations and sources. Earlier material-sale specifications remain references; sponsorship documents take precedence where semantics differ.

## Run the product walkthrough

Prerequisites: Node 24.11.1, Foundry 1.8.3 with `forge`/`anvil` on PATH; pnpm 10.16.1, Solidity 0.8.24. The first compiler installation may require internet access.

```powershell
npx --yes pnpm@10.16.1 install --frozen-lockfile
npx --yes pnpm@10.16.1 demo:run
```

Open **http://127.0.0.1:4300**. Follow the guided next step or choose **Presentation chapters**. Roles use distinct colours. The proof view distinguishes dINR, programme commitments and attribution and shows the actual chain events.

Verification that meets the terms automatically settles payment in the same transaction. For an exception, the final required approval does so. No administrator release is needed. The initial milestone demonstrates 500 kg; the second accepts 450 kg by joint exception without changing the actual quantity.

## Verify

Stop the interactive demo before browser testing.

```powershell
npx --yes pnpm@10.16.1 exec playwright install chromium
npx --yes pnpm@10.16.1 test:handover
```

The accompanying package's `VALIDATION.md` records the exact source tree and executed results. Screenshots illustrate the UI; they are not physical recovery evidence. Recipient acceptance remains a separate step.

## First engineering priorities

Validate actual operating responsibilities and funding access with Aamhi/sponsor. Then extract the domain/API boundary; add PostgreSQL persistence, operation idempotency and recovery; implement real identity, secure signing and evidence controls; review/audit contract and custody design before live value. Proceed to independent Beckn integration, persistent indexing and hosted pilot operations. Use the roadmap's acceptance gates rather than marking designed capabilities complete.

## Repository and package

Repository: https://github.com/mihirbrahme/finternet-poc. The handover tag identifies the exact source baseline. `MANIFEST.md` in the complete bundle identifies the commit, source tree, inventory and source ZIP checksum. The complete ZIP has a separate checksum sidecar. Generated dependencies, wallets, chain state, compiler artifacts and credentials are excluded.
