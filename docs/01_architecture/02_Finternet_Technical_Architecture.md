# Finternet PoC — Detailed Technical Architecture

**Project:** Suma Finternet PoC — Tokenised Recovery Asset Demonstrator  
**Status:** Pack 1 Architecture Baseline  
**Purpose:** Define the end-to-end technical architecture, boundaries, Finternet mapping and frozen design choices before detailed contract/API/schema design.

---

# 1. Architecture objective

The architecture must prove that independently operated applications can exchange value around a real-world asset using interoperable digital primitives rather than a single central application/database.

The architecture therefore combines:

- organisational identity;
- verifiable credentials;
- Ethereum smart accounts;
- a standardised real-world asset model;
- ERC-1155 tokenisation;
- Beckn v2 open discovery and contracting interactions;
- ERC-20-style programmable settlement value;
- Solidity smart-contract settlement;
- signed physical-world attestations;
- claims and rights integrity;
- off-chain evidence/data services;
- bounded AI-agent participation.

The result should behave as a **Finternet demonstrator**, not as a conventional marketplace with blockchain added for audit.

---

# 2. Architecture principles

## 2.1 Open, not application-bound

The buyer must be able to discover and transact with an asset without becoming a user of the originator's internal application or querying its private database.

## 2.2 Public standards first

Use recognised standards wherever they fit:

- Ethereum/EVM;
- Solidity;
- ERC-1155;
- ERC-20;
- ERC-4337;
- W3C Verifiable Credentials 2.0;
- `did:web`;
- Beckn Protocol v2.0;
- HTTP/REST;
- content-addressed metadata.

## 2.3 Identity is not a wallet address

An Ethereum account is a transaction/control endpoint. Organisational identity is represented separately through a DID and credentials.

## 2.4 Tokenisation is not merely hashing a database record

The ERC-1155 token must carry genuine economic state: supply, balances, transferability, locks and settlement consequences.

## 2.5 Public ledger does not mean public business data

Only shared economic state and cryptographic references belong on Ethereum. Sensitive documents and private operational data remain off-chain.

## 2.6 Real-world facts enter through explicit trust mechanisms

The blockchain cannot know physical events directly. Physical events become machine-actionable through signed attestations issued by credentialled entities.

## 2.7 Programmable money is demonstrated, not misrepresented

`dINR` demonstrates tokenised settlement functionality. It is not claimed to be regulated INR, CBDC, a bank deposit or a redeemable stablecoin.

## 2.8 Claims are not automatically tokens

Derived rights/outcomes are registered as claims/attestations unless independent transferability or divisibility creates a reason to tokenise them.

## 2.9 AI authority is bounded

AI agents never receive unrestricted root-wallet authority. Any execution authority is constrained by smart-account policy/session permissions.

---

# 3. Logical architecture overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HUMAN USERS / AI AGENTS                             │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                  APPLICATION + SMART ACCOUNT EXPERIENCE                     │
│  Originator App | Buyer App | Admin | Explorer | Agent Tools               │
│                  ERC-4337-style account abstraction                         │
└───────────────────────┬───────────────────────────────┬─────────────────────┘
                        │                               │
                        ▼                               ▼
┌───────────────────────────────┐        ┌────────────────────────────────────┐
│ IDENTITY / TRUST              │        │ OPEN NETWORK / BECKN v2            │
│ Participant ID                │        │ Provider Node                      │
│ did:web                       │        │ Consumer Node                      │
│ W3C VC 2.0                    │        │ Cataloging                         │
│ Credential issuer/verifier    │        │ Discovery                          │
│ On-chain eligibility status   │        │ Contracting / status               │
└───────────────┬───────────────┘        └──────────────────┬─────────────────┘
                │                                           │
                └──────────────────────┬────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TRANSACTION / API LAYER                             │
│ Participant | Asset | Evidence | Attestation | Contract | Claims | Settlement│
└───────────────────────┬───────────────────────┬─────────────────────────────┘
                        │                       │
             ┌──────────┴──────────┐            │
             ▼                     ▼            ▼
