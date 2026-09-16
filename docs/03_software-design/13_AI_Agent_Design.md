# Finternet PoC — AI Agent Design

**Project:** Suma Finternet PoC — Tokenised Recovery Asset Demonstrator  
**Status:** Pack 3 — Software & Data Specification  
**Purpose:** Define the AI agent's role, tools, permissions, workflow, controls and audit model so AI demonstrates Finternet composability without receiving unrestricted financial authority.

---

## 1. Objective

The AI agent should prove that a machine can interact with open Finternet capabilities through standard interfaces.

The agent must be able to:

1. understand a procurement/recovery intent;
2. discover assets through Beckn;
3. verify participant credentials;
4. inspect token and availability state on Ethereum;
5. evaluate commercial/operational constraints;
6. propose or prepare an offer;
7. create/prepare a settlement instruction within delegated policy;
8. request human approval when required;
9. monitor fulfilment and settlement status.

The agent is **not** the ledger, identity authority, oracle or settlement authority.

---

# 2. Example agent instruction

> Find up to 2,000 kg of verified LDPE recovery assets in Maharashtra, available from active credentialled originators, with an eligible processor pathway, at no more than 22 dINR/kg. Prefer fewer lots. Prepare the best eligible transaction, but obtain human approval before final settlement commitment.

This single instruction should exercise:

- semantic intent understanding;
- Beckn discovery;
- VC verification;
- Ethereum token inspection;
- rule-based filtering;
- commercial calculation;
- transaction preparation;
- controlled delegation.

---

# 3. Agent architecture

```text
User / Buyer
     ↓
Agent UI / API
     ↓
LLM Planner
     ↓
AI Agent Gateway / Policy Layer
     ↓
┌──────────────┬───────────────┬──────────────┬───────────────┐
│ Beckn Tools  │ Trust Tools   │ Chain Tools  │ Transaction   │
│              │               │              │ Tools         │
└──────────────┴───────────────┴──────────────┴───────────────┘
     ↓
Human Approval where required
     ↓
ERC-4337 delegated/session authority
     ↓
Ethereum / Beckn execution
```

The LLM never connects directly to a private key or unrestricted RPC write interface.

---

# 4. Tool set

## Discovery tools

### `discover_assets`

Inputs:

- material;
- quantity range;
- geography;
- availability date;
- maximum price where advertised;
- verification requirement.

Backend action:

- calls Beckn Consumer Node;
- returns normalized candidate resources.

### `get_asset_details`

Returns canonical and Beckn metadata.

---

## Trust tools

### `verify_participant`

Inputs:

- Participant ID / DID;
- required role;
- material code.

Returns:

- VC validity;
- on-chain eligibility;
- active account;
- relevant restrictions.

### `verify_asset_token`

Inputs:

- contract;
- token ID;
- seller account;
- required quantity.

Returns live Ethereum state:

- token exists;
- seller balance;
- available/unlocked quantity;
- blocked status;
- metadata URI;
- chain ID.

---

## Commercial tools

### `calculate_offer`

Deterministic calculation only; do not delegate arithmetic to free-form LLM output.

Inputs:

- quantity;
- unit price;
- fees/splits if configured.

Outputs total consideration.

### `prepare_offer`

Creates draft offer and Beckn selection/contract context.

### `compare_candidates`

Use deterministic constraints first, LLM reasoning second.

Hard constraints such as max price, required credential and quantity are code-enforced.

---

## Transaction tools

### `create_settlement_draft`

Creates a settlement proposal without moving assets/money.

### `request_human_approval`

Creates an approval object describing:

- seller;
- asset/token;
- quantity;
- unit price;
- maximum dINR;
- settlement conditions;
- expiry;
- agent rationale summary.

### `execute_authorised_action`

Available only when:

- delegation permits action;
- policy checks pass;
- human approval exists if required;
- transaction remains inside limits.

This tool interacts with the smart account/policy layer, not raw private keys.

---

## Monitoring tools

### `get_settlement_status`

Returns live SettlementEngine state.

### `get_attestations`

Returns qualifying fulfilment attestations.

### `get_transaction_receipt`

Returns Ethereum confirmation/event information.

---

# 5. Agent authority model

Agent authority is explicit and bounded.

Example:

```text
Material: LDPE only
Geography: Maharashtra
Max quantity: 2,000 kg
Max unit price: 22 dINR/kg
Max single transaction: 50,000 dINR
Allowed counterparties: active credentialled participants
Authority expires: 24 hours
Final settlement commitment: human approval required
```

The policy layer rejects non-compliant tool calls even if the LLM asks for them.

---

# 6. What the LLM may decide

The LLM may:

- interpret natural-language intent;
- formulate discovery parameters;
- explain results;
- rank eligible options based on user-stated criteria;
- identify missing information;
- propose quantity allocation across lots;
- prepare transaction rationale.

The LLM must not be trusted as the authoritative evaluator of:

- credential validity;
- token balance;
- price arithmetic;
- allowance/limit calculations;
- settlement state;
- signature validity;
- double-counting rules.

Those come from deterministic services/contracts.

---

# 7. Recommended end-to-end agent flow

