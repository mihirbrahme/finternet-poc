# Finternet PoC End-to-End Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development only. Implement this plan by dispatching one focused subagent per task packet, reviewing each packet before the next dependent packet starts. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Aamhi-grounded Finternet PoC end to end, from rural recovery evidence through tokenisation, discovery, settlement, claims, explorer and bounded AI participation.

**Architecture:** The PoC is built as vertical slices over shared canonical schemas, contracts and service APIs. External dependencies are accessed through adapters with explicit dependency modes so local mocks can be replaced by real integrations without changing business objects.

**Tech Stack:** Solidity/OpenZeppelin/Foundry or Hardhat, Node.js + TypeScript, PostgreSQL, MinIO/S3-compatible storage, IPFS adapter, React/Next.js-style apps, Beckn v2-shaped adapters, W3C VC 2.0-compatible payloads, OpenTelemetry.

## Global Constraints

- Keep Project Aamhi and rural solid waste management as the primary demo context.
- Treat OBP as `OBP_READY_RECOVERY_CLAIM` unless an authorised certification or registry integration exists.
- Keep dINR framed as sandbox programmable settlement value only.
- Keep official EPR/government references as references unless an authorised system is integrated.
- Use canonical business IDs; do not substitute database IDs, transaction hashes or Beckn message IDs.
- Use simulated external dependencies only behind documented adapters and visible dependency mode labels.
- Build light operational UI; avoid marketplace or decorative crypto UI.
- Each phase must produce a demonstrable vertical outcome.

---

## Subagent-Driven Operating Model

This plan is intentionally organised for subagent-driven execution. Do not implement multiple task packets in one broad pass.

### Progress Tracking Rules

The table below is the source of truth for execution progress. Update it after every packet review.

Status values:

- `NOT_STARTED`: no implementation work has begun.
- `IN_PROGRESS`: subagent has been dispatched or work has begun.
- `BLOCKED`: packet cannot proceed without a decision, missing dependency or external access.
- `REVIEW`: packet implementation is complete and awaiting main-agent review.
- `COMPLETE`: packet passed review, validation evidence is recorded, and commit is present.

Rules:

- Mark a packet `IN_PROGRESS` before dispatching its subagent.
- Mark a packet `REVIEW` only after the subagent reports implementation finished.
- Mark a packet `COMPLETE` only after the main agent reviews scope, tests and commit.
- If interrupted, resume from the first packet that is not `COMPLETE`.
- Do not start a packet if any required upstream packet is not `COMPLETE`, unless the Parallelism Rules explicitly allow research-only work.
- Record the commit hash when a packet is complete.

### Progress Ledger

| Packet | Status | Commit | Notes |
|---|---|---|---|
| Packet 1 - Context Pack and Repository Harness | COMPLETE | 85545e9 | Reviewed; `docker compose config` and `git diff --check` passed. |
| Packet 2 - Canonical Schemas and Golden Sample Data | COMPLETE | 694f8be | Reviewed; `npx pnpm@10.16.1 test:schema` and `git diff --check` passed. |
| Packet 3 - Trusted Participant Slice | COMPLETE | 0dbaceb | Reviewed; `test:identity`, `test:schema`, `forge test`, and `git diff --check` passed after Foundry install. |
| Packet 4 - Recovery Asset, Evidence and Verification Slice | COMPLETE | 5474a78 | Reviewed; `test:asset-evidence`, `test:identity`, `test:schema`, `forge test`, and `git diff --check` passed. |
| Packet 5 - Tokenisation Slice | COMPLETE | 49afb48 | Reviewed; `forge test -vvv`, `test:asset-evidence`, `test:identity`, `test:schema`, `test:tokenisation`, and `git diff --check` passed. |
| Packet 6 - Beckn Discovery Slice | COMPLETE | 2805e3f | Reviewed; `test:beckn-discovery`, `test:tokenisation`, `test:asset-evidence`, `test:identity`, `test:schema`, `forge test`, and `git diff --check` passed. |
| Packet 7 - Programmable Settlement Slice | COMPLETE | 8ea6956 | Reviewed; `test:settlement`, `test:beckn-discovery`, `test:tokenisation`, `test:asset-evidence`, `test:identity`, `test:schema`, `forge test`, and `git diff --check` passed. |
| Packet 8 - Attestation and Claims Slice | COMPLETE | 0b8ef04 | Reviewed; `test:claims`, `test:settlement`, `test:beckn-discovery`, `test:tokenisation`, `test:asset-evidence`, `test:identity`, `test:schema`, `forge test -vvv`, and `git diff --check` passed. |
| Packet 9 - Demo Harness and Acceptance Tests | COMPLETE | 4238c22 | Reviewed; `demo:reset`, `test:golden-path`, `test:negative-paths`, `test:claims`, `test:settlement`, `test:beckn-discovery`, `test:tokenisation`, `test:asset-evidence`, `test:identity`, `test:schema`, `forge test -vvv`, and `git diff --check` passed. |
| Packet 10 - Bounded AI Agent Slice | COMPLETE | 75656ba | Reviewed; `test:agent`, `test:golden-path`, `test:negative-paths`, `test:claims`, `test:settlement`, `test:beckn-discovery`, `test:tokenisation`, `test:asset-evidence`, `test:identity`, `test:schema`, `forge test -vvv`, and `git diff --check` passed. |
| Packet 11 - Public Testnet Demo Deployment | NOT_STARTED |  |  |

