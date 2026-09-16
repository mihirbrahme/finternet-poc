# 18 — Demo Runbook
## Finternet PoC — Executive and Technical Demonstration

## 1. Purpose

This runbook defines the exact live demonstration sequence for the Finternet PoC.

The demo should not be presented as a blockchain demo or a waste-management application demo.

It should demonstrate:

> A real-world economic asset can be verified, represented digitally, discovered across an open network, acquired by an independent participant and settled programmatically using trusted identity and tokenised value.

Target live-demo duration: approximately 15–20 minutes, excluding technical Q&A.

---

## 2. Demo Story

Use one simple transaction throughout.

### Asset

1,000 kg verified LDPE recovery lot.

For the Aamhi-grounded demo, describe this as a rural/coastal non-biodegradable waste recovery lot from Raigad, Maharashtra. If OBP is mentioned, describe the output as an **OBP-ready evidence claim**, not an official OBP credit, unless an authorised certification or registry integration is connected.

### Seller / Originator

Aamhi.

### Buyer

Independent Buyer Organisation.

### Processor / Attestor

Credentialled Recycler/Processor.

### Transaction

Buyer acquires 500 kg for:

**10,000 dINR**

### Final result

- 500 ERC-1155 units transferred to Buyer;
- 10,000 dINR transferred to Seller;
- receipt attestation linked;
- full transaction independently verifiable.

---

## 3. Pre-Demo Checklist

### Infrastructure

Confirm:

- public demo environment available;
- Ethereum testnet RPC healthy;
- contracts deployed;
- chain indexer synchronized;
- PostgreSQL healthy;
- object storage accessible;
- IPFS gateway accessible;
- Beckn catalogue/discovery services healthy;
- AI-agent service healthy;
- explorer available.

### Participants

Confirm demo accounts for:

- network admin;
- Aamhi;
- Buyer;
- Recycler/Processor;
- Verifier;
- AI Agent.

### Identity

Confirm each required participant has:

- Participant ID;
- `did:web`;
- valid VC;
- smart-account address.

### Balances

Confirm:

- Aamhi owns 1,000 ERC-1155 units after mint stage or demo is ready to mint them live;
- Buyer has sufficient dINR;
- relevant smart accounts can execute transactions;
- Paymaster/testnet gas sponsorship is funded if used.

### Evidence

Prepare:

- sample collection record;
- sample weighment slip;
- sample recovery photo;
- processor receipt;
- receipt quantity = 500 kg for the clean happy-path demo.

### Browser tabs

Prepare:

1. Suma Admin / Identity Console
2. Aamhi Console
3. Independent Buyer App
4. Processor/Verifier Console
5. Suma Finternet Explorer
6. Public Ethereum block explorer

---

## 4. Demo Sequence

## Scene 1 — Trusted Participants

### Screen

Admin / Identity Console.

Show:

- Aamhi Participant ID;
- Aamhi DID;
- smart account;
- Recovery Originator VC;
- Buyer DID and Buyer credential;
- Processor credential.

### Explain

The blockchain address by itself is not treated as identity.

The system knows:

- which organisation controls the account;
- what role it has;
- which credentials it holds;
- whether those credentials are currently valid.

### Finternet capability demonstrated

**Digital identity + machine-verifiable trust.**

---

## Scene 2 — Real-World Asset Creation

### Screen

Aamhi Console.

Create/select recovery record:

- material: LDPE;
- quantity: 1,000 kg;
- origin: Raigad;
- originator: Aamhi;
- verification status;
- evidence.

Show evidence upload and generated hashes.

### Explain

Documents stay off-chain; hashes and authoritative economic references can be anchored to the ledger.

---

## Scene 3 — Verification and Tokenisation

### Screen

Verifier Console followed by explorer.

Verifier signs attestation.

Trigger asset mint.

Expected result:

```text
RecoveryAsset.sol
Token ID: 10001
Supply: 1,000
Unit: 1 kg
Owner balance: Aamhi = 1,000
```

Open public block explorer and show the actual transaction.

### Finternet capability demonstrated

**Real-world asset → verifiable on-chain economic representation.**

---

## Scene 4 — Open Discovery

### Important

Move to the **Independent Buyer App**.

This app must not rely on the Aamhi application database.

### Action

Search:

> Verified LDPE in Maharashtra / Raigad, minimum 500 kg.

Beckn discovery returns the Aamhi opportunity.

Show:

- asset description;
- quantity;
- originator;
- credential status;
- token contract;
- token ID;
- indicative terms.

### Explain

Discovery and economic ownership are deliberately separated.

Beckn answers:

> What exists and how can I interact with it?

Ethereum answers:

> Who currently controls the economic asset and what is its live state?

### Finternet capability demonstrated

**Open discovery + interoperability.**

---

## Scene 5 — Independent Verification

Buyer App validates:

- seller credential;
- token existence;
- token balance;
- quantity available;
- token state;
- evidence hash/reference.

Show that the Buyer App reads Ethereum independently.

### Finternet capability demonstrated

**Independent verifiability without trusting the seller's internal system.**

---

## Scene 6 — Contracting

Buyer chooses:

**500 kg**

Commercial consideration:

**10,000 dINR**

Create/confirm Beckn contract.

Show linkage:

```text
Beckn Contract ID
CTR-001

↕

Settlement ID
SET-001
```

### Finternet capability demonstrated

**Open-network contracting linked to programmable execution.**

---

## Scene 7 — Programmable Money

Show Buyer smart-account balance.

Example:

```text
Buyer dINR balance: 50,000
Transaction requirement: 10,000
```

Buyer approves/funds settlement.

Show:

```text
Buyer → SettlementEngine
10,000 dINR locked
```

### Explain

dINR is PoC settlement value, not legal tender or CBDC.

The purpose is to show what happens when money becomes programmable and can participate directly in transaction logic.

---

## Scene 8 — Asset Lock

Aamhi locks:

**500 ERC-1155 units**

into settlement.

Show:

```text
Aamhi total: 1,000
Locked: 500
Freely available: 500
```

Attempting to sell the locked 500 again would fail.

### Finternet capability demonstrated

**Programmable asset control and double-sale prevention.**

---

## Scene 9 — Physical Fulfilment

Switch to Processor/Verifier interface.

Confirm:

- material received;
- quantity = 500 kg;
- evidence uploaded;
- signed processor attestation created.

Show attestation ID and evidence hash.

### Explain

The blockchain cannot observe the physical world itself.

A credentialled participant makes a signed assertion, and the system verifies who made it and whether they had authority to make it.

### Finternet capability demonstrated

**Trusted physical-to-digital bridge.**

---

## Scene 10 — Atomic Settlement

SettlementEngine checks:

- buyer eligibility;
- seller eligibility;
- asset lock;
- money lock;
- receipt attestation;
- quantity;
- transaction status.

Execute settlement.

Expected result:

```text
500 ERC-1155 units → Buyer
10,000 dINR → Aamhi
```

Show both final balances.

Open Ethereum explorer and show settlement transaction/events.

### Finternet capability demonstrated

**Programmable and atomic Delivery-versus-Payment.**

---

## Scene 11 — Rights and Claims

Show Claim Registry / explorer.

Demonstrate a processing/recovery claim linked to the root asset.

For the Aamhi scenario, also show an `OBP_READY_RECOVERY_CLAIM` where the evidence package supports later certification or sponsor reporting. The UI must make clear that this is evidence-backed and quantity-bounded, but not official government/EPR/OBP credit issuance.

Explain:

- the asset is not the same as the claim;
- processing evidence is not the same as regulatory EPR entitlement;
- sponsor attribution can be separate;
- each right can have its own lifecycle and anti-double-counting rules.

### Finternet capability demonstrated

**Composable economic rights without collapsing different rights into one token.**

---

## Scene 12 — AI Agent

Use the buyer AI interface.

Prompt example:

> Find verified LDPE assets of at least 250 kg from eligible sellers under the configured price threshold.

Agent should:

1. call Beckn discovery;
2. verify credentials;
3. inspect token state;
4. evaluate deterministic constraints;
5. return a shortlist;
6. prepare a transaction.

Then show the agent's bounded authority.

Example:

```text
Max transaction: 50,000 dINR
Material: LDPE only
Counterparty: credentialled only
Expiry: 24 hours
```

Do not allow unrestricted agent access to private keys.

### Finternet capability demonstrated

**AI-native economic participation with programmable authority.**

---

## 5. Negative Demo Option

If time permits, show one intentional failure.

Recommended:

### Revoked Processor Credential

Revoke processor eligibility and attempt a restricted transaction or attestation.

Expected:

**Rejected.**

This reinforces that blockchain ownership alone does not provide economic authorization.

Alternative negative demo:

- stale Beckn catalogue says 500 kg available;
- chain says asset is already locked;
- transaction fails/reconciles.

---

## 6. Final Screen

Use the Finternet Explorer to show one connected transaction graph:

```text
Organisation DID / VC
        ↓
Recovery Asset
        ↓
ERC-1155 Token
        ↓
Beckn Contract
        ↓
Settlement
   ↙          ↘
500 RWA      10,000 dINR
   ↓             ↓
Buyer          Aamhi
        ↑
Physical Receipt Attestation
```

---

## 7. Closing Message

The technical conclusion should be concise:

> A physical economic asset was converted into a verifiable digital asset, published into an open discovery network, independently verified by another application, contracted for by credentialled parties and exchanged against programmable value using conditional atomic settlement.

Then explain that the same technical primitives can be reused for other real-world assets such as equipment, receivables, logistics assets, agricultural assets and other tokenisable economic rights.

Do not use the demo to make unsupported regulatory or legal claims.

---

## 8. Demo Reset Procedure

Before every major demo, provide a reset script that can:

- create fresh participant accounts if required;
- mint fresh test dINR;
- create/mint fresh recovery lot;
- republish Beckn catalogue;
- clear/expire old settlement records where appropriate;
- create known starting balances;
- verify all credentials are active;
- verify contract addresses and environment configuration.

Avoid manually editing databases to create demo state.

The reset itself should use supported service/admin operations so the environment remains auditable and reproducible.
