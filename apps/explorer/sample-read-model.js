window.finternetExplorerSample = {
  assetId: "RWA-RAI-2026-000001",
  tokenId: "13653181654073811839412956159143577174351971225610535796116340564408590798707",
  totalSupply: 1000,
  balances: {
    "ORG-AAMHI-001": 500,
    "ORG-BUYER-001": 500
  },
  lockedBalances: {
    "ORG-AAMHI-001": 0
  },
  metadataUri: "ipfs://bafy-local-2e5e7ac8b9fb532d",
  evidenceRoot: "0x9c64b54f3e55f81e2a2c8ea4f452a41e1ef35cc8ad7080e9ff0a4ec8a7da6bb4",
  mintTxHash: "0x6ecb9607697137585530fd9b3de77a4b6f0ca2448f219be7d7c03c4a618b73ab",
  dependencyMode: "LOCAL_MOCK",
  settlement: {
    settlementId: "STL-000001",
    contractId: "CTR-000123",
    state: "SETTLED",
    dinr: {
      buyerParticipantId: "ORG-BUYER-001",
      sellerParticipantId: "ORG-AAMHI-001",
      amount: 10000,
      status: "RELEASED"
    },
    asset: {
      sellerParticipantId: "ORG-AAMHI-001",
      buyerParticipantId: "ORG-BUYER-001",
      quantity: 500,
      status: "TRANSFERRED"
    },
    timeline: [
      {
        state: "CREATED",
        summary: "Settlement created from Beckn contract CTR-000123.",
        txHash: "0x3a4d...0001"
      },
      {
        state: "FUNDED",
        summary: "Buyer escrowed 10,000 dINR.",
        txHash: "0x7be4...d007"
      },
      {
        state: "READY",
        summary: "Aamhi locked 500 ERC-1155 units.",
        txHash: "0xa55e...1155"
      },
      {
        state: "SETTLED",
        summary: "Asset units moved to buyer and dINR released to Aamhi.",
        txHash: "0xdvp0...0001"
      }
    ]
  },
  attestations: [
    {
      attestationId: "ATT-000001",
      type: "ASSET_VERIFIED",
      participantId: "ORG-VERIFIER-001",
      quantity: 1000,
      unit: "kg",
      evidenceManifestId: "EVM-000001",
      evidenceHash: "0x9c64b54f3e55f81e2a2c8ea4f452a41e1ef35cc8ad7080e9ff0a4ec8a7da6bb4",
      txHash: "0xatt0...0001"
    },
    {
      attestationId: "ATT-000002",
      type: "RECEIPT_CONFIRMED",
      participantId: "ORG-PROCESSOR-001",
      settlementId: "STL-000001",
      quantity: 500,
      unit: "kg",
      evidenceManifestId: "EVM-000001",
      evidenceHash: "0x9c64b54f3e55f81e2a2c8ea4f452a41e1ef35cc8ad7080e9ff0a4ec8a7da6bb4",
      txHash: "0xatt0...0002"
    }
  ],
  claims: [
    {
      claimId: "CLM-000001",
      type: "OBP_READY_RECOVERY_CLAIM",
      holderParticipantId: "ORG-BUYER-001",
      issuerParticipantId: "ORG-AAMHI-001",
      sourceAttestationIds: ["ATT-000002"],
      quantity: 500,
      unit: "kg",
      isOfficialCredit: false,
      evidenceReferences: [
        {
          evidenceManifestId: "EVM-000001",
          evidenceHash: "0x9c64b54f3e55f81e2a2c8ea4f452a41e1ef35cc8ad7080e9ff0a4ec8a7da6bb4"
        }
      ],
      boundaryStatement:
        "OBP-ready recovery claim is evidence-backed for this PoC and is not official OBP credit issuance, an EPR certificate, or a government claim.",
      status: "ACTIVE",
      txHash: "0xclm0...0001"
    }
  ]
};
