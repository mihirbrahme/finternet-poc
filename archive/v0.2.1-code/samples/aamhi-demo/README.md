# Aamhi Demo Sample Context

This folder is the future home for the golden Aamhi demo dataset. Packet 1 only defines the scenario; Packet 2 will add executable schemas and sample JSON.

## Golden Demo Path

1. Project Aamhi is onboarded as `RECOVERY_ORIGINATOR`.
2. Aamhi creates a rural recovery lot from coastal Raigad.
3. The lot represents 1,000 kg of verified LDPE or PET recovery material.
4. Evidence is attached for collection context, photos, segregation, weighment, storage and dispatch.
5. A credentialled verifier confirms the lot and evidence package.
6. The verified lot is tokenised as ERC-1155 recovery asset units where 1 token unit equals 1 kg.
7. The asset is published through a Beckn-shaped discovery flow.
8. An independent buyer discovers the asset and selects 500 kg.
9. The buyer locks 10,000 dINR and Aamhi locks 500 recovery asset units.
10. A processor receipt attestation confirms the received quantity.
11. Settlement transfers the asset units and dINR atomically.
12. Recovery, processing and OBP-ready evidence claims are recorded without double counting.

## Important Boundary

`OBP_READY_RECOVERY_CLAIM` means the evidence package is prepared for future certification or review. It is not an official OBP credit, EPR certificate or government-issued claim unless an authorised integration is added later.

## Packet 2 Inputs

Packet 2 should add sample files for:

- participants;
- material definitions;
- the 1,000 kg Aamhi recovery asset;
- evidence manifest;
- verifier attestation;
- settlement example;
- OBP-ready evidence claim with `isOfficialCredit: false`.
