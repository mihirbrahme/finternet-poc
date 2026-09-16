# Finternet PoC — Project Build Plan

**Project:** Suma Finternet PoC — Tokenised Recovery Asset Demonstrator  
**Audience:** Product lead, solution architect, blockchain engineers, backend/frontend engineers, Beckn engineers, DevOps, AI engineers, security, PoC participants  
**Purpose:** Explain in simple language exactly what will be built, what technology is required, what inputs are needed and how the project should be executed.

---

## 1. Project objective

Build a working end-to-end Finternet demonstrator in which a real-world recovery asset is:

> **verified → tokenised → discovered → contracted → transferred → programmatically paid for → settled → independently auditable.**

The PoC is not intended to prove only blockchain traceability. It must prove multiple Finternet capabilities working together:

- trusted digital identity;
- verifiable credentials;
- real-world asset tokenisation;
- open discovery;
- interoperable contracting;
- programmable money;
- conditional and atomic settlement;
- signed physical-world attestations;
- rights/claim management;
- AI-enabled discovery and transaction preparation.

---

## 2. What will be built

### 2.1 Participant and trust layer

Build functionality to:

- register an organisation;
- assign a unique participant ID;
- create a `did:web` identity;
- bind one or more Ethereum accounts to that identity;
- issue W3C Verifiable Credentials;
- verify credentials;
- revoke/suspend credentials;
- expose minimum eligibility/status information to smart contracts.

Minimum credentials:

- Organisation Credential;
- Network Participant Credential;
- Recovery Originator Credential;
- Processor Credential;
- Verifier Credential.

---

### 2.2 Smart account layer

Each organisation receives an Ethereum smart account using an ERC-4337-style account-abstraction pattern.

The application should hide normal crypto UX from business users.

Users should not need to manually manage:

- gas configuration;
- raw transaction parameters;
- seed phrases during normal PoC operation;
- direct smart-contract calls.

The smart-account layer should support:

- organisation-level account ownership;
- one or more authorised signers;
- transaction policies;
- optional gas sponsorship;
- temporary or bounded AI-agent permissions.

---

### 2.3 Recovery asset creation and verification

Build an application workflow to:

1. create a recovery lot;
2. enter material and quantity data;
3. upload evidence;
4. request verification;
5. create a signed verifier attestation;
6. mark the asset eligible for tokenisation.

Evidence remains off-chain.

A cryptographic hash or evidence root links the off-chain evidence to the digital asset.

---

### 2.4 ERC-1155 real-world asset token

Develop `RecoveryAsset.sol` using Solidity and ERC-1155.

Baseline model:

- one token ID represents one verified recovery lot;
- one token unit represents 1 kg of the material in that lot;
- balances therefore represent participant entitlements to quantities of the identified lot.

Example:

```text
Token ID: 10001
Material: LDPE
Original verified quantity: 1,000 kg
ERC-1155 supply: 1,000 units
1 unit = 1 kg
```

The contract must eventually support:

- mint;
- safe transfer;
- partial transfer;
- batch operations where useful;
- lock/reservation;
- transfer restrictions based on eligibility;
- retirement/burn;
- total-supply control;
- lifecycle events;
- metadata URI.

Exact contract interfaces are Pack 2 work.

---

### 2.5 Token metadata and evidence linkage

Public/non-sensitive asset metadata will be stored on IPFS.

Example metadata includes:

- asset ID;
- material;
- verified quantity;
- unit;
- general origin geography;
- originator DID;
- verification status;
- evidence root/hash;
- creation time;
- metadata schema version.

Sensitive evidence will be stored in private object storage such as S3 or MinIO.

---

### 2.6 Beckn open discovery

Build an open-network interaction using Beckn Protocol v2.0.

Required components for the PoC:

