# Finternet PoC — API and Service Specification

**Project:** Suma Finternet PoC — Tokenised Recovery Asset Demonstrator  
**Status:** Pack 3 — Software & Data Specification  
**Purpose:** Define the software services, external APIs, service responsibilities, authentication model and blockchain/Beckn integration boundaries required to implement the PoC.

---

## 1. Design principle

The PoC is not one monolithic application. It is a set of independently understandable services around shared Finternet primitives.

```text
User / AI Agent
      ↓
API Gateway / Application APIs
      ↓
┌───────────────┬────────────────┬────────────────┐
│ Identity      │ Asset          │ Transaction    │
│ Services      │ Services       │ Services       │
└───────────────┴────────────────┴────────────────┘
      ↓                 ↓                 ↓
Credentials           Ethereum           Beckn
DID / VC              Contracts          Network
      \                 |                /
       \________________|_______________/
                        ↓
                  Audit / Event Layer
```

Ethereum is authoritative for token balances, asset locks and settlement. Application APIs provide usability, orchestration and controlled access; they must not create a parallel economic ledger.

---

## 2. Recommended service set

### 2.1 API Gateway / Edge Service

Responsibilities:

- single application entry point;
- OAuth2/OIDC token validation;
- rate limiting;
- request correlation IDs;
- routing to backend services;
- API audit logging;
- no business-state ownership.

### 2.2 Participant & Identity Service

Responsibilities:

- create canonical Participant IDs;
- maintain legal/business participant profile;
- publish/resolve `did:web` documents;
- map participant ↔ DID ↔ ERC-4337 smart account;
- orchestrate on-chain `ParticipantRegistry` updates.

### 2.3 Credential Service

Responsibilities:

- issue W3C VC 2.0 credentials;
- verify credentials;
- maintain status/revocation;
- project minimum eligibility into `CredentialRegistry.sol`;
- expose credential verification to independent applications.

### 2.4 Asset Service

Responsibilities:

- create canonical Recovery Asset record;
- validate tokenisation prerequisites;
- generate public token metadata;
- generate evidence manifest/root;
- pin public metadata to IPFS;
- invoke `RecoveryAsset.sol` mint/retire/block functions;
- reconcile off-chain record with Ethereum state.

### 2.5 Evidence & Attestation Service

Responsibilities:

- upload private evidence;
- calculate cryptographic hashes;
- create evidence manifests;
- validate attestor role/relationship;
- submit signed attestations to `AttestationRegistry.sol`;
- retain source evidence separately from on-chain attestations.

### 2.6 Claim Service

Responsibilities:

- create derived claims;
- validate quantity and uniqueness rules;
- invoke `ClaimRegistry.sol`;
- maintain readable claim metadata;
- reconcile sponsor/regulatory references without representing them as official certificates.

### 2.7 Settlement Service

Responsibilities:

- create settlement instructions;
- validate Beckn/commercial contract reference;
- calculate expected payment;
- orchestrate dINR funding and asset locking;
- monitor required attestations;
- trigger settlement/refund/expiry where permitted;
- reconcile `SettlementEngine.sol` state.

### 2.8 Blockchain Adapter / Indexer

Responsibilities:

- submit authorised Ethereum transactions;
- expose read-only chain queries;
- subscribe to contract events;
- maintain indexed read projections;
- track transaction confirmation/failure;
- never treat indexed projections as the economic source of truth.

### 2.9 Beckn Provider Node

Responsibilities:

- publish eligible recovery assets into the catalogue;
- respond to Beckn selection/contracting/status interactions;
- map Beckn resource/offer/contract IDs to canonical Finternet identifiers.

### 2.10 Beckn Consumer Node

Responsibilities:

- allow an independent buyer/agent to discover assets;
- receive provider responses;
- establish Beckn contract context;
- interact with identity and Ethereum verification endpoints.

### 2.11 AI Agent Gateway

Responsibilities:

- expose a restricted tool set to the LLM/agent;
- perform policy checks before write actions;
- maintain human approval where required;
- use delegated/session authority rather than organisation master keys;
- log every tool decision and resulting transaction.

---

## 3. API conventions

