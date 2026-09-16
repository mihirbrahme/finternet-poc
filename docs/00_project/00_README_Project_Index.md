# Finternet PoC — Project Index

**Project:** Suma Finternet PoC — Tokenised Recovery Asset Demonstrator  
**Status:** Pack 1 — Foundation Baseline  
**Purpose:** Master index and design baseline for the PoC build.

---

## 1. What this PoC is

This PoC is an end-to-end Finternet capability demonstrator built around a real-world recovery asset.

The PoC will demonstrate that an independently operated participant can:

1. establish a verifiable digital identity;
2. receive machine-verifiable credentials;
3. create and verify a real-world asset record;
4. tokenise the verified asset on Ethereum;
5. publish the asset into an open discovery network;
6. allow another participant or AI agent to discover it;
7. verify participant eligibility and token state;
8. agree commercial terms;
9. lock programmable money and the asset;
10. use trusted real-world attestations as settlement conditions;
11. execute programmable Delivery-versus-Payment;
12. create downstream claims without double counting; and
13. independently inspect the resulting transaction trail.

The recovery use case is the first demonstrator. The reusable objective is broader: prove a technical pattern for **identity + tokenisation + open discovery + programmable rights + programmable money + attestation + atomic settlement + AI agents**.

---

## 2. Frozen design choices

The following choices are approved as the baseline for Pack 1 and should not be changed casually in downstream documents.

| Capability | Selected choice |
|---|---|
| Public programmable ledger | Ethereum public testnet |
| Smart contracts | Solidity |
| RWA token standard | ERC-1155 |
| Settlement token | ERC-20-style permissioned Demo INR (`dINR`) |
| Smart account model | ERC-4337-style account abstraction |
| Organisational identity | `did:web` |
| Verifiable credentials | W3C Verifiable Credentials Data Model 2.0 |
| Credential enforcement | Hybrid: off-chain VC + minimum on-chain eligibility/status |
| Open discovery / interaction | Beckn Protocol v2.0 |
| Asset metadata | IPFS for non-sensitive metadata |
| Sensitive documents/evidence | S3-compatible object storage / MinIO |
| Application database | PostgreSQL |
| Real-world event bridge | Signed, credentialled attestations |
| Claims strategy | Claims/attestations first; tokenise derived rights only if independent transferability is required |
| Backend style | API-first services |
| Frontend | React / Next.js-style web applications |
| Observability | OpenTelemetry + Prometheus + Grafana |
| Source control | GitHub |

---

## 3. Finternet capability map

The PoC is intentionally designed around the following technical primitives.

```text
IDENTITY
  ↓
TRUST / CREDENTIALS
  ↓
CANONICAL ASSET REPRESENTATION
  ↓
TOKENISATION
  ↓
OPEN DISCOVERY
  ↓
CONTRACTING
  ↓
PROGRAMMABLE MONEY
  ↓
PROGRAMMABLE / ATOMIC SETTLEMENT
  ↑
REAL-WORLD ATTESTATIONS
  ↓
CLAIMS / DERIVED RIGHTS
  ↓
INTEROPERABILITY + AI AGENTS
```

Every major component in the PoC must map to at least one of these primitives.

---

## 4. Core transaction to be proven

The minimum complete PoC transaction is:

```text
Participant onboarding
        ↓
DID + VC + Smart Account
        ↓
Physical recovery asset created
        ↓
Evidence captured
        ↓
Credentialled verification
        ↓
ERC-1155 asset minted on Ethereum
        ↓
Asset published through Beckn catalog
        ↓
Independent buyer / AI agent discovers it
        ↓
Buyer credentials + eligibility verified
        ↓
Terms agreed
        ↓
ERC-1155 asset locked
        ↓
dINR locked in settlement contract
        ↓
Physical fulfilment occurs
        ↓
Credentialled receipt attestation submitted
        ↓
Settlement conditions evaluated
        ↓
ERC-1155 asset → buyer
AND
ERC-20 dINR → seller
        ↓
Claims / attestations recorded
        ↓
Transaction closed and independently inspectable
```

---

## 5. Important PoC boundaries

### 5.1 dINR is not money issued by a regulated monetary authority

`dINR` is a sandbox settlement token used only to demonstrate programmable settlement. It must not be represented as:

- Indian legal tender;
- RBI CBDC;
- a bank deposit;
- a regulated stablecoin;
- redeemable INR;
- an investment product.

### 5.2 ERC-1155 transfer is a PoC economic/contractual entitlement

The token is a digitally recognised, transferable contractual/economic entitlement associated with a verified recovery lot. The PoC must not casually assert that Ethereum token ownership automatically determines legal title under applicable property law.

### 5.3 EPR or other regulatory certificates are not created by this PoC

Official regulatory rights remain with authoritative systems. The PoC may reference, reconcile or attach evidence of those outcomes.

### 5.4 Not all data belongs on Ethereum

Personally identifiable information, confidential pricing, detailed contracts, private evidence and regulatory documents remain off-chain. Ethereum stores only the minimum data required for ownership, transaction state, claims, hashes and settlement.

---

## 6. Participant types for the PoC

Minimum roles:

- Network Administrator / Suma;
- Recovery Originator;
- Recycler / Processor;
- Buyer / Producer;
- Verifier;
- Sponsor or funding participant if included in the demonstration;
- Attestation/oracle service;
- AI agent service account.

Each business participant receives:

- Participant ID;
- `did:web` identity;
- W3C VC(s);
- Ethereum smart account;
- application account/login;
- role and transaction permissions.

---

## 7. Pack-based documentation plan

### Pack 1 — Foundation

1. `00_README_Project_Index.md`
2. `01_Project_Build_Plan.md`
3. `02_Finternet_Technical_Architecture.md`

### Pack 2 — Finternet Core

4. `03_Identity_Credentials_and_Trust_Model.md`
5. `04_Recovery_Asset_and_ERC1155_Token_Model.md`
6. `05_Programmable_Money_dINR_Model.md`
7. `06_Smart_Contract_Specifications.md`
8. `07_Rights_Claims_and_Attestation_Model.md`
9. `08_Beckn_Discovery_and_Contracting_Model.md`

### Pack 3 — Software and Data

10. `09_API_and_Service_Specification.md`
11. `10_Data_Model_and_Schemas.md`
12. `11_OnChain_OffChain_Data_Design.md`
13. `12_Wallet_Account_and_Key_Management.md`
14. `13_AI_Agent_Design.md`

### Pack 4 — Engineering and Operations

15. `14_Security_Access_and_Trust_Controls.md`
16. `15_DevOps_Environments_and_Deployment.md`
17. `16_End_to_End_Transaction_Sequence.md`

### Pack 5 — Build, Test and Demo

18. `17_Test_and_Acceptance_Plan.md`
19. `18_Demo_Runbook.md`
20. `19_Backlog_and_Implementation_Tasks.md`

---

## 8. Planned repository structure

Current workspace organisation follows the populated documentation areas first. Implementation directories should be created when corresponding contracts, schemas, APIs, services, applications, deployment assets, tests or samples are actually added.

```text
finternet-poc/
│
├── README.md
├── docs/
│   ├── 00_README_Project_Index.md
│   ├── 01_Project_Build_Plan.md
│   ├── 02_Finternet_Technical_Architecture.md
│   ├── core/
│   ├── software/
│   ├── engineering/
│   └── delivery/
│
├── contracts/
│   ├── ParticipantRegistry.sol
│   ├── CredentialRegistry.sol
│   ├── RecoveryAsset.sol
│   ├── ClaimRegistry.sol
│   ├── AttestationRegistry.sol
│   ├── DemoINR.sol
│   └── SettlementEngine.sol
│
├── schemas/
├── api/
├── beckn/
├── credentials/
├── apps/
├── services/
├── deployment/
└── tests/
```

The contract list is a baseline, not yet a final contract interface specification. Pack 2 will define exact responsibilities and determine whether any function should be consolidated or separated.

---

## 9. Working principles

1. **Use public, recognised standards wherever practical.**
2. **Keep identity separate from wallet addresses.**
3. **Use Ethereum for shared economic state, not as a general database.**
4. **Keep private evidence off-chain but cryptographically link it to on-chain state.**
5. **Use Beckn for discovery and economic interaction rather than building a closed marketplace.**
6. **Use credentials to govern who may transact, even on a public ledger.**
7. **Make the asset genuinely transferable and settlement genuinely programmable.**
8. **Use real-world signed attestations as explicit bridges into smart-contract logic.**
9. **Do not tokenise every claim simply because it can be tokenised.**
10. **Keep the PoC reusable for other RWAs beyond recycling.**
11. **Do not require business users to understand gas, seed phrases or blockchain mechanics.**
12. **AI agents receive bounded authority, never unrestricted private keys.**

---

## 10. Definition of technical success

The PoC is technically successful when an independently operated buyer application or bounded AI agent can, without sharing the originator application's database:

1. discover a tokenised recovery asset through an open Beckn interaction;
2. verify the asset's provenance and participant credentials;
3. enter into an agreed transaction;
4. lock programmable settlement value;
5. use a real-world signed attestation as a contractual condition;
6. complete an Ethereum-based transfer of the ERC-1155 asset and dINR settlement;
7. inspect the transaction through application and public-ledger records; and
8. do so without double-selling the asset or double-consuming a claim.

---

## 11. Authoritative technical references

- ERC-1155 Multi Token Standard: https://eips.ethereum.org/EIPS/eip-1155
- ERC-4337 Account Abstraction: https://eips.ethereum.org/EIPS/eip-4337
- W3C Verifiable Credentials Data Model 2.0: https://www.w3.org/TR/vc-data-model-2.0/
- Beckn Protocol v2.0 specification repository: https://github.com/beckn/protocol-specifications-v2
- Beckn v2.0 OpenAPI specification: https://github.com/beckn/protocol-specifications-v2/blob/main/api/v2.0.0/beckn.yaml

---

## 12. Next document

See `01_Project_Build_Plan.md` for the practical build plan, environments, accounts, subscriptions, inputs and implementation sequence.

---

## 13. Current Context Addendum

The project is now explicitly grounded in Project Aamhi's rural solid waste management context and the opportunity to create verifiable, quantity-bounded OBP-ready recovery claims.

Read these companion documents before implementation:

- `02_Aamhi_Rural_SWM_and_OBP_Context.md`
- `03_Context_Availability_and_Simulation_Strategy.md`
- `../05_delivery/20_End_to_End_PoC_Execution_Plan.md`
- `../superpowers/plans/2026-09-16-finternet-poc-end-to-end.md`

Important boundary: the PoC may create OBP-ready evidence claims, but it must not describe them as official OBP credits, EPR certificates or government-issued claims unless an authorised integration is added.