┌──────────────────────┐   ┌───────────────────┐   ┌──────────────────────────┐
│ ERC-1155 RWA          │   │ ERC-20 dINR       │   │ CLAIM / ATTESTATION      │
│ RecoveryAsset.sol     │   │ DemoINR.sol       │   │ REGISTRIES               │
│ quantity & ownership  │   │ sandbox money     │   │ rights, events, hashes   │
└───────────┬──────────┘   └──────────┬────────┘   └─────────────┬────────────┘
            │                         │                           │
            └─────────────────────────┼───────────────────────────┘
                                      ▼
                          ┌────────────────────────┐
                          │ SETTLEMENT ENGINE      │
                          │ Solidity               │
                          │ locking                │
                          │ conditions             │
                          │ DvP                    │
                          │ refunds / splits       │
                          └───────────┬────────────┘
                                      │
                                      ▼
                          ┌────────────────────────┐
                          │ ETHEREUM PUBLIC TESTNET│
                          └────────────────────────┘

Physical world / enterprise systems
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ EVIDENCE + ATTESTATION SERVICES                                             │
│ collection | weighment | dispatch | receipt | processing | external refs    │
│ signed by credentialled actors                                              │
└───────────────────────┬─────────────────────────────────────────────────────┘
                        │
             ┌──────────┴───────────┐
             ▼                      ▼
     PostgreSQL / IPFS       Secure object storage
                             (documents/photos/PII)
```

---

# 4. Finternet primitive mapping

| Finternet primitive | PoC implementation |
|---|---|
| Identity | Participant ID + `did:web` |
| Trust | W3C VC 2.0 + issuer/verifier + on-chain eligibility status |
| Asset representation | Canonical Recovery Asset object/schema |
| Tokenisation | ERC-1155 `RecoveryAsset.sol` |
| Discoverability | Beckn v2 catalog and Discovery Service |
| Contracting | Beckn select/init/confirm + transaction service |
| Programmable money | Permissioned ERC-20-style `dINR` |
| Programmable rights | ERC-1155 transfer controls + Claim Registry |
| Conditional execution | `SettlementEngine.sol` |
| Atomic settlement | ERC-1155 ↔ dINR DvP |
| Physical-digital bridge | Signed credentialled attestations |
| Interoperability | Beckn APIs + Ethereum contracts + canonical IDs |
| Composability | Claims/attestations linked to reusable token state |
| Agentic interaction | Bounded AI agent using standard APIs and smart-account permissions |

---

# 5. Identity and trust architecture

## 5.1 Identity layers

A participant has four distinct identities/references:

```text
Business organisation
        ↓
Network Participant ID
        ↓
did:web organisational DID
        ↓
Ethereum smart account(s)
```

These must not be collapsed into one value.

Example:

```text
Participant ID: ORG-RECYCLER-001
DID:            did:web:finternet-poc.example:participants:recycler-001
Smart Account:  0xABC...
```

## 5.2 Why `did:web`

`did:web` provides a simple organisational identifier tied to a domain/HTTPS trust surface while remaining separate from Ethereum keys.

This allows:

- Ethereum key rotation without changing organisational identity;
- multiple Ethereum accounts to be associated with one organisation;
- identity resolution using normal web infrastructure;
- clearer enterprise semantics than treating a wallet address as a legal/business identity.

## 5.3 Verifiable Credentials

Use W3C VC Data Model 2.0-compatible credentials.

Credential roles include:

- issuer;
- holder/subject;
- verifier.

Initial credential classes:

- OrganisationCredential;
- NetworkParticipantCredential;
- RecoveryOriginatorCredential;
- ProcessorCredential;
- VerifierCredential.

Credential payloads remain off-chain.

## 5.4 Hybrid credential enforcement

Full credentials should not be copied to Ethereum.

Instead maintain a minimal on-chain policy/status representation, for example:

```text
Ethereum account
→ participant ID hash/reference
→ authorised role/class
→ status
→ expiry
```

Smart contracts can therefore reject an otherwise valid ERC transfer if the receiving participant is not eligible.

Illustrative rule:

```text
Transfer 500 units of Token 10001 to Recycler X
        ↓
Is recipient smart account active?
        ↓
Does recipient have required Processor eligibility?
        ↓
Is credential/status valid and unexpired?
        ↓
