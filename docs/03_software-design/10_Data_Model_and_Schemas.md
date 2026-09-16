# Finternet PoC — Canonical Data Model and Schemas

**Project:** Suma Finternet PoC — Tokenised Recovery Asset Demonstrator  
**Status:** Pack 3 — Software & Data Specification  
**Purpose:** Define canonical identifiers, core entities, relationships, database records and interchange schemas used consistently across Ethereum, Beckn, credentials, APIs and applications.

---

## 1. Data-design principle

The PoC must have **one canonical meaning for each business object**, even though that object may be represented in several systems.

Example:

```text
Canonical Asset ID
RWA-RAI-2026-000001
        │
        ├── PostgreSQL asset record
        ├── IPFS metadata document
        ├── ERC-1155 Token ID 10001
        ├── Beckn Resource ID
        ├── Evidence manifests
        ├── Attestations
        ├── Claims
        └── Settlements
```

Do not use blockchain transaction hashes, database primary keys or Beckn message IDs as substitutes for canonical business IDs.

---

# 2. Canonical identifiers

| Object | Example | Rule |
|---|---|---|
| Participant | `ORG-AAMHI-001` | immutable business identifier |
| DID | `did:web:...:ORG-AAMHI-001` | resolvable organisational identity |
| Smart Account | `0x...` | chain-specific acting account; rotatable |
| Credential | `VC-PROCESSOR-000001` | issuer-scoped stable ID |
| Asset | `RWA-RAI-2026-000001` | immutable recovery asset ID |
| ERC-1155 Token ID | `10001` | immutable mapping to Asset ID |
| Evidence | `EVD-000001` | immutable evidence item ID |
| Evidence Manifest | `EVM-000001` | groups evidence hashes |
| Attestation | `ATT-000001` | signed event/fact ID |
| Claim | `CLM-000001` | derived right/outcome ID |
| Offer | `OFR-000001` | commercial offer ID |
| Contract | `CTR-000001` | commercial/network contract ID |
| Settlement | `STL-000001` | smart-settlement correlation ID |
| Beckn Resource | `BR-000001` | open-network catalogue resource |
| Beckn Transaction | Beckn context transaction ID | protocol correlation |
| Blockchain transaction | `0x...` | execution/audit reference, not business ID |

---

# 3. Core entity relationship model

```text
Participant
  ├── DID
  ├── SmartAccount(s)
  └── Credential(s)

Participant (Originator)
  └── RecoveryAsset
        ├── EvidenceItem(s)
        ├── EvidenceManifest(s)
        ├── Attestation(s)
        ├── ERC1155TokenBinding
        ├── BecknResource
        ├── Claim(s)
        └── Settlement(s)

Settlement
  ├── CommercialContract
  ├── Buyer Participant
  ├── Seller Participant
  ├── ERC1155 quantity
  ├── dINR amount
  ├── required Attestation(s)
  └── Blockchain transaction(s)
```

---

# 4. Participant schema

Logical entity:

```json
{
  "participantId": "ORG-AAMHI-001",
  "legalName": "Project Aamhi",
  "displayName": "Project Aamhi",
  "organisationType": "RECOVERY_ORIGINATOR",
  "registrationReference": "...",
  "jurisdiction": "IN",
  "did": "did:web:finternet-poc.sumasoft.com:participants:ORG-AAMHI-001",
  "status": "ACTIVE",
  "createdAt": "2026-10-01T00:00:00Z"
}
```

Do not expose private contact/KYC fields through public participant APIs by default.

---

# 5. Smart-account binding schema

```json
{
  "participantId": "ORG-AAMHI-001",
  "chainId": 11155111,
  "accountAddress": "0x...",
  "accountType": "ERC4337_SMART_ACCOUNT",
  "purpose": "PRIMARY_TRANSACTION_ACCOUNT",
  "status": "ACTIVE",
  "validFrom": "...",
  "validUntil": null
}
```

A participant may have historical accounts. Only active binding(s) may transact.

---

# 6. Credential schema

