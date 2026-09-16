# Processor / Verifier Console

Light operational scaffold for Packet 4.

Purpose:

- inspect an Aamhi recovery asset evidence manifest;
- verify source hashes and quantity metadata;
- create an `ASSET_VERIFIED` attestation concept;
- stop before receipt, processing, settlement or claim actions.

Dependency state:

```text
Verifier credential: LOCAL_MOCK
On-chain attestation registry: NOT_CONNECTED
Settlement: NOT_CONNECTED
```
