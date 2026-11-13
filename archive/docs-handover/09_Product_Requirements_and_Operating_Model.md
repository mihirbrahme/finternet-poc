# Product requirements and operating model

## 1. Product definition

Enable a sponsor and a delivery organisation to agree a funded purpose, track accountable milestone progress, verify tangible outcomes and connect acceptance to payment. Aamhi recovery is the initial profile. One programme has one sponsor and one delivery organisation; each organisation may participate in multiple programmes.

Primary business output: an understandable report of the sponsor's funding contribution, accepted outcome, supporting evidence, exceptions and payment status. The report must be useful even to someone who never inspects a blockchain receipt.

## 2. Jobs and responsibilities

| Participant | Job to accomplish | Product support |
|---|---|---|
| Sponsor programme manager | Decide what to fund and explain what it achieved | Offering, agreement, funding status, review queue and report |
| Aamhi programme lead | Deliver agreed work and maintain funding continuity | Milestones, submission status, exceptions and advance reconciliation |
| Field operator | Capture collection facts with manageable effort | Route/batch reference, capture guidance and eventual offline queue |
| Facility representative | Acknowledge receipt without accepting unsupported impact claims | Quantity, date, material, source references and discrepancy recording |
| Verifier | Judge eligible outcomes against agreed evidence requirements | Review package, findings, exclusions, acceptance or further-work request |
| Finance operator | Reconcile commitments, payments and refunds | Instrument-specific instructions, confirmations and exception queue |
| Reviewer/auditor | Inspect authority, evidence, changes and value movement | Read-only linked records with scoped evidence access |
| Network administrator | Admit trustworthy participants and operate services | Onboarding, role/credential administration and operational health |

A pilot may combine organisational jobs, but must document conflicts. Combining Aamhi submission and supposedly independent verification requires explicit policy rather than an accidental shared login.

## 3. Programme lifecycle

| Stage | Entry conditions | Outcome / next responsibility |
|---|---|---|
| Draft | Provider defines purpose and scope | Offering reviewed for publication |
| Discoverable | Approved non-sensitive offering published | Sponsor expresses interest/selects |
| Agreement proposed | Parties, milestones, evidence, funding and appointments identified | Parties accept exact version |
| Active | Required acceptance and initial funding policy satisfied | Work and evidence capture begin |
| In progress | Milestones operate independently | Accepted outcomes and payment decisions accumulate |
| Completion review | Required work concluded or revised/cancelled by agreement | Finance and reporting reconciliation |
| Closed | Outstanding funds, disputes and reporting obligations resolved | Immutable history with controlled corrections |

Programme closure must not be inferred from a UI progress bar or one paid milestone. Likewise, technical service availability is distinct from programme activity status.

## 4. Milestone design

Each milestone defines a purpose and scope, target/measurement unit, eligible event definition, evidence checklist, appointed verifier, funding amount and currency/instrument, payment policy, relevant dates and exception/escalation procedure.

For recovery, initially accept collection plus facility receipt. Later milestones may require verified processing. The agreement determines whether a target is a threshold, an estimate with tolerance, or a basis for proportional payment. Do not impose proportional payment universally.

Separate **physical progress**, **verification status** and **payment status**. A verified 450 kg outcome can be fully paid by approved exception; “paid” must never rewrite the outcome to 500 kg. A completed outcome can await payment confirmation. A payment can fail without undoing the verifier's assertion.

## 5. Functional requirements

| ID | Requirement | Acceptance condition | Delivery |
|---|---|---|---|
| PR-01 | Discover eligible programme offerings | Sponsor sees purpose, geography, outcome, terms summary and provider | Local sandbox; network integration later |
| PR-02 | Mutually accept agreement version | Both parties' acceptance references the same terms version/hash | Preset local version; editable agreements later |
| PR-03 | Commit and distinguish funding | Planned, deposited, held, paid, refunded and available amounts remain distinct | Local dINR; external reconciliation later |
| PR-04 | Record evidence lineage | Submission identifies event, milestone, source, capture/submission times and file versions | Sample manifest locally; full ingestion later |
| PR-05 | Confirm receipt independently | Facility acknowledgement references evidence and measured quantity | Appointed local account; real process later |
| PR-06 | Verify eligibility | Authorised verifier records findings and eligible quantity bounded by receipt | Quantity locally; findings workflow later |
| PR-07 | Execute conditional payment | No release without implemented acceptance and approval conditions | Real local contract |
| PR-08 | Approve exact exceptions jointly | Both parties approve same reason/financial proposal; changes clear approval | Real local contract |
| PR-09 | Isolate disputes | Affected balance held; unrelated milestones continue | Local hold/cancellation; resume/escalation later |
| PR-10 | Maintain bounded attribution | Report distinguishes actual outcome, funded contribution and rights excluded | Local record/report; scheme rules later |
| PR-11 | Inspect audit trail | Terms/evidence/approvals/payments correlate through stable references | Local chain/session; durable replay later |
| PR-12 | Operate through connectivity gaps | Field records synchronise without silent duplicates | Target requirement, not implemented |
| PR-13 | Correct without erasing history | Superseding evidence/attestations retain original record and reason | Target requirement |
| PR-14 | Reconcile downstream material | Processing inputs/outputs/losses and transfers preserve lineage | Target requirement |
| PR-15 | Support instrument-specific execution | Payment adapters declare capabilities and finality | dINR local; bank/CBDC/stablecoin later |
| PR-16 | Assist with bounded agents | Proposal generation cannot bypass authority/approval | Existing buyer reference; sponsorship later |

