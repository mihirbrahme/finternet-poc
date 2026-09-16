# Finternet PoC — Smart Contract Specifications

**Project:** Suma Finternet PoC — Tokenised Recovery Asset Demonstrator  
**Status:** Pack 2 — Core Specification  
**Purpose:** Define the Solidity contract suite, responsibilities, roles, interactions, core functions, events and invariants.

---

## 1. Contract suite

Recommended first implementation:

```text
ParticipantRegistry.sol
CredentialRegistry.sol
RecoveryAsset.sol
DemoINR.sol
AttestationRegistry.sol
ClaimRegistry.sol
SettlementEngine.sol
```

Optional later component:

```text
AssetFactory.sol
```

The first PoC does not require proxy/upgradable-contract complexity unless the development team has a strong reason. Prefer transparent, auditable deployments and versioned redeployment for the demonstrator.

---

## 2. Cross-contract architecture

```text
ParticipantRegistry
        │
        ▼
CredentialRegistry
        │
   ┌────┴─────────────┐
   ▼                  ▼
RecoveryAsset       DemoINR
   │                  │
   └───────┬──────────┘
           ▼
    SettlementEngine
           ▲
           │
 AttestationRegistry
           │
           ▼
      ClaimRegistry
```

`SettlementEngine` coordinates economic execution. It must not become the owner of all business logic.

---

# 3. ParticipantRegistry.sol

## Purpose

Maintain the minimal on-chain mapping between a participant identity and Ethereum smart account(s).

## Core state

Illustrative:

```solidity
struct Participant {
    bytes32 participantId;
    address account;
    bool active;
}
```

Potential mappings:

```text
account → participant ID
participant ID → primary account
account → active status
```

## Roles

- `DEFAULT_ADMIN_ROLE`
- `PARTICIPANT_ADMIN_ROLE`

## Core functions

- `registerParticipant(bytes32 participantId, address account)`
- `updateParticipantAccount(bytes32 participantId, address newAccount)`
- `setParticipantActive(address account, bool active)`
- `isParticipantActive(address account) view returns (bool)`
- `getParticipantId(address account) view returns (bytes32)`

## Events

- `ParticipantRegistered`
- `ParticipantAccountUpdated`
- `ParticipantStatusChanged`

## Invariants

- one active account mapping cannot ambiguously represent multiple participants;
- participant IDs cannot be silently reused;
- only authorised admin functions can modify mappings.

---

# 4. CredentialRegistry.sol

## Purpose

Expose minimum on-chain eligibility required by other contracts without storing complete Verifiable Credentials on-chain.

## Core state

Eligibility records may include:

```solidity
struct Eligibility {
    uint64 rolesBitmap;
    uint64 validUntil;
    bool active;
}
```

Material permissions may be stored separately where needed.

## Example roles

- recovery originator;
- buyer;
- processor;
- verifier;
- sponsor;
- attestation service.

## Core functions

- `setEligibility(address account, uint64 rolesBitmap, uint64 validUntil)`
- `setRole(address account, bytes32 role, bool allowed)` or equivalent bitmap operation
- `setMaterialEligibility(address account, bytes32 materialCode, bool allowed)`
- `suspend(address account)`
- `reinstate(address account)`
- `isEligible(address account, bytes32 role) view returns (bool)`
- `isEligibleForMaterial(address account, bytes32 role, bytes32 materialCode) view returns (bool)`

## Events

- `EligibilityUpdated`
- `MaterialEligibilityUpdated`
- `EligibilitySuspended`
- `EligibilityReinstated`

## Invariants

- expired/suspended participants fail eligibility checks;
- registry administration is separated from ordinary participant functions.

---

# 5. RecoveryAsset.sol

## Purpose

Represent verified recovery lots as ERC-1155 token IDs and transferable quantities.

## Base

Use OpenZeppelin ERC-1155 plus access-control and supply extensions where appropriate.

## Core state

For each token ID:

```solidity
struct AssetInfo {
    bytes32 assetId;
    bytes32 materialCode;
    uint256 originalQuantity;
    bytes32 evidenceRoot;
    bool blocked;
    bool exists;
}
```

Metadata URI/CID mapping as required.

## Roles

- `DEFAULT_ADMIN_ROLE`
- `MINTER_ROLE`
- `RETIRER_ROLE`
- optional `ASSET_ADMIN_ROLE`

## Core functions

