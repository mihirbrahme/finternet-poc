# Finternet PoC — Recovery Asset and ERC-1155 Token Model

**Project:** Suma Finternet PoC — Tokenised Recovery Asset Demonstrator  
**Status:** Pack 2 — Core Specification  
**Purpose:** Define the real-world economic object, its digital representation, ERC-1155 token semantics, lifecycle and transfer rules.

---

## 1. Objective

The PoC must demonstrate **genuine tokenisation**, not merely a blockchain hash of an off-chain record.

A verified physical recovery lot becomes a transferable digital economic asset represented on Ethereum through ERC-1155.

The token carries shared state that external applications can independently inspect and transact with.

---

## 2. Frozen design choices

| Topic | Choice |
|---|---|
| Blockchain | Ethereum-compatible public testnet |
| Contract language | Solidity |
| Token standard | ERC-1155 |
| Contract base | OpenZeppelin ERC-1155 libraries |
| Token unit | 1 ERC-1155 unit = entitlement associated with 1 kg of the specific recovery lot |
| Lot identity | One token ID per verified recovery lot |
| Metadata | IPFS for public/non-sensitive metadata |
| Evidence | Private object storage; evidence hash/root linked to metadata/on-chain state |
| Transfer model | Transferable among eligible credentialled accounts |
| Legal meaning | Digitally recognised contractual/economic entitlement; not an unsupported assertion of statutory property title |
| Derived claims | Separate Claim Registry unless independent tokenisation is justified |

---

## 3. Economic object being represented

The core object is a **Verified Recovery Asset**.

It represents a defined quantity of physical recovered material for which the PoC has established sufficient evidence of:

- origin;
- material class;
- verified quantity;
- current custody/control;
- right/authority to offer the material economically;
- verifier/attestation;
- evidence linkage;
- creation time;
- transaction state.

Example:

```text
Asset ID:           RWA-RAI-2026-000001
Token ID:           10001
Material:           LDPE
Verified Quantity:  1,000 kg
ERC-1155 Supply:    1,000 units
Unit Semantics:     1 unit = 1 kg entitlement associated with this lot
Originator:         ORG-AAMHI-001
Origin:             Raigad, Maharashtra
Status:             TOKENISED / AVAILABLE
```

---

## 4. Why ERC-1155

ERC-1155 allows one smart contract to manage many token IDs with fungible, non-fungible or semi-fungible behaviour.

For this PoC:

- each recovery lot has a unique token ID;
- units within that token ID are interchangeable quantities of the same verified lot;
- partial quantities can be transferred without creating hundreds of NFTs;
- batch operations remain possible;
- balances directly express how much of the lot each account controls.

Example after partial transfer:

```text
Token ID 10001 — original supply 1,000

Aamhi balance:      600
Buyer A balance:    400
Total supply:     1,000
```

---

## 5. Token ID design

Two identifiers must be maintained:

### Canonical Asset ID

Human/system-friendly identifier:

```text
RWA-RAI-2026-000001
```

### Ethereum Token ID

`uint256` ERC-1155 token ID:

```text
10001
```

The mapping is immutable once minted:

```text
assetId → tokenId
RWA-RAI-2026-000001 → 10001
```

No two canonical asset IDs may map to the same token ID.

---

## 6. Token supply semantics

Baseline:

```text
1 ERC-1155 unit = 1 kg
```

For a verified lot of 1,000 kg:

```text
mint quantity = 1000
```

For PoC materials with non-integer weight, operational data may retain decimal precision while the tokenisation service applies an agreed integer unit strategy. For the initial demonstrator, select whole-kilogram lots so the token model remains simple and auditable.

Future versions could use grams or fixed-decimal units without changing the overall architecture.

---

## 7. Asset lifecycle

Recommended application/contract lifecycle:

```text
DRAFT
  ↓
RECOVERED
  ↓
VERIFIED
  ↓
TOKENISED
  ↓
AVAILABLE
  ↓
RESERVED / LOCKED
  ↓
IN_FULFILMENT
  ↓
RECEIVED
  ↓
SETTLED
  ↓
CONSUMED / RETIRED
```

Exception states:

- `REJECTED`
- `DISPUTED`
- `CANCELLED`

Not every operational state needs to be encoded directly inside ERC-1155 storage. The contract must encode only states that affect shared economic behaviour, particularly:

- existence;
- transferable balance;
- lock status;
- consumed/retired quantity;
- transfer eligibility.

---

## 8. Minting conditions

A token can only be minted when:

1. canonical asset record exists;
2. material and quantity are defined;
3. originator is credentialled;
4. verifier attestation is valid;
5. evidence root/hash exists;
6. quantity has not already been tokenised;
7. asset is not marked invalid/rejected;
8. minting authority approves the transaction.

Minting creates:

- token ID;
- total initial supply;
- originator balance;
- URI/metadata reference;
- `AssetMinted` event.

---

## 9. Transfer model

Transfers are **real Ethereum ERC-1155 balance transfers** but are policy controlled.

Before transfer the contract/policy layer checks:

- sender active;
- receiver active;
- receiver role eligible;
- material-category eligibility where required;
- quantity ≤ sender available balance;
- quantity not locked;
- asset not retired/blocked;
- settlement restrictions satisfied where applicable.

The PoC must demonstrate both:

1. a valid transfer;
2. a deliberately rejected invalid transfer.

---

## 10. Reservation and locking

A buyer transaction must not allow the same quantity to be sold twice.

Recommended approach:

- settlement engine receives or controls the reserved ERC-1155 quantity; or
- recovery contract maintains explicit locked balances authorised only by settlement engine.

Preferred PoC design:

> **Settlement escrow custody.**

