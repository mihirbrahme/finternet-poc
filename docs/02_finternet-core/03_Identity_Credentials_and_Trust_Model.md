# Finternet PoC — Identity, Credentials and Trust Model

**Project:** Suma Finternet PoC — Tokenised Recovery Asset Demonstrator  
**Status:** Pack 2 — Core Specification  
**Purpose:** Define how organisations, accounts, credentials, permissions and trust assertions are represented and enforced across the PoC.

---

## 1. Objective

The PoC must prove that blockchain accounts can participate in economic transactions **without treating a wallet address as sufficient identity**.

The trust stack is:

```text
Legal / business organisation
        ↓
Suma Participant ID
        ↓
did:web organisational DID
        ↓
W3C Verifiable Credentials 2.0
        ↓
Ethereum ERC-4337 Smart Account
        ↓
On-chain eligibility / policy checks
```

This allows the network to answer three separate questions:

1. **Who is this participant?** — DID and organisation record.
2. **What is the participant authorised or qualified to do?** — Verifiable Credential.
3. **Which Ethereum account may act for the participant?** — wallet/account binding.

---

## 2. Frozen design choices

| Topic | Choice |
|---|---|
| Organisation identifier | Suma-assigned canonical Participant ID |
| DID method | `did:web` |
| Credential standard | W3C Verifiable Credentials Data Model 2.0 |
| Wallet model | ERC-4337-style smart account |
| Credential payload | Off-chain |
| Eligibility enforcement | Hybrid: off-chain VC verification + on-chain status/policy |
| Credential issuer | Suma PoC Credential Authority |
| Credential holder | Participating organisation |
| Credential verifier | Suma services, buyer apps, policy service and smart-contract-facing verifier |
| Wallet binding | Explicit VC/participant registry association |
| Revocation/status | Off-chain credential status plus on-chain eligibility state |

---

## 3. Participant roles

Minimum PoC roles:

- `NETWORK_ADMIN`
- `RECOVERY_ORIGINATOR`
- `BUYER`
- `PROCESSOR`
- `SPONSOR`
- `VERIFIER`
- `ATTESTATION_SERVICE`
- `AI_AGENT_DELEGATE`

One organisation may possess more than one role if explicitly credentialled.

A role is **not inferred** from an Ethereum address.

---

## 4. Canonical participant identity

Every organisation receives a canonical identifier.

Example:

```text
Participant ID: ORG-AAMHI-001
Organisation:   Project Aamhi
DID:            did:web:finternet-poc.sumasoft.com:participants:ORG-AAMHI-001
Smart Account:  0xA1B2...
Status:         ACTIVE
```

The Participant ID is the cross-system reference used by:

- PostgreSQL;
- credentials;
- Beckn participant configuration;
- smart-account mapping;
- ERC-1155 asset metadata;
- claims;
- attestations;
- settlements;
- audit logs.

The Participant ID must not change when a wallet key changes.

---

## 5. `did:web` structure

Recommended DID pattern:

```text
did:web:finternet-poc.sumasoft.com:participants:<participant-id>
```

Example DID document should expose:

- DID controller;
- verification method(s);
- authentication key(s);
- assertion method(s);
- optional service endpoints;
- credential/status endpoints where relevant.

### Why `did:web`

For this PoC it gives:

- clear organisational ownership through HTTPS/domain control;
- simple DID resolution;
- separation of identity from Ethereum keys;
- straightforward key rotation;
- easy demonstration to enterprise stakeholders;
- no dependency on a proprietary DID ledger.

---

## 6. Credential types

### 6.1 OrganisationCredential

Confirms that the subject represents an onboarded organisation.

Minimum claims:

- participant ID;
- legal/operating name;
- organisation type;
- registration reference;
- jurisdiction;
- DID;
- status;
- issuance date;
- expiry where applicable.

### 6.2 NetworkParticipantCredential

Confirms that the organisation may participate in the PoC network.

Claims:

- participant ID;
- network ID;
- permitted network roles;
- validity period;
- smart-account binding.

### 6.3 RecoveryOriginatorCredential

Claims may include:

- permitted material classes;
- operating geography;
- recovery-originator role;
- programme/reference details.

### 6.4 ProcessorCredential

Claims may include:

- processor role;
- permitted material categories;
- registration reference;
- facility identifier;
- operating geography;
- validity period.

### 6.5 VerifierCredential

Claims:

- verification role;
- authorised attestation types;
- organisation/facility reference;
- validity period.

### 6.6 SponsorCredential

Used where sponsor-funded recovery is included.

### 6.7 AgentDelegationCredential / delegated authority record

Represents bounded machine authority associated with an organisation's smart account.

This is not the same as an organisation credential.

---

## 7. Credential structure

Illustrative credential:

```json
{
  "@context": ["https://www.w3.org/ns/credentials/v2"],
  "type": ["VerifiableCredential", "ProcessorCredential"],
  "issuer": "did:web:finternet-poc.sumasoft.com:issuer",
  "validFrom": "2026-10-01T00:00:00Z",
  "validUntil": "2027-03-31T23:59:59Z",
  "credentialSubject": {
    "id": "did:web:finternet-poc.sumasoft.com:participants:ORG-RECYCLER-001",
    "participantId": "ORG-RECYCLER-001",
    "role": "PROCESSOR",
    "materialClasses": ["LDPE"],
    "ethereumSmartAccount": "0x1234...",
    "registrationReference": "PROC-REG-001"
  }
}
```

