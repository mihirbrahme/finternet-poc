# Finternet PoC — Security, Access and Trust Controls

**Project:** Suma Finternet PoC — Tokenised Recovery Asset Demonstrator  
**Status:** Pack 4 — Engineering & Operations  
**Purpose:** Define the security model across application access, organisational identity, credentials, Ethereum accounts, smart contracts, evidence, AI-agent authority and operational administration.

---

## 1. Security objective

The PoC must prove a Finternet transaction without collapsing trust into one central application login or one administrator key.

A transaction is valid only when the relevant controls independently agree:

```text
Application user authenticated
        ↓
User authorised for participant
        ↓
Participant active
        ↓
Credential valid
        ↓
Smart-account authority valid
        ↓
Smart-contract policy satisfied
        ↓
Asset / dINR state sufficient
        ↓
Required attestations valid
        ↓
Settlement permitted
```

No single application database flag should be capable of overriding Ethereum economic state.

---

# 2. Trust domains

The PoC contains distinct trust domains.

| Trust domain | What it proves | Primary mechanism |
|---|---|---|
| Application identity | Which human/service is calling | OIDC/OAuth2 + MFA where required |
| Organisation identity | Which organisation participates | Participant ID + `did:web` |
| Eligibility | What the organisation is permitted to do | W3C VC 2.0 + on-chain eligibility projection |
| Transaction authority | Who may sign for an organisation | ERC-4337 smart account controls |
| Economic state | Who owns/controls assets and money | Ethereum smart contracts |
| Physical-world fact | What happened outside Ethereum | Signed credentialled attestation |
| Evidence integrity | Whether referenced evidence changed | cryptographic hashes / manifests |
| Network interaction | What was discovered/offered/contracted | signed Beckn interactions + canonical IDs |
| AI authority | What an agent may autonomously do | bounded delegation/session policy |

These layers must remain conceptually and technically separate.

---

# 3. Application authentication

## 3.1 Human users

Use an OIDC-compatible identity provider.

Minimum controls:

- unique user account;
- password policy or federated login;
- MFA for network administrators, treasury users and credential issuers;
- short-lived access tokens;
- refresh-token controls;
- session termination;
- role membership linked to Participant ID;
- audit log for login and privileged actions.

## 3.2 Service identities

Backend services should authenticate using service credentials rather than shared human accounts.

Examples:

- Blockchain Adapter;
- Beckn Provider Node;
- Beckn Consumer Node;
- Attestation Service;
- AI Agent Gateway;
- Indexer;
- CI/CD deployment identity.

Use separate credentials by environment.

---

# 4. Application RBAC

Recommended logical roles:

### Network Administrator

Can:

- onboard participants;
- activate/suspend network participant records;
- initiate permitted registry administration;
- inspect system status.

Cannot automatically:

- spend participant funds;
- transfer participant-owned ERC-1155 balances;
- impersonate an organisation signer.

### Credential Administrator

Can:

- issue credentials;
- revoke/suspend credentials;
- update on-chain eligibility projections.

### Treasury Administrator

Can:

- mint/burn PoC dINR subject to contract role;
- fund approved participant demo balances.

Must be separate from ordinary participant operations.

### Participant Owner

Controls organisational smart-account administration.

### Participant Operator

Can conduct normal permitted transactions for that participant.

### Verifier / Attestor

Can submit only attestation types for which the organisation possesses a valid credential.

### Read-only / Auditor

Can inspect permitted records but cannot mutate economic state.

---

# 5. Organisational identity and credential controls

## 5.1 Identity binding

The following linkage must be explicit:

```text
Participant ID
    ↕
did:web
    ↕
W3C Credential subject
    ↕
ERC-4337 Smart Account
```

An Ethereum address alone is not accepted as organisational identity.

## 5.2 Credential verification

Before issuing or accepting a credential, verify:

- issuer is trusted for that credential type;
- credential signature/proof is valid;
- subject DID resolves correctly;
- credential status is active;
- validity period has not expired;
- participant is active;
- bound smart account matches permitted account mapping where required.

## 5.3 Hybrid on-chain enforcement

Full VCs stay off-chain. The minimum enforcement state is projected into `CredentialRegistry.sol`.

Illustrative projection:

```text
smartAccount
credentialClass
status
validUntil
participantIdHash/reference
```

Smart contracts check this projection so direct contract calls cannot bypass application-level credential rules.

---

# 6. Ethereum smart-account security

## 6.1 Account separation

Maintain separate accounts/authorities for:

- contract deployment;
- network administration;
- credential administration;
- dINR treasury/minter;
- originator;
- buyer;
- processor;
- verifier;
- attestation service where required;
- AI delegation.

Do not create one PoC super-key.

## 6.2 ERC-4337 controls

The user-facing transaction account is an ERC-4337-style smart account.

Smart-account policies should support:

- replaceable owner signer;
- operator delegation;
- optional multisignature/approval policy;
- bounded session/delegation keys;
- transaction limits;
- expiry;
- contract/function allowlists;
- emergency revocation.

## 6.3 Gas abstraction

Where a Paymaster is used:

- sponsor only approved contract calls;
- rate-limit sponsorship;
- cap gas per operation;
- prevent arbitrary public gas use;
- record participant and operation correlation ID.

---

# 7. Smart-contract access controls

Use explicit Solidity role separation. Prefer established access-control libraries rather than custom authentication logic.

Indicative roles:

| Contract | Key roles |
|---|---|
| `ParticipantRegistry.sol` | participant admin, pauser |
| `CredentialRegistry.sol` | credential admin, pauser |
| `RecoveryAsset.sol` | minter, asset admin, settlement engine, pauser |
| `DemoINR.sol` | treasury/minter, burner, pauser |
| `AttestationRegistry.sol` | authorised attestor / policy service, pauser |
| `ClaimRegistry.sol` | authorised claim issuer, claim admin, pauser |
| `SettlementEngine.sol` | participant callers + permitted service roles, pauser |

Critical rules:

- no arbitrary `mint` exposed to ordinary users;
- no arbitrary asset seizure by application backend;
- settlement engine can move only assets/funds deliberately escrowed or approved under defined rules;
- contract pause capability must not silently rewrite historical state;
- privileged contract actions emit events.

---

# 8. Asset-transfer security

Before an ERC-1155 recovery asset transfer/lock is accepted, verify:

1. sender holds sufficient units;
2. asset is active and transferable;
3. units are not already locked/retired;
4. recipient participant is active;
5. required credential class is active;
6. transaction quantity is within available quantity;
7. any settlement-specific restrictions are satisfied;
8. caller is authorised by the participant smart account or settlement flow.

The application UI may pre-check these rules, but the contract remains authoritative.

---

# 9. dINR controls

`dINR` is a sandbox programmable settlement token only.

Controls:

- minting restricted to Treasury role;
- participants can hold/transfer only when eligible according to PoC policy;
- no public purchase/redemption claim;
- no linkage implying actual bank deposits or CBDC;
- settlement contracts may escrow approved amounts;
- admin mint/burn events are transparent and auditable;
- participant demo balances can be reset between scripted environments only through documented administrative procedures.

No real money should be deposited into the PoC smart contracts.

---

# 10. Settlement security

The `SettlementEngine.sol` is a critical trust boundary.

Every settlement should bind:

- settlement ID;
- Beckn/commercial contract reference;
- ERC-1155 contract and token ID;
- exact quantity;
- seller smart account;
- buyer smart account;
- dINR amount or pricing rule;
- expiry;
- required attestation conditions;
- optional payout split rules.

Required controls:

### Double-lock prevention

The same asset units cannot back two active settlements.

### Funds sufficiency

Escrow cannot be considered funded until Ethereum confirms the dINR balance/transfer.

### Asset sufficiency

Asset lock cannot succeed when the seller does not control the requested units.

### Atomic finalisation

When final conditions are met, asset movement and dINR release occur within one smart-contract execution path so partial completion cannot leave one party settled and the other unsettled.

### Expiry/refund

Expired/unfulfilled settlements follow deterministic unlock/refund rules.

### Replay/idempotency

Application retries must not create duplicate settlement objects or duplicate transfers.

---

# 11. Attestation security

Physical-world events are not trusted merely because an API submitted them.

An accepted attestation should bind:

- attestation ID;
- asset/token ID;
- event type;
- quantity/value where applicable;
- attestor participant/DID;
- timestamp;
- evidence hash/manifest reference;
- digital signature/proof;
- transaction/context reference.

Validation checks:

1. attestor participant is active;
2. attestor has a valid credential for the attestation class;
3. signature/proof validates;
4. attestation relates to the correct token/settlement;
5. quantity/state transition is plausible under deterministic rules;
6. duplicate attestation cannot release payment twice;
7. evidence hash is immutable once referenced by a finalised attestation.

---

# 12. Evidence and privacy controls

Sensitive evidence remains outside public Ethereum.

Examples:

- photographs;
- weighbridge documents;
- invoices;
- contracts;
- personal data;
- GPS detail;
- regulatory documents.

Store these in secure object storage with:

- authenticated access;
- encryption in transit;
- encryption at rest;
- least-privilege bucket/object permissions;
- object versioning or immutable retention where appropriate;
- audit logs;
- malware/content validation where applicable.

Ethereum stores only hashes/references required for integrity and economic state.

---

# 13. Beckn interaction security

The Beckn layer must not be trusted as the source of economic state.

Controls:

- signed/verified network messages according to selected Beckn implementation profile;
- canonical request/context IDs;
- anti-replay handling;
- timestamp/TTL validation;
- schema validation;
- participant/network endpoint allowlisting for the controlled PoC where required;
- mapping from Beckn resource ID to canonical Asset ID and Ethereum token ID;
- live Ethereum re-check before contract finalisation.

