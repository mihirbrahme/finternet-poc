# Aamhi Rural SWM and OBP Context

**Project:** Suma Finternet PoC - Tokenised Recovery Asset Demonstrator  
**Purpose:** Ground the PoC in Project Aamhi's rural solid waste management operating model and the verifiable claim opportunities around ocean-bound plastic.

---

## 1. Context Shift

The PoC should not be treated as generic tokenisation of waste.

It should demonstrate verifiable digital infrastructure for rural circular-economy recovery, with Project Aamhi as the initial collection and recovery-originator partner.

The project therefore becomes:

> A Finternet demonstrator where Project Aamhi's rural non-biodegradable waste recovery lots can be digitally verified, tokenised as auditable recovery assets, discovered by buyers/sponsors/recyclers, settled programmatically, and converted into trustworthy impact and recycling claims without double counting.

---

## 2. Project Aamhi Role

For the PoC, Aamhi should be modelled as:

- `RECOVERY_ORIGINATOR`;
- rural/coastal collection partner;
- evidence source for collection and aggregation;
- initial holder of the tokenised recovery asset;
- seller/service provider in the first settlement demonstration;
- issuer/source of some operational attestations, such as collection and dispatch.

Aamhi is not expected to act as the government regulator, official EPR authority or OBP certification body.

---

## 3. Rural Solid Waste Management Operating Model

The asset lifecycle should start before tokenisation, at field recovery.

Minimum operational stages:

1. site or route identified;
2. waste collected by local team or safai-sathi group;
3. material segregated by type and quality;
4. material weighed;
5. evidence captured;
6. material aggregated or stored;
7. lot verified;
8. lot tokenised;
9. lot published for discovery;
10. lot dispatched to buyer, recycler or processor;
11. receipt and processing attested;
12. recovery, recycling, sponsor or OBP-ready claims created.

This must be visible in the data model and user flows. The PoC is weaker if it begins only at "warehouse lot uploaded".

---

## 4. Initial Material Scope

The first demonstrator should use one or two material streams only.

Recommended first material:

- `PLASTIC-LDPE`, if the goal is close continuity with the existing docs; or
- `PLASTIC-PET`, if the goal is easier external familiarity and recycling buyer interest.

Optional second material for a later demo:

- mixed low-value plastic or fishing/marine plastic for OBP-ready claims.

Do not start with every Aamhi material category. Textiles, glass, footwear, fishing nets and mixed waste can be added once the core chain is proven.

---

## 5. OBP-Ready Claim Boundary

`OBP` means ocean-bound plastic. For this PoC, OBP should be represented carefully.

The PoC may create:

- OBP eligibility evidence;
- OBP-ready recovery claims;
- location and custody evidence needed for later certification;
- claim records that prevent duplicate sponsor/impact attribution.

The PoC must not claim to issue official OBP credits unless Aamhi/Suma is connected to a recognised certification process or authorised registry.

Recommended terminology:

- use `OBP_READY_RECOVERY_CLAIM`;
- use `OBP_ELIGIBILITY_EVIDENCE`;
- avoid `OBP_CREDIT_ISSUED` unless formally certified.

---

## 6. Evidence Required for Aamhi Lots

Minimum evidence package:

- collection site or route reference;
- village, district and state;
- date/time of collection;
- material category;
- collection photos;
- segregation photos;
- weight/weighment record;
- storage or aggregation record;
- dispatch record;
- recycler/processor receipt;
- receipt quantity;
- optional GPS or geofence evidence;
- optional OBP risk category evidence.

Evidence files remain private unless explicitly safe for public metadata. Hashes and manifests make the evidence tamper-evident.

---

## 7. Aamhi-Specific Participants

Minimum participants for the first demo:

- Suma / Network Administrator;
- Aamhi / Recovery Originator;
- Verifier;
- Buyer or sponsor organisation;
- Recycler / Processor;
- AI agent service account.

Potential later participants:

- Gram Panchayat or Zilla Parishad observer;
- logistics participant;
- OBP certification body;
- EPR-authorised processor or producer;
- CSR sponsor.

---

## 8. Claim Types to Prioritise

Prioritise these claim types:

| Claim | Meaning | First PoC? |
|---|---|---|
| `RECOVERY_COLLECTED` | Material recovered by Aamhi from a known area | Yes |
| `ASSET_VERIFIED` | Recovery lot verified for tokenisation | Yes |
| `RECEIPT_CONFIRMED` | Buyer/processor received material | Yes |
| `PROCESSING_CONFIRMED` | Recycler/processor processed material | Yes, if data available |
| `OBP_READY_RECOVERY_CLAIM` | Evidence package supports future OBP certification | Yes |
| `SPONSOR_ATTRIBUTION` | Sponsor can claim support for a quantity | Optional |
| `EPR_REFERENCE` | Link to official EPR outcome/reference | Reference only |

Claims must be quantity-bounded and must not double count the same recovered material.

---

## 9. Design Implication

Every major feature should answer this question:

> Can an independent party trust that this rural recovery quantity exists, came from the claimed context, was not double counted, and moved into the claimed downstream outcome?

If a feature does not help answer that question, it is probably not needed in the first PoC.
