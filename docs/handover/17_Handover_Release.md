# v0.2.1-handover — release and transfer notes

## Scope

This baseline delivers the sponsorship reference, comprehensive Markdown foundation and executable browser experience agreed with the project owner. The package is intended for a team continuing pilot implementation.

| Area | Delivered |
|---|---|
| Product | One sponsor per programme, collection/facility-receipt milestone, flexible joint exceptions |
| Contracts | Advance dINR escrow, linked assertions, automatic same-transaction payment/attribution and refunds |
| Browser | Role palettes, guided tasks, visible commitment/ledger flow, token view, sponsor report, detailed proof and presentation chapters |
| Documentation | Business/architecture blueprints plus focused foundation, requirements, rights, data, integration, experience, test and operations specifications |
| Engineering | Strict TypeScript, original domain reference, contract/browser tests, CI definition and reproducible package scripts |

The original ERC-1155 material-sale and buyer-agent references remain included. Sponsorship records are separate non-transferable contract entries. Real evidence, production identity, durable persistence, public deployment, external Beckn conformance and bank/CBDC/stablecoin adapters remain gaps, not delivered integrations.

## Validation and acceptance

The initial `v0.2.0-handover` tag is retained as historical source. Its first remote workflow reached browser installation but failed because the moving `ubuntu-latest` runner selected Ubuntu 26.04, unsupported by Playwright 1.56.1. This patch release pins the runner to Ubuntu 24.04 without changing the product/contract behavior. The current validated package and transfer tag are `v0.2.1-handover`.

The release target includes 30 Solidity tests across five suites and three browser scenarios, in addition to the original schema/domain/agent tests. Recorded validation must pass for the exact staged source tree before packaging. The generator rejects a different committed tree or dirty worktree. Use the package's captured `VALIDATION.md` as the current execution record; historical notes in the documentation retain their original scope/date.

The receiving team should run from a clean checkout and complete the [handover checklist](07_Handover_Acceptance_Checklist.md). Aamhi/sponsor operating acceptance and independent security review are not implied by author tests.

## Package structure

```text
finternet-poc-v0.2.1-handover/
  source/          Exact tagged repository; begin with HANDOVER.md
  MANIFEST.md      Commit, tree, inventory and source archive checksum
  VALIDATION.md    Captured checks for that source tree
  evidence/        Generated role/desktop/mobile screenshots
```

The ZIP is a transfer artifact, not a hosted deployment or a preinstalled runtime. Install dependencies from `pnpm-lock.yaml`. Keep .git history through the remote repository if required. No production credentials or real wallets are included.

## Rebuild the package

From a Git checkout with changes staged, stop the interactive demo and run:

```powershell
npx --yes pnpm@10.16.1 handover:validate
```

Commit the tested source and create the annotated handover tag. Then run from the clean checkout:

```powershell
npx --yes pnpm@10.16.1 handover:package v0.2.1-handover
```

The generator writes a source ZIP and package metadata/evidence under ignored `releases/`. Expand the source ZIP into the generated package directory and compress that directory to create the complete transfer ZIP. Generate a SHA-256 sidecar for the final ZIP. These final archive operations do not alter tracked source. Package artifacts are distributed separately from the repository.

## Release handling

Push the implementation commit and version tag to the configured repository. Do not force-push or overwrite an existing tag. Inspect GitHub Actions separately: a workflow definition and local test pass do not prove a remote CI pass. Public site deployment, live contract deployment and GitHub Release publication are separate actions from preparing this package.