YES → transfer can continue
NO  → revert
```

The exact contract/data representation is Pack 2 work.

---

# 6. Smart-account architecture

## 6.1 Why account abstraction

The user experience should look like an enterprise application, not a crypto wallet workflow.

ERC-4337-style account abstraction allows smart-account logic, bundlers and optional paymasters to provide:

- organisation policies;
- multi-signer controls;
- gas abstraction/sponsorship;
- account recovery patterns;
- session keys;
- delegated/bounded AI permissions.

## 6.2 Organisation smart account

Conceptual structure:

```text
Organisation Smart Account
    │
    ├── Root/Admin Signer
    ├── Operations Signer
    └── AI Session Authority
          ├── allowed contract methods
          ├── maximum dINR value
          ├── allowed asset/material filters
          ├── allowed counterparties
          └── expiry
```

## 6.3 AI authority

Initial PoC default:

- agent may search and analyse without signing authority;
- agent may prepare a transaction;
- human approves the final commitment.

Advanced demonstration may allow bounded execution under a short-lived policy/session key.

The AI service must never contain an unrestricted organisation root private key.

---

# 7. Canonical Recovery Asset model

Tokenisation begins with a standardised digital economic object.

Baseline canonical fields:

```text
assetId
schemaVersion
assetType
materialCode
materialDescription
quantity
unit
originGeography
originatorParticipantId
originatorDID
currentCustodian
verificationStatus
qualityGrade
evidenceRoot
createdAt
verifiedAt
regulatoryCategoryReference
```

Not every field is necessarily stored directly on-chain.

The canonical asset object is the semantic bridge between:

- operational data;
- Beckn catalogue resource;
- token metadata;
- Ethereum token ID;
- evidence;
- claims;
- settlement.

---

# 8. ERC-1155 token architecture

## 8.1 Why ERC-1155

ERC-1155 allows one contract to manage multiple token IDs and allows each token ID to have its own supply and metadata. It also supports single and batch balance/transfer operations.

This fits the PoC because each verified recovery lot can be one token ID while the lot quantity is represented by token units.

## 8.2 Baseline representation

```text
Contract: RecoveryAsset.sol

Token ID: 10001
Asset ID: RWA-RAI-2026-001
Material: LDPE
Verified Quantity: 1000 kg
Initial Supply: 1000
Unit Meaning: 1 ERC-1155 unit = 1 kg
```

Initial ownership:

```text
Aamhi Smart Account
Token 10001 balance = 1000
```

Partial transaction:

```text
Aamhi balance     = 600
Buyer balance     = 400
Token ID          = 10001
Total supply      = 1000
```

## 8.3 Economic meaning

For the PoC, a token unit represents a transferable contractual/economic entitlement associated with one kilogram of the identified verified recovery lot.

The system must not claim that token ownership automatically overrides external property, custody, contract or regulatory law.

## 8.4 Transfer policy

A normal ERC-1155 implementation is insufficient because the PoC requires governed transferability.

Transfer checks may include:

- sender eligibility/status;
- receiver eligibility/status;
- token state;
- quantity availability;
- active lock/reservation;
- required role/class;
- compliance/credential expiry;
- settlement-engine authority.

The final approach may use contract hooks/overrides or a policy contract. Pack 2 will specify this.

## 8.5 Lifecycle

Proposed lifecycle concepts:

```text
CREATED
VERIFIED
TOKENISED
AVAILABLE
RESERVED / LOCKED
PARTIALLY_TRANSFERRED
TRANSFERRED
FULFILLED
PROCESSED
RETIRED / CLOSED
```

Operational lifecycle state and token ownership state must remain consistent but should not be confused as the same concept.

---

# 9. Metadata architecture

## 9.1 ERC-1155 metadata URI

Each token ID resolves to a JSON metadata object.

Non-sensitive metadata is published using IPFS/content addressing.

Illustrative structure:

```json
{
  "name": "Verified Recovery Asset RWA-RAI-2026-001",
  "description": "Verified LDPE recovery lot",
  "asset_id": "RWA-RAI-2026-001",
  "material_code": "LDPE",
  "verified_quantity": 1000,
  "unit": "kg",
  "origin_region": "Raigad, Maharashtra",
  "originator_did": "did:web:...",
  "evidence_root": "0x...",
  "schema_version": "1.0"
}
```

Exact schema is Pack 3 work.

## 9.2 Sensitive evidence

Documents/photos are held in secured object storage.

Ethereum/IPFS may store only:

- evidence ID;
- content hash/root;
- issuer/attestor reference;
- timestamp;
- access-policy reference.

---

# 10. Beckn v2 open-network architecture

## 10.1 Purpose

Beckn is used for discoverability and interoperable value-exchange interactions. It prevents the PoC from becoming a closed marketplace where both parties must use the same application.

## 10.2 Core actors

For the PoC:

- **Provider Node (PN):** exposes the recovery asset/offers;
- **Consumer Node (CN):** represents buyer application/agent;
- **Cataloging Service (CS):** receives/synchronises catalog information;
- **Discovery Service (DS):** indexes/catalogs and answers discovery intents.

## 10.3 Catalog-first discovery

Conceptual flow:

```text
Originator Application
        ↓
