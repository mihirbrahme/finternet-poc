# Vartul demonstration dataset

This is the specification of the demonstration dataset. It follows the product document ([Section 5](Vartul_Product_Document.md#5-the-setting-and-the-participants) and [Section 19](Vartul_Product_Document.md#19-demonstration-specification)). The single source of truth in code is `services/vartul/dataset/murud.ts`, and the seeder generates the history from it deterministically, so every machine produces the same ledger.

## Ground rules

- **Real places.** Raigad district, Murud taluka, its villages, Kashid MRC, Kashid beach and the Korlai shore. Coordinates are approximate.
- **Real organisations.** Project Aamhi and the Gram Panchayats of the ten villages. Their roles and data in the demonstration are illustrative.
- **Fictional organisations.** Every other organisation: sponsors, recyclers, verifiers, assessor, peer NGOs and the payment provider.
- **Fictional people.** All collectors and staff are fictional. Collector names exist only in the originator's private store and the simulated field app. The ledger and every public view show pseudonymous IDs (`SS-MRD-0017`).
- **Illustrative evidence.** Photos are generated images of sacks of material, never real people or places.
- **Sandbox money.** The sandbox dINR token has no value. Keys are derived from public names and protect nothing.

## Places

| Code | Village | Households (illustrative) | Panchayat account |
|---|---|---|---|
| NDG | Nandgaon | 640 | GP-NDG |
| KSD | Kashid | 420 | GP-KSD |
| CHK | Chikni | 310 | GP-CHK |
| SRV | Sarva | 280 | GP-SRV |
| DND | Danda | 520 | GP-DND |
| VHR | Vihur | 360 | GP-VHR |
| MZG | Mazgaon | 300 | GP-MZG |
| BRS | Barshiv | 250 | GP-BRS |
| BRL | Borli | 690 | GP-BRL |
| KRL | Korlai | 580 | GP-KRL |

Sites: Kashid MRC (aggregation and weighing), Kashid beach and Korlai shore (beach routes).

## Participants

| Code | Name | Kind | Ledger roles |
|---|---|---|---|
| AAMHI | Project Aamhi (real) | Originator NGO | ORIGINATOR, MRC_OPERATOR, SUPERVISOR |
| SAGAR | Sagar Swachh Sangh | Peer NGO, Alibag | ORIGINATOR, MRC_OPERATOR |
| HIRWAI | Hirwai Collective | Peer NGO, Shrivardhan | ORIGINATOR, MRC_OPERATOR |
| TIDEWELL | Tidewell Foods Ltd (CSR) | Sponsor | SPONSOR |
| NEELKANTH | Neelkanth Bank Foundation | Sponsor | SPONSOR |
| COASTLINE | Coastline Giving Circle | Sponsor | SPONSOR |
| TALVAN | Talvan Polymers Pvt Ltd | Recycler | FACILITY, BUYER |
| GHATMATHA | Ghatmatha Recyclers LLP | Recycler (glass, HDPE) | FACILITY, BUYER |
| NIRIKSHAN | Nirikshan Assurance LLP | Verifier | VERIFIER |
| DRISHTI | Drishti Assurance Services | Verifier | VERIFIER |
| PRATIBIMB | Pratibimb Impact Assessors | Impact assessor | ASSESSOR |
| VARTUL-NET | Vartul Network Facilitator (Suma) | Network | FACILITATOR, RELAYER |
| SBX-BANK | Sandbox Settlement Bank | Payment provider | ISSUER |
| GP-* | Ten Gram Panchayats (real bodies) | Observers | PANCHAYAT |

## Collectors

- **Aamhi:** 20 safai saathis (`SS-MRD-0001` to `SS-MRD-0020`), two per village. `SS-MRD-0017` (Sunanda, Korlai) is the worker the demonstration follows.
- **Sagar Swachh Sangh:** 8 collectors (`SS-ALB-*`).
- **Hirwai Collective:** 8 collectors (`SS-SVD-*`).

## Programmes

| Programme | Originator | Sponsors (₹) | Policy | Verifier | Seeded state |
|---|---|---|---|---|---|
| Murud Coastal Recovery 2026–27 (`PRG-MRD-COASTAL-2026`) | Aamhi | Tidewell 5,40,000 | ₹18/kg, capped; 40/55/5 split | Nirikshan | Lots `VRL-MRD-2026-0001`–`0041` settled; the hero lot `0042` is minted live |
| Kashid & Korlai Shoreline Milestone 2026 (`PRG-MRD-BEACH-2026`) | Aamhi | Neelkanth 1,20,000 + Coastline 80,000 | Fixed ₹2,00,000 at 10,000 kg | Nirikshan | About 9,300 kg verified and pending (92.9% of target); the monsoon caused the shortfall. In scene 7 the sponsors approve a pro-rata ₹1,85,700 and ₹14,300 is refunded |
| Alibag & Revdanda Shoreline Plastics (`PRG-ALB-SHORE-2026`) | Sagar Swachh Sangh | Neelkanth 3,00,000 | ₹16/kg, capped | Drishti | About 110 small lots settled |
| Shrivardhan Village Dry-Waste Programme (`PRG-SVD-VILLAGE-2026`) | Hirwai | Tidewell 2,40,000 | ₹15/kg, capped | Drishti | About 100 small lots settled |

Three more offerings are published on the open network but not yet funded (scene 2): fishing nets and marine footwear in Murud (Aamhi), Alibag fishing hamlets (Sagar), and Shrivardhan schools and market (Hirwai).

## Calendar

- The history starts on 1 May 2026, with the first programme commitment on 4 May.
- Seeded activity runs until 10 November 2026.
- The demonstration clock starts at 13 November 2026, 10:30 IST, and is pinned on every scene reset.

## Planted cases

| Case | Where | Purpose |
|---|---|---|
| Fraud pattern | Live lot in scene 6: `SS-MRD-0009` records with a 46 kg trip, a duplicate photo of an earlier record by another collector, and a GPS fix about 2 km off the Borli route | Anomaly flags, exclusion and payout exclusion |
| Fabricated receipts | Ghatmatha Recyclers' October receipts | Revocation cascade (scene 9) |
| Challenge | One seeded lot challenged by a Gram Panchayat and resolved with an adjusted quantity | Challenge-window history |
| Material sales | Selected settled lots bought by Talvan or Ghatmatha | Unbundled rights and EPR-ready supply claims |

## Lot sizes and volumes (approximate)

| Stream | Lots | Average lot | Total |
|---|---|---|---|
| Murud coastal (MRD) | 41 seeded | ~480 kg | ~19.7 t |
| Shoreline milestone (KSB) | ~60 | ~150 kg | ~9 t |
| Alibag (ALB) | ~110 | ~120 kg | ~13 t |
| Shrivardhan (SVD) | ~100 | ~110 kg | ~11 t |