The signed VC follows W3C VC 2.0; the application also keeps an indexed credential record.

Illustrative VC payload:

```json
{
  "@context": ["https://www.w3.org/ns/credentials/v2"],
  "id": "https://issuer.finternet-poc.sumasoft.com/credentials/VC-PROCESSOR-000001",
  "type": ["VerifiableCredential", "ProcessorCredential"],
  "issuer": "did:web:finternet-poc.sumasoft.com:issuer",
  "validFrom": "2026-10-01T00:00:00Z",
  "validUntil": "2027-03-31T23:59:59Z",
  "credentialSubject": {
    "id": "did:web:finternet-poc.sumasoft.com:participants:ORG-RECYCLER-001",
    "participantId": "ORG-RECYCLER-001",
    "roles": ["PROCESSOR"],
    "materialClasses": ["PLASTIC-LDPE"],
    "ethereumAccounts": ["0x..."]
  },
  "credentialStatus": {
    "id": "https://issuer.finternet-poc.sumasoft.com/status/VC-PROCESSOR-000001",
    "type": "PoCCredentialStatus"
  }
}
```

The precise proof format is selected during implementation, but all business claims above remain stable.

---

# 7. Material master schema

```json
{
  "materialCode": "PLASTIC-LDPE",
  "materialName": "Low-density polyethylene",
  "category": "PLASTIC",
  "defaultUnit": "kg",
  "tokenUnit": "kg",
  "active": true,
  "regulatoryReferences": []
}
```

For the initial PoC, token quantity is integer kilograms.

---

# 8. Recovery Asset schema

Canonical application entity:

```json
{
  "assetId": "RWA-RAI-2026-000001",
  "originatorParticipantId": "ORG-AAMHI-001",
  "materialCode": "PLASTIC-LDPE",
  "quantity": {
    "estimated": 1025,
    "verified": 1000,
    "unit": "kg"
  },
  "origin": {
    "country": "IN",
    "state": "Maharashtra",
    "district": "Raigad",
    "locationReference": "ZONE-RAI-01"
  },
  "quality": {
    "grade": "SORTED",
    "contaminationPercent": 4.2
  },
  "custody": {
    "currentParticipantId": "ORG-AAMHI-001",
    "facilityReference": "FAC-001"
  },
  "verificationStatus": "VERIFIED",
  "lifecycleStatus": "TOKENISED",
  "evidenceManifestId": "EVM-000001",
  "createdAt": "..."
}
```

---

# 9. ERC-1155 token binding schema

```json
{
  "assetId": "RWA-RAI-2026-000001",
  "chainId": 11155111,
  "contractAddress": "0xRecoveryAsset...",
  "tokenId": "10001",
  "originalSupply": "1000",
  "tokenUnit": "kg",
  "metadataUri": "ipfs://...",
  "mintTxHash": "0x...",
  "mintBlockNumber": 123456,
  "status": "ACTIVE"
}
```

The `assetId ↔ chainId ↔ contractAddress ↔ tokenId` tuple is immutable after successful mint.

---

# 10. Public ERC-1155 metadata schema

Example IPFS JSON:

```json
{
  "name": "Verified LDPE Recovery Lot RWA-RAI-2026-000001",
  "description": "Tokenised entitlement associated with a verified recovered-material lot.",
  "assetId": "RWA-RAI-2026-000001",
  "material": {
    "code": "PLASTIC-LDPE",
    "name": "LDPE"
  },
  "tokenUnit": "kg",
  "originalQuantity": 1000,
  "origin": {
    "district": "Raigad",
    "state": "Maharashtra",
    "country": "IN"
  },
  "originator": {
    "participantId": "ORG-AAMHI-001",
    "did": "did:web:..."
  },
  "verification": {
    "status": "VERIFIED",
    "evidenceRoot": "0x..."
  },
  "schemaVersion": "1.0"
}
```

Do not place exact private facility coordinates, individual identities, commercial price or confidential documents in public metadata.

---

# 11. Evidence item schema