- Provider Node representing the asset originator;
- Consumer Node representing the buyer/consumer application;
- Cataloging Service interaction;
- Discovery Service interaction;
- Beckn request/response signing;
- mapping between Beckn resources/offers/contracts and Finternet asset/transaction identifiers.

Minimum value-exchange interactions to demonstrate:

- catalog publishing;
- discovery;
- selection;
- initialisation;
- confirmation;
- status/update.

The independent buyer application must not query the originator application's database directly.

---

### 2.7 Commercial transaction layer

Build a transaction service that links:

- Beckn offer/contract;
- buyer;
- seller;
- ERC-1155 token ID;
- quantity;
- price/consideration;
- settlement conditions;
- expiry;
- physical fulfilment status.

The legal/commercial document, if required, remains off-chain.

The transaction ID and relevant hash/reference can be linked to the settlement record.

---

### 2.8 Demo INR programmable settlement token

Develop `DemoINR.sol` as an ERC-20-style PoC settlement token.

Symbol: `dINR`

Purpose:

- simulate tokenised settlement value;
- lock funds in escrow;
- release milestone payments;
- demonstrate refunds;
- demonstrate split payments;
- support atomic Delivery-versus-Payment.

PoC controls should include:

- administrator-only minting;
- approved/eligible holders;
- optional freeze/suspend capability;
- no public redemption or sale;
- no representation as legal tender, CBDC or bank deposit.

---

### 2.9 Settlement engine

Develop `SettlementEngine.sol`.

The contract should ultimately support:

- creation of a settlement instruction;
- ERC-1155 asset locking;
- dINR locking;
- expiry;
- condition status;
- fulfilment confirmation;
- quantity adjustment;
- atomic exchange;
- refund/cancellation;
- multi-party payment split where configured.

Minimum demonstration patterns:

1. simple DvP;
2. conditional DvP;
3. quantity-adjusted settlement;
4. one multi-party distribution example.

---

### 2.10 Real-world attestation layer

Build an attestation service for events that Ethereum cannot observe directly.

Examples:

- verification complete;
- material dispatched;
- material received;
- quantity received;
- processing completed.

Attestations should contain:

- attestation ID;
- asset/token ID;
- transaction ID;
- attestor DID;
- attestor Ethereum account;
- event type;
- values/quantity;
- timestamp;
- evidence hash;
- signature.

Only properly credentialled actors should be able to submit attestations for relevant event types.

The attestation service/registry becomes an explicit bridge between physical events and smart-contract settlement.

---

### 2.11 Rights and claims registry

Develop a reusable claim model for rights/outcomes derived from an asset or transaction.

Initial examples:

- material entitlement/transfer state;
- receipt claim;
- processing claim;
- sponsor attribution;
- EPR reference/reconciliation status.

The PoC should not tokenise every claim automatically.

A derived claim becomes a separate token only when independent ownership, divisibility or transferability is genuinely needed.

---

### 2.12 Applications

Build four lightweight user-facing surfaces.

#### A. Originator application

Functions:

- organisation profile;
- create recovery asset;
- upload evidence;
- request verification;
- mint asset;
- publish asset;
- see discovery/offer activity;
- accept terms;
- see settlement status;
- see holdings and transaction history.

#### B. Buyer / processor application

Functions:

- discover through Beckn;
- review token/asset information;
- inspect participant credentials;
- select asset/quantity;
- confirm transaction;
- fund settlement;
- submit receipt attestation where applicable;
- see purchased holdings and history.

#### C. Network administration console

Functions:

- participant onboarding;
- DID administration;
- credential issuance/revocation;
- smart-account setup;
- dINR issuance;
- asset/claim inspection;
- transaction oversight;
- PoC dispute/reset administration.

#### D. Finternet explorer

Shows:

- asset/token ID;
- current balances/holders;
- token provenance;
- relevant credentials/status;
- claims;
- attestation history;
- settlement state;
- Ethereum transaction hash;
- external block-explorer link.

---

### 2.13 AI agent

