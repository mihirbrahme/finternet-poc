# End-to-End PoC Execution Plan

**Project:** Suma Finternet PoC - Aamhi Rural SWM Recovery Asset Demonstrator  
**Purpose:** Define the practical delivery sequence for building the full PoC while keeping implementation grounded in the documentation and domain context.

---

## 1. Execution Strategy

Build the PoC as vertical capability slices.

Each slice must produce a working, demonstrable outcome that advances the same end-to-end story:

> Aamhi recovers a rural non-biodegradable waste lot, evidence is captured and verified, the lot becomes a tokenised recovery asset, an independent buyer discovers it, programmable value and asset units are locked, a physical receipt attestation triggers settlement, and recovery/OBP-ready claims are created without double counting.

Do not build isolated technical layers that cannot be demonstrated together.

Implementation should be subagent-driven only. Each slice should be assigned as a bounded packet to a focused subagent, reviewed by the main agent, and integrated only after its validation evidence is clear.

Recommended execution reference:

- `../superpowers/plans/2026-09-16-finternet-poc-end-to-end.md`

---

## 2. Build Philosophy

1. Keep UI light and operational.
2. Prefer real internal rules over fake happy-path screens.
3. Use simulated external dependencies where necessary.
4. Make every simulated dependency explicit and replaceable.
5. Keep canonical IDs stable across APIs, contracts, Beckn, evidence, claims and UI.
6. Use the explorer as the main proof surface.
7. Keep dINR, OBP, EPR and legal-title boundaries visible.

---

## 3. Target Applications

### Admin Console

Purpose:

- participant setup;
- DID and credential management;
- smart-account binding;
- dINR funding;
- dependency health/mode display;
- demo reset operations.

Build first because every other slice needs trusted participants.

### Aamhi Originator Console

Purpose:

- create rural recovery lot;
- capture material, site, route and weight;
- upload evidence;
- request/see verification;
- tokenise lot;
- publish lot;
- track offers, settlements and claims.

### Independent Buyer Console

Purpose:

- discover assets through Beckn;
- inspect provenance;
- verify credentials and token state;
- select quantity;
- confirm terms;
- fund settlement;
- view acquired holdings.

This console must remain logically independent from the Aamhi console.

### Processor / Verifier Console

Purpose:

- inspect assigned asset or settlement;
- verify lot evidence;
- sign verification, receipt and processing attestations;
- upload receipt/processing evidence.

This can be a combined interface for the first PoC.

### Finternet Explorer

Purpose:

- show the complete transaction graph;
- distinguish off-chain, signed and on-chain facts;
- expose transaction hashes and contract state;
- show claims and anti-double-counting state.

This is the most important demo surface.

### AI Agent Interface

Purpose:

- accept procurement intent;
- discover assets;
- verify credentials/token state;
- prepare a transaction proposal;
- show approval/audit trail;
- execute only within bounded authority if enabled.

Build last.

---

## 4. Phase 0 - Context and Repo Foundation

Outcome:

> A developer or agent can clone the repo, read the context pack, run a local environment, and understand the single golden demo scenario.

Deliverables:

- repository skeleton only where real artifacts exist;
- `docker-compose.yml` for local EVM, PostgreSQL, MinIO and mock IPFS;
- root `.env.example`;
- context docs for Aamhi, OBP and simulation;
- dependency mode labels;
- golden sample data folder;
- initial CI for lint/test/schema validation.

Acceptance:

- `README.md` points to the correct context docs;
- one command starts local dependencies;
- no implementation folder is created without useful content.

---

## 5. Phase 1 - Canonical Schemas and Sample Data

Outcome:

> The business language is executable before the services are built.

Deliverables:

- JSON Schemas for participant, material, recovery asset, evidence, attestation, claim, settlement and credential payloads;
- Aamhi demo sample dataset;
- OBP-ready claim fields;
- schema validation tests;
- deterministic ID examples.

Acceptance:

- sample Aamhi recovery lot validates;
- evidence manifest can be deterministically hashed;
- OBP-ready claim is represented as evidence-backed but not official credit issuance.

---

## 6. Phase 2 - Trusted Participant Slice

Outcome:

> Aamhi, buyer, recycler/processor and verifier have identities, credentials and transaction accounts.

Deliverables:

- participant registry service/module;
- `did:web` document generation;
- credential issuance and verification;
- on-chain participant and credential registry;
- Admin Console participant/credential screens;
- basic smart-account adapter boundary.

Acceptance:

- active credential allows eligible action;
- revoked credential blocks restricted action;
- identity remains separate from wallet address.

---

## 7. Phase 3 - Aamhi Recovery Asset and Evidence Slice

Outcome:

> Aamhi can create a real recovery lot with verifiable evidence.

Deliverables:

- recovery asset API;
- evidence upload and manifest generation;
- Aamhi Originator Console asset flow;
- Verifier Console verification attestation;
- private object storage integration;
- public-safe metadata generator.

Acceptance:

- evidence hash changes if a source file changes;
- verified lot has a stable asset ID and evidence root;
- private evidence is not exposed in public metadata.

---

## 8. Phase 4 - Tokenisation Slice

Outcome:

> The verified Aamhi lot becomes an ERC-1155 asset.

Deliverables:

- `RecoveryAsset.sol`;
- token ID mapping;
- mint controls;
- transfer eligibility controls;
- event indexing;
- Explorer asset/token view.

