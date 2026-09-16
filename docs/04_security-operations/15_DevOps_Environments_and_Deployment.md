# Finternet PoC — DevOps, Environments and Deployment

**Project:** Suma Finternet PoC — Tokenised Recovery Asset Demonstrator  
**Status:** Pack 4 — Engineering & Operations  
**Purpose:** Define the repository structure, environments, infrastructure, external accounts, deployment sequence, CI/CD, configuration, monitoring and operational model required to run the PoC reliably.

---

## 1. Deployment objective

The PoC should be easy to develop locally, deterministic to deploy, safe to demonstrate publicly and simple to recreate.

The deployment architecture must support:

- Ethereum smart contracts;
- ERC-4337 smart accounts;
- API/backend services;
- Beckn Provider and Consumer Nodes;
- credential issuer/verifier;
- IPFS metadata;
- secured evidence storage;
- PostgreSQL;
- AI Agent Gateway;
- transaction/indexer services;
- observability;
- web applications/explorer.

---

# 2. Recommended environments

## Environment A — Local Development

Purpose:

- developer coding;
- contract unit testing;
- API development;
- rapid database reset;
- deterministic sample data.

Recommended components:

```text
Local EVM / Anvil or Hardhat node
Local PostgreSQL
Local MinIO
Local application services
Local Beckn nodes
Local/mock IPFS where convenient
Local smart-account test stack
```

Disposable test accounts and deterministic seed data are acceptable here.

---

## Environment B — Integration / Shared Test

Purpose:

- multi-service testing;
- CI integration;
- smart-account/Bundler/Paymaster testing;
- Beckn callback/network flows;
- credential lifecycle testing;
- end-to-end automated transaction tests.

Characteristics:

- stable shared URLs;
- isolated PostgreSQL/database;
- dedicated secret set;
- test object storage;
- selected Ethereum test deployment or controlled EVM environment;
- non-production data only.

---

## Environment C — Public Demo

Purpose:

- final Finternet demonstration;
- external Ethereum verification;
- stable demo transaction history;
- leadership/partner walkthroughs.

Characteristics:

```text
Ethereum public testnet
stable contract addresses
stable demo organisations / DIDs / smart accounts
publicly resolvable did:web documents
hosted Beckn nodes
hosted explorer
controlled dINR supply
controlled PoC evidence
```

Public-demo data must be curated to contain no unnecessary personal/confidential information.

---

# 3. Repository model

Recommended monorepo or coordinated repositories:

```text
finternet-poc/
│
├── docs/
├── contracts/
│   ├── ParticipantRegistry.sol
│   ├── CredentialRegistry.sol
│   ├── RecoveryAsset.sol
│   ├── DemoINR.sol
│   ├── AttestationRegistry.sol
│   ├── ClaimRegistry.sol
│   └── SettlementEngine.sol
│
├── services/
│   ├── api-gateway/
│   ├── participant-service/
│   ├── credential-service/
│   ├── asset-service/
│   ├── evidence-attestation-service/
│   ├── claim-service/
│   ├── settlement-service/
│   ├── blockchain-adapter/
│   ├── beckn-provider/
│   ├── beckn-consumer/
│   └── ai-agent-gateway/
│
├── apps/
│   ├── originator-console/
│   ├── buyer-console/
│   ├── admin-console/
│   └── explorer/
│
├── schemas/
├── beckn/
├── credentials/
├── deployments/
├── infra/
├── scripts/
└── tests/
```

Do not duplicate canonical JSON/schema definitions independently across services.

---

# 4. Technology baseline