## 6. Payment arrangements

Support a policy catalogue rather than an unconstrained scripting interface:

- Fixed amount after acceptance.
- Quantity-based payment under an explicitly agreed formula.
- Operating advance plus subsequent reconciliation.
- Periodic progress tranches with review.
- Retained balance released at completion.

Each policy must identify its inputs, authorised decision-makers, permitted amendments and financial limits. New policy types require implementation tests. An uploaded agreement is not automatically executable.

## 7. Exceptions and practical operations

Differentiate evidence correction, verification disagreement and a commercial exception. Correcting an unreadable document is not automatically a payment change. A verifier may request further evidence; a sponsor and Aamhi may then agree a different commercial response if necessary.

Maintain a visible next actor and reason for any hold. Provide an agreed human escalation route. Avoid automatic programme-wide freezes. Already paid milestones remain historical facts; a correction creates a new adjustment or reporting revision rather than silently reversing history.

The target must allow joint approval to resume work after remediation as well as partial payment/refund, cancellation, extension and prospective scope change. These exceed the current contract's narrow financial-exception path and require versioned implementation.

## 8. Sponsor reporting requirements

A report identifies programme/agreement version, parties, reporting period, funded amount, value held/paid/refunded, eligible outcome, milestone status, exceptions, evidence references, verification authority and attribution boundaries. Mark provisional and final versions. State the generation time and whether independently signed or merely generated by the application.

Exclude unsupported claims of completed recycling, official credits, exclusive benefits or expenditure auditing. Provide a controlled link to underlying records. Redact sensitive information for an external report; an internal audit bundle may have broader access.

## 9. User experience requirements

A first-time sponsor should understand purpose and current outcome before seeing IDs or transaction hashes. Operators should see their task, required input, consequences and who acts next. Pending, failed, unknown, disputed and completed states must use different language.

Use progressive disclosure for cryptographic details. Support keyboard operation, visible focus, readable contrast, mobile fieldwork layouts and reduced motion. Never rely on colour alone for status. Preserve unsent input during navigation and confirmation; warn about an intentional demo reset.

## 10. Non-functional requirements and validation gates

| Area | Target requirement | How to establish a pilot threshold |
|---|---|---|
| Reliability | No duplicate payment on retries; durable recovery of unknown operations | Failure injection and restore tests before live funds |
| Privacy | Scoped access to evidence and minimal public metadata | Data inventory and access review |
| Security | Verified identity, least privilege and protected signers | Threat model, negative tests and independent review |
| Performance | Operators see pending acknowledgement promptly | Measure under expected pilot load; agree response targets |
| Availability | Fieldwork can continue during service interruption | Offline and operational continuity rehearsal |
| Interoperability | Independently deployed participants exchange agreed schemas | Network/profile conformance and end-to-end test |
| Accessibility | Core workflows usable without mouse and on narrow screens | Keyboard/mobile/contrast checks and user testing |

Do not invent throughput, uptime or user-impact percentages without a workload and baseline. Record agreed targets before pilot acceptance.

## 11. Scope and sequencing

First validate programme roles, evidence and cashflow with one sponsor and Aamhi. Implement persistence/authentication before real evidence and funds. Extend to processing and material commerce after reconciling the initial outcome chain. Add official credit workflows only with a recognised methodology and authoritative integration.

Co-funding within a programme, tradeable sponsorship and autonomous agent spending remain outside the first version. The generic kernel should allow domain profiles, but shipping multiple speculative verticals is not a first-pilot requirement.
