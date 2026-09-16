# Finternet PoC — On-Chain / Off-Chain Data Design

**Project:** Suma Finternet PoC — Tokenised Recovery Asset Demonstrator  
**Status:** Pack 3 — Software & Data Specification  
**Purpose:** Define exactly what data is stored on Ethereum, IPFS, PostgreSQL and private object storage, and how integrity is preserved across those stores.

---

## 1. Core principle

The PoC uses a **hybrid Finternet architecture**.

```text
Ethereum
Shared economic truth

IPFS
Public immutable/content-addressed metadata

PostgreSQL
Operational/canonical application data and indexes

Private Object Storage
Sensitive source evidence/documents
```

The objective is not to maximise on-chain data. The objective is to put **shared economic state and enforceable rules** on-chain while keeping private/high-volume data off-chain and cryptographically anchored.

---

# 2. Storage responsibility matrix

| Data | Ethereum | IPFS | PostgreSQL | Private object storage |
|---|---:|---:|---:|---:|
| Participant ID ↔ account | ✓ minimum mapping | | ✓ full profile | |
| DID document | | via HTTPS/DID endpoint | ✓ | |
| VC payload | | optional public credential only | ✓ | ✓ if file form |
| Credential active/eligibility state | ✓ | | ✓ | |
| Material master | reference/code | optional | ✓ | |
| Asset ID ↔ Token ID | ✓ / event | metadata | ✓ | |
| ERC-1155 balances | **authoritative** | | indexed mirror | |
| Original token supply | ✓ | metadata | mirror | |
| Asset public metadata | URI/hash | **authoritative content** | cached | |
| Photos | hash only | no, unless explicitly public | metadata | **✓** |
| Weighbridge PDF | hash only | no | metadata | **✓** |
| Evidence manifest | hash/root | optional public sanitized version | ✓ | ✓ if confidential |
| Exact commercial price | settlement amount if on-chain DvP | no | ✓ | optional docs |
| Legal contract PDF | hash/reference | no | metadata | **✓** |
| dINR balances | **authoritative** | | indexed mirror | |
| Settlement state | **authoritative** | | indexed/read model | |
| Attestation minimum facts | ✓ | optional readable metadata | ✓ | supporting evidence |
| Claim state | ✓ | optional metadata | ✓ | supporting docs |
| Beckn catalogue | no | optional asset metadata reference | ✓ / network store | |
| AI reasoning/logs | no | no | ✓ restricted | optional archive |

---

# 3. Ethereum data

Ethereum should contain only information necessary for shared verification, enforcement and settlement.

### ParticipantRegistry

Store:

- canonical Participant ID hash/bytes32 representation;
- active Ethereum account mapping;
- participant active flag.

Do not store:

- legal documents;
- contacts;
- addresses beyond what is deliberately public.

### CredentialRegistry

Store:

- account;
- eligibility role bitmap;
- material eligibility where required;
- validity/active status.

Do not store full VC documents.

### RecoveryAsset

Store:

- Token ID;
- canonical Asset ID representation/reference;
- material code;
- original supply/quantity;
- evidence root/hash;
- metadata URI/CID reference;
- blocked status;
- balances/transfers/retirement.

### DemoINR

Store standard token economic state:

- balances;
- allowances/authorisations where used;
- supply;
- pause state.

### AttestationRegistry

Store minimum shared attestation facts:

- Attestation ID;
- type;
- asset/settlement reference;
- attestor;
- quantity/value where relevant;
- evidence hash/root;
- timestamp;
- active/revoked status.

### ClaimRegistry

Store:

- Claim ID;
- type;
- underlying asset/token;
- issuer/holder references;
- quantity;
- status;
- source attestation/external reference hash as required.

### SettlementEngine

Store:

- Settlement ID;
- parties;
- asset contract/token ID/quantity;
- payment token/amount/rule;
- expiry;
- state;
- required attestation reference/type;
- custody of locked ERC-1155/dINR during escrow.

---

# 4. IPFS data

Use IPFS for **public, non-sensitive, content-addressable metadata**.

Recommended initial use:

- ERC-1155 token metadata;
- public material descriptors;
- sanitized provenance summary;
- schema/version documents if useful.

Do not publish to IPFS by default:

- PII;
- exact private facility coordinates;
- invoices;
- sensitive contracts;
- bank/payment details;
- confidential regulatory documents;
- unredacted photographs.

IPFS content is not a privacy control. Treat anything pinned publicly as potentially permanent/public.

---

# 5. PostgreSQL data

PostgreSQL is the operational/canonical application store for data that should be queryable and relational but is not shared economic state.

It holds:

- participant profile;
- smart-account bindings/history;
- credential index/status history;
- material master;
- canonical recovery asset record;
- token binding/index;
- evidence metadata;
- attestation readable records;
- claims readable records;
- offers and contracts;
- settlement projection;
- Beckn ID mappings;
- blockchain transaction/event index;
- AI delegations/logs;
- audit records.

For chain-authoritative fields, PostgreSQL columns are explicitly treated as projections/cache.

---

# 6. Private object storage

Use S3-compatible object storage or MinIO for source files.

Store:

- photos;
- videos;
- PDFs;
- weighment slips;
- invoices;
- regulatory documents;
- signed conventional agreements;
- credential source documents;
- any evidence containing PII/confidential data.

Requirements:

- encryption at rest;
- bucket/container access policies;
- no public ACLs;
- versioning where practical;
- retention policy;
- short-lived presigned URLs;
- object hash captured on ingestion.

---

# 7. Evidence integrity flow

