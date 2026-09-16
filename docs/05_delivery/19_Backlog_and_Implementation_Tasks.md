# 19 — Backlog and Implementation Tasks
## Finternet PoC — Developer-Ready Delivery Backlog

## 1. Purpose

This document converts the architecture into implementation epics and tasks.

The backlog is organised by Finternet capability rather than by frontend/backend/blockchain silos.

Each slice should produce an independently demonstrable capability.

---

# EPIC 0 — Repository and Engineering Foundation

## Goal

Create the engineering baseline required for all subsequent work.

## Tasks

### E0-01 Repository Setup

Create repository structure:

```text
/contracts
/services
/apps
/schemas
/beckn
/credentials
/deployment
/tests
/docs
```

### E0-02 CI Pipeline

Configure:

- linting;
- unit tests;
- Solidity compilation;
- contract tests;
- dependency checks;
- build artifacts.

### E0-03 Local Environment

Provide Docker/dev setup for:

- PostgreSQL;
- MinIO;
- local EVM;
- backend services;
- frontends.

### E0-04 Configuration and Secrets

Implement environment-based configuration and secrets abstraction.

### E0-05 Contract Deployment Framework

Use Hardhat or Foundry deployment scripts.

### E0-06 Base Observability

Add:

- structured logging;
- OpenTelemetry tracing;
- application metrics.

## Done When

A developer can clone the repository and run the base environment from documented commands.

---

# EPIC 1 — Participant Identity and Trust

## Goal

Create trusted organisational identities that are independent of blockchain wallet addresses.

## Tasks

### E1-01 Participant Data Model

Implement Participant entity and identifiers.

### E1-02 DID Service

Generate and publish `did:web` documents.

### E1-03 Credential Issuer

Implement W3C VC 2.0 issuance.

### E1-04 Credential Verifier

Verify:

- signature;
- issuer;
- validity;
- status;
- subject.

### E1-05 ParticipantRegistry.sol

Implement participant mapping and roles.

### E1-06 CredentialRegistry.sol

Implement minimum on-chain eligibility state.

### E1-07 Credential Revocation

Synchronize revoked/expired credentials with on-chain eligibility.

### E1-08 Admin UI

Create onboarding/credential administration screens.

### E1-09 Tests

Cover issuance, expiry, revocation and unauthorized transaction paths.

## Done When

A credentialled processor is accepted by smart-contract policy and a revoked processor is rejected.

---

# EPIC 2 — Smart Accounts and Transaction Authority

## Goal

Provide organisation-level blockchain accounts without exposing crypto-style UX.

## Tasks

### E2-01 ERC-4337 Account Integration

Select and integrate smart-account implementation.

### E2-02 Bundler Integration

Configure UserOperation submission.

### E2-03 Paymaster

Configure sponsored testnet gas for demo accounts.

### E2-04 Signer Policy

Define:

- admin signer;
- operational signer;
- delegated/session signer.

### E2-05 AI Session Authority

Implement bounded AI transaction permissions.

### E2-06 Recovery/Rotation

Implement signer/key rotation flow.

## Done When

Business user can execute a blockchain transaction without manual gas management and AI authority can be independently constrained.

---

# EPIC 3 — Recovery Asset and Evidence

## Goal

Create the canonical physical recovery record and its verifiable evidence package.

## Tasks

### E3-01 Recovery Asset Schema

Implement canonical recovery asset JSON schema.

### E3-02 Evidence Service

Upload and store:

- images;
- weighment records;
- receipt documents;
- supporting evidence.

### E3-03 Evidence Hashing

Compute cryptographic hashes and evidence root.

### E3-04 Metadata Generator

Generate public-safe ERC-1155 metadata.

### E3-05 IPFS Publication

Publish token metadata to IPFS.

### E3-06 Verification Workflow

Support verification status and signed verifier action.

## Done When

A verified off-chain asset record produces deterministic metadata and evidence hashes ready for token minting.

---

# EPIC 4 — ERC-1155 RWA Tokenisation

## Goal

Represent verified recovery assets as transferable on-chain economic assets.

## Tasks

### E4-01 RecoveryAsset.sol

Implement ERC-1155 contract.

### E4-02 Token ID Strategy

Implement mapping between canonical Asset ID and Token ID.

### E4-03 Minting

Allow mint only for authorized verified assets.

### E4-04 Quantity Model

Implement:

**1 token unit = 1 kg**

for the initial PoC.

### E4-05 Eligibility-Controlled Transfer

Check destination participant/credential status.

### E4-06 Lock/Reservation

Support settlement lock or escrow custody.

### E4-07 Retirement/Consumption

Support controlled retirement where required.

### E4-08 Chain Indexing

Index balances, events and token state into application read model.

### E4-09 Explorer View

Show token provenance and balance history.

## Done When

1,000 token units can be minted to Aamhi, 500 can be locked/transferred, and unauthorized transfer fails.

---

# EPIC 5 — Programmable Money

## Goal

Implement sandbox tokenised settlement value.

## Tasks

### E5-01 DemoINR.sol

Implement ERC-20 dINR.

### E5-02 Treasury Roles

