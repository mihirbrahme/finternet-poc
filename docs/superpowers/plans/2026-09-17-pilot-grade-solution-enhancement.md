# Pilot Grade Solution Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the completed Finternet PoC into a pilot-grade, hosted, multi-user solution for Aamhi rural solid waste recovery, while preserving the PoC's explicit dINR, OBP and regulatory boundaries.

**Architecture:** Keep the current domain modules, contracts, schemas and acceptance harness as the trusted core, then add real service boundaries, persistence, authentication, operational UI workflows, hosted deployment and observability around them. The pilot should remain adapter-driven: external dependencies such as public testnet RPC, DID hosting, Beckn network endpoints, IPFS pinning, object storage, ERC-4337 and OBP/EPR registries are integrated only through replaceable adapters with explicit dependency modes.

**Tech Stack:** TypeScript/Node.js, existing core service modules, PostgreSQL, JSON Schema, Foundry/Solidity, static-to-app UI evolution for `apps/*`, Beckn sandbox adapters, local/demo deployment scripts, and public testnet deployment package from Packet 11.

## Global Constraints

- Execution must remain subagent-driven: one packet is owned by one subagent at a time, with main-agent review before commit.
- Do not create empty files or folders for scaffolding.
- Preserve canonical business IDs: `ORG-*`, `RWA-*`, `EVD-*`, `EVM-*`, `ATT-*`, `CLM-*`, `STL-*`, `CTR-*`, `AGR-*`, `APR-*`.
- OBP output remains `OBP_READY_RECOVERY_CLAIM`, evidence-backed and quantity-bounded, with `isOfficialCredit=false`.
- Do not imply official OBP credit, EPR certificate issuance, government recognition, legal title transfer or regulated payment movement.
- dINR remains sandbox programmable settlement value only unless a future authorised payment integration is explicitly added.
- Simulated dependencies are allowed only behind explicit adapters and dependency-mode labels.
- UI must stay easy, light and operational; avoid marketing pages and decorative complexity.
- Every packet must include validation commands and update its ledger row only after tests pass.
- External credentials, private keys, RPC secrets and API tokens must never be committed.

---

## Baseline

The current repo has completed the PoC build:

- Packets 1-11 are complete and pushed.
- Local/demo golden path exists.
- Negative-path acceptance tests exist.
- Contracts are tested with Foundry.
- Demo deployment package is live-ready but no public testnet deployment is recorded without credentials.
- Apps exist as lightweight static operational screens.

The enhancement phase starts from this state and upgrades the project into a pilot-grade solution.

---

## Progress Ledger

| Packet | Status | Commit | Notes |
|---|---|---|---|
| E1 - Pilot Product Scope and Operating Model | NOT_STARTED |  |  |
| E2 - Backend API Gateway and Service Contracts | NOT_STARTED |  |  |
| E3 - PostgreSQL Persistence and Migrations | NOT_STARTED |  |  |
| E4 - Authentication, Roles and Access Control | NOT_STARTED |  |  |
| E5 - Frontend App Shell and Shared UI Runtime | NOT_STARTED |  |  |
| E6 - Originator Operational Workflow | NOT_STARTED |  |  |
| E7 - Verifier and Processor Workflow | NOT_STARTED |  |  |
| E8 - Buyer Discovery, Contracting and Settlement Workflow | NOT_STARTED |  |  |
| E9 - Claims, Explorer and Auditability Workflow | NOT_STARTED |  |  |
| E10 - Buyer Agent Operational Workflow | NOT_STARTED |  |  |
| E11 - Hosted Demo/Testnet Integration | NOT_STARTED |  |  |
| E12 - Observability, Runbooks and Pilot Handover | NOT_STARTED |  |  |

### Resume Protocol

1. Run `git status --short --branch`.
2. Open this progress ledger.
3. Identify the first packet not marked `COMPLETE`.
4. If uncommitted changes exist, verify they match the `IN_PROGRESS` packet.
5. If changes do not match the ledger, stop and review before dispatching another subagent.
6. Completion requires a commit hash, validation evidence and `COMPLETE` status.