| Layer | Selected technology / approach |
|---|---|
| Public ledger | Ethereum public testnet |
| Contract language | Solidity |
| RWA standard | ERC-1155 |
| Settlement token | ERC-20-style permissioned dINR |
| Smart accounts | ERC-4337-compatible implementation |
| Contract libraries | OpenZeppelin |
| Contract toolchain | Foundry or Hardhat — choose one as primary |
| Identity | Participant ID + `did:web` |
| Credentials | W3C VC 2.0-compatible |
| Open discovery | Beckn v2 |
| API | REST/JSON + Beckn APIs |
| Backend | Node.js/NestJS preferred for PoC consistency, or approved equivalent |
| Database | PostgreSQL |
| Cache/queue | Redis only where required |
| Public metadata | IPFS |
| Private evidence | S3-compatible object storage / MinIO |
| Front end | React / Next.js |
| Observability | OpenTelemetry + Prometheus + Grafana + structured logs |
| Source control | GitHub |
| Containers | Docker |
| Runtime | Managed container platform / Kubernetes only if justified |

For this PoC, avoid introducing Kubernetes solely for architectural appearance. A managed container service is sufficient unless Suma specifically wants Kubernetes to be part of the demonstration.

---

# 5. External accounts and subscriptions

The implementation team should provision the following before shared integration begins.

## 5.1 GitHub

Required:

- Suma-owned organisation/repository;
- protected main branch;
- CI/CD secrets/environments;
- code review rules;
- issue/project tracking if desired.

## 5.2 Cloud account

One Suma-controlled cloud account/project.

Required services:

- compute/container hosting;
- PostgreSQL;
- object storage;
- secrets manager;
- DNS/TLS;
- logging/metrics;
- optional KMS/HSM.

The architecture is cloud-neutral; OCI is suitable if Suma wants to align with existing capabilities.

## 5.3 Ethereum RPC provider

Provision a project/account with a recognised RPC provider or self-hosted node.

Needs:

- HTTPS RPC endpoint;
- WebSocket endpoint for event indexing where supported;
- API key;
- rate limit appropriate for demo/testing.

## 5.4 Ethereum testnet funds

Obtain testnet native token required for:

- deployments;
- contract calls not sponsored by Paymaster;
- operator/developer testing.

Do not fund demo wallets with real mainnet value for the PoC.

## 5.5 ERC-4337 infrastructure

Unless self-hosted, provision:

- Bundler endpoint;
- Paymaster capability if gas sponsorship is used;
- smart-account SDK/provider access.

Select an established account implementation rather than creating a custom ERC-4337 account from scratch.

## 5.6 IPFS

Provision one of:

- managed IPFS pinning service;
- Suma-operated IPFS node/pinning setup.

Only non-sensitive/public metadata should be pinned publicly.

## 5.7 Domain and DNS

Suggested pattern:

```text
finternet-poc.<suma-domain>
api.finternet-poc.<suma-domain>
issuer.finternet-poc.<suma-domain>
discovery.finternet-poc.<suma-domain>
provider.finternet-poc.<suma-domain>
buyer.finternet-poc.<suma-domain>
explorer.finternet-poc.<suma-domain>
```

`did:web` resolution depends on stable HTTPS domain paths.

## 5.8 AI provider

Provision:

- API/project account;
- restricted service key;
- usage limits;
- model configuration;
- audit/usage tracking.

No participant private keys are supplied to the model provider.

## 5.9 OIDC identity provider

Use an existing Suma identity platform where appropriate or provision a PoC identity provider.

Capabilities:

- users;
- MFA;
- roles/groups;
- OAuth2/OIDC clients;
- service identities.

---

# 6. Configuration inventory

Maintain environment configuration explicitly.

Examples:

```text
ETH_CHAIN_ID
ETH_RPC_HTTP
ETH_RPC_WS
ENTRYPOINT_ADDRESS
BUNDLER_URL
PAYMASTER_URL
PARTICIPANT_REGISTRY_ADDRESS
CREDENTIAL_REGISTRY_ADDRESS
RECOVERY_ASSET_ADDRESS
DEMO_INR_ADDRESS
ATTESTATION_REGISTRY_ADDRESS
CLAIM_REGISTRY_ADDRESS
SETTLEMENT_ENGINE_ADDRESS
DATABASE_URL
OBJECT_STORAGE_BUCKET
IPFS_GATEWAY
OIDC_ISSUER
OIDC_CLIENT_ID
AI_PROVIDER_KEY
```

