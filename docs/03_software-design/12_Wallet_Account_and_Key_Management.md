# Finternet PoC — Wallet, Smart Account and Key Management Design

**Project:** Suma Finternet PoC — Tokenised Recovery Asset Demonstrator  
**Status:** Pack 3 — Software & Data Specification  
**Purpose:** Define how organisations and AI delegates safely control Ethereum accounts without exposing business users to raw cryptocurrency wallet operations.

---

## 1. Design principle

A Finternet participant is an organisation, not a private key.

The control stack is:

```text
Organisation
   ↓
Participant ID + did:web
   ↓
W3C Verifiable Credential
   ↓
ERC-4337 Smart Account
   ↓
Owner / Operator / Agent permissions
   ↓
Ethereum contracts
```

The smart account is the transaction account. Keys/signers are replaceable controllers of that account, not the organisation's permanent identity.

---

# 2. Frozen choices

| Topic | PoC choice |
|---|---|
| User-facing account | ERC-4337-style smart account |
| Organisation identity | Participant ID + `did:web` |
| Transaction network | Ethereum public testnet |
| Gas UX | gas sponsored/abstracted where practical |
| AI authority | bounded delegated/session authority |
| Master keys in LLM | prohibited |
| Admin signing | isolated from ordinary participant accounts |
| Private key storage | secure signer/KMS or controlled developer/demo wallet depending environment |

---

# 3. Account roles

Minimum accounts:

1. **Suma Network Admin Smart Account**
2. **Suma Treasury Account** for dINR mint/funding
3. **Credential Authority signing identity**
4. **Originator Smart Account**
5. **Buyer Smart Account**
6. **Processor Smart Account**
7. **Verifier Smart Account**
8. **Sponsor Smart Account** if included
9. **Attestation Service account** where service submission is required
10. **AI Agent delegated/session authority** attached to a participant smart account
11. **Contract deployer account** kept separate from ordinary admin operations where practical

Do not use one omnipotent key for deployer, credential authority, treasury, admin and participant actions.

---

# 4. Smart account model

Each organisation receives a smart account address.

Illustrative:

```text
Participant: ORG-BUYER-001
DID: did:web:...:ORG-BUYER-001
Smart Account: 0xB123...

Controllers:
- Owner signer
- Operations signer
- Optional AI session/delegation key
```

The PoC should use an established ERC-4337 account implementation/provider rather than writing a new account-abstraction stack from scratch.

---

# 5. Human signing roles

Recommended logical roles:

### Organisation Owner

Can:

- manage account controllers;
- grant/revoke operator authority;
- approve high-risk transactions;
- recover/rotate keys.

### Operations User

Can:

- execute normal PoC business actions;
- fund approved settlements;
- transfer eligible assets within policy;
- sign attestations if credentialled.

Cannot:

- change organisation identity;
- replace owner;
- grant unrestricted AI authority.

### Read-only User

Can inspect but not sign economic transactions.

---

# 6. AI delegated authority

AI agents must never receive unrestricted organisation owner keys.

Use a bounded delegation/session model.

Example policy:

```json
{
  "delegationId": "DEL-000001",
  "participantId": "ORG-BUYER-001",
  "delegateType": "AI_AGENT",
  "allowedActions": [
    "DISCOVER",
    "VERIFY_CREDENTIAL",
    "CREATE_OFFER_DRAFT",
    "CREATE_SETTLEMENT"
  ],
  "assetConstraints": {
    "materialCodes": ["PLASTIC-LDPE"],
    "maxQuantityKg": 2000
  },
  "financialConstraints": {
    "maxSingleTransaction": 50000,
    "maxCumulative": 100000,
    "currency": "dINR"
  },
  "counterpartyRule": "ACTIVE_CREDENTIALLED_ONLY",
  "validUntil": "2026-10-31T23:59:59Z",
  "requiresHumanApprovalForSettlement": true
}
```

The implementation can use smart-account session keys, modules or a PoC policy gateway depending the selected account-abstraction stack, but these semantics are mandatory.

---

# 7. Gas abstraction

Business users should not need test ETH or understand gas.

Preferred UX:

```text
User clicks "Confirm Purchase"
       ↓
Smart account constructs UserOperation
       ↓
Paymaster sponsors gas
       ↓
Bundler submits operation
       ↓
Ethereum execution
```

Required components for ERC-4337 operation:

- smart account implementation/factory;
- EntryPoint-compatible flow;
- Bundler service;
- optional Paymaster for gas sponsorship.

For PoC simplicity, these may be obtained through an account-abstraction infrastructure provider rather than self-hosted.

---

# 8. Key storage by environment

## Local development

Acceptable:

- deterministic local test keys;
- local chain accounts;
- `.env` only for disposable non-production keys;
- never commit secrets to Git.

## Shared test/demo

Preferred:

- cloud KMS/HSM-backed signing where supported;
- secure wallet/signing service;
- secrets manager;
- access logged and role controlled.

