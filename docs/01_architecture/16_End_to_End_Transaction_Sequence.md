# Finternet PoC — End-to-End Transaction Sequence

**Project:** Suma Finternet PoC — Tokenised Recovery Asset Demonstrator  
**Status:** Pack 4 — Engineering & Operations  
**Purpose:** Provide the master integration sequence showing exactly how identity, credentials, evidence, ERC-1155 tokenisation, Beckn discovery, smart accounts, dINR, attestations and Ethereum settlement work together in one demonstrable Finternet transaction.

---

## 1. Scenario used

The sequence demonstrates a simple but complete transaction:

- Aamhi/Originator has **1,000 kg of verified LDPE**;
- one ERC-1155 unit represents **1 kg** of that specific recovery lot;
- Buyer discovers the asset through Beckn;
- Buyer contracts to acquire **500 kg**;
- settlement consideration is **10,000 dINR**;
- Buyer funds escrow;
- 500 ERC-1155 units are locked;
- physical material is dispatched and received;
- a credentialled Processor signs receipt for **500 kg**;
- `SettlementEngine.sol` completes atomic Delivery-versus-Payment;
- Buyer receives 500 asset units;
- Seller receives 10,000 dINR;
- the transaction is visible through the Finternet Explorer and public Ethereum transaction references.

The amounts are PoC demonstration values only.

---

# 2. Actors and systems

## Organisations

- **Suma Network Administrator**
- **Originator / Aamhi**
- **Buyer**
- **Processor**
- **Verifier**

## Off-chain systems

- Admin Console
- Originator Console
- Independent Buyer App
- AI Agent Gateway (optional in primary flow)
- API Gateway
- Participant & Identity Service
- Credential Service
- Asset Service
- Evidence & Attestation Service
- Settlement Service
- Blockchain Adapter / Indexer
- Beckn Provider Node
- Beckn Consumer Node
- Catalog/Discovery Service
- PostgreSQL
- Secure Object Storage
- IPFS

## On-chain contracts

- `ParticipantRegistry.sol`
- `CredentialRegistry.sol`
- `RecoveryAsset.sol`
- `DemoINR.sol`
- `AttestationRegistry.sol`
- `ClaimRegistry.sol`
- `SettlementEngine.sol`

## Account layer

- ERC-4337 Smart Accounts
- Bundler
- optional Paymaster

---

# 3. Master sequence at a glance

```text
A. ONBOARD TRUSTED PARTICIPANTS
Participant → DID → VC → Smart Account → On-chain eligibility

B. CREATE PHYSICAL ASSET RECORD
Recovery record → Evidence → Verification

C. TOKENISE
Verified record → IPFS metadata → ERC-1155 mint

D. PUBLISH AND DISCOVER
ERC-1155-linked asset → Beckn catalogue → Independent Buyer

E. CONTRACT
Select/offer/confirm → Beckn Contract ID → Settlement instruction

F. FUND AND LOCK
Buyer dINR → Settlement escrow
Seller ERC-1155 units → Settlement escrow

G. PHYSICAL FULFILMENT
Dispatch → Receipt → Signed processor attestation

H. SETTLE
Attestation verified → atomic ERC-1155 ↔ dINR exchange

I. RECONCILE AND DISPLAY
Ethereum events → Indexer → Apps / Explorer / Claims
```

---

# 4. Phase A — Participant onboarding

This phase occurs before the asset transaction.

## A1. Create participant

**Actor:** Network Admin  
**Interface:** Admin Console  
**API:** `POST /participants`

Input includes:

- legal name;
- display name;
- organisation type;
- registration reference;
- jurisdiction;
- authorised contacts.

Output:

```text
participantId = ORG-AAMHI-001
```

Application state is stored in PostgreSQL.

---

## A2. Create organisational DID

**Service:** Participant & Identity Service

Create:

```text
did:web:<poc-domain>:participants:aamhi
```

Publish DID document under the corresponding HTTPS location.

The DID document contains authorised verification method(s), not the organisation's private keys.

---

## A3. Create ERC-4337 smart account

**Service:** Account/Blockchain integration

Create/deploy or deterministically derive Aamhi smart account.

Output:

```text
smartAccount = 0xAAMHI...
```

Bind in application model:

```text
ORG-AAMHI-001
↕
did:web:...
↕
0xAAMHI...
```

---

## A4. Register participant on Ethereum

