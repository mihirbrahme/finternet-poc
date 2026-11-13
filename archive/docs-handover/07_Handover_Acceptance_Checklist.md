# Handover acceptance and validation record

## Receiving-team acceptance

- [ ] Install from a clean checkout and lockfile.
- [ ] Business owner reviews purpose, entitlement and first payable outcome.
- [ ] Present both browser scenarios and inspect actual chain receipts.
- [ ] Confirm exception attribution retains the actual 450 kg outcome.
- [ ] Run typecheck, documentation, domain/contract and browser checks.
- [ ] Understand controlled roles, synthetic evidence and temporary state.
- [ ] Accept gap register, roadmap and external decision owners.
- [ ] Obtain Aamhi/sponsor operational validation before pilot funding.
- [ ] Obtain signing, custody and contract review before live value.
- [ ] Repository owner selects release commit/tag and transfer method.

These are receiving-team actions, not boxes the author should check on its behalf.

## Author validation

Record executed results below. Commands: `pnpm typecheck`, `pnpm check:docs`, `pnpm test:acceptance`, `pnpm test:demo`, and `git diff --check`.

### Executed results — 2026-11-05

| Check | Result |
|---|---|
| Strict TypeScript check | Passed |
| Local Markdown links | Passed across 54 documentation files, including 17 handover documents; fenced example code excluded |
| Original schema/domain/agent suites | All 11 executable test files passed |
| Solidity | 29 passed, zero failed across five suites, including nine sponsorship tests |
| Browser/API | Two scenarios cover the guided programme, normal/joint-exception payments, Markdown report, rejected invalid actions, actual receipts and all four presentation chapters |
| Responsive view | 1440 px desktop and 390 px mobile screenshots inspected; no horizontal overflow at mobile width |
| Clean-source rehearsal | Fresh source-only copy, no existing dependencies/compiler artifacts; frozen-lockfile install and complete `test:handover` passed |
| Whitespace | `git diff --check` passed |

The expanded product/documentation and redesigned browser were validated again from a fresh source-only copy on the same workstation. The two browser scenarios include chapter/reset isolation, generated report content, a distinct local session ID after reset and downloaded Markdown attribution. Updated desktop overview, exception workspace, sponsor report and mobile screens were visually inspected. Source formatting was then normalised without changing behavior, and strict TypeScript was checked again.

Environment: Windows PowerShell, Node 24.11.1, pnpm 10.16.1, Foundry 1.8.3, Solidity 0.8.24, Playwright 1.56.1/Chromium. The fresh-copy rehearsal used the same workstation/toolchain and browser installation; it is not evidence of a separate machine or Linux CI run.

The CI workflow defines these checks. A remote CI pass is not asserted until an authorised push and workflow run occur. A clean-machine rehearsal by the receiving team remains required even after author-workstation validation.

### Automatic settlement and role identity — 2026-11-06

The complete `test:handover` command passed after adding participant palettes, commitment/payment-token visualisation, decoded receipt events and contract-level automatic settlement. Results: strict TypeScript and 54-document link checks passed; all original domain/schema/agent test files passed; 30 Solidity tests passed across five suites; all three browser scenarios passed.

The contract tests include token-transfer failure rolling back verification and successful retry after the token is unpaused. Browser checks assert that qualifying verification and final exception approval each contain the decision, `Transfer` and `Released` events in the same receipt, with no separate release operation. Role tests check four distinct header colours and explicit role/responsibility text. Desktop ledger/proof and role screenshots were inspected; mobile overflow is checked across all five views.

The 2026-11-05 clean-source rehearsal above describes the preceding baseline. This update was validated in the working repository; it does not assert a new receiving-team, remote CI or independent security review.

## Transfer inventory

Transfer source, lockfile, Markdown handover documents, reference specifications, samples and tests. Exclude `node_modules`, generated compiler output and local session snapshots from the source handover. Retain local receipts separately if useful, explicitly labelled temporary/local.

No production secrets or real wallets are supplied. The public-demo deployment manifest must remain pending until actual deployed addresses and receipts are recorded. No commit, push, release tag or hosted deployment is implied by this package.
