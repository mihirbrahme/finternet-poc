# Policy, rights and governance specification

## 1. Status and interpretation

This is a recommended policy baseline for implementation and stakeholder review. It is not a legal agreement. “Must” identifies intended system behavior unless the implementation-status column states that it remains a target. Actual contracting parties approve the commercial and legal terms before pilot funding.

## 2. Rights ledger

| Right or record | Holder / authority | Creation | Transfer / termination |
|---|---|---|---|
| Funding commitment | Sponsor; accepted by delivery organisation | Approved agreement | Amendments require agreed party approval |
| Right to milestone payment | Aamhi under programme terms | Acceptance conditions and funding arrangement | Not freely tradable by default |
| Material ownership | Actual legal owner, separately established | Governing commercial/legal arrangement | Separate material-sale or custody transaction |
| Custody | Facility/logistics holder | Physical acknowledgement | Custody event; not necessarily sale |
| Sponsor attribution | Sponsor | Paid verified outcome under agreed scope | Initially non-transferable; corrections preserve history |
| Verification authority | Appointed verifier | Programme appointment and required credential | Replacement/revocation follows agreed governance |
| Environmental credit | Scheme-defined owner | Authorised issuer and eligibility process | Scheme/registry rules, not sponsorship payment |

The same physical event may support distinct records, but the system must explain their meanings. Sponsor attribution must not quietly become ownership of all commercial and environmental benefits.

## 3. Agreement contents

Require programme purpose, scope/geography, legal parties, milestone descriptions, quantities/units, outcome eligibility, evidence criteria, verifier/facility appointments, budget/currency, funding availability, payment policy, date/tolerance rules, disclosure/attribution, evidence access/retention, exception powers, escalation and closure procedure.

Version agreements. Separate structured executable parameters from human-readable provisions and references. Both parties accept the exact version. Changes identify whether they apply only prospectively or to a specified open milestone; closed history is immutable.

## 4. Decision authority

| Decision | Aamhi | Sponsor | Facility | Verifier |
|---|---|---|---|---|
| Agree programme terms | Approves | Approves | Acknowledges relevant role | Accepts appointment |
| Submit collection evidence | Responsible | Reviews as permitted | — | Reviews |
| Confirm received quantity | Supplies source references | — | Responsible | Reviews |
| Accept eligible outcome | Responds to queries | Inspects | Responds to queries | Responsible within appointment |
| Change payment/scope by exception | Must approve | Must approve | Supplies facts | Supplies findings |
| Replace verifier or party account | Joint governance | Joint governance | Role-specific | Cannot appoint self |
| Trigger an already-authorised release | May execute | May execute | No local API right | May execute |

Execution is different from authorisation: a release caller cannot alter amount, beneficiary or prerequisites. An administrator must not silently override agreed approvals.

## 5. Evidence and acceptance

Baseline evidence includes collection context, supporting images where feasible, weighment/receipt documentation, facility acknowledgement and verifier assessment. Programme policy can specify alternatives for field conditions. An exception should record why evidence was accepted or why commercial terms changed; it should not fabricate missing physical facts.

The verifier may confirm, request additional evidence, exclude unsupported quantity or reject. Verification findings should include event scope, evidence version, eligible quantity, exclusions, reason, appointment/credential references and time. The local demo records quantity and hash only; the richer finding is a pilot requirement.

## 6. Default payment and exceptions

The initial local policy pays the fixed budget when the accepted quantity meets the preset target. This is one policy profile, not a universal recovery rule. Stakeholders may agree tolerances, fixed review-based acceptance or other arrangements in the pilot.

For an exception, record the initiating party, target agreement/milestone, reason, actual evidence/outcome, proposed payment/refund, change in scope/date if any, and exact proposal version. Sponsor and Aamhi each approve that exact proposal. A changed proposal invalidates earlier approvals. Silence, elapsed time and verifier acceptance do not substitute for either approval.

Financial limits must remain enforceable even when exceptions are flexible: do not release more than authorised funding; do not change the beneficiary without an explicit governed amendment; do not claim unverified quantity. Zero-payment cancellation does not create a funded-outcome claim.

## 7. Disputes and continuity

Hold only the affected unreleased balance. Preserve evidence capture and operation of unrelated milestones. Record dispute reason, responsible next actor and escalation route. Resolution may request remediation, resume work, amend conditions, release an agreed partial amount, cancel or refund.

The current local contract cannot resume a milestone disputed before verification. That limitation must be resolved before representing the pilot as operationally complete. Escalation procedures should cover deadlock, incapacity, lost keys and a participant leaving the programme.

No automatic deadline-based confiscation or refund is assumed. Actual programmes should agree the treatment of expired commitments and unreachable parties before value is locked.

## 8. Attribution and double counting

Report contribution to a specified verified outcome. Do not automatically assert exclusivity over an environmental benefit. One sponsor per programme simplifies attribution but does not prevent another programme reporting the same collection event.

The target allocation ledger must identify canonical event/lot IDs, claim type, reporting period, allocated quantity, issuer/holder, status and source evidence. Exclusive allocations of the same kind must remain within eligible quantity. Reused evidence should trigger review, not automatic rejection of legitimate multi-stage lifecycle references.

Differentiate duplicate representation from legitimate lineage: a collection lot may appear in receipt and processing records, but those are different stages, not three independent recoveries. Reports must not sum the same material across stages as additional tonnes recovered.

## 9. Working capital and expenditure

The sponsor and Aamhi agree whether funds are held, advanced or staged. An operational advance records amount, purpose, recipient and reconciliation obligations. It is not evidence of completed work. Later expenditure reports attach eligible cost records, with financial review separately authorised.

Verified recovery does not establish each expense. Conversely, invoices alone do not establish a tangible recovery outcome. The product should display both assurance types if implemented, without substituting one for the other.

## 10. Processing, sale and credits

Processing attestations identify inputs, outputs, measured losses and treatment method. Material sale transfers a separately defined entitlement with its own delivery/payment terms. A credit-related handover requires scheme-specific eligibility, issuer, owner, registry reference and transfer/retirement procedure.

No automatic official credit arises from payment, token possession, coastal location or an OBP-ready label. Sponsor rights to future credits require a separate explicit agreement and external validation.

## 11. Local versus pilot policy

| Policy | Local implementation | Pilot work |
|---|---|---|
| Party authority | Fixed distinct constructor accounts | Identity/credential lifecycle and replacement |
| Agreement acceptance | Exact preset hash | Versioned configurable agreement |
| Evidence | Immutable sample manifest | Real records, corrections and access controls |
| Payment | Fixed dINR escrow | Selected policy profiles and advances |
| Exception | Joint exact financial proposal | Scope/date/remediation amendments |
| Dispute | Milestone hold and joint financial resolution | Resume, escalation and recovery |
| Attribution | Non-transferable hash/report | Canonical allocations and signed reporting |

## 12. Policy change control

Name a policy owner and version. Review business, finance, technical and operational consequences together. Test affected invariants before deployment. Keep agreed programme versions available even after a new default policy is introduced. Future providers must declare which policy capabilities they support rather than silently interpreting them differently.