Acceptance:

- 1,000 kg lot mints as 1,000 token units;
- unverified lot cannot mint;
- ineligible recipient cannot receive restricted asset;
- explorer shows on-chain balance and metadata.

---

## 9. Phase 5 - Open Discovery Slice

Outcome:

> Independent Buyer Console discovers the Aamhi asset without querying Aamhi's internal database.

Deliverables:

- Beckn Provider adapter;
- Beckn Consumer adapter;
- local/sandbox Discovery adapter;
- catalogue resource mapping;
- Buyer Console discovery/search screen;
- chain-state verification before selection.

Acceptance:

- buyer discovers the asset through Beckn-shaped interaction;
- buyer verifies Ethereum token state independently;
- stale catalogue quantity cannot override chain state.

---

## 10. Phase 6 - Programmable Settlement Slice

Outcome:

> Asset units and dINR can be locked and settled atomically.

Deliverables:

- `DemoINR.sol`;
- `SettlementEngine.sol`;
- settlement API;
- dINR funding flow;
- asset lock flow;
- settlement status view;
- refund/expiry path.

Acceptance:

- buyer funds dINR escrow;
- Aamhi locks ERC-1155 units;
- missing asset or money prevents settlement;
- successful settlement transfers both economic legs.

---

## 11. Phase 7 - Physical Attestation and Claims Slice

Outcome:

> A signed real-world receipt/processing event can trigger settlement and create bounded claims.

Deliverables:

- attestation schema and signing;
- attestation registry;
- claim registry;
- receipt and processing attestation screens;
- OBP-ready claim creation;
- sponsor/EPR reference fields with boundary labels.

Acceptance:

- processor receipt satisfies settlement condition;
- unauthorized attestation is rejected;
- claim quantity cannot exceed eligible quantity;
- duplicate sponsor/OBP-ready attribution is blocked.

---

## 12. Phase 8 - Explorer and Demo Harness

Outcome:

> The full transaction can be inspected, reset and replayed.

Deliverables:

- transaction graph explorer;
- dependency mode display;
- demo reset script;
- seeded golden path;
- negative-path fixtures;
- public block-explorer links.

Acceptance:

- final state is understandable from explorer alone;
- reset uses supported service/admin operations;
- mandatory negative cases are demonstrable.

---

## 13. Phase 9 - AI Agent Slice

Outcome:

> An AI agent can discover and prepare a transaction under explicit constraints.

Deliverables:

- agent tool API;
- deterministic policy engine;
- AI Agent Interface;
- human approval object;
- audit log;
- bounded smart-account/session authority if execution is enabled.

Acceptance:

- agent can discover and shortlist eligible assets;
- agent explains credential/token verification result;
- agent cannot exceed material, counterparty, value or expiry policy;
- tool/audit trail is inspectable.

---

## 14. Phase 10 - Public Testnet Demo and Handover

Outcome:

> The PoC runs on public testnet with realistic Aamhi demo data and a repeatable runbook.

Deliverables:

- public testnet deployment;
- deployed contract address registry;
- final demo dataset;
- acceptance test results;
- known limitations document;
- handover package.

Acceptance:

- end-to-end happy path completes on public testnet;
- mandatory negative cases pass;
- demo can be reset and repeated;
- unsupported regulatory claims are not made.

---

## 15. Workstream Sequencing

Some work can proceed in parallel, but the dependency chain must be respected.

```text
Context + Schemas
        |
Trusted Participants
        |
Recovery Asset + Evidence
        |
Tokenisation
        |
Open Discovery
        |
Settlement
        |
Attestation + Claims
        |
Explorer + Demo Harness
        |
AI Agent
        |
Public Demo
```

Parallel work allowed:

- UI shell/design system can start during Phase 1;
- contract scaffolding can start during Phase 2;
- Beckn adapter research can start during Phase 3;
- explorer read-model design can start during Phase 4;
- AI tool design can start after Phase 5, but implementation should wait until stable APIs exist.

---

## 16. Interface and UX Principles

Keep screens light and purpose-led.

Each object detail page should show:

- object identity;
- current status;
- verification/trust state;
- evidence references;
- on-chain state where relevant;
- available next action;
- timeline.

Avoid:

- marketplace-style NFT UI;
- heavy dashboards before core workflows exist;
- decorative crypto visuals;
- unsupported regulatory language.

---

## 17. Context Control

Before each implementation phase, update or confirm:

- relevant schema examples;
- active dependency modes;
- selected material stream;
- participant list;
- current contract/API decisions;
- known simulation boundaries.

This prevents later agents from building against stale assumptions.

---

## 18. Final Definition of Done

The project is complete when a stakeholder can watch this sequence:

```text
Aamhi onboarded and credentialled
        |
Rural recovery lot created with evidence
        |
Verifier attests lot
        |
ERC-1155 recovery asset minted
        |
Asset published through Beckn
        |
Independent buyer discovers and verifies it
        |
Buyer and Aamhi form terms
        |
dINR and asset units are locked
        |
Processor signs receipt
        |
Settlement executes atomically
        |
OBP-ready / recovery / processing claims are recorded
        |
Explorer shows evidence, credentials, token state, settlement and claims
```

The PoC is not complete if this works only by manually editing database state or bypassing the identity, evidence, settlement or claim controls.