### Resume Protocol

When resuming after any disruption:

1. Run `git status --short --branch`.
2. Open this Progress Ledger.
3. Identify the first packet that is not `COMPLETE`.
4. Check whether there are uncommitted changes.
5. If uncommitted changes match an `IN_PROGRESS` packet, continue that packet.
6. If uncommitted changes do not match the ledger, stop and review before dispatching another subagent.
7. Do not infer completion from files existing; completion requires `COMPLETE` status and a commit hash.

### Execution Rule

One subagent owns one task packet at a time.

Each subagent receives:

- the task packet;
- the shared context pack;
- only the upstream artifacts it depends on;
- the expected validation commands;
- the expected commit boundary.

The main agent reviews the subagent output before dispatching the next dependent task.

### Shared Context Pack

Every subagent must read these files before touching code:

1. `README.md`
2. `docs/00_project/00_README_Project_Index.md`
3. `docs/00_project/02_Aamhi_Rural_SWM_and_OBP_Context.md`
4. `docs/00_project/03_Context_Availability_and_Simulation_Strategy.md`
5. `docs/04_security-operations/16_Local_Toolchain_Setup.md`
6. `docs/05_delivery/20_End_to_End_PoC_Execution_Plan.md`
7. the specific Pack 2/3/4/5 document named in its task packet

### Review Gates

After every task packet, the main agent checks:

- scope stayed inside the task packet;
- no unrelated refactors were introduced;
- canonical IDs and schema names match the docs;
- OBP/EPR/dINR boundaries are preserved;
- dependency modes are explicit where external services are simulated;
- tests or validation evidence were run or the reason they could not run is documented;
- the resulting commit is coherent and reversible.

### Integration Gates

Do not proceed past these gates without a clean review:

| Gate | Requires |
|---|---|
| Gate A | Packet 1 complete; context and repo harness are stable |
| Gate B | Packet 2 complete; schemas and samples validate |
| Gate C | Packet 3 complete; participants and credentials can be issued/revoked |
| Gate D | Packet 5 complete; verified Aamhi asset can mint as ERC-1155 |
| Gate E | Packet 7 complete; asset and dINR can lock and settle |
| Gate F | Packet 9 complete; golden path and mandatory negative paths run |
| Gate G | Packet 11 complete; public demo package is reproducible |

### Parallelism Rules

Parallel work is allowed only when task packets do not depend on each other's unfinished outputs.

Safe parallel groups:

- Packet 1 runs alone.
- Packet 2 runs alone after Packet 1.
- Packet 3 can start before UI styling decisions, but not before Packet 2.
- Packet 4 and contract scaffolding for Packet 5 may be researched in parallel, but Packet 5 implementation must wait for Packet 4's verified asset contract.
- Packet 6 may start after Packet 5's read model contract is stable.
- Packet 10 may be designed after Packet 6, but implementation should wait until Packet 7 APIs are stable.