---

## Shared Context Pack

Every subagent must read:

1. `README.md`
2. `docs/00_project/00_README_Project_Index.md`
3. `docs/00_project/01_Project_Build_Plan.md`
4. `docs/00_project/02_Aamhi_Rural_SWM_and_OBP_Context.md`
5. `docs/03_software-design/09_API_and_Service_Specification.md`
6. `docs/03_software-design/10_Data_Model_and_Schemas.md`
7. `docs/03_software-design/13_AI_Agent_Design.md`
8. `docs/04_security-operations/14_Security_Access_and_Trust_Controls.md`
9. `docs/04_security-operations/15_DevOps_Environments_and_Deployment.md`
10. `docs/05_delivery/18_Demo_Runbook.md`
11. `docs/05_delivery/21_Known_Limitations_and_Boundaries.md`
12. `docs/superpowers/plans/2026-09-16-finternet-poc-end-to-end.md`
13. `deployment/scripts/demo-state.ts`
14. `deployment/scripts/deploy-contracts.ts`
15. `deployment/scripts/seed-demo.ts`
16. `tests/end-to-end/golden-path.spec.ts`
17. `tests/end-to-end/negative-paths.spec.ts`
18. `package.json`

---

## Target Pilot Definition

The pilot-grade solution must support:

- Multi-user operational workflows for Aamhi, buyer, verifier, processor and admin.
- Persistent data and repeatable migrations.
- API-first service access.
- Clear role permissions.
- Live state shown in UI apps.
- Hosted demo/testnet readiness.
- Audit logs for economic actions.
- Demo operator controls for seed/reset/rehearsal.
- Explicit limitations in UI, APIs and docs.

The pilot-grade solution is not production until official integrations, legal review, operational security and regulated dependencies are completed.

---

### Packet E1: Pilot Product Scope and Operating Model

**Files:**
- Create: `docs/00_project/03_Pilot_Scope_and_Operating_Model.md`
- Create: `docs/05_delivery/22_Pilot_Acceptance_Criteria.md`
- Modify: `docs/superpowers/plans/2026-09-17-pilot-grade-solution-enhancement.md`

**Interfaces:**
- Consumes: completed PoC docs, Aamhi/OBP context, runbook and known limitations.
- Produces: pilot scope, user roles, workflow boundaries and acceptance criteria consumed by all later packets.

- [ ] **Step 1: Define pilot users and responsibilities**

Create a user matrix with:

```text
Network Admin: manages participants, credentials, dependency modes and demo readiness.
Aamhi Originator: creates recovery lots, attaches evidence, submits for verification and tracks settlement/claim outcomes.
Verifier: reviews evidence and creates asset verification attestations.
Processor: records receipt/processing attestations after physical fulfilment.
Buyer: discovers verified recovery assets, creates offers and tracks settlement.
AI Buyer Agent: prepares bounded proposals only, never unrestricted execution.
Demo Operator: seeds demo data, checks health and runs rehearsals.
Read-only Viewer: inspects explorer state and claim boundaries.
```

- [ ] **Step 2: Define pilot workflows**

Document these workflows:

```text
participant onboarding
credential issuance/revocation
recovery lot creation
evidence attachment
asset verification
tokenisation
Beckn publication/discovery
buyer offer/contracting
dINR funding
asset lock
processor receipt attestation
settlement execution
OBP-ready claim creation
agent proposal and approval
explorer verification
demo reset/rehearsal
```

- [ ] **Step 3: Define acceptance criteria**

Create acceptance criteria grouped by:

```text
functional workflow
data persistence
security and access control
auditability
demo readiness
adapter boundaries
OBP/dINR/legal boundaries
test coverage
```

- [ ] **Step 4: Validate documentation**

Run:

```powershell
git diff --check
```