### Base URL

Example:

```text
https://api.finternet-poc.sumasoft.com/v1
```

### Format

- JSON over HTTPS for Suma application APIs;
- Beckn-defined signed HTTP payloads for open-network interactions;
- Ethereum JSON-RPC accessed only by trusted adapters/services, not exposed directly as a public Suma API.

### Common headers

```text
Authorization: Bearer <OIDC-token>
X-Correlation-Id: <uuid>
Idempotency-Key: <uuid>        # required for mutating financial/token actions
Content-Type: application/json
```

### API response envelope

Recommended:

```json
{
  "data": {},
  "meta": {
    "correlationId": "...",
    "timestamp": "..."
  },
  "errors": []
}
```

For asynchronous blockchain transactions, APIs should return both application operation ID and transaction status/reference.

---

# 4. Participant and identity APIs

## POST `/participants`

Create participant onboarding record.

**Caller:** Network Admin / authorised onboarding service.

Minimum request:

```json
{
  "legalName": "Example Recycler Pvt Ltd",
  "displayName": "Recycler X",
  "organisationType": "PROCESSOR",
  "registrationReference": "REG-123",
  "jurisdiction": "IN",
  "contact": {
    "email": "ops@example.com"
  }
}
```

Returns:

- Participant ID;
- onboarding status;
- proposed DID;
- account setup status.

## POST `/participants/{participantId}/did`

Create/publish `did:web` DID document.

## POST `/participants/{participantId}/accounts`

Bind an ERC-4337 smart account to the participant.

Must require proof/administrative authorisation; binding cannot be performed solely because an address is supplied.

## GET `/participants/{participantId}`

Returns public/authorised profile view.

## GET `/participants/{participantId}/trust`

Returns an aggregated trust view:

- DID;
- active smart account;
- credential classes/status;
- on-chain eligibility status;
- material permissions where applicable.

---

# 5. Credential APIs

## POST `/credentials/issue`

Issue a VC.

**Caller:** Credential Authority only.

Request includes:

- participant ID;
- credential type;
- roles;
- material classes;
- validity period;
- wallet binding if applicable.

Output includes:

- Credential ID;
- signed VC document;
- credential status URL;
- Ethereum eligibility update transaction reference.

## POST `/credentials/verify`

Input:

- VC or Credential ID;
- intended action/context.

Checks:

- signature/proof;
- issuer;
- validity period;
- status/revocation;
- subject/DID;
- bound Ethereum account where relevant;
- required role/material permissions.

## POST `/credentials/{credentialId}/revoke`

Revokes/statuses the off-chain credential and updates on-chain eligibility where relevant.

## GET `/credentials/{credentialId}/status`

Publicly callable within PoC trust policy.

---

# 6. Recovery asset APIs

## POST `/assets`

Create canonical asset record before minting.

Request includes:

```json
{
  "originatorParticipantId": "ORG-AAMHI-001",
  "materialCode": "PLASTIC-LDPE",
  "quantity": 1000,
  "unit": "kg",
  "origin": {
    "district": "Raigad",
    "state": "Maharashtra",
    "country": "IN"
  }
}
```

Returns canonical `assetId` and status `DRAFT` or `RECOVERED`.

## POST `/assets/{assetId}/evidence`

Register/upload evidence using Evidence Service.

## POST `/assets/{assetId}/verify`

Initiate verification and link qualifying attestation(s).

## POST `/assets/{assetId}/tokenise`

Preconditions:

- asset exists;
- verified quantity is whole kg for initial PoC;
- eligible originator;
- valid verification attestation;
- evidence root present;
- no prior mint for asset ID.

Action:

1. generate canonical metadata;
2. pin public metadata to IPFS;
3. call `RecoveryAsset.mintAsset(...)`;
4. wait for required confirmation policy;
5. store immutable assetId ↔ tokenId mapping.

Returns:

```json
{
  "assetId": "RWA-RAI-2026-000001",
  "contractAddress": "0x...",
  "tokenId": "10001",
  "mintedSupply": 1000,
  "txHash": "0x..."
}
```

## GET `/assets/{assetId}`

Returns canonical view plus live/reconciled chain data.