Do not run Packet 7, Packet 8 or Packet 9 in parallel. They touch settlement, claims and acceptance boundaries and should be integrated sequentially.

### Subagent Packet Summary

| Packet | Subagent Role | Primary Output | Review Focus |
|---|---|---|---|
| Packet 1 | Repo/context harness agent | runnable local harness and context entrypoints | no empty scaffolding, dependency modes clear |
| Packet 2 | Schema/data agent | schemas and Aamhi samples | canonical IDs, OBP-ready fields, validation |
| Packet 3 | Identity/contracts/API agent | participant and credential baseline | DID/account separation, revocation |
| Packet 4 | Asset/evidence agent | verified recovery asset flow | evidence hashing, private/public separation |
| Packet 5 | Tokenisation/indexer agent | ERC-1155 mint and explorer read model | verified-only mint, balance source of truth |
| Packet 6 | Beckn/discovery agent | independent discovery flow | no Aamhi DB dependency from buyer |
| Packet 7 | Settlement agent | dINR and atomic settlement | escrow, locks, failure paths |
| Packet 8 | Attestation/claims agent | receipt and OBP-ready claims | quantity boundaries, no official credit claim |
| Packet 9 | Demo/QA agent | reset harness and E2E tests | reproducibility, negative cases |
| Packet 10 | AI agent engineer | bounded buyer agent | deterministic policy outside LLM |
| Packet 11 | Deployment agent | public testnet demo package | repeatable deployment and limitations |

### Packet Contract

Each packet must be dispatched with this structure:

```markdown
## Subagent Handoff

You own Packet N only.

Read first:
- README.md
- docs/00_project/00_README_Project_Index.md
- docs/00_project/02_Aamhi_Rural_SWM_and_OBP_Context.md
- docs/00_project/03_Context_Availability_and_Simulation_Strategy.md
- docs/05_delivery/20_End_to_End_PoC_Execution_Plan.md
- [packet-specific docs]

Allowed files:
- [exact files/directories from packet]

Do not modify:
- unrelated docs
- unrelated app/service/contract areas
- generated lockfiles unless this packet introduces the package manager baseline

Deliver:
- code/docs listed in the packet
- tests or validation evidence
- brief implementation notes
- one coherent commit unless the main agent requests otherwise

Stop and report if:
- a required upstream artifact is missing
- an external dependency would require credentials
- scope requires changing a prior packet's interface
- OBP/EPR/dINR wording would become legally or regulatorily stronger than the docs allow
```

---

## File Structure

Create or modify these areas as implementation begins:

- `schemas/`: JSON Schemas and sample validation fixtures.
- `samples/aamhi-demo/`: golden-path participants, materials, evidence manifests and transaction fixtures.
- `contracts/src/`: Solidity contracts.
- `contracts/test/`: contract unit and invariant tests.
- `services/core-api/`: participant, credential, asset, evidence, attestation, claim and settlement APIs.
- `services/blockchain-indexer/`: event indexing and chain reconciliation.
- `beckn/`: provider, consumer and discovery sandbox adapters.
- `apps/admin-console/`: participant, credential, funding and dependency mode UI.
- `apps/originator-console/`: Aamhi asset/evidence/tokenise/publish UI.
- `apps/buyer-console/`: independent discovery, verification and settlement UI.
- `apps/processor-console/`: verifier/processor attestation UI.
- `apps/explorer/`: transaction graph and public proof UI.
- `agents/buyer-agent/`: bounded AI tool layer, policy and audit trail.
- `tests/end-to-end/`: golden path and mandatory negative path tests.
- `deployment/`: local/demo environment scripts and contract address registry.

---

### Packet 1: Context Pack and Repository Harness

**Files:**
- Modify: `README.md`
- Modify: `docs/00_project/00_README_Project_Index.md`
- Read: `docs/00_project/02_Aamhi_Rural_SWM_and_OBP_Context.md`
- Read: `docs/00_project/03_Context_Availability_and_Simulation_Strategy.md`
- Create: `docker-compose.yml`
- Create: `deployment/environments/local/README.md`
- Create: `samples/aamhi-demo/README.md`

