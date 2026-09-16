# 17 — Test and Acceptance Plan
## Finternet PoC — Tokenised Recovery Asset Demonstrator

## 1. Purpose

This document defines how the Finternet PoC will be tested and what must be true before the PoC is considered technically complete.

The objective is not only to prove that the application works. The PoC must prove the specific Finternet capabilities designed in Packs 1–4:

- trusted digital identity;
- verifiable credentials;
- real-world asset tokenisation;
- open discovery;
- programmable rights;
- programmable money;
- conditional and atomic settlement;
- trusted physical-world attestations;
- interoperability between independently operated systems;
- bounded AI-agent participation.

The primary acceptance principle is:

> A successful demo must show that a verified real-world asset can be independently discovered, validated, contracted for, transferred and settled through interoperable digital infrastructure without relying on a single central application database as the economic source of truth.

---

## 2. Test Scope

Testing is grouped into nine areas:

1. Identity and credentials
2. ERC-1155 recovery asset
3. dINR programmable money
4. Smart-contract settlement
5. Rights, claims and attestations
6. Beckn discovery and contracting
7. API and data services
8. Smart accounts and AI-agent authority
9. End-to-end interoperability

---

## 3. Test Environments

### Local Development Environment

Used for:

- Solidity unit tests;
- service unit tests;
- schema validation;
- local integration;
- repeatable contract deployment.

Components:

- local EVM chain;
- local PostgreSQL;
- local MinIO/S3-compatible storage;
- local/mock IPFS;
- local backend services.

### Integration Environment

Used for:

- full service integration;
- smart-account flows;
- Beckn interactions;
- VC issuance and verification;
- AI-agent testing;
- fault scenarios.

### Public Demo Environment

Used for:

- final acceptance;
- public Ethereum testnet transactions;
- externally verifiable contract state;
- final demonstration.

---

## 4. Identity and Credential Tests

### ID-01 — Participant Creation

Given a new organisation, the platform must generate and persist:

- Participant ID;
- `did:web` identifier;
- Ethereum smart-account address;
- organisation profile;
- role assignment.

**Pass:** all identifiers resolve to the same participant record.

### ID-02 — Credential Issuance

Issue a W3C VC 2.0 credential to a participant.

**Pass:** credential:

- is cryptographically verifiable;
- references the correct DID;
- includes the expected role;
- includes validity dates;
- is linked to the expected Ethereum account.

### ID-03 — Credential Enforcement

Attempt to transfer an asset to a wallet without the required processor/buyer credential.

**Pass:** transaction is rejected.

### ID-04 — Credential Revocation

Revoke a participant credential and repeat an otherwise valid transaction.

**Pass:** transaction is rejected even if application login remains valid.

### ID-05 — Key Rotation

Rotate an organisation transaction key while retaining the organisation DID.

**Pass:** identity remains stable and new account binding is reflected correctly.

---

## 5. ERC-1155 Recovery Asset Tests

### RWA-01 — Mint Verified Lot

Mint a verified 1,000 kg LDPE recovery lot.

Expected:

- unique Token ID;
- supply = 1,000 units;
- one unit = 1 kg;
- originator balance = 1,000;
- metadata URI and evidence root present.

### RWA-02 — Prevent Unverified Mint

Attempt minting without required verification status.

**Pass:** rejected.

### RWA-03 — Partial Transfer

Transfer 400 units to an eligible buyer.

Expected balances:

- seller = 600;
- buyer = 400.

### RWA-04 — Over-Transfer Protection

Attempt to transfer more units than available.

**Pass:** rejected.

### RWA-05 — Reservation / Lock

Lock 500 units for active settlement.

**Pass:** the locked units cannot be sold or locked into a second active settlement.

### RWA-06 — Retirement

Retire/consume the required quantity after final processing where applicable.

**Pass:** retired balance cannot be reused in a new transaction.

---

## 6. dINR Tests

### MONEY-01 — Controlled Mint

Only authorised treasury/admin role can mint dINR.

### MONEY-02 — Eligible Holder

Attempt transfer to an unapproved account.

