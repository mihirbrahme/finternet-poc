# Glossary and reference sources

## Glossary

| Term | Meaning in this project |
|---|---|
| Programme | Agreed funded purpose containing milestones |
| Milestone | Defined outcome/acceptance and funding unit within a programme |
| Commitment | A party's recorded obligation under agreed terms |
| Escrow | Value held subject to specified release conditions |
| Operating advance | Funds made available for carrying out work, with agreed reconciliation |
| Evidence | Supporting records of an event, not automatic proof of truth |
| Manifest | Versioned package of evidence references and fingerprints |
| Attestation | An identifiable actor's assertion about a subject/event |
| Verification | Assessment of evidence against agreed eligibility conditions |
| Attribution | Defined acknowledgement linking sponsor support to an outcome |
| Custody | Physical possession/responsibility, distinct from legal ownership |
| Tokenisation | Digital representation of a defined asset, entitlement or commitment |
| dINR | Permissioned sandbox demonstration token with no redeemable INR claim |
| CBDC / e₹ | Central-bank digital currency; any integration depends on authorised access |
| Stablecoin | Privately issued token targeting a reference value; not equivalent to CBDC |
| Finality | The defined confidence/confirmation threshold for a settlement record |
| Idempotency | Repeated requests for one operation cannot create repeated financial effects |
| Reconciliation | Comparing application operations with authoritative ledger/provider records |
| OBP-ready | Evidence potentially useful for further assessment, not official credit issuance |
| Domain profile | Use-case-specific definitions layered over the reusable programme kernel |

## Primary reference sources

These sources inform concepts and standards. They do not endorse this project or establish that the local implementation conforms to them. Pin selected versions/revisions during pilot implementation and assess changes before upgrading.

| Source | Relevance | Use in this project |
|---|---|---|
| [BIS Finternet working paper](https://www.bis.org/publications/working-paper-1178-finternet-financial-system-future) | Vision of interconnected financial ecosystems | Conceptual motivation, not certification |
| [Beckn v2 repository](https://github.com/beckn/protocol-specifications-v2) | Protocol and governance artifacts | Target external integration baseline |
| [Beckn v2 API](https://github.com/beckn/protocol-specifications-v2/blob/main/api/v2.0.0/beckn.yaml) | Normative transport/API definitions | Select a reviewed revision for conformance work |
| [W3C VC Data Model 2.0](https://www.w3.org/TR/vc-data-model-2.0/) | Credential data model | Issuer/holder/verifier and trust-profile design |
| [ERC-1155](https://eips.ethereum.org/EIPS/eip-1155) | Multi-token standard | Review original material-entitlement implementation |
| [RBI digital-rupee FAQ](https://www.rbi.org.in/commonman/Upload/English/FAQs/PDFs/DigitalRupee09012025.pdf) | Digital-rupee and programmability context | Potential future provider integration; no access asserted |

BIS, Beckn, W3C and ERC sources were consulted for the expanded foundational documentation on 2026-11-05. The RBI reference was consulted during the payment-direction discussion. Verify current provider capabilities and applicable rules at the actual implementation decision date.

## Internal source hierarchy

1. Current business/product blueprint and agreed decision ledger.
2. Focused requirements, policy, data and target-architecture specifications.
3. Current-state/gap register and executable tests for implementation claims.
4. Demo experience/runbook for presentation behavior.
5. Earlier project specifications as reference context, subject to sponsorship precedence.

If code and documentation disagree, report the discrepancy; do not silently assume that either describes the approved product. Resolve the requirement, update code/docs and retain the decision history.
