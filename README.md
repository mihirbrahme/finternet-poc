# Finternet PoC

Documentation baseline for the Suma Finternet PoC: a tokenised recovery asset demonstrator using verifiable identity, ERC-1155 assets, Beckn discovery, programmable settlement, attestations, claims, and bounded AI-agent participation.

## Current State

This workspace is currently a documentation-first project pack. The implementation folders for contracts, services, apps, schemas, deployment, tests, and sample data should be created when those artifacts are actually introduced.

## Start Here

- [Project index](docs/00_project/00_README_Project_Index.md)
- [Project build plan](docs/00_project/01_Project_Build_Plan.md)
- [Aamhi rural SWM and OBP context](docs/00_project/02_Aamhi_Rural_SWM_and_OBP_Context.md)
- [Context availability and simulation strategy](docs/00_project/03_Context_Availability_and_Simulation_Strategy.md)
- [Technical architecture](docs/01_architecture/02_Finternet_Technical_Architecture.md)
- [Local toolchain setup](docs/04_security-operations/16_Local_Toolchain_Setup.md)
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