Provider Node
        ↓ catalog/publish
Cataloging Service
        ↓
Discovery Service indexes/synchronises
        ↑ discover
Consumer Node
        ↑
Buyer App / AI Agent
```

## 10.4 Asset mapping

A Beckn Resource/Item must include sufficient references to resolve the underlying Finternet asset.

Example mappings:

```text
Beckn resource ID      ↔ Recovery Asset ID
Recovery Asset ID      ↔ ERC-1155 contract + token ID
Beckn provider         ↔ Participant ID / DID
Beckn offer            ↔ commercial terms
Beckn contract         ↔ application transaction + settlement ID
```

## 10.5 Protocol interactions

Use Beckn v2.0 endpoint families relevant to the PoC:

Discovery:

- `/discover`
- `/on_discover`

Contracting:

- `/select`
- `/on_select`
- `/init`
- `/on_init`
- `/confirm`
- `/on_confirm`

Performance/status:

- `/status`
- `/on_status`
- `/update`
- `/on_update`
- optional `/cancel` flows.

Cataloging:

- relevant `/catalog/*` APIs.

Beckn HTTP signatures are used as required by the protocol specification.

---

# 11. Transaction and contracting architecture

The economic agreement should bridge the open-network transaction and on-chain settlement.

Conceptual object:

```text
Commercial Transaction
----------------------
transactionId
becknTransactionId
sellerParticipantId
buyerParticipantId
assetId
erc1155Contract
tokenId
quantity
unitPrice / total consideration
currency/settlementAsset
settlementConditions
expiry
status
settlementId
```

The contract/agreement itself does not have to be fully encoded as legal prose on-chain.

The blockchain needs only the parameters required to safely execute the economic state transition.

---

# 12. Programmable money architecture

## 12.1 dINR purpose

`DemoINR.sol` demonstrates tokenised settlement value on the same programmable execution environment.

Properties:

- ERC-20-style interface;
- symbol `dINR`;
- controlled minting;
- approved/eligible participants;
- transfer restrictions if required;
- no public redemption claim;
- administrator reset/burn capability for the PoC.

## 12.2 Why permissioned behaviour

A realistic future tokenised-money environment is likely to impose identity, issuer and policy constraints. Therefore the PoC should not intentionally behave like an unrestricted speculative cryptocurrency.

The architectural analogy is:

```text
regulated/tokenised money in future system
            ↓
permissioned dINR simulation in PoC
```

not:

```text
cryptocurrency investment token
```

---

# 13. Settlement architecture

## 13.1 Settlement engine

`SettlementEngine.sol` coordinates asset and payment state.

The settlement record should reference:

```text
settlementId
seller
buyer
assetContract
tokenId
assetQuantity
paymentToken
paymentAmount
conditions
expiry
status
```

## 13.2 DvP

Example:

```text
Seller locks 500 units of ERC-1155 Token 10001
Buyer locks 10,000 dINR

             ↓
       CONDITIONS MET
             ↓

500 ERC-1155 units → Buyer
AND
10,000 dINR → Seller
```

Both state transitions should execute atomically inside the settlement logic where technically practical.

## 13.3 Conditional settlement

Example condition:

```text
Receipt attestation exists
AND
Attestor has valid ProcessorCredential
AND
Received quantity ≥ minimum tolerance
```

Then settlement executes.

## 13.4 Quantity-adjusted settlement

Example:

```text
Contracted quantity: 1000 kg
Received/accepted:     982 kg
Rate:                  20 dINR/kg
Final payment:         19,640 dINR
```

Rules and tolerances must be defined in the transaction before fulfilment.

## 13.5 Multi-party distribution

One demonstration may split settlement:

```text
Total settlement: 20,000 dINR

18,000 → recovery originator
 1,000 → logistics participant
 1,000 → verifier/service participant
```

This demonstrates programmable value distribution across a network.

---

# 14. Physical-world attestation architecture

## 14.1 Problem

Ethereum cannot directly know:

- a physical lot was collected;
- a weighbridge reading is correct;
- material was dispatched;
- 982 kg was received;
- processing occurred.

These are external facts.

## 14.2 Solution

Use signed assertions from credentialled actors.

```text
Physical event
      ↓
Authorised actor
      ↓
Signed attestation
      ↓
Attestation Service
      ↓
Verify signature + credential + transaction authority
      ↓
Attestation Registry / on-chain reference
      ↓
Settlement condition
```

## 14.3 Attestation baseline

```text
attestationId
schemaType
assetId
tokenId
transactionId
attestorParticipantId
attestorDID
attestorAccount
eventType
quantity/value
timestamp
evidenceHash
signature
status
```

## 14.4 Trust policy

Not every participant may attest every fact.

Examples:

- verifier may issue `ASSET_VERIFIED`;
- seller may issue `DISPATCHED`;
- contracted processor may issue `RECEIVED`;
- eligible processor may issue `PROCESSED`.

This policy is part of the trust/credential architecture.

---

# 15. Claims and rights architecture

## 15.1 Distinguish four concepts

### Asset

The economic object that can be owned/held/transferred.

### Claim

A right, attribution, status or derived outcome associated with an asset or transaction.

### Attestation

A signed statement by an actor that an event/fact is true.

### Evidence

The underlying source material supporting the statement.

## 15.2 Initial claim examples

- receipt confirmed;
- processing completed;
- sponsor attribution issued;
- EPR reference matched;
- payment/right settled.

## 15.3 Anti-double-counting

Rules must prevent:

- transfer quantity > holder balance;
- simultaneous settlement of already locked units;
- processed quantity > eligible received quantity;
- duplicate claim issuance where the claim type is exclusive;
- consumption of an already consumed claim;
- active commitments exceeding available asset quantity.

Some protections arise naturally from ERC-1155 balances; others require claim/settlement state.

---

# 16. On-chain architecture

Baseline Solidity components:

```text
ParticipantRegistry.sol
CredentialRegistry.sol
RecoveryAsset.sol
ClaimRegistry.sol
AttestationRegistry.sol
DemoINR.sol
SettlementEngine.sol
```

Potential supporting contracts/libraries may include:

- policy/access-control module;
- smart-account contracts/integration;
- factory/deployment helpers;
- interfaces.

Pack 2 will determine exact contract separation.

### On-chain data should include only what shared execution requires

Examples:

- token ID and supply/balances;
- asset state needed by transfer rules;
- participant/account eligibility status;
- lock/reservation state;
- claims/consumption markers;
- attestation references/hashes;
- settlement parameters/state;
- dINR balances;
- smart-contract events.

---

# 17. Off-chain architecture

## 17.1 PostgreSQL

Stores application/search/workflow state such as:

- participant profiles;
- credential metadata;
- recovery-asset operational record;
- evidence metadata;
- Beckn mappings;
- commercial transaction data;
- claim metadata;
- blockchain transaction/indexing data;
- application audit data.

Ethereum remains authoritative for on-chain ownership/settlement state. PostgreSQL may mirror it for efficient application use.

## 17.2 Object storage

Stores:

- images;
- weighment documents;
- contracts;
- invoices;
- confidential evidence;
- regulatory documents;
- other sensitive files.

## 17.3 IPFS

Stores non-sensitive content-addressed metadata required to resolve token information.

## 17.4 Indexer/event listener

An application service listens to Ethereum contract events and updates searchable/read models.

Never silently treat the application database as more authoritative than confirmed on-chain state for token ownership/settlement.

---

# 18. API/service architecture

Logical services:

```text
Identity Service
Credential Service
Participant Service
Asset Service
Evidence Service
Tokenisation Service
Beckn Provider Service
Beckn Consumer Service
Attestation Service
Claim Service
Settlement Service
Blockchain Gateway / Indexer
AI Agent Service
Explorer API
```

For the PoC these do not need to become separate physical microservices. They can be modular services/modules in a smaller deployable architecture.

The logical separation matters more than generating unnecessary infrastructure.

---

# 19. AI-agent architecture

## 19.1 Agent tool surface

The AI agent should receive controlled tools such as:

```text
discoverAssets(intent)
getAsset(assetId)
getTokenState(contract, tokenId)
verifyParticipant(participantId)
verifyCredential(participantId, credentialType)
getOffer(assetId)
prepareSelection(...)
prepareTransaction(...)
requestHumanApproval(...)
executeWithinPolicy(...)
```

## 19.2 Agent constraints

Policy examples:

```text
Maximum consideration: 50,000 dINR
Material: LDPE only
Minimum verification: VERIFIED
Counterparty credential: valid
Transaction expiry: <= 24 hours
Human confirmation: required above threshold
```

## 19.3 Separation from secrets

The LLM receives transaction data and tool outputs, not raw private keys.

Signing occurs through:

- smart-account service;
- policy engine;
- session key;
- human signer;
- secure key management.

---

# 20. Security architecture

Minimum controls:

- OAuth2/OIDC for application access;
- MFA for administrators;
- RBAC/ABAC for application actions;
- credential-based network eligibility;
- contract-level role/access control;
- smart-account signing policies;
- KMS/secrets manager;
- no private keys in source code;
- TLS for APIs;
- encrypted sensitive storage;
- tamper-evident/hash-linked evidence;
- audit logging;
- smart-contract automated tests;
- static analysis before demo deployment;
- separation of deployer/admin/participant accounts.

A fuller threat model is Pack 4.

---

# 21. Observability architecture

Monitor three planes.

## Application plane

- API latency/errors;
- login/permission failures;
- Beckn request failures;
- evidence upload failures;
- AI-agent tool errors.

## Blockchain plane

- contract transactions;
- reverts;
- event confirmations;
- settlement status;
- account/bundler/paymaster failures;
- RPC health.

## Business/transaction plane

- assets by lifecycle state;
- active reservations;
- unsettled transactions;
- attestation waiting time;
- claim conflicts;
- completed DvP transactions.

Use:

- OpenTelemetry;
- Prometheus;
- Grafana;
- structured logs.

---

# 22. Deployment architecture

## 22.1 Local

```text
Developer machine
├── local EVM
├── PostgreSQL
├── MinIO
├── APIs
├── frontends
└── contract tests
```

## 22.2 Integration

```text
Cloud environment
├── API/application runtime
├── PostgreSQL
├── object storage
├── credential issuer/verifier
├── Beckn components
├── observability
└── Ethereum testnet RPC
```

## 22.3 Demo

Same general stack as integration but with:

- stable demo database/data;
- public HTTPS endpoints;
- Ethereum public testnet contracts;
- explorer links;
- controlled participant accounts;
- test dINR balances;
- deterministic demonstration assets.

---

# 23. End-to-end architecture sequence

```text
1. ADMIN ONBOARDS ORIGINATOR
   → Participant ID
   → did:web
   → VC
   → smart account

2. ADMIN ONBOARDS PROCESSOR/BUYER
   → independent Participant ID / DID / VC / smart account

3. ORIGINATOR CREATES RECOVERY ASSET
   → operational data
   → evidence uploaded

4. VERIFIER ATTESTS ASSET
   → signature verified
   → credential checked
   → asset marked eligible

5. TOKENISATION SERVICE
   → publish metadata to IPFS
   → mint ERC-1155 Token 10001, supply 1000
   → originator smart account receives 1000 units

6. PROVIDER NODE
   → publishes Beckn catalog resource
   → includes token/asset resolution references

7. INDEPENDENT BUYER / AI AGENT
   → sends Beckn discovery intent
   → receives eligible asset/offer
   → verifies DID/VC/token state

8. CONTRACTING
   → select 500 kg
   → init terms
   → confirm transaction
   → create application transaction + settlement instruction

9. SETTLEMENT FUNDING
   → buyer locks dINR
   → originator locks 500 ERC-1155 units

10. PHYSICAL FULFILMENT
   → material dispatched
   → processor receives material

11. PROCESSOR ATTESTATION
   → signed quantity receipt
   → VC and authority checked
   → attestation recorded

12. SETTLEMENT ENGINE
   → verifies conditions
   → calculates final amount if quantity-adjusted
   → transfers ERC-1155 units to buyer
   → transfers dINR to seller/other configured recipients
   → emits settlement event

13. CLAIMS
   → processing/receipt or other claims linked
   → consumed/exclusive rights protected

14. EXPLORER
   → displays coherent transaction history
   → links Ethereum transaction hashes
```

---

# 24. Interoperability proof requirement

A central acceptance requirement is that the buyer side is independently operated.

The following architecture is required:

```text
ORIGINATOR SYSTEM                    BUYER SYSTEM
-----------------                    ------------
Originator App                       Buyer App / AI
Provider Node                        Consumer Node
Originator DB                        Buyer-side state
      │                                    │
      │                                    │
      └──── Beckn v2 interactions ─────────┘
                     │
                     ▼
            Shared Ethereum state
```

The buyer must not require direct access to the originator's PostgreSQL database or private APIs to discover and verify the tokenised asset.

This is a deliberate demonstration of an open, interoperable economic network rather than a single central platform.

---

# 25. Production analogue vs PoC implementation

| PoC | Possible production analogue |
|---|---|
| Ethereum public testnet | public Ethereum/L2, consortium EVM or regulated programmable ledger |
| dINR | tokenised deposit, CBDC, regulated stable-value settlement instrument or payment-rail integration |
| manually issued VC | authoritative issuer/registry integrated credential |
| manual verifier | accredited/automated verification services |
| signed business attestation | trusted oracle/regulated data provider/machine attestation |
| IPFS metadata | governed content-addressed metadata infrastructure |
| test participant smart accounts | enterprise smart accounts/HSM-backed accounts |
| PoC claims | legally defined digital rights/claims where applicable |

The PoC should demonstrate the technical pattern without pretending that its sandbox components already have the legal status of the possible production analogue.

---

# 26. Remaining design decisions for Pack 2/3

The architecture is frozen at the capability level. The following implementation details remain open:

1. exact public Ethereum testnet selected at deployment time;
2. Foundry vs Hardhat toolchain preference;
3. specific ERC-4337 smart-account implementation;
4. bundler and paymaster implementation/provider;
5. VC proof/serialization format and cryptographic suite;
6. exact credential status/revocation pattern;
7. exact Solidity contract separation and interfaces;
8. whether token transfer policies sit directly in `RecoveryAsset.sol` or a policy module;
9. exact locking mechanism for ERC-1155 settlement;
10. upgradeability vs immutable PoC contracts;
11. exact claim categories included in the first build;
12. exact attestation schema and whether it is its own contract;
13. IPFS hosting/pinning provider;
14. exact application/backend framework based on delivery-team standards;
15. AI-agent bounded-execution policy;
16. production-like key-management provider for the demo environment.

These should be settled through the detailed Pack 2 artifacts rather than during ad hoc implementation.

---

# 27. Architecture definition of success

The architecture succeeds if it enables this statement to be literally true:

> An independently operated participant or bounded AI agent can discover a real-world recovery asset through an open network, verify the identities and credentials behind it, acquire a quantity represented by a genuine ERC-1155 token on Ethereum, lock programmable settlement value, allow signed physical-world attestations to control execution, complete atomic asset-versus-money settlement, and independently inspect the resulting economic state without relying on one central application database.

---

# 28. Standards references

### Ethereum

- ERC-1155 Multi Token Standard: https://eips.ethereum.org/EIPS/eip-1155
- ERC-4337 Account Abstraction: https://eips.ethereum.org/EIPS/eip-4337

### Identity

- W3C Verifiable Credentials Data Model 2.0: https://www.w3.org/TR/vc-data-model-2.0/

### Open network

- Beckn Protocol v2.0 LTS: https://github.com/beckn/protocol-specifications-v2
- Beckn v2.0 API: https://github.com/beckn/protocol-specifications-v2/blob/main/api/v2.0.0/beckn.yaml

---

# 29. Next pack

Pack 2 should now define the Finternet core in developer-ready detail:

1. Identity, Credentials and Trust Model;
2. Recovery Asset and ERC-1155 Token Model;
3. Programmable Money / dINR Model;
4. Smart Contract Specifications;
5. Rights, Claims and Attestation Model;
6. Beckn Discovery and Contracting Model.
