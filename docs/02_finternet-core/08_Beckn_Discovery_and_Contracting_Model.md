# Finternet PoC — Beckn Discovery and Contracting Model

**Project:** Suma Finternet PoC — Tokenised Recovery Asset Demonstrator  
**Status:** Pack 2 — Core Specification  
**Purpose:** Define how independently operated applications discover, select and contract around tokenised recovery assets using Beckn Protocol v2.0 concepts, while Ethereum remains the shared asset/settlement state layer.

---

## 1. Objective

The PoC must prove that tokenised assets are **not trapped inside one application**.

An independent buyer application or AI agent should be able to:

1. discover an available recovery asset through an open network;
2. understand the asset and commercial offer;
3. verify participant trust information;
4. establish a transaction/contract context;
5. execute settlement through shared Ethereum contracts;

without direct access to the originator's private application database.

---

## 2. Frozen design choice

Use **Beckn Protocol v2.0** concepts and transport contracts for the PoC open-network layer.

Important v2.0 characteristics used here:

- Provider Node (PN) and Consumer Node (CN) terminology;
- catalog-first discovery;
- Cataloging Service / Discovery Service fabric functions;
- explicit `Contract`, `Offer` and `Consideration` concepts;
- discovery, contracting/ordering, fulfilment and post-fulfilment API groups.

The current v2.0 canonical transport specification is represented by the Beckn OpenAPI artifact `api/v2.0.0/beckn.yaml`.

---

## 3. Network roles for the PoC

### Provider Node — Originator side

Publishes tokenised/eligible recovery-asset catalogue entries and responds to contracting interactions.

### Consumer Node — Buyer side

Represents independent buyer application and/or AI-agent-facing application.

### Cataloging Service

Receives/synchronises provider catalogues.

### Discovery Service

Indexes available catalogue resources and responds to consumer discovery intents.

### Network registry/configuration

Stores/locates network participant endpoint information and signing configuration as required by the chosen Beckn PoC deployment.

---

## 4. Separation of responsibilities

This is fundamental:

```text
BECKN
- what is available?
- who offers it?
- what are the commercial terms?
- what transaction/contract is being negotiated?

ETHEREUM
- what token exists?
- who holds it?
- how much is held?
- is it locked?
- can it transfer?
- what money is escrowed?
- did settlement execute?
```

Beckn must not become an alternative asset ledger.
Ethereum must not become a catalogue/search engine.

---

## 5. Catalogue resource model

A recovery asset catalogue entry should expose enough non-sensitive data for meaningful discovery.

Illustrative resource:

```json
{
  "resourceId": "BECKN-RWA-000001",
  "name": "Verified LDPE Recovery Lot",
  "assetId": "RWA-RAI-2026-000001",
  "ethereum": {
    "chainId": "<testnet-chain-id>",
    "contract": "0xRecoveryAsset...",
    "tokenId": "10001"
  },
  "material": {
    "code": "PLASTIC-LDPE",
    "name": "LDPE"
  },
  "availableQuantity": 1000,
  "unit": "kg",
  "origin": {
    "region": "Raigad",
    "state": "Maharashtra",
    "country": "IN"
  },
  "originator": {
    "participantId": "ORG-AAMHI-001",
    "did": "did:web:..."
  },
  "verificationStatus": "VERIFIED",
  "availability": "AVAILABLE"
}
```

Exact Beckn schema placement/extension profile will be defined during implementation.

---

## 6. Discovery intent

Example human/agent intent:

> Find verified LDPE recovery assets in Maharashtra, between 500 kg and 2 tonnes, from credentialled originators, available within 30 days.

The Consumer Node transforms this into the Beckn discovery request/filter model.

Discovery Service returns matching catalogue resources/offers.

The consumer can then independently verify:

- originator DID/credential;
- Ethereum token existence;
- token balance/supply;
- asset status;
- metadata/evidence references permitted for discovery.

---

## 7. Beckn-to-Finternet identifier mapping

Every transaction must preserve cross-system identifiers.

Minimum mappings:

```text
Beckn Provider ID        ↔ Participant ID / DID
Beckn Resource ID        ↔ Canonical Asset ID
Canonical Asset ID       ↔ ERC-1155 Token ID
Beckn Offer ID           ↔ Offer record
Beckn Contract ID        ↔ Commercial Contract ID
Commercial Contract ID   ↔ Settlement ID
Settlement ID            ↔ Ethereum SettlementEngine record
```

These mappings must be queryable without relying on informal logs.

---

## 8. Contracting flow

Recommended flow:

```text
1. PN publishes catalogue
2. CN discovers resource
3. CN selects resource / offer
4. PN returns terms
5. CN initialises transaction
6. identity/credential checks run
7. parties confirm commercial terms
8. Beckn Contract ID created/confirmed
9. SettlementEngine settlement record created
10. buyer funds dINR
11. seller locks ERC-1155 quantity
12. physical fulfilment begins
13. Beckn status/update reports progress
14. attestation arrives
15. Ethereum settlement executes
16. final status returned through Beckn/application layer
```