Build one bounded AI transaction agent.

Minimum functions:

- accept a natural-language procurement intent;
- translate intent into discovery constraints;
- call Beckn discovery;
- inspect asset metadata;
- verify credentials/status;
- compare eligible assets;
- prepare a transaction proposal;
- optionally initiate an approved transaction using bounded smart-account authority.

The AI agent must never receive unrestricted access to an organisation's root private key.

Initial execution should use human approval before final commitment.

---

## 3. Technology stack

### 3.1 Blockchain

- Ethereum public testnet;
- Solidity;
- OpenZeppelin contract libraries;
- Foundry or Hardhat for build/test/deployment;
- ethers.js / viem-compatible integration library;
- EVM RPC provider.

### 3.2 Token standards

- ERC-1155 — recovery asset;
- ERC-20 — dINR settlement token;
- ERC-4337-style smart-account infrastructure.

### 3.3 Identity and credentials

- `did:web`;
- W3C Verifiable Credentials Data Model 2.0;
- credential issuer/verifier service;
- digital signatures;
- hybrid on-chain eligibility/status registry.

### 3.4 Open network

- Beckn Protocol v2.0 LTS;
- Beckn Consumer Node;
- Beckn Provider Node;
- Cataloging Service interaction;
- Discovery Service interaction;
- Beckn HTTP signatures.

### 3.5 Backend

Recommended baseline:

- Node.js + TypeScript;
- NestJS or equivalent structured API framework;
- REST APIs;
- PostgreSQL;
- Redis only if needed for caching/jobs;
- S3-compatible object storage / MinIO.

The backend framework can be changed without changing the Finternet architecture.

### 3.6 Frontend

- React;
- Next.js;
- business-friendly smart-account abstraction;
- no requirement for users to interact directly with MetaMask during normal flows.

### 3.7 Metadata

- IPFS for non-sensitive, content-addressed token metadata;
- application database for searchable operational state;
- private object storage for sensitive evidence.

### 3.8 AI

- LLM API with tool/function calling;
- agent service separated from wallet/private-key storage;
- explicit transaction policy and human-approval gate.

### 3.9 Observability

- OpenTelemetry;
- Prometheus;
- Grafana;
- structured application logs;
- blockchain event indexer/monitor;
- alerts for failed transactions and credential/settlement errors.

### 3.10 DevOps

- GitHub;
- GitHub Actions or equivalent CI/CD;
- Docker;
- cloud-hosted development/demo environment;
- Infrastructure-as-Code recommended for repeatability.

---

## 4. Accounts, subscriptions and infrastructure required

### 4.1 GitHub

Required:

- Suma-owned GitHub organisation or agreed repository owner;
- private project repository;
- branch protection;
- CI/CD access;
- developer accounts.

### 4.2 Cloud account

One cloud tenancy/project is required. OCI is suitable if Suma prefers it, but the architecture is cloud-neutral.

Resources required:

- application/container runtime;
- PostgreSQL;
- object storage or MinIO deployment;
- secrets manager/KMS;
- logging/monitoring runtime;
- public ingress/load balancer;
- DNS and TLS;
- optional Redis;
- optional managed Kubernetes only if justified; not mandatory for a small PoC.

### 4.3 Ethereum RPC account

Use one recognised Ethereum RPC provider or a self-hosted node.

Examples:

- Alchemy;
- Infura;
- QuickNode;
- equivalent.

Required features:

- Ethereum testnet HTTP endpoint;
- WebSocket/event endpoint preferred;
- API credentials;
- sufficient rate limits for demo/testing.

### 4.4 Testnet accounts and gas

Required:

- contract deployer account;
- admin smart account/signers;
- participant smart accounts;
- testnet native tokens from an appropriate faucet for deployment/gas where needed.

No real asset purchase should be required for the public-testnet demonstration.

### 4.5 Smart-account infrastructure

Required components may include:

- ERC-4337 smart-account implementation;
- bundler endpoint/service;
- EntryPoint integration;
- paymaster if gas sponsorship is demonstrated.

Whether these are self-hosted or obtained from a provider is an engineering/vendor choice to be fixed in Pack 2/3.

### 4.6 Domain and DNS

Recommended PoC namespace:

```text
finternet-poc.<suma-domain>
```

Possible endpoints:

```text
app.finternet-poc.<domain>
api.finternet-poc.<domain>
issuer.finternet-poc.<domain>
discovery.finternet-poc.<domain>
explorer.finternet-poc.<domain>
```

Exact naming can be simplified.

### 4.7 IPFS

Either:

- self-hosted IPFS node; or
- hosted IPFS/pinning provider.

Requirement:

- reliable persistence of non-sensitive token metadata during the PoC;
- authenticated publishing/pinning;
- gateway access.

### 4.8 LLM/API account

Required for the AI agent:

- API project/service account;
- protected API key;
- usage limits/budget;
- audit logging where available.

### 4.9 Email/notification service

Optional but useful:

- SMTP account;
- SendGrid or equivalent.

Used for:

- onboarding;
- credential notifications;
- transaction alerts;
- demo notifications.

### 4.10 Monitoring

Can be self-hosted using Prometheus/Grafana. A paid SaaS observability subscription is not required for the PoC unless preferred.

---

## 5. Environments

### Environment A — Local Development

Purpose:

- developer iteration;
- contract tests;
- API tests;
- deterministic resets.

Use:

- local EVM node;
- local PostgreSQL;
- local MinIO;
- local applications.

### Environment B — Shared Integration / Test

Purpose:

- team integration;
- end-to-end testing;
- credential/Beckn/service testing.

Use:

- shared cloud services;
- dedicated test database;
- Ethereum testnet or controlled test chain depending on test type.

### Environment C — Public PoC Demo

Purpose:

- leadership/partner demonstration;
- independently inspectable blockchain transactions.

Use:

- Ethereum public testnet;
- deployed PoC applications;
- public explorer surface;
- realistic test participants and data.

---

## 6. Data inputs required before build/demo

### 6.1 Participant inputs

For each participating organisation:

- organisation display name;
- legal name;
- organisation type;
- registration/reference number;
- authorised representative;
- email;
- mobile/contact;
- operating geography;
- intended network role;
- supported/authorised material classes;
- relevant registration/licence reference;
- credential validity dates where applicable.

For the PoC these may be manually verified if an authoritative live registry is unavailable.

### 6.2 Material master

For each selected material:

- material code;
- category;
- subcategory;
- description;
- unit;
- quality/grade;
- contamination tolerance;
- optional regulatory/EPR category mapping.

### 6.3 Recovery asset data

For each demonstrator lot:

- recovery asset ID;
- originator;
- material;
- recovery geography;
- estimated quantity;
- verified quantity;
- collection dates;
- storage/custody location;
- quality/grade;
- right-to-offer confirmation;
- verification status.

### 6.4 Evidence samples/live evidence

At minimum:

- collection record;
- one or more photos;
- weighment record;
- verification/inspection record;
- dispatch record;
- destination receipt/weighment;
- optional processing confirmation.

### 6.5 Commercial inputs

- quantity offered;
- price or consideration;
- minimum acceptable quantity;
- settlement tolerance;
- settlement expiry;
- delivery/receipt condition;
- payment split if used;
- refund/cancellation conditions.

### 6.6 Regulatory/reference inputs

Where used:

- processor registration reference;
- producer registration reference;
- EPR material category;
- regulatory reference number;
- official outcome/certificate reference if available.

These remain references unless explicit integration is later approved.

---

## 7. Identifier set required

The system must use stable identifiers across applications, Beckn, Ethereum and off-chain data.

Examples:

```text
Participant ID          ORG-AAMHI-001
DID                     did:web:...
Ethereum smart account  0x...
Credential ID           VC-PROC-001
Recovery asset ID       RWA-RAI-2026-001
ERC-1155 token ID       10001
Evidence ID             EVD-001
Attestation ID          ATT-001
Beckn transaction ID    BKN-TXN-001
Commercial contract ID  CTR-001
Claim ID                CLM-001
Settlement ID           STL-001
Blockchain tx hash      0x...
```

Pack 3 will define exact identifier formats and database schemas.

---

## 8. Suggested implementation team

A compact PoC team can combine some roles, but the responsibilities should exist.

| Responsibility | Primary role |
|---|---|
| Product scope and Finternet model | Product / Finternet Lead |
| Architecture | Solution Architect |
| Solidity/ERC standards | Blockchain Engineer |
| DID/VC and trust | Identity Engineer / Backend Engineer |
| Beckn v2 | Beckn / Integration Engineer |
| Backend/API/data | Backend Engineer |
| Web applications | Frontend Engineer |
| AI agent | AI Engineer |
| Cloud/CI/CD/observability | DevOps Engineer |
| Threat/security review | Security Engineer |
| Physical process and evidence | Aamhi / Domain Operations Lead |
| Test design and acceptance | QA / Technical Product Lead |

For a PoC, one engineer can cover multiple adjacent roles if capability exists.

---

## 9. Build in vertical capability slices

Do not organise delivery only as separate frontend/backend/blockchain teams. Build working Finternet capabilities end-to-end.

### Slice 1 — Trusted Participant

Deliver:

```text
Participant registration
+ did:web
+ VC issuance
+ credential verification
+ smart account
+ application login
```

Exit result:

> Two organisations can prove their identity/role and operate smart accounts.

### Slice 2 — Tokenised Asset

Deliver:

```text
Recovery record
+ evidence
+ verifier attestation
+ IPFS metadata
+ ERC-1155 mint
+ token explorer
```

Exit result:

> A verified physical lot exists as a genuine transferable ERC-1155 asset on Ethereum testnet.

### Slice 3 — Open Discovery

Deliver:

```text
Provider Node
+ catalog publishing
+ Discovery Service interaction
+ Consumer Node
+ asset discovery
```

Exit result:

> An independent buyer application discovers the asset without using the originator database.

### Slice 4 — Contracting

Deliver:

```text
select
+ init
+ confirm
+ transaction mapping
+ quantity/price agreement
+ asset reservation
```

Exit result:

> Buyer and seller agree a machine-readable transaction around the tokenised asset.

### Slice 5 — Programmable Settlement

Deliver:

```text
dINR
+ buyer funding
+ asset lock
+ payment lock
+ DvP
```

Exit result:

> Asset and sandbox money can be exchanged programmatically.

### Slice 6 — Physical Attestation

Deliver:

```text
receipt evidence
+ processor VC
+ signed attestation
+ contract condition
+ quantity adjustment
```

Exit result:

> A physical-world event changes on-chain economic settlement.

### Slice 7 — Claims and AI

Deliver:

```text
claim registry
+ anti-double-counting
+ AI discovery
+ credential validation
+ transaction preparation
+ bounded authority
```

Exit result:

> A machine agent can participate in the open network under explicit transaction constraints.

---

## 10. High-level phase plan

### Phase 0 — Project setup

- freeze Pack 1 architecture;
- confirm PoC material and participants;
- create GitHub repository;
- create cloud/testnet accounts;
- establish environments;
- collect sample data/evidence.

### Phase 1 — Finternet core design

Create Pack 2 specifications:

- identity/credential model;
- ERC-1155 model;
- dINR model;
- contract specifications;
- claims/attestations;
- Beckn model.

### Phase 2 — Core engineering

Build Slices 1–3.

### Phase 3 — Transaction and settlement

Build Slices 4–6.

### Phase 4 — AI and interoperability

Build Slice 7 and independent buyer/agent application.

