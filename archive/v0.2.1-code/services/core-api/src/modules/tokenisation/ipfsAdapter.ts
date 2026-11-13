import { sha256CanonicalJson } from "../../shared/hash.js";
import type { DependencyMode } from "../../shared/dependencyModes.js";
import type { CanonicalJsonValue } from "../../shared/canonicalJson.js";
import type { IpfsPublishResult, TokenMetadata } from "./types.js";

export class SimulatedIpfsAdapter {
  readonly dependencyMode: DependencyMode = "LOCAL_MOCK";

  publishMetadata(metadata: TokenMetadata): IpfsPublishResult {
    const contentHash = sha256CanonicalJson(metadata as unknown as CanonicalJsonValue);
    const cid = `bafy-local-${contentHash.slice(2, 18)}`;

    return {
      dependencyMode: this.dependencyMode,
      cid,
      uri: `ipfs://${cid}`,
      contentHash
    };
  }
}
