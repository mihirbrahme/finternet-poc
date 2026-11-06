# Aamhi Finternet — handover index

## Purpose and authority

This package is the current product and engineering baseline for a local demonstration and subsequent pilot implementation. It incorporates the sponsor decisions agreed with the project owner in this conversation. Aamhi, sponsors, facilities and independent verifiers have not yet validated those decisions directly.

The documentation covers the foundational product and platform, not only the demonstration. The browser is one executable illustration of the model. Requirements and target specifications explicitly identify capabilities that remain unimplemented.

Read these documents in order:

1. [Business, product and operating model](01_Business_Use_Case_and_Pilot_Blueprint.md)
2. [Technology architecture and engineering blueprint](02_Technology_Architecture_and_Engineering_Blueprint.md)
3. [Current state and gap register](03_Current_State_and_Gap_Register.md)
4. [Local demo runbook](04_Local_Demo_Runbook.md)
5. [Engineering roadmap](05_Engineering_Roadmap.md)
6. [Decisions, risks and open questions](06_Decisions_Risks_and_Open_Questions.md)
7. [Acceptance and handover checklist](07_Handover_Acceptance_Checklist.md)

## Foundational specifications

| Read for | Authoritative specification |
|---|---|
| Why this exists; Finternet, blockchain, tokenisation and Beckn | [Context and foundations](08_Context_and_Finternet_Foundations.md) |
| Users, journeys, scope and functional/non-functional requirements | [Product requirements and operating model](09_Product_Requirements_and_Operating_Model.md) |
| Rights, payments, exceptions, verification and governance | [Policy and rights](10_Policy_and_Rights_Specification.md) |
| Entities, IDs, amounts, states, lineage and privacy | [Domain model and data dictionary](11_Domain_Model_and_Data_Dictionary.md) |
| Service boundaries, APIs, adapters, reliability and security | [Target architecture and integration contracts](12_Target_Architecture_and_Integration_Contracts.md) |
| Information architecture, role tasks, reporting and presentation | [Product experience design](13_Product_Experience_and_Presentation_Design.md) |
| Business need to requirement, component, test and gap | [Traceability and test strategy](14_Requirements_Traceability_and_Test_Strategy.md) |
| Operational ownership, recovery and pilot acceptance gates | [Pilot operations and delivery gates](15_Pilot_Operations_and_Delivery_Gates.md) |
| Terminology, source evidence and standard references | [Glossary and reference sources](16_Glossary_and_Reference_Sources.md) |

Business/product readers should read 01, 08, 09 and 10. Architecture/engineering readers should then read 02, 11, 12 and 14. Operators should read 15. Presenters should read 04 and 13. The gap register governs claims of current implementation; target requirements do not imply completed code.

The business document defines purpose, rights and policy. The technology document translates them into system responsibilities. The gap register distinguishes implementation from intended design. The runbook documents the executable demo.

## Relationship to earlier documents

The original [project index](../00_project/00_README_Project_Index.md) and [2026-09-16 implementation plan](../superpowers/plans/2026-09-16-finternet-poc-end-to-end.md) describe the material-sale reference PoC. That implementation remains available and tested. Its buyer receives an ERC-1155 material entitlement against dINR settlement.

The [2026-09-17 enhancement plan](../superpowers/plans/2026-09-17-pilot-grade-solution-enhancement.md) remains a historical backlog, with its original progress ledger. It is not evidence that its pilot packets are completed. The handover roadmap supersedes its ordering for the sponsorship use case.

Where older documents assume that the sponsor buys material, receives official credits, or must use a particular frontend/account-abstraction implementation, use this handover package for the sponsorship design. Earlier specifications remain useful references, not statements of current implementation completeness.

## Handover contents

| Item | Location |
|---|---|
| Browser demo | `apps/sponsorship-demo/` |
| Local API, deployment and session orchestration | `services/sponsorship-demo/` |
| Sponsorship contract | `contracts/src/SponsorshipEscrow.sol` |
| Sandbox programme discovery | `beckn/sponsorship-sandbox/` |
| Synthetic supporting evidence | `samples/sponsorship/` |
| Browser/API acceptance | `tests/browser/sponsorship.spec.ts` |
| Contract acceptance | `contracts/test/SponsorshipEscrow.t.sol` |
| Existing domain reference implementation | `services/core-api/`, `agents/`, `tests/end-to-end/` |
| Local CI definition | `.github/workflows/acceptance.yml` |

## Transfer expectations

See the [root handover entry point](../../HANDOVER.md) and [v0.2.1-handover release notes](17_Handover_Release.md) for packaging, exact-source validation and transfer contents.

Run the demo and acceptance commands before transfer. Retain the validation record, walkthrough and gap register with the source. Local addresses and transaction hashes are generated per session; the committed public-demo manifest continues to show no recorded public deployment.

The version in `package.json` identifies this handover working baseline. A Git release tag, commit, push or hosted deployment is a separate repository-management action; this package does not assert that one has been created.
