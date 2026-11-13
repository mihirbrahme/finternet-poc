# Repository scope and cleanup

## Active product

The sponsorship application, its chain contracts and the handover specifications define the current product. `README.md` and `HANDOVER.md` are the entry points. There is one browser application: `apps/sponsorship-demo/`.

| Area | Role |
|---|---|
| `apps/sponsorship-demo/` | Active product interface and presentation |
| `services/sponsorship-demo/` | Active API, owned chain, evidence linkage and actual transactions |
| `beckn/sponsorship-sandbox/` | Active programme offering discovery adapter |
| `contracts/src/SponsorshipEscrow.sol` | Commitments, attestations, joint exceptions and automatic settlement |
| Participant/credential registries and dINR | Used by the active chain bootstrap and token eligibility |
| `tests/browser/`, sponsorship contract tests | Active end-to-end product and contract acceptance |
| `docs/handover/` | Current foundational, product, architecture, policy and implementation documents |
| `samples/sponsorship/` | Explicitly synthetic supporting records |

## Deliberately retained references

The tested material, evidence, tokenisation, discovery, settlement, claim and agent components still demonstrate reusable Finternet capabilities and support the planned processing/material-sale/credit lifecycle. They are not obsolete merely because they are outside the first sponsor interface.

- `services/core-api/` and `services/blockchain-indexer/`: in-memory domain/reference behavior, not a hosted persistent API.
- Material-discovery `beckn/` modules: provider/consumer separation and token-state checks.
- `agents/buyer-agent/`: bounded proposal and policy reference; not an autonomous sponsor payment agent.
- `RecoveryAsset`, `SettlementEngine`, attestation/claim contracts and tests: separate material entitlement and downstream-rights reference.
- `schemas/`, `samples/aamhi-demo/`, original domain/schema/identity tests and `deployment/scripts/demo-state.ts`: connected fixtures and regression coverage used by acceptance.
- `docs/reference/Aamhi_Recovery_Context.md`: preserved source context, subject to actual stakeholder validation.
- Docker Compose and its workbench instructions: optional infrastructure for future adapters, not current app dependencies.

Removing these connected components would discard working capabilities explicitly covered by the agreed architecture. Extract or retire them only through a later scoped engineering decision and replacement tests.

## Removed from the current tree

1. Static admin, originator, buyer/agent, processor and explorer screen prototypes. Their fixed content is superseded by the connected sponsorship interface.
2. Original project indexes/build plans, software/core/security design packs, delivery runbooks and old execution plans. The comprehensive handover documents now provide one authoritative product and architecture path.
3. Material-sale deployment/reset/seed wrappers, unused local/public address manifests and the obsolete demo-environment instructions. Their commands did not start the current sponsorship product.
4. Unused environment settings suggesting that external API keys, signing credentials or deployed contracts were needed/configured by the current launcher.
5. Historical and incomplete generated packaging intermediates were moved into the ignored `releases/archive/cleanup-2026-11-06/` directory. The verified handover ZIP, source ZIP and checksum remain in `releases/` unchanged. Automatic tool policy blocked permanent deletion, so the generated intermediates remain recoverable locally.

The removed tracked files remain available in [v0.2.1-handover](https://github.com/mihirbrahme/finternet-poc/tree/v0.2.1-handover). The cleanup does not rewrite history, move the tag or change that release's verified source.

## Release boundary

Existing `v0.2.1-handover` files are immutable historical handover artifacts and intentionally still include the pre-cleanup tree. They must not be described as a bundle of this later cleanup. A future cleaned release requires a new version/tag, validation record and package.

## Cleanup validation

After removing obsolete files and updating references, strict TypeScript, local links across 25 Markdown files, all original domain/schema/agent tests, 30 Solidity tests and all three browser scenarios passed through `test:handover`. The retained full ZIP's SHA-256 remains `81BFA8D1824F89987649EFE4CFD4C1DA6BC1273E1FC19AB302EF4EF306B97B93`. This verification does not publish or tag the cleanup.