**Interfaces:**
- Consumes: current documentation pack.
- Produces: local environment contract and context entrypoints for later tasks.

- [x] **Step 1: Add README links**

Update `README.md` so "Start Here" includes:

```markdown
- [Aamhi rural SWM and OBP context](docs/00_project/02_Aamhi_Rural_SWM_and_OBP_Context.md)
- [Context availability and simulation strategy](docs/00_project/03_Context_Availability_and_Simulation_Strategy.md)
- [End-to-end PoC execution plan](docs/05_delivery/20_End_to_End_PoC_Execution_Plan.md)
```

- [x] **Step 2: Add local dependency compose file**

Create `docker-compose.yml` with services named `postgres`, `minio`, `anvil`, and `mock-ipfs`. Use stable ports from `.env.example`: Postgres `5432`, MinIO `9000`, EVM `8545`.

- [x] **Step 3: Document local environment**

Create `deployment/environments/local/README.md` with commands:

```bash
docker compose up -d
docker compose ps
docker compose down
```

Explain dependency modes:

```text
Ethereum: LOCAL_MOCK
Object Storage: LOCAL_MOCK
IPFS: LOCAL_MOCK
Beckn: SANDBOX_ADAPTER
OBP Registry: NOT_CONNECTED
```

- [x] **Step 4: Create sample context README**

Create `samples/aamhi-demo/README.md` describing the golden path:

```text
Project Aamhi creates a 1,000 kg verified LDPE/PET recovery lot from Raigad.
Buyer acquires 500 kg for 10,000 dINR.
Processor receipt attestation triggers settlement.
OBP-ready recovery claim is recorded as evidence-backed but not official credit issuance.
```

- [x] **Step 5: Verify**

Run:

```bash
git status --short
```

Expected: only intended documentation and harness files are changed.

- [x] **Step 6: Commit**

```bash
git add README.md docs/00_project docs/05_delivery docs/superpowers docker-compose.yml deployment/environments/local samples/aamhi-demo
git commit -m "docs: add aamhi context and poc execution plan"
```

---

### Packet 2: Canonical Schemas and Golden Sample Data

**Files:**
- Create: `schemas/participant.schema.json`
- Create: `schemas/material.schema.json`
- Create: `schemas/recovery-asset.schema.json`
- Create: `schemas/evidence.schema.json`
- Create: `schemas/evidence-manifest.schema.json`
- Create: `schemas/attestation.schema.json`
- Create: `schemas/claim.schema.json`
- Create: `schemas/settlement.schema.json`
- Create: `samples/aamhi-demo/participants.json`
- Create: `samples/aamhi-demo/materials.json`
- Create: `samples/aamhi-demo/recovery-asset.json`
- Create: `samples/aamhi-demo/evidence-manifest.json`
- Create: `samples/aamhi-demo/obp-ready-claim.json`
- Create: `tests/schema/validate-samples.test.ts`

**Interfaces:**
- Consumes: identifier rules from `docs/03_software-design/10_Data_Model_and_Schemas.md`.
- Produces: schema contracts used by APIs, apps, contracts metadata and AI tools.

- [x] **Step 1: Define participant schema**

Include required fields:

```json
["participantId", "legalName", "displayName", "organisationType", "jurisdiction", "did", "status"]
```

Allow `organisationType` values:

```json
["NETWORK_ADMIN", "RECOVERY_ORIGINATOR", "BUYER", "PROCESSOR", "VERIFIER", "SPONSOR", "AI_AGENT_SERVICE"]
```

- [x] **Step 2: Define material schema**

Require `materialCode`, `materialName`, `category`, `defaultUnit`, `tokenUnit`, `active`.

- [x] **Step 3: Define recovery asset schema**

Require Aamhi-relevant fields:

```json
{
  "assetId": "RWA-RAI-2026-000001",
  "originatorParticipantId": "ORG-AAMHI-001",
  "materialCode": "PLASTIC-LDPE",
  "quantity": {"estimated": 1025, "verified": 1000, "unit": "kg"},
  "origin": {"country": "IN", "state": "Maharashtra", "district": "Raigad"},
  "collectionContext": {"villageOrRoute": "Nandgaon coastal route", "collectionType": "RURAL_SWM"},
  "verificationStatus": "VERIFIED"
}
```