Secrets must be injected from a secrets manager in shared/demo environments.

---

# 7. Contract build and deployment pipeline

Recommended pipeline:

```text
Commit / Pull Request
       ↓
format + lint
       ↓
Solidity compile
       ↓
unit tests
       ↓
static analysis
       ↓
invariant/property tests
       ↓
ABI/artifact generation
       ↓
merge to approved branch
       ↓
deploy to target environment
       ↓
record addresses + tx hashes
       ↓
post-deployment role/config validation
```

Contract deployment output must include:

- chain ID;
- deployment timestamp;
- contract address;
- deployment transaction hash;
- deployer address;
- implementation/build commit;
- constructor parameters;
- configured roles;
- linked contract addresses.

Store deployment manifests in source control; never store private keys.

---

# 8. Recommended contract deployment order

Deploy dependencies in an explicit sequence.

```text
1. ParticipantRegistry
2. CredentialRegistry
3. RecoveryAsset
4. DemoINR
5. AttestationRegistry
6. ClaimRegistry
7. SettlementEngine
8. Configure cross-contract permissions
9. Configure admin/treasury/pauser roles
10. Transfer/remove temporary deployer privileges where appropriate
```

After deployment, run a configuration validation script that checks every expected address and role.

---

# 9. Backend CI/CD

For each service:

```text
Pull Request
  ↓
lint
  ↓
unit tests
  ↓
schema/API validation
  ↓
container build
  ↓
dependency/security scan
  ↓
integration tests
  ↓
push versioned image
  ↓
deploy
  ↓
health check
```

Container images should be immutable and tagged with commit/version identifiers.

---

# 10. Database management

Use version-controlled migrations.

Rules:

- schema changes through migration scripts;
- no manual production/demo database alterations without corresponding migration;
- seed data scripts for local/test/demo participants;
- chain-derived economic state stored as projections, not editable truth;
- regular backup of shared/demo PostgreSQL;
- reconciliation job compares projections with Ethereum.

---

# 11. IPFS and evidence deployment

## Public metadata

Flow:

```text
Asset Service
  ↓
canonical public metadata JSON
  ↓
hash/content address
  ↓
IPFS pinning
  ↓
URI committed/referenced by ERC-1155 token
```

## Private evidence

Flow:

```text
Evidence Service
  ↓
private object storage
  ↓
SHA-256/content digest + evidence manifest
  ↓
attestation/asset reference
```

Do not place private evidence on public IPFS merely because the token metadata uses IPFS.

---

# 12. `did:web` deployment

For each participant DID, publish a valid DID document at the domain/path derived from the DID.

The deployment process should support:

- participant DID creation;
- verification-method publishing;
- key rotation;
- service endpoint update;
- TLS availability check;
- automated DID resolution test.

Credential issuance should fail when the subject/issuer DID cannot be resolved according to PoC policy.

---

# 13. Beckn deployment topology

Minimum PoC topology:

```text
Originator / Provider Application
       ↓
Beckn Provider Node
       ↓ publish
Catalog / Discovery Service
       ↑ discover
Beckn Consumer Node
       ↑
Independent Buyer Application / Agent
```

Provider and buyer systems should not share a private application database.

Deploy separate network endpoints even if they run in the same cloud account for the PoC.

Maintain mapping:

```text
Beckn Resource ID ↔ Asset ID ↔ ERC-1155 Token ID
Beckn Contract ID ↔ Settlement ID
```

---

# 14. Blockchain indexing

The Blockchain Adapter/Indexer subscribes to contract events such as:

- participant updates;
- credential status updates;
- asset mint/transfer/retire;
- dINR mint/transfer;
- settlement creation/funding/finalisation/refund;
- attestation creation;
- claim creation/consumption.

Indexer requirements:

- block/transaction/log position persisted;
- restart-safe replay;
- handling of chain reorganisation according to selected testnet/finality policy;
- projection update idempotency;
- event-to-canonical-ID correlation;
- lag monitoring.

