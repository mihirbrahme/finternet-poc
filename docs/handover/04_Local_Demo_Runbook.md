# Local sponsorship demonstration and presenter runbook

## 1. Purpose

Show the product's business value: a sponsor can follow funding to an accepted tangible outcome, inspect the evidence and understand the resulting payment. Demonstrate Finternet capabilities through real local-chain transactions while keeping field evidence, parties and money clearly synthetic.

Use the [business blueprint](01_Business_Use_Case_and_Pilot_Blueprint.md) and [foundations](08_Context_and_Finternet_Foundations.md) for context beyond this walkthrough. The demo is an illustration of the architecture, not its full implementation.

## 2. Prerequisites and launch

Node 24.11.1, pnpm 10.16.1, Foundry 1.8.3 (`forge`/`anvil` on PATH), Solidity 0.8.24. Node 22–24 is permitted. The launcher attempts an offline build first, then a bounded normal build if needed. The first compiler installation may need internet access. No Docker, database, API key, `.env`, real wallet or external RPC is required.

```powershell
npx --yes pnpm@10.16.1 install --frozen-lockfile
npx --yes pnpm@10.16.1 demo:run
```

Open **http://127.0.0.1:4300**. Use the exact `127.0.0.1` host. The launcher owns Anvil on 18545 and catalogue endpoint on 4301, refuses to attach to an existing chain, and proposes two sample milestones with a 20,000 dINR sponsor balance.

API/provider ports may be changed with `DEMO_PORT`/`DEMO_DISCOVERY_PORT`; the chain port remains fixed. Ctrl+C stops the launcher and owned chain. Restart creates a fresh deployment. The legacy `demo:reset` command belongs to the earlier material-sale reference, not sponsorship.

## 3. The programme story

The fictional Horizon Foundation supports Aamhi's Raigad recovery programme. Two routes each target 500 kg of LDPE collection and facility receipt, with 10,000 dINR allocated per milestone. The first reaches 500 kg. The second records 450 kg; both parties can accept a fixed-payment exception without inflating the outcome. The completed scenario records 950 kg verified and 20,000 dINR paid.

Horizon Foundation and the named facility/verifier are illustrative labels for controlled accounts. The landscape is an illustration, not a field photograph. No actual recovery or organisation endorsement is asserted.

## 4. Interface orientation

| View | Presenter's explanation |
|---|---|
| Overview | Purpose, budget, deposited/held/released funding, actual verified quantity and next actor |
| Milestone workspace | One task at a time with explicit participant responsibility |
| Evidence & assurance | Collection context, facility receipt, verifier finding and integrity disclosure |
| Sponsor report | Understandable outcome and financial summary; Markdown download and print |
| Finternet proof | Capability boundaries and actual local-chain transaction receipts |

The overview's guided next-step button opens the relevant task and role. Later **Continue as…** buttons switch the local presentation perspective. The role selector permits independent exploration. Role switching is not production authentication.

## 5. Full manual walkthrough

1. Start at **Overview**. Explain the distinction between the 20,000 dINR planned budget and zero funding deposited/paid. Targets are not achieved outcomes.
2. Choose **Continue as Sponsor**. In the workspace, **Discover a recovery programme** fetches the separate HTTP catalogue. Explain the sandbox boundary.
3. **Initiate sponsorship agreement** and review the purpose, evidence requirement and preset policy.
4. Continue as **Aamhi team** and **Accept programme terms** for milestone 1. The contract records acceptance of the exact terms hash.
5. Continue as **Sponsor** and **Fund milestone escrow**. The funds are held, not yet available operating cash.
6. Continue as **Aamhi team**. Review the collection context and **Submit recovery evidence**. The sample package is fingerprinted and linked to the milestone.
7. Continue as **Receiving facility**, enter/retain 500 kg and **Confirm facility receipt**.
8. Continue as **Independent verifier**, review the evidence, retain 500 kg and **Verify eligible outcome**.
9. Observe automatic payment: qualifying verification releases 10,000 dINR and records attribution in the same transaction. No release button or administrator action is required.
10. Inspect **Overview** and **Evidence & assurance**. Only 500 kg is verified; only 10,000 dINR is paid.
11. Select milestone 2 in the workspace. Repeat acceptance, funding, evidence, facility receipt and verification using 450 kg.
12. Review the shortfall explanation. As Aamhi, **Propose exception** with an explicit reason and 10,000 dINR payment.
13. As Sponsor, review and **Approve this exact exception**. One approval is insufficient.
14. As Aamhi, approve the same proposal. That final required approval automatically releases the agreed payment and records attribution in the same transaction.
15. Open **Sponsor report**. Confirm 950 kg actual outcome and the explained 450 kg exception. Download Markdown if useful.
16. Open **Finternet proof** and inspect a **View receipt** entry. Successful status and block/hash come from the local chain.

