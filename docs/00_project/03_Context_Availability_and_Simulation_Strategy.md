# Context Availability and Simulation Strategy

**Project:** Suma Finternet PoC - Tokenised Recovery Asset Demonstrator  
**Purpose:** Define how the build should stay honest and useful when some external dependencies are not yet available.

---

## 1. Operating Principle

The PoC may use simulated dependencies, but it must not use fake architecture.

> Placeholder allowed, fake architecture not allowed.

This means the system can mock an external service while still preserving the final interface, data contract, identifier mapping and trust boundary.

---

## 2. Dependency Readiness Labels

Every environment should expose the readiness mode of major dependencies.

Recommended labels:

- `LOCAL_MOCK`;
- `SANDBOX_ADAPTER`;
- `TESTNET_REAL`;
- `PRODUCTION_LIKE`;
- `NOT_CONNECTED`.

The Admin Console should show these labels for:

- Ethereum network;
- smart-account provider;
- VC issuer/proof suite;
- IPFS;
- object storage;
- Beckn provider/consumer/discovery;
- OBP registry/certification integration;
- EPR/government reference integration;
- AI model gateway.

---

## 3. Simulation Rules

### Ethereum

Local EVM is acceptable for development. Public testnet is required for final demo acceptance.

### Smart Accounts

The first build may use controlled test wallets behind a smart-account abstraction service. The API boundary must preserve the ability to replace this with ERC-4337 infrastructure.

### Verifiable Credentials

The first build may use a demo issuer and simplified proof suite. The credential payloads, status semantics and DID/account binding must follow the final model.

### IPFS

Local/mock IPFS may be used for development. Metadata generation and content addressing must be deterministic and replaceable with a hosted pinning provider.

### Beckn

Local provider/consumer/discovery adapters are acceptable for early slices. Message structure, identifiers and contracting semantics should remain close to Beckn v2 expectations.

### OBP Claims

The first build may create OBP-ready claims only. It must not claim official certification, credit issuance or government recognition unless an authorised integration exists.

### EPR/Government References

Use reference fields only unless an official system or authorised dataset is integrated.

---

## 4. UI Disclosure

User interfaces should make dependency state visible without overwhelming users.

Recommended Admin Console display:

```text
Ethereum: Sepolia testnet
Smart Account: Demo adapter
VC Issuer: Demo issuer
IPFS: Local mock
Beckn: Sandbox adapter
OBP Registry: Not connected
EPR Reference: Manual reference only
```

This prevents accidental overclaiming and makes later replacement straightforward.

---

## 5. Context Pack for Build Agents

Any agent or engineer working on the project should start with:

1. `README.md`;
2. `docs/00_project/00_README_Project_Index.md`;
3. `docs/00_project/02_Aamhi_Rural_SWM_and_OBP_Context.md`;
4. `docs/00_project/03_Context_Availability_and_Simulation_Strategy.md`;
5. `docs/01_architecture/16_End_to_End_Transaction_Sequence.md`;
6. `docs/05_delivery/20_End_to_End_PoC_Execution_Plan.md`.

This keeps the project grounded in the latest domain decisions rather than only the original architecture pack.

---

## 6. Replacement Standard

A simulated dependency is ready to be replaced when:

- the interface is documented;
- sample payloads exist;
- tests cover the adapter contract;
- the UI exposes dependency mode;
- no business object uses simulator-specific identifiers as canonical IDs.

The adapter can then be replaced without changing the core data model or user journey.