```text
1. User states procurement intent
2. Agent extracts structured constraints
3. Policy service validates delegation limits
4. Agent calls Beckn discovery
5. Candidate assets returned
6. For each candidate:
     - verify participant VC
     - verify on-chain eligibility
     - verify ERC-1155 token existence/balance
     - obtain price/terms
7. Deterministic rules remove ineligible candidates
8. Agent compares remaining choices
9. Agent prepares offer/contract draft
10. Settlement draft created
11. Human sees transaction summary
12. Human approves
13. Smart-account operation is constructed
14. dINR funded / asset lock initiated as required
15. Agent monitors fulfilment
16. Credentialled physical attestation arrives
17. Settlement contract becomes ready
18. Agent may notify/request final trigger if policy requires
19. Atomic DvP executes
20. Agent explains final outcome with transaction links
```

---

# 8. Independent application requirement

The strongest demonstration uses the agent from the **Buyer Application**, not inside the originator's application.

The buyer agent must not have:

- direct access to originator PostgreSQL;
- privileged database credentials;
- private API shortcuts unavailable to other network participants.

It should rely on:

- Beckn discovery/contracting;
- public/authorised credential verification;
- Ethereum state;
- agreed transaction APIs.

This proves open-network interoperability.

---

# 9. Agent data handling

Do not send unrestricted evidence/PII to the LLM.

Agent context should contain only necessary data:

- public catalogue fields;
- credential verification result rather than raw KYC documents;
- token state;
- commercial terms;
- approved evidence summaries;
- transaction status.

Sensitive files remain behind controlled services.

---

# 10. Prompt-injection and untrusted content

Catalogue descriptions, documents and external text are untrusted inputs.

Controls:

- tool permissions are enforced outside the model;
- external content cannot modify delegation policy;
- model cannot obtain secrets from tool outputs;
- never execute arbitrary code/URLs from catalogue text;
- file/document content is treated as data, not instructions;
- transaction parameters are validated against schema and policy after LLM generation.

---

# 11. Human approval object

Example:

```json
{
  "approvalId": "APR-000001",
  "agentRunId": "AGR-000021",
  "participantId": "ORG-BUYER-001",
  "proposedAction": "CREATE_AND_FUND_SETTLEMENT",
  "counterparty": "ORG-AAMHI-001",
  "assetId": "RWA-RAI-2026-000001",
  "tokenId": "10001",
  "quantity": 500,
  "unitPrice": 20,
  "maximumAmount": 10000,
  "currency": "dINR",
  "expiresAt": "...",
  "status": "PENDING"
}
```

Approval must bind to exact material terms. Material changes require reapproval.

---

# 12. Agent audit log

Log every material step:

- agent run ID;
- user instruction;
- structured intent extracted;
- tools called;
- parameters sent;
- tool results references;
- candidates excluded and deterministic reason;
- human approval ID;
- delegated authority used;
- smart-account operation/tx hash;
- final outcome.

Do not log private keys, seed phrases or secret tokens.

---

# 13. Agent failure modes

The agent must gracefully handle:

- no matching Beckn assets;
- stale catalogue quantity;
- expired credential;
- chain/RPC unavailable;
- asset already reserved;
- insufficient dINR;
- approval expired;
- transaction reverted;
- missing attestation;
- settlement expired;
- discrepancy between delivered and contracted quantity.

The agent should explain the blocking fact and stop; it must not fabricate success.

---

# 14. Agent user interface

Minimum UI:

### Intent box

Natural-language task.

### Structured constraints panel

Shows interpreted:

- material;
- geography;
- quantity;
- price ceiling;
- credential requirements;
- settlement authority.

### Candidate table

Shows:

- provider;
- quantity;
- price;
- credential status;
- token verification;
- key provenance facts.

### Transaction approval card

Shows exact action before commitment.

### Execution timeline

Shows:

```text
DISCOVERED
VERIFIED
OFFER PREPARED
APPROVED
FUNDED
ASSET LOCKED
FULFILMENT
ATTESTED
SETTLED
```

---

# 15. Technology implementation

Recommended pattern:

- LLM with tool/function calling;
- backend Agent Gateway written in same enterprise backend stack as Pack 1;
- JSON Schema/Pydantic/Zod-style validation for tool arguments;
- deterministic policy engine;
- Beckn Consumer Node adapter;
- credential verification client;
- Ethereum read client;
- smart-account execution client;
- PostgreSQL audit store.

The AI provider should remain replaceable through an abstraction layer.

---

# 16. Evaluation criteria

The agent demonstration succeeds if it can:

1. discover through Beckn rather than internal DB access;
2. reject an expired/ineligible participant;
3. verify real ERC-1155 state;
4. obey hard commercial limits;
5. produce a correct transaction proposal;
6. require approval where configured;
7. execute only within delegated authority;
8. monitor the resulting Ethereum transaction;
9. explain the final result using verifiable IDs/transaction references.

---

# 17. Out of scope for first PoC

- autonomous unrestricted trading;
- speculative asset trading;
- automated fiat movement;
- legal contract negotiation by LLM;
- private-key custody by model provider;
- AI determination of regulatory eligibility without authoritative credentials/data;
- AI-generated physical attestations.

---

# 18. Definition of done

The AI layer is complete when the same tokenised asset can be discovered and prepared for transaction by an independent AI-enabled buyer application using open interfaces, while all economic authority remains constrained by credentials, deterministic policies, smart-account permissions and Ethereum contracts.
