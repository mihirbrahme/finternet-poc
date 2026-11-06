# Context and Finternet foundations

## 1. The problem this project addresses

An organisation can receive funding for a defined purpose while the funder has limited visibility into delivery. Evidence may be collected by field teams, acknowledged by a facility, assessed by a verifier and summarised separately for each sponsor. The challenge is connecting those records to an agreed commitment and payment decision without treating one party's private report as the sole source of truth.

This is a coordination and assurance problem spanning institutions. It includes financial accountability, physical-world verification, record integrity, operational judgment and the rights to report an outcome. Software cannot resolve it solely by making transfers faster.

For Aamhi, the initial application is sponsored rural recovery: demonstrate eligible collection and confirmed receipt at a facility, connect that outcome to funding, and show the sponsor a bounded, inspectable attribution record. Later stages may establish processing, material sale and authorised credit-related outcomes.

## 2. What is known, agreed and assumed

| Evidence category | Meaning | Project example |
|---|---|---|
| Repository context | Existing project material; not independently field-validated | Aamhi's rural/coastal recovery setting |
| Product-owner decision | Agreed design direction | Sponsorship first; one sponsor per programme |
| Engineering recommendation | Reviewable implementation choice | Non-transferable contract records for sponsor commitments |
| Demonstration fixture | Synthetic presentation data | Horizon Foundation, 500 kg, 10,000 dINR |
| External fact | Supported by a cited primary source | W3C VC data model and ERC-1155 interface requirements |
| Validation needed | Must be confirmed with actual parties | Contracting entity, verifier appointment, evidence feasibility |

No site visits, stakeholder interviews, real recovery measurements or sponsor agreements are asserted by this package. Product-owner approval is not a substitute for Aamhi and sponsor operational acceptance.

## 3. Aamhi's recovery context

The [existing context document](../00_project/02_Aamhi_Rural_SWM_and_OBP_Context.md) places collection before tokenisation. A representative workflow includes route identification, collection, segregation, weighing, aggregation, dispatch, facility receipt and subsequent treatment. Rural operations may face intermittent connectivity, mixed materials and variable evidence quality. These are design considerations to validate locally, not measured findings about a specific Aamhi deployment.

The platform should accept accountable records from the people who observe each event. Collection teams observe collection. A facility acknowledges arrival and measured weight. A verifier assesses whether evidence supports the agreed eligible outcome. A sponsor approves commercial exceptions with Aamhi.

Recording a receipt does not establish successful recycling. A claim about completed treatment requires a separate process and evidence threshold.

## 4. Why Finternet is relevant

The BIS Finternet paper describes interconnected financial ecosystems with user-centred services, tokenisation and supporting legal/governance arrangements. It is a vision rather than a product certification. This project's interpretation is to connect commitments, rights, trusted assertions and payment across organisations while keeping responsibilities explicit. [BIS Working Paper 1178](https://www.bis.org/publications/working-paper-1178-finternet-financial-system-future)

Our architecture is one application of those principles. It does not claim to implement a complete Finternet, a universal unified ledger or an officially endorsed reference architecture.

| Principle | Application here | Necessary qualification |
|---|---|---|
| User-centred services | Sponsor understands purpose/outcome; operators see a clear next task | Business users should not need wallet mechanics |
| Interoperability | Shared identifiers, adapter contracts and open discovery | Must be proven across independently operated systems |
| Verifiability | Evidence links, appointed attestations and inspectable receipts | Physical truth still depends on accountable processes |
| Programmability | Explicit acceptance, payment and exception conditions | Terms hashes alone do not execute arbitrary policy |
| Digital representation | Distinct programme commitments, material entitlements and attribution | Different rights need different semantics |
| Modularity | Domain rules separated from payment, evidence and identity providers | Local orchestration must be extracted for a pilot |
| Privacy | Minimal public state and controlled private evidence | Public hashes may still disclose or correlate information |
| Governance | Appointments, mutual approvals and dispute escalation | Contracts cannot invent an agreed legal resolution |

## 5. Why use a shared ledger

A shared ledger can provide a common ordering of commitments, funding, acceptance and settlement without giving either the sponsor or originator unilateral control over the history. When value and conditions share an execution environment, the contract can enforce payment rules against recorded state.

