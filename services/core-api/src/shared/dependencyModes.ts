export type DependencyMode =
  | "LOCAL_MOCK"
  | "SANDBOX_ADAPTER"
  | "TESTNET_REAL"
  | "PRODUCTION_LIKE"
  | "NOT_CONNECTED";

export const identityDependencyModes = {
  vcIssuer: "LOCAL_MOCK",
  proofSuite: "LOCAL_MOCK",
  participantRegistry: "LOCAL_MOCK",
  credentialRegistry: "LOCAL_MOCK",
  smartAccountProvider: "LOCAL_MOCK"
} as const satisfies Record<string, DependencyMode>;
