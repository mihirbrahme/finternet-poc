/** Local discovery adapter, not a certified Beckn network implementation. */
export const offering = Object.freeze({
  resourceId: "OFFER-AAMHI-RECOVERY-001",
  providerId: "ORG-AAMHI-001",
  providerDid: "did:web:demo.invalid:aamhi",
  title: "Aamhi verified recovery programme",
  district: "Raigad", material: "PLASTIC-LDPE",
  milestoneTargetKg: 500, milestoneBudgetDinr: 10000,
  paymentPolicy: "FIXED_ON_VERIFIED_ACCEPTANCE",
  attribution: "FUNDED_COLLECTION_AND_FACILITY_RECEIPT",
  dependencyMode: "SANDBOX_ADAPTER",
  protocolStatus: "LOCAL_DISCOVERY_SHAPE_NOT_NETWORK_CERTIFIED"
});

export async function discoverProgrammes(providerUrl: string, material: string) {
  const response = await fetch(`${providerUrl}/catalogue`);
  if (!response.ok) throw new Error("Discovery provider unavailable");
  const catalogue = await response.json() as { resources: typeof offering[] };
  return {
    dependencyMode: "SANDBOX_ADAPTER",
    transport: "HTTP_PROVIDER_TO_CONSUMER",
    resources: catalogue.resources.filter(item => item.material === material)
  };
}
