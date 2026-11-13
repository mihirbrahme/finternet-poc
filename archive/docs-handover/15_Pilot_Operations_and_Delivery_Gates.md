# Pilot operations and delivery gates

## 1. Ownership model

Assign named owners for programme operations, finance/reconciliation, evidence/privacy, verification, application delivery, chain/signing, discovery integration and incident response. A small team can combine roles if conflicts and escalation are explicit.

The implementation team owns technical delivery, but does not decide legal funding classification, material ownership, credit eligibility or verifier legitimacy without the relevant parties.

## 2. Delivery gates

| Gate | Evidence needed | Decision |
|---|---|---|
| Product baseline | Stakeholders validate purpose, roles, evidence, funding access and reporting | Approve initial programme profile |
| Architecture baseline | Domain model, authority, payment/provider and data boundaries reviewed | Approve implementation contracts |
| Technical integration | Persistent operations, auth, evidence store, signer and replay tested | Admit controlled integration users |
| Custody readiness | Contract/payment review, recovery, reconciliation and capped funds policy | Permit agreed live value |
| Operational pilot | Training, monitoring, incident and dispute rehearsal | Start limited programme |
| Pilot closeout | Funds reconcile, outcomes reviewed, reports accepted, gaps assessed | Extend or revise scope |

The local demonstration supports product/architecture discussion. It does not automatically satisfy custody or operational gates.

## 3. Routine operating procedures

Daily or at an agreed cadence, review pending verifier work, missing evidence, disputed milestones, unknown payments, signer/provider failures and reconciliation differences. Assign each issue an owner and next action. Notify parties without exposing private evidence in unrestricted messages.

Before payment, verify the effective agreement, authority, acceptance basis, funding availability and operation uniqueness. After submission, track confirmation independently of browser availability. At programme close, reconcile deposits, advances, paid/refunded/held amounts, unresolved claims and report versions.

## 4. Incident and recovery procedures

| Incident | Immediate action | Recovery requirement |
|---|---|---|
| Suspected false evidence | Pause affected review/payment, preserve records | Independent assessment and append correction |
| Signer compromise | Suspend relevant execution and secure keys | Governed replacement and transaction reconciliation |
| Provider outage | Queue authorised operations with visible status | Status lookup before retry |
| Database loss | Restore validated backup; stop uncertain submissions | Replay outbox/indexer and reconcile every open payment |
| Evidence unavailable | Mark verification blocked, retain other work | Restore object version and verify fingerprint |
| Financial discrepancy | Flag amount/instrument/reference and stop affected retry | Finance-led reconciliation with authoritative provider |
| Programme deadlock | Hold affected funds and invoke agreed escalation | Recorded resolution, not an administrator override |

Define response targets after pilot staffing and hours are known. Avoid promising around-the-clock support without an operating team.

## 5. Monitoring

Track API failures/latency, operation age, evidence retrieval/integrity failures, verification turnaround, unresolved disputes, exception approvals, payment unknown/failed states, reconciliation discrepancies, contract balances and indexer lag. A dashboard must distinguish business waiting from technical failure.

Log correlation IDs and actor/business references; redact secrets and sensitive evidence. Alert on actionable conditions with named owners rather than collecting metrics without a response process.

## 6. Training and rehearsal

Train sponsor, Aamhi, facility and verifier separately on their responsibilities and the limits of claims. Rehearse normal acceptance, a shortfall, missing evidence, dispute, cancelled milestone and payment timeout. Confirm how field teams obtain operating funds before requiring proof of completed work.

## 7. Handover completion

Transfer source and dependency lockfile, authoritative Markdown, current gaps, API/domain contracts, deployment/recovery instructions, test evidence and decision ownership. Confirm the receiving team can explain the rights and reproduce the flow. Release tagging, repository access and hosted deployment remain explicit owner-managed actions.