```json
{
  "evidenceId": "EVD-000001",
  "assetId": "RWA-RAI-2026-000001",
  "type": "WEIGHMENT_SLIP",
  "contentHashAlgorithm": "SHA-256",
  "contentHash": "...",
  "mimeType": "application/pdf",
  "storageClass": "PRIVATE_OBJECT_STORE",
  "storageReference": "...",
  "sourceParticipantId": "ORG-AAMHI-001",
  "capturedAt": "...",
  "classification": "CONFIDENTIAL"
}
```

---

# 12. Evidence manifest schema

Canonical JSON should be deterministically serialised before hashing.

```json
{
  "manifestId": "EVM-000001",
  "assetId": "RWA-RAI-2026-000001",
  "evidence": [
    {"evidenceId": "EVD-000001", "hash": "..."},
    {"evidenceId": "EVD-000002", "hash": "..."}
  ],
  "createdAt": "...",
  "manifestHash": "0x..."
}
```

---

# 13. Attestation schema

```json
{
  "attestationId": "ATT-000123",
  "type": "RECEIPT_CONFIRMED",
  "assetId": "RWA-RAI-2026-000001",
  "tokenId": "10001",
  "settlementId": "STL-000021",
  "attestorParticipantId": "ORG-RECYCLER-001",
  "attestorDid": "did:web:...",
  "attestorAccount": "0x...",
  "quantity": 982,
  "unit": "kg",
  "eventTime": "2026-10-14T11:35:00Z",
  "evidenceManifestId": "EVM-000050",
  "evidenceHash": "0x...",
  "status": "ACTIVE",
  "chain": {
    "txHash": "0x...",
    "blockNumber": 123456
  }
}
```

---

# 14. Claim schema

```json
{
  "claimId": "CLM-000001",
  "type": "OBP_READY_RECOVERY_CLAIM",
  "assetId": "RWA-RAI-2026-000001",
  "tokenId": "10001",
  "sourceAttestationIds": ["ATT-000123"],
  "issuerParticipantId": "ORG-AAMHI-001",
  "holderParticipantId": "ORG-SPONSOR-001",
  "quantity": 982,
  "unit": "kg",
  "claimBasis": {
    "obpRiskCategory": "POTENTIAL_OBP",
    "originDistrict": "Raigad",
    "originState": "Maharashtra",
    "isOfficialCredit": false,
    "certificationRegistry": null
  },
  "status": "ACTIVE",
  "externalReference": null
}
```

For OBP and EPR-adjacent claims, `isOfficialCredit` must be `false` unless the PoC is integrated with an authorised certification, registry or regulatory system. The first PoC creates OBP-ready evidence claims, not official OBP credits.

Allowed statuses:

- `ACTIVE`;
- `CONSUMED`;
- `REVOKED`;
- `DISPUTED`.

---

# 15. Offer schema

```json
{
  "offerId": "OFR-000001",
  "assetId": "RWA-RAI-2026-000001",
  "sellerParticipantId": "ORG-AAMHI-001",
  "buyerParticipantId": "ORG-BUYER-001",
  "quantity": 500,
  "unit": "kg",
  "unitPrice": 20,
  "currency": "dINR",
  "validUntil": "...",
  "status": "ACCEPTED",
  "becknOfferId": "..."
}
```

---

# 16. Commercial Contract schema

```json
{
  "contractId": "CTR-000001",
  "becknContractId": "...",
  "offerId": "OFR-000001",
  "assetId": "RWA-RAI-2026-000001",
  "sellerParticipantId": "ORG-AAMHI-001",
  "buyerParticipantId": "ORG-BUYER-001",
  "quantity": 500,
  "unitPrice": 20,
  "maximumConsideration": 10000,
  "currency": "dINR",
  "settlementRule": "QUANTITY_ADJUSTED_DVP",
  "requiredAttestations": ["RECEIPT_CONFIRMED"],
  "status": "CONFIRMED"
}
```

Legal PDF/reference can be separately stored; this canonical record represents machine-readable transaction terms.