The precise proof mechanism will be selected during implementation, but the data model must remain VC 2.0 compatible.

---

## 8. Credential lifecycle

```text
Participant application
      ↓
Manual / API verification
      ↓
Participant record created
      ↓
DID created/resolved
      ↓
Smart account assigned
      ↓
Credential issued
      ↓
Credential activated
      ↓
Used for discovery/transaction eligibility
      ↓
renew / suspend / revoke / expire
```

Credential states:

- `PENDING`
- `ACTIVE`
- `SUSPENDED`
- `REVOKED`
- `EXPIRED`

---

## 9. Hybrid credential enforcement

The full VC does **not** need to be placed on Ethereum.

### Off-chain layer

Stores/verifies:

- credential document;
- cryptographic proof;
- issuer;
- complete claims;
- registration evidence;
- supporting documents.

### On-chain layer

Stores only transaction-critical eligibility information, for example:

```text
smartAccount → participantId
smartAccount → role → active/inactive
smartAccount → materialClass → eligible/not eligible
smartAccount → credentialExpiry
```

The smart contract therefore does not rely exclusively on the frontend/backend to prevent an invalid transfer.

---

## 10. On-chain policy example

Before transferring a Recovery Asset Token to a processor:

```text
RecoveryAsset.safeTransferFrom(...)
            ↓
CredentialRegistry.isEligible(receiver, PROCESSOR, materialClass)
            ↓
TRUE  → allow transfer
FALSE → revert
```

Example policy rules:

- sender must be an active participant;
- recipient must be an active participant;
- recipient must have a permitted role for the transaction;
- credential must not be expired/suspended;
- material-category permission must match where applicable;
- asset must not be settlement-locked.

---

## 11. Smart accounts

Each participating organisation receives an ERC-4337-style smart account rather than exposing crypto wallet complexity directly to end users.

A smart account should support:

- organisation owner/admin signer;
- operational signer(s);
- optional multi-approval policy;
- sponsored gas/paymaster if implemented;
- temporary session keys;
- bounded AI-agent permissions;
- key rotation/recovery procedures.

The smart account address is the account that:

- holds ERC-1155 assets;
- holds dINR;
- locks assets into settlement;
- receives settlement;
- signs/executes relevant Ethereum transactions.

---

## 12. AI agent authority

The AI agent must never hold unrestricted organisation authority.

Example delegation:

```text
Delegate: AGENT-BUYER-001
Parent Smart Account: 0xBUYER...
Valid Until: 2026-10-15T18:00Z
Maximum Transaction Value: 50,000 dINR
Allowed Assets: LDPE recovery assets
Allowed Counterparties: credentialled network participants only
Allowed Functions:
  - prepareOffer
  - initiateSettlement
  - fundSettlement up to limit
Forbidden:
  - change owner
  - issue credentials
  - withdraw unrestricted funds
  - change policy
```

Human approval may remain mandatory in the first demonstrator while this bounded authority is still represented in the architecture.

---

## 13. Trust anchors

For the PoC the primary trust anchors are:

1. **Suma PoC Credential Authority** — participant and role credential issuance.
2. **Participant-controlled DID endpoints** — identity resolution.
3. **Ethereum public testnet** — shared economic state and transaction history.
4. **Credentialled verifiers/processors** — physical-world attestations.
5. **Beckn network identities/signatures** — open-network message integrity.

The PoC must clearly distinguish these trust domains.

---

## 14. Required data inputs

For each participant:

- organisation name;
- legal/operating name;
- organisation type;
- registration number/reference;
- jurisdiction;
- authorised representative;
- email/phone;
- network role(s);
- material permissions where applicable;
- relevant licence/registration references;
- validity dates;
- Ethereum smart-account address;
- DID document configuration.

For PoC purposes, regulatory credentials may be manually verified and then represented digitally.

---

## 15. Interfaces to be built

### Credential administration

- onboard participant;
- review participant;
- create DID configuration;
- issue credential;
- suspend credential;
- revoke credential;
- renew credential;
- inspect status.

### Verification interface

Input:

- VC or participant ID;
- required role;
- optional material category.

Output:

- valid/invalid;
- status;
- expiry;
- relevant permission claims;
- corresponding smart account.

### On-chain eligibility interface

Smart contracts query a minimal `CredentialRegistry`/policy interface.

---

## 16. Security rules

- DID/private signing keys must not be stored in source code.
- Credential-issuer keys must be held separately from blockchain admin keys.
- Credential issuance must be auditable.
- Revocation/suspension changes must propagate to on-chain policy state.
- Smart-account owner recovery must require privileged workflow.
- AI-agent session keys must expire and remain capability-limited.
- One compromised credential must not automatically compromise blockchain funds.

---

## 17. Acceptance criteria

Identity/trust capability is accepted when:

1. Two independent organisations can resolve each other's DIDs.
2. A VC can be issued, presented and cryptographically verified.
3. An Ethereum smart account is bound to the participant identity.
4. An eligible account can receive a restricted recovery token.
5. An ineligible/suspended account is rejected by the smart contract.
6. A credential can be revoked/suspended and the on-chain eligibility state updates.
7. The buyer application can verify participant eligibility without querying the originator's private database.

---

## 18. Standards baseline

- W3C Verifiable Credentials Data Model 2.0 — W3C Recommendation, 15 May 2025.
- DID method selected for PoC: `did:web`.
- Ethereum account abstraction: ERC-4337-style smart accounts.

This file defines the trust semantics. Detailed API schemas will be created in Pack 3.