## GET `/assets/{assetId}/provenance`

Returns chronological provenance projection from:

- asset events;
- evidence references;
- attestations;
- ERC-1155 transfer events;
- settlements;
- claims.

## POST `/assets/{assetId}/retire`

Controlled retirement/consumption path.

---

# 7. Evidence APIs

## POST `/evidence`

Multipart upload or presigned-upload workflow.

Returns:

- Evidence ID;
- SHA-256 hash;
- secure storage reference;
- classification;
- timestamp.

## GET `/evidence/{evidenceId}`

Authorised metadata retrieval.

Raw file access must use short-lived authorised URLs, not permanent public links.

## POST `/evidence/manifests`

Create deterministic canonical JSON manifest and resulting root/hash.

---

# 8. Attestation APIs

## POST `/attestations`

Creates a physical-world attestation.

Example:

```json
{
  "type": "RECEIPT_CONFIRMED",
  "assetId": "RWA-RAI-2026-000001",
  "tokenId": "10001",
  "settlementId": "STL-000021",
  "attestorParticipantId": "ORG-RECYCLER-001",
  "quantity": 982,
  "unit": "kg",
  "eventTime": "2026-10-14T11:35:00Z",
  "evidenceManifestId": "EVM-001"
}
```

Service must:

1. authenticate attestor;
2. verify active credential/role;
3. verify relation to transaction;
4. calculate/resolve evidence hash;
5. obtain participant/authorised signature;
6. submit attestation to Ethereum;
7. return tx hash and attestation ID.

## GET `/attestations/{attestationId}`

Returns on-chain and readable metadata view.

---

# 9. Claim APIs

## POST `/claims`

Create derived claim.

Required fields vary by claim type.

Validation must include:

- underlying asset/token exists;
- source attestation/reference valid;
- requested quantity does not exceed allowable underlying quantity;
- uniqueness/double-counting constraints satisfied.

## POST `/claims/{claimId}/consume`

Marks a consumable claim used.

## POST `/claims/{claimId}/dispute`

Administrative/dispute workflow where enabled.

## GET `/assets/{assetId}/claims`

Returns all claims and their statuses.

---

# 10. dINR APIs

These are administrative/application abstractions around `DemoINR.sol`.

## POST `/dinr/fund`

**Caller:** Treasury Admin only.

Funds a credentialled PoC account.

## GET `/dinr/balance/{participantId}`

Returns live on-chain balance plus last indexed block.

## POST `/dinr/reset`

Demo/reset process only; tightly restricted and disabled in normal execution mode.

---

# 11. Settlement APIs

## POST `/settlements`

Creates settlement record based on confirmed commercial terms.

Illustrative request:

```json
{
  "contractId": "CTR-000123",
  "assetId": "RWA-RAI-2026-000001",
  "tokenId": "10001",
  "sellerParticipantId": "ORG-AAMHI-001",
  "buyerParticipantId": "ORG-BUYER-001",
  "quantity": 500,
  "unitPrice": 20,
  "currencyToken": "dINR",
  "settlementType": "CONDITIONAL_DVP",
  "requiredAttestationType": "RECEIPT_CONFIRMED",
  "expiry": "2026-10-20T18:00:00Z"
}
```

Returns `settlementId` and transaction reference.

## POST `/settlements/{settlementId}/fund`

Funds dINR escrow.

## POST `/settlements/{settlementId}/lock-asset`

Transfers agreed ERC-1155 units into SettlementEngine custody.

## POST `/settlements/{settlementId}/evaluate`

Read/evaluate readiness. This endpoint must not invent state; readiness is derived from contract state and qualifying attestations.

## POST `/settlements/{settlementId}/settle`

Triggers settlement where contract conditions are satisfied.

## POST `/settlements/{settlementId}/refund`

Allowed only under contract policy.

## GET `/settlements/{settlementId}`

Returns:

- commercial identifiers;
- asset lock;
- dINR funding;
- required attestations;
- chain state;
- settlement status;
- tx hashes.

---

# 12. Discovery / Beckn APIs

Use Beckn v2 transport and domain/profile extensions rather than replacing them with proprietary equivalents.

