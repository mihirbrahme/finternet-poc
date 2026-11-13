import { sha256CanonicalJson } from "../../shared/hash.js";
import type { CanonicalJsonValue } from "../../shared/canonicalJson.js";
import type { CredentialService } from "../credentials/service.js";
import type { RecoveryAssetService } from "../assets/service.js";
import { SimulatedIpfsAdapter } from "./ipfsAdapter.js";
import { TokenisationRepository } from "./repository.js";
import type {
  SubmittedMintTransaction,
  TokeniseAssetInput,
  TokeniseAssetResult,
  TokenMetadata,
  TokenisedAssetRecord
} from "./types.js";

export class TokenisationService {
  constructor(
    private readonly assets: RecoveryAssetService,
    private readonly credentials: CredentialService,
    private readonly repository = new TokenisationRepository(),
    private readonly ipfs = new SimulatedIpfsAdapter()
  ) {}

  tokeniseAsset(input: TokeniseAssetInput): TokeniseAssetResult {
    const existing = this.repository.getByAssetId(input.assetId);
    if (existing) {
      throw new Error(`Asset already tokenised: ${input.assetId}`);
    }

    const asset = this.assets.requireAsset(input.assetId);
    if (asset.verificationStatus !== "VERIFIED" || asset.lifecycleStatus !== "VERIFIED") {
      throw new Error(`Asset is not verified for tokenisation: ${asset.assetId}`);
    }
    if (!asset.evidenceRoot) {
      throw new Error(`Verified asset has no evidence root: ${asset.assetId}`);
    }
    if (!asset.verificationAttestationId) {
      throw new Error(`Verified asset has no verification attestation: ${asset.assetId}`);
    }

    const credentialResult = this.credentials.verifyCredential({
      credentialId: input.tokeniserCredentialId,
      requiredRole: "NETWORK_ADMIN",
      accountAddress: input.tokeniserAccount,
      at: input.submittedAt
    });
    if (!credentialResult.valid) {
      throw new Error(`Tokeniser credential invalid: ${credentialResult.reason}`);
    }
    if (credentialResult.credential?.participantId !== input.tokeniserParticipantId) {
      throw new Error(`Tokeniser credential does not belong to participant: ${input.tokeniserParticipantId}`);
    }

    const submittedAt = input.submittedAt ?? new Date().toISOString();
    const tokenId = deriveTokenId(asset.assetId);
    const metadata = this.buildMetadata(asset.assetId, tokenId, submittedAt);
    const ipfsResult = this.ipfs.publishMetadata(metadata);
    const mintTransaction = this.submitMintTransaction({
      assetId: asset.assetId,
      tokenId,
      metadataUri: ipfsResult.uri,
      evidenceRoot: asset.evidenceRoot,
      tokeniserAccount: input.tokeniserAccount,
      chainId: input.chainId ?? 31337,
      contractAddress: input.contractAddress ?? "0x0000000000000000000000000000000000001155",
      submittedAt
    });

    const token: TokenisedAssetRecord = {
      schemaVersion: "1.0",
      assetId: asset.assetId,
      tokenId,
      totalSupply: asset.quantity.verified,
      holderBalances: {
        [asset.custody.currentParticipantId]: asset.quantity.verified
      },
      lockedBalances: {},
      metadataUri: ipfsResult.uri,
      metadataCid: ipfsResult.cid,
      metadataHash: ipfsResult.contentHash,
      evidenceRoot: asset.evidenceRoot,
      verificationAttestationId: asset.verificationAttestationId,
      mintTransaction
    };

    asset.lifecycleStatus = "TOKENISED";
    asset.updatedAt = submittedAt;
    this.repository.save(token);

    return {
      asset,
      metadata,
      ipfs: ipfsResult,
      token,
      mintTransaction
    };
  }

  getTokenisedAssetByAssetId(assetId: string): TokenisedAssetRecord | undefined {
    return this.repository.getByAssetId(assetId);
  }

  listTokenisedAssets(): TokenisedAssetRecord[] {
    return this.repository.list();
  }

  private buildMetadata(assetId: string, tokenId: string, generatedAt: string): TokenMetadata {
    const sourceAsset = this.assets.toPublicMetadata(assetId);
    if (!sourceAsset.verification.evidenceRoot || !sourceAsset.verification.attestationId) {
      throw new Error(`Asset metadata is missing verification references: ${assetId}`);
    }

    return {
      schemaVersion: "1.0",
      assetId,
      tokenId,
      name: `Aamhi recovery asset ${assetId}`,
      description: "Verified rural SWM recovery asset token metadata for Finternet PoC use.",
      materialCode: sourceAsset.materialCode,
      quantity: sourceAsset.quantity,
      originatorParticipantId: sourceAsset.originatorParticipantId,
      currentHolderParticipantId: this.assets.requireAsset(assetId).custody.currentParticipantId,
      evidenceRoot: sourceAsset.verification.evidenceRoot,
      verificationAttestationId: sourceAsset.verification.attestationId,
      sourceAsset,
      generatedAt
    };
  }

  private submitMintTransaction(input: {
    assetId: string;
    tokenId: string;
    metadataUri: string;
    evidenceRoot: string;
    tokeniserAccount: string;
    chainId: number;
    contractAddress: string;
    submittedAt: string;
  }): SubmittedMintTransaction {
    const txHash = sha256CanonicalJson({
      kind: "RECOVERY_ASSET_MINT",
      assetId: input.assetId,
      tokenId: input.tokenId,
      metadataUri: input.metadataUri,
      evidenceRoot: input.evidenceRoot,
      tokeniserAccount: input.tokeniserAccount.toLowerCase(),
      chainId: input.chainId,
      contractAddress: input.contractAddress.toLowerCase(),
      submittedAt: input.submittedAt
    } as CanonicalJsonValue);

    return {
      dependencyMode: "LOCAL_MOCK",
      status: "SUBMITTED",
      chainId: input.chainId,
      contractAddress: input.contractAddress,
      txHash,
      submittedAt: input.submittedAt
    };
  }
}

export function deriveTokenId(assetId: string): string {
  return BigInt(sha256CanonicalJson({ assetId } as CanonicalJsonValue)).toString(10);
}