## 6. Short presentation using chapters

Open **Presentation chapters** in the top bar. Loading a chapter asks for confirmation because it replaces current local progress. It restores only this owned demo's baseline snapshot, then executes new transactions to construct the requested chapter.

| Chapter | What to show |
|---|---|
| The commitment | Purpose, discovery and agreement from a fresh state |
| Funding secured | Full advance escrow and the evidence/verification workflow |
| When reality differs | First milestone paid; second verified at 450 kg and ready for joint exception |
| The outcome & the proof | Completed report, accurate aggregate and underlying receipts |

Prepared chapters are labelled actual local-chain execution with illustrative inputs. They are not claimed historical activity. New timestamps and evidence fingerprints may produce different transaction hashes; that is expected. Download any current report before resetting if it is needed for comparison.

## 7. Optional financial variations

In a fresh review chapter, propose less than 10,000 dINR to demonstrate partial payment and refund of the remainder. A jointly approved zero payment cancels/refunds without issuing paid-outcome attribution. These are alternative scenarios, not additional payments against a closed milestone.

The local contract does not implement broad agreement amendments or resumption of a milestone disputed before verification. Use the normal post-verification exception story when demonstrating flexibility, and disclose broader pilot work if asked.

## Role identity and ledger visibility

Sponsor uses indigo, Aamhi uses green, facility uses teal and verifier uses purple. The header, responsibility strip, action colours and commitment card change together. Role names and responsibilities remain explicit so colour is not the only signal.

The overview/workspace show a live ledger flow. The proof view distinguishes the dINR payment token, a non-transferable programme commitment and outcome attribution. Decoded receipt events show the triggering verification/approval, token `Transfer` and `Released` in the same transaction. Environment and integration limits remain available in the collapsed system-details disclosure; the main journey uses product language.

## 8. Inspect and retain

The proof view exposes confirmed receipts, terms and account/contract bindings. `/api/export` returns session JSON. `deployment/local-demo/session.json` is an ignored inspection snapshot, overwritten by new execution. The sponsor report is generated from current state, downloadable as Markdown, unsigned and not independently certified.

The public-demo manifest is unchanged. No live network deployment is recorded by this run.

## 9. Validation

Stop an interactive demo before testing; the test runner needs its own clean server/chain.

```powershell
npx --yes pnpm@10.16.1 exec playwright install chromium
npx --yes pnpm@10.16.1 test:handover
git diff --check
```

The aggregate command runs strict TypeScript, local Markdown links, original domain/schema/agent tests, Foundry tests and browser/API acceptance. The browser suite checks guided roles, exceptions, Markdown reporting, actual receipts, mobile overflow and presentation reset/chapter balances. Linux CI installs Chromium with `--with-deps`.

## 10. Troubleshooting

| Symptom | Action |
|---|---|
| pnpm missing | Use pinned `npx --yes pnpm@10.16.1` |
| forge/anvil missing | Install the documented toolchain and update PATH |
| Compiler/build startup problem | Run `forge build --root contracts --offline`; install compiler through a normal build if absent |
| Port occupied | Identify intended prior session; never reset an unidentified node |
| Host rejected | Use printed `127.0.0.1` URL |
| No action for current role | Follow **Continue as…** or select the responsible role |
| Contract rejects payment | Check funding, receipt, verification and exact joint approvals |
| Unknown transaction outcome | Refresh/inspect receipts before retrying |
| Browser binary missing | Run Playwright installation above |
| Session lost | Relaunch fresh; durable recovery belongs to pilot work |

Identify any orphaned process by command line and ports before stopping it. Never kill all Node/Anvil processes. A separate clean-checkout rehearsal by the receiving team remains a handover step.