Applications should show pending/confirmed states where appropriate instead of treating transaction submission as finality.

---

# 15. Observability architecture

Instrument application services with OpenTelemetry.

Monitor at least:

### Application

- request volume;
- error rate;
- latency;
- authentication failures.

### Blockchain

- RPC availability;
- transaction submission;
- transaction confirmation/failure;
- indexer lag;
- Paymaster/Bundler errors.

### Beckn

- publish failures;
- discovery latency;
- callback failures;
- schema/signature failures.

### Credentials

- issuance failures;
- verification failures;
- status projection failures.

### Settlement

- active settlements;
- unfunded settlements;
- locked assets;
- expired/stuck settlements;
- finalisation/refund failures.

Use dashboards for the demo environment rather than relying only on raw logs.

---

# 16. Demo seed and reset strategy

The public demo environment requires deterministic preparation.

Seed:

- Suma Network Admin;
- Originator/Aamhi participant;
- Buyer participant;
- Processor participant;
- Verifier participant;
- applicable credentials;
- smart accounts;
- controlled dINR balances;
- sample asset/evidence templates.

Prefer generating new demo asset/token/settlement IDs per run while keeping participant identities stable.

Avoid destructive resetting of public-chain history. If a clean scenario is required, create fresh assets and settlements rather than pretending earlier transactions did not occur.

---

# 17. Release gates

A build may be promoted to Public Demo only after:

1. all contract tests pass;
2. deployed contract configuration is validated;
3. no known critical/high security issue remains;
4. DID resolution works publicly;
5. credential issue/verify/revoke works;
6. ERC-1155 mint/transfer/lock works;
7. dINR mint/fund/escrow works;
8. Beckn catalogue discovery works between independent applications;
9. attestation-triggered settlement works;
10. indexer reconciles correctly;
11. no sensitive data is visible on public Ethereum/IPFS;
12. scripted end-to-end demo is successfully rehearsed against the same deployment.

---

# 18. Operational ownership

Assign named owners for:

| Operational area | Owner role |
|---|---|
| Contract deployment/configuration | Blockchain Lead |
| Treasury/dINR | Treasury PoC Admin |
| Credential issuance | Trust/Credential Admin |
| Participant onboarding | Network Admin |
| Cloud/runtime | DevOps Lead |
| Database/storage | Backend/DevOps |
| Beckn endpoints | Protocol Lead |
| AI service | AI Lead |
| Security/secrets | Security/Platform Lead |
| Demo data/runbook | Product/PoC Lead |

One person may hold multiple roles in a small PoC team, but keys and logical permissions should remain separated.

---

# 19. Deployment deliverables

The engineering team should leave behind:

- infrastructure configuration;
- environment matrix;
- CI/CD workflows;
- deployment scripts;
- contract deployment manifests;
- environment-variable template;
- database migrations;
- seed scripts;
- DID publishing scripts;
- smart-account creation scripts;
- monitoring dashboards;
- backup/restore procedure;
- demo environment checklist;
- dependency/account inventory.

---

# 20. Practical first setup checklist

Before application development reaches integration stage, create:

- [ ] GitHub repository/project;
- [ ] cloud account/project;
- [ ] DNS zone/subdomains;
- [ ] TLS;
- [ ] PostgreSQL;
- [ ] secure object storage;
- [ ] secrets manager;
- [ ] IPFS account/node;
- [ ] Ethereum RPC project;
- [ ] public testnet faucet/test ETH access;
- [ ] ERC-4337 Bundler/Paymaster account or deployment;
- [ ] OIDC tenant/client;
- [ ] AI API project/key;
- [ ] shared logging/monitoring;
- [ ] CI/CD environments;
- [ ] contract deployer identity;
- [ ] credential issuer identity;
- [ ] dINR treasury identity;

This checklist should be incorporated into the Pack 5 backlog as project-enablement tasks.