This has costs: transaction latency and fees, public metadata exposure, key management, contract defects, token administration and upgrade/recovery governance. A conventional database remains necessary for workflows, private records and projections. The reason to use blockchain is the shared economic/approval state across parties, not a claim that databases cannot store evidence.

The local chain demonstrates execution semantics. A pilot must establish whether the chosen chain, custody arrangement and operating costs provide enough benefit for the intended participants.

## 6. Tokenisation and rights

Tokenisation is useful only when a digital representation has a precise meaning: who holds a right, what can change it, whether it transfers, and what real-world agreement recognises it.

There are three distinct concepts here:

- **Material entitlement:** a defined commercial right associated with a physical lot. The original PoC explores ERC-1155-style balances and delivery-versus-payment.
- **Programme commitment:** an agreed obligation and funding allocation for a milestone. The sponsorship implementation uses identified contract state without a transfer API.
- **Outcome attribution:** acknowledgement of the sponsor's support for a verified outcome. Initially non-transferable and separate from material or credit ownership.

ERC-1155 specifies a multi-token interface; it does not by itself define legal title or environmental eligibility. Full compliance must be checked against its interfaces and receiver rules. [ERC-1155 specification](https://eips.ethereum.org/EIPS/eip-1155)

Do not mint a tradeable token merely to make the sponsorship story appear more blockchain-oriented. If future interoperability requires a token standard, select it after defining the right, transfer restrictions and external consumers.

## 7. Beckn's role

Beckn supplies an open interaction model for discovery and economic transactions. Our domain interpretation is that Aamhi publishes a recovery programme offering, a sponsor discovers it, and an agreement links the offering to milestones and funding.

Actual integration requires the selected network's transport/security and domain schemas. The official repository identifies its versioned API as the normative starting point. Pin a reviewed revision rather than relying indefinitely on a moving branch. [Beckn v2 specification repository](https://github.com/beckn/protocol-specifications-v2)

The present HTTP catalogue is a sandbox illustrating a consumer/provider boundary. It is not a conformant Beckn exchange, independent network deployment or certification.

## 8. Identity, credentials and attestations

Identity answers “which organisation/account is this?” Credentials answer “what authority or qualification has a trusted issuer asserted?” An appointment answers “is this organisation authorised for this programme?” An attestation answers “what did the authorised actor assert about this event?”

These must not collapse into one role label. A person logging in as a verifier still needs membership in the appointed organisation and valid authority for the relevant programme.

The W3C model defines credentials within an issuer–holder–verifier ecosystem. Adoption requires a selected securing mechanism, issuer trust and status policy, not merely a JSON object labelled a VC. [Verifiable Credentials Data Model 2.0](https://www.w3.org/TR/vc-data-model-2.0/)

## 9. Funding and assurance boundaries

Three separate assurances are possible:

1. **Payment assurance:** release followed agreed conditions.
2. **Outcome assurance:** accepted evidence supports the stated tangible result.
3. **Expenditure assurance:** funding was used for particular eligible costs.

The first implementation connects payment to outcome assurance. It does not establish every line of expenditure. Later financial reporting can add invoices, labour/transport records and reconciliation without replacing the outcome chain.

An advance held in escrow is different from an advance available for operations. Programme agreements should choose funding arrangements that support fieldwork rather than accidentally forcing the originator to finance it.

## 10. Reuse beyond recovery

The reusable kernel is programme → agreement → milestone → evidence → acceptance → authorised payment → attribution. Recovery-specific definitions—LDPE, facility receipt, weighing and process yield—belong to a domain profile.

For construction, acceptance might require inspection of completed work; for education, attendance and learning outcomes need a distinct methodology. Reuse requires fresh validation of evidence, authority and rights. The kernel's design is a hypothesis for extensibility, not proof that every funded purpose can use identical rules.

## 11. Success at each stage

The handover succeeds when another team understands the problem, can reproduce the local transaction and can distinguish current capability from target architecture. The pilot succeeds when real parties complete the cycle with trustworthy evidence and reconciled value. Production readiness additionally requires security review, resilience, legal/governance agreements and sustainable operations.