Browser extensions may be retained only as developer/test tooling, not the primary business-user UX.

---

# 9. Credential authority keys

The Credential Authority requires signing keys separate from Ethereum participant accounts.

Requirements:

- issuer DID identifies valid verification method;
- issuer signing key stored securely;
- key rotation process documented;
- old credentials remain verifiable according to DID/version/status rules;
- compromised key can be removed/revoked and affected credentials reissued where needed.

---

# 10. Contract administration keys

Solidity contracts use role-based access control.

Administrative Ethereum authority must be separated into roles such as:

- contract/network admin;
- participant admin;
- credential admin;
- treasury/minter;
- pauser/emergency role;
- attestation/claim administrators where required.

For the PoC, one Suma organisation may control several roles operationally, but separate addresses/roles should demonstrate production separation of duties.

---

# 11. Treasury model

`DemoINR.sol` treasury:

```text
Suma Treasury
   │
   ├── mint dINR to approved participant accounts
   ├── burn/reset demonstration balances
   └── no authority over participant ERC-1155 assets
```

Treasury does not act as buyer/seller in normal demo transactions.

---

# 12. Account onboarding flow

```text
1. Create Participant ID
2. Create/publish did:web
3. Validate onboarding information
4. Create/deploy smart account
5. Bind smart account to Participant ID
6. Issue Organisation/Network VC
7. Project eligibility on-chain
8. Fund gas abstraction/paymaster policy
9. Fund dINR if participant requires settlement balance
10. Activate application user access
```

All steps must be auditable.

---

# 13. Account rotation / recovery

The design must prove that wallet rotation does not destroy organisational identity.

Example:

```text
ORG-BUYER-001
DID remains unchanged

Old account: 0xOLD → DEACTIVATED
New account: 0xNEW → ACTIVE
```

Process:

1. authorised organisation/admin recovery request;
2. verify identity using agreed out-of-band controls;
3. update smart-account controller or account binding;
4. update Participant Registry;
5. update credential/account binding if necessary;
6. suspend old account eligibility;
7. audit event.

The PoC should test at least one simulated account rotation.

---

# 14. Signing UX

The application should present business actions, not blockchain jargon.

Prefer:

```text
"Reserve 500 kg for 10,000 dINR"
"Confirm receipt of 482 kg"
"Approve settlement"
```

Avoid exposing normal users to:

```text
approve(address,uint256)
safeTransferFrom(...)
gas limit
nonce
ABI
```

The Explorer can expose technical details for developers and auditors.

---

# 15. Transaction approval levels

Example PoC policy:

| Action | Operator | Owner | AI delegate |
|---|---:|---:|---:|
| Search/read | ✓ | ✓ | ✓ |
| Prepare offer | ✓ | ✓ | ✓ |
| Submit low-value offer | ✓ | ✓ | policy-dependent |
| Fund settlement | ✓ within limit | ✓ | bounded / approval |
| Transfer asset outside settlement | limited | ✓ | no |
| Issue credential | no | admin only | no |
| Change account controller | no | ✓ | no |
| Mint dINR | no | treasury | no |

---

# 16. Key rotation

Define rotation cadence/process for:

- DID issuer keys;
- API signing secrets;
- admin/deployer keys;
- participant controllers;
- AI session keys.

Session/delegation keys should be short lived compared with organisation owner keys.

---

# 17. Monitoring and alerts

Monitor:

- failed smart-account operations;
- unusual repeated signing attempts;
- revoked credential attempting transaction;
- AI delegate exceeding policy;
- admin-role changes;
- treasury mint/burn;
- smart-account controller changes;
- paymaster abuse;
- high-volume unexpected transactions.

---

# 18. Required external account/subscription choices

Pack 1 left vendors flexible. Implementation must choose:

### ERC-4337 infrastructure

Need either a managed or self-hosted:

- smart-account SDK/implementation;
- Bundler;
- Paymaster.

Evaluation criteria:

- Ethereum testnet support;
- ERC-4337 compatibility;
- session/delegation support;
- API/SDK maturity;
- exportability/no lock-in;
- pricing appropriate for PoC.

### Cloud KMS / Secrets Manager

Required for shared demo environment.

### Ethereum RPC provider

Required by smart accounts, indexer and backend.

No vendor is architecturally authoritative; the Ethereum contracts and organisation identity model must remain portable.

---

# 19. Minimum PoC tests

- onboard participant and create account;
- issue VC bound to participant/account;
- execute sponsored UserOperation;
- rotate account/controller;
- revoke eligibility and prove contract transaction fails;
- create short-lived AI delegation;
- prove AI action within limit succeeds;
- prove action outside limit is rejected;
- prove no LLM prompt/log contains master private key material.

---

# 20. Definition of done

The wallet/account layer succeeds when an ordinary business participant can complete the PoC without managing seed phrases or gas while an auditor can still trace every economic action to a credentialled participant, an authorised smart account and an explicit signer/delegation policy.