---

# 17. Settlement schema

```json
{
  "settlementId": "STL-000021",
  "contractId": "CTR-000001",
  "ethereumSettlementKey": "0x...",
  "asset": {
    "tokenId": "10001",
    "contractAddress": "0x...",
    "quantity": 500
  },
  "payment": {
    "token": "dINR",
    "tokenAddress": "0x...",
    "maximumAmount": 10000,
    "unitPrice": 20
  },
  "sellerParticipantId": "ORG-AAMHI-001",
  "buyerParticipantId": "ORG-BUYER-001",
  "type": "QUANTITY_ADJUSTED_DVP",
  "status": "ASSET_LOCKED_AND_FUNDED",
  "expiry": "..."
}
```

On-chain settlement state is authoritative if a projection differs.

---

# 18. Beckn mapping schema

```json
{
  "becknProviderId": "...",
  "becknResourceId": "BR-000001",
  "becknOfferId": "...",
  "becknContractId": "...",
  "becknTransactionId": "...",
  "assetId": "RWA-RAI-2026-000001",
  "tokenId": "10001",
  "contractId": "CTR-000001",
  "settlementId": "STL-000021"
}
```

---

# 19. Blockchain transaction schema

```json
{
  "operationId": "OP-000123",
  "businessObjectType": "SETTLEMENT",
  "businessObjectId": "STL-000021",
  "chainId": 11155111,
  "contractAddress": "0x...",
  "functionName": "settle",
  "txHash": "0x...",
  "submittedAt": "...",
  "status": "CONFIRMED",
  "blockNumber": 123456,
  "revertReason": null
}
```

---

# 20. Suggested PostgreSQL logical tables

Minimum tables/collections:

```text
participants
participant_accounts
credentials
credential_status_history
materials
recovery_assets
asset_token_bindings
evidence_items
evidence_manifests
evidence_manifest_items
attestations
claims
offers
commercial_contracts
settlements
settlement_conditions
beckn_mappings
blockchain_transactions
blockchain_events
audit_events
agent_delegations
agent_action_log
```

Use database UUIDs as technical primary keys if desired, but never expose them as canonical business IDs.

---

# 21. State synchronisation rules

### Ethereum authoritative

- ERC-1155 balances;
- original/minted token supply;
- asset escrow custody;
- dINR balances;
- settlement lifecycle once created on-chain;
- on-chain claim/attestation state;
- active eligibility projection used by contracts.

### Application authoritative

- private participant business details;
- source credential files;
- evidence files;
- operational notes;
- detailed offer negotiation history;
- UI preferences.

### Beckn authoritative only for protocol interaction context

- Beckn message/correlation context;
- catalogue/discovery representation;
- protocol transaction identifiers.

A Beckn catalogue quantity must never override live Ethereum availability.

---

# 22. Schema versioning

Every public/interchange object should include a `schemaVersion` where practical.

Rules:

- additive backward-compatible changes may remain within major version;
- breaking semantic changes require new major schema version;
- ERC-1155 metadata already pinned to IPFS must not be silently modified;
- new metadata versions should have new CIDs and explicit version references.

---

# 23. Data quality controls

Minimum controls:

- Participant ID uniqueness;
- Asset ID uniqueness;
- immutable Asset ID ↔ Token ID mapping;
- quantity unit consistency;
- tokenised quantity ≤ verified quantity;
- claim quantity ≤ eligible underlying quantity;
- settlement quantity ≤ seller live/unlocked token balance;
- evidence hash format validation;
- credential validity dates;
- DID/account binding consistency;
- no orphaned Beckn resource without canonical asset.

---

# 24. Definition of done

The canonical data model is ready for implementation when:

- every API object in `09_API_and_Service_Specification.md` maps to an entity here;
- every on-chain object has a canonical off-chain identifier mapping;
- public/private fields are classified;
- Ethereum/Beckn/application source-of-truth rules are explicit;
- example JSON payloads validate against the JSON Schemas to be generated in the implementation repository.