Implement controlled mint/burn.

### E5-03 Eligible Holder Rules

Restrict balances/transfers to approved PoC accounts if configured.

### E5-04 Funding Tool

Create admin function/UI to fund test participants.

### E5-05 Balance UI

Display dINR balances in participant console.

## Done When

Buyer can receive test dINR and move it into settlement escrow under policy controls.

---

# EPIC 6 — Settlement Engine

## Goal

Exchange tokenised asset and tokenised value programmatically.

## Tasks

### E6-01 SettlementEngine.sol

Implement settlement state machine.

### E6-02 Create Settlement

Capture:

- seller;
- buyer;
- token ID;
- quantity;
- price/payment;
- expiry;
- required conditions.

### E6-03 Asset Lock

Lock/custody required ERC-1155 quantity.

### E6-04 dINR Lock

Lock required settlement amount.

### E6-05 Atomic DvP

Transfer asset and dINR as one final economic execution.

### E6-06 Refund / Expiry

Handle timeout and failed conditions.

### E6-07 Quantity-Adjusted Settlement

Support accepted received quantity where configured.

### E6-08 Multi-Party Payment

Support split distribution across configured recipients.

### E6-09 Settlement API/UI

Expose settlement preparation, funding, status and completion.

## Done When

500 ERC-1155 units and 10,000 dINR settle atomically under verified conditions.

---

# EPIC 7 — Attestation and Claims

## Goal

Bring trusted physical-world events and derived rights into the programmable transaction.

## Tasks

### E7-01 Attestation Schema

Define signed attestation payload.

### E7-02 Attestation Signing

Allow credentialled participant to sign event assertion.

### E7-03 Attestation Verification

Verify:

- DID;
- signature;
- credential;
- authority;
- transaction relation.

### E7-04 AttestationRegistry.sol

Anchor required attestations on-chain.

### E7-05 ClaimRegistry.sol

Implement claim creation and consumption.

### E7-06 Quantity Controls

Prevent claim quantity exceeding underlying asset quantity.

### E7-07 Duplicate/Conflict Rules

Implement anti-double-counting checks.

## Done When

Processor receipt can satisfy settlement condition and an incompatible duplicate claim is rejected.

---

# EPIC 8 — Beckn Open Discovery

## Goal

Allow an independently operated buyer system to discover and contract around tokenised assets.

## Tasks

### E8-01 Provider Node

Expose Aamhi/recovery provider catalogue.

### E8-02 Catalog Generation

Map Recovery Asset → Beckn catalogue representation.

### E8-03 Discovery Service

Enable consumer-side discovery.

### E8-04 Consumer Node

Build independent buyer integration.

### E8-05 Select / Contracting

Implement required Beckn contracting interactions.

### E8-06 Identifier Mapping

Map:

- Beckn item ↔ Asset ID / Token ID;
- Beckn Contract ID ↔ Settlement ID.

### E8-07 Chain Reconciliation

Before confirmation, verify current Ethereum balance/lock state.

### E8-08 Stale Catalogue Handling

Reject/reprice/unavailable response when catalogue differs from chain state.

## Done When

Buyer application can discover Aamhi asset without reading Aamhi internal database and can proceed into an Ethereum-backed settlement.

---

# EPIC 9 — Application Interfaces

## Goal

Provide minimum usable interfaces for demo participants.

## Tasks

### E9-01 Admin Console

- participants;
- credentials;
- treasury funding;
- environment state.

### E9-02 Originator Console

- create asset;
- evidence;
- verification;
- mint;
- publish;
- offers;
- settlements.

### E9-03 Buyer App

Must operate independently.

Functions:

- discover;
- inspect provenance;
- verify credential;
- inspect chain state;
- select;
- fund settlement;
- view acquired assets.

### E9-04 Processor/Verifier Interface

- inspect transaction;
- receipt quantity;
- upload evidence;
- sign attestation.

### E9-05 Finternet Explorer

Show:

- participant;
- DID;
- credential status;
- asset;
- token balances;
- claims;
- attestation;
- settlement;
- transaction hashes.

## Done When

End-to-end demo can be executed without command-line operations other than optional technical inspection.

---

# EPIC 10 — AI Agent

## Goal

Demonstrate machine participation in open economic discovery and transaction preparation.

## Tasks

### E10-01 Agent Tool Layer

Expose tools for:

- discoverAssets;
- getAsset;
- verifyParticipant;
- getChainState;
- getCredentialStatus;
- prepareOffer;
- prepareSettlement.

### E10-02 Deterministic Policy Engine

Enforce hard constraints outside LLM reasoning.

### E10-03 Human Approval

Require approval for configured transaction stage.

### E10-04 Session/Delegated Key

Connect AI execution to bounded smart-account permissions.

### E10-05 Audit Trail

Log:

- user instruction;
- tools called;
- returned facts;
- proposed transaction;
- approval;
- submitted transaction.

## Done When

AI can independently discover and prepare a valid transaction but cannot exceed delegated limits.

---

# EPIC 11 — Security and Hardening

## Tasks

