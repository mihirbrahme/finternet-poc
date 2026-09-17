# 21 - Known Limitations and Boundaries

## Purpose

This document states the limits of the Packet 11 Finternet PoC demo package so it is not mistaken for a production, regulatory or certified deployment.

## Current Demo Boundaries

- dINR is sandbox programmable settlement value only. It is not legal tender, CBDC, bank money, stored value or regulated payment issuance.
- `OBP_READY_RECOVERY_CLAIM` is evidence-backed and quantity-bounded, with `isOfficialCredit=false`.
- The PoC does not issue official OBP credits.
- EPR references are references only. They are not official EPR certificate issuance, registry acknowledgement or government entitlement.
- No legal, regulatory, tax, title-transfer or compliance claim is made by the demo.
- Public-chain deployment is not present until real `DEMO_RPC_URL` and `DEMO_DEPLOYER_PRIVATE_KEY` credentials are supplied and a live deployment manifest is produced.
- Smart-account execution remains behind a provider adapter boundary. If ERC-4337 bundler/paymaster infrastructure is not connected, the demo uses controlled test-wallet semantics.
- Beckn discovery is currently a sandbox adapter. It demonstrates open-network shape and separation from the seller database, not a live external Beckn network certification.
- Identity and VC issuance use local/demo service logic unless a public DID host, credential issuer and verification profile are integrated.
- IPFS and evidence storage use local/mock adapters unless a managed pinning service and secured object-storage environment are connected.
- The blockchain indexer is an in-memory/local projection in the current harness; production requires persisted indexing, replay, reorg handling and monitoring.

## Production Integrations Required

Before this can be represented as production or production-like, integrate and validate:

- Public Ethereum testnet or target chain RPC, funded deployer and recorded contract addresses.
- Hosted API services with authentication, authorization and audit logging.
- PostgreSQL migrations and managed database environment.
- Secured object storage for private evidence and public metadata pinning for non-sensitive metadata.
- Public `did:web` hosting, DID resolution checks and credential issuer/verifier infrastructure.
- ERC-4337-compatible smart-account provider, bundler and paymaster if gas sponsorship or delegated agent execution is part of the demo.
- Beckn provider, consumer and discovery endpoints that match the selected network profile.
- Deployment-time role configuration and post-deployment validation for treasury, tokeniser, verifier, processor and admin capabilities.
- Persisted blockchain indexer with event replay, reconciliation and observability.
- Legal and regulatory review before any OBP, EPR, payment, title, impact, carbon or government-facing claim is made.

## Approved Demo Language

Use this wording for the Aamhi/OBP outcome:

```text
This is an evidence-backed, quantity-bounded OBP-ready recovery claim for PoC diligence and impact reporting. It is not official OBP credit issuance, an EPR certificate or a government claim.
```