```text
Source File
   ↓
Secure Upload
   ↓
SHA-256 content hash
   ↓
Evidence Item Record
   ↓
Evidence Manifest
   ↓
Canonical manifest hash/root
   ↓
Attestation / Asset reference on Ethereum
```

If the source file changes by even one byte, its hash changes and no longer matches the ledger-linked evidence reference.

This proves tamper evidence; it does not by itself prove that the source document was truthful. Truth is established through credentialled attestors and business controls.

---

# 8. Canonical manifest design

The manifest must be deterministic.

Recommended process:

1. normalize field names and values;
2. sort evidence entries by Evidence ID;
3. serialize using canonical JSON rules;
4. hash resulting bytes using SHA-256 or the project's chosen consistent hash representation;
5. store hash/root on-chain.

Do not hash arbitrary pretty-printed JSON because whitespace/order changes can create inconsistent hashes.

---

# 9. Privacy classifications

Use four classes:

### PUBLIC

Safe for open discovery/IPFS/Explorer.

Examples:

- material type;
- broad geography;
- token contract/ID;
- public participant ID/DID;
- verified status.

### NETWORK

Available to authenticated network participants.

Examples:

- detailed quality specification;
- availability windows;
- non-sensitive operational details.

### COUNTERPARTY

Only transaction participants.

Examples:

- negotiated commercial terms;
- detailed evidence;
- logistics specifics.

### CONFIDENTIAL

Strictly limited roles.

Examples:

- PII;
- legal/KYC source documents;
- bank information;
- confidential regulatory documents.

---

# 10. On-chain commercial confidentiality

A public Ethereum transaction is transparent.

Therefore the PoC must make a conscious choice for every commercial field.

For the demonstrator, it is acceptable for dINR settlement amounts to be visible because the objective is to visibly prove programmable settlement.

The documentation must nevertheless state that production deployments may require:

- privacy-preserving settlement infrastructure;
- permissioned execution;
- tokenised commercial-bank/CBDC infrastructure;
- encrypted/off-chain terms with only proofs/commitments on-chain;
- other privacy technologies.

Do not present public-chain price visibility as the production default.

---

# 11. Source-of-truth hierarchy

When systems disagree:

### Token balance / ownership

1. Ethereum node confirmed state;
2. blockchain indexer projection;
3. application cache.

### dINR balance

1. Ethereum;
2. indexer;
3. application projection.

### Settlement state

1. `SettlementEngine.sol`;
2. indexer;
3. application projection;
4. Beckn status representation.

### Participant legal/profile details

1. Participant/Identity Service database and approved source documents;
2. DID document/public projection;
3. chain mapping.

### Credential validity

Both must pass:

- cryptographic/status verification of VC;
- on-chain eligibility policy for contract action.

### Evidence source

Private object store contains source bytes; on-chain hash anchors integrity.

---

# 12. Synchronisation patterns

## Write to Ethereum

```text
Application request
→ validation
→ transaction submission
→ PENDING operation
→ Ethereum confirmation
→ contract event
→ indexer
→ projection update
→ API/UI final status
```

Never mark an operation `CONFIRMED` because the RPC submission returned a transaction hash.

## Blockchain event to Beckn catalogue

```text
AssetMinted / Transfer / Lock / Settlement
→ indexer
→ calculate available quantity
→ update Provider catalogue projection
→ Beckn Cataloging Service
```

Catalogue availability can therefore lag chain state briefly; buyers must revalidate before contracting.

---

# 13. Reconciliation jobs

Run scheduled/triggered reconciliation for:

- Participant Registry ↔ participant account table;
- Credential Registry ↔ credential eligibility projection;
- ERC-1155 balances ↔ indexed balances;
- dINR balances ↔ indexed balances;
- SettlementEngine state ↔ settlement projection;
- IPFS CID ↔ asset metadata record;
- Evidence manifest hash ↔ on-chain reference;
- Beckn catalogue quantity ↔ current chain availability.

Any mismatch creates a reconciliation exception rather than silently overwriting authoritative data.

---

# 14. Blockchain finality policy

Because the PoC is on a public Ethereum testnet, define a confirmation policy in configuration.

Example states:

```text
SUBMITTED
MINED
CONFIRMED
FAILED
REORGED
```

The exact number of confirmations is an implementation/environment choice, but must be consistent across services.

---

# 15. Data deletion and immutability

Ethereum records cannot be conventionally deleted.

Therefore:

- never put personal/sensitive source data on-chain;
- use opaque/canonical IDs instead of sensitive labels;
- revocation/block status replaces deletion for on-chain credentials/assets;
- off-chain retention/deletion follows project policy;
- deleting an off-chain file does not delete its historical hash from Ethereum.

---

# 16. Backup and recovery

Back up:

- PostgreSQL;
- private object storage metadata/objects;
- credential issuer configuration and keys via secure key-management procedure;
- deployment addresses/ABIs;
- infrastructure configuration;
- Beckn participant configuration.

Do not rely on backups for Ethereum chain history; rely on public chain plus indexed data that can be rebuilt.

---

# 17. Minimum implementation outputs

This design should produce:

- storage-classification matrix in code/config;
- JSON Schemas for public metadata and evidence manifests;
- deterministic hashing library used by all services;
- chain event indexer;
- reconciliation jobs;
- access-control policy for object storage;
- IPFS publishing module;
- clear UI labels showing whether a field is on-chain, verified off-chain, or application-supplied.

---

# 18. Definition of done

No field should enter implementation without knowing:

1. its canonical owner/source;
2. its privacy class;
3. where it is stored;
4. whether it is mutable;
5. whether it is hashed/anchored;
6. which system is authoritative if two representations differ.
