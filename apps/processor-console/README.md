# Processor / Verifier Console

Light operational scaffold for Packet 8.

Purpose:

- inspect an Aamhi recovery asset evidence manifest;
- verify source hashes and quantity metadata;
- create an `ASSET_VERIFIED` attestation concept;
- record processor receipt quantity and evidence references;
- sign a `RECEIPT_CONFIRMED` attestation with a processor credential.

Dependency state:

```text
Verifier credential: LOCAL_MOCK
Processor credential: LOCAL_MOCK
On-chain attestation registry: LOCAL_MOCK
Settlement: LOCAL_MOCK
```