Required PoC interaction families:

- catalogue publication/synchronisation;
- discovery/search;
- selection;
- contract/initiation;
- confirmation;
- status/update;
- fulfilment status.

The Suma Provider Node must expose a canonical mapping between:

```text
Beckn Resource ID ↔ Asset ID ↔ ERC-1155 Token ID
Beckn Contract ID ↔ Commercial Contract ID ↔ Settlement ID
```

The Consumer Node must independently verify Ethereum state before treating catalogued quantity as available.

---

# 13. Explorer / read APIs

Recommended read endpoints:

- `GET /explorer/assets/{assetId}`
- `GET /explorer/tokens/{contract}/{tokenId}`
- `GET /explorer/participants/{participantId}`
- `GET /explorer/settlements/{settlementId}`
- `GET /explorer/attestations/{attestationId}`
- `GET /explorer/claims/{claimId}`

Explorer must clearly distinguish:

- data read from Ethereum;
- signed off-chain metadata;
- application projections.

---

# 14. Blockchain event indexing

Subscribe to at least:

- `ParticipantRegistered`;
- `ParticipantAccountUpdated`;
- `EligibilityUpdated`;
- ERC-1155 `TransferSingle` / `TransferBatch`;
- `AssetMinted`;
- `AssetRetired`;
- dINR `Transfer`;
- `AttestationSubmitted`;
- `ClaimCreated` / `ClaimConsumed`;
- all `SettlementEngine` lifecycle events.

Each indexed event stores:

- chain ID;
- contract address;
- block number;
- transaction hash;
- log index;
- decoded event;
- indexed timestamp;
- reconciliation status.

Reorg handling must be supported in the indexer even on testnet.

---

# 15. Idempotency and transaction safety

Token/financial write APIs must use idempotency keys.

Rules:

- one application request cannot accidentally mint twice;
- one retry cannot create two settlements;
- a confirmed chain transaction is reconciled before resubmission;
- pending/failed blockchain states remain explicit;
- application timeout does not imply blockchain failure.

---

# 16. Authentication and authorisation

Application access:

- OAuth2/OIDC;
- RBAC by participant and user role;
- MFA for administrative users.

Economic eligibility:

- W3C VC verification;
- Participant Registry;
- on-chain Credential Registry;
- contract-level policy.

These are intentionally separate. An authenticated application user is not automatically eligible for an on-chain economic action.

---

# 17. Error taxonomy

Use stable machine-readable error codes, including:

```text
PARTICIPANT_NOT_ACTIVE
CREDENTIAL_INVALID
CREDENTIAL_EXPIRED
MATERIAL_NOT_PERMITTED
ASSET_NOT_VERIFIED
ASSET_ALREADY_TOKENISED
INSUFFICIENT_TOKEN_BALANCE
ASSET_BLOCKED
SETTLEMENT_NOT_FUNDED
ASSET_NOT_LOCKED
ATTESTATION_MISSING
ATTESTATION_INVALID
CLAIM_CONFLICT
SETTLEMENT_EXPIRED
CHAIN_TX_PENDING
CHAIN_TX_REVERTED
INDEXER_NOT_SYNCED
```

---

# 18. Minimum service deployment for PoC

The logical services above do not need 11 independent microservices.

For the first build, use approximately:

```text
1. API / Core Application Service
2. Identity + Credential Service
3. Blockchain Adapter + Indexer
4. Beckn Provider Node
5. Beckn Consumer Node / Independent Buyer App backend
6. AI Agent Gateway
7. PostgreSQL
8. Object Storage
9. IPFS pinning/access component
```

Boundaries should exist in code and APIs even if several modules share a deployable service initially.

---

# 19. Definition of done for this specification

Pack 3 is ready for OpenAPI generation when:

- every write operation has an authorised caller;
- every blockchain-changing endpoint maps to a Pack 2 contract function;
- canonical IDs are present in all relevant requests;
- Beckn identifiers map to Finternet identifiers;
- asynchronous chain state is represented correctly;
- sensitive evidence is never exposed by public discovery endpoints;
- the independent buyer application can operate without database-level access to the provider application.