**Service:** Blockchain Adapter  
**Contract:** `ParticipantRegistry.sol`

Call conceptually:

```text
registerParticipant(participantIdHash, didHash/reference, smartAccount)
```

Ethereum transaction is submitted and confirmed.

Indexer projects the confirmed participant state back to PostgreSQL.

---

## A5. Issue credential

**Actor:** Credential Authority  
**Service:** Credential Service

Issue W3C VC 2.0-compatible credential, e.g.:

```text
RecoveryOriginatorCredential
```

Credential contains/binds:

- subject DID;
- participant reference;
- authorised role/material scope;
- validity period;
- associated smart account as required by PoC profile.

Full VC remains off-chain.

---

## A6. Project eligibility on-chain

**Service:** Credential Service / Blockchain Adapter  
**Contract:** `CredentialRegistry.sol`

Project minimum enforceable status:

```text
smartAccount = 0xAAMHI...
credentialClass = RECOVERY_ORIGINATOR
status = ACTIVE
validUntil = ...
```

Now smart contracts can enforce eligibility even when called outside the Suma application.

Repeat A1–A6 for Buyer, Processor and Verifier using their appropriate credentials.

---

# 5. Phase B — Recovery asset and evidence creation

## B1. Create Recovery Asset record

**Actor:** Originator  
**Interface:** Originator Console  
**API:** `POST /assets`

Example canonical record:

```text
assetId: AST-RAI-2026-000001
material: LDPE
estimatedQuantityKg: 1000
origin: Raigad
originator: ORG-AAMHI-001
status: RECOVERED
```

This record is not yet the token.

---

## B2. Upload source evidence

**Actor:** Originator / Verifier  
**API:** evidence upload endpoint  
**Service:** Evidence & Attestation Service

Evidence examples:

- collection record;
- photographs;
- weighbridge slip;
- inspection record.

Files go to secure object storage.

For every file/object calculate a cryptographic digest.

Example:

```text
evidenceId: EVD-00001
sha256: abc123...
storageRef: private://...
```

---

## B3. Create evidence manifest/root

Evidence Service creates a canonical manifest of the records used to support tokenisation.

Output:

```text
evidenceManifestId: EVM-00001
evidenceRoot/hash: 0x...
```

This is the integrity anchor; source evidence remains private.

---

## B4. Verifier submits verification attestation

**Actor:** Verifier  
**Requirement:** active VerifierCredential

Attestation asserts:

```text
assetId = AST-RAI-2026-000001
verifiedQuantityKg = 1000
material = LDPE
evidenceRoot = 0x...
result = VERIFIED
```

The assertion is signed by the authorised verifier identity/account.

---

## B5. Record verification attestation

**Service:** Evidence & Attestation Service  
**Contract:** `AttestationRegistry.sol`

Before submission:

- resolve attestor participant;
- verify credential;
- verify signature/proof;
- verify expected asset/context.

On success, record attestation/reference on Ethereum.

The Asset Service now has the prerequisite trusted fact required for minting.

---

# 6. Phase C — Tokenisation

## C1. Generate public metadata

**Service:** Asset Service

Create non-sensitive ERC-1155 metadata including:

```text
assetId
materialType
verifiedQuantityKg
originRegion
originatorParticipantId/reference
verificationStatus
evidenceRoot
```

Do not include private evidence or personal information.

---

## C2. Publish metadata to IPFS

Asset Service pins metadata and receives content-addressed URI.

Example:

```text
ipfs://<CID>
```

The content address protects against silent metadata changes.

---

## C3. Mint ERC-1155 asset

**Service:** Asset Service / Blockchain Adapter  
**Contract:** `RecoveryAsset.sol`

Conceptual call:

```text
mint(
  to = 0xAAMHI...,
  tokenId = 10001,
  amount = 1000,
  metadataURI = ipfs://...,
  assetReference = AST-RAI-2026-000001
)
```

Preconditions:

- participant active;
- RecoveryOriginatorCredential valid;
- verification attestation valid;
- quantity = verified quantity;
- Asset ID not already tokenised.

Result:

```text
Aamhi balance of Token 10001 = 1000 units
1 unit = 1 kg
```

Ethereum becomes authoritative for token balances.

---

## C4. Index mint event

Blockchain Indexer sees ERC-1155 mint event and updates read projection.

Application marks:

```text
tokenised = true
tokenId = 10001
contract = 0xRecoveryAsset...
ethereumTxHash = 0x...
```

No API/database update can independently create token ownership.

---

# 7. Phase D — Open publication and discovery

## D1. Create Beckn catalogue resource

**Service:** Beckn Provider Node

Publish a resource representing available economic opportunity.

Contains sufficient public/commercial information such as:

```text
resourceId = BKN-RSRC-00001
assetId = AST-RAI-2026-000001
tokenContract = 0xRecoveryAsset...
tokenId = 10001
availableQuantityKg ≈ 1000
material = LDPE
origin = Raigad
originator = ORG-AAMHI-001
```

`availableQuantityKg` is a discoverability projection, not authoritative ownership state.

---

## D2. Buyer searches through independent Consumer Node

**Actor:** Buyer or Buyer AI Agent  
**System:** Independent Buyer Application  
**Protocol:** Beckn discovery

Intent example:

> Find verified LDPE recovery assets in Maharashtra, quantity at least 500 kg, from credentialled originators.

The Buyer system does not query Aamhi's private database.

---

## D3. Discovery response

Discovery Service returns matching resource(s).

Buyer receives Token 10001 as a candidate.

---

## D4. Independent verification before selection

Buyer App checks:

1. originator Participant ID/DID;
2. relevant credential validity;
3. `RecoveryAsset.sol` live token balance;
4. token metadata/evidence root;
5. asset transfer eligibility;
6. current availability/not locked according to settlement state.

This step proves interoperability: the Buyer trusts standard/public/verifiable primitives rather than the seller's UI alone.

---

# 8. Phase E — Offer and contract formation

## E1. Buyer selects 500 kg

**Protocol:** Beckn contracting interaction

Selection:

```text
tokenId: 10001
quantity: 500
indicative consideration: 10000 dINR
```

---

## E2. Provider confirms terms

Provider Node returns/negotiates applicable offer/consideration.

Final commercial structure:

```text
Seller: ORG-AAMHI-001
Buyer: ORG-BUYER-001
Token: 10001
Quantity: 500
Price: 10000 dINR
Required receipt attestation: PROCESSOR_RECEIPT
Expiry: <timestamp>
```

---

## E3. Beckn contract confirmed

Create canonical reference:

```text
becknContractId = BKN-CTR-00001
```

Both independent applications can retain the contract/context.

The Beckn contract is linked to—not substituted for—the Ethereum settlement object.

---

# 9. Phase F — Settlement creation, funding and asset lock

## F1. Create settlement instruction

**Actor:** Buyer / approved buyer operator  
**API:** Settlement Service  
**Smart Account:** Buyer ERC-4337 account

Request contains:

```text
becknContractId
sellerSmartAccount
buyerSmartAccount
assetContract
tokenId = 10001
quantity = 500
paymentToken = dINR
paymentAmount = 10000
requiredAttestation = PROCESSOR_RECEIPT
expiry
```

---

## F2. Revalidate all economic state

Settlement Service reads Ethereum directly/currently:

- seller has ≥ 500 units;
- buyer/seller active;
- required credentials active;
- token transferable;
- no conflicting lock;
- Buyer eligible to hold dINR/asset according to rules.

Stale Beckn catalogue information cannot override this step.

---

## F3. Create Ethereum settlement

**Contract:** `SettlementEngine.sol`

Conceptual call:

```text
createSettlement(...)
```

Output:

```text
settlementId = STL-00001 / on-chain settlement reference
```

Contract emits `SettlementCreated`.

Indexer maps:

```text
BKN-CTR-00001 ↔ STL-00001
```

---

## F4. Buyer funds dINR escrow

Buyer has been issued/funded with demo dINR from Treasury earlier.

Through the smart-account flow:

```text
Buyer Smart Account
  ↓ approve/execute
SettlementEngine
  ↓
10,000 dINR locked
```

Ethereum confirms escrow funding.

Status:

```text
FUNDS_LOCKED
```

---

## F5. Seller locks ERC-1155 units

Seller smart account authorises transfer/escrow of 500 Token 10001 units to the settlement mechanism.

Result:

```text
Aamhi freely available = 500
Settlement locked = 500
```

Those 500 units cannot support another active settlement.

Status:

```text
READY_FOR_FULFILMENT
```

---

# 10. Phase G — Physical fulfilment

## G1. Dispatch