- `mintAsset(...)`
- `uri(uint256 tokenId)`
- `retire(address holder, uint256 tokenId, uint256 amount, bytes32 reason)`
- `blockAsset(uint256 tokenId, bool blocked)`
- supply/balance queries
- standard ERC-1155 transfer functions with overridden policy checks.

## Transfer policy

Before token movement:

- token exists;
- token not blocked;
- sender and recipient eligibility checked when applicable;
- material eligibility checked if recipient role requires it;
- settlement engine can receive escrowed assets;
- burn/retirement path remains allowed for authorised role.

## Events

In addition to ERC-1155 standard events:

- `AssetMinted`
- `AssetRetired`
- `AssetBlocked`
- `MetadataReferenceSet` if required.

## Invariants

- minted supply never exceeds verified approved quantity;
- only authorised mint process creates supply;
- retired/burned quantity cannot be retransferred;
- transfer restrictions cannot be bypassed through standard ERC-1155 methods.

---

# 6. DemoINR.sol

## Purpose

Permissioned ERC-20 settlement token for PoC programmable-money demonstrations.

## Base

OpenZeppelin ERC-20 with access control and pausable functionality; holder policy integrated with CredentialRegistry.

## Roles

- `DEFAULT_ADMIN_ROLE`
- `TREASURY_ROLE`
- `PAUSER_ROLE`

## Core functions

- `mint(address to, uint256 amount)`
- `burn(...)`
- standard ERC-20 transfer/allowance functions with holder policy checks;
- `pause()` / `unpause()`.

## Events

Use standard ERC-20 events plus normal access/pause events.

## Invariants

- only treasury mints;
- transfers to disallowed accounts revert except controlled system contracts;
- settlement engine can hold escrow balances;
- paused token cannot perform ordinary transfers.

---

# 7. AttestationRegistry.sol

## Purpose

Record trusted assertions about off-chain physical events in a compact, inspectable on-chain form.

## Attestation types

Examples:

- `ASSET_VERIFIED`
- `DISPATCHED`
- `RECEIVED`
- `PROCESSED`
- `QUALITY_ACCEPTED`

## Core state

```solidity
struct Attestation {
    bytes32 attestationId;
    uint256 tokenId;
    bytes32 attestationType;
    address attestor;
    uint256 quantity;
    bytes32 evidenceHash;
    uint64 timestamp;
    bool revoked;
}
```

## Core functions

- `submitAttestation(...)`
- `revokeAttestation(bytes32 attestationId, bytes32 reason)` where governance permits
- `getAttestation(...)`
- `isValidAttestation(...)`

## Validation

- attestor must be eligible for the attestation type;
- token must exist where token-linked;
- duplicate attestation ID rejected;
- quantity rules checked against asset/transaction context where possible.

## Events

- `AttestationSubmitted`
- `AttestationRevoked`

## Invariants

- attestations are append-oriented;
- revoked attestations remain historically visible;
- evidence documents remain off-chain.

---

# 8. ClaimRegistry.sol

## Purpose

Represent derived economic/regulatory/sponsor claims without automatically tokenising every claim.

## Claim types

Examples:

- `MATERIAL_CONTROL`
- `PROCESSING_OUTCOME`
- `SPONSOR_ATTRIBUTION`
- `RECOVERY_SERVICE_ENTITLEMENT`
- `EPR_REFERENCE`

## Core state

```solidity
struct Claim {
    bytes32 claimId;
    uint256 tokenId;
    bytes32 claimType;
    address holder;
    uint256 quantity;
    bytes32 sourceAttestationId;
    uint8 status;
}
```

Statuses may include:

- `ACTIVE`
- `CONSUMED`
- `REVOKED`
- `DISPUTED`

## Core functions

- `createClaim(...)`
- `consumeClaim(...)`
- `revokeClaim(...)`
- `getClaim(...)`
- validation/query helpers.

## Double-counting controls

Contract/service rules must prevent:

- claim quantity > eligible parent quantity;
- duplicate exclusive claim for same right and quantity;
- consumption more than once;
- EPR reference being treated as a regulator-issued certificate.

## Events

- `ClaimCreated`
- `ClaimConsumed`
- `ClaimRevoked`
- `ClaimDisputed`

---

# 9. SettlementEngine.sol

## Purpose

Coordinate programmable exchange of ERC-1155 recovery assets and dINR.

This is the principal economic-execution contract.

## Settlement states