When a seller commits 500 units to a settlement:

```text
Seller available balance:   500 units decrease
Settlement contract balance:500 units increase
```

Those units cannot be used in another transaction.

If settlement succeeds:

```text
Settlement contract → Buyer
```

If settlement cancels/refunds:

```text
Settlement contract → Seller
```

This provides clear, inspectable locking on a public ledger.

---

## 11. Partial transfer

Example:

```text
Aamhi owns 1,000 × token 10001

Settlement A locks 400
Settlement completes

Aamhi:   600
Buyer A: 400
```

A second buyer may acquire the remaining 600 if the asset remains eligible and available.

This directly demonstrates divisibility of the real-world economic entitlement.

---

## 12. Split/child-lot semantics

ERC-1155 balances already support quantity division, so a new token ID is **not** required merely because the lot is sold in pieces.

A new child token ID should only be created when the economic/physical identity materially changes, for example:

- material is reprocessed;
- material is reclassified;
- distinct downstream lots need independent provenance;
- a transformation creates a new asset class.

If child tokens are created, preserve lineage:

```text
Parent token: 10001
         ↓ transformation
Child token:  20017
Parent quantity consumed: 982
Child verified output:     920
```

Parent-child lineage belongs in the Claim/Attestation and asset metadata model.

---

## 13. Processing and retirement

The token must not continue representing freely transferable unprocessed material after that material has been consumed/processed.

Two mechanisms are supported:

### Retirement

Mark a quantity as consumed and non-transferable while retaining historic token records.

### Burn

Burn processed/consumed units from circulation.

Recommended PoC behaviour:

- physical processing attestation received;
- relevant quantity moves to consumed state;
- ERC-1155 units are burned or transferred to an irrecoverable retirement function;
- processing claim/attestation remains available permanently.

The exact implementation will be defined in `06_Smart_Contract_Specifications.md`.

---

## 14. Metadata

ERC-1155 URI resolves to IPFS metadata.

Illustrative metadata:

```json
{
  "schemaVersion": "1.0",
  "assetId": "RWA-RAI-2026-000001",
  "tokenId": "10001",
  "assetType": "VERIFIED_RECOVERY_MATERIAL",
  "material": {
    "code": "PLASTIC-LDPE",
    "name": "LDPE"
  },
  "verifiedQuantity": 1000,
  "unit": "kg",
  "tokenUnit": "1 token unit = 1 kg",
  "origin": {
    "region": "Raigad",
    "state": "Maharashtra",
    "country": "IN"
  },
  "originator": {
    "participantId": "ORG-AAMHI-001",
    "did": "did:web:..."
  },
  "verification": {
    "status": "VERIFIED",
    "attestationId": "ATT-000001"
  },
  "evidenceRoot": "0x...",
  "createdAt": "2026-10-01T10:00:00Z"
}
```

Do not expose personal information, confidential price information or sensitive documents through IPFS.

---

## 15. Evidence binding

Evidence remains off-chain.

For each evidence package:

1. normalise/index evidence files;
2. compute cryptographic hashes;
3. create evidence manifest;
4. compute evidence root/manifest hash;
5. store manifest in secured storage and/or appropriate metadata;
6. bind evidence root to the asset.

This allows later verification that evidence was not silently altered.

---

## 16. Token ownership vs legal rights

The PoC should use precise language:

> The ERC-1155 balance represents a digitally recognised contractual/economic entitlement associated with a defined quantity of the identified verified recovery lot within the PoC transaction framework.

It should **not** claim by default that blockchain possession alone determines statutory property title under applicable law.

The associated PoC contract/participant agreement must define the legal effect intended by token transfer.

---

## 17. Contract interfaces required

The Recovery Asset contract will need operations equivalent to:

- `mintAsset(...)`
- `uri(tokenId)`
- standard ERC-1155 balance queries;
- standard safe transfers, with policy checks;
- `burn` / `retire`;
- supply queries;
- status/blocking controls where justified;
- settlement-engine-authorised movement or locking.

Exact Solidity signatures appear in `06_Smart_Contract_Specifications.md`.

---

## 18. Required events

At minimum:

- `AssetMinted`
- `AssetMetadataUpdated` if controlled mutable metadata reference is allowed
- standard ERC-1155 `TransferSingle`
- standard ERC-1155 `TransferBatch`
- `AssetLocked` or settlement custody event
- `AssetReleased`
- `AssetRetired`
- `AssetBurned`
- `AssetBlocked` / `AssetUnblocked` if implemented

---

## 19. Required source data

For minting:

- asset ID;
- material code;
- verified quantity;
- unit;
- originator Participant ID/DID;
- origin geography;
- verifier attestation ID;
- evidence root;
- creation timestamp;
- metadata URI/CID;
- applicable material/regulatory category;
- tokenisation approval.

---

## 20. Acceptance criteria

The tokenisation capability is accepted when:

1. a verified 1,000 kg lot can mint exactly 1,000 ERC-1155 units;
2. asset metadata is independently retrievable;
3. balances are visible on Ethereum;
4. 400 units can be transferred to an eligible buyer;
5. an ineligible recipient transfer is rejected;
6. 500 units can be escrow-locked without affecting the remaining available balance;
7. locked units cannot be double-spent;
8. successful settlement moves the locked units to the buyer;
9. failed settlement returns locked units;
10. processing can retire/burn the relevant quantity while preserving provenance.

---

## 21. Standards baseline

- ERC-1155 Multi Token Standard — Ethereum Standards Track, Final.
- Solidity and OpenZeppelin implementations for contract development.

Detailed Solidity contract design is specified separately so the asset semantics remain stable even if implementation internals change.