Expected: no whitespace errors.

- [ ] **Step 5: Commit**

```powershell
git add docs/00_project/03_Pilot_Scope_and_Operating_Model.md docs/05_delivery/22_Pilot_Acceptance_Criteria.md docs/superpowers/plans/2026-09-17-pilot-grade-solution-enhancement.md
git commit -m "docs: define pilot operating model"
```

---

### Packet E2: Backend API Gateway and Service Contracts

**Files:**
- Create: `services/api-gateway/src/server.ts`
- Create: `services/api-gateway/src/routes/*.ts`
- Create: `services/api-gateway/src/http/types.ts`
- Create: `services/api-gateway/src/http/errors.ts`
- Create: `services/api-gateway/tests/api-contracts.test.ts`
- Modify: `api/openapi.yaml`
- Modify: `package.json`

**Interfaces:**
- Consumes: existing `services/core-api/src/modules/*`.
- Produces: HTTP API surface for apps and future hosted deployment.

- [ ] **Step 1: Add API contract tests**

Test these endpoints exist and return stable JSON shapes:

```text
GET /health
GET /participants
GET /credentials/:credentialId
GET /assets/:assetId
POST /assets
POST /assets/:assetId/evidence
POST /assets/:assetId/verify
POST /assets/:assetId/tokenise
GET /discovery/search
POST /settlements
POST /settlements/:settlementId/fund
POST /settlements/:settlementId/lock-asset
POST /attestations
POST /claims
POST /agent/proposals
```

- [ ] **Step 2: Implement lightweight HTTP server**

Use Node's built-in HTTP APIs or the repo's existing dependency style. Do not add a heavyweight framework unless justified.

The server must:

```text
parse JSON bodies
return JSON responses
normalize errors
expose dependencyMode in responses where relevant
reuse existing core service modules
avoid duplicating domain rules
```

- [ ] **Step 3: Update OpenAPI**

Update `api/openapi.yaml` with:

```text
participants
credentials
assets
evidence
tokenisation
discovery
settlements
attestations
claims
agent proposals
health
```

Include explicit boundary fields:

```yaml
dependencyMode
isOfficialCredit
boundaryStatement
currencyToken: dINR
```

- [ ] **Step 4: Add package script**

Add:

```json
"test:api": "tsx services/api-gateway/tests/api-contracts.test.ts"
```

- [ ] **Step 5: Validate**

Run:

```powershell
npx pnpm@10.16.1 test:api
npx pnpm@10.16.1 test:golden-path
npx pnpm@10.16.1 test:negative-paths
git diff --check
```

- [ ] **Step 6: Commit**

```powershell
git add services/api-gateway api/openapi.yaml package.json
git commit -m "feat(api): add pilot gateway contracts"
```

---

### Packet E3: PostgreSQL Persistence and Migrations

**Files:**
- Create: `database/migrations/001_pilot_core.sql`
- Create: `database/seeds/pilot_demo.sql`
- Create: `services/core-api/src/persistence/*`
- Create: `services/core-api/tests/persistence/*.test.ts`
- Modify: `docker-compose.yml`
- Modify: `.env.example`
- Modify: `package.json`

**Interfaces:**
- Consumes: existing in-memory repository interfaces.
- Produces: persistent repository adapters with the same domain behavior.

- [ ] **Step 1: Define migration**

Create tables:

```text
participants
participant_accounts
credentials
recovery_assets
evidence_records
evidence_manifests
asset_tokens
beckn_catalogue_resources
settlements
attestations
claims
agent_audit_events
demo_runs
```

Each table must include:

```text
business_id
created_at
updated_at
dependency_mode
status where applicable
```

- [ ] **Step 2: Add persistence contract tests**

For each adapter, test:

```text
save then get
list by business ID
duplicate ID rejection where required
status update persistence
restart-safe read by recreating adapter
```

- [ ] **Step 3: Implement PostgreSQL adapters**

Create adapters that preserve current service behavior:

```text
ParticipantRepository
CredentialRepository
RecoveryAssetRepository
EvidenceRepository
TokenisationRepository
SettlementRepository
AttestationRepository
ClaimRepository
AgentAuditRepository
```

- [ ] **Step 4: Add local database scripts**

Add package scripts:

```json
"db:migrate": "tsx services/core-api/src/persistence/run-migrations.ts",
"db:seed": "tsx services/core-api/src/persistence/seed-pilot.ts",
"test:persistence": "tsx services/core-api/tests/persistence/persistence.test.ts"
```

- [ ] **Step 5: Validate**

Run:

```powershell
docker compose up -d postgres
npx pnpm@10.16.1 db:migrate
npx pnpm@10.16.1 db:seed
npx pnpm@10.16.1 test:persistence
npx pnpm@10.16.1 test:golden-path
git diff --check
```

- [ ] **Step 6: Commit**

```powershell
git add database services/core-api docker-compose.yml .env.example package.json
git commit -m "feat(persistence): add pilot postgres repositories"
```

---

### Packet E4: Authentication, Roles and Access Control

**Files:**
- Create: `services/core-api/src/auth/*`
- Create: `services/api-gateway/src/middleware/auth.ts`
- Create: `services/core-api/tests/auth/access-control.test.ts`
- Modify: `docs/04_security-operations/14_Security_Access_and_Trust_Controls.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: participant roles and credential roles.
- Produces: request actor context and authorization decisions for APIs and apps.

- [ ] **Step 1: Define actor context**

Use:

```ts
interface ActorContext {
  actorId: string;
  participantId: string;
  roles: ParticipantRole[];
  accountAddress?: string;
  authMode: "LOCAL_DEMO_HEADER" | "OIDC_ADAPTER";
}
```

- [ ] **Step 2: Define authorization matrix**

Rules:

```text
NETWORK_ADMIN can manage participants and credentials.
RECOVERY_ORIGINATOR can create assets and attach own evidence.
VERIFIER can verify assets.
PROCESSOR can create receipt/processing attestations.
BUYER can discover, create settlements and request agent proposals.
AI_AGENT_SERVICE can prepare proposals but cannot bypass buyer approval.
Read-only viewer can inspect explorer data only.
```

- [ ] **Step 3: Implement access checks**

Create:

```ts
requireRole(actor, role)
requireParticipant(actor, participantId)
canCreateAsset(actor, originatorParticipantId)
canCreateAttestation(actor, type)
canCreateClaim(actor, claimInput)
canPrepareAgentProposal(actor, buyerParticipantId)
```

- [ ] **Step 4: Add API middleware**

For local pilot mode, use headers:

```text
x-demo-actor-id
x-demo-participant-id
x-demo-roles
```

Mark response auth mode as `LOCAL_DEMO_HEADER`.

- [ ] **Step 5: Validate**

Run:

```powershell
npx pnpm@10.16.1 test:auth
npx pnpm@10.16.1 test:api
npx pnpm@10.16.1 test:agent
git diff --check
```

- [ ] **Step 6: Commit**

```powershell
git add services/core-api/src/auth services/api-gateway/src/middleware docs/04_security-operations package.json
git commit -m "feat(auth): add pilot role access controls"
```

---

### Packet E5: Frontend App Shell and Shared UI Runtime

**Files:**
- Create: `apps/shared/*`
- Modify: `apps/admin-console/*`
- Modify: `apps/originator-console/*`
- Modify: `apps/buyer-console/*`
- Modify: `apps/processor-console/*`
- Modify: `apps/explorer/*`
- Create: `tests/ui/static-apps.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: API gateway endpoints and auth actor context.
- Produces: consistent navigation, dependency-mode display, API client and state rendering for all apps.

- [ ] **Step 1: Add shared API client**

Create:

```ts
createApiClient({ baseUrl, actor })
getJson(path)
postJson(path, body)
```

The client must attach local demo actor headers.

- [ ] **Step 2: Add shared UI utilities**

Create:

```text
dependency mode badge
status badge
ID copy block
boundary notice
error panel
loading state
```

- [ ] **Step 3: Add app navigation**

Each app should show:

```text
current participant
role
dependency mode
link to explorer
link to runbook/limitations
```

- [ ] **Step 4: Add static UI tests**

Tests must verify:

```text
no page uses unsupported official OBP/EPR/government wording
all apps include dependency mode
all apps include role/context display
agent UI includes approval boundary
explorer includes isOfficialCredit=false for OBP-ready claims
```

- [ ] **Step 5: Validate**

Run:

```powershell
npx pnpm@10.16.1 test:ui
git diff --check
```

- [ ] **Step 6: Commit**

```powershell
git add apps tests/ui package.json
git commit -m "feat(apps): add shared pilot app shell"
```

---

### Packet E6: Originator Operational Workflow

**Files:**
- Modify: `apps/originator-console/*`
- Modify: `services/api-gateway/src/routes/assets.ts`
- Create: `tests/end-to-end/originator-workflow.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: auth, API gateway, persistence, asset/evidence services.
- Produces: live Aamhi asset creation and evidence submission workflow.

- [ ] **Step 1: Test originator workflow**

Automate:

```text
login as ORG-AAMHI-001
create RWA lot
attach collection photo
attach weighment slip
create evidence manifest
submit for verification
see status SUBMITTED_FOR_VERIFICATION
```

- [ ] **Step 2: Implement UI form**

Fields:

```text
assetId
materialCode
estimatedQuantity
verifiedQuantity
villageOrRoute
collectionType
obpRiskContext
locationReference
qualityGrade
contaminationPercent
facilityReference
```

- [ ] **Step 3: Implement evidence panel**

Allow adding evidence metadata:

```text
evidenceId
type
storageReference
sourceParticipantId
classification
capturedAt
```

- [ ] **Step 4: Validate**

Run:

```powershell
npx pnpm@10.16.1 test:originator-workflow
npx pnpm@10.16.1 test:asset-evidence
npx pnpm@10.16.1 test:api
git diff --check
```

- [ ] **Step 5: Commit**

```powershell
git add apps/originator-console services/api-gateway tests/end-to-end/originator-workflow.spec.ts package.json
git commit -m "feat(originator): add pilot recovery lot workflow"
```

---

### Packet E7: Verifier and Processor Workflow

**Files:**
- Modify: `apps/processor-console/*`
- Modify: `services/api-gateway/src/routes/attestations.ts`
- Create: `tests/end-to-end/verification-processing-workflow.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: submitted assets, evidence manifests, verifier/processor credentials.
- Produces: asset verification and physical receipt attestations.

- [ ] **Step 1: Test verifier and processor workflow**

Automate:

```text
verifier lists pending asset
verifier reviews evidence manifest
verifier creates ASSET_VERIFIED attestation
processor lists funded/locked settlement
processor creates RECEIPT_CONFIRMED attestation
unauthorized buyer cannot create receipt attestation
```

- [ ] **Step 2: Implement verification queue**

Show:

```text
assetId
originator
material
verified quantity
evidence manifest
hash
status
```

- [ ] **Step 3: Implement receipt attestation form**

Fields:

```text
settlementId
assetId
tokenId
quantity
evidenceManifestId
evidenceHash
processor credential
```

- [ ] **Step 4: Validate**

Run:

```powershell
npx pnpm@10.16.1 test:verification-processing-workflow
npx pnpm@10.16.1 test:claims
npx pnpm@10.16.1 test:api
git diff --check
```

- [ ] **Step 5: Commit**

```powershell
git add apps/processor-console services/api-gateway tests/end-to-end/verification-processing-workflow.spec.ts package.json
git commit -m "feat(attestations): add verifier processor workflow"
```

---

### Packet E8: Buyer Discovery, Contracting and Settlement Workflow

**Files:**
- Modify: `apps/buyer-console/*`
- Modify: `services/api-gateway/src/routes/discovery.ts`
- Modify: `services/api-gateway/src/routes/settlements.ts`
- Create: `tests/end-to-end/buyer-settlement-workflow.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Beckn discovery, token state, credentials, dINR and settlement APIs.
- Produces: live buyer discovery, selection, settlement draft, funding and lock tracking.

- [ ] **Step 1: Test buyer workflow**

Automate:

```text
buyer searches LDPE Raigad minimum 500 kg
buyer sees Aamhi resource through Beckn sandbox
buyer verifies credential and token state
buyer selects 500 kg
buyer creates settlement
buyer funds dINR
seller lock state is visible
settlement readiness updates
stale catalogue is capped by indexed token state
```

- [ ] **Step 2: Implement search and candidate table**

Show:

```text
resourceId
assetId
seller
material
catalogue quantity
live available quantity
unitPriceDinr
credential status
token state
```

- [ ] **Step 3: Implement settlement panel**

Show:

```text
settlementId
contractId
quantity
paymentAmount
dINR funding status
asset lock status
required attestation
expiry
```

- [ ] **Step 4: Validate**

Run:

```powershell
npx pnpm@10.16.1 test:buyer-settlement-workflow
npx pnpm@10.16.1 test:settlement
npx pnpm@10.16.1 test:beckn-discovery
git diff --check
```

- [ ] **Step 5: Commit**

```powershell
git add apps/buyer-console services/api-gateway tests/end-to-end/buyer-settlement-workflow.spec.ts package.json
git commit -m "feat(buyer): add settlement workflow"
```

---

### Packet E9: Claims, Explorer and Auditability Workflow

**Files:**
- Modify: `apps/explorer/*`
- Modify: `services/api-gateway/src/routes/claims.ts`
- Modify: `services/api-gateway/src/routes/explorer.ts`
- Create: `tests/end-to-end/explorer-claims-workflow.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: settled transaction, receipt attestation, claims service and indexer projection.
- Produces: verifiable transaction graph and bounded claim visibility.

- [ ] **Step 1: Test explorer claims workflow**

Automate:

```text
settled transaction is visible
asset balances are visible
dINR leg is visible as sandbox value
receipt attestation is linked
OBP_READY_RECOVERY_CLAIM is linked
claim shows isOfficialCredit=false
boundary statement is visible
duplicate active exclusive claim is rejected
```

- [ ] **Step 2: Implement transaction graph**

Show:

```text
participant DID and credential
asset
evidence manifest
ERC-1155 token
Beckn contract
settlement
dINR leg
asset leg
attestation
claim
```

- [ ] **Step 3: Implement audit detail page**

Show:

```text
createdAt
updatedAt
dependencyMode
txHash where available
sourceAttestationIds
evidenceReferences
status lifecycle
```

- [ ] **Step 4: Validate**

Run:

```powershell
npx pnpm@10.16.1 test:explorer-claims-workflow
npx pnpm@10.16.1 test:claims
npx pnpm@10.16.1 test:golden-path
git diff --check
```

- [ ] **Step 5: Commit**

```powershell
git add apps/explorer services/api-gateway tests/end-to-end/explorer-claims-workflow.spec.ts package.json
git commit -m "feat(explorer): add claim audit graph"
```

---

### Packet E10: Buyer Agent Operational Workflow

**Files:**
- Modify: `apps/buyer-console/agent/*`
- Modify: `services/api-gateway/src/routes/agent.ts`
- Modify: `services/core-api/src/modules/agent/*`
- Create: `tests/end-to-end/agent-operational-workflow.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: buyer workflow, agent gateway, policy engine and audit log.
- Produces: usable agent-assisted proposal workflow with human approval.

- [ ] **Step 1: Test operational agent flow**

Automate:

```text
buyer submits natural-language intent
agent extracts constraints
agent discovers candidates
agent verifies seller and token state
policy permits compliant proposal
policy denies over-limit proposal
approval object is created
audit log records every material step
no funding, locking or settlement execution occurs before approval
```

- [ ] **Step 2: Implement agent API endpoint**

Endpoint:

```text
POST /agent/proposals
```

Request:

```json
{
  "agentRunId": "AGR-000021",
  "buyerParticipantId": "ORG-BUYER-001",
  "userInstruction": "Find verified LDPE assets...",
  "constraints": {
    "materialCode": "PLASTIC-LDPE",
    "state": "Maharashtra",
    "district": "Raigad",
    "minQuantityKg": 250,
    "maxUnitPriceDinr": 22,
    "maxTransactionDinr": 50000,
    "expiryHours": 24
  }
}
```

- [ ] **Step 3: Implement agent UI interaction**

Show:

```text
intent box
structured constraints
candidate table
policy checks
proposal card
approval card
audit timeline
denial reasons
```

- [ ] **Step 4: Validate**

Run:

```powershell
npx pnpm@10.16.1 test:agent-operational-workflow
npx pnpm@10.16.1 test:agent
npx pnpm@10.16.1 test:buyer-settlement-workflow
git diff --check
```

- [ ] **Step 5: Commit**

```powershell
git add apps/buyer-console/agent services/api-gateway services/core-api/src/modules/agent tests/end-to-end/agent-operational-workflow.spec.ts package.json
git commit -m "feat(agent): add operational buyer proposal workflow"
```

---

### Packet E11: Hosted Demo and Public Testnet Integration

**Files:**
- Modify: `deployment/environments/demo/README.md`
- Modify: `deployment/contract-addresses.demo.json`
- Modify: `deployment/scripts/deploy-contracts.ts`
- Modify: `deployment/scripts/seed-demo.ts`
- Create: `deployment/environments/demo/validation-checklist.md`
- Create: `tests/end-to-end/demo-environment.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: deploy/seed scripts, API gateway, persistence and apps.
- Produces: hosted demo readiness and real public testnet recording when credentials exist.

- [ ] **Step 1: Add environment validation script**

Validate:

```text
DEMO_RPC_URL reachable
deployer address derived from DEMO_DEPLOYER_PRIVATE_KEY
chain id matches expected DEMO_CHAIN_ID
contract-addresses.demo.json has no fake deployed records
API health reachable when DEMO_API_BASE_URL is set
```

- [ ] **Step 2: Add demo environment tests**

Test:

```text
dry-run deploy works
live deploy fails without credentials
seed local-services works
live-api seed fails until adapters exist
contract registry schema is valid
known limitations are linked from runbook
```

- [ ] **Step 3: Prepare live deployment procedure**

Document exact command sequence:

```powershell
$env:DEMO_DEPLOY_MODE="live"
$env:DEMO_CHAIN_NAME="<selected-testnet>"
$env:DEMO_CHAIN_ID="<chain-id>"
$env:DEMO_RPC_URL="<rpc>"
$env:DEMO_DEPLOYER_PRIVATE_KEY="<key>"
npx pnpm@10.16.1 deploy:demo -- --write
```

- [ ] **Step 4: Validate**

Run:

```powershell
npx pnpm@10.16.1 deploy:demo
npx pnpm@10.16.1 seed:demo
npx pnpm@10.16.1 test:demo-environment
forge test -vvv
git diff --check
```

- [ ] **Step 5: Commit**

```powershell
git add deployment tests/end-to-end/demo-environment.spec.ts package.json
git commit -m "chore(deployment): harden hosted demo readiness"
```

---

### Packet E12: Observability, Runbooks and Pilot Handover

**Files:**
- Create: `observability/opentelemetry/README.md`
- Create: `observability/prometheus/pilot-metrics.md`
- Create: `observability/grafana/pilot-dashboard.md`
- Create: `docs/05_delivery/23_Pilot_Operations_Runbook.md`
- Create: `docs/05_delivery/24_Pilot_Handover_Checklist.md`
- Modify: `docs/05_delivery/18_Demo_Runbook.md`

**Interfaces:**
- Consumes: complete pilot-grade system.
- Produces: operating runbook, monitoring plan and handover checklist.

- [ ] **Step 1: Define metrics**

Track:

```text
API request count
API error count
credential verification failures
asset verification queue length
settlements by state
attestations by type
claims by status
agent proposals allowed/denied
dependency mode per service
indexer lag when live chain exists
```

- [ ] **Step 2: Define operational runbook**

Include:

```text
start local environment
run migrations
seed pilot data
run acceptance suite
deploy contracts dry-run
deploy contracts live
seed demo environment
rehearse demo
recover from failed seed
rotate demo credentials
check known limitations
```

- [ ] **Step 3: Define handover checklist**

Include:

```text
repo status
environment variables
contract addresses
deployment tx hashes
database migrations applied
demo users
test results
known limitations
security caveats
next integration decisions
```

- [ ] **Step 4: Validate**

Run:

```powershell
npx pnpm@10.16.1 test:golden-path
npx pnpm@10.16.1 test:negative-paths
npx pnpm@10.16.1 test:agent
git diff --check
```

- [ ] **Step 5: Commit**

```powershell
git add observability docs/05_delivery
git commit -m "docs: add pilot operations handover"
```

---

## Final Pilot Acceptance Run

After Packet E12, run:

```powershell
npx pnpm@10.16.1 demo:reset
npx pnpm@10.16.1 deploy:demo
npx pnpm@10.16.1 seed:demo
npx pnpm@10.16.1 test:schema
npx pnpm@10.16.1 test:identity
npx pnpm@10.16.1 test:asset-evidence
npx pnpm@10.16.1 test:tokenisation
npx pnpm@10.16.1 test:beckn-discovery
npx pnpm@10.16.1 test:settlement
npx pnpm@10.16.1 test:claims
npx pnpm@10.16.1 test:golden-path
npx pnpm@10.16.1 test:negative-paths
npx pnpm@10.16.1 test:agent
npx pnpm@10.16.1 test:api
npx pnpm@10.16.1 test:persistence
npx pnpm@10.16.1 test:auth
npx pnpm@10.16.1 test:ui
```

From `contracts/`:

```powershell
$env:Path="$env:USERPROFILE\.foundry\bin;$env:Path"
forge test -vvv
```

Then:

```powershell
git diff --check
git status --short --branch
```

Expected:

```text
all tests pass
no whitespace errors
workspace clean
all enhancement packets COMPLETE
```

---

## Self-Review

Spec coverage:

- Product scope and operating model are covered in E1.
- API boundaries are covered in E2.
- Persistence is covered in E3.
- Auth and role control are covered in E4.
- UI shell and app workflow upgrades are covered in E5-E10.
- Hosted demo and public testnet readiness are covered in E11.
- Observability and handover are covered in E12.
- OBP/dINR/legal boundaries are carried through global constraints and E9/E11/E12.

Placeholder scan:

- No task uses placeholder-marker language.
- External live dependencies are explicitly marked as adapters or credential-gated live mode.
- No packet claims an official OBP/EPR/government outcome.

Type consistency:

- Canonical IDs remain `ORG-*`, `RWA-*`, `EVD-*`, `EVM-*`, `ATT-*`, `CLM-*`, `STL-*`, `CTR-*`, `AGR-*`, `APR-*`.
- `OBP_READY_RECOVERY_CLAIM`, `isOfficialCredit=false` and dINR sandbox language are used consistently.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-17-pilot-grade-solution-enhancement.md`.

Execution options:

1. **Subagent-Driven (recommended)** - dispatch one fresh subagent per packet, review between packets, commit and push each packet independently.
2. **Inline Execution** - execute packets in this session with checkpoints.

Recommended choice: **Subagent-Driven**.