**Pass:** transfer is blocked if holder restrictions are enabled.

### MONEY-03 — Escrow Funding

Buyer funds 10,000 dINR into settlement escrow.

**Pass:**

- buyer balance decreases;
- escrow records 10,000;
- seller cannot access funds before settlement.

### MONEY-04 — Refund

Trigger failed/expired transaction.

**Pass:** refundable amount returns to buyer according to settlement rules.

---

## 7. Settlement Contract Tests

### SET-01 — Atomic DvP

Conditions:

- seller locks 500 ERC-1155 units;
- buyer locks 10,000 dINR;
- all conditions valid.

Execute settlement.

**Pass:**

- buyer receives 500 token units;
- seller receives 10,000 dINR;
- both occur in one successful economic execution;
- neither leg can complete independently.

### SET-02 — Missing Funds

Buyer does not fund required dINR.

**Pass:** asset transfer cannot settle.

### SET-03 — Missing Asset

Seller cannot lock required asset quantity.

**Pass:** settlement cannot proceed.

### SET-04 — Invalid Credential at Settlement Time

Credential valid during offer but revoked before final settlement.

**Pass:** final settlement is blocked if policy requires continuing eligibility.

### SET-05 — Quantity-Adjusted Payment

Contracted quantity: 1,000 kg.

Received quantity: 982 kg.

Price: 20 dINR/kg.

Expected settlement: 19,640 dINR if the contract uses actual accepted quantity.

**Pass:** smart contract computes/uses the agreed rule correctly.

### SET-06 — Multi-party Distribution

Release one settlement across multiple recipients.

**Pass:** exact configured allocations are transferred and auditable.

---

## 8. Attestation and Claims Tests

### ATT-01 — Signed Receipt Attestation

Processor signs receipt attestation for 982 kg.

**Pass:** signature, DID, credential and transaction authority validate.

### ATT-02 — Unauthorized Attestation

Uncredentialled party submits processing confirmation.

**Pass:** rejected.

### ATT-03 — Evidence Integrity

Alter source evidence after its hash has been anchored.

**Pass:** recalculated hash no longer matches on-chain reference.

### ATT-04 — Duplicate Claim

Attempt issuing an incompatible duplicate claim against the same quantity.

**Pass:** rejected.

### ATT-05 — Excess Quantity

Attempt claim for 1,100 kg against 1,000 kg root asset.

**Pass:** rejected.

### ATT-06 — Consumed Claim Reuse

Attempt to reuse a consumed claim.

**Pass:** rejected.

### ATT-07 - OBP-Ready Claim Boundary

Create an `OBP_READY_RECOVERY_CLAIM` against the Aamhi recovery lot.

**Pass:**

- claim is linked to evidence and quantity;
- claim quantity does not exceed eligible recovered quantity;
- claim is marked as not an official OBP credit unless an authorised registry integration exists;
- duplicate OBP-ready attribution over the same exclusive quantity is rejected.

---

## 9. Beckn Tests

### BKN-01 — Publish Catalogue

Provider publishes token-backed recovery asset into Beckn catalogue.

**Pass:** listing contains reference to the corresponding economic asset.

### BKN-02 — Independent Discovery

Independent buyer application discovers the asset without querying the originator application database directly.

**Pass:** asset is discoverable through Beckn interfaces.

### BKN-03 — Stale Catalogue Reconciliation

Beckn catalogue says 500 kg available, but Ethereum balance/lock state shows only 300 kg.

**Pass:** contracting layer rejects or adjusts the proposed transaction based on live chain state.

### BKN-04 — Contract Mapping

Accepted Beckn contract is mapped to a blockchain settlement identifier.

**Pass:** the two identifiers can be reconciled in both directions.

---

## 10. API and Data Tests

Validate:

- authentication;
- authorization;
- schema compliance;
- idempotency;
- duplicate-request handling;
- blockchain confirmation handling;
- error mapping;
- eventual consistency;
- event replay/reconciliation;
- database/chain disagreement handling.

Critical rule:

> If application state conflicts with confirmed Ethereum state for economic balances or settlement status, Ethereum state prevails.

---