```text
CREATED
FUNDED
ASSET_LOCKED
ACTIVE
READY_TO_SETTLE
SETTLED
REFUNDED
CANCELLED
DISPUTED
EXPIRED
```

## Core settlement structure

Illustrative:

```solidity
struct Settlement {
    bytes32 settlementId;
    address seller;
    address buyer;
    uint256 tokenId;
    uint256 contractedQuantity;
    uint256 unitPrice;
    uint256 maxPayment;
    uint64 expiry;
    bytes32 requiredAttestationType;
    uint8 status;
}
```

Additional fields may support recipient splits and Beckn contract references.

## Core functions

- `createSettlement(...)`
- `fundSettlement(bytes32 settlementId, uint256 amount)`
- `lockAsset(bytes32 settlementId, uint256 amount)` or implicit ERC-1155 receiver path
- `markReady(...)` based on valid attestation/policy
- `settle(bytes32 settlementId)`
- `refund(bytes32 settlementId)`
- `cancel(bytes32 settlementId)`
- `expire(bytes32 settlementId)`
- `raiseDispute(...)` if included in PoC.

## Atomic settlement rule

A successful execution must complete asset and dINR legs inside the same transaction path so partial economic settlement cannot remain committed.

### Simple DvP

```text
asset escrow → buyer
money escrow → seller
```

### Quantity-adjusted DvP

```text
acceptedQty = attested receipt quantity capped by contracted quantity
payment = acceptedQty × unitPrice
unused dINR → buyer
contracted asset units not accepted → seller or dispute path
```

### Split settlement

Optional recipient schedule:

```text
seller        90%
logistics      5%
verifier       5%
```

Percentages/amounts must exactly reconcile to payable amount.

## External dependencies

- `RecoveryAsset`
- `DemoINR`
- `CredentialRegistry`
- `AttestationRegistry`
- optionally `ClaimRegistry`

## Events

- `SettlementCreated`
- `SettlementFunded`
- `AssetLocked`
- `SettlementReady`
- `SettlementExecuted`
- `SettlementRefunded`
- `SettlementCancelled`
- `SettlementExpired`
- `SettlementDisputed`

## Invariants

- same escrowed asset quantity cannot support multiple settlements;
- payment never exceeds funded amount;
- accepted quantity never exceeds contracted quantity;
- settlement cannot execute twice;
- refund cannot execute after settlement;
- only valid attestations/conditions can mark conditional settlement ready;
- asset and money legs complete atomically.

---

# 10. Access-control design

Use OpenZeppelin `AccessControl`-style roles.

Separate:

- protocol administrator;
- credential administrator;
- asset minter;
- dINR treasury;
- emergency pauser;
- verifier/attestor;
- participant users.

Avoid one universal privileged account for all capabilities.

---

# 11. Contract deployment order

Recommended:

```text
1. ParticipantRegistry
2. CredentialRegistry
3. RecoveryAsset
4. DemoINR
5. AttestationRegistry
6. ClaimRegistry
7. SettlementEngine
8. Configure cross-contract permissions/addresses
9. Register participants
10. Fund smart accounts with testnet gas or configure paymaster
11. Mint demo dINR
```

---

# 12. Upgrade/version strategy

For the PoC:

- avoid hidden upgradeability unless required;
- include semantic contract version in repository/release metadata;
- redeploy cleanly when breaking changes occur;
- store deployment manifests with addresses, chain ID and Git commit.

This makes public-testnet demonstrations reproducible and auditable.

---

# 13. Testing requirements

Each contract requires:

- unit tests;
- access-control tests;
- failure/revert tests;
- cross-contract integration tests;
- settlement invariants;
- event validation;
- fuzz/property tests for quantity/payment logic where practical;
- static analysis and dependency review.

Critical scenarios:

- invalid recipient transfer;
- duplicate mint attempt;
- double settlement;
- expired credential;
- revoked attestation;
- insufficient dINR;
- quantity mismatch;
- failed/refunded settlement;
- replay/duplicate identifiers.

---

# 14. Definition of done

The contract suite is complete when an independent buyer application can, using only public/shared interfaces and valid credentials:

1. inspect an ERC-1155 recovery asset;
2. confirm participant eligibility;
3. fund a dINR settlement;
4. lock the seller's ERC-1155 quantity;
5. receive a valid physical-world attestation;
6. execute conditional atomic settlement;
7. observe resulting asset and money balances;
8. inspect resulting claims/events independently on Ethereum.