- [x] **Step 4: Define claim schema**

Include claim types:

```json
["RECOVERY_COLLECTED", "ASSET_VERIFIED", "RECEIPT_CONFIRMED", "PROCESSING_CONFIRMED", "OBP_READY_RECOVERY_CLAIM", "SPONSOR_ATTRIBUTION", "EPR_REFERENCE"]
```

Require `isOfficialCredit` for OBP/EPR-related claims, with sample value `false`.

- [x] **Step 5: Add golden samples**

Create sample JSON files for Aamhi, buyer, processor, verifier, LDPE material, 1,000 kg recovery asset, evidence manifest and OBP-ready claim.

- [x] **Step 6: Add schema validation test**

Create a test that loads every sample and validates it against the matching schema. Use the repository's selected JS test runner when chosen; if the runner is not selected yet, document this test contract in `tests/schema/validate-samples.test.ts` with executable structure and add the runner in Packet 3.

- [x] **Step 7: Commit**

```bash
git add schemas samples/aamhi-demo tests/schema
git commit -m "feat(schemas): add canonical aamhi demo schemas"
```

---

### Packet 3: Trusted Participant Slice

**Files:**
- Create: `contracts/src/ParticipantRegistry.sol`
- Create: `contracts/src/CredentialRegistry.sol`
- Create: `contracts/test/ParticipantCredential.t.sol`
- Create: `services/core-api/src/modules/participants/*`
- Create: `services/core-api/src/modules/credentials/*`
- Create: `apps/admin-console/*`

**Interfaces:**
- Consumes: participant schema and credential model.
- Produces: participant trust APIs, on-chain eligibility state and Admin Console setup flow.

- [x] **Step 1: Write contract tests for participant registration**

Test that admin can register `ORG-AAMHI-001` and bind an account.

- [x] **Step 2: Implement `ParticipantRegistry.sol`**

Functions required:

```solidity
registerParticipant(bytes32 participantIdHash, address account, uint8 role)
setParticipantStatus(bytes32 participantIdHash, bool active)
isActiveAccount(address account) returns (bool)
```

- [x] **Step 3: Write credential enforcement test**

Test that a revoked processor credential returns inactive eligibility.

- [x] **Step 4: Implement `CredentialRegistry.sol`**

Functions required:

```solidity
setEligibility(address account, uint8 role, bool active, uint64 validUntil)
hasValidRole(address account, uint8 role) returns (bool)
```

- [x] **Step 5: Build participant and credential APIs**

Implement endpoints from `09_API_and_Service_Specification.md`:

```text
POST /participants
POST /participants/{participantId}/did
POST /participants/{participantId}/accounts
POST /credentials/issue
POST /credentials/verify
POST /credentials/{credentialId}/revoke
```

- [x] **Step 6: Build Admin Console screens**

Screens:

```text
Participants
Participant Detail
Credential Issue/Revoke
Dependency Modes
```

- [x] **Step 7: Commit**

```bash
git add contracts services/core-api apps/admin-console
git commit -m "feat(identity): add participant and credential baseline"
```

---

### Packet 4: Recovery Asset, Evidence and Verification Slice

**Files:**
- Create: `services/core-api/src/modules/assets/*`
- Create: `services/core-api/src/modules/evidence/*`
- Create: `services/core-api/src/modules/attestations/*`
- Create: `apps/originator-console/*`
- Create: `apps/processor-console/*`
- Create: `tests/end-to-end/asset-evidence.spec.ts`

**Interfaces:**
- Consumes: schemas, participant trust APIs and object storage adapter.
- Produces: verified asset record and evidence root ready for tokenisation.

- [x] **Step 1: Test evidence hash determinism**

Use two identical sample files and verify identical SHA-256 hashes; mutate one byte and verify hash mismatch.

- [x] **Step 2: Implement evidence upload metadata**

Store object reference, hash, MIME type, classification and source participant.

- [x] **Step 3: Implement evidence manifest generation**

Create deterministic JSON serialization and `manifestHash`.

- [x] **Step 4: Implement recovery asset API**

