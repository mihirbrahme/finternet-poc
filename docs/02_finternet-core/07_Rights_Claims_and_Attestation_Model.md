# Finternet PoC — Rights, Claims and Attestation Model

**Project:** Suma Finternet PoC — Tokenised Recovery Asset Demonstrator  
**Status:** Pack 2 — Core Specification  
**Purpose:** Separate transferable assets, economic rights, claims, physical-world assertions and evidence so the PoC can prove provenance and programmability without double counting.

---

## 1. Core principle

Four concepts must remain distinct:

```text
ASSET
What economically exists and can be transferred.

CLAIM
What right, entitlement or outcome is asserted in relation to the asset.

ATTESTATION
Who states that a specific event/fact occurred.

EVIDENCE
What source material supports that statement.
```

The PoC fails conceptually if these are collapsed into one generic token.

---

## 2. Root economic object

The ERC-1155 Recovery Asset Token is the root transferable object.

Example:

```text
Token 10001
1,000 units
1 unit = 1 kg entitlement associated with verified LDPE lot
```

Other outcomes derive from this root asset but are not automatically represented as transferable ERC-1155 assets.

---

## 3. Claim taxonomy

### 3.1 Material/economic-control claim

Represents rights recognised by the PoC transaction framework in relation to the physical material.

In most cases this is already represented through ERC-1155 balance ownership and need not be duplicated.

### 3.2 Recovery-service entitlement

Represents a contractual entitlement to payment for recovery activity.

May be represented as a Claim Registry record if it needs independent tracking.

### 3.3 Processing outcome claim

Represents that a defined quantity was processed by a defined processor.

Derived from a processing attestation.

### 3.4 Sponsor attribution

Represents programme/outcome attribution granted to a sponsor.

It is **not** an EPR certificate and must never be presented as one.

### 3.5 EPR reference claim

Links the PoC asset lifecycle to an authoritative regulatory-system reference or certificate outcome.

The PoC does **not** mint an official EPR certificate.

### 3.6 OBP-ready recovery claim

Represents that a defined quantity has an evidence package that may support later Ocean Bound Plastic certification, sponsor reporting or buyer diligence.

This is an evidence-backed PoC claim, not an official OBP credit. It must not be presented as government recognition, EPR credit issuance or certified OBP credit issuance unless an authorised certification or registry integration is added.

Minimum supporting facts:

- coastal or waterway risk context;
- collection site or route reference;
- collection and segregation evidence;
- weighment evidence;
- custody or aggregation record;
- downstream receipt or treatment evidence where available.

### 3.7 Future finance claim

Possible Phase 2 object:

- receivable;
- financing/security interest;
- advance-funding entitlement.

Not required for first PoC but architecture must not block it.

---

## 4. Attestation taxonomy

Attestations bring physical-world facts into the programmable environment.

Minimum attestation types:

- `RECOVERY_VERIFIED`
- `WEIGHT_VERIFIED`
- `DISPATCH_CONFIRMED`
- `RECEIPT_CONFIRMED`
- `QUALITY_ACCEPTED`
- `PROCESSING_CONFIRMED`

Optional:

- `REGULATORY_REFERENCE_CONFIRMED`
- `SPONSOR_OUTCOME_CONFIRMED`

---

## 5. Attestation structure

Each attestation must contain:

- attestation ID;
- type;
- related asset/token ID;
- related settlement/contract ID where applicable;
- attestor Participant ID/DID;
- attestor Ethereum account;
- quantity/value where applicable;
- unit;
- event timestamp;
- evidence hash/root;
- credential/reference used by attestor;
- cryptographic signature / transaction sender;
- status.

Illustrative:

```json
{
  "attestationId": "ATT-000123",
  "type": "RECEIPT_CONFIRMED",
  "assetId": "RWA-RAI-2026-000001",
  "tokenId": "10001",
  "settlementId": "STL-000021",
  "attestorParticipantId": "ORG-RECYCLER-001",
  "quantity": 982,
  "unit": "kg",
  "eventTime": "2026-10-14T11:35:00Z",
  "evidenceHash": "0x..."
}
```

---

## 6. Evidence model

Evidence is stored off-chain.

Evidence types may include:

- photographs;
- collection records;
- weighbridge slips;
- inspection forms;
- dispatch documents;
- transport references;
- processor receipts;
- processing records;
- regulatory references.

Every evidence item receives:

- evidence ID;
- content hash;
- MIME/type;
- timestamp;
- source/issuer;
- related asset;
- access classification;
- storage URI/reference.

Evidence files containing confidential or personal information must not be exposed through public IPFS.

---

## 7. Evidence manifest/root

For each relevant asset/event, the system may produce an evidence manifest:

```text
EVD-001 photo hash
EVD-002 weighment hash
EVD-003 inspection hash
EVD-004 custody record hash
        ↓
Evidence Manifest
        ↓
Manifest / Merkle-style root hash
        ↓
Asset / Attestation reference
```

