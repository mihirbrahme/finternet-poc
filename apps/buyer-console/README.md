# Buyer Console

Independent buyer-facing scaffold for Packet 6.

The console shows discovery intent, Beckn sandbox results, originator trust, indexed token state and the disabled selection placeholder. Discovery is intentionally routed through the Consumer Node and Discovery Sandbox, not through Aamhi or internal asset APIs.

Dependency modes:

- Beckn provider / consumer / discovery: `SANDBOX_ADAPTER`
- Ethereum/indexed token state: `LOCAL_MOCK`
- Settlement: `NOT_CONNECTED` until Packet 7
