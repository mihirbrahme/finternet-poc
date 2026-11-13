# Engineering roadmap

The local handover includes a focused API and connected browser demo. The remaining pilot work should proceed in dependency order. Preserve the original material-sale and new sponsorship acceptance tests.

| Order | Work package | Deliverable and acceptance gate |
|---|---|---|
| 1 | Validate operating model | Actual contracting entities, agreement, verifier, evidence and reporting accepted by Aamhi/sponsor |
| 2 | API/domain boundary | Extract typed programme, milestone, evidence, verification, exception, payment-authorisation and attribution services; API specification and transition tests |
| 3 | Persistence | PostgreSQL migrations, repositories, immutable versions, operation journal, outbox and idempotency; restart/concurrent retries cannot double-pay |
| 4 | Identity/signing | Authentication, participant authorisation, DID/VC profile, revocation and secure signers; forged role headers fail |
| 5 | Evidence operations | Private object storage, scoped access, retention, facility documentation and offline-sync design; verifier retrieves authentic records |
| 6 | Pilot contract/policy | Amendments, appointments, operating advances and reconciliation; independent review and funds-conservation tests |
| 7 | Chain adapter/indexer | Recorded deployments, confirmation policy, replay, reorg handling and reconciliation; projections rebuild from events |
| 8 | Operational apps | Authenticated sponsor, Aamhi, facility, verifier and reviewer flows validated by actual users |
| 9 | Beckn integration | Select current domain/network profile; signed endpoints/callbacks and independent interoperability tests |
| 10 | Hosted pilot/operations | Secrets, monitoring, backups, incident/dispute runbooks, restore drill and capped pilot rehearsal |
| 11 | Downstream lifecycle | Processing lineage, mass balance, material sale and authorised claims; rights and quantities reconcile |
| 12 | Additional payments | Selected authorised bank/CBDC/permitted stablecoin adapter; custody, FX, confirmation and reconciliation validated |

Estimate effort only after team capacity, providers, pilot scope and field evidence are known. Persistence, authorisation, signing and recovery must precede handling live value.

## Library and adapter design

The current demo runtime combines deployment, evidence construction, signing and projection. Extract domain decisions behind typed services rather than expanding this orchestration file into the production backend. Infrastructure stays behind identity, evidence, discovery, payment and chain adapters.

A domain decision creates an authorised operation tied to an agreement version and supporting evidence. An adapter executes it; durable confirmation reconciles its result. Use business operation IDs and idempotency keys rather than relying on one process's busy flag. Existing memory services are patterns, not a persistence specification.

## Pilot verification priorities

Test concurrent approvals/amendments, retries, chain/provider success followed by API failure, signer outage, revoked credentials, role replacement, paused token, backup restoration, altered or inaccessible evidence, cross-programme duplicate activity and delayed external payments. Property tests should cover funded versus paid/refunded/held value and allocated versus eligible quantities.

Co-funding, transferable sponsorship, automatic official credits, FX conversion, bridges and autonomous agent spending remain deferred. A future sponsor assistant may prepare proposals, but deterministic limits and human exception approval remain authoritative.