Originator dispatches the physical 500 kg lot.

Optional dispatch evidence:

- dispatch document;
- vehicle/trip reference;
- timestamp;
- source weight.

A signed `DISPATCHED` attestation may be added but is not necessarily the final settlement condition.

---

## G2. Processor receives material

Processor receives and verifies quantity.

For the primary deterministic demo assume:

```text
receivedQuantity = 500 kg
```

---

## G3. Processor creates signed receipt attestation

Required credential:

```text
ProcessorCredential
```

Attestation payload:

```text
attestationId = ATT-REC-00001
settlementId = STL-00001
assetId = AST-RAI-2026-000001
tokenId = 10001
eventType = PROCESSOR_RECEIPT
quantityKg = 500
evidenceHash = 0x...
timestamp = ...
attestor = ORG-PROCESSOR-001
```

Processor signs through its authorised account/credential mechanism.

---

## G4. Attestation validation

Evidence & Attestation Service verifies:

- processor identity;
- ProcessorCredential active;
- signature/proof;
- settlement relation;
- quantity;
- no duplicate final receipt event;
- evidence digest.

---

## G5. Record attestation on Ethereum

**Contract:** `AttestationRegistry.sol`

Ethereum stores the minimum attestation state/reference required for verifiable settlement.

`SettlementEngine.sol` can now observe/check the required condition.

---

# 11. Phase H — Atomic settlement

## H1. Settlement condition evaluation

`SettlementEngine.sol` checks:

```text
settlement active?
YES

funds locked?
10,000 dINR YES

asset locked?
500 units YES

required PROCESSOR_RECEIPT attestation valid?
500 kg YES

not expired?
YES
```

---

## H2. Finalise

Call:

```text
finalizeSettlement(STL-00001)
```

Within the same settlement execution path:

```text
500 units Token 10001
Settlement escrow → Buyer Smart Account

AND

10,000 dINR
Settlement escrow → Aamhi Smart Account
```

If a required step reverts, the transaction does not leave only one side completed.

---

## H3. Ethereum state after settlement

Example balances:

```text
ERC-1155 Token 10001
Aamhi: 500
Buyer: 500

DemoINR
Buyer: previous balance - 10,000
Aamhi: previous balance + 10,000

Settlement STL-00001: FINALISED
```

Ethereum is authoritative for these balances/state.

---

# 12. Phase I — Reconciliation, claims and user-visible closure

## I1. Index events

Blockchain Indexer records confirmed events:

- ERC-1155 transfer;
- dINR transfer;
- settlement finalisation;
- attestation reference.

Read models update.

---

## I2. Update Beckn fulfilment/status

Provider/Consumer Nodes communicate final fulfilment status referencing the same canonical transaction context.

Beckn does not alter Ethereum balances; it communicates network transaction state.

---

## I3. Optional derived processing claim

If processor later confirms processing, issue:

```text
PROCESSING_COMPLETED claim / attestation
```

This remains a claim unless independent transferability creates a reason to tokenise it.

External EPR outcome may later be linked as a regulatory reference without the PoC pretending to mint an official EPR certificate.

---

## I4. Explorer display

Suma Finternet Explorer should show a coherent graph:

```text
Participant / DID / credential
        ↓
Recovery Asset AST-...
        ↓
ERC-1155 Token 10001
        ↓
Beckn Contract BKN-CTR-00001
        ↓
Settlement STL-00001
        ↓
Processor Attestation ATT-REC-00001
        ↓
ERC-1155 Transfer + dINR Transfer
        ↓
FINALISED
```

Public Ethereum transaction hashes should be visible where safe.

---

# 13. Negative path A — credential revoked before settlement

Suppose Buyer credential is revoked after discovery but before asset lock.

Expected sequence:

```text
Beckn discovery result exists
      ↓
Buyer selects asset
      ↓
Credential status rechecked
      ↓
INACTIVE / REVOKED
      ↓
settlement/transfer rejected
```

This proves discovery does not itself grant economic authority.

---

# 14. Negative path B — catalogue says 500 kg, chain no longer has it

Suppose an older Beckn response shows 500 kg available, but another transaction has locked the units.

Expected:

```text
Buyer receives stale catalogue result
      ↓
Settlement creation re-reads Ethereum
      ↓
available balance < requested
      ↓
transaction rejected / buyer asked to rediscover
```