Endpoints:

```text
POST /assets
POST /assets/{assetId}/evidence
POST /assets/{assetId}/verify
GET /assets/{assetId}
GET /assets/{assetId}/provenance
```

- [x] **Step 5: Build Originator Console asset flow**

Fields must include material, quantity, district, village/route, collection type, evidence upload and verification status.

- [x] **Step 6: Build Verifier screen**

Verifier can inspect manifest, confirm quantity, and sign `ASSET_VERIFIED` attestation.

- [x] **Step 7: Commit**

```bash
git add services/core-api apps/originator-console apps/processor-console tests/end-to-end
git commit -m "feat(asset): add recovery evidence and verification flow"
```

---

### Packet 5: Tokenisation Slice

**Files:**
- Create: `contracts/src/RecoveryAsset.sol`
- Create: `contracts/test/RecoveryAsset.t.sol`
- Create: `services/core-api/src/modules/tokenisation/*`
- Create: `services/blockchain-indexer/*`
- Create: `apps/explorer/*`

**Interfaces:**
- Consumes: verified asset and credential registry.
- Produces: ERC-1155 token state and indexed explorer read model.

- [x] **Step 1: Test verified-only mint**

Mint succeeds only when asset has verification attestation and caller has tokeniser role.

- [x] **Step 2: Implement `RecoveryAsset.sol`**

Support:

```solidity
mintAsset(address to, uint256 tokenId, uint256 quantity, string memory uri, bytes32 assetIdHash, bytes32 evidenceRoot)
lock(address owner, uint256 tokenId, uint256 quantity, bytes32 settlementId)
unlock(address owner, uint256 tokenId, uint256 quantity, bytes32 settlementId)
```

- [x] **Step 3: Implement tokenisation API**

Endpoint:

```text
POST /assets/{assetId}/tokenise
```

It must generate metadata, publish through IPFS adapter and submit mint transaction.

- [x] **Step 4: Implement indexer baseline**

Index ERC-1155 transfer events, mint events, lock events and transaction status.

- [x] **Step 5: Build Explorer asset/token view**

Show canonical asset ID, token ID, supply, holder balances, metadata URI, evidence root and tx hash.

- [x] **Step 6: Commit**

```bash
git add contracts services/core-api services/blockchain-indexer apps/explorer
git commit -m "feat(tokenisation): mint verified recovery assets"
```

---

### Packet 6: Beckn Discovery Slice

**Files:**
- Create: `beckn/provider-node/*`
- Create: `beckn/consumer-node/*`
- Create: `beckn/discovery-sandbox/*`
- Create: `apps/buyer-console/*`
- Create: `tests/end-to-end/beckn-discovery.spec.ts`

**Interfaces:**
- Consumes: tokenised asset read model.
- Produces: independent discovery and asset verification flow.

- [x] **Step 1: Define catalogue mapping test**

Verify `assetId`, `tokenId`, `sellerParticipantId`, material, quantity and credential references appear in Beckn-shaped resource payload.

- [x] **Step 2: Implement provider adapter**

Expose catalog resource for available tokenised Aamhi asset.

- [x] **Step 3: Implement discovery sandbox**

Accept discovery intent and return matching provider resources.

- [x] **Step 4: Implement consumer adapter**

Buyer Console calls consumer adapter, not Aamhi's internal asset API.

- [x] **Step 5: Add chain-state verification before selection**

Buyer Console must check token balance and lock state before allowing selection.

- [x] **Step 6: Commit**

```bash
git add beckn apps/buyer-console tests/end-to-end
git commit -m "feat(beckn): add independent asset discovery"
```

---

### Packet 7: Programmable Settlement Slice

**Files:**
- Create: `contracts/src/DemoINR.sol`
- Create: `contracts/src/SettlementEngine.sol`
- Create: `contracts/test/SettlementEngine.t.sol`
- Create: `services/core-api/src/modules/settlements/*`
- Modify: `apps/buyer-console/*`
- Modify: `apps/originator-console/*`
- Modify: `apps/explorer/*`

**Interfaces:**
- Consumes: ERC-1155 asset, dINR balance, participant eligibility and Beckn contract mapping.
- Produces: funded and locked settlement with atomic finalisation.

