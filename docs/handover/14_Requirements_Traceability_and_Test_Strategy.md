# Requirements traceability and test strategy

## 1. How to use this register

Trace requirements from business need through policy, implementation and verification. The existence of a local test does not establish external operational validity. Entries below distinguish local behavior from pilot acceptance work.

| Need / requirement | Policy / design | Current implementation | Evidence / remaining gate |
|---|---|---|---|
| Understand funded purpose / PR-01 | Offering states outcome and scope | Catalogue adapter and overview | Browser discovery; external Beckn conformance pending |
| Mutual agreement / PR-02 | Exact version accepted before funding | `acceptTerms`, terms hash | Contract/browser checks; pilot amendment/version tests |
| Funding accountability / PR-03 | Separate planned/deposited/held/paid/refund | Escrow state and report amounts | Balance checks; external provider reconciliation pending |
| Evidence linkage / PR-04 | Manifest binds source records to milestone | Sample manifest/hash | Browser/API; real ingestion/access/version tests pending |
| Facility confirmation / PR-05 | Appointed facility asserts receipt | `confirmReceipt` | Wrong/mismatched evidence contract tests; field process validation pending |
| Eligible outcome / PR-06 | Verifier quantity bounded by receipt | `verify` | Contract negative quantity/role tests; findings workflow pending |
| Conditional release / PR-07 | Verification required for paid outcome | `release` | Missing verification/shortfall rejection and actual receipt checks |
| Flexible exception / PR-08 | Both parties approve same proposal | `proposeException`, `approveException` | One/stale/revised approval rejected; full exception browser path |
| Operational continuity / PR-09 | Isolate affected milestone | Per-milestone dispute state | Contract isolation test; resume/remediation pending |
| Accurate attribution / PR-10 | Actual accepted quantity, bounded rights | Attribution hash and report | Report retains 450 kg; cross-programme deduplication pending |
| Inspectability / PR-11 | Linked history and source receipts | Proof view, export | Actual chain receipt inspection; durable replay pending |
| Offline operations / PR-12 | Capture then sync with identity/versioning | Not implemented | Field tests and duplicate/conflict handling required |
| Corrections / PR-13 | Append/supersede rather than overwrite | Immutable local manifest | Pilot correction, revocation and report revision tests |
| Processing / PR-14 | Many-to-many lot lineage and losses | Designed | Allocation and mass-balance property tests |
| Payment portability / PR-15 | Capability-aware authorisation adapters | dINR only | Provider-specific confirmation, retry, FX and refund tests |
| Bounded agent / PR-16 | Deterministic authority and human exceptions | Existing material buyer agent | Sponsorship-specific policy/tools pending |

## 2. Test layers

1. Domain tests cover state guards, versioning, quantities, budgets and rights without infrastructure.
2. Contract tests cover authority, evidence binding, conservation, settlement and approvals on EVM.
3. Adapter contract tests cover database, storage, identity, discovery and payment provider semantics.
4. API tests cover authenticated actors, input validation, idempotency and operations.
5. Browser tests cover comprehension-critical workflows, reports, confirmation and navigation.
6. Operational tests cover restart, restore, outages, reconciliation and replay.
7. Stakeholder acceptance covers physical evidence feasibility, authority, cashflow and reporting accuracy.

The current suite covers the original domain reference, Solidity behavior, local API and connected browser journeys. It is not a complete operational or stakeholder acceptance suite.

## 3. Local browser scenarios

The primary scenario discovers/selects, accepts and funds both milestones, submits evidence, confirms receipt, verifies outcomes, settles the standard milestone, rejects an unapproved shortfall release, records exact joint approval and settles the exception. It inspects actual receipts and downloads a Markdown report containing the real 950 kg aggregate and 450 kg exception outcome.

Settlement now occurs inside qualifying verification or final joint approval. Browser acceptance checks `Verified`/`ExceptionApproved`, token `Transfer` and `Released` events in the same receipt, and verifies that no separate release action was submitted. A role-identity scenario checks four distinct header colours and explicit participant responsibilities. The proof view displays the dINR token and non-transferable commitment separately.

Presentation tests prepare review, fresh, complete and funded chapters. They verify balances and projections after resets, ensuring earlier completed state does not leak into a new chapter. Desktop/mobile screenshots and overflow checks exercise the principal pages.

## 4. Required pilot failure tests

| Scenario | Expected result |
|---|---|
| Same request repeated | Same operation, no second payment |
| Proposal revised during approval | Earlier approval cannot authorise new terms |
| Chain succeeds, API response fails | Operation recovers by transaction reference |
| Provider times out after submission | Mark unknown and reconcile before retry |
| Object content altered | Integrity check fails; acceptance cannot silently proceed |
| Credential revoked | Follow documented current-action/historical-record policy |
| Signer/account lost | Governed replacement, no unilateral beneficiary change |
| Chain reorg | Affected confirmation/projection repaired |
| Same physical recovery in two programmes | Review allocation/conflict instead of inflating eligible total |
| Dispute before verification | Remediation/resume or joint cancellation available |
| Backup restored | All open financial operations reconciled to authoritative source |

## 5. Invariants

For each payment instrument, funded value reconciles to held plus paid plus refunded value, with explicit fees/adjustments where supported. Instrument conversion requires a separate recorded FX leg. For recovery, allocated quantities reconcile to eligible source quantities under the applicable claim type and measurement tolerance. Programme and report totals must not sum repeated lifecycle stages as additional material.

Use property tests for financial/quantity conservation and adversarial tests for signer, proposal and actor boundaries. Independent review is required before live custody even if all automated checks pass.

## 6. Acceptance evidence

Record exact source version, toolchain, commands, results, known failures, environment and reviewer. Preserve generated screenshots or session references separately from source if required. Remote CI, clean-machine rehearsal, independent interoperability and stakeholder sign-off are separate evidence categories; do not infer one from another.
