# Finternet PoC — Programmable Money / dINR Model

**Project:** Suma Finternet PoC — Tokenised Recovery Asset Demonstrator  
**Status:** Pack 2 — Core Specification  
**Purpose:** Define the PoC settlement token used to demonstrate programmable money, escrow, payment conditions and atomic Delivery-versus-Payment.

---

## 1. Objective

The PoC needs a tokenised settlement asset so that the demonstration proves more than blockchain-based asset transfer.

`dINR` is a **sandbox programmable-value token** used solely to demonstrate Finternet settlement behaviour.

It allows:

- payment balances;
- escrow;
- conditional release;
- refunds;
- multi-party payment splits;
- atomic exchange against ERC-1155 recovery assets.

---

## 2. What dINR is not

The PoC must state clearly that dINR is **not**:

- Indian legal tender;
- an RBI CBDC;
- a commercial-bank deposit;
- a regulated stablecoin;
- a redeemable claim on Suma;
- offered to the public;
- an investment product.

It is an internal PoC settlement instrument.

---

## 3. Frozen design choices

| Topic | Choice |
|---|---|
| Standard | ERC-20-style Solidity token |
| Symbol | `dINR` |
| PoC accounting convention | 1 dINR represents 1 INR-equivalent unit for demonstration calculations |
| Issuer | Suma PoC Administrator / Treasury role |
| Holders | Credentialled PoC participants only |
| Public trading | Not permitted/intended |
| Minting | Administrator-controlled |
| Burning | Administrator-controlled and/or controlled reset workflow |
| Settlement | Through `SettlementEngine.sol` |
| Network | Same Ethereum public testnet as ERC-1155 asset |

---

## 4. Why a permissioned ERC-20 model

A plain unrestricted ERC-20 would demonstrate token transfer but would poorly represent how regulated money is likely to behave.

The PoC should therefore include policy controls such as:

- only active PoC participants may hold/receive dINR;
- administrator can mint test balances;
- administrator can pause token in emergency;
- settlement engine is an approved spender/escrow participant;
- direct public exchange/trading is outside scope.

This demonstrates programmable money on public infrastructure while preserving an enterprise/regulated design posture.

---

## 5. Participant funding model

Before the demo, the Suma treasury account mints/funds participant balances.

Example:

```text
Suma Treasury      1,000,000 dINR
Buyer A              100,000 dINR
Sponsor A             50,000 dINR
Recovery Originator        0 dINR
```

The balances have no real-world redemption promise.

---

## 6. Core token operations

Required functions/capabilities:

- mint;
- burn;
- balance query;
- transfer;
- approval/allowance or settlement-engine transfer pattern;
- pause/unpause;
- holder eligibility check;
- treasury/admin role management.

Use OpenZeppelin patterns wherever possible.

---

## 7. Settlement usage

Example acquisition:

```text
Asset:      Token 10001 × 500 units
Price:      20 dINR per kg
Payment:    10,000 dINR
```

Buyer funds settlement:

```text
Buyer Smart Account
      ↓ 10,000 dINR
SettlementEngine
```

Seller locks:

```text
500 × ERC-1155 Token 10001
      ↓
SettlementEngine
```

On fulfilment:

```text
500 asset units → Buyer
10,000 dINR      → Seller
```

If required conditions fail:

```text
500 asset units → Seller
10,000 dINR      → Buyer
```

---

## 8. Programmability patterns to demonstrate

### Pattern A — Atomic DvP

All-or-nothing asset-versus-payment exchange.

### Pattern B — Conditional DvP

Settlement only after approved receipt attestation.

### Pattern C — Quantity-adjusted settlement

If 1,000 kg is contracted but 982 kg is accepted:

```text
final payment = 982 × agreed unit price
```

Rules must define tolerance and maximum payable quantity.

### Pattern D — Milestone payment

Illustrative:

```text
10% on reservation
20% on dispatch attestation
70% on accepted receipt
```

### Pattern E — Multi-party distribution

Illustrative:

```text
20,000 dINR total
18,000 → Originator
 1,000 → Logistics participant
 1,000 → Verification participant
```

At least two patterns should be demonstrated live; the contract should be designed so all five can be tested.

---

## 9. Eligibility policy

A dINR transfer should require:

- sender is permitted/active, except treasury administrative operations;
- recipient is permitted/active;
- token not paused;
- settlement engine interaction is authorised;
- sufficient balance/allowance.

The credential/policy registry should be reused rather than building a separate identity system for dINR.

---

## 10. Smart account integration

Business users should never need to manually handle ERC-20 approvals in a raw crypto interface.

The application/smart-account layer should abstract:

- approve;
- deposit;
- escrow funding;
- settlement confirmation;
- refund receipt.

For an AI-agent scenario, spending authority must be bounded by smart-account policy.

---

## 11. Ledger/accounting model

Ethereum is authoritative for dINR balances.

PostgreSQL may maintain a read-optimised mirror for:

- user dashboards;
- transaction search;
- reporting;
- reconciliation;
- analytics.

Any mismatch must reconcile back to chain state.

---

## 12. Demo reset

Because this is a PoC, environments need a controlled reset procedure.

Possible mechanisms:

- new deployment per major demo cycle;
- controlled burn and remint;
- local/dev chain reset;
- fresh participant accounts in test environment.

Public-testnet transaction history cannot be erased; the runbook should distinguish current demo deployment from previous versions.

---

## 13. Security controls

- minting restricted to treasury/admin role;
- pause restricted to emergency admin role;
- admin keys separated from ordinary participant keys;
- no private keys in code repositories;
- settlement engine address explicitly configured;
- integer arithmetic and decimal handling tested;
- reentrancy and approval risks reviewed;
- token contract unit/integration tests required.

---

## 14. Acceptance criteria

The programmable-money capability is accepted when:

1. admin can mint dINR to a credentialled buyer;
2. an unapproved account cannot receive dINR if holder restrictions are enabled;
3. buyer can fund a settlement without raw-contract interaction;
4. dINR can be escrowed;
5. successful settlement releases correct amount;
6. failed settlement refunds correct amount;
7. quantity-adjusted settlement computes correct payment;
8. multi-party split can be executed and independently observed on-chain;
9. explorer/dashboard reflects the authoritative Ethereum balances.