### Phase 5 — End-to-end testing and demo

- execute full transaction;
- run failure/refund scenarios;
- verify public-ledger trail;
- freeze demo data;
- run acceptance plan;
- prepare repeatable demo script.

---

## 11. Minimum PoC end-to-end demonstration

The final demo must show all of the following in one coherent transaction:

1. Originator organisation has DID, VC and smart account.
2. Buyer/processor has independent DID, VC and smart account.
3. A real/sample recovery record and evidence are created.
4. A credentialled verifier signs an attestation.
5. 1,000 units of an ERC-1155 recovery asset are minted on Ethereum testnet.
6. Token metadata is independently resolvable.
7. Asset is published through Beckn v2 catalog/discovery infrastructure.
8. Independent buyer application or AI agent discovers it.
9. Buyer eligibility is verified.
10. Buyer agrees to acquire a quantity, e.g. 500 units/500 kg.
11. Buyer locks dINR.
12. Seller's 500 asset units are locked/reserved.
13. Physical delivery/receipt is recorded.
14. Processor submits a signed credentialled attestation.
15. Settlement contract evaluates actual accepted quantity.
16. ERC-1155 asset and dINR settle atomically.
17. A claim/processing record is created without exceeding asset quantity.
18. Explorer shows the complete chain of events and public Ethereum transaction hashes.

---

## 12. PoC acceptance principles

The PoC is not successful simply because screens work.

It should prove:

### Open participation

Two applications can interact through standard interfaces without sharing one application database.

### Verifiable trust

Participant eligibility is based on signed credentials/status, not hard-coded usernames.

### Genuine tokenisation

The economic asset is a real ERC-1155 balance/state on Ethereum, not only a database record with a hash.

### Programmability

Smart contracts enforce transfer and settlement conditions.

### Atomicity

The selected transaction can exchange asset and dINR without one economic leg completing while the other fails.

### Physical-digital bridge

A signed real-world attestation is able to affect transaction state/settlement.

### Rights integrity

The same quantity cannot be actively sold or consumed twice.

### Inspectability

Users can see application-level and blockchain-level evidence of the transaction.

### AI safety

The AI agent operates only inside explicit, bounded authority.

---

## 13. Decisions deliberately left for Pack 2/3

The following are not architecture reversals; they are implementation choices still to be finalised:

- exact Ethereum testnet at deployment time;
- Foundry vs Hardhat, or use of both;
- exact ERC-4337 smart-account implementation/provider;
- bundler/paymaster provider vs self-hosting;
- exact VC proof/serialization format;
- exact on-chain credential-status data structure;
- exact IPFS/pinning provider;
- exact backend framework if the development team has a standard preference;
- exact cloud vendor and service names;
- exact claim types to include in the first demo;
- whether an attestation contract and claim registry should be separate or partially consolidated;
- detailed smart-contract upgradeability policy;
- final gas-sponsorship approach;
- final AI-agent transaction limit/policy.

These should be resolved by the relevant Pack 2/3 artifacts, not ad hoc during coding.

---

## 14. Immediate next actions

1. Review and freeze `02_Finternet_Technical_Architecture.md`.
2. Confirm named PoC participants and selected recovery material.
3. Create GitHub project/repository.
4. Provision cloud project and Ethereum RPC access.
5. Select public testnet based on current Ethereum ecosystem support at implementation time.
6. Collect participant, material and sample evidence data.
7. Start Pack 2 with identity/credential, ERC-1155 and smart-contract specifications.

---

## 15. Authoritative standards references

- ERC-1155: https://eips.ethereum.org/EIPS/eip-1155
- ERC-4337: https://eips.ethereum.org/EIPS/eip-4337
- W3C VC Data Model 2.0: https://www.w3.org/TR/vc-data-model-2.0/
- Beckn Protocol v2.0: https://github.com/beckn/protocol-specifications-v2