This proves Ethereum, not catalogue/database state, is authoritative for economic availability.

---

# 15. Negative path C — receipt quantity below contract quantity

Example:

```text
Contracted: 500 kg
Received: 480 kg
```

The exact outcome depends on the settlement rule configured.

For a quantity-adjusted PoC variant:

```text
unit price = 20 dINR/kg
verified received = 480 kg
payment released = 9,600 dINR
asset units transferred = 480
remaining 20 locked units returned/unlocked to seller
remaining 400 dINR refunded to buyer
```

This variant should be implemented after the simple exact-quantity DvP works reliably.

---

# 16. Negative path D — fulfilment never occurs

If required receipt attestation is not recorded before expiry:

```text
Settlement expires
       ↓
Buyer dINR refunded/unlocked
       ↓
Seller ERC-1155 units returned/unlocked
       ↓
Settlement = EXPIRED / REFUNDED
```

No administrator should need to manually rewrite balances.

---

# 17. Optional AI-agent path

Once the base flow works, replace manual Buyer discovery/selection with the AI Agent.

Agent instruction:

> Find up to 500 kg of verified LDPE from active credentialled originators, below 20 dINR/kg, and prepare the best eligible transaction.

Agent performs:

```text
1. Beckn discovery
2. Read catalogue responses
3. Resolve participant credentials
4. Verify Ethereum token state
5. Apply deterministic price/quantity/policy constraints
6. Prepare selection/offer
7. Create transaction draft
8. Request human approval OR execute within delegated policy
```

The LLM does not decide whether an invalid credential becomes valid, nor can it bypass smart-contract limits.

---

# 18. Canonical identifier correlation

A single transaction should be traceable across all systems.

Example:

| Layer | Identifier |
|---|---|
| Participant | `ORG-AAMHI-001` |
| DID | `did:web:...:aamhi` |
| Recovery Asset | `AST-RAI-2026-000001` |
| ERC-1155 contract | `0xRecovery...` |
| ERC-1155 token ID | `10001` |
| Evidence manifest | `EVM-00001` |
| Verification attestation | `ATT-VER-00001` |
| Beckn resource | `BKN-RSRC-00001` |
| Beckn contract | `BKN-CTR-00001` |
| Settlement | `STL-00001` |
| Receipt attestation | `ATT-REC-00001` |
| Ethereum finalisation tx | `0xTX...` |

This correlation is essential for debugging, audit and the Finternet Explorer.

---

# 19. Source-of-truth matrix for the sequence

| Question | Authoritative source |
|---|---|
| Who is the organisation? | Participant profile + DID/credential framework |
| Is participant currently eligible on-chain? | `CredentialRegistry.sol` |
| Who holds recovery token units? | `RecoveryAsset.sol` / Ethereum |
| Who holds dINR? | `DemoINR.sol` / Ethereum |
| What is discoverable? | Beckn catalogue/discovery service |
| Is catalogue availability still valid? | Must be rechecked on Ethereum |
| What private evidence supports an event? | secured evidence repository |
| Was that evidence cryptographically bound? | hash/manifest + attestation |
| Did processor attest receipt? | signed attestation + `AttestationRegistry.sol` |
| Did settlement execute? | `SettlementEngine.sol` + Ethereum transaction |
| What user-friendly state should UI show? | indexed/read projection reconciled to authoritative sources |

---

# 20. Master integration acceptance

The complete PoC integration is successful when a reviewer can independently observe that:

1. organisations have resolvable identities and verifiable credentials;
2. a real recovery record is supported by evidence and verification;
3. the corresponding quantity is genuinely minted as ERC-1155 units;
4. an independent Buyer application discovers it through Beckn rather than the Originator's private database;
5. Buyer verifies identity/credential/token state;
6. Buyer and Seller create a contract-linked settlement;
7. dINR and recovery-token units are genuinely locked;
8. a signed physical-world receipt attestation provides the settlement condition;
9. ERC-1155 asset and dINR consideration exchange atomically;
10. chain state, application projections, Beckn status and Explorer all reconcile to the same completed transaction;
11. revocation/stale-state/failure scenarios cannot bypass the trust and settlement rules;
12. all critical steps can be traced through canonical IDs and Ethereum transaction hashes.

That transaction is the primary proof that the PoC is an end-to-end Finternet implementation rather than a central marketplace with blockchain logging added afterward.

