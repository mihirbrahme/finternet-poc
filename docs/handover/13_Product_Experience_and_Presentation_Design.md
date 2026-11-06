# Product experience and presentation design

## 1. Experience objective

A viewer should understand what was funded, what was accepted, who confirmed it and why money moved. An operator should know the next task and its consequences. A reviewer should be able to inspect the underlying record without forcing every user through cryptographic details.

The same model supports the operational product and a guided demonstration, but presentation shortcuts must be visibly labelled and must not bypass the underlying domain rules.

## 2. Information architecture

| View | User question | Information priority |
|---|---|---|
| Programme overview | What are we trying to achieve and where are we? | Purpose, planned/deposited/held/paid funding, verified outcome, next actor |
| Milestone workspace | What needs to happen next? | Current task, role, input, conditions and consequences |
| Evidence and assurance | What supports the outcome? | Collection context, receipt, verifier finding and integrity detail |
| Sponsor report | What can I accurately report? | Contribution, actual quantity, payments, exceptions and boundaries |
| Finternet proof | What makes the shared record verifiable? | Capability status, contracts, account bindings and actual receipts |

Each page has a clear title, concise explanation and a visible indication of local/synthetic status. The product story appears before technical implementation identifiers.

## 3. Visual direction

Use a calm editorial treatment: warm neutral surfaces, deep green for purposeful actions, restrained natural illustration, readable typography and generous spacing. Amber identifies a review or exception; blue indicates a pending external authority; success is communicated with words and symbols as well as colour.

Participant identity has its own palette: sponsor indigo, Aamhi green, facility teal and verifier purple. Header, current-responsibility strip, primary controls and commitment card share the active participant's theme. Status labels remain independent; an exception is still amber in every role. Product language leads the journey, with environment/fixture/integration details retained in system disclosures and the handover package.

The rural landscape is an original vector illustration, explicitly not field evidence. Never use an illustrative scene as proof that collection occurred. Organisation names in the demo are fictional presentation labels.

Hierarchy: programme purpose → outcome/funding metrics → next action → milestone progress → supporting detail. Avoid an all-controls dashboard where users must infer a workflow from disabled buttons.

## 4. Metrics and truthful labels

Programme budget is a planned allocation. Funding secured means deposited locally, including amounts later paid/refunded. Held funding is current escrow value. Payment released is confirmed value delivered to Aamhi. Verified recovery means accepted collection plus facility receipt; it is not a recycled-output metric.

Do not infer progress from money spent. Do not display projected target as achieved impact. Show received, verified and targeted quantities separately, particularly when a full fixed payment follows a shortfall exception.

## 5. Task and transition design

The workspace shows one primary action for the current stage. When the next actor differs from the active role, an explicit “Continue as…” action changes the local presentation perspective. It does not claim authenticated organisational delegation.

Before an exception approval, display actual outcome, reason, proposed payment, refund and approval status. Preserve the exact proposal hash behind a disclosure. Before payment, display beneficiary, amount and acceptance basis.

Explain before verification/final approval that satisfying the conditions settles automatically. Do not ask an administrator to press a separate release button. Show confirmation from actual receipt events rather than an animated prediction of payment. Distinguish fungible dINR from the non-transferable commitment and attribution records.

Pending confirmation uses a clear working state and prevents duplicate action. Errors preserve input and explain the likely domain condition. In a pilot, uncertain financial results need a separate reconciliation state rather than a generic retry message.

## 6. Evidence design

Use human-readable cards for collection, receipt and verification. Show the issuer/source, quantity, status and relevant context. File fingerprints and raw manifests are available through disclosure. A missing submission should be shown as missing, not replaced with a plausible-looking completed document.

The current sample package is synthetic. A production evidence viewer must add scoped file access, genuine document previews, integrity status, version history, findings and correction links.

## 7. Report design

The report is an explicit product output, not a transaction dump. Show agreed programme identity, contribution, verified outcomes, payments/held/refunded amounts and exceptions. Include language the sponsor may use and excluded claims.

The current report is generated from local state, downloadable as Markdown and printable. It is unsigned and not independently certified. A pilot report requires access/redaction policy, report versions, source references and an optional selected signing/attestation scheme.

## 8. Presentation chapters

| Chapter | State prepared | Narrative purpose |
|---|---|---|
| The commitment | Fresh programme and preset proposed terms | Explain purpose, discovery and mutual acceptance |
| Funding secured | Both terms accepted and 20,000 dINR deposited | Explain held value and evidence workflow |
| When reality differs | Milestone 1 paid; milestone 2 verified at 450 kg | Demonstrate operational judgment and joint exception |
| The outcome and proof | Both milestones paid, 950 kg verified | Explain accurate attribution and inspect receipts |

Loading a chapter requires confirmation. It restores only the owned local chain's baseline and executes new transactions for the requested state. It is not a replay of actual field history. Current local progress is replaced. The UI labels the prepared chapter and transaction provenance.

## 9. Accessibility and responsive behavior

Support keyboard navigation, semantic headings, explicit input labels, visible focus, status announcements, reduced motion and mobile layouts. Long hashes must wrap. Reports must print without app navigation. Horizontal overflow at narrow widths is a failure, not an acceptable technical-detail exception.

Automated screenshots and overflow checks supplement, but do not replace, manual contrast/keyboard/screen-reader review or user research. The local role selector is a demonstration control and should not define the pilot's login experience.

## 10. Presentation acceptance

Without opening technical detail, the viewer should correctly explain programme purpose, verified quantity, next actor, payment basis and sponsor entitlement. A technical reviewer should locate terms, evidence reference, verifier transaction, exception approvals and release receipt. Rehearse both paths without terminal intervention after launch.