- API authorization tests;
- rate limits;
- secrets/KMS integration;
- dependency scanning;
- Solidity static analysis;
- fuzz/property tests;
- contract role review;
- emergency/pause procedures;
- evidence access control;
- backup/restore;
- audit log integrity;
- demo-environment incident procedure.

## Done When

No unresolved critical security defect remains for the PoC environment.

---

# EPIC 12 — Public Demo Deployment

## Tasks

### E12-01 Cloud Deployment

Deploy APIs, apps, data and object storage.

### E12-02 Domain and TLS

Configure required endpoints.

### E12-03 Public Testnet Contracts

Deploy and verify contracts.

### E12-04 IPFS

Publish production-demo metadata.

### E12-05 Demo Identities

Create all required participants, DIDs and VCs.

### E12-06 Demo Funding

Provide dINR and gas sponsorship.

### E12-07 Seed Demo Asset

Create predictable demo recovery lot.

### E12-08 Health Checks

Create operational pre-demo checklist.

---

# EPIC 13 — Test and Acceptance

Implement the complete test plan in `17_Test_and_Acceptance_Plan.md`.

Minimum final tests:

- happy-path E2E;
- revoked credential;
- stale Beckn data;
- insufficient dINR;
- insufficient token quantity;
- invalid attestation;
- duplicate claim;
- AI authority violation;
- evidence-hash mismatch.

---

# EPIC 14 — Demo and Handover

## Tasks

### E14-01 Demo Reset Script

Create repeatable reset/setup process.

### E14-02 Demo Runbook

Implement `18_Demo_Runbook.md`.

### E14-03 Architecture Package

Bundle Packs 1–5.

### E14-04 Contract Address Registry

Document testnet deployments.

### E14-05 API Documentation

Publish OpenAPI/API reference.

### E14-06 Schema Package

Publish JSON Schemas and examples.

### E14-07 Known Limitations

Document PoC limitations and production gaps.

---

# 2. Recommended Delivery Sequence

Use vertical capability slices.

## Milestone A — Trusted Participant

Epics:

- E0;
- E1;
- E2 baseline.

Demonstration:

> Organisation → DID → VC → smart account.

---

## Milestone B — Tokenised Asset

Epics:

- E3;
- E4.

Demonstration:

> Verified physical lot → ERC-1155 asset.

---

## Milestone C — Open Discovery

Epic:

- E8 baseline;
- E9 buyer/originator interfaces.

Demonstration:

> Independent buyer discovers tokenised asset through Beckn.

---

## Milestone D — Programmable Transaction

Epics:

- E5;
- E6.

Demonstration:

> ERC-1155 + dINR locked into settlement and exchanged.

---

## Milestone E — Physical Attestation

Epic:

- E7.

Demonstration:

> Processor-signed real-world event triggers settlement condition.

---

## Milestone F — Agentic Interaction

Epic:

- E10.

Demonstration:

> AI discovers, validates and prepares transaction under bounded authority.

---

## Milestone G — Final Finternet PoC

Epics:

- E11;
- E12;
- E13;
- E14.

Demonstration:

> Full public-testnet Finternet transaction from identity through atomic settlement.

---

# 3. Dependencies

Critical dependency chain:

```text
Participant / DID / VC
        ↓
Smart Account
        ↓
Recovery Asset + Evidence
        ↓
ERC-1155 Minting
        ↓
Beckn Publication
        ↓
Buyer Discovery
        ↓
dINR + Settlement
        ↓
Attestation
        ↓
Atomic DvP
        ↓
AI / Advanced Demo
```

Some work can run in parallel, but economic transaction implementation should not bypass the identity and asset semantics agreed earlier.

---

# 4. Suggested Workstreams

### Smart Contracts

Own:

- registries;
- ERC-1155;
- dINR;
- settlement;
- attestations;
- claims.

### Identity / Trust

Own:

- DIDs;
- VCs;
- account binding;
- eligibility synchronization.

### Platform / APIs

Own:

- canonical models;
- services;
- evidence;
- blockchain integration;
- indexing.

### Open Network

Own:

- Beckn Provider Node;
- discovery;
- Consumer Node;
- contract mappings.

### Frontend

Own:

- Admin;
- Originator;
- Buyer;
- Processor;
- Explorer.

### AI

Own:

- agent;
- tools;
- deterministic constraints;
- smart-account delegation.

### DevSecOps

Own:

- environments;
- CI/CD;
- secrets;
- observability;
- deployment;
- hardening.

---

# 5. Initial Definition of Done for Entire Build

The PoC is complete only when a stakeholder can witness this sequence on the public demo environment:

```text
Credentialled Aamhi
        ↓
Verified physical recovery lot
        ↓
ERC-1155 token
        ↓
Beckn publication
        ↓
Independent buyer discovery
        ↓
Credential and token verification
        ↓
Contract / settlement creation
        ↓
ERC-1155 asset lock
+
dINR money lock
        ↓
Credentialled processor attestation
        ↓
Atomic DvP
        ↓
Buyer owns asset
Aamhi owns payment
        ↓
Claims / provenance / transaction visible
        ↓
Public Ethereum evidence available
```

Anything less proves only a subset of the intended Finternet architecture.
