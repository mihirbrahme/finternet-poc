# Local Toolchain Setup

**Project:** Suma Finternet PoC - Aamhi Rural SWM Recovery Asset Demonstrator  
**Purpose:** Define the CLI tools and local developer utilities needed before implementation begins.

---

## 1. Setup Principle

Keep the toolchain lean.

Install what is needed for the current PoC packets, and defer heavier infrastructure until the packet that needs it.

The first setup should support:

- smart-contract development and testing;
- local Ethereum execution;
- Node.js services and apps;
- schema validation;
- local storage/database dependencies;
- API testing;
- simple JSON inspection.

---

## 2. Required Day-One Tools

### Git

Used for source control and packet-level commits.

Verify:

```bash
git --version
```

### Node.js LTS

Used for TypeScript services, frontend apps, scripts, schema validation, Beckn adapters and AI tooling.

Verify:

```bash
node --version
npm --version
```

### pnpm

Recommended package manager for the TypeScript monorepo.

Install after Node.js:

```bash
npm install -g pnpm
```

Verify:

```bash
pnpm --version
```

### Docker Desktop

Used for local dependencies:

- PostgreSQL;
- MinIO / S3-compatible object storage;
- local mocks;
- optional local IPFS adapter.

Verify:

```bash
docker --version
docker compose version
```

### Foundry

Recommended primary Ethereum smart-contract toolkit.

Foundry provides:

- `forge` for Solidity build and tests;
- `anvil` for local Ethereum node;
- `cast` for contract and RPC interaction from CLI;
- `chisel` for Solidity REPL/prototyping.

Install using the official Foundry installer:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

On Windows, use Git Bash, WSL or another shell that supports the installer flow.

Verify:

```bash
forge --version
anvil --version
cast --version
```

### jq

Used for inspecting and transforming JSON from APIs, chain calls and sample data.

Verify:

```bash
jq --version
```

### Bruno or Postman

Used for API exploration and demo validation.

Recommendation:

- Bruno if API collections should live in the repository;
- Postman if the team already standardises on it.

Only one is required.

---

## 3. Required Project Dependencies

These are installed inside the repo, not necessarily as global CLI tools.

### OpenZeppelin Contracts

Used for ERC-20, ERC-1155, access-control and security patterns.

Install inside the contracts package when Packet 3 or Packet 5 begins.

### Solidity Compiler

Do not install a global `solc` unless needed for debugging.

Foundry or Hardhat should manage compiler versions for reproducible builds.

---

## 4. Optional Later Tools

Install these only when a packet needs them.

### Hardhat

Optional TypeScript-friendly Ethereum development environment.

Use if the team wants:

- TypeScript deployment scripts;
- plugin-based verification;
- Hardhat Ignition;
- frontend/backend integration ergonomics.

Recommended stance:

> Foundry is primary. Add Hardhat only if it clearly improves deployment or integration workflow.

### IPFS / Kubo CLI

Optional for real local IPFS publishing.

The first PoC can use an IPFS adapter or mock as long as metadata generation and content-addressing semantics are preserved.

### Block Explorer Verification Tools

Use later for public testnet deployment.

Can be handled through Foundry or Hardhat verification integrations.

### ERC-4337 Bundler / Paymaster Tools

Do not install on day one.

The first build may use a smart-account adapter boundary and controlled test wallets. Add bundler/paymaster tooling only when the smart-account packet requires it.

### Terraform / kubectl

Only needed for cloud or Kubernetes deployment.

Not required for local PoC development.

---

## 5. Not Needed Initially

Avoid installing or operating these during early packets:

- full Ethereum node such as Geth;
- The Graph stack;
- production IPFS pinning CLI;
- production ERC-4337 infrastructure;
- OBP/EPR registry tooling;
- Kubernetes tooling;
- cloud IaC tooling.

These can be added when the implementation reaches public demo or production-like deployment.

---

## 6. Recommended First Setup Checklist

Install and verify:

```text
Git
Node.js LTS
pnpm
Docker Desktop
Foundry: forge, anvil, cast
jq
Bruno or Postman
```

Then run:

```bash
git status --short --branch
node --version
pnpm --version
docker compose version
forge --version
anvil --version
cast --version
jq --version
```

---

## 7. Packet Dependency

Tool needs by packet:

| Packet | Tools needed |
|---|---|
| Packet 1 | Git, Docker, Node.js, pnpm |
| Packet 2 | Node.js, pnpm, jq |
| Packet 3 | Foundry, Node.js, pnpm |
| Packet 4 | Docker, Node.js, pnpm |
| Packet 5 | Foundry, Docker, Node.js, pnpm |
| Packet 6 | Node.js, pnpm, Bruno/Postman |
| Packet 7 | Foundry, Docker, Node.js, pnpm |
| Packet 8 | Foundry, Docker, Node.js, pnpm |
| Packet 9 | All local tools plus Bruno/Postman |
| Packet 10 | Node.js, pnpm, AI provider credentials when approved |
| Packet 11 | Foundry, public RPC credentials, optional verification/deployment tools |

---

## 8. References

- Foundry: https://www.getfoundry.sh/
- Hardhat: https://hardhat.org/docs/getting-started
- OpenZeppelin Contracts: https://docs.openzeppelin.com/