The first PoC can use a signed canonical JSON manifest hash; a Merkle tree is optional unless granular proof requirements justify it.

---

## 8. Trust model for attestations

Not every participant may attest every event.

Example policy:

| Attestation | Permitted issuer |
|---|---|
| Recovery verified | credentialled verifier / originator + verifier workflow |
| Weight verified | verifier/weighment authority |
| Dispatch confirmed | current custodian/originator |
| Receipt confirmed | contracted processor/buyer |
| Quality accepted | processor or authorised verifier |
| Processing confirmed | credentialled processor |
| Regulatory reference confirmed | authorised admin/integration/verifier |

Attestation policy must verify:

- issuer role;
- issuer active status;
- relation to the transaction;
- quantity boundaries;
- duplicate IDs;
- evidence reference.

---

## 9. Claim lifecycle

```text
PROPOSED
   ↓
ACTIVE
   ↓
CONSUMED / CLOSED
```

Exception states:

- `DISPUTED`
- `REVOKED`
- `REJECTED`

Claims must be append-auditable: revocation changes status but does not erase history.

---

## 10. Claim structure

Minimum:

- claim ID;
- claim type;
- parent asset/token ID;
- quantity/value;
- holder/beneficiary Participant ID or account;
- issuer;
- source attestation(s);
- issuance time;
- status;
- external reference if applicable.

---

## 11. Double-counting rules

The Claim Registry/service must enforce deterministic rules.

### Rule 1 — Asset quantity conservation

For quantity-bound exclusive claims:

```text
sum(active exclusive claim quantities) ≤ eligible source quantity
```

### Rule 2 — No duplicate sponsor attribution

The same exclusive sponsor-attribution quantity cannot be issued twice unless the programme explicitly allows non-exclusive reporting and labels it accordingly.

### Rule 3 — EPR separation

Sponsor attribution must never be labelled or technically treated as the official EPR regulatory right.

### Rule 4 — Consumed claim cannot be reused

Once an exclusive claim is consumed, the same claim ID/quantity cannot fulfil another transaction.

### Rule 5 — Processed quantity boundary

```text
processed quantity ≤ accepted/received quantity
```

### Rule 6 — Receipt quantity boundary

Normally:

```text
accepted quantity ≤ dispatched quantity + configured tolerance
```

Any exception must route to dispute/reconciliation rather than silently creating quantity.

---

## 12. Attestation-driven settlement

Example:

```text
Settlement contracted: 1,000 kg
        ↓
Processor receives material
        ↓
RECEIPT_CONFIRMED = 982 kg
        ↓
SettlementEngine verifies attestation
        ↓
Accepted quantity = 982 kg
        ↓
Payment = 982 × unit price
        ↓
Atomic settlement
```

This is the critical bridge between physical reality and programmable money.

---

## 13. Attestation revocation/dispute

Because the public chain is immutable, incorrect attestations cannot be deleted.

Instead:

- original attestation remains visible;
- authorised actor marks it revoked/disputed;
- replacement/corrective attestation references the original;
- settlement rules define whether revocation is allowed before/after settlement.

For the PoC, settlement should become final after execution except through a separate compensating transaction/admin process; do not pretend blockchain history can be rewritten.

---

## 14. When a claim should become a token

Use this decision test:

Tokenise a derived claim only if it needs one or more of:

- independent ownership;
- transferability;
- divisibility;
- secondary settlement;
- collateralisation/financing;
- independent composability across applications.

Otherwise retain it as a signed/on-chain claim record.

For first PoC:

- recovery asset = token;
- dINR = token;
- sponsor attribution = claim;
- processing outcome = attestation/claim;
- EPR outcome = external-reference claim;
- receivable token = future extension.

---

## 15. Composability demonstration

The first PoC should show at least one derived object from the base asset.

Recommended:

```text
Recovery Asset Token
        ↓
Receipt Attestation
        ↓
Processing Attestation
        ↓
Processing Outcome Claim
```

This proves that tokenised assets can generate machine-readable downstream economic outcomes without requiring every outcome to become another speculative token.

---

## 16. Required interfaces

### Attestation Service

- create signed attestation;
- verify attestor credential;
- submit attestation on-chain;
- retrieve attestation;
- revoke/dispute where permitted.

### Claim Service

- create claim;
- validate source asset/attestation;
- run double-counting checks;
- consume claim;
- query claim history;
- link external regulatory reference.

Detailed REST schemas are Pack 3.

---

## 17. Acceptance criteria

This capability is accepted when:

1. a verifier can create a valid recovery/weight attestation;
2. an uncredentialled party cannot create a settlement-valid attestation;
3. a processor can attest an accepted quantity;
4. settlement consumes the attestation deterministically;
5. evidence hashes can be recomputed and matched;
6. a processing claim can be generated from valid attestations;
7. duplicate/excess claims are rejected;
8. sponsor and EPR references remain technically distinct;
9. revocation/dispute creates new state without erasing history.