## 11. Smart Account Tests

### WAL-01 — Human Transaction

Authorized human signs transaction through organisational smart account.

### WAL-02 — Gas Abstraction

User completes transaction without manually obtaining testnet gas where Paymaster sponsorship is configured.

### WAL-03 — AI Session Key

AI receives a bounded session/delegated authority.

Example restrictions:

- maximum 50,000 dINR;
- only approved material categories;
- only verified counterparties;
- expiry within configured period.

### WAL-04 — AI Limit Breach

AI attempts a transaction above delegated value.

**Pass:** rejected at policy/account layer.

---

## 12. Security Tests

Minimum checks:

- unauthorized API access;
- privilege escalation;
- replay protection;
- duplicate transaction submission;
- smart-contract access control;
- pausable/emergency controls where implemented;
- secrets leakage;
- private-key handling;
- malicious metadata URI;
- oversized/file upload controls;
- invalid VC signature;
- revoked VC;
- forged attestation;
- oracle-service impersonation;
- reentrancy checks;
- integer/accounting checks;
- contract invariant testing.

Solidity contracts should pass:

- unit tests;
- fuzz/property tests for critical accounting logic;
- static analysis;
- dependency review;
- manual code review before final demo deployment.

---

## 13. End-to-End Acceptance Scenario

The mandatory final acceptance test is:

### Starting State

- Aamhi onboarded and credentialled;
- Recycler onboarded and credentialled;
- Buyer onboarded and credentialled;
- verifier onboarded;
- buyer funded with test dINR.

### Transaction

1. Aamhi records 1,000 kg LDPE recovery lot.
2. Evidence is uploaded.
3. Verifier attests the lot.
4. 1,000 ERC-1155 units are minted.
5. Asset is published through Beckn.
6. Independent buyer application discovers it.
7. Buyer verifies participant and asset credentials.
8. Buyer selects 500 kg.
9. Commercial terms are accepted.
10. Buyer funds 10,000 dINR.
11. Seller locks 500 ERC-1155 units.
12. Physical material is delivered.
13. Processor signs receipt attestation.
14. Settlement condition becomes satisfied.
15. Settlement executes atomically.
16. Buyer receives 500 asset units.
17. Seller receives 10,000 dINR.
18. Transaction and claims are visible in the Suma explorer.
19. Underlying Ethereum transactions are independently inspectable.

---

## 14. Mandatory Negative Acceptance Cases

The PoC is not accepted unless it also demonstrates at least these failures:

1. expired/revoked credential blocks transaction;
2. stale Beckn availability cannot produce double sale;
3. insufficient dINR prevents settlement;
4. insufficient/unlocked ERC-1155 quantity prevents settlement;
5. unauthorized attestation is rejected;
6. duplicate/overlapping claim is rejected;
7. AI agent cannot exceed delegated authority;
8. altered evidence fails hash verification.

---

## 15. Finternet Capability Acceptance Matrix

| Capability | Mandatory proof |
|---|---|
| Digital identity | Organisation has DID independent of wallet address |
| Verifiable trust | VC can be issued, verified and revoked |
| RWA tokenisation | Verified physical lot becomes ERC-1155 asset |
| Transferability | Eligible participant receives token units |
| Open discovery | Independent application discovers asset through Beckn |
| Programmability | Smart contract enforces transaction conditions |
| Programmable money | dINR participates directly in settlement |
| Atomic settlement | Asset and money exchange through DvP logic |
| Physical/digital bridge | Signed real-world attestation triggers state transition |
| Claims | Derived rights/outcomes are separately controlled |
| Interoperability | Buyer app does not depend on seller's internal database |
| Agentic participation | AI can discover/prepare/execute only within bounded authority |

---

## 16. Exit Criteria

Pack 5 acceptance is achieved when:

- all critical contract tests pass;
- all mandatory negative tests pass;
- end-to-end scenario completes on public Ethereum testnet;
- independent Buyer App can discover and transact;
- chain/database reconciliation works;
- security review has no unresolved critical issues;
- final demo can be reset and reproduced;
- transaction evidence can be exported for demonstration/audit.
