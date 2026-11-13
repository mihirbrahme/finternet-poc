# Current state and gap register

“Implemented locally” means executable local integration. “Simulated” means synthetic input or a substitute for an external service. “Designed” means a target without implementation. “External” requires stakeholder/provider validation.

| Capability | Current evidence/status | Pilot requirement | Priority |
|---|---|---|---|
| Sponsorship agreement | Browser/API, preset terms, sponsor proposal and Aamhi on-chain acceptance | Programme creation and versioned amendments | High |
| Programme discovery | Separate HTTP catalogue consumer/provider; sandbox | Selected Beckn profile, signatures, callbacks and independently hosted nodes | High |
| Advance escrow | Actual local dINR deposit and conditional release | Custody review, operating advances and reconciliation | High |
| Evidence | Synthetic sample files, hashes and manifest | Uploads, private immutable storage, offline capture and retention | High |
| Facility receipt | Appointed account, evidence hash and quantity | Accountable facility onboarding and measured documentation | High |
| Verification | Appointed account, eligible quantity bounded by receipt | Real independent verification, credential revocation/replacement | High |
| Exceptions | Exact proposal approval by sponsor and Aamhi | General amendments, extensions and partial successive releases | High |
| Disputes | Hold affected milestone; joint resolution/payment/refund | Human escalation process and recovery governance | High |
| Attribution | Non-transferable hash after paid verified outcome | Readable signed reporting, corrections, cross-programme allocation | High |
| Sponsorship token standard | Contract records only; no ERC token standard claimed | Select only if external interoperability requires it | Low |
| Material ERC-1155/DvP | Existing contracts and tests, separate material-sale flow | Real custody/ownership mapping, standards review and live adapters | Later |
| Identity and credentials | Controlled accounts, local registries, original mock DID/VC services | Real onboarding, DID/VC profile, issuer governance and secure signers | High |
| API | Functional focused local API | Authentication, durable idempotency, OpenAPI and operation recovery | High |
| Frontend | Connected sponsorship walkthrough | User research, authenticated sessions, real workflows | High |
| Sponsor report | Readable live programme report, Markdown download and print | Signed/versioned/redacted external reporting | High |
| Presentation chapters | Confirmed reset plus actual local-chain checkpoint execution | Presentation tool only; not a production reset API | Local only |
| Original consoles | Removed from current tree; retained in the handover tag | Use the active sponsorship app; design future workflows from current requirements | Removed |
| Persistence | Memory plus ignored JSON snapshot; Docker PostgreSQL unused | Migrations, repositories, journal, outbox and backups | High |
| Indexer | Direct local-chain reads and session audit; original mock read model | Persistent replay, checkpoints, confirmation/reorg policy | High |
| IPFS/evidence services | Existing simulated adapters | Private object storage; optional public metadata pinning | High |
| Agent | Original deterministic buyer proposal/policy tests | Sponsor-specific tools and approval boundaries | Later |
| Payments beyond dINR | Adapter architecture only | Authorised bank/CBDC/permitted stablecoin provider and reconciliation | Later |
| Processing/material sale/credits | Existing material-sale reference and lifecycle design | Mass balance, lineage, separate rights and authoritative registries | Later |
| Operations | Console logs, receipt inspection, CI definition | Monitoring, alerts, restore drills, remote CI evidence | High |
| Hosted/public deployment | Not implemented; obsolete manifests removed | Provider selection, secrets, deployment and validation | Later |

## Limits to preserve in reporting

The demonstration asserts no actual physical recovery, sponsor commitment, production funds or official credits. Evidence and the audit listing rely on session memory; the export is not a recovery database. Restart creates a fresh chain deployment.

Role headers and unlocked accounts are local conveniences. Escrow roles are fixed constructor appointments rather than live VC checks. Only a preset fixed-payment policy is implemented; hashing terms is not execution of every policy sentence.

Exact manifest reuse is prevented only within the programme contract. Altered evidence or another programme can still report the same physical activity. Canonical lot identities and cross-programme reconciliation are pilot requirements.

Contract tests are not a security audit. Public-testnet deployment, hosted seeding and the older pilot enhancement packets are not completed by this focused handover work.

## Engineering baseline addressed

This handover adds strict TypeScript checking, Node declarations, canonical demo/acceptance commands, browser/API acceptance and CI configuration. Narrow sample-ID inference and agent audit-input typing were corrected. Original domain tests remain intact.