A stale catalogue response must never guarantee that an asset remains available.

---

# 14. AI-agent security

The LLM itself receives no unrestricted private key.

Recommended model:

```text
LLM
 ↓
AI Agent Gateway
 ↓
Deterministic policy engine
 ↓
Bounded smart-account delegation/session key
 ↓
Permitted transaction
```

Policies should be explicit and machine-enforced.

Example:

```text
Allowed material: LDPE
Maximum quantity: 2,000 kg
Maximum single spend: 50,000 dINR
Counterparty: active credentialled participants only
Valid until: <timestamp>
Settlement: human approval required
```

The LLM may recommend/select within policy. Hard eligibility, balance and spending limits are not left to model judgment.

---

# 15. Secrets and key management

Never store secrets in source control.

Separate:

- application secrets;
- OIDC secrets;
- database credentials;
- Ethereum RPC keys;
- deployer key;
- admin signer keys;
- treasury signer keys;
- credential issuer keys;
- service signing keys;
- AI provider API keys.

Shared test/demo environment should use a cloud secrets manager and, where practical, KMS/HSM-backed signing or an isolated signing service.

Local disposable keys may be used only for local development.

---

# 16. Environment separation

At minimum maintain:

### Local

- disposable identities/keys;
- local EVM chain;
- mock/in-memory integrations allowed.

### Integration/Test

- shared services;
- non-public or controlled test endpoints;
- automated integration suites;
- no live partner/customer data unless explicitly approved.

### Public Demo

- Ethereum public testnet;
- stable demo participant identities;
- controlled PoC data;
- externally visible transaction hashes;
- no secrets or personal data on-chain.

Never reuse production-style private keys across environments.

---

# 17. Logging and audit

Every important operation should include a correlation ID linking:

```text
UI / agent request
    ↕
API request
    ↕
Beckn context/transaction ID
    ↕
application operation ID
    ↕
Ethereum transaction hash
    ↕
settlement / token / claim ID
```

Audit events should include:

- participant onboarding;
- credential issue/revoke;
- wallet/account binding;
- asset creation/mint;
- evidence upload/hash;
- attestation creation;
- catalogue publish/update;
- offer/contract activity;
- dINR mint/fund;
- settlement create/fund/lock/finalise/refund;
- claim create/consume;
- privileged admin action;
- AI tool invocation and approval.

Do not log private keys, bearer tokens or confidential evidence payloads.

---

# 18. Monitoring and alerting

Minimum technical alerts:

- failed blockchain transaction;
- repeated credential verification failures;
- indexer lag;
- Ethereum RPC outage;
- failed Beckn callback;
- inconsistent chain/database state;
- settlement stuck beyond threshold;
- insufficient Paymaster balance if used;
- unusual dINR mint action;
- privileged role change;
- repeated unauthorised contract call;
- failed evidence/object-storage access.

---

# 19. Smart-contract engineering controls

Before public-testnet demo:

- unit tests for every privileged and economic function;
- negative tests for unauthorised calls;
- reentrancy review where external token calls are made;
- checks-effects-interactions discipline where applicable;
- safe token transfer handling;
- invariant tests for supply, locks and settlement conservation;
- event coverage;
- role configuration review;
- no test/debug privileged backdoor in demo deployment;
- static analysis and dependency review;
- documented deployment addresses and bytecode/build provenance.

For a PoC, formal audit is not necessarily required, but the code should be built as if economic correctness matters.

---

# 20. Core security invariants

These should become automated tests in Pack 5.

1. Total active + locked + retired quantity can never exceed valid minted supply.
2. A participant cannot transfer an asset to an ineligible recipient.
3. A revoked/expired credential cannot authorise a new restricted action.
4. The same asset units cannot be locked in more than one active settlement.
5. A settlement cannot release more dINR than it holds/controls.
6. A finalised settlement cannot execute again.
7. A consumed claim cannot be consumed again.
8. A final attestation cannot be silently edited.
9. PostgreSQL/index projections cannot alter Ethereum ownership or settlement state.
10. AI authority cannot exceed deterministic delegation policy.
11. Admin suspension does not erase historical ledger/audit records.
12. No sensitive source evidence is written to the public chain.

---

# 21. Security acceptance for the PoC

The security design is acceptable when the demo can prove:

- identity and transaction authority are separate;
- credential revocation blocks a restricted transaction;
- direct smart-contract calls cannot bypass required eligibility;
- no participant requires possession of another participant's signing key;
- dINR mint authority is separate from buyer/seller accounts;
- a physical attestation cannot be accepted from an unauthorised participant;
- failed settlement conditions refund/unlock deterministically;
- every economic transaction is traceable from application request to Ethereum transaction;
- AI-agent execution is bounded and auditable;
- public-chain data contains no sensitive operational documents.