- [x] **Step 1: Test dINR controlled mint**

Only treasury role can mint dINR to buyer.

- [x] **Step 2: Implement `DemoINR.sol`**

Use ERC-20 style functions plus holder eligibility if configured.

- [x] **Step 3: Test atomic DvP**

Buyer funds 10,000 dINR, Aamhi locks 500 ERC-1155 units, settlement finalises both legs.

- [x] **Step 4: Implement `SettlementEngine.sol`**

States:

```text
CREATED
FUNDED
ASSET_LOCKED
READY
SETTLED
REFUNDED
EXPIRED
```

- [x] **Step 5: Implement settlement APIs**

Endpoints:

```text
POST /settlements
POST /settlements/{settlementId}/fund
POST /settlements/{settlementId}/lock-asset
POST /settlements/{settlementId}/evaluate
POST /settlements/{settlementId}/settle
POST /settlements/{settlementId}/refund
GET /settlements/{settlementId}
```

- [x] **Step 6: Add UI flows**

Buyer funds dINR. Aamhi locks asset. Explorer shows lock and funding state.

- [x] **Step 7: Commit**

```bash
git add contracts services/core-api apps/buyer-console apps/originator-console apps/explorer
git commit -m "feat(settlement): add dinr escrow and atomic dvp"
```

---

### Packet 8: Attestation and Claims Slice

**Files:**
- Create: `contracts/src/AttestationRegistry.sol`
- Create: `contracts/src/ClaimRegistry.sol`
- Create: `contracts/test/ClaimsAttestations.t.sol`
- Modify: `services/core-api/src/modules/attestations/*`
- Modify: `services/core-api/src/modules/claims/*`
- Modify: `apps/processor-console/*`
- Modify: `apps/explorer/*`

**Interfaces:**
- Consumes: settlement state and evidence manifest.
- Produces: signed receipt/processing attestations and bounded claims.

- [x] **Step 1: Test authorized receipt attestation**

Credentialled processor can submit `RECEIPT_CONFIRMED`; uncredentialled account is rejected.

- [x] **Step 2: Implement `AttestationRegistry.sol`**

Record attestation hash, type, attestor, asset, settlement and quantity.

- [x] **Step 3: Test duplicate and excess claim rejection**

Reject `OBP_READY_RECOVERY_CLAIM` if quantity exceeds eligible asset quantity or overlaps an active exclusive claim.

- [x] **Step 4: Implement `ClaimRegistry.sol`**

Support claim creation, consumption, dispute/revoke status and quantity tracking.

- [x] **Step 5: Add processor UI**

Processor records received quantity, uploads evidence and signs receipt attestation.

- [x] **Step 6: Add OBP-ready claim UI**

Explorer shows `OBP_READY_RECOVERY_CLAIM` with `isOfficialCredit=false` and evidence references.

- [x] **Step 7: Commit**

```bash
git add contracts services/core-api apps/processor-console apps/explorer
git commit -m "feat(claims): add attestations and obp-ready claims"
```

---

### Packet 9: Demo Harness and Acceptance Tests

**Files:**
- Create: `deployment/scripts/demo-reset.*`
- Create: `deployment/contract-addresses.local.json`
- Create: `deployment/contract-addresses.demo.json`
- Create: `tests/end-to-end/golden-path.spec.ts`
- Create: `tests/end-to-end/negative-paths.spec.ts`
- Modify: `docs/05_delivery/18_Demo_Runbook.md`

**Interfaces:**
- Consumes: all prior APIs, contracts and apps.
- Produces: repeatable demo state and acceptance proof.

- [x] **Step 1: Implement demo reset script**

Reset must create participants, issue credentials, fund dINR, create Aamhi asset, upload evidence, mint ERC-1155 and publish catalogue through supported APIs.

- [x] **Step 2: Implement golden-path E2E**

Automate:

```text
onboard -> asset -> evidence -> verify -> mint -> publish -> discover -> select -> fund -> lock -> attest -> settle -> claim -> explore
```

- [x] **Step 3: Implement negative-path E2E**

Cover:

```text
revoked credential
stale catalogue
insufficient dINR
insufficient asset
unauthorized attestation
duplicate claim
altered evidence
```

- [x] **Step 4: Update runbook with Aamhi/OBP context**

Add explicit language that OBP claims are OBP-ready evidence claims unless certified.

- [x] **Step 5: Commit**

```bash
git add deployment tests/end-to-end docs/05_delivery/18_Demo_Runbook.md
git commit -m "test: add repeatable demo acceptance harness"
```

---

### Packet 10: Bounded AI Agent Slice

**Files:**
- Create: `agents/buyer-agent/tools/*`
- Create: `agents/buyer-agent/policies/*`
- Create: `agents/buyer-agent/prompts/*`
- Create: `agents/buyer-agent/tests/*`
- Create: `apps/buyer-console/agent/*`
- Modify: `services/core-api/src/modules/agent/*`

**Interfaces:**
- Consumes: discovery, verification, token state, offers and settlements APIs.
- Produces: audited AI transaction proposal and optional policy-bound execution.

- [x] **Step 1: Define policy tests**

Reject proposals above 50,000 dINR, wrong material, uncredentialled seller or expiry greater than 24 hours.

- [x] **Step 2: Implement agent tools**

Tools:

```text
discoverAssets
getAsset
getTokenState
verifyParticipant
getCredentialStatus
prepareOffer
prepareSettlement
requestHumanApproval
```

- [x] **Step 3: Implement deterministic policy engine**

Policy engine runs outside LLM reasoning and returns allow/deny with reasons.

- [x] **Step 4: Implement Agent UI**

Show intent, extracted constraints, candidate table, verification results, transaction proposal and approval card.

- [x] **Step 5: Implement audit log**

Store user instruction, tool calls, tool outputs, policy checks, approval and submitted transaction reference.

- [x] **Step 6: Commit**

```bash
git add agents apps/buyer-console services/core-api
git commit -m "feat(agent): add bounded buyer transaction agent"
```

---

### Packet 11: Public Testnet Demo Deployment

**Files:**
- Create: `deployment/environments/demo/README.md`
- Create: `deployment/scripts/deploy-contracts.*`
- Create: `deployment/scripts/seed-demo.*`
- Modify: `docs/05_delivery/18_Demo_Runbook.md`
- Create: `docs/05_delivery/21_Known_Limitations_and_Boundaries.md`

**Interfaces:**
- Consumes: complete local/integration build.
- Produces: public demo environment and handover package.

- [ ] **Step 1: Deploy contracts**

Deploy participant, credential, recovery asset, dINR, attestation, claim and settlement contracts to selected public testnet.

- [ ] **Step 2: Record contract addresses**

Update `deployment/contract-addresses.demo.json` with chain ID, contract address, deploy tx hash and block number.

- [ ] **Step 3: Seed demo state**

Run supported APIs to create participants, credentials, dINR balances and Aamhi demo asset.

- [ ] **Step 4: Run acceptance suite**

Run golden path and negative-path tests against demo environment.

- [ ] **Step 5: Document known limitations**

Include:

```text
dINR is sandbox value
OBP claims are OBP-ready only
EPR references are not official certificate issuance
smart-account provider may be demo adapter if ERC-4337 is not fully integrated
Beckn may be sandbox adapter if external network is not connected
```

- [ ] **Step 6: Commit**

```bash
git add deployment docs/05_delivery
git commit -m "chore(deployment): add public demo deployment package"
```

---

## Self-Review

Spec coverage:

- Aamhi context is covered in Packets 1, 2, 4 and 9.
- OBP-ready claims are covered in Packets 2, 8 and 11.
- Simulation strategy is covered in Packets 1 and 11.
- UI interfaces are covered across Packets 3 through 10.
- End-to-end settlement and claims are covered in Packets 7 through 9.

Placeholder scan:

- No task contains TBD/TODO/fill-later language.
- External dependencies are explicitly labelled as adapters or demo limitations.

Type consistency:

- Canonical IDs follow the docs: `ORG-*`, `RWA-*`, `ATT-*`, `CLM-*`, `STL-*`.
- Claim type `OBP_READY_RECOVERY_CLAIM` is used consistently.

