# Decisions, risks and open questions

“Agreed” means agreed with the project owner; external stakeholder acceptance is pending. Engineering choices are implementation recommendations within the authorised handover scope.

## Decision ledger

| ID | Decision | Consequence | Status |
|---|---|---|---|
| D01 | Aamhi value plus generic Finternet proof | Evaluate operational benefit and observable capability | Agreed |
| D02 | Sponsorship primary; one sponsor per programme | Keep material sale separate; defer co-funding | Agreed |
| D03 | Collection plus facility receipt first | No claim of completed recycling | Agreed |
| D04 | Advance funding with conditional release | Operating advances remain a supported design direction | Agreed |
| D05 | Programmable terms; fixed-payment local example | Proportional payment is optional, not universal | Agreed |
| D06 | Exact exceptions require sponsor and Aamhi | New proposals invalidate prior approvals | Agreed |
| D07 | Appointed verifier accepts against evidence | Commercial exceptions require parties, not verifier alone | Agreed |
| D08 | Disputes hold affected unpaid milestone only | Human escalation; other work continues | Agreed |
| D09 | Non-transferable commitment/attribution | No automatic material/credit ownership | Agreed |
| D10 | Beckn discovers programme offering | Linked agreement/evidence/payment workflow | Agreed |
| D11 | Functional browser and real local-chain settlement | Thin API, controlled accounts, explicit simulation labels | Agreed |
| D12 | Future payment adapters | Authorised bank/CBDC/permitted stablecoin access remains external | Agreed |
| D13 | Configurable evidence baseline | Field practicality and jointly approved exceptions | Agreed |
| D14 | Design full lifecycle | Processing, sale and credit handover later | Agreed |
| D15 | Preset 500 kg / 10,000 dINR milestones | Synthetic presentation values, not a valuation | Engineering choice |
| D16 | Sponsorship represented by contract records | No new ERC token standard claim | Engineering choice |
| D17 | Dedicated local chain and fixed distinct parties | Reproducible demo; account replacement is pilot work | Engineering choice |
| D18 | Immutable submitted manifest locally | Corrections need a future versioned lifecycle | Engineering choice |
| D19 | Automatic same-transaction settlement | Qualifying verification or final exception approval transfers funds and records attribution; no separate administrator release | Agreed |
| D20 | Participant-specific visual identity | Indigo sponsor, green Aamhi, teal facility, purple verifier plus explicit role text | Agreed |
| D21 | Product language with inspectable provenance | Main flow describes the working model; system details retain accurate environment and integration limits | Agreed |

## External decisions and owners

| Question | Starting recommendation | Owner / deadline |
|---|---|---|
| Legal funding recipient and funding classification? | Determine actual grant/donation/service arrangement | Aamhi/sponsor legal-finance, before live funding |
| Material owner and sale authority? | Preserve legal ownership separately | Aamhi/facility/commercial parties, before sale integration |
| Verifier appointment, compensation and replacement? | Joint appointment, conflicts disclosure and recovery procedure | Sponsor/Aamhi, before pilot verification |
| Feasible evidence and retention? | Validate field baseline, consent and least-privilege access | Operations/verifier/privacy owner, before real capture |
| Working-capital advance? | Agree before work; escrow is not available operating cash | Sponsor/Aamhi finance, before programme funding |
| Deadlock escalation? | Named human route without unilateral software override | Contracting parties, before live escrow |
| Beckn network/profile? | Validate current supported domain with network operator | Technical lead, before external integration |
| Chain and signing provider? | Select on custody, recovery, costs and ecosystem | Architecture/security, before pilot deployment |
| CBDC or stablecoin access permitted? | Review actual provider, recipient, purpose and route | Payment/legal/finance lead, before integration |
| Credit eligibility and entitlement? | Follow authorised methodology and registry | Scheme/legal/commercial lead, before credit workflow |

## Risks and treatment

| Risk | Treatment / remaining action |
|---|---|
| False evidence or collusion | Separate accounts demonstrate permissions only; real controls need independent verification, sampling and accountability |
| Duplicate recovery across programmes | Manifest hash check is limited; add canonical lot allocation and cross-programme reconciliation |
| Working-capital blockage | Isolate disputes; agree advances or smaller tranches |
| Deadlock, lost keys, token pause | Local only; pilot needs escalation, signer/appointment recovery and custody review |
| Changed proposal reuses approval | Hash binding and approval reset implemented; add durable concurrency controls |
| Role switch mistaken for authentication | Explicit labels and loopback; replace headers/signers before hosting |
| Session data loss | Export for inspection only; database, object storage and event replay required |
| Payment/credit capabilities overstated | Explicit integration status, provider validation and reviewed reporting |
| Older specs conflict with sponsorship | Handover precedence; reconcile detailed specifications during pilot work |

Record superseding decisions with rationale, affected agreements, migration implications and tests. A new design decision does not retroactively amend existing terms.