---

## 9. Contract / consideration mapping

A Beckn contract should describe the agreed exchange at the network layer.

Illustrative economic terms:

```text
Resource:
  Recovery Asset 10001

Quantity:
  500 kg

Offer:
  20 dINR-equivalent units per kg

Consideration:
  maximum 10,000 dINR

Fulfilment condition:
  accepted receipt attestation

Tolerance:
  configured threshold

Settlement:
  Ethereum Settlement ID STL-000021
```

The Beckn contract describes agreed terms; Ethereum executes shared token state and settlement.

---

## 10. Catalogue update from blockchain state

The Provider Node/application must prevent stale availability.

Example:

```text
Token 10001 total at seller: 1,000
400 locked/sold
Available quantity: 600
```

Catalogue should update to 600 rather than continue advertising 1,000.

Recommended approach:

- blockchain event indexer listens to transfers/settlements;
- off-chain availability projection updates;
- Provider Node republishes/synchronises relevant catalogue changes.

Ethereum remains authoritative when discrepancies occur.

---

## 11. Independent buyer application proof

This is a mandatory PoC outcome.

Create a small Buyer App that:

- has its own frontend/backend;
- has its own buyer smart account;
- does not share the originator database;
- discovers assets via Beckn interfaces;
- verifies DID/credentials;
- independently reads Ethereum token state;
- initiates a settlement;
- observes final token/payment transfer.

This demonstrates interoperability rather than application-level integration.

---

## 12. AI agent integration

The AI agent should operate primarily through the Consumer Node/tool APIs.

Example tool sequence:

```text
searchRecoveryAssets(intent)
       ↓
verifyParticipant(participantId)
       ↓
getOnChainAssetState(contract, tokenId)
       ↓
evaluateTerms(offer)
       ↓
prepareSelection()
       ↓
prepareContract()
       ↓
requestHumanApproval() or bounded smart-account execution
       ↓
create/fund settlement
```

The LLM must not directly handle private keys.

---

## 13. Network message trust

The Beckn layer must implement the signing/authentication mechanisms appropriate to the v2 PoC deployment.

Required outcomes:

- sender identity known;
- request integrity verifiable;
- replay/duplicate controls;
- correlation/transaction IDs maintained;
- endpoint/network participant configuration controlled.

Detailed signing headers and payload schemas belong in Pack 3 implementation specifications.

---

## 14. Data exposed through discovery

### Network-visible / catalogue-friendly

- material type;
- available quantity;
- broad geography;
- originator participant identity;
- verification status;
- token/network reference;
- availability window;
- non-sensitive commercial offer where intended.

### Restricted until authorised interaction

- detailed evidence;
- exact operational locations;
- confidential commercial terms;
- bank/financial information;
- private contracts;
- personal information.

---

## 15. Failure/reconciliation cases

### Catalogue says available but token already locked

Ethereum wins; transaction creation fails and catalogue is refreshed.

### Participant credential expired after discovery

Confirmation/settlement eligibility fails.

### Beckn contract confirmed but settlement not funded

Transaction remains pending until expiry/cancellation.

### Settlement succeeds but status callback fails

Ethereum state remains authoritative; consumer/provider applications reconcile from chain/indexer and replay/update network status.

### Provider application unavailable

Public token state remains inspectable, but new commercial workflow may pause until relevant network service resumes.

---

## 16. Minimum Beckn/API interactions to implement

Using v2.0 concepts:

### Catalogue

- publish/synchronise provider catalogue;
- update availability;
- catalogue search/index flow.

### Discovery

- `discover`
- corresponding response/callback pattern per implementation.

### Contracting / ordering

Implement the minimum relevant v2 transaction interactions required for:

- selection;
- offer/terms;
- initialisation;
- confirmation.

### Fulfilment

- status;
- updates;
- cancellation where appropriate.

Exact endpoint definitions will be copied/aligned to the v2.0 OpenAPI baseline in Pack 3 rather than invented in this document.

---

## 17. Acceptance criteria

The open-network capability is accepted when:

1. Provider Node publishes a tokenised recovery asset catalogue entry;
2. Discovery Service indexes it;
3. an independent Consumer Node finds it from a semantic/structured intent;
4. buyer application verifies the originator identity and on-chain asset state;
5. buyer and provider establish a Beckn transaction/contract reference;
6. that contract maps unambiguously to an Ethereum Settlement ID;
7. token availability updates after lock/transfer;
8. buyer completes a settlement without direct access to the provider database;
9. final fulfilment/settlement state is visible to both applications.

---

## 18. Standards baseline

Beckn Protocol v2.0 is used because the current v2 architecture formalises:

- catalog-first discovery;
- Consumer Node / Provider Node roles;
- Discovery/Cataloging Services;
- contract-centric transactions using `Contract`, `Offer` and `Consideration`;
- discovery, contracting, fulfilment and post-fulfilment API groups.

Canonical implementation alignment should use the Beckn v2.0 OpenAPI specification rather than recreating transport contracts from memory.
