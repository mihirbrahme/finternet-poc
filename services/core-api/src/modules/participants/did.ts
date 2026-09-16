const DEFAULT_DID_DOMAIN = "finternet-poc.local";

export function generateDidWeb(participantId: string, domain = DEFAULT_DID_DOMAIN): string {
  return `did:web:${domain}:participants:${participantId}`;
}

export function buildDidDocument(participantId: string, did = generateDidWeb(participantId)) {
  const verificationMethodId = `${did}#keys-1`;

  return {
    "@context": ["https://www.w3.org/ns/did/v1"],
    id: did,
    controller: did,
    verificationMethod: [
      {
        id: verificationMethodId,
        type: "JsonWebKey2020",
        controller: did,
        publicKeyJwk: {
          kty: "OKP",
          crv: "Ed25519",
          x: "demo-local-placeholder-key"
        }
      }
    ],
    authentication: [verificationMethodId],
    assertionMethod: [verificationMethodId],
    service: [
      {
        id: `${did}#credential-status`,
        type: "PoCCredentialStatusService",
        serviceEndpoint: `https://finternet-poc.local/participants/${participantId}/credentials/status`
      }
    ]
  };
}
